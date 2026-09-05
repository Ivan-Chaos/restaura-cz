import { describe, expect, it } from "vitest";

import {
  ALLERGEN_IDS,
  ALLERGENS,
  API_DIETARY_IDS,
  AVAILABILITY_IDS,
  DIETARY_MARKERS,
  DIET_MARKER_IDS,
  DISH_WARNINGS,
  DISH_WARNING_IDS,
  OBSERVANCE_MARKER_IDS,
} from "@/lib/design-system/dietary";

/**
 * The frontend's half of the dish-attribute contract (feature 008).
 *
 * The lists below are **copied** from `apps/api/src/menus/item-attributes.ts`,
 * not imported: the two apps are separate packages, and each side pinning the
 * contract independently is what catches a change made in only one of them.
 * The API's `menus.e2e-spec.ts` asserts the same literals. Change one and the
 * other suite fails — which is the point.
 *
 * Same pattern as `variants.test.ts` and the plan ids.
 */
const API_DIETARY = [
  "vegetarian",
  "vegan",
  "glutenFree",
  "lactoseFree",
  "halal",
  "kosher",
  "lenten",
] as const;

const API_WARNINGS = [
  "containsAlcohol",
  "rawOrUndercooked",
  "mayContainBones",
  "servedVeryHot",
  "containsCaffeine",
] as const;

const API_AVAILABILITY = ["available", "limited", "soldOut", "hidden"] as const;

describe("dish attribute vocabularies", () => {
  it("offers the dietary markers the API stores, in the API's order", () => {
    expect([...API_DIETARY_IDS]).toEqual([...API_DIETARY]);
  });

  it("offers the warnings the API stores, in the API's order", () => {
    expect([...DISH_WARNING_IDS]).toEqual([...API_WARNINGS]);
  });

  it("offers the availability states the API stores", () => {
    expect([...AVAILABILITY_IDS]).toEqual([...API_AVAILABILITY]);
  });

  it("numbers the allergens 1–14, as the EU list and the API do", () => {
    expect(ALLERGENS.map((allergen) => allergen.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(ALLERGEN_IDS).toHaveLength(14);
  });

  it("does not offer spicy as a marker, because heat is a degree", () => {
    // `DIETARY_MARKERS` still draws a flame for `spicy` — the sample menu's
    // fixture uses it — but the editor cannot store it, and `spiceLevel` is the
    // one that counts. Two spellings of "this dish is spicy" would drift apart.
    expect([...API_DIETARY_IDS]).not.toContain("spicy");
    expect(DIETARY_MARKERS.spicy).toBeDefined();
  });

  it("splits the wire vocabulary into the two groups the editor shows", () => {
    // A diet claim is about what the kitchen left out; an observance is about
    // how the dish was prepared. Grouping them apart is what stops a cook
    // ticking "halal" while reaching for "vegetarian".
    expect([...DIET_MARKER_IDS, ...OBSERVANCE_MARKER_IDS]).toEqual([...API_DIETARY_IDS]);
    expect(DIET_MARKER_IDS).not.toContain("halal");
    expect(OBSERVANCE_MARKER_IDS).toContain("lenten");
  });

  it("gives every wire id an icon and a label key, so none renders as nothing", () => {
    for (const id of API_DIETARY_IDS) {
      expect(DIETARY_MARKERS[id]?.icon).toBeTypeOf("object");
      expect(DIETARY_MARKERS[id]?.labelKey).toBe(id);
    }
    for (const id of DISH_WARNING_IDS) {
      expect(DISH_WARNINGS[id]?.icon).toBeTypeOf("object");
      expect(DISH_WARNINGS[id]?.labelKey).toBe(id);
    }
  });

  it("tones every warning as a caution", () => {
    // The distinction is the whole reason warnings are a separate vocabulary:
    // a marker is an invitation, a warning is something to act on.
    for (const warning of Object.values(DISH_WARNINGS)) {
      expect(warning.tone).toBe("warning");
    }
  });
});
