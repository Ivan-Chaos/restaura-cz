import { describe, expect, it } from "vitest";

import type { PublicMenu } from "@/lib/api/types";
import { DEFAULT_THEME, THEME_IDS } from "@/lib/design-system/themes";
import { toDisplayMenu } from "@/lib/menu-display/adapter";
import {
  DEFAULT_VISUAL_VARIANT,
  isVisualVariant,
  themeForVariant,
  variantForTheme,
  VISUAL_VARIANT_IDS,
  VISUAL_VARIANTS,
} from "@/lib/menu-display/variants";

/**
 * The frontend half of the visual-variant contract (spec 005 FR-001, FR-007).
 *
 * The literal list below is copied, not imported, from
 * `apps/api/src/menus/visual-variants.ts`. That is the point: each side pins
 * the contract independently, so a change to one without the other fails a
 * test somewhere rather than silently drifting.
 */
const API_ALLOWLIST = [
  "default",
  "plain-white",
  "liquid-glass",
  "green-bar",
  "modern",
  "refined",
] as const;

describe("visual variant catalogue", () => {
  it("lists exactly the ids the API accepts, in the same order", () => {
    expect([...VISUAL_VARIANT_IDS]).toEqual([...API_ALLOWLIST]);
  });

  it("maps every variant onto a registered theme", () => {
    for (const variant of VISUAL_VARIANTS) {
      expect(THEME_IDS, `${variant.id} → ${variant.themeId}`).toContain(variant.themeId);
    }
  });

  it("renders the legacy default as the warm theme", () => {
    expect(DEFAULT_VISUAL_VARIANT).toBe("default");
    expect(themeForVariant("default")).toBe("warm");
    expect(themeForVariant("default")).toBe(DEFAULT_THEME.id);
  });

  it("does not offer the slate fixture to owners", () => {
    expect(isVisualVariant("slate")).toBe(false);
    expect(variantForTheme("slate")).toBeUndefined();
  });

  it("narrows untrusted values and falls back to Classic", () => {
    expect(isVisualVariant("refined")).toBe(true);
    expect(isVisualVariant("elegant")).toBe(false);
    expect(isVisualVariant(undefined)).toBe(false);
    expect(isVisualVariant(42)).toBe(false);

    expect(themeForVariant("refined")).toBe("refined");
    expect(themeForVariant("green-bar")).toBe("green-bar");
    expect(themeForVariant("nope")).toBe(DEFAULT_THEME.id);
    expect(themeForVariant(undefined)).toBe(DEFAULT_THEME.id);
    expect(themeForVariant(null)).toBe(DEFAULT_THEME.id);
  });

  it("round-trips theme ids back to variant ids", () => {
    expect(variantForTheme("warm")).toBe("default");
    expect(variantForTheme("liquid-glass")).toBe("liquid-glass");
  });

  it("changes presentation only: the display model is identical across variants", () => {
    // Spec 005 FR-009 / SC-003. The style is applied by the page's ThemeScope;
    // the adapter must not so much as look at it.
    const base: PublicMenu = {
      name: "Lunch",
      visualVariant: "default",
      sections: [
        {
          title: "Starters",
          items: [
            { name: "Soup", description: "Of the day", priceCzk: 89 },
            { name: "Bread", description: null, priceCzk: 12.5 },
          ],
        },
      ],
    };

    const rendered = VISUAL_VARIANT_IDS.map((id) =>
      toDisplayMenu({ ...base, visualVariant: id }),
    );
    for (const menu of rendered) {
      expect(menu).toEqual(rendered[0]);
    }
  });
});
