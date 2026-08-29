/**
 * The menu theme registry.
 *
 * A theme is a complete assignment of the semantic tokens in
 * `lib/design-system/tokens.ts`, expressed as CSS in `styles/themes/<id>.css`.
 * Switching theme is an attribute change — `<ThemeScope theme="slate">` — never
 * a component change. See `contracts/theme-contract.md`.
 *
 * To add a theme: create the CSS file, import it from `app/globals.css`, add an
 * entry here, and add its display name to all three message catalogues. The
 * unit tests will tell you if it misses a token or fails contrast.
 */

/** Font keys the root layout loads via `next/font`. */
export type FontKey = "fraunces" | "nunitoSans";

/**
 * The CSS variable each loaded font publishes.
 *
 * These are *not* declared in any stylesheet — `next/font` injects them onto
 * `<html>` at render time. A theme's `--font-display` / `--font-body` therefore
 * depends on the root layout actually loading the face; this map is the shared
 * contract between `app/[locale]/layout.tsx`, the theme CSS, the Storybook
 * preview, and `tests/unit/themes.test.ts`.
 */
export const FONT_VARIABLES: Record<FontKey, string> = {
  fraunces: "--font-fraunces",
  nunitoSans: "--font-nunito-sans",
};

export interface Theme {
  /** Used as the `data-theme` value and the CSS file name. */
  id: string;
  /** Exactly one theme is the default; its values also own `:root`. */
  isDefault: boolean;
  /**
   * Which loaded font each typographic role resolves to. Documentation only —
   * the CSS is authoritative — but it makes the dependency on the layout's
   * `next/font` calls explicit and testable.
   */
  fonts: { display: FontKey; body: FontKey };
}

export const THEMES = [
  {
    id: "warm",
    isDefault: true,
    fonts: { display: "fraunces", body: "nunitoSans" },
  },
  {
    id: "slate",
    isDefault: false,
    fonts: { display: "nunitoSans", body: "nunitoSans" },
  },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_IDS = THEMES.map((t) => t.id) as readonly ThemeId[];

export const DEFAULT_THEME = THEMES.find((t) => t.isDefault) as Extract<
  (typeof THEMES)[number],
  { isDefault: true }
>;

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}

/** Narrow an untrusted value (URL segment, config) to a usable theme id. */
export function toThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME.id;
}
