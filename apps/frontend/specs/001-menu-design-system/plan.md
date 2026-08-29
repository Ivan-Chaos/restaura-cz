# Implementation Plan: Digital Menu Design System

**Branch**: `001-menu-design-system` (git: `feature/frontend/theme-setup`) | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-menu-design-system/spec.md`

**User direction for this plan**: use shadcn components; create a theme that works in both dark and light modes; the menu itself supports multiple themes (components must support them now, themes need not all be defined now); verify changes with Playwright; document the design system in Storybook.

## Summary

Build a token-driven design system for a menus-only digital menu service: a warm default theme
(light + dark) plus a deliberately different `slate` example theme, both expressed purely as
CSS variables that shadcn (`base-nova` / `@base-ui/react`) primitives and menu-domain
composites consume. Theme (`data-theme` on any subtree) and appearance (`.dark` via
`next-themes`) are independent axes. Everything is documented in Storybook 10 with theme /
appearance / locale toolbars, tested with Vitest (unit + browser component tests via the
Storybook Vitest addon) and Playwright e2e on a statically rendered sample-menu route, and
visually verified during implementation through the Playwright MCP server. Ordering-oriented
components are built and documented but never wired into the app. See
[research.md](./research.md) for every decision.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2, Next.js 16.3 (App Router, Server Components first)

**Primary Dependencies**: Tailwind CSS 4, shadcn 4 (`base-nova`, `@base-ui/react` 1.7), `class-variance-authority`, `tailwind-merge`, `tw-animate-css`, `next-themes` 0.4, `next-intl` 4, `lucide-react`, `motion` 13. **New runtime**: `sonner` (toast). **New dev**: `storybook` 10 + `@storybook/nextjs-vite` + addons (a11y, themes, vitest, docs), `vitest` 4 + `@vitest/browser` + `playwright`, `@playwright/test`, `@axe-core/playwright`, `culori`.

**Storage**: N/A — fixture data only (`lib/design-system/fixtures/`)

**Testing**: Vitest 4 (unit, node) · Vitest browser mode driven by Storybook stories with `play` functions (component + a11y) · Playwright e2e against production build (`cs` + `de`, 5 viewports, 2 themes × 2 appearances, axe scan, screenshots) · Playwright MCP for interactive verification during implementation · `scripts/check-design-tokens.mjs` literal-value gate in `pnpm lint`

**Target Platform**: Mobile-first web (320–1920 px), evergreen browsers; guest menus opened via link/QR on phones

**Project Type**: Web frontend (Next.js app inside `apps/frontend` of a pnpm monorepo) — design-system layer + documentation workbench

**Performance Goals**: Sample menu page on production build: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (mid-tier mobile, 4G); initial route JS < 200 KB gzipped; guest menu renders as Server Components with `"use client"` only in interactive leaves (sheet, tabs, category nav, toast, appearance toggle)

**Constraints**: All visual values via tokens (zero literals in components); WCAG 2.1 AA contrast in every theme × appearance; keyboard operable; reduced-motion honored; all strings via `next-intl` in `cs`/`en`/`de`; `latin-ext` fonts; static rendering (`setRequestLocale`); shadcn components added only via CLI

**Scale/Scope**: ~22 shadcn primitives, ~14 menu-domain components, ~10 ordering-oriented components, 4 layout primitives, 2 themes × 2 appearances, ~60 stories, 1 sample route, 3 MDX foundation docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | How the plan satisfies it |
|-----------|------|--------|---------------------------|
| I. Code Quality | Strict TS, lint + `tsc` clean, verified Next APIs, `@/i18n/navigation` imports, reuse-before-create, shadcn in `components/ui` | ✅ | New components compose `components/ui`; no duplicates of existing `LocaleSwitcher` (it is *moved into* the system as `components/menu/LanguageSwitcher` re-using its logic); Next docs consulted for `next/font`, `generateStaticParams`, search params on static pages before coding |
| I. Code Quality | No dead code | ✅ | Geist fonts removed from layout when replaced; boilerplate `globals.css` replaced, not appended |
| II. Testing | Acceptance scenarios → automated tests; unit for `lib/`, component tests for interactive components, e2e in `cs` + one more locale; behavior-level assertions; message catalog completeness in CI; deterministic | ✅ | Story `play` functions = component tests; Vitest unit for price formatting, theme registry, contrast; Playwright e2e in `cs` + `de`; `scripts/check-messages.mjs` verifies key parity; screenshot tests use fixed viewport + `animations: 'disabled'` |
| III. UX Consistency | All text via `next-intl`, tokens from `globals.css`, light+dark for every component, responsive 320–1920, a11y AA, consistent interaction states, reduced motion | ✅ | This feature *is* the enforcement mechanism: token gate script, theme × appearance matrix in Storybook and e2e, a11y addon + axe, `motion-safe:` + `MotionConfig reducedMotion="user"` |
| IV. Performance | Static rendering, CWV budgets, minimal client JS, `next/image`, `next/font`, only active locale messages | ✅ | Sample route is static; dish images via `next/image` with fixed aspect ratios; fonts via `next/font/google`; `"use client"` restricted to listed leaves; Storybook/Vitest/Playwright are dev-only (0 KB runtime); `sonner` is the only runtime addition (~4 KB, justified in Complexity Tracking) |
| V. Simplicity | Simplest solution, justify new deps/abstractions, prefer platform primitives | ✅ with justifications | Theming is pure CSS variables (no theme context/JS); ordering components are stateless; new dev tooling justified below |
| Tech constraints | pnpm, shadcn CLI, lucide icons, `@base-ui/react`, locales in `i18n/routing.ts` | ✅ | All primitives via `pnpm dlx shadcn@latest add`; icons lucide only; no new locale config |
| Workflow | Spec Kit flow, `feature/frontend/<slug>` branch, PR gates, commit prefixes, AGENTS.md updated | ✅ | AGENTS.md gains a "Design system & theming" section in the same change (tokens, `ThemeScope`, Storybook, token gate) |

**Pre-Phase-0 result**: PASS. **Post-Phase-1 result**: PASS (see re-evaluation at the end).

## Project Structure

### Documentation (this feature)

```text
specs/001-menu-design-system/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R12
├── data-model.md        # Phase 1 — tokens, themes, display models
├── quickstart.md        # Phase 1 — how to run/validate
├── contracts/
│   ├── theme-contract.md      # CSS variables a theme MUST/MAY define
│   ├── component-api.md       # Public props of menu/ordering/layout components
│   └── messages-contract.md   # next-intl namespaces/keys the components consume
├── checklists/requirements.md
└── tasks.md             # Phase 2 — created by /speckit-tasks
```

### Source Code (`apps/frontend`, repository root is the monorepo)

```text
app/
├── globals.css                     # Tailwind import, @custom-variant dark, @theme inline, imports of styles/*
└── [locale]/
    ├── layout.tsx                  # next/font (Fraunces, Nunito Sans), ThemeProvider (next-themes), MotionConfig, Toaster
    ├── page.tsx
    └── sample-menu/
        └── page.tsx                # Static composed sample menu (e2e + CWV target); ?theme= in non-prod only

styles/
├── palette.css                     # Layer 1: --palette-* oklch ramps (warm + cool)
├── tokens.css                      # Layer 2 defaults: :root (warm light) + .dark (warm dark) semantic tokens
└── themes/
    ├── warm.css                    # [data-theme="warm"] — explicit copy of defaults (scopable)
    └── slate.css                   # [data-theme="slate"] — example alternative theme

components/
├── ui/                             # shadcn (CLI-generated only): button, badge, card, separator, avatar, skeleton,
│                                   #   tooltip, dialog, sheet, tabs, accordion, sonner, input, textarea, select,
│                                   #   checkbox, radio-group, switch, label, field, scroll-area, empty, toggle
├── theme/
│   ├── ThemeScope.tsx              # <div data-theme={id}> (Server Component)
│   ├── AppearanceProvider.tsx      # next-themes ThemeProvider wrapper ("use client")
│   └── AppearanceToggle.tsx        # light/dark/system toggle ("use client")
├── layout/
│   ├── Container.tsx · Stack.tsx · Grid.tsx · Section.tsx
├── menu/
│   ├── MenuHeader.tsx · MenuCover.tsx · ShareMenu.tsx
│   ├── CategoryNav.tsx ("use client") · CategoryHeading.tsx
│   ├── DishCard.tsx · DishRow.tsx · DishImage.tsx
│   ├── Price.tsx · PriceList.tsx
│   ├── DietaryMarker.tsx · DietaryMarkerList.tsx · DietaryLegend.tsx
│   ├── AvailabilityBadge.tsx · HighlightBadge.tsx
│   ├── SpecialsStrip.tsx · MenuFooter.tsx · LanguageSwitcher.tsx (replaces components/LocaleSwitcher.tsx)
│   └── SampleMenu.tsx              # Full composition used by the route and the story
└── ordering/                       # Future-facing, presentational only; import forbidden from app/**
    ├── QuantityStepper.tsx · SelectableDishCard.tsx · OptionGroup.tsx · LineItem.tsx
    ├── OrderSummary.tsx · StickyActionBar.tsx · ProgressStepper.tsx
    ├── CurrencyInput.tsx · SpecialRequestField.tsx · OrderStatus.tsx
    └── ReviewSelectionMock.tsx     # Story-only composition (Story 5)

lib/
├── utils.ts                        # cn() — generated by shadcn init
└── design-system/
    ├── themes.ts                   # Theme registry: ids, display names, isDefault
    ├── tokens.ts                   # Typed list of semantic token names (drives contract test + docs table)
    ├── dietary.ts                  # Allergen/dietary enum, EU numbers, lucide icon map
    ├── price.ts                    # formatPrice(locale, currency, PriceModel)
    ├── contrast.ts                 # WCAG helpers (culori) used by tests + docs
    └── fixtures/sample-menu.ts     # Sample restaurant, categories, dishes

messages/{cs,en,de}.json            # + namespaces: Menu, DietaryMarkers, Availability, Price, Ordering, Appearance, SampleMenu

.storybook/
├── main.ts                         # framework: @storybook/nextjs-vite; addons a11y, themes, vitest, docs
├── preview.tsx                     # imports app/globals.css; decorators: appearance, menu theme, locale (NextIntlClientProvider)
├── vitest.setup.ts
└── docs/                           # Foundations.mdx, Theming.mdx (theme-author guide), Accessibility.mdx

tests/
├── unit/                           # price.test.ts, themes.test.ts, contrast.test.ts (parses styles/**)
├── e2e/
│   ├── sample-menu.spec.ts         # viewports × locales × themes × appearance; axe; no ordering affordances
│   └── storybook-smoke.spec.ts     # Storybook boots, toolbars switch theme/appearance
└── fixtures/

scripts/
├── check-design-tokens.mjs         # fails on literal colors/arbitrary values in components/**
└── check-messages.mjs              # key parity across cs/en/de

vitest.config.ts · vitest.workspace.ts · playwright.config.ts
```

**Structure Decision**: Single Next.js app (`apps/frontend`); the design system lives *inside*
the app rather than as a separate workspace package. Rationale: only one consumer exists,
Storybook `nextjs-vite` works best against the real Next app (fonts, `next/image`, next-intl),
and extracting a package later is mechanical once `components/`, `styles/`, and
`lib/design-system/` are the only sources of truth (they already are, by construction).

## Design Decisions Carried Into Phase 1

1. **Default = warm.** `:root`/`.dark` in `styles/tokens.css` hold the warm theme so every shadcn
   primitive is warm with no wrapper. `styles/themes/warm.css` re-declares the same values under
   `[data-theme="warm"]` so a warm menu can be scoped inside a non-default context later.
2. **Theme switching is attribute-only.** `ThemeScope` is a Server Component that renders
   `<div data-theme={id} className="contents">`; no context, no JS.
3. **Appearance is `next-themes`.** `attribute="class"`, `defaultTheme="system"`,
   `enableSystem`, `disableTransitionOnChange`; `<html suppressHydrationWarning>`.
4. **Menu components take display models, not domain entities** (see data-model.md) — the
   backend shape is unknown; adapters will map to these models later.
5. **Ordering components are controlled & stateless**; ESLint `no-restricted-imports` blocks
   `@/components/ordering/*` inside `app/**`.
6. **Stories are the tests.** Every interactive component has at least one story with a `play`
   function; the Vitest addon runs them headless in CI. a11y violations are errors.
7. **Verification loop per task**: implement → `pnpm storybook` → Playwright MCP opens the
   story, toggles appearance × theme, screenshots → fix → run `pnpm test` → mark done.

## Complexity Tracking

| Violation / addition | Why needed | Simpler alternative rejected because |
|----------------------|------------|--------------------------------------|
| New runtime dep `sonner` (~4 KB gz) | FR-011 requires a Toast primitive; shadcn's toast *is* sonner | Base UI has no toast primitive; hand-rolled live regions are an a11y risk for marginal savings |
| Dev deps: Storybook 10 (+4 addons), Vitest 4 + browser mode, Playwright, axe, culori | FR-021–025 (living docs, per-story tests, a11y + contrast verification); user explicitly requested Storybook + Playwright | A `/design-system` Next route as docs lacks controls, a11y panel, theme toolbars and would need custom test scaffolding — more code to own than the tooling it replaces. Zero runtime cost. |
| Extension tokens beyond shadcn's set (`--success`, `--warning`, `--info`, `--highlight`, `--price`, `--surface-raised`, `--font-display`, `--font-body`, `--density`) | Menu semantics (availability, allergen, chef's pick, price emphasis, display face, rhythm) have no shadcn equivalent; overloading `--accent` breaks hover states | Reusing `--primary`/`--accent`/`--destructive` conflates hover/CTA/error semantics with status semantics, defeating theme authoring (FR-002) |
| `styles/` directory alongside `app/globals.css` | Multiple theme files must be importable individually and parsed by the contrast test | Single 400-line `globals.css` is hard to review and impossible to test per theme; constitution's "single token source" is preserved because `globals.css` is the only importer |
| `?theme=` search param on the sample route (non-prod only) | Playwright must exercise both themes on a real build | A second route per theme duplicates the page; reading a search param is guarded so production stays fully static |
| `"use client"` in `CategoryNav`, `AppearanceToggle`, `ShareMenu`, sheet/tabs/toast wrappers | Scroll-spy, theme toggle, clipboard, and Base UI interactive primitives need the browser | Pushed to the smallest leaves; `DishCard`, `Price`, headers, footer, `ThemeScope`, `SampleMenu` remain Server Components |

## Post-Design Constitution Re-check

Re-evaluated after producing data-model.md and contracts/:

- **I** — Contracts define one component per concept; `LocaleSwitcher` is migrated, not duplicated. ✅
- **II** — `component-api.md` lists the required story/`play` coverage per component; `quickstart.md` gives the exact commands for each test layer. ✅
- **III** — `theme-contract.md` makes AA contrast a *required* property of a valid theme, tested automatically. `messages-contract.md` enumerates every string. ✅
- **IV** — No new runtime deps beyond `sonner`; sample route static; fonts/images via Next primitives. ✅
- **V** — No state library, no theme context, no package extraction. Additions justified above. ✅

**Gate result**: PASS — ready for `/speckit-tasks`.
