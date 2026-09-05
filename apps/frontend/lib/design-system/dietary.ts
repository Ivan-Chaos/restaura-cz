import {
  Ban,
  Beef,
  Bone,
  Coffee,
  Fish,
  Flame,
  Leaf,
  MilkOff,
  Moon,
  Sprout,
  ThermometerSun,
  WheatOff,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * Dietary markers and EU allergens.
 *
 * Two separate vocabularies that guests read together:
 *
 *  - **Dietary markers** are positive, opt-in claims ("vegan", "gluten free").
 *  - **Allergens** are the 14 substances EU Regulation 1169/2011 requires to be
 *    declared. Czech menus print them as numbers, and guests are used to
 *    looking the number up in a legend — so the number is part of the model,
 *    not a presentational detail.
 *
 * Neither is ever communicated by colour alone (spec FR-016): every marker
 * carries an icon *and* a translated label.
 */

export const DIETARY_MARKER_IDS = [
  "vegetarian",
  "vegan",
  "glutenFree",
  "lactoseFree",
  "halal",
  "kosher",
  "lenten",
  "spicy",
] as const;

export type DietaryMarkerId = (typeof DIETARY_MARKER_IDS)[number];

export interface DietaryMarker {
  id: DietaryMarkerId;
  icon: LucideIcon;
  /** Key under the `DietaryMarkers` namespace. */
  labelKey: DietaryMarkerId;
  /**
   * Whether the marker reads as reassuring (uses the `success` token) or as a
   * caution the guest may need to act on (`warning`).
   */
  tone: "success" | "warning" | "neutral";
}

export const DIETARY_MARKERS: Record<DietaryMarkerId, DietaryMarker> = {
  vegetarian: { id: "vegetarian", icon: Leaf, labelKey: "vegetarian", tone: "success" },
  vegan: { id: "vegan", icon: Sprout, labelKey: "vegan", tone: "success" },
  glutenFree: { id: "glutenFree", icon: WheatOff, labelKey: "glutenFree", tone: "success" },
  lactoseFree: { id: "lactoseFree", icon: MilkOff, labelKey: "lactoseFree", tone: "success" },
  halal: { id: "halal", icon: Moon, labelKey: "halal", tone: "neutral" },
  kosher: { id: "kosher", icon: Ban, labelKey: "kosher", tone: "neutral" },
  lenten: { id: "lenten", icon: Fish, labelKey: "lenten", tone: "neutral" },
  spicy: { id: "spicy", icon: Flame, labelKey: "spicy", tone: "warning" },
};

export const DIETARY_MARKER_LIST: readonly DietaryMarker[] =
  DIETARY_MARKER_IDS.map((id) => DIETARY_MARKERS[id]);

/**
 * What an owner can actually tick, and what the API stores.
 *
 * Two lists rather than one because they answer different questions.
 * `DIETARY_MARKER_IDS` is the *rendering* vocabulary: everything a dish might
 * arrive carrying, including `spicy`, which the design system's own fixtures
 * still use and which older data may hold. This is the *wire* vocabulary,
 * pinned against the API in `tests/unit/item-attributes.test.ts`.
 *
 * `spicy` is absent from it on purpose: heat is a degree, not a flag, and it
 * travels as `spiceLevel`. Offering both would put two flames on one dish and
 * give "this is spicy" two spellings that could disagree.
 */
export const DIET_MARKER_IDS = [
  "vegetarian",
  "vegan",
  "glutenFree",
  "lactoseFree",
] as const satisfies readonly DietaryMarkerId[];

/**
 * Grouped apart in the editor because ticking one is a different kind of
 * decision: a diet claim is about what the kitchen left out, an observance is
 * about how the dish was prepared and by whom.
 */
export const OBSERVANCE_MARKER_IDS = [
  "halal",
  "kosher",
  "lenten",
] as const satisfies readonly DietaryMarkerId[];

/** The wire vocabulary: the two groups above, in the API's order. */
export const API_DIETARY_IDS = [
  ...DIET_MARKER_IDS,
  ...OBSERVANCE_MARKER_IDS,
] as const satisfies readonly DietaryMarkerId[];

export type ApiDietaryId = (typeof API_DIETARY_IDS)[number];

/** The 14 allergens of EU Regulation 1169/2011, in their official order. */
export const ALLERGEN_IDS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

export type AllergenId = (typeof ALLERGEN_IDS)[number];

/** 1–14, matching the printed legend guests are used to. */
export type AllergenNumber =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Allergen {
  number: AllergenNumber;
  id: AllergenId;
  /** Key under the `Allergens` namespace. */
  labelKey: AllergenId;
}

export const ALLERGENS: readonly Allergen[] = ALLERGEN_IDS.map((id, index) => ({
  number: (index + 1) as AllergenNumber,
  id,
  labelKey: id,
}));

export function allergenByNumber(n: AllergenNumber): Allergen {
  return ALLERGENS[n - 1];
}

export function isAllergenNumber(value: number): value is AllergenNumber {
  return Number.isInteger(value) && value >= 1 && value <= 14;
}

/**
 * Cautions that are facts about the dish rather than claims about a diet.
 *
 * A separate vocabulary from the markers above because they read the opposite
 * way round: a marker is an invitation ("you can eat this"), a warning is
 * something a guest may need to act on. They are ids rather than free text so
 * that a guest reads them in their own language — a dish's name and description
 * are only ever in the one the owner typed, and "obsahuje alkohol" helps a
 * German visitor rather less than the kitchen imagines.
 *
 * Shaped exactly like `DietaryMarker` so one component renders both.
 */
export const DISH_WARNING_IDS = [
  "containsAlcohol",
  "rawOrUndercooked",
  "mayContainBones",
  "servedVeryHot",
  "containsCaffeine",
] as const;

export type DishWarningId = (typeof DISH_WARNING_IDS)[number];

export interface DishWarning {
  id: DishWarningId;
  icon: LucideIcon;
  /** Key under the `DishWarnings` namespace. */
  labelKey: DishWarningId;
  /** Always `warning`: that is what makes these a separate vocabulary. */
  tone: "warning";
}

export const DISH_WARNINGS: Record<DishWarningId, DishWarning> = {
  containsAlcohol: {
    id: "containsAlcohol",
    icon: Wine,
    labelKey: "containsAlcohol",
    tone: "warning",
  },
  rawOrUndercooked: {
    id: "rawOrUndercooked",
    icon: Beef,
    labelKey: "rawOrUndercooked",
    tone: "warning",
  },
  mayContainBones: {
    id: "mayContainBones",
    icon: Bone,
    labelKey: "mayContainBones",
    tone: "warning",
  },
  servedVeryHot: {
    id: "servedVeryHot",
    icon: ThermometerSun,
    labelKey: "servedVeryHot",
    tone: "warning",
  },
  containsCaffeine: {
    id: "containsCaffeine",
    icon: Coffee,
    labelKey: "containsCaffeine",
    tone: "warning",
  },
};

export const DISH_WARNING_LIST: readonly DishWarning[] = DISH_WARNING_IDS.map(
  (id) => DISH_WARNINGS[id],
);

/** How available a dish is, as the owner sets it. */
export const AVAILABILITY_IDS = ["available", "limited", "soldOut", "hidden"] as const;

export type AvailabilityId = (typeof AVAILABILITY_IDS)[number];
