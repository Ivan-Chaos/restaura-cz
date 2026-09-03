# Data Model: Menu Visual Variants

**Feature**: 005-menu-visual-variants | **Date**: 2026-09-03

No database change. The feature widens the set of values one existing column may hold and introduces two in-code catalogues (one per app) that must agree.

## Entities

### VisualVariant (API allowlist)

`apps/api/src/menus/visual-variants.ts`

| Field | Type | Rules |
|-------|------|-------|
| id | `'default' \| 'plain-white' \| 'liquid-glass' \| 'green-bar' \| 'modern' \| 'refined'` | Lowercase kebab-case. Exactly six. `default` is `DEFAULT_VISUAL_VARIANT`. |

Used by `UpdateMenuDto.visualVariant` via `@IsIn(VISUAL_VARIANTS)`. Any other value → `400 VALIDATION_FAILED`.

### Menu (unchanged shape)

`apps/api/src/db/schema.ts` → `menu.visual_variant text NOT NULL DEFAULT 'default'`

| Field | Change |
|-------|--------|
| visualVariant | Value domain widens from `{default}` to the six ids. Column type, default and nullability unchanged. Existing rows keep `default`. |

Relationship: one menu → exactly one variant id. A stored value outside the allowlist (possible only if a variant is retired later) is **not** rejected on read; the frontend resolves it to Classic (FR-007).

### VisualVariantEntry (frontend catalogue)

`apps/frontend/lib/menu-display/variants.ts`

| Field | Type | Rules |
|-------|------|-------|
| id | `VisualVariantId` (same six literals) | Pinned to the API list in `tests/unit/variants.test.ts`. |
| themeId | `ThemeId` | `default → "warm"`; others → same string. Must exist in `THEMES`. |
| messageKey | `keyof Messages["VisualVariants"]` | Points at `{ name, description }` in every locale. |

Helpers: `isVisualVariant(value): value is VisualVariantId`; `themeForVariant(value: unknown): ThemeId` (unknown → `DEFAULT_THEME.id`); `VISUAL_VARIANT_IDS`.

### Theme (design-system registry, extended)

`apps/frontend/lib/design-system/themes.ts`

| Field | Change |
|-------|--------|
| id | Registry grows to `warm, slate, plain-white, liquid-glass, green-bar, modern, refined`. |
| fonts.display / fonts.body | `FontKey` widens to `fraunces \| nunitoSans \| inter \| oswald \| manrope \| cormorant \| dmSans`; `FONT_VARIABLES` maps each to the `--font-*` variable the root layout publishes. |

Invariant (test-enforced): exactly one default; every registered theme has `styles/themes/<id>.css`; every catalogue `themeId` is a registered theme; `slate` is registered but has no catalogue entry.

### Semantic token catalogue (extended)

`apps/frontend/lib/design-system/tokens.ts` → `OPTIONAL_TOKENS` gains:

| Token | Kind | Non-glass value | Notes |
|-------|------|-----------------|-------|
| `panel` | colour (may carry alpha) | `transparent` | Excluded from `CONTRAST_PAIRS`; covered by the composite test when alpha < 1. |
| `panel-border` | colour | `transparent` | |
| `panel-blur` | length | `0px` | Bound to `backdrop-blur-panel`. |
| `panel-inset` | length | `0px` | Bound to `p-panel` via `--spacing-panel`. |
| `ambient` | `<image>` or `none` | `none` | Palette references inside it are what the composite test enumerates. |
| `ambient-motion` | animation shorthand or `none` | `none` | Keyframes `ambient-drift` defined once in `globals.css`. |

Optional means: `themes.test.ts` does not require them, but every theme declares them anyway so behaviour never depends on inheritance from `:root`.

## Validation rules

| Where | Rule | Source |
|-------|------|--------|
| API `PATCH /menus/:id` | `visualVariant ∈ VISUAL_VARIANTS`; at least one of `name`, `visualVariant` present | FR-006 |
| API | Only the owning account may patch | FR-005 |
| Frontend action | `readVisualVariant(formData)` → zod enum over `VISUAL_VARIANT_IDS`; failure code `INVALID`, API never called | FR-006 |
| Frontend render | `themeForVariant` never throws; unknown → `warm` | FR-007 |
| Frontend preview route | `variant` segment must satisfy `isVisualVariant`, else `notFound()` | FR-017 |

## State transitions

`visualVariant` has no lifecycle; it is a plain attribute editable at any time in `draft` or `published`. Publishing state is unaffected. Changing it on a published menu is visible on the next guest request because the public page is `force-dynamic` (the action also revalidates the public path for parity with publish/unpublish).

## Localisation data

`messages/{cs,en,de}.json`

```text
VisualVariants.<id>.name          six entries, e.g. "Liquid Glass" / "Tekuté sklo" / "Flüssiges Glas"
VisualVariants.<id>.description   one line each
Themes.<themeId>                  add the five new theme ids (theme contract requirement)
MenuEditor.variantTitle           keep
MenuEditor.variantDescription     reword: no "more styles coming"
MenuEditor.variantApply           "Apply style"
MenuEditor.variantSaved           toast
MenuEditor.variantPreview         "Preview"
Preview.title / Preview.back / Preview.useStyle / Preview.metaTitle
```

Removed: `MenuEditor.variantDefault`, `MenuEditor.variantComingSoon` (dead after the rewrite; the catalogue gate would otherwise keep three unused strings alive).
