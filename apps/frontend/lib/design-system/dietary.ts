import {
  Ban,
  Flame,
  Leaf,
  MilkOff,
  Moon,
  Sprout,
  WheatOff,
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
  spicy: { id: "spicy", icon: Flame, labelKey: "spicy", tone: "warning" },
};

export const DIETARY_MARKER_LIST: readonly DietaryMarker[] =
  DIETARY_MARKER_IDS.map((id) => DIETARY_MARKERS[id]);

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
