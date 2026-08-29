import type { useTranslations } from "next-intl";

import type { ImageModel, Menu, MenuItem } from "../types";

/**
 * The sample restaurant: "U Zlaté Lžíce" (fictional).
 *
 * One fixture drives the Storybook example, the sample route and the e2e suite,
 * so the thing documented, the thing tested and the thing measured are the same
 * thing. It deliberately covers every awkward case the spec calls out — missing
 * image, missing description, market price, "from" price, variant prices, sold
 * out, limited, multiple highlights, spice level, a very long name, and all 14
 * EU allergens spread across the menu — so a component cannot look finished
 * while quietly breaking on real data.
 *
 * All strings arrive translated: the caller passes a `SampleMenu`-namespace
 * translator, so the same fixture renders in cs, en and de.
 */

/**
 * A translator for the `SampleMenu` namespace.
 *
 * Derived from next-intl's own type rather than declared as
 * `(key: string) => string`: that looser signature would accept a translator for
 * any namespace and, worse, would let a typo in a key here compile and surface
 * as a raw key on the page. This way `messages/en.json` type-checks the fixture.
 */
export type SampleMenuTranslator = ReturnType<typeof useTranslations<"SampleMenu">>;

const image = (id: string, alt: string): ImageModel => ({
  src: `/sample-menu/${id}.svg`,
  alt,
  width: 1200,
  height: 900,
});

const czk = (amount: number) => ({ amount, currency: "CZK" as const });

/**
 * The dishes on the sample menu. Spelled out as a union so the key helpers
 * below stay type-checked against `messages/en.json` — a mistyped dish id is a
 * compile error rather than a raw `dishes.svickva` on the page.
 */
type DishId =
  | "bramboracka"
  | "utopenec"
  | "tatarak"
  | "svickova"
  | "gulas"
  | "smazenysyr"
  | "kachna"
  | "rizek"
  | "koleno"
  | "knedliky"
  | "medovnik"
  | "palacinky"
  | "pivo"
  | "limonada";

/** `medovnik` deliberately has no description — that is one of the test cases. */
type DishWithDescription = Exclude<DishId, "medovnik">;

type VariantId = "small" | "large" | "half" | "whole" | "portion" | "double";

export function getSampleMenu(t: SampleMenuTranslator): Menu {
  const dish = (key: DishId) => t(`dishes.${key}`);
  const description = (key: DishWithDescription) => t(`dishes.${key}Description`);
  const variant = (key: VariantId) => t(`variants.${key}`);

  const starters: MenuItem[] = [
    {
      id: "bramboracka",
      name: dish("bramboracka"),
      description: description("bramboracka"),
      price: { kind: "single", amount: czk(89) },
      dietary: ["vegetarian"],
      allergens: [1, 9],
      availability: "available",
    },
    {
      // No image on purpose: the card must collapse the media block cleanly.
      id: "utopenec",
      name: dish("utopenec"),
      description: description("utopenec"),
      price: { kind: "single", amount: czk(95) },
      allergens: [1, 10, 12],
      availability: "available",
    },
    {
      // Market price: no amount exists to show.
      id: "tatarak",
      name: dish("tatarak"),
      description: description("tatarak"),
      image: image("tatarak", dish("tatarak")),
      price: { kind: "market" },
      allergens: [1, 3, 10],
      availability: "limited",
      highlights: ["chefsPick"],
    },
  ];

  const mains: MenuItem[] = [
    {
      id: "svickova",
      name: dish("svickova"),
      description: description("svickova"),
      image: image("svickova", dish("svickova")),
      price: { kind: "single", amount: czk(285) },
      allergens: [1, 3, 7, 9],
      availability: "available",
      highlights: ["chefsPick", "popular"],
    },
    {
      id: "gulas",
      name: dish("gulas"),
      description: description("gulas"),
      image: image("gulas", dish("gulas")),
      // Variant prices: one dish, two portions.
      price: {
        kind: "variants",
        variants: [
          { label: variant("portion"), amount: czk(249) },
          { label: variant("double"), amount: czk(329) },
        ],
      },
      allergens: [1, 7],
      availability: "available",
      spiceLevel: 1,
    },
    {
      id: "smazenysyr",
      name: dish("smazenysyr"),
      description: description("smazenysyr"),
      price: { kind: "single", amount: czk(215) },
      dietary: ["vegetarian"],
      allergens: [1, 3, 7, 10],
      availability: "available",
    },
    {
      // "From" price: the half portion is the entry point.
      id: "kachna",
      name: dish("kachna"),
      description: description("kachna"),
      image: image("kachna", dish("kachna")),
      price: { kind: "from", amount: czk(329) },
      allergens: [1, 3, 9],
      availability: "available",
    },
    {
      // Sold out: must be visibly distinct *and* say so in words.
      id: "rizek",
      name: dish("rizek"),
      description: description("rizek"),
      price: { kind: "single", amount: czk(239) },
      allergens: [1, 3, 7, 10],
      availability: "soldOut",
    },
    {
      // A genuinely long Czech dish name — 120+ characters. Must wrap, never
      // overflow, at 320px and in German.
      id: "koleno",
      name: dish("koleno"),
      description: description("koleno"),
      price: { kind: "single", amount: czk(459) },
      allergens: [1, 10, 12],
      availability: "limited",
      spiceLevel: 2,
      highlights: ["seasonal"],
    },
  ];

  const desserts: MenuItem[] = [
    {
      id: "knedliky",
      name: dish("knedliky"),
      description: description("knedliky"),
      image: image("knedliky", dish("knedliky")),
      price: { kind: "single", amount: czk(159) },
      dietary: ["vegetarian"],
      allergens: [1, 3, 7],
      availability: "available",
    },
    {
      // No description: the layout must not leave a gap where prose would be.
      id: "medovnik",
      name: dish("medovnik"),
      price: { kind: "single", amount: czk(119) },
      dietary: ["vegetarian"],
      allergens: [1, 3, 7, 8],
      availability: "available",
    },
    {
      id: "palacinky",
      name: dish("palacinky"),
      description: description("palacinky"),
      price: { kind: "single", amount: czk(139) },
      dietary: ["vegetarian"],
      allergens: [1, 3, 7, 8],
      availability: "available",
    },
  ];

  const drinks: MenuItem[] = [
    {
      id: "pivo",
      name: dish("pivo"),
      description: description("pivo"),
      image: image("pivo", dish("pivo")),
      price: {
        kind: "variants",
        variants: [
          { label: variant("small"), amount: czk(45) },
          { label: variant("large"), amount: czk(59) },
        ],
      },
      allergens: [1],
      availability: "available",
    },
    {
      id: "limonada",
      name: dish("limonada"),
      description: description("limonada"),
      price: { kind: "single", amount: czk(85) },
      dietary: ["vegan", "glutenFree"],
      availability: "available",
      highlights: ["new"],
    },
  ];

  const menu: Menu = {
    establishment: {
      name: t("establishment.name"),
      tagline: t("establishment.tagline"),
      welcome: t("establishment.welcome"),
      openingHours: [
        {
          label: t("establishment.hoursWeekdays"),
          hours: t("establishment.hoursWeekdaysValue"),
        },
        {
          label: t("establishment.hoursWeekend"),
          hours: t("establishment.hoursWeekendValue"),
        },
      ],
      contact: {
        address: t("establishment.address"),
        phone: t("establishment.phone"),
        website: t("establishment.website"),
      },
      serviceNotes: [
        t("establishment.noteVat"),
        t("establishment.noteAllergens"),
        t("establishment.noteTip"),
      ],
      shareUrl: "https://restaura.cz/m/u-zlate-lzice",
    },
    categories: [
      {
        id: "starters",
        name: t("categories.starters"),
        description: t("categories.startersDescription"),
        items: starters,
      },
      {
        id: "mains",
        name: t("categories.mains"),
        description: t("categories.mainsDescription"),
        items: mains,
      },
      {
        id: "desserts",
        name: t("categories.desserts"),
        description: t("categories.dessertsDescription"),
        items: desserts,
      },
      {
        id: "drinks",
        name: t("categories.drinks"),
        description: t("categories.drinksDescription"),
        items: drinks,
      },
    ],
    specials: [mains[0], mains[5], drinks[1]],
  };

  return menu;
}

