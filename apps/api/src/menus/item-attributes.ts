/**
 * The four closed vocabularies a dish carries, and the bounds of its spice level.
 *
 * Arranged like `visual-variants.ts` and `auth/plans.ts`: the list here is the
 * contract, the CHECK constraints in `db/schema.ts` are what make it true, and
 * `@IsIn` at the DTO boundary is what turns a bad value into a friendly 400
 * instead of a 500 nobody can act on.
 *
 * One module rather than four, because all four belong to one entity and are
 * imported by the same two consumers. The variant and plan catalogues are
 * one-per-file because they belong to different features and different tables.
 *
 * The frontend copies these literals rather than importing them (separate
 * packages, and each side pinning the other in a test is what catches drift).
 * Adding an id means: this file, the CHECK's allowlist *and* its cardinality
 * bound, both pinning tests, and a label in cs/en/de. That friction is
 * deliberate — an id a guest sees untranslated is worse than one that does not
 * exist.
 */

/**
 * Positive, opt-in claims about a dish.
 *
 * `spicy` is deliberately absent, even though the frontend's marker catalogue
 * still draws a flame for it: heat is a degree, not a flag, and it lives in
 * `spiceLevel`. Two spellings of "this dish is spicy" is exactly the kind of
 * thing that goes out of sync.
 */
export const DIETARY_IDS = [
  'vegetarian',
  'vegan',
  'glutenFree',
  'lactoseFree',
  'halal',
  'kosher',
  'lenten',
] as const;

export type DietaryId = (typeof DIETARY_IDS)[number];

/**
 * The 14 substances EU Regulation 1169/2011 requires to be declared, stored as
 * the numbers Czech menus print. The number *is* the model: guests look it up
 * in a legend, so numbering names at render time would move the legend's
 * authority out of the system of record.
 */
export const ALLERGEN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export type AllergenNumber = (typeof ALLERGEN_NUMBERS)[number];

/** Cautions that are facts about the dish, not claims about a diet. */
export const WARNING_IDS = [
  'containsAlcohol',
  'rawOrUndercooked',
  'mayContainBones',
  'servedVeryHot',
  'containsCaffeine',
] as const;

export type WarningId = (typeof WARNING_IDS)[number];

/**
 * `hidden` is the only value with a structural consequence: the dish is left
 * out of the public payload entirely. `limited` and `soldOut` still travel, so
 * a guest reads them and does not order what is gone.
 */
export const AVAILABILITIES = ['available', 'limited', 'soldOut', 'hidden'] as const;

export type Availability = (typeof AVAILABILITIES)[number];

export const DEFAULT_AVAILABILITY: Availability = 'available';

/** What a guest can ever be shown; `hidden` never leaves the database. */
export type PublicAvailability = Exclude<Availability, 'hidden'>;

/** 0 = not spicy, 3 = very. A degree, so a number rather than a marker. */
export const MAX_SPICE_LEVEL = 3;
export const DEFAULT_SPICE_LEVEL = 0;

/**
 * A set field as the row should hold it: no duplicates, in catalogue order.
 *
 * Order is not the owner's here — unlike `restaurant_profile.phones`, where it
 * is the data — because a marker set is a set. Two dishes carrying the same
 * claims must read identically whatever order the boxes were ticked in, and a
 * stable order is also what lets a test assert a payload with `toEqual`.
 *
 * This is where duplicate rejection ended up: a CHECK constraint may not
 * contain a subquery, and every way to say "no repeated element" in SQL needs
 * one. So the database bounds the size and the vocabulary, and this bounds the
 * shape. Anything outside the catalogue is dropped rather than rejected — the
 * DTO has already refused it, so this is a backstop, not a filter.
 *
 * `undefined` yields `[]`, so it doubles as the defaulting step and there is no
 * `?? []` for a caller to forget.
 */
export function orderedSubsetOf<T extends string | number>(
  catalogue: readonly T[],
  chosen: readonly T[] | undefined,
): T[] {
  return chosen?.length ? catalogue.filter((entry) => chosen.includes(entry)) : [];
}
