import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCssVars, type CssVars } from "@/lib/design-system/contrast";
import { THEMES, type Theme } from "@/lib/design-system/themes";
import type { Appearance } from "@/lib/design-system/tokens";

/** Repo root for `apps/frontend`. */
export const APP_ROOT = process.cwd();

export const PALETTE_PATH = join(APP_ROOT, "styles", "palette.css");

export function themePath(theme: Pick<Theme, "id">): string {
  return join(APP_ROOT, "styles", "themes", `${theme.id}.css`);
}

export function readTheme(theme: Pick<Theme, "id">): string {
  return readFileSync(themePath(theme), "utf8");
}

/**
 * The selector a theme uses for a given appearance.
 *
 * The default theme owns `:root`/`.dark` (so unwrapped shadcn primitives are
 * themed) *and* `[data-theme="<id>"]` (so it can also be scoped). Every other
 * theme only ever applies inside a scope.
 */
export function selectorFor(theme: Theme, appearance: Appearance): string {
  if (theme.isDefault) {
    return appearance === "light" ? ":root" : ".dark";
  }
  return appearance === "light"
    ? `[data-theme="${theme.id}"]`
    : `.dark [data-theme="${theme.id}"]`;
}

/** The scoped selector every theme must expose, default included. */
export function scopedSelectorFor(
  theme: Theme,
  appearance: Appearance,
): string {
  return appearance === "light"
    ? `[data-theme="${theme.id}"]`
    : `.dark [data-theme="${theme.id}"]`;
}

/**
 * Every custom property in scope for a theme × appearance: the palette plus the
 * theme's own declarations. Mirrors what the browser resolves for an element
 * inside that scope.
 */
export function varsFor(theme: Theme, appearance: Appearance): CssVars {
  const palette = parseCssVars(readFileSync(PALETTE_PATH, "utf8"), ":root");
  const css = readTheme(theme);

  // Dark builds on light: the dark rule only overrides what changes.
  const light = parseCssVars(css, selectorFor(theme, "light"));
  if (appearance === "light") return { ...palette, ...light };

  const dark = parseCssVars(css, selectorFor(theme, "dark"));
  return { ...palette, ...light, ...dark };
}

export const ALL_THEMES = THEMES as readonly Theme[];
