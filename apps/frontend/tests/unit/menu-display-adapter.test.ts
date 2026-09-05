import { describe, expect, it } from "vitest";

import {
  toDisplayMenu,
  visibleItemCount,
  type DisplayMenuSource,
  type SourceItem,
} from "@/lib/menu-display/adapter";

/**
 * The adapter is the seam between what the API stores and what the design
 * system renders. If it drifts, the guest menu renders wrong prices or loses
 * sections, so every mapping rule in data-model.md is pinned here.
 */

/**
 * A dish declaring nothing, which is what most of them are.
 *
 * A factory rather than repeated literals so that the fields these tests are
 * not about — markers, allergens, warnings, heat, availability — stay out of
 * the way, and so the next field added to the contract is one edit here rather
 * than one per fixture.
 */
function dish(
  values: Partial<SourceItem> & { name: string; priceCzk: number },
): SourceItem {
  return {
    description: null,
    image: null,
    dietary: [],
    allergens: [],
    spiceLevel: 0,
    warnings: [],
    availability: "available",
    ...values,
  };
}

const menu: DisplayMenuSource = {
  name: "U Modré kachny",
  restaurantName: "U Modré kachny",
  visualVariant: "default",
  logo: null,
  sections: [
    {
      title: "Polévky",
      items: [
        dish({ name: "Kulajda", description: "Se zastřeným vejcem", priceCzk: 89 }),
        dish({ name: "Hovězí vývar", priceCzk: 79 }),
      ],
    },
    { title: "Hlavní jídla", items: [dish({ name: "Svíčková", priceCzk: 245 })] },
  ],
};

describe("toDisplayMenu", () => {
  it("uses the menu name as the establishment name", () => {
    expect(toDisplayMenu(menu).establishment.name).toBe("U Modré kachny");
  });

  it("maps sections to categories in order", () => {
    expect(toDisplayMenu(menu).categories.map((category) => category.name)).toEqual([
      "Polévky",
      "Hlavní jídla",
    ]);
  });

  it("maps a price to a single-amount Money in whole korunas", () => {
    const [first] = toDisplayMenu(menu).categories;
    expect(first?.items[0]?.price).toEqual({
      kind: "single",
      amount: { amount: 89, currency: "CZK" },
    });
  });

  it("omits the description rather than passing null through", () => {
    const [first] = toDisplayMenu(menu).categories;
    expect(first?.items[0]?.description).toBe("Se zastřeným vejcem");
    expect(first?.items[1]).not.toHaveProperty("description");
  });

  it("gives every category a diacritic-free anchor id", () => {
    // Category ids are used as element ids and scroll anchors, so they must be
    // URL- and DOM-safe even though titles are free text.
    expect(toDisplayMenu(menu).categories.map((category) => category.id)).toEqual([
      "polevky-1",
      "hlavni-jidla-2",
    ]);
  });

  it("keeps ids unique when two sections share a title", () => {
    const duplicated = toDisplayMenu({
      ...menu,
      sections: [
        { title: "Polévky", items: [] },
        { title: "Polévky", items: [] },
      ],
    });

    const ids = duplicated.categories.map((category) => category.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("falls back to a positional id for a title with no Latin characters", () => {
    const chinese = toDisplayMenu({ ...menu, sections: [{ title: "菜单", items: [] }] });
    expect(chinese.categories[0]?.id).toBe("section-1");
  });

  it("gives every item a unique id, as the render keys require", () => {
    const ids = toDisplayMenu(menu).categories.flatMap((category) =>
      category.items.map((item) => item.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handles a published but empty menu", () => {
    expect(toDisplayMenu({ ...menu, sections: [] })).toEqual({
      establishment: { name: "U Modré kachny" },
      categories: [],
    });
  });

  it("handles a section with no items", () => {
    const empty = toDisplayMenu({ ...menu, sections: [{ title: "Připravujeme", items: [] }] });
    expect(empty.categories[0]?.items).toEqual([]);
  });

  it("keeps a price of zero rather than treating it as missing", () => {
    const free = toDisplayMenu({
      ...menu,
      sections: [{ title: "Doplňky", items: [dish({ name: "Voda", priceCzk: 0 })] }],
    });

    expect(free.categories[0]?.items[0]?.price).toEqual({
      kind: "single",
      amount: { amount: 0, currency: "CZK" },
    });
  });
});

/**
 * Images (feature 006).
 *
 * The rule worth pinning is where the alt text comes from: a dish photo is
 * described by the dish and a logo by the restaurant, both derived rather than
 * stored, so an owner never types a description of something we already named.
 */
describe("toDisplayMenu with images", () => {
  const LOGO = { url: "https://img.example.com/logos/3f2c.png", width: 512, height: 512 };
  const PHOTO = { url: "https://img.example.com/dishes/9a1e.jpg", width: 1600, height: 1200 };

  it("describes the logo by the restaurant, not by the menu", () => {
    const display = toDisplayMenu({
      ...menu,
      name: "Polední menu",
      restaurantName: "U Modré kachny",
      logo: LOGO,
    });

    expect(display.establishment.logo).toEqual({
      src: LOGO.url,
      alt: "U Modré kachny",
      width: 512,
      height: 512,
    });
    // The heading still names the menu; only the logo names the restaurant.
    expect(display.establishment.name).toBe("Polední menu");
  });

  it("describes a dish photo by the dish", () => {
    const display = toDisplayMenu({
      ...menu,
      sections: [
        {
          title: "Polévky",
          items: [dish({ name: "Kulajda", priceCzk: 89, image: PHOTO })],
        },
      ],
    });

    expect(display.categories[0]?.items[0]?.image).toEqual({
      src: PHOTO.url,
      alt: "Kulajda",
      width: 1600,
      height: 1200,
    });
  });

  it("leaves the image out entirely when there is none", () => {
    const display = toDisplayMenu(menu);

    expect(display.establishment.logo).toBeUndefined();
    expect(display.categories[0]?.items[0]?.image).toBeUndefined();
    // Absent, not present-and-null: the design system treats the key as
    // optional and a null would not satisfy it.
    expect("logo" in display.establishment).toBe(false);
  });

  it("treats an absent field from an older API as no image", () => {
    // A payload built before this feature carries neither key. It must render
    // as a menu without images rather than crash.
    const legacy: Record<string, unknown> = { ...menu };
    delete legacy.logo;

    const display = toDisplayMenu(legacy as unknown as typeof menu);
    expect(display.establishment.logo).toBeUndefined();
  });

  it("carries the stored dimensions through, so the page can reserve the box", () => {
    const display = toDisplayMenu({ ...menu, logo: LOGO });

    expect(display.establishment.logo?.width).toBe(LOGO.width);
    expect(display.establishment.logo?.height).toBe(LOGO.height);
  });

  it("mixes photographed and plain dishes in one category", () => {
    const display = toDisplayMenu({
      ...menu,
      sections: [
        {
          title: "Polévky",
          items: [
            dish({ name: "Kulajda", priceCzk: 89, image: PHOTO }),
            dish({ name: "Vývar", priceCzk: 79 }),
          ],
        },
      ],
    });

    expect(display.categories[0]?.items[0]?.image).toBeDefined();
    expect(display.categories[0]?.items[1]?.image).toBeUndefined();
  });
});

/**
 * What a dish declares (feature 008).
 *
 * This is the one seam between the API's shape and the design system's, so
 * these cases are what stand between "the owner ticked vegan" and a guest, a
 * preview and a PDF all agreeing about it.
 */
describe("declarations", () => {
  function withItems(items: SourceItem[]) {
    return toDisplayMenu({ ...menu, sections: [{ title: "Polévky", items }] });
  }

  it("carries markers, allergens, warnings and heat through", () => {
    const display = withItems([
      dish({
        name: "Kulajda",
        priceCzk: 89,
        dietary: ["vegetarian", "lenten"],
        allergens: [3, 7],
        warnings: ["rawOrUndercooked"],
        spiceLevel: 2,
      }),
    ]);

    expect(display.categories[0]?.items[0]).toMatchObject({
      dietary: ["vegetarian", "lenten"],
      allergens: [3, 7],
      warnings: ["rawOrUndercooked"],
      spiceLevel: 2,
    });
  });

  it("leaves an empty declaration absent rather than empty", () => {
    // The display model says "absent" where the API says "empty", and every
    // component tests these for truthiness. An empty array would render a strip
    // with nothing in it.
    const item = withItems([dish({ name: "Kulajda", priceCzk: 89 })]).categories[0]?.items[0];

    expect(item).not.toHaveProperty("dietary");
    expect(item).not.toHaveProperty("allergens");
    expect(item).not.toHaveProperty("warnings");
    expect(item).not.toHaveProperty("spiceLevel");
    expect(item).not.toHaveProperty("availability");
  });

  it("keeps limited and sold out, which a guest needs to read", () => {
    const display = withItems([
      dish({ name: "Kulajda", priceCzk: 89, availability: "limited" }),
      dish({ name: "Vývar", priceCzk: 79, availability: "soldOut" }),
    ]);

    expect(display.categories[0]?.items.map((item) => item.availability)).toEqual([
      "limited",
      "soldOut",
    ]);
  });

  it("drops a hidden dish, so preview and print cannot show one", () => {
    // The public endpoint filters these out already; this is what protects
    // /preview and /print/**, which build from the owner's own MenuDetail.
    const display = withItems([
      dish({ name: "Kulajda", priceCzk: 89 }),
      dish({ name: "Zelňačka", priceCzk: 59, availability: "hidden" }),
    ]);

    expect(display.categories[0]?.items.map((item) => item.name)).toEqual(["Kulajda"]);
  });

  it("keeps the heading of a category whose dishes are all hidden", () => {
    const display = withItems([
      dish({ name: "Zelňačka", priceCzk: 59, availability: "hidden" }),
    ]);

    expect(display.categories[0]?.name).toBe("Polévky");
    expect(display.categories[0]?.items).toEqual([]);
  });

  it("numbers the dishes a guest sees, not the ones behind them", () => {
    // Ids are positional, so a hidden dish in the middle must not leave a gap.
    const display = withItems([
      dish({ name: "Zelňačka", priceCzk: 59, availability: "hidden" }),
      dish({ name: "Kulajda", priceCzk: 89 }),
    ]);

    expect(display.categories[0]?.items[0]?.id).toBe("polevky-1-item-1");
  });
});

describe("visibleItemCount", () => {
  it("counts what would reach the page", () => {
    expect(
      visibleItemCount([
        {
          title: "Polévky",
          items: [
            dish({ name: "Kulajda", priceCzk: 89 }),
            dish({ name: "Zelňačka", priceCzk: 59, availability: "hidden" }),
          ],
        },
      ]),
    ).toBe(1);
  });

  it("is zero for a menu whose every dish is hidden", () => {
    // Which is what makes the PDF download say "nothing to print" instead of
    // producing a document of headings with nothing under them.
    expect(
      visibleItemCount([
        {
          title: "Polévky",
          items: [dish({ name: "Zelňačka", priceCzk: 59, availability: "hidden" })],
        },
      ]),
    ).toBe(0);
  });
});
