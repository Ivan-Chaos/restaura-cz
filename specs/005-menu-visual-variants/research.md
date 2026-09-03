# Research: Menu Visual Variants

**Feature**: 005-menu-visual-variants | **Date**: 2026-09-03

No `NEEDS CLARIFICATION` markers remained in the spec. The unknowns below are the technical choices the plan depends on. Each was resolved against the installed code, the installed Next.js docs, or the design references gathered during `/speckit-specify`.

## R1. Variant identifiers vs. theme identifiers

- **Decision**: The API allowlist becomes `['default', 'plain-white', 'liquid-glass', 'green-bar', 'modern', 'refined']`. The frontend adds `lib/menu-display/variants.ts`, a catalogue of the same six ids, each carrying the theme id it renders with (`default → warm`, every other id → the theme of the same name). `themeForVariant(value)` narrows any untrusted string and falls back to `warm`.
- **Rationale**: `default` is already stored in production rows and named in the HTTP contract; `warm` is a design-system name. One explicit mapping line is cheaper than renaming either side, and the catalogue is the natural home for owner-facing metadata (name, description keys) that the theme registry should not carry. `slate` stays a registry theme without a catalogue entry, which is exactly how the spec wants it hidden from owners.
- **Alternatives considered**: Renaming `warm` → `default` (touches registry, CSS selectors, tests, storybook defaults, and still leaves the theme/product concepts conflated). Renaming the API value `default` → `warm` (data migration for zero product value).

## R2. Expressing translucency, blur and an ambient background inside the token system

- **Decision**: Add an **optional** token group to `tokens.ts`, declared by every theme with neutral defaults:

  | Token | Purpose | Default (non-glass themes) | Liquid Glass |
  |-------|---------|----------------------------|--------------|
  | `--panel` | Surface of the panel that groups a category's dishes and backs the sticky bars | `transparent` | translucent palette step (`--palette-glass-light` / `-dark`) |
  | `--panel-border` | Hairline edge of the panel | `transparent` | thin light edge step |
  | `--panel-blur` | Backdrop blur radius | `0px` | `18px` |
  | `--panel-inset` | Inner padding of the panel | `0px` | `calc(var(--spacing) * 4)` |
  | `--ambient` | Background image painted behind the whole menu | `none` | multi-stop gradient of `--palette-aurora-*` steps |
  | `--ambient-motion` | Animation shorthand for the ambient drift | `none` | `ambient-drift 28s ease-in-out infinite alternate` |

  `app/globals.css` exposes them as utilities (`bg-panel`, `border-panel-border`, `backdrop-blur-panel`, `p-panel`) and one `@utility ambient` (background-image + 200% size + animation). A new Server Component `MenuPanel` wraps each category's dish list in `GuestMenu` and `SampleMenu`; with the defaults it renders as a box with no background, no border, no blur and no padding, so Classic and Slate are pixel-identical.
- **Rationale**: Keeps "a theme is a set of token values" true. The lint gate (`check-design-tokens.mjs`) and the theme test (`declares no token outside the catalogue`) both keep working. Reduced-transparency and no-`backdrop-filter` fallbacks are generic: any future translucent theme inherits them.
- **Alternatives considered**: Theme CSS targeting `data-slot` selectors (couples themes to component internals; the contract explicitly forbids a theme needing component knowledge). Translucent `--surface-raised` (the contrast test would measure a colour the guest never sees).

## R3. Keeping Liquid Glass provably accessible

- **Decision**: Two layers. (1) Semantic text/surface tokens in `liquid-glass.css` stay opaque and pass the existing `CONTRAST_PAIRS`. (2) A new unit test `tests/unit/glass-contrast.test.ts` composites `--panel` (alpha) over every `--palette-*` step referenced by `--ambient` and over `--background`, then measures `--foreground`, `--muted-foreground` and `--price` against the composite at 4.5:1. `lib/design-system/contrast.ts` gains a `composite(top, bottom)` helper using culori's `rgb` conversion (source-over). The test runs for any theme whose `--panel` resolves to a colour with alpha < 1, so it is not glass-specific.
- **Rationale**: `culori.wcagContrast` ignores alpha, so a translucent panel would otherwise pass trivially. Compositing over the gradient's extreme stops bounds the worst case the guest can see; the ambient palette ramp is authored inside a narrow lightness band (light: L ≥ 0.90; dark: L ≤ 0.28) so the bound is tight.
- **Alternatives considered**: Screenshot-based contrast in Playwright (non-deterministic across GPUs; flaky by construction). Requiring `--panel` alpha ≥ 0.9 (too opaque to read as glass).

## R4. Fallbacks for blur support, reduced transparency and reduced motion

- **Decision**: In `app/globals.css`, after the theme imports:

  ```css
  @supports not (backdrop-filter: blur(1px)) {
    [data-theme] { --panel: var(--surface-raised); --panel-blur: 0px; }
  }
  @media (prefers-reduced-transparency: reduce) {
    [data-theme] { --panel: var(--surface-raised); --panel-blur: 0px; --ambient: none; }
  }
  ```

  Reduced motion is already handled globally (`animation-duration: 0.01ms`), which freezes the ambient drift at its first frame.
- **Rationale**: `[data-theme]` has the same specificity as `[data-theme="liquid-glass"]` and is declared later, so it wins by order without `!important`. Placing the rules in `globals.css` rather than in the theme file matters: `parseCssVars` in the test helper is a flat parser and would merge a nested `@media` override into the light-appearance variables, making the tests measure the fallback instead of the real glass.
- **Alternatives considered**: Fallbacks inside `liquid-glass.css` (breaks the test parser as above). JS feature detection (adds client code to the guest route; violates PR-002).

## R5. Fonts per style

- **Decision**: Load five more Google faces in the root layout with `subsets: ["latin", "latin-ext"]`, `display: "swap"`, **`preload: false`**, publishing variables registered in `FONT_VARIABLES`:

  | Style | Display | Body |
  |-------|---------|------|
  | Classic (warm) | Fraunces (existing) | Nunito Sans (existing) |
  | Plain White | Inter | Inter |
  | Liquid Glass | Inter | Inter |
  | Green Bar | Oswald | Nunito Sans (existing) |
  | Modern | Manrope | Inter |
  | Refined | Cormorant Garamond | DM Sans |

- **Rationale**: Verified in `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`: `preload` defaults to `true` and injects a `<link rel=preload>` per subset; setting it to `false` leaves only the `@font-face` declaration, and browsers fetch a face only when text actually uses it. So a Classic menu downloads exactly what it does today. All six faces carry `latin-ext` (Czech and German diacritics). Inter is shared by three styles to bound the count. The fine-dining references favour Cormorant / Playfair; Cormorant Garamond has the better `latin-ext` italics. Oswald matches the bold, condensed bar-menu template family. Manrope's 800 weight gives Modern its heavyweight editorial voice.
- **Alternatives considered**: Self-hosted `next/font/local` (no benefit over Google's self-hosted pipeline in `next/font`). Reusing the two existing faces (rejected: Modern, Refined and Green Bar are typographic identities). Playfair Display for Refined (weaker Czech italics, noted in the 001 research).

## R6. Palette additions

- **Decision**: New oklch ramps in `styles/palette.css`, each 50–950 like the existing ones:
  - `ink` — true neutral (chroma 0) for Plain White and Modern text/surfaces.
  - `bottle` — deep greens (hue ≈ 155) for Green Bar surfaces; `brass` — amber/brass (hue ≈ 75) for its accent and prices.
  - `ivory` — warm off-whites (hue ≈ 90, very low chroma) for Refined surfaces; Refined reuses `cocoa` for text and `wine` for the accent.
  - `aurora` — soft lavender→teal→peach steps used only by the Liquid Glass ambient gradient, plus two alpha steps `--palette-glass-light: oklch(0.99 0.005 260 / 0.72)` and `--palette-glass-dark: oklch(0.22 0.02 265 / 0.62)` and edge steps `--palette-glass-edge-light/dark`.
  - `signal` — one saturated accent (hue ≈ 30) for Modern.
- **Rationale**: The palette is the only sanctioned home for literal colour; every theme must reference steps that exist (test-enforced). Ramps keep the door open for future themes without new literals.
- **Alternatives considered**: `color-mix()` in theme files (a literal-ish expression the parser cannot resolve; fails the "only assigns palette steps that exist" intent).

## R7. Picker interaction and save mechanism

- **Decision**: `VariantSwitcher` becomes a client component rendering a `<fieldset>` of radio cards (one per catalogue entry), each card a label with a `VariantSwatch` (a `<ThemeScope as="span">` mini preview using only tokens: ground, a display-face "Aa", a primary dot, a price sample) plus name and one-line description. It submits through `useActionState(setVisualVariantAction)`; choosing a radio calls `form.requestSubmit()`, and a visible "Apply style" button remains for keyboard users and no-JS. Success toasts `MenuEditor.variantSaved` on the falling edge of `pending` (the same convention as other editor saves). Errors render via `Auth.errors` codes, as `PublishControls` does.
- **Server action**: `setVisualVariantAction(_prev, formData)` reads `locale`, `menuId`, `visualVariant`; validates with `readVisualVariant` (zod enum over the catalogue ids, message code `INVALID`) before calling `PATCH /menus/:id`; on success revalidates the editor and, if the response carries a `publicSlug`, the public path; returns `SAVED`.
- **Rationale**: Follows the documented form rules: schema + `readX` before the API call so JS and no-JS validate identically; plain radios need no react-hook-form. Auto-submit on change makes the picker feel like a switcher (SC-001) while the button keeps it operable without JS.
- **Alternatives considered**: One `<form>` per style with a submit button (six forms, worse semantics for a single choice). `useActionForm` (built for typed inputs; a radio group gains nothing from RHF).

## R8. Owner preview route

- **Decision**: `app/[locale]/preview/[menuId]/[variant]/page.tsx`, dynamic, gated with `requireProfile(locale)` itself (it is outside the `/workspace` layout on purpose), fetches the owner's menu via `getMenu` (works for drafts), renders `<ThemeScope theme={themeForVariant(variant)}>` around a slim `PreviewBar` and `GuestMenu(toDisplayMenu(menu))`. Unknown variant → `notFound()`. `robots: noindex`. The editor links each style card's "Preview" to it; `PreviewBar` offers "Back to editor" and "Use this style" (posts `setVisualVariantAction`).
- **Rationale**: Reuses the guest composition and adapter so the preview cannot drift from what guests see. Outside the shell so dark appearance and full-bleed layout work (FR-010, FR-017). `toDisplayMenu` accepts `MenuDetail` structurally (it has every `PublicMenu` field plus ids), so no second adapter.
- **Alternatives considered**: Modal/iframe preview in the editor (iframe cannot share the session cookie cleanly in all browsers; modal inherits the light lock). Preview inside `/workspace` (sidebar and light lock).

## R9. Public sample menus and landing links

- **Decision**: No change to the sample-menu route; it already fans out over `THEME_IDS`, so `/cs/sample-menu/refined` etc. are prerendered once the registry grows. `slate` remains reachable there as a design-system fixture. The landing "demo" capability lists per-style links derived from the catalogue (so Slate is not advertised).
- **Rationale**: Zero new routes for US4; static rendering preserved.
- **Alternatives considered**: A dedicated `/styles` gallery page (more scope than the spec asks for).

## R10. Test matrix extensions

- **Decision**:
  - API e2e: parametrised test accepting every id in `VISUAL_VARIANTS`; unknown id → 400 `VALIDATION_FAILED`.
  - Frontend unit: `variants.test.ts` pins the catalogue ids to the exact API list literal (both sides pin the same literal, satisfying the two-sided contract rule), asserts `themeForVariant` mapping and fallback, and asserts every catalogue theme exists in the registry. `themes.test.ts` and `contrast.test.ts` need no edits: they loop the registry. `glass-contrast.test.ts` per R3.
  - Stories: `VariantSwitcher` (idle, saving, error; play test selects a card and asserts the stubbed action received the id), `MenuPanel`, and the existing Sample Menu page story now switchable through the theme toolbar to all seven themes.
  - E2E: editor picks "Green Bar", reloads, still selected; guest page `[data-theme]` equals `green-bar`; sample menu loops `THEME_IDS × {light,dark}` @320 with axe; preview route renders a draft in the chosen style and returns 404-equivalent for a signed-out visitor; Storybook e2e theme toolbar test extended to one new theme.
  - The `storybook-alt` Vitest pass stays `slate/dark/de` (it exists to catch hard-coded values, and slate is the most adversarial). Per-theme coverage of the assembled page comes from Playwright, which is cheaper than a third full story pass.
- **Rationale**: Every acceptance scenario in the spec maps to at least one automated check, and the checks reuse the existing harnesses.

## R11. Structure per style: presentation recipes (added 2026-09-03 after review)

- **Decision**: Tokens decide colour, type, radius and rhythm; a **presentation recipe**
  (`lib/menu-display/presentation.ts`) decides structure. A recipe names one variant on each of
  six axes — header layout, nav shape, section-heading style, dish layout for rows and for
  cards, price treatment, and whether categories sit in a `MenuPanel` — and the menu
  compositions (`GuestMenu`, `SampleMenu`) read it. Each axis is a prop on a component that
  already existed (`MenuHeader.layout`, `CategoryNav.shape`, `CategoryHeading.style`,
  `DishRow.layout`, `DishCard.surface`, the new `DishPrice.treatment`). `presentationForTheme`
  maps a theme id to its recipe; `warm` and `slate` get `classic`, so the fixture theme stays a
  pure re-colouring.
- **Rationale**: The first cut proved the user's point — five palettes on one layout look like
  one menu. Structure cannot be expressed in tokens, and theme CSS reaching into component
  internals would couple themes to markup. Component variants keep everything typed,
  story-tested and inside the token lint, and the recipe is one readable table.
- **Alternatives considered**: `[data-theme]`-scoped CSS overriding `data-slot` selectors
  (untyped, untested by stories, silently breaks when markup changes). Forking a composition
  per style (five copies of the same page to keep in sync).
- **Glass specifics**: cards are translucent (`bg-surface-raised/55`) with a specular inset in
  `--shadow-card`; the *blur* stays on the `MenuPanel`, header and nav bars, never per card
  (PR-003). The ambient became three radial colour blobs over a wash, so the blur has something
  to refract; every stop is a palette step, so the composite contrast test still enumerates it.

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Variant id ↔ theme id | Catalogue with explicit mapping; `default → warm` (R1) |
| Translucency in a token system | Optional `panel*`/`ambient*` token group + `MenuPanel` (R2) |
| Contrast on translucent panels | Composite test over ambient stops and background (R3) |
| Blur/transparency/motion fallbacks | Generic rules in `globals.css` on `[data-theme]` (R4) |
| Font loading cost | `preload: false`, `display: swap`, shared Inter (R5) |
| New colours | Six palette ramps + glass alpha steps (R6) |
| Picker save | Radio cards, `useActionState`, auto-submit + button (R7) |
| Preview | Dynamic gated route outside the shell reusing `GuestMenu` (R8) |
| Public samples | Existing route fan-out; landing links from catalogue (R9) |
| Tests | Extensions listed in R10 |

## Sources

- Installed Next.js font docs: `apps/frontend/node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` (`preload`, `subsets`, `display`)
- Theme contract: `apps/frontend/specs/001-menu-design-system/contracts/theme-contract.md`
- Design references gathered in the spec phase: Apple Liquid Glass web adaptations (backdrop blur, translucent edge, layered depth; contrast and reduced-motion caveats), QR menu template archetypes (Clean Minimal, Elegant Typography, Dark Mode for bars), fine-dining menu guidance (two typefaces, ivory ground, hairline rules), 2026 menu trend round-ups (heavyweight type, selective hero photography)
