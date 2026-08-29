# Tasks: Digital Menu Design System

**Input**: Design documents from `/specs/001-menu-design-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (theme-contract.md, component-api.md, messages-contract.md), quickstart.md

**Tests**: INCLUDED — the constitution (Principle II) requires automated tests for every acceptance scenario, spec FR-025 mandates them, and the user asked for Playwright verification. Stories with `play` functions are the component tests; Vitest unit tests cover `lib/`; Playwright covers the real route.

**Verification loop (every UI task)**: implement → `pnpm storybook` → open the story with Playwright MCP (`browser_navigate` to `http://localhost:6006/?path=/story/<id>` or the iframe URL with `&globals=theme:slate;appearance:dark`) → `browser_take_screenshot` + `browser_snapshot` → confirm the acceptance scenario → then run the automated tests. A task is not done until both pass in light **and** dark.

**Organization**: Tasks are grouped by user story (US1–US5 from spec.md) so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 (guest menu), US2 (multi-theme), US3 (Storybook docs), US4 (staff forms), US5 (ordering building blocks)
- All paths are relative to `apps/frontend/`

## Path Conventions

Single Next.js app: `app/`, `components/{ui,theme,layout,menu,ordering}/`, `styles/`, `lib/design-system/`, `messages/`, `.storybook/`, `tests/{unit,e2e}/`, `scripts/` — see plan.md "Project Structure".

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling, dependencies, configs. Nothing visual yet.

- [X] T001 Read `node_modules/next/dist/docs/01-app/` guides for `next/font`, `generateStaticParams`, `searchParams` on static pages, and `next/image`; note any deviations from training data in `specs/001-menu-design-system/research.md` under a new "Next.js 16 API notes" heading
- [X] T002 Bootstrap shadcn: run `pnpm dlx shadcn@latest init` (accept existing `components.json`: base-nova, neutral, css variables) so that `lib/utils.ts` (`cn`) is created and `app/globals.css` gains `@import "tw-animate-css"`, `@custom-variant dark (&:is(.dark *))`, the `:root`/`.dark` token block and `@theme inline`; commit the generated files unchanged
- [X] T003 Install dev dependencies with pnpm: `storybook@^10 @storybook/nextjs-vite@^10 @storybook/addon-a11y@^10 @storybook/addon-themes@^10 @storybook/addon-vitest@^10 @storybook/addon-docs@^10 vitest@^4 @vitest/browser@^4 @vitest/coverage-v8@^4 playwright @playwright/test @axe-core/playwright culori @types/culori jsdom` and runtime `sonner`; verify the lockfile is updated and all `@storybook/*` share one exact version
- [X] T004 [P] Add scripts to `package.json`: `storybook`, `build-storybook`, `test:unit`, `test:stories`, `test:e2e`, `test`, `typecheck`, and extend `lint` to `eslint && node scripts/check-design-tokens.mjs && node scripts/check-messages.mjs` (see quickstart.md scripts table)
- [X] T005 [P] Create `vitest.config.ts` with two projects: `unit` (environment node, include `tests/unit/**/*.test.ts`) and `storybook` (browser mode, provider playwright, chromium headless, `storybookTest()` plugin from `@storybook/addon-vitest/vitest-plugin`, setupFiles `.storybook/vitest.setup.ts`)
- [X] T006 [P] Create `playwright.config.ts`: testDir `tests/e2e`, `webServer` = `pnpm build && pnpm start` on port 3000 (reuse existing), projects for chromium; `expect.toHaveScreenshot` with `animations: 'disabled'`, `maxDiffPixelRatio: 0.01`; baseURL `http://localhost:3000`
- [X] T007 [P] Create `.storybook/main.ts`: framework `@storybook/nextjs-vite`, stories glob `["../components/**/*.stories.tsx", "../.storybook/docs/**/*.mdx"]`, addons `addon-docs`, `addon-a11y`, `addon-themes`, `addon-vitest`; `staticDirs: ["../public"]`
- [X] T008 [P] Create `scripts/check-design-tokens.mjs`: recursively scan `components/**/*.{ts,tsx}` (excluding `components/ui/**`) for regexes `#[0-9a-fA-F]{3,8}\b`, `\b(rgb|rgba|hsl|hsla|oklch)\(`, and Tailwind arbitrary values `\b(bg|text|border|ring|shadow|fill|stroke|p|px|py|m|mx|my|gap|w|h|rounded|text)-\[`; print `file:line: match` and exit 1 on any hit; exit 0 otherwise
- [X] T009 [P] Create `scripts/check-messages.mjs`: load `messages/en.json` as the key source, flatten keys, assert every key exists in `cs.json` and `de.json` and that neither has extra keys; print missing/extra per locale; exit 1 on mismatch
- [X] T010 [P] Add ESLint rule to `eslint.config.mjs`: for files matching `app/**`, `no-restricted-imports` with patterns `@/components/ordering/*` and `**/components/ordering/*` (message: "Ordering components are documentation-only in this phase — see spec SC-012")
- [X] T011 [P] Add `storybook-static/`, `test-results/`, `playwright-report/`, `tests/e2e/**/*-snapshots/*-linux*` (keep windows/darwin snapshots as generated) and `coverage/` to `.gitignore`

**Checkpoint**: `pnpm install`, `pnpm lint` (scripts pass on empty component dirs), `pnpm typecheck` all green; `pnpm storybook` boots with zero stories.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens, default warm theme (light + dark), fonts, theme/appearance plumbing, shadcn primitives, layout primitives, Storybook decorators, message namespaces. Every user story depends on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tokens & CSS

- [X] T012 Create `styles/palette.css`: oklch ramps (steps 50–950) for `cream`, `parchment`, `linen`, `terracotta`, `paprika`, `wine`, `olive`, `herb`, `honey`, `cocoa`, `graphite`, `cobalt` as `--palette-<hue>-<step>` on `:root`
- [X] T013 Create `lib/design-system/tokens.ts`: `SEMANTIC_TOKENS` const array of every required + optional token name from `contracts/theme-contract.md`, `REQUIRED_TOKENS`, `CONTRAST_PAIRS` (the pair table from the contract with minimum ratios), and `SemanticToken` type
- [X] T014 Create `styles/tokens.css`: `:root` = warm **light** (cream `--background`, parchment `--card`, linen `--surface-raised`, terracotta `--primary`, wine `--price`, olive `--success`, honey `--warning`, cocoa `--foreground`, `--radius: 0.75rem`, `--density: 1`, `--font-display: var(--font-fraunces), Georgia, serif`, `--font-body: var(--font-nunito-sans), system-ui, sans-serif`, warm-tinted `--shadow-card`/`--shadow-overlay`, motion tokens) and `.dark` = warm **dark** (cocoa/brown surfaces, lighter terracotta, cream text) — every token in `REQUIRED_TOKENS` set in both; values reference `--palette-*`
- [X] T015 Rewrite `app/globals.css`: `@import "tailwindcss"; @import "tw-animate-css"; @import "../styles/palette.css"; @import "../styles/tokens.css";` (theme files added in US2), `@custom-variant dark (&:is(.dark *));`, `@theme inline` mapping every semantic token to Tailwind (`--color-*`, `--font-display`, `--font-body`, `--radius-*` scale, `--shadow-card`, `--shadow-overlay`, `--ease-menu`, `--duration-fast/base/slow`) plus a `--spacing-density-{1..8}: calc(var(--spacing) * N * var(--density))` scale; base layer sets `body { @apply bg-background text-foreground font-body }` and `h1–h4 { @apply font-display }`; remove the create-next-app boilerplate
- [X] T016 [P] Create `lib/design-system/contrast.ts`: `parseCssVars(css: string, selector: string): Record<string, string>` (extract declarations from a selector block), `resolveVar(value, vars)` (follows `var(--x)` chains incl. palette), `contrastRatio(a, b)` using `culori` (`wcagContrast`), `checkTheme(css, themeSelectorLight, themeSelectorDark, pairs)` returning failures `{ pair, appearance, ratio, min }`
- [X] T017 [P] Create `tests/unit/contrast.test.ts`: read `styles/palette.css` + `styles/tokens.css`, assert `checkTheme` returns no failures for `:root` / `.dark` against `CONTRAST_PAIRS`; print a ratio matrix on failure (must pass after T014)
- [X] T018 [P] Create `tests/unit/tokens.test.ts`: assert every `REQUIRED_TOKENS` entry is declared in both `:root` and `.dark` of `styles/tokens.css`, and every token declared in `tokens.css` is listed in `SEMANTIC_TOKENS` (no undocumented tokens)

### Fonts, appearance, theme scope

- [X] T019 Update `app/[locale]/layout.tsx`: replace Geist/Geist_Mono with `Fraunces` (variable `--font-fraunces`, subsets `latin`, `latin-ext`, `display: swap`) and `Nunito_Sans` (variable `--font-nunito-sans`, same subsets); add `suppressHydrationWarning` to `<html>`; wrap children in `<AppearanceProvider>` (T020) and `<MotionConfig reducedMotion="user">` (client wrapper in `components/theme/MotionProvider.tsx`); mount `<Toaster />` from `components/ui/sonner` once
- [X] T020 [P] Create `components/theme/AppearanceProvider.tsx` (`"use client"`): wraps `next-themes` `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, `storageKey="restaura-appearance"`
- [X] T021 [P] Create `components/theme/ThemeScope.tsx` (Server Component): props per `contracts/component-api.md`; renders `<Tag data-theme={theme} className={cn("contents", className)}>`; validates `theme` with `isThemeId` and falls back to `DEFAULT_THEME.id`
- [X] T022 [P] Create `lib/design-system/themes.ts`: `Theme` type, `ThemeId`, `THEMES` (initially only `warm`, `isDefault: true`, fonts fraunces/nunitoSans), `DEFAULT_THEME`, `isThemeId`
- [X] T023 [P] Create `tests/unit/themes.test.ts`: exactly one default theme; every `THEMES[i].id` has a file `styles/themes/<id>.css` **or** is the default (file added in US2 — write the assertion so it passes once `warm.css` exists, skip-with-reason until then); `isThemeId` rejects unknown ids

### shadcn primitives (CLI only — never hand-edit generated files except to fix lint)

- [X] T024 Run `pnpm dlx shadcn@latest add button badge card separator avatar skeleton tooltip` → `components/ui/*.tsx`; run `pnpm lint && pnpm typecheck`
- [X] T025 Run `pnpm dlx shadcn@latest add dialog sheet tabs accordion sonner scroll-area toggle` → `components/ui/*.tsx`; lint + typecheck
- [X] T026 Run `pnpm dlx shadcn@latest add input textarea select checkbox radio-group switch label field empty` → `components/ui/*.tsx`; lint + typecheck (if `field` or `empty` is not in the registry for base-nova, record the fallback in research.md and compose from `label` + helper text)

### Layout primitives

- [X] T027 [P] Create `components/layout/Container.tsx` (sizes sm/md/lg/full → `max-w-screen-sm/md/lg/none`, horizontal padding `px-density-4`) with `cva` variants
- [X] T028 [P] Create `components/layout/Stack.tsx` (direction, gap 1–8 → `gap-density-N`, align, justify, wrap) with `cva`
- [X] T029 [P] Create `components/layout/Grid.tsx` (`cols: { base, sm?, md?, lg? }` → static class map, no dynamic class strings; gap) 
- [X] T030 [P] Create `components/layout/Section.tsx` (`id`, `title`, `description`, `scroll-mt-density-8`, renders `<section aria-labelledby>`)

### Storybook wiring

- [X] T031 Create `.storybook/preview.tsx`: `import "../app/globals.css"`; CSS fallback for `--font-fraunces`/`--font-nunito-sans` (Google Fonts `<link>` in `.storybook/preview-head.html` for docs fidelity); decorators: `withThemeByClassName({ themes: { light: "", dark: "dark" }, defaultTheme: "light" })`, `withThemeByDataAttribute({ themes: { warm: "warm" }, defaultTheme: "warm", attributeName: "data-theme" })` (slate added in US2), and a `locale` global toolbar (`cs`/`en`/`de`) decorator wrapping stories in `NextIntlClientProvider` with the matching `messages/*.json` and `timeZone="Europe/Prague"`; `parameters.a11y.test = "error"`; `parameters.backgrounds.disable = true`
- [X] T032 [P] Create `.storybook/vitest.setup.ts` calling `setProjectAnnotations` from `@storybook/nextjs-vite` with the preview annotations, and configure `a11y` to fail on `serious`/`critical`
- [X] T033 [P] Create `.storybook/preview-head.html` with `<link>` tags for Fraunces + Nunito Sans (latin-ext) so Storybook matches the app's typography
- [X] T034 [P] Create `components/layout/Layout.stories.tsx` (Container sizes, Stack directions/gaps, Grid responsive, Section) — first stories; verify via Playwright MCP that Storybook renders them in light and dark

### Messages

- [X] T035 Add namespaces `Appearance`, `Themes` (only `warm` for now), `Menu`, `Availability`, `Price`, `DietaryMarkers`, `Allergens`, `Ordering`, `SampleMenu` with every key from `contracts/messages-contract.md` to `messages/en.json`, `messages/cs.json`, `messages/de.json` (Czech and German copy written natively, not machine-literal; German is the length benchmark); run `node scripts/check-messages.mjs`

**Checkpoint**: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` green; Storybook shows Layout stories, toolbars switch light/dark and locale; `/cs` still renders (now warm) in `pnpm dev`.

---

## Phase 3: User Story 1 — Guest Browses a Warm, Legible Menu (Priority: P1) 🎯 MVP

**Goal**: A guest opens `/{locale}/sample-menu` via link on a 360 px phone and can scan categories, dishes, prices, dietary markers, availability — in light and dark — with no horizontal scroll.

**Independent Test**: `pnpm test:e2e --grep @us1` passes for `cs` + `de` at 320/375/768/1024/1920 in light + dark; Storybook "Examples / Sample Menu Page" passes a11y; a tester finds "Svíčková" and its price in < 10 s at 360 px.

### Domain logic (lib)

- [X] T036 [P] [US1] Create `lib/design-system/dietary.ts`: `DIETARY_MARKERS` (ids per data-model 3.5 with lucide icon component map, e.g. `Leaf`, `Sprout`, `WheatOff`, `MilkOff`, `Flame`), `ALLERGENS` (14 EU entries with `number`, `id`, `labelKey`), types `DietaryMarkerId`, `AllergenNumber`
- [X] T037 [P] [US1] Create `lib/design-system/price.ts`: `Money`, `PriceModel` union (data-model 3.4), `formatMoney(locale, money)` via `Intl.NumberFormat` (`currencyDisplay: "narrowSymbol"`, 0 fraction digits for CZK), `describePrice(price)` helper returning the kind for i18n selection
- [X] T038 [P] [US1] Create `tests/unit/price.test.ts`: `189 Kč` for cs/de, `CZK 189`/`189 Kč` for en (assert against the chosen `narrowSymbol` output), EUR formatting, zero renders `0 Kč`, variants keep order, `market` kind has no amount
- [X] T039 [P] [US1] Create `lib/design-system/types.ts`: `Establishment`, `MenuCategory`, `MenuItem`, `OpeningHoursLine`, `ImageModel` per data-model 3.1–3.3
- [X] T040 [US1] Create `lib/design-system/fixtures/sample-menu.ts`: `getSampleMenu(t)` building "U Zlaté Lžíce" with 4 categories / 14 items covering every edge case listed in data-model §5 (no image, no description, market price, variants, from-price, sold out, limited, chefsPick+new, spice 3, 120-char unbroken name, all 14 allergens); text via `SampleMenu` message keys; images from `public/sample-menu/*.jpg` placeholders (add 6 royalty-free food photos ≤ 150 KB each, 4:3, with `width`/`height`)

### Menu components (each task: component + `*.stories.tsx` with all listed states + `play` where interactive)

- [X] T041 [P] [US1] Create `components/menu/Price.tsx` + `Price.stories.tsx` (4 kinds × sizes × emphasis; stories in cs/en/de via locale toolbar) using `text-price font-body tabular-nums`
- [X] T042 [P] [US1] Create `components/menu/PriceList.tsx` + stories (inline vs stacked variants)
- [X] T043 [P] [US1] Create `components/menu/DietaryMarker.tsx` + `DietaryMarkerList.tsx` + `DietaryLegend.tsx` + `Dietary.stories.tsx`: icon with `aria-label`/visible label, allergen number chips, overflow "+N" with `Tooltip` listing the rest, legend renders all 14 + dietary; `play`: tooltip opens on focus, every icon has an accessible name
- [X] T044 [P] [US1] Create `components/menu/AvailabilityBadge.tsx` + `HighlightBadge.tsx` + `Badges.stories.tsx` (available hidden by default, limited = warning, soldOut = muted + strikethrough-free text label; highlights use `bg-highlight`)
- [X] T045 [P] [US1] Create `components/menu/DishImage.tsx` (`next/image`, `sizes`, aspect variants, `bg-muted` placeholder with `UtensilsCrossed` icon when absent) + stories
- [X] T046 [US1] Create `components/menu/DishCard.tsx` + `DishCard.stories.tsx` (depends T041–T045): vertical/horizontal layouts; states image/no image/no description/soldOut (dimmed, `aria-disabled`, label)/limited/highlights/spice/120-char name/`de` locale; `line-clamp-3` description; `Card` from `components/ui`; surface `bg-surface-raised shadow-card`
- [X] T047 [US1] Create `components/menu/DishRow.tsx` + stories (compact, `line-clamp-2` name with `title`, same edge cases)
- [X] T048 [P] [US1] Create `components/menu/CategoryHeading.tsx` + `MenuHeader.tsx` + `MenuFooter.tsx` + `Header.stories.tsx` (logo/no logo, tagline, opening hours, long name; footer contact/notes/legend link)
- [X] T049 [P] [US1] Create `components/menu/MenuCover.tsx` + `ShareMenu.tsx` (`"use client"`, `navigator.clipboard.writeText`, `toast()` from sonner, `qr` slot) + stories; `play`: click → toast text visible
- [X] T050 [US1] Create `components/menu/CategoryNav.tsx` (`"use client"`): horizontal `ScrollArea` on < md, sticky top, `IntersectionObserver` scroll-spy sets `aria-current`, `motion` layout-animated indicator with `motion-reduce` off; keyboard: ArrowLeft/Right move focus, Enter/Space activates + `scrollIntoView`; + stories with `play` for arrows/Enter
- [X] T051 [P] [US1] Create `components/menu/SpecialsStrip.tsx` + stories (snap scroll, returns `null` when empty)
- [X] T052 [US1] Create `components/menu/LanguageSwitcher.tsx` (`"use client"`, `select` and `inline` variants, uses `@/i18n/navigation` `usePathname`/`useRouter`, `Select` from `components/ui`) + stories; migrate logic from `components/LocaleSwitcher.tsx`, update `app/[locale]/page.tsx` import, delete `components/LocaleSwitcher.tsx`
- [X] T053 [US1] Create `components/menu/SampleMenu.tsx` (Server Component composition: `MenuHeader` → `CategoryNav` → `SpecialsStrip` → per-category `Section` + `CategoryHeading` + `Grid` of `DishCard` (or `DishRow` for Drinks) → `DietaryLegend` → `MenuFooter`) + `components/menu/SampleMenu.stories.tsx` titled "Examples / Sample Menu Page" with `parameters.layout = "fullscreen"` and a 360 px viewport story

### Route & e2e

- [X] T054 [US1] Create `app/[locale]/sample-menu/page.tsx`: `generateStaticParams`, `hasLocale` guard, `setRequestLocale`, `generateMetadata` from `SampleMenu` namespace, renders `<SampleMenu>` from `getSampleMenu(await getTranslations("SampleMenu"))`; add `sample-menu` `Metadata` keys to all three message files
- [X] T055 [US1] Create `tests/e2e/sample-menu.spec.ts` (tag `@us1`): for `cs` and `de`, viewports 320/375/768/1024/1920, `colorScheme` light + dark → assert `scrollWidth <= clientWidth`, dish name + price visible, sold-out item has status text, `@axe-core/playwright` 0 violations, `toHaveScreenshot()`; generate baselines with `--update-snapshots`
- [X] T056 [US1] Run `pnpm test:stories` for all `components/menu/**` stories in both configured combos; fix a11y errors (contrast, names, roles) until green
- [X] T057 [US1] Verify with Playwright MCP: open `http://localhost:3000/cs/sample-menu` at 360×780 in light and dark (`browser_resize`, `browser_evaluate` to toggle `.dark`), screenshot both, confirm scenarios 1–5 of Story 1 visually; record screenshots under `specs/001-menu-design-system/verification/us1-*.png`

**Checkpoint**: MVP — a warm, accessible, bilingual sample menu at `/cs/sample-menu` and `/de/sample-menu`, light + dark, fully from design-system parts.

---

## Phase 4: User Story 2 — Restaurant Applies Its Own Look Without Rebuilding Components (Priority: P2)

**Goal**: A second theme (`slate`) applied via `<ThemeScope>` changes every component with zero component edits; theme × appearance are independent; theme authors have a contract and an automated contrast check.

**Independent Test**: `git diff components/` is empty after adding `slate`; Storybook toolbar theme=`slate` re-skins the Sample Menu Page in light and dark; `pnpm test:unit` contrast test passes for both themes; `pnpm test:e2e --grep @us2` passes.

- [X] T058 [P] [US2] Create `styles/themes/warm.css`: `[data-theme="warm"]` and `.dark [data-theme="warm"], [data-theme="warm"].dark` blocks containing the exact same declarations as `:root`/`.dark` in `styles/tokens.css` (T014)
- [X] T059 [P] [US2] Create `styles/themes/slate.css`: cool minimal theme — graphite surfaces, cobalt `--primary`, `--price: var(--foreground)`, `--radius: 0.25rem`, `--density: 0.9`, `--font-display: var(--font-body)`, cool shadows; light + dark; every required token; must pass `CONTRAST_PAIRS`
- [X] T060 [US2] Import both theme files in `app/globals.css` after `tokens.css`; add `slate` to `THEMES` in `lib/design-system/themes.ts` (fonts nunitoSans/nunitoSans); add `Themes.slate` to `cs/en/de` messages
- [X] T061 [US2] Extend `tests/unit/contrast.test.ts` to iterate `THEMES` and check `styles/themes/<id>.css` (`[data-theme="<id>"]` / `.dark [data-theme="<id>"]`) against `CONTRAST_PAIRS`; extend `tests/unit/themes.test.ts` to assert `warm.css` declarations equal `tokens.css` declarations token-for-token and that every theme defines every `REQUIRED_TOKENS` entry in both appearances
- [X] T062 [US2] Update `.storybook/preview.tsx` `withThemeByDataAttribute` themes to `{ warm: "warm", slate: "slate" }` and configure the Vitest storybook project (in `vitest.config.ts`) to run every story twice: globals `{ theme: "warm", appearance: "light", locale: "cs" }` and `{ theme: "slate", appearance: "dark", locale: "de" }`
- [X] T063 [P] [US2] Create `components/theme/ThemeScope.stories.tsx`: side-by-side `warm` vs `slate` scopes rendering `DishCard` + `Button` + `Badge` in one canvas, plus a nested-scope story (slate inside warm) proving subtree scoping (FR-008)
- [X] T064 [P] [US2] Create `components/theme/AppearanceToggle.tsx` (`"use client"`, `useTheme`, icon and segmented variants, `Appearance` namespace, `Toggle`/`Button` from ui) + stories with `play` (click cycles light→dark→system, `aria-pressed`/`aria-label` correct)
- [X] T065 [US2] Update `app/[locale]/sample-menu/page.tsx`: read `searchParams.theme` only when `process.env.NODE_ENV !== "production"` **or** `process.env.NEXT_PUBLIC_ENABLE_THEME_PARAM === "true"` (set in `playwright.config.ts` webServer env); wrap `<SampleMenu>` in `<ThemeScope theme={…}>`; add `<AppearanceToggle>` to `MenuHeader` `actions`; confirm the page remains static when the param is unused (check `next build` output)
- [X] T066 [US2] Extend `tests/e2e/sample-menu.spec.ts` (tag `@us2`): repeat the viewport/appearance matrix with `?theme=slate`; assert computed `background-color` of `body`/scope differs between themes; axe 0 violations; screenshots; assert the `AppearanceToggle` switches `.dark` on `<html>` and persists across reload
- [X] T067 [US2] Create `.storybook/docs/Theming.mdx`: theme-author guide from `contracts/theme-contract.md` (structure, required/optional tokens table generated from `SEMANTIC_TOKENS`, contrast rules, authoring checklist, limitation about fonts loaded in layout)
- [X] T068 [US2] Verify with Playwright MCP: Storybook "Examples / Sample Menu Page" with globals `theme:slate;appearance:light` and `theme:slate;appearance:dark`, and `/cs/sample-menu?theme=slate` in dev — screenshot, confirm zero warm colors leak (would indicate a literal), save under `specs/001-menu-design-system/verification/us2-*.png`

**Checkpoint**: Two themes × two appearances, all automated checks green, `components/` untouched by the theme addition.

---

## Phase 5: User Story 3 — Developer Discovers and Reuses Components via Living Documentation (Priority: P3)

**Goal**: Storybook is a complete, navigable design-system handbook: foundations, every primitive and composite with variants/states, a11y notes, theme/appearance/locale toolbars, and a full composed example.

**Independent Test**: A developer builds a "Daily specials" section from docs alone in < 30 min with zero new tokens/components; `pnpm build-storybook` succeeds; `tests/e2e/storybook-smoke.spec.ts` passes; every component in `contracts/component-api.md` has a story.

- [X] T069 [P] [US3] Create `.storybook/docs/Foundations.mdx`: color tokens swatch table (iterates `SEMANTIC_TOKENS`, shows both appearances), type scale specimens (display/body, Czech + German sample text), spacing/density scale, radii, shadows, motion tokens with purpose descriptions
- [X] T070 [P] [US3] Create `.storybook/docs/Accessibility.mdx`: keyboard maps for CategoryNav, Tabs, Accordion, Dialog, Sheet, Select, QuantityStepper; focus-ring policy; color-not-alone rule; reduced-motion policy; how to read the a11y panel
- [X] T071 [P] [US3] Create `.storybook/docs/GettingStarted.mdx`: how to compose a menu section (worked "Daily specials" example using `Section`, `CategoryHeading`, `Grid`, `DishCard`), import paths, "never add a literal" rule with the lint output example, how to add a shadcn primitive via CLI
- [X] T072 [P] [US3] Create `components/ui/*.stories.tsx` for every shadcn primitive added in T024–T026 (button variants/sizes/loading/disabled/icon-only, badge, card, separator, avatar, skeleton, tooltip, dialog, sheet (bottom on mobile viewport), tabs, accordion, sonner, input, textarea, select, checkbox, radio-group, switch, label, field, scroll-area, empty, toggle); `play` for dialog (focus trap, Escape closes), sheet, tabs (arrow keys), select, accordion — use `autodocs` tag on all
- [X] T073 [US3] Configure `.storybook/main.ts` `docs: { defaultName: "Docs" }`, story sorting order (Docs → Foundations → Theming → Accessibility → Getting Started → UI → Layout → Menu → Ordering (future) → Examples) via `parameters.options.storySort` in `preview.tsx`; add `parameters.docs.description.component` JSDoc on every component (when to use / when not to)
- [X] T074 [US3] Create `tests/e2e/storybook-smoke.spec.ts` with a second Playwright project `storybook` (webServer `pnpm build-storybook && npx http-server storybook-static -p 6006`): Storybook loads, sidebar lists the top-level groups, toolbar switches appearance and theme (assert `html.dark` and `[data-theme="slate"]` in the preview iframe), Sample Menu Page story renders
- [X] T075 [US3] Run `pnpm test:stories` across the full story set; fix any a11y or `play` failures; run `pnpm build-storybook` and ensure it is warning-free
- [X] T076 [US3] Verify with Playwright MCP: browse the built Storybook, open Foundations/Theming docs, switch all three toolbars on a UI story and a Menu story, screenshot to `specs/001-menu-design-system/verification/us3-*.png`

**Checkpoint**: Storybook is the single source of truth for the design system; all components documented and tested.

---

## Phase 6: User Story 4 — Staff Manages Menu Content With the Same Visual Language (Priority: P4)

**Goal**: Form and feedback primitives are proven by a complete "Edit dish" form composition (docs only) with validation, loading, success, and error states.

**Independent Test**: Storybook "Examples / Edit Dish Form" story: required-field error shows on submit, loading disables the submit button, success/error toasts appear — all via `play`; passes a11y in both theme combos.

- [X] T077 [P] [US4] Create `components/menu/forms/DietaryPicker.tsx` (checkbox group of `DIETARY_MARKERS` + allergen number toggles using `Toggle`, `Field`, `Label`) + stories with `play` (toggle, keyboard)
- [X] T078 [P] [US4] Create `components/menu/forms/PriceInput.tsx` (kind selector single/from/variants/market via `RadioGroup`, amount `Input` with currency suffix, variants repeater with add/remove) + stories with `play`
- [X] T079 [P] [US4] Create `components/menu/forms/AvailabilitySwitch.tsx` (`Switch` + `Select` for limited/soldOut, `Availability` namespace) + stories
- [X] T080 [US4] Create `components/menu/forms/EditDishFormMock.tsx` (`"use client"`, native form + `useActionState`-style local state, fields name/description/price/category `Select`/dietary/availability/image `Skeleton` slot; `Field` error text on empty required; simulated submit with 800 ms loading, `disabled` submit, success or failure `toast`) + `components/menu/forms/EditDishForm.stories.tsx` titled "Examples / Edit Dish Form" with `play` covering Story 4 scenarios 1–3; add `Forms` message namespace (`name`, `description`, `category`, `image`, `save`, `saving`, `saved`, `saveFailed`, `required`) to `cs/en/de` + `contracts/messages-contract.md`
- [X] T081 [US4] Run `pnpm test:stories --grep Forms` in both combos; verify with Playwright MCP (fill, submit empty, submit valid, observe toast) and save `specs/001-menu-design-system/verification/us4-*.png`

**Checkpoint**: All form/feedback primitives exercised with consistent states.

---

## Phase 7: User Story 5 — Ordering Building Blocks Exist Before Ordering Does (Priority: P5)

**Goal**: Stateless, themed, accessible ordering components exist in Storybook only; a mock "Review your selection" screen composes them; `app/**` can never import them.

**Independent Test**: Storybook "Ordering (future)" group renders every FR-014b component in both combos with `play` passing; "Examples / Review Selection (mock)" readable at 320 px; `pnpm lint` fails if `app/**` imports `@/components/ordering/*`; e2e asserts `[data-ordering]` count is 0 on the sample menu.

- [X] T082 [P] [US5] Create `lib/design-system/ordering-types.ts`: `OptionGroupModel`, `LineItemModel`, `OrderSummaryModel`, `OrderStatusModel` per data-model §4
- [X] T083 [P] [US5] Create `components/ordering/QuantityStepper.tsx` (`"use client"`, `role="spinbutton"`, `aria-valuenow/min/max`, ArrowUp/Down, disabled at bounds, `data-ordering`) + stories with `play` (bounds, keys)
- [X] T084 [P] [US5] Create `components/ordering/OptionGroup.tsx` (`"use client"`, `RadioGroup` for single / `Checkbox` list for multiple, price deltas via `Price`, unavailable option disabled, min/max `Field` error) + stories with `play`
- [X] T085 [P] [US5] Create `components/ordering/CurrencyInput.tsx` + `SpecialRequestField.tsx` (counter via `Ordering.charactersLeft`) + stories
- [X] T086 [P] [US5] Create `components/ordering/ProgressStepper.tsx` + `OrderStatus.tsx` + stories (3–5 steps wrap at 320 px; all 5 statuses use `success`/`info`/`warning`/`destructive` tokens)
- [X] T087 [US5] Create `components/ordering/SelectableDishCard.tsx` (wraps `DishCard`, adds select button / `QuantityStepper` in a fixed-height footer slot so unselected layout equals `DishCard`) + stories with `play`; add a visual story placing `DishCard` and `SelectableDishCard` side by side to prove identical layout (FR-014c)
- [X] T088 [US5] Create `components/ordering/LineItem.tsx`, `OrderSummary.tsx`, `StickyActionBar.tsx` (`"use client"`, `position: sticky bottom-0`, `pb-[env(safe-area-inset-bottom)]` is **not** allowed — expose `--safe-area-bottom` token in `globals.css` and use `pb-safe-bottom`) + stories with `play` (Enter triggers action, disabled state)
- [X] T089 [US5] Create `components/ordering/ReviewSelectionMock.tsx` + `ReviewSelection.stories.tsx` titled "Examples / Review Selection (mock)" (3 line items with options + note, summary with service fee, sticky bar with count + total, progress stepper at step 2) including a 320 px viewport story
- [X] T090 [US5] Create `tests/unit/ordering-boundary.test.ts`: write a temp file under `app/` importing `@/components/ordering/QuantityStepper`, run ESLint programmatically, assert the `no-restricted-imports` error fires, delete the temp file (proves T010 works); extend `tests/e2e/sample-menu.spec.ts` (tag `@us5`) to assert `page.locator("[data-ordering]")` count is 0 on `/cs/sample-menu`
- [X] T091 [US5] Run `pnpm test:stories --grep Ordering` and `pnpm lint`; verify with Playwright MCP at 320 px in `slate/dark/de`; save `specs/001-menu-design-system/verification/us5-*.png`

**Checkpoint**: Ordering vocabulary fully designed and documented, mechanically kept out of the shipped guest menu.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T092 [P] Update `AGENTS.md`: add "Design system & theming" section — token layers and `styles/` files, `ThemeScope` + `AppearanceProvider` usage, "no literal values" rule + lint script, shadcn CLI-only rule, Storybook commands, story-as-test convention, ordering import boundary; keep the `next dev` generated block intact
- [X] T093 [P] Add `README` section or `docs/design-system.md` link pointing to Storybook and `specs/001-menu-design-system/quickstart.md`
- [X] T094 [P] Reduced-motion e2e: extend `tests/e2e/sample-menu.spec.ts` with `page.emulateMedia({ reducedMotion: "reduce" })` asserting the `CategoryNav` indicator and `Sheet` open with no running animations (`getAnimations().length === 0`)
- [X] T095 [P] Large-text / zoom check: e2e at 320 px with `page.evaluate(() => document.documentElement.style.fontSize = "200%")` asserting no horizontal scroll and price still visible (edge case from spec)
- [X] T096 Performance: run `pnpm build`, confirm `/[locale]/sample-menu` is `○ (Static)` and first-load JS < 200 KB; run Lighthouse mobile (quickstart §8) and record LCP/CLS/TBT in `specs/001-menu-design-system/verification/lighthouse.md`; if any budget fails, move offending `"use client"` boundaries or defer `motion`
- [X] T097 Remove dead code: confirm `components/LocaleSwitcher.tsx` deleted, Geist font imports gone, no `console.log`, no commented-out code; `pnpm lint && pnpm typecheck && pnpm build && pnpm test` all green
- [X] T098 Run every scenario in `specs/001-menu-design-system/quickstart.md` (1–9) end to end and tick them in a `## Validation log` section appended to quickstart.md with date and result
- [ ] T099 Open PR from `feature/frontend/theme-setup` to `main` titled `feat: menu design system (tokens, themes, shadcn primitives, storybook)` with a body linking spec/plan, the verification screenshots, and the Lighthouse results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1 (Phase 3)** depends only on Phase 2.
- **US2 (Phase 4)** depends on Phase 2; T065/T066/T068 additionally need US1's route/story (T053–T055).
- **US3 (Phase 5)** depends on Phase 2; T072 can start right after T024–T026; docs tasks T069–T071 after T014/T035; smoke test T074 after T053 exists.
- **US4 (Phase 6)** depends on Phase 2 (T026 primitives) and reuses `Price`/dietary from US1 (T036–T037, T041).
- **US5 (Phase 7)** depends on Phase 2 and `DishCard`/`Price` from US1 (T041, T046).
- **Polish (Phase 8)** after all desired stories.

### Within stories

- lib/types (T036–T040) before components; leaf components before `DishCard` (T046) before `SampleMenu` (T053) before route (T054) before e2e (T055).
- Theme CSS (T058–T059) before registry/imports (T060) before tests (T061) before Storybook globals (T062).

### Parallel Opportunities

- Phase 1: T004–T011 all parallel after T002–T003.
- Phase 2: T012 → T014; T013, T016, T020–T023, T027–T030, T032–T033 parallel; T024–T026 sequential CLI runs but parallel with layout primitives.
- US1: T036–T039 parallel; T041–T045, T048–T049, T051 parallel; T046/T047 after; T050 independent of dish components.
- US2: T058, T059, T063, T064 parallel.
- US3: T069–T072 parallel.
- US5: T082–T086 parallel; T087–T088 after T046/T083.

---

## Parallel Example: User Story 1

```bash
# Domain layer together:
Task: "T036 dietary.ts"  Task: "T037 price.ts"  Task: "T038 price.test.ts"  Task: "T039 types.ts"

# Leaf components together (after T036–T039):
Task: "T041 Price"  Task: "T042 PriceList"  Task: "T043 Dietary*"  Task: "T044 Badges"  Task: "T045 DishImage"
Task: "T048 Heading/Header/Footer"  Task: "T049 Cover/Share"  Task: "T051 SpecialsStrip"

# Then sequentially: T046 DishCard → T047 DishRow → T050 CategoryNav → T052 LanguageSwitcher → T053 SampleMenu → T054 route → T055 e2e → T056 → T057
```

---

## Implementation Strategy

### MVP First (Setup + Foundational + US1)

1. Phases 1–2: tooling, tokens, warm light/dark theme, primitives, Storybook shell.
2. Phase 3: the guest sample menu. **STOP and VALIDATE** with `pnpm test:e2e --grep @us1` and a Playwright MCP walkthrough at 360 px in both appearances.
3. Demo `/cs/sample-menu` — this is a shippable menus-only product surface.

### Incremental Delivery

- + US2 → second theme proves the architecture; theme contract + contrast test lock it in.
- + US3 → Storybook becomes the handbook; smoke test guards it.
- + US4 → form vocabulary ready for admin screens.
- + US5 → ordering vocabulary ready, fenced off by lint and e2e.
- Phase 8 → performance, docs, PR.

### Notes

- Every UI task ends with the Playwright MCP verification loop described at the top; do not mark a task done from code alone.
- shadcn files are CLI-generated; if a generated file fails lint, fix with the minimal edit and note it in the commit.
- Commit after each task or logical group with `feat:`/`test:`/`docs:`/`chore:` prefixes.
- If Storybook's `nextjs-vite` framework cannot mock `next/font/google` variables, rely on `.storybook/preview-head.html` (T033) and set the `--font-fraunces`/`--font-nunito-sans` variables in `preview.tsx` — never change component code to compensate.
