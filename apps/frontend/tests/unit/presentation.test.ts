import { describe, expect, it } from "vitest";

import { THEME_IDS } from "@/lib/design-system/themes";
import {
  isPresentationId,
  PRESENTATION_IDS,
  PRESENTATIONS,
  presentationForTheme,
  usesCards,
} from "@/lib/menu-display/presentation";
import { VISUAL_VARIANTS } from "@/lib/menu-display/variants";

/**
 * The structural half of a style (feature 005, FR-021). A variant is not just
 * a palette: every owner-selectable style composes the menu differently, and
 * the fixture theme stays a pure re-colouring.
 */
describe("presentation recipes", () => {
  it("resolves every registered theme to a recipe", () => {
    for (const themeId of THEME_IDS) {
      const recipe = presentationForTheme(themeId);
      expect(PRESENTATION_IDS, themeId).toContain(recipe.id);
      expect(PRESENTATIONS[recipe.id]).toBe(recipe);
    }
  });

  it("keeps the default and the fixture theme on the classic composition", () => {
    expect(presentationForTheme("warm").id).toBe("classic");
    expect(presentationForTheme("slate").id).toBe("classic");
  });

  it("gives every non-default owner-selectable style its own structure", () => {
    const classic = PRESENTATIONS.classic;
    for (const { id, themeId } of VISUAL_VARIANTS) {
      if (id === "default") continue;
      const recipe = presentationForTheme(themeId);
      expect(recipe.id, `${id} must not be classic`).not.toBe("classic");
      // At least three of the five structural axes differ from classic —
      // fonts and colours alone do not make a style.
      const differing = (["header", "nav", "section", "rows", "price"] as const).filter(
        (axis) => recipe[axis] !== classic[axis],
      );
      expect(differing.length, `${id} differs from classic on ${differing.join(", ")}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives the five owner-selectable styles five distinct recipes", () => {
    const ids = VISUAL_VARIANTS.filter((v) => v.id !== "default").map(
      (v) => presentationForTheme(v.themeId).id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("narrows recipe ids", () => {
    expect(isPresentationId("glass")).toBe(true);
    expect(isPresentationId("nope")).toBe(false);
    expect(isPresentationId(undefined)).toBe(false);
  });

  it("renders glass and editorial as cards even without photographs", () => {
    expect(usesCards("glass")).toBe(true);
    expect(usesCards("editorial")).toBe(true);
    expect(usesCards("rows")).toBe(false);
    expect(usesCards("ledger")).toBe(false);
    expect(usesCards("board")).toBe(false);
    expect(usesCards("centered")).toBe(false);
  });
});
