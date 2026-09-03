# Tasks: Menu Visual Variants

**Input**: Design documents from `/specs/005-menu-visual-variants/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/http-api-delta.md, contracts/visual-variant-catalogue.md, quickstart.md

**Tests**: INCLUDED — the root and frontend constitutions make acceptance-scenario tests, two-sided contract tests, and the theme contrast/token contract mandatory merge gates.

**Organization**: Tasks are grouped by user story so each story is an independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US4)
- Every task names exact file paths

## Path Conventions

Monorepo per plan.md: API work under `apps/api/`, frontend work under `apps/frontend/`. Frontend rules apply throughout: strict TS, all text via next-intl (cs+en+de in the same change), palette → theme → utility tokens only (no literal colours or arbitrary utilities in `components/` or `app/`), navigation from `@/i18n/navigation`, `hasLocale` + `setRequestLocale` in every page, every new component gets a colocated `*.stories.tsx`. Theme files must be flat (no `@media`/`@supports`) because the test parser is flat.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Palette, fonts, the new optional token group, and the utilities that expose it. Nothing here changes what a guest sees yet.

- [X] T001 [P] Add palette ramps to `apps/frontend/styles/palette.css` per research R6: `ink` (chroma 0, 50–950), `bottle` (hue ≈155, 50–950), `brass` (hue ≈75, 50–950), `ivory` (hue ≈90, very low chroma, 50–950), `aurora` (lavender→teal→peach, 50–950 kept inside L ≥ 0.90 for 50–200 and L ≤ 0.28 for 900–950), `signal` (hue ≈30, 50–950), plus alpha steps `--palette-glass-light`, `--palette-glass-dark`, `--palette-glass-edge-light`, `--palette-glass-edge-dark`; update the header comment listing families
- [X] T002 [P] Extend the token catalogue in `apps/frontend/lib/design-system/tokens.ts`: add `panel`, `panel-border`, `panel-blur`, `panel-inset`, `ambient`, `ambient-motion` to `OPTIONAL_TOKENS`; add an `OPTIONAL_TOKEN_PURPOSE` record (or widen `TOKEN_PURPOSE`) documenting each per data-model.md; leave `CONTRAST_PAIRS` unchanged (panel is covered by the composite test, T022)
- [X] T003 [P] Expose the new tokens in `apps/frontend/app/globals.css`: in `@theme inline` add `--color-panel: var(--panel)`, `--color-panel-border: var(--panel-border)`, `--blur-panel: var(--panel-blur)`, `--spacing-panel: var(--panel-inset)`; add `@keyframes ambient-drift` (background-position 0% 50% → 100% 50%); add `@utility ambient { background-image: var(--ambient); background-size: 200% 200%; animation: var(--ambient-motion); }`; after the theme imports add the generic fallbacks from contracts/visual-variant-catalogue.md §3 (`@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)` on `[data-theme]`)
- [X] T004 [P] Declare the six optional tokens with neutral defaults (`transparent`, `transparent`, `0px`, `0px`, `none`, `none`) in the light rules of `apps/frontend/styles/themes/warm.css` and `apps/frontend/styles/themes/slate.css`
- [X] T005 [P] Load the five new faces in `apps/frontend/app/[locale]/layout.tsx` via `next/font/google` — Inter (`--font-inter`), Oswald (`--font-oswald`), Manrope (`--font-manrope`), Cormorant_Garamond (`--font-cormorant`), DM_Sans (`--font-dm-sans`) — each with `subsets: ["latin", "latin-ext"]`, `display: "swap"`, `preload: false`; append their `.variable` classes to `<html className>`; header comment cites the `preload` doc (research R5)
- [X] T006 [P] Widen `FontKey` and `FONT_VARIABLES` in `apps/frontend/lib/design-system/themes.ts` to `inter`, `oswald`, `manrope`, `cormorant`, `dmSans` mapping to the variables from T005 (registry entries come in T018)
- [X] T007 [P] Add fallback stacks for the five new `--font-*` variables to `apps/frontend/.storybook/preview.css` alongside the existing Fraunces/Nunito fallbacks (Storybook mocks `next/font`)

**Checkpoint**: `pnpm --filter frontend test:unit` still green (warm/slate declare only catalogued tokens; fonts still resolve); `pnpm --filter frontend lint` green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The API allowlist and contract, the frontend catalogue, the five theme files, the composite contrast test, and the panel component. After this phase every theme exists and is proven accessible, but no owner can pick one yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### API and contract

- [X] T008 Widen the allowlist in `apps/api/src/menus/visual-variants.ts` to `['default', 'plain-white', 'liquid-glass', 'green-bar', 'modern', 'refined'] as const`; rewrite the doc comment (no longer "only the default exists"); `DEFAULT_VISUAL_VARIANT` stays `'default'`
- [X] T009 [P] Update `apps/api/test/menus.e2e-spec.ts`: replace the single `visualVariant: 'default'` PATCH test with an `it.each(VISUAL_VARIANTS)` that patches each id and expects `200` + echo; keep the `'elegant'` → `400 VALIDATION_FAILED` test; add a test that owner B patching owner A's `visualVariant` gets `404`
- [X] T010 [P] Update `specs/001-menu-creation-publishing/contracts/http-api.md` PATCH /menus/:menuId section per `specs/005-menu-visual-variants/contracts/http-api-delta.md` (six-id allowlist; remove the "FR-010 stub" sentence; note consumers treat unknown values as `default`)

### Frontend catalogue and mapping

- [X] T011 Create `apps/frontend/lib/menu-display/variants.ts`: `VISUAL_VARIANTS` (six `{ id, themeId }` entries per contracts/visual-variant-catalogue.md §1), `VISUAL_VARIANT_IDS`, `VisualVariantId`, `isVisualVariant(value): value is VisualVariantId`, `themeForVariant(value: unknown): ThemeId` (unknown → `DEFAULT_THEME.id`), `variantForTheme(themeId)` helper for landing links; header comment explains `default → warm`
- [X] T012 [P] Create `apps/frontend/tests/unit/variants.test.ts`: ids equal the literal list `["default","plain-white","liquid-glass","green-bar","modern","refined"]` in order (the same literal the API pins); every `themeId` is in `THEME_IDS`; `slate` is not a variant; `themeForVariant("default") === "warm"`, `themeForVariant("nope") === "warm"`, `themeForVariant(undefined) === "warm"`, `themeForVariant("refined") === "refined"`

### Theme files (each: light rule with every `REQUIRED_TOKENS` entry plus the six optional tokens; dark rule overriding what changes; palette steps only; fonts per contracts §5; intent per contracts §6)

- [X] T013 [P] Create `apps/frontend/styles/themes/plain-white.css` — `ink` neutrals, `--primary` ink-900 (dark ink-100), `--price` = foreground, `--highlight` a pale ink step with ink-950 text, `--radius: 0.25rem`, `--density: 1`, `--font-display`/`--font-body` both `var(--font-inter)` with sans fallback, flat shadows (`0 0 #0000`-style via palette-free `none`), optional tokens neutral
- [X] T014 [P] Create `apps/frontend/styles/themes/liquid-glass.css` — surfaces aurora-50/ink-950 (dark ink-950/ink-50), `--primary` cobalt-600 (dark cobalt-400), `--radius: 1.25rem`, `--density: 1`, Inter for both faces, soft layered `--shadow-card`; optional tokens: `--panel: var(--palette-glass-light)` (dark `--palette-glass-dark`), `--panel-border: var(--palette-glass-edge-light)` (dark edge-dark), `--panel-blur: 18px`, `--panel-inset: calc(var(--spacing) * 4)`, `--ambient: linear-gradient(135deg, var(--palette-aurora-100), var(--palette-aurora-200), var(--palette-aurora-50))` (dark: aurora-900/950 steps), `--ambient-motion: ambient-drift 28s ease-in-out infinite alternate`; no `@media`/`@supports` in this file
- [X] T015 [P] Create `apps/frontend/styles/themes/green-bar.css` — bottle-900 ground with cream-100 text (dark: bottle-950 / cream-50), `--primary` brass-500 with bottle-950 text, `--price` brass-400, `--highlight` brass-300, `--radius: 0.375rem`, `--density: 0.9`, `--font-display: var(--font-oswald)`, `--font-body: var(--font-nunito-sans)`, optional tokens neutral; both appearances are dark by design and must still pass every contrast pair
- [X] T016 [P] Create `apps/frontend/styles/themes/modern.css` — ink-50/ink-950 (dark ink-950/ink-100), `--primary` signal-600 (dark signal-400), `--price` = foreground, `--highlight` signal-200 (dark signal-900), `--radius: 0.5rem`, `--density: 1.05`, `--font-display: var(--font-manrope)`, `--font-body: var(--font-inter)`, crisp single-layer shadow, optional tokens neutral
- [X] T017 [P] Create `apps/frontend/styles/themes/refined.css` — ivory-100/cocoa-900 (dark cocoa-950/ivory-100), `--primary` wine-700 (dark wine-400), `--price` = foreground (quiet), `--border` ivory-500 hairline, `--radius: 0.125rem`, `--density: 1.1`, `--font-display: var(--font-cormorant)`, `--font-body: var(--font-dm-sans)`, `--shadow-card: none`-equivalent (no elevation), optional tokens neutral
- [X] T018 Register the five themes in `apps/frontend/lib/design-system/themes.ts` `THEMES` with their `fonts` (plain-white inter/inter, liquid-glass inter/inter, green-bar oswald/nunitoSans, modern manrope/inter, refined cormorant/dmSans); `warm` stays the only default (depends on T006, T013–T017)
- [X] T019 Import the five theme files in `apps/frontend/app/globals.css` after `slate.css` and before the fallback rules from T003
- [X] T020 [P] Add `Themes.plain-white`, `Themes.liquid-glass`, `Themes.green-bar`, `Themes.modern`, `Themes.refined` display names to `apps/frontend/messages/en.json`, `cs.json`, `de.json`

### Composite contrast for translucent panels

- [X] T021 Add `composite(top: string, bottom: string): string` to `apps/frontend/lib/design-system/contrast.ts` (parse both with culori, convert to `rgb`, source-over using top alpha, return an opaque rgb string) and `paletteRefs(value: string): string[]` that extracts every `var(--palette-*)` name from a token value
- [X] T022 [P] Create `apps/frontend/tests/unit/glass-contrast.test.ts`: for every theme × appearance where `--panel` resolves to alpha < 1, composite `--panel` over `--background` and over each palette step referenced by `--ambient`, then assert `--foreground`, `--muted-foreground`, `--price` ≥ 4.5:1 on each composite; assert the test actually exercises `liquid-glass` (fail if no translucent theme found)

### Panel component and menu compositions

- [X] T023 [P] Create `apps/frontend/components/menu/MenuPanel.tsx` (Server Component): `<div data-slot="menu-panel" className={cn("bg-panel border-panel-border backdrop-blur-panel rounded-xl border p-panel", className)}>` with a header comment explaining it is invisible under neutral tokens
- [X] T024 [P] Create `apps/frontend/components/menu/MenuPanel.stories.tsx`: default story with three `DishRow`s inside; play test asserts the panel renders its children; a second story wrapped in `<ThemeScope theme="liquid-glass">` for visual review
- [X] T025 Wrap each category's dish list in `MenuPanel` in `apps/frontend/components/menu/GuestMenu.tsx` and `apps/frontend/components/menu/SampleMenu.tsx` (rows and card grids alike); do not touch `DishRow`/`DishCard` (depends on T023)
- [X] T026 In `apps/frontend/app/[locale]/sample-menu/[[...theme]]/page.tsx` give the `ThemeScope` `className="ambient flex min-h-svh flex-1 flex-col"` so the ambient field spans the page (twMerge overrides the default `contents`); no other change — the route already fans out over `THEME_IDS`
- [X] T027 [P] Append the optional token group, the flat-file rule, the composite-contrast requirement and the globals.css fallbacks to `apps/frontend/specs/001-menu-design-system/contracts/theme-contract.md` per contracts/visual-variant-catalogue.md §3

**Checkpoint**: `pnpm --filter api test:e2e` green; `pnpm --filter frontend test:unit` green for all seven themes (required tokens, no undocumented tokens, palette refs exist, fonts loaded, contrast pairs, glass composite); `pnpm --filter frontend build` prerenders `/cs/sample-menu/<id>` for every theme; Storybook Sample Menu Page shows every theme via the toolbar with Classic and Slate unchanged.

---

## Phase 3: User Story 1 - Owner Picks a Visual Style (Priority: P1) 🎯 MVP

**Goal**: The editor's picker lists all six styles with swatches and descriptions, saves the choice, and persists it across reloads.

**Independent Test**: Sign in, open a menu, choose "Green Bar", see the saved toast, reload, "Green Bar" is still selected; a non-owner cannot change it; an invalid value is rejected without a request reaching the API.

### Messages

- [X] T028 [US1] Add the `VisualVariants` namespace to `apps/frontend/messages/en.json`, `cs.json`, `de.json` with `<id>.name` and `<id>.description` for all six ids (Classic/Klasický/Klassisch, Plain White/Čistě bílý/Reinweiß, Liquid Glass/Tekuté sklo/Flüssiges Glas, Green Bar/Zelený bar/Grüne Bar, Modern/Moderní/Modern, Refined/Vytříbený/Edel); in `MenuEditor` reword `variantDescription` (no "more styles coming"), add `variantApply`, `variantSaved`, `variantPreview`; remove `variantDefault` and `variantComingSoon` from all three files

### Validation and action

- [X] T029 [P] [US1] Add `visualVariantSchema = z.object({ visualVariant: z.enum(VISUAL_VARIANT_IDS, { message: "INVALID" }) })` to `apps/frontend/lib/validation/schemas.ts` and `readVisualVariant(formData)` to `apps/frontend/lib/validation/form-data.ts` using the existing `parsed()` helper
- [X] T030 [P] [US1] Extend `apps/frontend/tests/unit/validation.test.ts`: `readVisualVariant` accepts each catalogue id, rejects `"elegant"` and a missing field with an `INVALID` field code on `visualVariant`
- [X] T031 [US1] Add `setVisualVariantAction(_previous: FormState, formData: FormData): Promise<FormState>` to `apps/frontend/lib/api/actions/menus.ts`: read `locale`, `menuId`; `readVisualVariant` first (return its state on failure); `PATCH /menus/${menuId}` with `{ visualVariant }`; on error `toFormState`; on success `revalidateEditor(locale, menuId)` and, if `result.data.menu.publicSlug`, `revalidatePath(`/${locale}/m/${slug}`)`; return `SAVED` (depends on T029)

### Components

- [X] T032 [P] [US1] Create `apps/frontend/components/workspace/VariantSwatch.tsx` (Server-safe, no hooks): `<ThemeScope as="span" theme={themeId} className="bg-background border-border flex h-14 w-20 items-center justify-between rounded-md border px-2">` containing a `font-display text-lg text-foreground` "Aa", a `bg-primary size-3 rounded-full` dot, and a `text-price text-xs font-medium` sample price; token utilities only; `aria-hidden`
- [X] T033 [US1] Rewrite `apps/frontend/components/workspace/VariantSwitcher.tsx` as a client component: props `{ selected: string; locale: string; menuId: string; action: (state: FormState, formData: FormData) => Promise<FormState>; previewHref?: (id: VisualVariantId) => string }`; `useActionState(action, IDLE)`; `<form action>` with hidden `locale`/`menuId`; a `<fieldset>` with legend `MenuEditor.variantTitle`, description, and one radio card per `VISUAL_VARIANTS` entry (radio `name="visualVariant"`, `defaultChecked={selected === id}`, `onChange` → `event.currentTarget.form?.requestSubmit()`, label shows `VariantSwatch`, `VisualVariants.<id>.name`, `.description`, `has-checked:border-primary`); a visible submit `Button` labelled `variantApply` disabled while pending; on the falling edge of `pending` with `state.status === "success"` call `toast(t("variantSaved"))`; render `state.status === "error"` via `Auth.errors` codes like `PublishControls`; delete `PLANNED_VARIANT_COUNT` (depends on T028, T032)
- [X] T034 [P] [US1] Create `apps/frontend/components/workspace/VariantSwitcher.stories.tsx`: stories `Default` (selected `default`), `GreenBarSelected`, `Error` (stub action returning an error state); play test on `Default` clicks the "Refined" card and asserts the stubbed action received `formData.get("visualVariant") === "refined"` and that six enabled radios exist
- [X] T035 [US1] Wire the editor page `apps/frontend/app/[locale]/workspace/menus/[menuId]/page.tsx`: pass `selected={menu.visualVariant}`, `locale`, `menuId={menu.id}`, `action={setVisualVariantAction}` to `VariantSwitcher` (depends on T031, T033)

### Contract and e2e

- [X] T036 [P] [US1] Extend `apps/frontend/tests/unit/api-contract.test.ts`: a `MenuDetailResponse` payload and a `PublicMenuResponse` payload with `visualVariant: "green-bar"` still satisfy the types
- [X] T037 [US1] Replace the "locked to the one available style" test in `apps/frontend/tests/e2e/menu-editor.spec.ts` with "picks and keeps a visual style": six radios, none disabled, no "Připravujeme" text; check the "Zelený bar" card; expect the saved toast; reload; the "Zelený bar" radio is checked (depends on T035)

**Checkpoint**: US1 independently demonstrable — owner selects and persists a style; guests still see Classic (that is US2).

---

## Phase 4: User Story 2 - Guests See the Menu in the Chosen Style (Priority: P1)

**Goal**: The public page renders the saved style; every style is legible, accessible and within budget in both appearances on a phone.

**Independent Test**: Publish a menu, switch it through each style, open the public address in a fresh context at 360px in light and dark; `data-theme` matches and every dish and price is present. Sample menu passes axe and no-horizontal-scroll for every theme × appearance @320.

- [X] T038 [US2] In `apps/frontend/app/[locale]/m/[slug]/page.tsx` import `themeForVariant` and render `<ThemeScope theme={themeForVariant(menu.visualVariant)} className="ambient flex min-h-svh flex-1 flex-col">`; drop the `DEFAULT_THEME` import; header comment: unknown or legacy values fall back to warm (FR-007)
- [X] T039 [P] [US2] Extend `apps/frontend/tests/unit/menu-display-adapter.test.ts` (or `variants.test.ts`) with a case proving `toDisplayMenu` output is identical for two payloads differing only in `visualVariant` (content parity, SC-003)
- [X] T040 [US2] Extend `apps/frontend/tests/e2e/public-menu.spec.ts`: "renders the chosen style" — owner picks "Zelený bar" in the editor (reuse helpers in `tests/e2e/helpers/owner.ts`; add a `chooseStyle(page, label)` helper there), publishes, guest page `[data-theme="green-bar"]` exists and all dishes/prices are visible; "legacy default renders warm" — freshly created menu's public page has `[data-theme="warm"]` (depends on T038)
- [X] T041 [US2] Extend `apps/frontend/tests/e2e/sample-menu.spec.ts`: import `THEME_IDS` and loop every theme × `{light, dark}` @320 for `expectNoHorizontalScroll` + `expectNoAxeViolations`; extend the existing performance/LCP assertion to run for `liquid-glass`, `green-bar`, `refined` in addition to `warm`; keep the warm-vs-slate token-change test
- [X] T042 [P] [US2] Add a Playwright check in `apps/frontend/tests/e2e/sample-menu.spec.ts` (same file, separate test) that on `/cs/sample-menu/liquid-glass` with `page.emulateMedia({ reducedMotion: "reduce" })` the computed `animation-name` on `[data-theme]` is `none` or its duration is ≤ 0.01ms, and that under `@supports`-unavailable simulation is not required (document that Firefox fallback is a manual check in quickstart.md)

**Checkpoint**: US1 + US2 together are the shippable core: owners pick, guests see it, all styles proven accessible and within budget.

---

## Phase 5: User Story 3 - Owner Previews Styles Before Choosing (Priority: P2)

**Goal**: Swatches and descriptions in the picker (done in US1) plus a full-page preview of the owner's own menu in any style, including drafts, without changing the saved selection.

**Independent Test**: Open `/cs/preview/<menuId>/refined` as the owner of a draft menu: the menu renders with `data-theme="refined"`, a bar offers "Back to editor" and "Use this style"; the saved style is unchanged until "Use this style" is pressed. A signed-out visitor is redirected to sign-in.

- [X] T043 [P] [US3] Add the `Preview` namespace to `apps/frontend/messages/en.json`, `cs.json`, `de.json`: `metaTitle`, `previewing` (with `{style}` placeholder), `back`, `useStyle`, `applied`
- [X] T044 [P] [US3] Create `apps/frontend/components/workspace/PreviewBar.tsx` (client component): props `{ locale; menuId; variantId: VisualVariantId; styleName: string; isCurrent: boolean; action }`; a sticky top bar using `bg-card text-card-foreground border-border` with the "previewing {style}" text, a `Link` (from `@/i18n/navigation`) back to `/workspace/menus/${menuId}`, and a `<form action={formAction}>` with hidden `locale`, `menuId`, `visualVariant` and a submit `Button` labelled `useStyle` (disabled when `isCurrent`); success shows `applied` inline (no Toaster on this route)
- [X] T045 [US3] Create `apps/frontend/app/[locale]/preview/[menuId]/[variant]/page.tsx`: `dynamic = "force-dynamic"`; `generateMetadata` → `{ title: { absolute: t("Preview.metaTitle") }, robots: { index: false, follow: false } }`; validate locale, `setRequestLocale`, `await requireProfile(locale)`; `if (!isVisualVariant(variant)) notFound()`; `getMenu(menuId)` → `notFound()` on failure; render `<ThemeScope theme={themeForVariant(variant)} className="ambient flex min-h-svh flex-1 flex-col"><PreviewBar … action={setVisualVariantAction} /><GuestMenu menu={toDisplayMenu(menu)} /></ThemeScope>`; header comment explains why it lives outside `/workspace` (research R8) (depends on T044)
- [X] T046 [US3] Add a "Preview" link per card in `apps/frontend/components/workspace/VariantSwitcher.tsx` using the `previewHref` prop (a `Link` from `@/i18n/navigation`, `target="_blank"`, label `MenuEditor.variantPreview`), and pass `previewHref={(id) => `/preview/${menu.id}/${id}`}` from `apps/frontend/app/[locale]/workspace/menus/[menuId]/page.tsx`; update `VariantSwitcher.stories.tsx` to pass a stub `previewHref`
- [X] T047 [US3] Create `apps/frontend/tests/e2e/preview.spec.ts`: owner creates a draft menu with one section and dish, opens `/cs/preview/<id>/refined`, expects `[data-theme="refined"]`, the dish text, and the preview bar; presses "Use this style", returns to the editor, "Vytříbený" is checked; an unknown variant segment yields 404; a fresh signed-out context visiting the preview URL lands on the sign-in page (depends on T045, T046)

**Checkpoint**: Owners can compare styles on their own content before committing.

---

## Phase 6: User Story 4 - Prospective Customers Browse the Styles (Priority: P3)

**Goal**: The marketing site links to the sample menu in each of the six styles.

**Independent Test**: From the landing page, follow a style link; `/cs/sample-menu/<theme>` returns 200 and renders that style; Slate is not advertised.

- [X] T048 [P] [US4] Add `styleDemos` to the `digitalMenu` capability in `apps/frontend/lib/landing/capabilities.ts`: derived from `VISUAL_VARIANTS` as `{ id, href: id === "default" ? "/sample-menu" : `/sample-menu/${themeId}` }` (import from `@/lib/menu-display/variants`); keep `demoHref` for the primary link
- [X] T049 [US4] Render the style links in the landing capability component (locate the component consuming `demoHref` under `apps/frontend/components/landing/`, e.g. `CapabilitySection.tsx`): a small inline list of `Link`s labelled with `VisualVariants.<id>.name`, styled with `buttonVariants({ variant: "ghost", size: "sm" })` on real anchors; add the list heading key `Landing.capabilities.digitalMenu.styles` to all three catalogues (depends on T048)
- [X] T050 [P] [US4] Extend `apps/frontend/tests/unit/landing-links.test.ts`: `styleDemos` has six entries, none points at `slate`, and every href resolves to a prerendered sample-menu path (`/sample-menu` or `/sample-menu/<THEME_ID>`)
- [X] T051 [US4] Extend `apps/frontend/tests/e2e/landing.spec.ts`: the landing page shows six style links; clicking "Zelený bar" navigates to `/cs/sample-menu/green-bar` with `[data-theme="green-bar"]` (depends on T049)

**Checkpoint**: All four stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T052 [P] Update `apps/frontend/AGENTS.md` "Design system & theming": variants vs themes (`lib/menu-display/variants.ts`, `default → warm`, slate is a fixture), the optional `panel*`/`ambient*` token group and `MenuPanel`, the flat-theme-file rule and where fallbacks live, `preload: false` for non-default faces, the preview route's self-gate and why it is outside `/workspace`
- [X] T053 [P] Extend `apps/frontend/tests/e2e-storybook/storybook.spec.ts` "the theme toolbar changes the rendered theme" to also assert `theme:liquid-glass` sets `data-theme="liquid-glass"` and yields a `--panel` value with alpha (not `transparent`)
- [X] T054 [P] If a Theming docs page exists under `apps/frontend/.storybook/docs/`, list the seven themes and the optional token group there; otherwise skip (no new docs page)
- [X] T055 Run the full gate set and fix anything red: `pnpm --filter api lint && pnpm --filter api test && RESEND_API_KEY= pnpm --filter api test:e2e`; `pnpm --filter frontend lint && pnpm --filter frontend typecheck && pnpm --filter frontend test:unit && pnpm --filter frontend test:stories && pnpm --filter frontend build && pnpm --filter frontend test:e2e && pnpm --filter frontend test:e2e:storybook`
- [X] T056 Compare the `next build` route table for `/[locale]/m/[slug]` against `main`: first-load JS must be unchanged within noise (PR-002); record the numbers in `specs/005-menu-visual-variants/quickstart.md` §6
- [ ] T057 Run the manual checks in `specs/005-menu-visual-variants/quickstart.md` §5 (reduced transparency, reduced motion, Firefox fallback, font network panel on Classic vs Refined, dark OS with light dashboard, German @320 on green-bar and refined) and note results in quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; all seven tasks parallel.
- **Foundational (Phase 2)**: Depends on Phase 1 (T013–T017 need T001 palette, T006 fonts, T002/T003 tokens). BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Phase 2 (catalogue T011, themes T018 for swatches).
- **US2 (Phase 4)**: Depends on Phase 2 only; T040's e2e additionally needs US1's picker (T035, T037) to set a non-default style. T038, T039, T041, T042 do not.
- **US3 (Phase 5)**: Depends on US1 (action T031, switcher T033).
- **US4 (Phase 6)**: Depends on Phase 2 only.
- **Polish (Phase 7)**: After all desired stories.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P1)**: Foundational; its guest-picks e2e reuses US1's picker. Ship US1 + US2 together as the core.
- **US3 (P2)**: US1 (reuses the action and extends the switcher).
- **US4 (P3)**: Foundational only; independent of US1–US3.

### Within Each Story

- Messages before components that translate them.
- Schema/read helper before the action; action before the page wiring.
- Component before its story; page wiring before the e2e test.

### Parallel Opportunities

- Phase 1: T001–T007 all parallel.
- Phase 2: T009, T010, T012 parallel with T008; T013–T017 (five theme files) parallel with each other and with T011, T021, T023, T024, T027; T018 after themes; T019/T025/T026 after T018/T023.
- US1: T029, T030, T032, T034, T036 parallel; T031 after T029; T033 after T028/T032; T035 after T031/T033; T037 last.
- US2: T038, T039, T041, T042 parallel; T040 after T038 and US1.
- US3: T043, T044 parallel; T045 after T044; T046 parallel with T045; T047 last.
- US4: T048, T050 parallel; T049 after T048; T051 last.

---

## Parallel Example: Phase 2 theme authoring

```bash
# Five theme files at once (different files, shared inputs from Phase 1):
Task: "Create apps/frontend/styles/themes/plain-white.css …"      # T013
Task: "Create apps/frontend/styles/themes/liquid-glass.css …"     # T014
Task: "Create apps/frontend/styles/themes/green-bar.css …"        # T015
Task: "Create apps/frontend/styles/themes/modern.css …"           # T016
Task: "Create apps/frontend/styles/themes/refined.css …"          # T017
# Meanwhile:
Task: "Create apps/frontend/lib/menu-display/variants.ts …"       # T011
Task: "Add composite() to lib/design-system/contrast.ts …"        # T021
Task: "Create apps/frontend/components/menu/MenuPanel.tsx …"      # T023
# Then register (T018), import (T019), and run pnpm --filter frontend test:unit
```

## Parallel Example: User Story 1

```bash
Task: "Add visualVariantSchema + readVisualVariant …"             # T029
Task: "Extend tests/unit/validation.test.ts …"                     # T030
Task: "Create components/workspace/VariantSwatch.tsx …"           # T032
Task: "Create VariantSwitcher.stories.tsx …"                       # T034
Task: "Extend tests/unit/api-contract.test.ts …"                   # T036
# Then T031 → T033 → T035 → T037
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 (setup) and Phase 2 (foundational): every theme exists and passes the token, contrast and glass-composite gates; the API accepts six ids.
2. Phase 3 (US1): owners can pick and persist a style.
3. Phase 4 (US2): guests see it; the sample menu proves every style accessible in both appearances at 320px and within budget.
4. **STOP and VALIDATE** with quickstart.md §1–§4. This is the deployable core.

### Incremental Delivery

- Add US3 (preview) → owners choose with confidence on their own content.
- Add US4 (landing links) → styles become a marketing asset.
- Polish: docs, storybook e2e, budget comparison, manual checks.

### Parallel Team Strategy

- Developer A: Phase 1 T001–T004 + theme files T013–T017 (design-system side).
- Developer B: Phase 1 T005–T007 + API T008–T010 + catalogue T011–T012 + contrast T021–T022.
- After Phase 2: A takes US2 + US4, B takes US1 then US3.

---

## Notes

- Never put `@media` or `@supports` in a theme file; the flat parser in `tests/unit/theme-css.ts` would fold the override into the measured values.
- `themes.test.ts` and `contrast.test.ts` need no edits: they loop the registry. If they fail, fix the theme, not the test.
- Removing `variantDefault`/`variantComingSoon` is required: `scripts/check-messages.mjs` and the dead-code rule both care.
- Every new message key goes to cs, en and de in the same task.
- Commit after each checkpoint; the two Phase 1/2 checkpoints are where Classic must be visually confirmed unchanged.

---

## Phase 8: Structural presentation per style (added 2026-09-03 after review)

**Purpose**: Review found the five styles read as one layout with different palettes. Each style now gets its own structure through a presentation recipe (research R11, spec FR-021).

- [X] T058 Create `apps/frontend/lib/menu-display/presentation.ts`: `Presentation` recipe type (header, nav, section, rows, cards, price, panel), the six recipes (classic, minimal, glass, board, editorial, fine), `presentationForTheme`, `usesCards`
- [X] T059 [P] Add `layout` variants to `apps/frontend/components/menu/MenuHeader.tsx` (classic, minimal, glass, band, editorial, centered) and wrap its content in `Container` so the masthead aligns with the menu
- [X] T060 [P] Add `shape` variants to `apps/frontend/components/menu/CategoryNav.tsx` (pills, underline, glass, squares, heavy, text); chip strip aligned to the `md` container measure
- [X] T061 [P] Add `style` and `index` to `apps/frontend/components/menu/CategoryHeading.tsx` (classic, caps, glass, bar, numbered, roman) with `aria-hidden` ordinals and an exported `toRoman`
- [X] T062 [P] Add `layout` and `priceTreatment` to `apps/frontend/components/menu/DishRow.tsx` (rows, ledger, glass, board, editorial, centered) and `surface`/`priceTreatment` to `DishCard.tsx` (raised, glass, flat); new `apps/frontend/components/menu/DishPrice.tsx` for price placement
- [X] T063 Compose by recipe in `apps/frontend/components/menu/GuestMenu.tsx` and `SampleMenu.tsx` (`presentation` prop; cards vs rows; optional `MenuPanel`; footer inside `Container`) and pass `presentationForTheme(themeId)` from the sample-menu, public and preview pages
- [X] T064 [P] Richer Liquid Glass in `apps/frontend/styles/themes/liquid-glass.css`: three radial ambient blobs over a wash in both appearances; `--shadow-card`/`--shadow-overlay` carry a specular inset edge
- [X] T065 [P] Stories for every variant: `SampleMenu.stories.tsx` (PlainWhite, LiquidGlass, GreenBar, Modern, Refined), `MenuHeader.stories.tsx` (five layouts), `CategoryNav.stories.tsx` (five shapes), `CategoryHeading.stories.tsx` (five styles, accessible-name check), `DishCard.stories.tsx` (glass and flat surfaces, row layouts)
- [X] T066 [P] `apps/frontend/tests/unit/presentation.test.ts`: every theme resolves; warm/slate stay classic; each non-default style differs from classic on ≥ 3 axes; five distinct recipes
- [X] T067 Visual review of all six styles in the browser (light and dark), then gates: typecheck, lint, unit, stories (both passes), e2e sample-menu/public-menu/preview
