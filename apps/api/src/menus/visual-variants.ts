/**
 * Visual variants a menu may select.
 *
 * Only the default exists in this feature — the editor shows the switcher with
 * the other options disabled. The column and this allowlist exist now so that
 * shipping a real variant later is an entry here plus theme work, with no data
 * migration.
 */
export const VISUAL_VARIANTS = ['default'] as const;

export type VisualVariant = (typeof VISUAL_VARIANTS)[number];

export const DEFAULT_VISUAL_VARIANT: VisualVariant = 'default';
