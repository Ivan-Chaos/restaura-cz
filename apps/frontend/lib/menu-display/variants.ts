import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/design-system/themes";

/**
 * The visual-variant catalogue: what an owner can pick for a menu.
 *
 * Two id spaces meet here on purpose. The API stores a *variant* id — a product
 * name that survives redesigns and lives in the HTTP contract — and the design
 * system renders a *theme* id, which is a CSS file. They are the same string
 * for every style except the first: the API's `default` predates the theme
 * registry and maps onto `warm`. Renaming either side would be a migration for
 * no product value; one line of mapping is cheaper.
 *
 * `slate` is deliberately absent. It is the design system's adversarial test
 * fixture — the opposite of warm on every axis — not a look we sell.
 *
 * The id list is the frontend's half of the cross-app contract; the API pins
 * the same literal in `apps/api/src/menus/visual-variants.ts` and
 * `tests/unit/variants.test.ts` asserts they agree.
 */
export const VISUAL_VARIANTS = [
  { id: "default", themeId: "warm" },
  { id: "plain-white", themeId: "plain-white" },
  { id: "liquid-glass", themeId: "liquid-glass" },
  { id: "green-bar", themeId: "green-bar" },
  { id: "modern", themeId: "modern" },
  { id: "refined", themeId: "refined" },
] as const satisfies readonly { id: string; themeId: ThemeId }[];

export type VisualVariant = (typeof VISUAL_VARIANTS)[number];
export type VisualVariantId = VisualVariant["id"];

export const VISUAL_VARIANT_IDS = VISUAL_VARIANTS.map((v) => v.id) as readonly VisualVariantId[];

export const DEFAULT_VISUAL_VARIANT: VisualVariantId = "default";

export function isVisualVariant(value: unknown): value is VisualVariantId {
  return typeof value === "string" && VISUAL_VARIANT_IDS.includes(value as VisualVariantId);
}

/**
 * The theme a stored variant renders with.
 *
 * Never throws: a value the catalogue does not know — a retired variant, a
 * hand-edited row, `undefined` from an older API — renders as Classic rather
 * than as an unstyled page (spec FR-007).
 */
export function themeForVariant(value: unknown): ThemeId {
  if (!isVisualVariant(value)) return DEFAULT_THEME.id;
  const entry = VISUAL_VARIANTS.find((v) => v.id === value);
  return entry && isThemeId(entry.themeId) ? entry.themeId : DEFAULT_THEME.id;
}

/** The variant that renders with a theme, or `undefined` for fixture-only themes. */
export function variantForTheme(themeId: ThemeId): VisualVariantId | undefined {
  return VISUAL_VARIANTS.find((v) => v.themeId === themeId)?.id;
}
