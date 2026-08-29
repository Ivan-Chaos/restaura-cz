# Research: Digital Menu Design System

**Feature**: 001-menu-design-system | **Date**: 2026-08-29

All "NEEDS CLARIFICATION" items from the Technical Context were resolved here. Each entry
records the decision, rationale, and rejected alternatives.

---

## R1. Component primitive library

- **Decision**: shadcn CLI (`shadcn@4.x`, already a dependency) with the configured `base-nova`
  style, which generates components on `@base-ui/react` primitives (already a dependency).
  Primitives are added via `pnpm dlx shadcn@latest add <name>` — never hand-copied.
- **Rationale**: Required by the constitution (shadcn + base-nova + `@base-ui/react` are the
  declared stack; CLI-only additions are a MUST). `base-nova` is the "compact" visual style,
  which suits dense menu listings on phones. Base UI primitives provide accessible dialog,
  sheet, tabs, accordion, select, etc. out of the box (FR-011, FR-012).
- **Alternatives considered**: Radix-based `vega` style (constitution already chose base-nova;
  switching would be an unjustified deviation). Hand-written primitives (violates reuse and
  CLI-only rules, more a11y risk).
- **Gap found**: `shadcn` is in `package.json` and `components.json` exists, but
  `app/globals.css` still contains the create-next-app boilerplate (no shadcn token block,
  no `@custom-variant dark`, no `tw-animate-css` import) and `lib/utils.ts` does not exist.
  → First implementation task is `shadcn init` (or equivalent CSS bootstrap) before any `add`.

## R2. Theming architecture: two independent axes

- **Decision**: Two orthogonal mechanisms that redefine the *same* semantic CSS variables:
  1. **Appearance (light/dark)** — `next-themes` with `attribute="class"`, producing `.dark`
     on `<html>`; Tailwind 4 `@custom-variant dark (&:is(.dark *));` per shadcn's Tailwind 4
     convention. Follows `prefers-color-scheme` by default (`enableSystem`).
  2. **Menu theme** — a `data-theme="<theme-id>"` attribute applied to any subtree via a
     `<ThemeScope theme="…">` component. Each theme is a CSS file that redefines the semantic
     tokens for `[data-theme="x"]` and `.dark [data-theme="x"], [data-theme="x"].dark`.
     `:root` carries the default **warm** theme so shadcn components are warm with no wrapper.
- **Rationale**: Satisfies FR-006–FR-009 (theme × appearance are independent, subtree-scoped,
  zero component changes). CSS-variable redefinition is exactly how shadcn's own theming works
  ("dark mode works by overriding the same tokens inside a `.dark` selector"), so every shadcn
  primitive is automatically themeable. No JS is needed to switch menu theme on the guest
  page — a Server Component can render `<div data-theme="…">` (Principle IV).
- **Alternatives considered**:
  - Tailwind variants per theme (`theme-warm:bg-…`) — leaks theme names into components,
    violates FR-006.
  - Multiple Tailwind configs / CSS bundles per theme — heavier, cannot scope to a subtree.
  - JS theme objects injected as inline styles — SSR flicker, worse performance, harder to
    author.
- **Dark-inside-scope selector**: `.dark [data-theme="x"]` (html has `.dark`, scope below) —
  specificity is higher than `[data-theme="x"]`, so dark wins. Verified pattern in Tailwind 4
  cascade; `@layer base` ordering is not required because both rules are plain selectors.

## R3. Token model (three layers)

- **Decision**:
  1. **Palette tokens** (`--palette-*`, oklch) — raw warm ramp: cream, parchment, linen,
     terracotta, paprika, wine, olive, herb, honey, charcoal-brown. Theme authors *may* use
     them; components never reference them.
  2. **Semantic tokens** — the full shadcn set (`--background`, `--foreground`, `--card`,
     `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`,
     `--border`, `--input`, `--ring`, `--radius`, `--chart-1..5`, `--sidebar-*`) **plus a
     menu-domain extension**: `--success`/`--success-foreground` (available, vegan),
     `--warning`/`--warning-foreground` (limited, allergen), `--info`/`--info-foreground`,
     `--highlight`/`--highlight-foreground` (chef's pick / new), `--price`
     (price text color), `--surface-raised` (dish card on parchment), `--font-display`,
     `--font-body`, `--density` (spacing multiplier: 1 = default; a "dense" theme may set 0.85).
  3. **Tailwind utilities** — everything exposed through `@theme inline` so components use
     `bg-card`, `text-price`, `font-display`, `rounded-lg`, etc. (FR-001, FR-002, SC-004).
- **Rationale**: Matches shadcn's documented extension path ("add new tokens under
  `:root`/`.dark`, expose via `@theme inline`"). Extension tokens are the minimum needed for
  menu semantics not covered by shadcn (FR-016 status colors, FR-014 highlight, FR-003 display
  face). `--density` allows themes to alter rhythm without new components (Story 2).
- **Alternatives considered**: Reusing `--accent` for highlights (shadcn uses accent for hover
  state — conflating breaks hover styling). Separate token namespace `--menu-*` for everything
  (duplicates shadcn tokens; primitives would not pick them up).
- **Color space**: oklch, as shadcn defaults; perceptually uniform → easier to keep contrast
  when authoring alternative themes.

## R4. Typography

- **Decision**: `next/font/google` — **Fraunces** (variable, `latin` + `latin-ext`) as
  `--font-display` for establishment name, category headings, dish names; **Nunito Sans**
  (variable, `latin` + `latin-ext`) as `--font-body` for descriptions, prices, UI. Geist /
  Geist Mono removed from the layout (unused after this change; dead code rule).
- **Rationale**: Fraunces is a soft "old-style" serif that reads as hospitable and food-ish
  without being kitsch; Nunito Sans is highly legible at small sizes with rounded warmth.
  Both have `latin-ext`, mandatory for Czech (ř, ě, ů) and German (ß, ü). Constitution
  requires `next/font`. Themes can swap faces by redefining `--font-display`/`--font-body`
  as long as the font is loaded by the layout (documented limitation in the theme contract).
- **Alternatives considered**: Playfair Display (more formal/fine-dining, weaker latin-ext
  italics), Lora (safe but less character), keeping Geist (neutral/technical, contradicts the
  warm brief).

## R5. Documentation: Storybook

- **Decision**: **Storybook 10.x** with the `@storybook/nextjs-vite` framework (supports
  Next.js 16 and Vitest 4; `@storybook/nextjs` webpack framework has known "cannot find module"
  issues on Next 16). Addons: `@storybook/addon-a11y`, `@storybook/addon-themes`,
  `@storybook/addon-vitest`, `@storybook/addon-docs`. Stories colocated as
  `*.stories.tsx` next to components; MDX docs for Foundations and Theme Authoring.
- **Global toolbar**: two `addon-themes` decorators stacked — `withThemeByClassName` for
  appearance (`light` / `dark` → `.dark` on root) and `withThemeByDataAttribute` for menu
  theme (`warm` / `slate` → `data-theme` on root) — plus a custom locale toolbar decorator
  that wraps stories in `NextIntlClientProvider` with `messages/{cs,en,de}.json` (FR-022,
  Story 3).
- **Tailwind**: `nextjs-vite` handles the PostCSS pipeline; `app/globals.css` is imported in
  `.storybook/preview.tsx`. `next/font/google` is mocked by the framework (documented), so
  font variables are supplied by a preview-level CSS fallback stack.
- **Rationale**: Storybook is the industry-standard living documentation with live variants,
  a11y panel, and theme toolbars — directly satisfies FR-021–FR-024. Vitest addon turns every
  story into a component test (Principle II) without a second test harness.
- **Alternatives considered**: Custom `/design-system` Next.js route as docs (no a11y panel,
  no controls, have to build toolbar/theme switching ourselves; still used *only* for the
  sample-menu e2e page — see R7). Ladle (lighter, but no Next 16 framework, weaker addon
  ecosystem). Docusaurus (not a component workbench).
- **Version pin**: install the latest 10.x at implementation time (`10.5.x` as of research);
  all `@storybook/*` packages must share one exact version.

## R6. Testing strategy

- **Decision**:
  - **Component tests**: Vitest 4 (browser mode, Playwright provider) via Storybook's
    `addon-vitest` — every interactive story gets a `play` function asserting roles, keyboard
    operation, and visible text. a11y checks run per story via `addon-a11y` (`test: 'error'`).
  - **Unit tests**: Vitest (node) for `lib/design-system/*` — price formatting per locale,
    theme registry, and a **token contrast test** that parses each theme's CSS, resolves
    text/background pairs, and asserts WCAG AA (4.5:1 / 3:1) using `culori` (dev-only)
    (SC-002, FR-010).
  - **E2E**: `@playwright/test` against `next build && next start`, route
    `/{locale}/sample-menu` in `cs` and `de` (longest strings), viewports 320/375/768/1024/1920,
    light+dark, themes `warm`+`slate`; asserts no horizontal scroll, dish/price visible, zero
    ordering affordances (SC-008, SC-012), `@axe-core/playwright` scan per page (SC-007), and
    screenshot snapshots as a visual regression baseline.
  - **Agent verification**: the Playwright MCP server configured in this repo is used during
    `/speckit-implement` to open Storybook and the sample page, toggle themes/appearance, and
    visually confirm each change before marking a task done (user requirement).
  - **Token-literal lint**: `scripts/check-design-tokens.mjs` scans `components/**` for hex/
    rgb/hsl literals and Tailwind arbitrary values (`bg-[`, `text-[#`, `p-[`, etc.) and fails
    `pnpm lint` on any hit (SC-004). Allow-list: `components/ui/**` files as generated by
    shadcn (they use tokens already) and `lib/design-system/palette.css`.
- **Rationale**: One runner (Vitest) for unit+component, Playwright for e2e — the two-tool
  minimum required by Principle II. Stories double as tests, so documentation coverage and test
  coverage stay in lockstep (SC-006 ⇔ FR-025).
- **Alternatives considered**: Jest + RTL (second config, no browser mode, worse with ESM/
  Tailwind 4). Chromatic for visual regression (paid SaaS; Playwright screenshots suffice for
  now). `eslint-plugin-tailwindcss` for literal detection (incomplete Tailwind 4 support as of
  research; a 40-line script is simpler and fully under our control).

## R7. Where the sample menu lives

- **Decision**: A statically rendered route `app/[locale]/sample-menu/page.tsx` (Server
  Component, `setRequestLocale`, `generateStaticParams`) rendering the full composed menu from
  fixture data in `lib/design-system/fixtures/sample-menu.ts`. Accepts `?theme=warm|slate`
  search param only in non-production (`NODE_ENV !== 'production'`) via `ThemeScope`;
  otherwise renders the default theme. The same composition is also a Storybook story
  ("Examples / Sample Menu Page") so docs and e2e use one source of truth.
- **Rationale**: Playwright e2e and Core Web Vitals budgets (SC-009) must be measured on a real
  Next.js production build, not inside Storybook's iframe. Fixture data keeps the feature free
  of backend dependencies (spec Assumptions).
- **Alternatives considered**: e2e against Storybook only (cannot measure LCP/INP of the real
  app shell, no next-intl routing). Hard-coding sample data in the page (duplicates the story).

## R8. Toast / notifications

- **Decision**: shadcn `sonner` component (adds runtime dep `sonner`, ~4 KB gzipped) as the
  Toast primitive required by FR-011.
- **Rationale**: shadcn's current toast implementation *is* sonner; the legacy `toast`
  component is deprecated in the registry. Under the 20 KB justification threshold.
- **Alternatives considered**: Hand-built toast on Base UI (no toast primitive in Base UI
  yet; a11y live-region handling is easy to get wrong).

## R9. Dietary / allergen markers

- **Decision**: Fixed enum of 14 EU-regulated allergens (EU 1169/2011: gluten, crustaceans,
  eggs, fish, peanuts, soy, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs)
  plus dietary flags (vegetarian, vegan, gluten-free, lactose-free, spicy ×1–3, halal, kosher).
  Each marker: `lucide-react` icon + translated label (`messages/*.json` namespace
  `DietaryMarkers`) + optional EU allergen number (Czech menus customarily print 1–14).
- **Rationale**: Czech law requires allergen disclosure on menus; the numbered list is what
  Czech guests expect. Icons from lucide per constitution. Never color-only (FR-016).
- **Alternatives considered**: Free-form string tags (untranslatable, unreliable icons).

## R10. Reduced motion & motion library

- **Decision**: Motion via `motion` (already a dependency) only in leaf client components
  (sheet/drawer, toast, category-nav active indicator); wrapped by a `useReducedMotion`-aware
  `MotionConfig reducedMotion="user"` in the app shell; CSS transitions use
  `motion-safe:` / `motion-reduce:` Tailwind variants (FR-020, SC-010).
- **Alternatives considered**: No JS motion at all (acceptable fallback; `motion` is retained
  because it is already a dependency and `MotionConfig` centralizes reduced-motion handling).

## R11. Ordering-oriented components (future-facing)

- **Decision**: Built as pure presentational components in `components/ordering/**` with
  controlled props and callbacks (`onQuantityChange`, `onSelect`) and **no state, context, or
  data layer**. Only rendered in Storybook (group "Ordering (future)") and in the mock
  "Review your selection" story; never imported by `app/**` in this feature (SC-012 enforced by
  an e2e assertion and an ESLint `no-restricted-imports` rule scoped to `app/**`).
- **Rationale**: Delivers FR-014b/c without building an ordering flow (spec scope). The lint
  rule makes the "documentation only" boundary mechanical rather than a convention.

## R12. Example alternative theme

- **Decision**: `slate` — a cool, minimal, sharper-radius theme (graphite/blue-grey surfaces,
  cobalt accent, `--radius: 0.25rem`, `--density: 0.9`, `--font-display` falling back to the
  body face). Exists to prove theme-ability (FR-007, SC-003) and is intentionally
  *visually opposite* to `warm` so untokenized styling is obvious in screenshots.
- **Alternatives considered**: A second warm variant (too similar to catch leaks).

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Storybook version / Next 16 compatibility | Storybook 10.x + `@storybook/nextjs-vite` (R5) |
| How themes scope to a subtree | `data-theme` attribute + CSS variable redefinition (R2) |
| Dark mode mechanism | `next-themes` class strategy + `@custom-variant dark` (R2) |
| Test runners | Vitest 4 (unit + browser component tests via Storybook) + Playwright e2e (R6) |
| Contrast verification | `culori`-based unit test over theme CSS + axe in Storybook and Playwright (R6) |
| Literal-value enforcement | `scripts/check-design-tokens.mjs` in `pnpm lint` (R6) |
| Font pairing | Fraunces + Nunito Sans via `next/font/google` with `latin-ext` (R4) |
| Toast implementation | shadcn `sonner` (R8) |
| Allergen model | EU 14 + dietary flags, translated, numbered (R9) |
| shadcn not initialized in CSS | `shadcn init` / CSS bootstrap is task #1 (R1) |

## Sources

- Storybook 10 announcement (Next 16 + Vitest 4 support): https://storybook.js.org/blog/storybook-10/
- Storybook for Next.js with Vite: https://storybook.js.org/docs/get-started/frameworks/nextjs-vite
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- `@storybook/nextjs` on Next 16 issue: https://github.com/storybookjs/storybook/discussions/33762
- shadcn theming (tokens, `@theme inline`, `.dark`, custom tokens): https://ui.shadcn.com/docs/theming
- shadcn Base UI styles (`base-nova`): https://ui.shadcn.com/docs/changelog/2026-01-base-ui
- shadcn Next.js installation: https://ui.shadcn.com/docs/installation/next

---

## Next.js 16 API notes (T001 — verified against `node_modules/next/dist/docs/`)

Read: `01-getting-started/13-fonts.md`, `01-getting-started/12-images.md`,
`03-api-reference/03-file-conventions/page.md`, `03-api-reference/04-functions/generate-static-params.md`.

1. **`searchParams` forces dynamic rendering.** The `page.md` reference states plainly:
   *"`searchParams` is a Request-time API whose values cannot be known ahead of time. Using it
   will opt the page into dynamic rendering at request time."* Guarding the read behind
   `NODE_ENV` does not help — the reference in the component tree is what opts in.

   **→ Plan correction (supersedes plan.md T065 / "?theme= search param")**: the sample menu
   route becomes `app/[locale]/sample-menu/[[...theme]]/page.tsx` (optional catch-all) with
   `generateStaticParams()` returning one entry per locale × theme (`[]`, `["warm"]`,
   `["slate"]`). Every variant is **prerendered**, Playwright gets real URLs
   (`/cs/sample-menu`, `/cs/sample-menu/slate`), and Principle IV (static rendering) is
   preserved with no dynamic opt-in. `dynamicParams = false` rejects unknown themes.

2. **`params` and `searchParams` are Promises**; `PageProps<"/route">` / `LayoutProps<"/route">`
   global helpers are generated by Next (already used in `app/[locale]/layout.tsx` and
   `page.tsx`). Server Components `await params`; Client Components use `use(params)`.

3. **`next/font/google`**: call at module scope, prefer variable fonts (no `weight` needed),
   pass `variable: "--font-x"` and apply the returned `.variable` class on `<html>`. Fonts are
   self-hosted at build time — no network request at runtime. `subsets` must include
   `latin-ext` for Czech/German diacritics.

4. **`next/image`**: local images live under `public/` and are referenced from `/`; explicit
   `width`/`height` (or `fill` + sized parent) prevent CLS. Confirms the `DishImage` contract.

5. **`generateStaticParams`**: runs before pages are generated at build; child segments receive
   parent params. Returning an array of `{ segment: value }` objects; catch-all segments return
   `{ slug: string[] }`.
