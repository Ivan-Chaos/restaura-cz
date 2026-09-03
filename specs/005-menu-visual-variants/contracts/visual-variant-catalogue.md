# Contract: Visual Variant Catalogue and Theme Contract Additions

Frontend-internal contract. It binds `lib/menu-display/variants.ts`, `lib/design-system/themes.ts`, `lib/design-system/tokens.ts`, the five new theme files, `app/globals.css`, and the pages that render menus. Every MUST is enforced by a unit, story or e2e test named in the plan.

## 1. Catalogue

```ts
// lib/menu-display/variants.ts
export const VISUAL_VARIANTS = [
  { id: "default",      themeId: "warm" },
  { id: "plain-white",  themeId: "plain-white" },
  { id: "liquid-glass", themeId: "liquid-glass" },
  { id: "green-bar",    themeId: "green-bar" },
  { id: "modern",       themeId: "modern" },
  { id: "refined",      themeId: "refined" },
] as const;
```

- Ids MUST equal the API allowlist exactly and in the same order (pinned by test).
- Every `themeId` MUST be a registered theme.
- `themeForVariant(unknown)` MUST return `DEFAULT_THEME.id` for anything not in the catalogue.
- `slate` MUST NOT appear in the catalogue.
- Owner-facing name and description come from `VisualVariants.<id>.{name,description}` in all three catalogues.

## 2. Where the variant is applied

| Surface | Rule |
|---------|------|
| `app/[locale]/m/[slug]/page.tsx` | `<ThemeScope theme={themeForVariant(menu.visualVariant)}>` with `className="ambient bg-background text-foreground flex min-h-svh flex-1 flex-col"`: a real box painted in the theme's own ground (a dark style must not sit on the warm `<body>` colour) that the ambient field can span. Same class list on the preview and sample-menu scopes. |
| `app/[locale]/preview/[menuId]/[variant]/page.tsx` | Same scope with the URL's variant; `notFound()` unless `isVisualVariant(variant)`. Gated by `requireProfile`. `robots: noindex`. |
| `app/[locale]/sample-menu/[[...theme]]/page.tsx` | Unchanged: theme id from the URL; all registered themes prerendered. |
| Dashboard (`/workspace/**`) | Never wrapped in a menu ThemeScope except inside `VariantSwatch`, which scopes only its own box. Light lock untouched. |

The rendered scope element MUST carry `data-theme="<themeId>"` (this is what the e2e tests read).

## 3. Theme contract additions (optional token group)

Appended to `specs/001-menu-design-system/contracts/theme-contract.md`:

```css
/* Optional: panel and ambient treatment. Declare in both appearances. */
--panel            /* colour, may carry alpha; transparent when the theme has no panels */
--panel-border     /* colour */
--panel-blur       /* length */
--panel-inset      /* length */
--ambient          /* <image> | none */
--ambient-motion   /* <'animation'> | none */
```

- A theme MUST declare all six in its light rule; the dark rule MAY override any of them.
- A theme MUST NOT define keyframes; `ambient-drift` is defined once in `globals.css`.
- A theme MUST NOT contain `@media` or `@supports` blocks (the test parser is flat). Fallbacks live in `globals.css`.
- If `--panel` resolves to a colour with alpha < 1, the theme MUST pass the composite contrast test: `--foreground`, `--muted-foreground`, `--price` ≥ 4.5:1 against `--panel` composited over `--background` and over every `--palette-*` step referenced by `--ambient`, in both appearances.

### Utilities exposed by `globals.css`

| Utility | Resolves to |
|---------|-------------|
| `bg-panel` | `--panel` |
| `border-panel-border` | `--panel-border` |
| `backdrop-blur-panel` | `--panel-blur` |
| `p-panel` (`px-`, `py-` …) | `--panel-inset` via `--spacing-panel` |
| `ambient` | `background-image: var(--ambient); background-size: 200% 200%; animation: var(--ambient-motion)` |

### Generic fallbacks (in `globals.css`, after theme imports)

```css
@supports not (backdrop-filter: blur(1px)) {
  [data-theme] { --panel: var(--surface-raised); --panel-blur: 0px; }
}
@media (prefers-reduced-transparency: reduce) {
  [data-theme] { --panel: var(--surface-raised); --panel-blur: 0px; --ambient: none; }
}
```

Reduced motion: covered by the existing global `prefers-reduced-motion` rule.

## 4. Component contract

- `components/menu/MenuPanel.tsx` (Server Component): `<div data-slot="menu-panel" className="bg-panel border-panel-border backdrop-blur-panel rounded-xl border p-panel">`. With default tokens it MUST add no visible box and no layout shift (Classic and Slate screenshots unchanged).
- `GuestMenu` and `SampleMenu` wrap each category's dish list in `MenuPanel`. Blur therefore appears at most once per category, never per dish (PR-003).
- `MenuHeader` and `CategoryNav` MAY additionally take `bg-panel backdrop-blur-panel` if a visual check shows Classic unchanged; otherwise they stay as they are (decided at implementation, recorded in AGENTS.md).
- `VariantSwatch` renders `<ThemeScope as="span" theme={themeId} className="…">` and uses only token utilities (`bg-background`, `bg-primary`, `text-price`, `font-display`). Its price sample is the bare currency glyph, not an amount: the swatch sits on the editor page next to real prices, and a sample amount collides with them in tests and in the owner's eye.
- `VariantSwitcher` takes `previewBasePath: string` (the style id is appended), never a function: it is a client component and a Server Component cannot pass it one.

## 5. Fonts

`FONT_VARIABLES` MUST list every face the root layout loads, and every theme's `--font-display`/`--font-body` MUST reference one of them with a fallback stack (existing test). New faces MUST be declared with `preload: false` and `subsets: ["latin", "latin-ext"]`.

| FontKey | Variable | Google family |
|---------|----------|---------------|
| fraunces | `--font-fraunces` | Fraunces (existing) |
| nunitoSans | `--font-nunito-sans` | Nunito Sans (existing) |
| inter | `--font-inter` | Inter |
| oswald | `--font-oswald` | Oswald |
| manrope | `--font-manrope` | Manrope |
| cormorant | `--font-cormorant` | Cormorant Garamond |
| dmSans | `--font-dm-sans` | DM Sans |

## 6. Per-style token intent (authoring guide, not enforced)

| Style | background / foreground | primary | price | radius | density | panel | ambient |
|-------|-------------------------|---------|-------|--------|---------|-------|---------|
| plain-white | ink-50 / ink-950 (dark: ink-950 / ink-50) | ink-900 (dark ink-100) | ink-950, plain | 0.25rem | 1 | transparent | none |
| liquid-glass | aurora-50 / ink-950 (dark: ink-950 / ink-50) | cobalt-600 (dark cobalt-400) | ink-950 | 1.25rem | 1 | glass-light / glass-dark, blur 18px, inset 4 | aurora gradient, drift |
| green-bar | bottle-900 / cream-100 (dark: bottle-950 / cream-50) | brass-500 | brass-400 | 0.375rem | 0.9 | transparent | none |
| modern | ink-50 / ink-950 (dark: ink-950 / ink-100) | signal-600 (dark signal-400) | ink-950, bold | 0.5rem | 1.05 | transparent | none |
| refined | ivory-100 / cocoa-900 (dark: cocoa-950 / ivory-100) | wine-700 (dark wine-400) | cocoa-900, quiet | 0.125rem | 1.1 | transparent | none |

Green Bar is dark in both appearances by design (its dark appearance deepens the green); it MUST still pass every contrast pair in both.
