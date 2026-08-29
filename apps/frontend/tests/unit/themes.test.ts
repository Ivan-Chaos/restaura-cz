import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseCssVars } from "@/lib/design-system/contrast";
import {
  DEFAULT_THEME,
  FONT_VARIABLES,
  isThemeId,
  THEMES,
  toThemeId,
} from "@/lib/design-system/themes";
import { APPEARANCES, OPTIONAL_TOKENS, REQUIRED_TOKENS } from "@/lib/design-system/tokens";

import {
  ALL_THEMES,
  readTheme,
  scopedSelectorFor,
  selectorFor,
  themePath,
  varsFor,
} from "./theme-css";

/**
 * The structural half of the theme contract. `contrast.test.ts` covers the
 * accessibility half.
 */
describe("theme registry", () => {
  it("has exactly one default theme", () => {
    expect(THEMES.filter((t) => t.isDefault)).toHaveLength(1);
    expect(DEFAULT_THEME.id).toBe("warm");
  });

  it("has unique ids", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("narrows untrusted values", () => {
    expect(isThemeId("slate")).toBe(true);
    expect(isThemeId("warm")).toBe(true);
    expect(isThemeId("nope")).toBe(false);
    expect(isThemeId(undefined)).toBe(false);
    // An unknown theme falls back rather than rendering an unstyled page.
    expect(toThemeId("nope")).toBe(DEFAULT_THEME.id);
    expect(toThemeId("slate")).toBe("slate");
  });

  it("registers every theme that has a stylesheet, and vice versa", () => {
    for (const theme of ALL_THEMES) {
      expect(existsSync(themePath(theme)), `${theme.id}.css must exist`).toBe(true);
    }
  });
});

describe("theme stylesheets", () => {
  for (const theme of ALL_THEMES) {
    describe(theme.id, () => {
      for (const appearance of APPEARANCES) {
        it(`declares every required token for ${appearance}`, () => {
          const vars = varsFor(theme, appearance);
          const missing = REQUIRED_TOKENS.filter(
            (token) => vars[`--${token}`] === undefined,
          );
          expect(
            missing,
            `${theme.id}/${appearance} is missing: ${missing.join(", ")}`,
          ).toEqual([]);
        });
      }

      it("is scopable via [data-theme]", () => {
        // Every theme — the default included — must apply when scoped, so a
        // menu can be themed inside a differently-themed page (spec FR-008).
        const css = readTheme(theme);
        for (const appearance of APPEARANCES) {
          expect(
            parseCssVars(css, scopedSelectorFor(theme, appearance)),
            `${theme.id} must declare tokens for ${scopedSelectorFor(theme, appearance)}`,
          ).not.toEqual({});
        }
      });

      it("declares no token outside the documented catalogue", () => {
        const css = readTheme(theme);
        const known = new Set<string>([...REQUIRED_TOKENS, ...OPTIONAL_TOKENS]);
        for (const appearance of APPEARANCES) {
          const declared = Object.keys(
            parseCssVars(css, selectorFor(theme, appearance)),
          );
          const undocumented = declared
            .map((name) => name.replace(/^--/, ""))
            .filter((name) => !known.has(name));
          expect(
            undocumented,
            `Undocumented token(s) in ${theme.id}/${appearance}: ${undocumented.join(", ")}. ` +
              "Add them to lib/design-system/tokens.ts and to every theme (spec FR-026).",
          ).toEqual([]);
        }
      });
    });
  }

  it("gives the default theme both :root and a scope, with identical values", () => {
    // The default theme owns `:root` so unwrapped shadcn primitives are themed,
    // and `[data-theme="warm"]` so it can also be scoped. They are declared by
    // one rule; this asserts nobody has split them into two drifting copies.
    const css = readTheme(DEFAULT_THEME);
    for (const appearance of APPEARANCES) {
      const ambient = parseCssVars(css, selectorFor(DEFAULT_THEME, appearance));
      const scoped = parseCssVars(css, scopedSelectorFor(DEFAULT_THEME, appearance));
      expect(scoped).toEqual(ambient);
    }
  });

  it("only assigns palette steps that exist", () => {
    // A typo like `--palette-terracota-600` would silently render transparent.
    for (const theme of ALL_THEMES) {
      for (const appearance of APPEARANCES) {
        const vars = varsFor(theme, appearance);
        for (const token of REQUIRED_TOKENS) {
          const value = vars[`--${token}`];
          for (const [, name] of value.matchAll(/var\((--palette-[\w-]+)/g)) {
            expect(
              vars[name],
              `${theme.id}/${appearance} --${token} references undefined ${name}`,
            ).toBeDefined();
          }
        }
      }
    }
  });

  it("only asks for font faces the layout actually loads", () => {
    // `--font-display`/`--font-body` resolve against variables injected by
    // `next/font` in the root layout. A theme naming a face nobody loads falls
    // through to the generic family and silently loses its typography.
    for (const theme of ALL_THEMES) {
      const vars = varsFor(theme, "light");
      const declared = {
        display: vars["--font-display"],
        body: vars["--font-body"],
      };

      for (const role of ["display", "body"] as const) {
        const expectedVariable = FONT_VARIABLES[theme.fonts[role]];
        expect(
          declared[role],
          `${theme.id} --font-${role} should use ${expectedVariable} ` +
            `(registry says ${theme.fonts[role]})`,
        ).toContain(`var(${expectedVariable})`);

        // And it must degrade to a real family, not to nothing.
        expect(
          declared[role].split(",").length,
          `${theme.id} --font-${role} needs a fallback stack`,
        ).toBeGreaterThan(1);
      }
    }
  });
});
