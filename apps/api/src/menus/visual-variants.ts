/**
 * Visual variants a menu may select.
 *
 * This list is the contract with the frontend: `apps/frontend/lib/menu-display/variants.ts`
 * pins the same literal in a unit test, and `specs/001-menu-creation-publishing/contracts/http-api.md`
 * documents it. `default` is the warm "Classic" look and is what every menu
 * created before feature 005 carries. Adding a variant is an entry here plus a
 * theme on the frontend — the column is plain text, so no data migration.
 */
export const VISUAL_VARIANTS = [
  'default',
  'plain-white',
  'liquid-glass',
  'green-bar',
  'modern',
  'refined',
] as const;

export type VisualVariant = (typeof VISUAL_VARIANTS)[number];

export const DEFAULT_VISUAL_VARIANT: VisualVariant = 'default';
