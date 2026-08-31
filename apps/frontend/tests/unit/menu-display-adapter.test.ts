import { describe, expect, it } from "vitest";

import type { PublicMenu } from "@/lib/api/types";
import { toDisplayMenu } from "@/lib/menu-display/adapter";

/**
 * The adapter is the seam between what the API stores and what the design
 * system renders. If it drifts, the guest menu renders wrong prices or loses
 * sections, so every mapping rule in data-model.md is pinned here.
 */

const menu: PublicMenu = {
  name: "U Modré kachny",
  visualVariant: "default",
  sections: [
    {
      title: "Polévky",
      items: [
        { name: "Kulajda", description: "Se zastřeným vejcem", priceCzk: 89 },
        { name: "Hovězí vývar", description: null, priceCzk: 79 },
      ],
    },
    { title: "Hlavní jídla", items: [{ name: "Svíčková", description: null, priceCzk: 245 }] },
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
      sections: [{ title: "Doplňky", items: [{ name: "Voda", description: null, priceCzk: 0 }] }],
    });

    expect(free.categories[0]?.items[0]?.price).toEqual({
      kind: "single",
      amount: { amount: 0, currency: "CZK" },
    });
  });
});
