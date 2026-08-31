# Tasks: Marketing Landing Page

**Input**: Design documents from `/specs/002-marketing-landing-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Principle II) requires every acceptance scenario to ship with automated tests, and the design system's convention is "stories are the tests". Test tasks are listed per story and should be written alongside (or before) the components they cover.

**Organization**: Tasks are grouped by user story. US1 (hero + capabilities + CTA) is the MVP; US2 (pricing) and US3 (locale/appearance/motion hardening) layer on top.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 from spec.md
- All paths are relative to `apps/frontend/`

## Path Conventions

Next.js App Router inside `apps/frontend`: routes in `app/[locale]/`, feature components in `components/landing/`, data in `lib/landing/`, tokens in `lib/design-system/` + `styles/`, tests in `tests/unit/` and `tests/e2e/`, stories colocated as `*.stories.tsx`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch, docs read, directories, and the message namespace skeleton every story fills.

- [X] T001 Create git branch `feature/frontend/landing-page` from the current branch (constitution branch naming); confirm `.specify/feature.json` points at `specs/002-marketing-landing-page`
- [X] T002 Read the installed Next docs before coding: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (`fill`, `sizes`, `preload` — `priority` is deprecated), `node_modules/next/dist/docs/01-app/02-guides/videos.md`, `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`; note any deviation from plan.md in `specs/002-marketing-landing-page/research.md` under a "Verified against docs" line
- [X] T003 [P] Create directories `components/landing/`, `lib/landing/`, `public/landing/` (add `public/landing/.gitkeep` until assets land)
- [X] T004 [P] Add the `Landing` namespace skeleton (all keys from `contracts/messages-contract.md`, placeholder-free real copy per research R10) to `messages/en.json`, then `messages/cs.json` and `messages/de.json`; remove the `HomePage` namespace from all three; run `node scripts/check-messages.mjs` to confirm parity

**Checkpoint**: `pnpm lint` still passes (the old `app/[locale]/page.tsx` will now fail type-check on `HomePage` — that is fixed in T020; run `pnpm typecheck` only after Phase 3 starts).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design-system changes and typed data that every landing component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tokens (one commit — foundations change, see `contracts/tokens-contract.md`)

- [X] T005 Add `"overlay"` and `"overlay-foreground"` to `MENU_COLOR_TOKENS`, add `TOKEN_PURPOSE` entries, and append `{ foreground: "overlay-foreground", background: "overlay", min: 4.5 }` to `CONTRAST_PAIRS` in `lib/design-system/tokens.ts`
- [X] T006 [P] Declare `--overlay: var(--palette-cocoa-950); --overlay-foreground: var(--palette-cream-50);` in both the `:root,[data-theme="warm"]` block and the dark block of `styles/themes/warm.css`
- [X] T007 [P] Declare `--overlay: var(--palette-graphite-950); --overlay-foreground: var(--palette-graphite-50);` in both light and dark blocks of `styles/themes/slate.css`
- [X] T008 [P] Expose `--color-overlay: var(--overlay);` and `--color-overlay-foreground: var(--overlay-foreground);` under a `/* Media */` comment inside `@theme inline` in `app/globals.css`
- [X] T009 Run `pnpm test:unit` — `tests/unit/themes.test.ts` and `tests/unit/contrast.test.ts` must pass with the new pair in all four theme × appearance combinations; fix palette steps if contrast < 4.5:1
- [X] T010 [P] Append the two tokens to the required-token list in `specs/001-menu-design-system/contracts/theme-contract.md` and add one sentence on `overlay` usage to `.storybook/docs/Foundations.mdx`

### Layout primitive

- [X] T011 [P] Add `xl: "max-w-7xl"` to `containerVariants.size` in `components/layout/Container.tsx` (docblock: "Marketing sections — edge-to-edge imagery") and add an `Xl` story to `components/layout/Layout.stories.tsx`

### Typed content (`lib/landing/`, see data-model.md)

- [X] T012 [P] Create `lib/landing/assets.ts` exporting `MediaAsset` interface, `LANDING_ASSETS` (ids `hero`, `heroClip`, `digitalMenu`, `pdf`, `qr`, `og` with curated Pexels ids/authors/URLs per `contracts/assets-contract.md` curation brief, `file`, `width`, `height`, `altKey`, `maxBytes`) and `getAsset(id)`
- [X] T013 [P] Create `lib/landing/plans.ts` exporting `Plan` type and `PLANS` catalogue exactly as the data-model table (free/pro/proPlus; pro price `{ amount: 129, currency: "CZK" }`, period `"month"`; feature key lists; `cta`; `recommended` on free only)
- [X] T014 [P] Create `lib/landing/capabilities.ts` exporting `CAPABILITIES` (digitalMenu/pdf/qr with `order`, lucide icon name, `asset` id, `align`, `demoHref: "/sample-menu"` on digitalMenu only) and `STEPS` (create/generate/scan with icon names)
- [X] T015 [P] Create `lib/landing/links.ts` exporting `resolveSignupHref(locale, subject)` and `resolveNotifyHref(locale, planId, subject)` reading `process.env.NEXT_PUBLIC_SIGNUP_URL` / `NEXT_PUBLIC_NOTIFY_URL` with `{locale}`/`{plan}` substitution and `mailto:` defaults (contact address constant `LANDING_CONTACT_EMAIL`); export `isInternalHref(href)`
- [X] T016 [P] Unit test `tests/unit/landing-plans.test.ts`: order `free, pro, proPlus`; exactly one `recommended` (free); every `comingSoon` plan has `cta === "notify"`; `pro.price` deep-equals `{ amount: 129, currency: "CZK" }`; `proPlus.price === null`; every `features` key exists under `Landing.plans.{id}.features` in `messages/{cs,en,de}.json`
- [X] T017 [P] Unit test `tests/unit/landing-links.test.ts`: defaults resolve to non-empty `mailto:` with encoded subject; env templates substitute `{locale}` and `{plan}`; `isInternalHref` true only for leading `/`

### Assets

- [X] T018 Create `scripts/fetch-landing-assets.mjs` per `contracts/assets-contract.md` (flags `--force`, `--only`, `--check`; built-in `fetch`; size budget + JPEG/PNG/WebP header dimension check; optional `PEXELS_API_KEY` author validation; regenerates `public/landing/ATTRIBUTION.md`); add `"assets:landing": "node scripts/fetch-landing-assets.mjs"` to `package.json` scripts; run it and commit `public/landing/*` (hero.jpg, hero.mp4 ≤ 6 MB, digital-menu.jpg, pdf.jpg, qr.jpg, og.jpg, ATTRIBUTION.md); delete `public/landing/.gitkeep`
- [X] T019 [P] Unit test `tests/unit/landing-assets.test.ts`: for every `LANDING_ASSETS` entry the file exists under `public/`, byte size ≤ `maxBytes`, header-parsed dimensions equal `width`×`height` for images, `altKey` (when not null) exists in all three catalogues, and `ATTRIBUTION.md` contains every `author` and `pageUrl`

**Checkpoint**: `pnpm test:unit` green (tokens, contrast, plans, links, assets). Foundation ready.

---

## Phase 3: User Story 1 — Owner Understands the Offer and Starts for Free (Priority: P1) 🎯 MVP

**Goal**: Full-viewport hero (poster + optional clip) with headline and CTA, three capability sections, a three-step strip, header and footer — the page a visitor can understand in 30 seconds and act on.

**Independent Test**: Open `/cs` on a 375 px viewport: hero fills the viewport, h1 + CTA visible without scrolling, exactly three capability sections follow, every CTA has a non-empty target; block `**/landing/**` requests and the headline is still readable.

### Client leaves

- [X] T020 [P] [US1] Create `hooks/use-in-view.ts` — once-only IntersectionObserver hook (`threshold 0.2`, disconnect after first intersect; returns `true` immediately when IO is unavailable or `prefers-reduced-motion: reduce`)
- [X] T021 [P] [US1] Create `components/landing/Reveal.tsx` (`"use client"`) using `useInView` + `useIsHydrated` from `hooks/use-is-hydrated.ts`: server/pre-hydration state is fully visible; after hydration and before intersect apply `opacity-0 translate-y-4`; transition via `motion-safe:transition-[opacity,transform] motion-safe:duration-(--motion-slow) motion-safe:ease-(--motion-ease)`; supports `as` prop
- [X] T022 [P] [US1] Create `components/landing/HeroVideo.tsx` (`"use client"`): props `src`, `poster`, `type`; after mount check `matchMedia("(prefers-reduced-motion: no-preference)")`, `matchMedia("(prefers-reduced-data: reduce)")`, `navigator.connection?.saveData`; render `<video autoPlay muted loop playsInline preload="none" poster aria-hidden tabIndex={-1} className="absolute inset-0 size-full object-cover opacity-0 transition-opacity motion-safe:duration-(--motion-slow)">` that becomes `opacity-100` on `canplay`; otherwise render `null`

### Server components

- [X] T023 [US1] Create `components/landing/Hero.tsx`: `<section aria-labelledby min-h-svh relative isolate>`; `next/image` poster with `fill preload sizes="100vw" className="object-cover"` and `alt={t(asset.altKey)}`; base layer `bg-overlay` (fallback when media fails); gradient `bg-linear-to-t from-overlay/70 via-overlay/40 to-overlay/20`; optional `<HeroVideo>`; centred `Container size="sm"` with `<h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tight text-balance text-overlay-foreground">`, sub-headline `<p>`, `Button size="lg"` CTA (`Link` from `@/i18n/navigation` when internal, `<a>` otherwise) using `resolveSignupHref`
- [X] T024 [P] [US1] Create `components/landing/LandingHeader.tsx`: `<header className="absolute inset-x-0 top-0 z-10 text-overlay-foreground">` with wordmark `Link href="/"` (`aria-label={t("brand.wordmarkLabel")}`), `LanguageSwitcher`, `AppearanceToggle`, small sign-up `Button variant="outline"`; if `LanguageSwitcher`/`AppearanceToggle` do not forward `className` to their trigger, add a `className` passthrough to `components/menu/LanguageSwitcher.tsx` / `components/theme/AppearanceToggle.tsx` (no other change)
- [X] T025 [P] [US1] Create `components/landing/CapabilitySection.tsx`: props `capability`, `asset`; `<section data-capability={id} aria-labelledby className="py-24 lg:py-32">`; `Container size="xl"` grid `md:grid-cols-2 gap-12 items-center`, media order by `align` (`md:order-last` when `mediaRight`); eyebrow (lucide icon + `t("capabilities.{id}.eyebrow")`), `<h2 className="font-display text-3xl sm:text-4xl">`, body, optional demo `Link` to `demoHref`; `next/image` with `width/height` from asset, `sizes="(max-width: 768px) 100vw, 50vw"`, `rounded-xl`; wrapped in `Reveal`
- [X] T026 [P] [US1] Create `components/landing/StepsStrip.tsx`: `<section aria-labelledby className="bg-muted py-20">` with `<h2>` and `<ol className="grid gap-8 md:grid-cols-3">`, each `<li>` shows CSS counter (`before:content-[counter(step)]` is NOT allowed by the token gate — use a visible numbered `<span aria-hidden>` from `index + 1`), lucide icon, title, body
- [X] T027 [P] [US1] Create `components/landing/LandingFooter.tsx`: `<footer className="border-t py-12">` with wordmark, `LanguageSwitcher`, links `legal`/`privacy`/`contact` (`href="#"` is forbidden — use `mailto:` for contact and `/` placeholders documented in messages), copyright with `{year}` from `new Date().getFullYear()`, sign-up `Button variant="ghost"`
- [X] T028 [US1] Create `components/landing/Landing.tsx` (Server Component) composing `LandingHeader`, `Hero(getAsset("hero"), getAsset("heroClip"))`, three `CapabilitySection`s from `CAPABILITIES` sorted by `order`, `StepsStrip(STEPS)`, a `<div id="pricing" />` placeholder slot (filled in US2), `LandingFooter`, inside `<main>`
- [X] T029 [US1] Replace `app/[locale]/page.tsx`: keep `hasLocale` + `setRequestLocale`; render `<Landing />`; add `generateMetadata` using `getTranslations({ locale, namespace: "Landing" })` for `title`/`description`, `openGraph.images: [{ url: "/landing/og.jpg", width: 1200, height: 630, alt }]`, `alternates.languages` for `cs`/`en`/`de`; remove all `HomePage` usage
- [X] T030 [US1] Run `pnpm typecheck && pnpm lint` — fix token-gate hits (no arbitrary values, no literals) and any `HomePage` leftovers; run `pnpm dev` and visually check `/cs` in light and dark at 375 px and 1440 px

### Stories & tests for User Story 1

- [X] T031 [P] [US1] `components/landing/Hero.stories.tsx`: `PosterOnly`, `WithClip`, `MediaFailed` (poster src `/landing/does-not-exist.jpg`); `play`: h1 visible, CTA link has non-empty `href`; `MediaFailed` asserts h1 visible
- [X] T032 [P] [US1] `components/landing/LandingHeader.stories.tsx` (`OverHero`, rendered over a `bg-overlay` block): `play` tabs through wordmark → language → appearance → CTA
- [X] T033 [P] [US1] `components/landing/CapabilitySection.stories.tsx` (`DigitalMenu`, `Pdf`, `Qr`): `play` asserts heading level 2 and `img` with non-empty alt
- [X] T034 [P] [US1] `components/landing/StepsStrip.stories.tsx` and `components/landing/LandingFooter.stories.tsx` and `components/landing/Reveal.stories.tsx` (`Default` each; `play`: three `listitem`s / switcher present / children visible)
- [X] T035 [US1] `components/landing/Landing.stories.tsx` (`FullPage`, `layout: "fullscreen"`): `play` asserts exactly one h1 and three `[data-capability]`
- [X] T036 [US1] E2E `tests/e2e/landing.spec.ts` (`@us1`): for `cs`,`de` × viewports 320/375/768/1024/1920 + `{1366,600}` × light/dark: `goto("/{locale}")`, h1 and primary CTA `toBeInViewport()`, no horizontal scroll (reuse helper pattern from `tests/e2e/sample-menu.spec.ts`), exactly three `section[data-capability]`, axe clean; separate test: `page.route("**/landing/**", r => r.abort())` → h1 + CTA visible; `de` test: h1 and CTA bounding boxes do not intersect; screenshots at 375 and 1440 per appearance
- [X] T037 [US1] Run `pnpm test:stories` (both passes) and `pnpm build && pnpm start` + `pnpm test:e2e -- tests/e2e/landing.spec.ts`; fix failures

**Checkpoint**: MVP — the page communicates the offer and every CTA works; all US1 tests green.

---

## Phase 4: User Story 2 — Owner Compares Plans and Sees the Roadmap (Priority: P2)

**Goal**: Pricing section with Free (recommended, live), Pro (129 CZK/mo, coming soon), Pro Plus (coming soon, no price); coming-soon CTAs go to notify-me.

**Independent Test**: Render `Pricing` story: three articles in order, Free badge "Recommended", Pro shows `129` and "Coming soon", Pro Plus shows "Coming soon" and no number; below 768 px cards stack with Free first.

- [X] T038 [P] [US2] Create `components/landing/PlanCard.tsx`: `<article data-plan={id} data-availability aria-labelledby>` built on `Card`/`CardHeader`/`CardContent`/`CardFooter`; name `<h3>`, `Badge` "Coming soon" when `comingSoon`, `Badge variant="secondary"` "Recommended" when `recommended`; price line: `formatMoney(locale, plan.price)` interpolated into `t("pricing.perMonth", { price })`, else `t("pricing.free")` / `t("pricing.noPriceYet")`; `<ul>` of features with lucide `Check`; CTA `Button` (`default` for signup → `resolveSignupHref`, `outline` for notify → `resolveNotifyHref`); `recommended` adds `ring-2 ring-ring shadow-card`
- [X] T039 [US2] Create `components/landing/Pricing.tsx`: `<section id="pricing" aria-labelledby className="py-24 lg:py-32">`, `Container size="xl"`, `<h2>` + subtitle, `<div className="grid gap-6 md:grid-cols-3 items-stretch">` of `PlanCard`s from `PLANS`; wrapped in `Reveal`
- [X] T040 [US2] Replace the `<div id="pricing" />` slot in `components/landing/Landing.tsx` with `<Pricing plans={PLANS} />`; make hero and header CTAs unchanged (they still go to sign-up, not `#pricing`)
- [X] T041 [P] [US2] `components/landing/PlanCard.stories.tsx` (`Free`, `Pro`, `ProPlus`): `play` asserts Free has recommended text and no "coming soon"; Pro contains `129` and coming-soon text; ProPlus contains coming-soon text and no digit in the price line
- [X] T042 [P] [US2] `components/landing/Pricing.stories.tsx` (`Default`): `play` asserts three `article[data-plan]` in order `free, pro, proPlus`
- [X] T043 [US2] Extend `components/landing/Landing.stories.tsx` `FullPage` play: three `[data-plan]` present
- [X] T044 [US2] Extend `tests/e2e/landing.spec.ts` (`@us2`): `#pricing` has three `article[data-plan]` in order; Pro/Pro Plus contain localized "Coming soon" text (read from `messages/{locale}.json` in the test); notify CTAs have `href` not containing `checkout`/`pay`; at 375 px the three cards' bounding boxes are vertically stacked with Free first
- [X] T045 [US2] Run `pnpm test:unit && pnpm test:stories && pnpm test:e2e -- tests/e2e/landing.spec.ts`; fix failures

**Checkpoint**: Pricing complete; US1 + US2 green.

---

## Phase 5: User Story 3 — Owner Reads the Page in Their Language and Preferred Appearance (Priority: P3)

**Goal**: Every string localized in cs/en/de with locale-formatted price, AA contrast in both appearances including text over media, reduced motion fully honoured.

**Independent Test**: Storybook `Landing → FullPage` under `slate/dark/de` shows no untranslated text, legible hero, wrapped-not-overflowing German headline; Playwright with `reducedMotion: "reduce"` finds no `<video>`.

- [X] T046 [US3] Review all `Landing.*` copy in `messages/cs.json`, `messages/en.json`, `messages/de.json` against research R10 (headline ≤ 6 words, sub ≤ 14, owner-benefit first, spec numbers literal); ensure `pricing.perMonth` yields `129 Kč/měsíc`, `CZK 129/month`, `129 CZK/Monat` via `formatMoney`; run `node scripts/check-messages.mjs`
- [X] T047 [P] [US3] Verify reduced motion end-to-end: `Reveal` renders visible state and `HeroVideo` returns `null` under `prefers-reduced-motion: reduce`; add story variants `Hero → WithClipReducedMotion` (Storybook `parameters.chromatic`-free approach: use a decorator that stubs `window.matchMedia`) asserting no `video` element
- [X] T048 [P] [US3] Extend `tests/e2e/landing.spec.ts` (`@us3`): `emulateMedia({ reducedMotion: "reduce" })` → `page.locator("video")` count 0 and no request to `**/hero.mp4`; `emulateMedia({ colorScheme: "dark" })` axe pass on `/de`; assert no element text equals a raw key path like `Landing.` (untranslated guard) in `cs`, `en`, `de`
- [X] T049 [US3] Run the adversarial Storybook pass alone `SB_TEST_VARIANT=slate-dark-de pnpm vitest run --project storybook-alt` and fix any overlay-contrast or German-overflow issue (adjust `text-balance`, `max-w-*` on the h1, or headline copy — never a literal)
- [X] T050 [US3] Lighthouse mobile run against `pnpm build && pnpm start` `/cs`: record LCP/CLS/INP and route JS size in `specs/002-marketing-landing-page/quickstart.md` §6; confirm LCP element is the hero poster and no `hero.mp4` request under Save-Data (Chrome DevTools network conditions)

**Checkpoint**: All three stories independently green in both Storybook passes and e2e.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T051 [P] Add a "Landing page & marketing assets" section to `AGENTS.md`: asset manifest + `pnpm assets:landing`, never hot-link Pexels, `overlay` tokens usage rule, `NEXT_PUBLIC_SIGNUP_URL`/`NEXT_PUBLIC_NOTIFY_URL`, "no `motion` on the landing route" rationale
- [X] T052 [P] Add `.env.example` entries (`NEXT_PUBLIC_SIGNUP_URL=`, `NEXT_PUBLIC_NOTIFY_URL=`, `PEXELS_API_KEY=` commented as dev-only) if the repo has one; otherwise document in `AGENTS.md` only
- [X] T053 [P] Update `specs/002-marketing-landing-page/checklists/requirements.md` notes with the final decisions (video hero, CTA env vars) and mark spec status `Implemented` in `spec.md`
- [X] T054 Remove dead code: confirm no references to `HomePage` messages, unused `public/*.svg` boilerplate (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`) if now unreferenced anywhere including stories (`file.svg` is used by `MenuCover.stories.tsx` — keep)
- [X] T055 Full gate run: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`; commit with `feat: marketing landing page (hero, capabilities, pricing)` and open PR to `main` with the quickstart validation results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → no dependencies
- **Foundational (Phase 2)** → after Setup; **blocks all stories**. Within it: T005 before T009; T006–T008 parallel; T012–T017 parallel; T018 after T012; T019 after T018
- **US1 (Phase 3)** → after Phase 2. T019–T022 parallel; T023 after T022; T023–T027 parallel with T023; T028 after T022–T027; T029 after T028; T030 after T029; stories T030–T035 after their components; T036 after T029; T037 last
- **US2 (Phase 4)** → after Phase 2 (can start in parallel with US1 for T038/T041; T040 needs T028)
- **US3 (Phase 5)** → after US1 and US2 (hardening across the whole page)
- **Polish (Phase 6)** → after all stories

### User Story Dependencies

- **US1**: independent after Phase 2 — delivers the MVP page
- **US2**: `PlanCard`/`Pricing` are independent; integration (T040) needs `Landing.tsx` from US1
- **US3**: verification/hardening of US1 + US2 output; no new components

### Parallel Opportunities

- Phase 2: T006 + T007 + T008 + T010 + T011 + T012 + T013 + T014 + T015 + T016 + T017 all at once (after T005)
- US1: T020 + T021 + T022 together; then T024 + T025 + T026 + T027 while T023 is built; stories T030–T034 together
- US2: T038 + T041 + T042 while US1 finishes
- US3: T047 + T048 together
- Polish: T051 + T052 + T053 together

---

## Parallel Example: User Story 1

```bash
# Client leaves (different files, no deps):
Task: "Create hooks/use-in-view.ts"
Task: "Create components/landing/Reveal.tsx"
Task: "Create components/landing/HeroVideo.tsx"

# Server sections while Hero.tsx is being written:
Task: "Create components/landing/LandingHeader.tsx"
Task: "Create components/landing/CapabilitySection.tsx"
Task: "Create components/landing/StepsStrip.tsx"
Task: "Create components/landing/LandingFooter.tsx"

# Stories once components exist:
Task: "Hero.stories.tsx" / "LandingHeader.stories.tsx" / "CapabilitySection.stories.tsx" / "StepsStrip+Footer+Reveal stories"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (branch, docs, message skeleton) → Phase 2 (tokens, `Container xl`, typed content, assets, unit tests)
2. Phase 3: hero + capabilities + steps + header/footer + route + stories + e2e
3. **STOP and VALIDATE**: `pnpm test:stories` both passes, e2e `@us1`, manual 375/1440 light/dark check
4. Demo-able landing page with working CTAs (pricing slot empty)

### Incremental Delivery

1. Add US2 pricing → `@us2` tests → demo
2. Add US3 hardening (copy review, reduced motion, alt-pass fixes, Lighthouse) → demo
3. Polish → PR

### Verification loop per component task

implement → `pnpm storybook` → check warm/light/cs and slate/dark/de → `pnpm lint` (token gate) → story `play` → mark done.

---

## Notes

- Never write a literal colour, `rgb()/oklch()`, or `x-[value]` in `components/` or `app/` — use tokens; `duration-(--motion-slow)` (parenthesis syntax) is allowed, `duration-[320ms]` is not
- `components/ui/` is CLI-generated only; if a new primitive is needed, `pnpm dlx shadcn@latest add <name>`
- Import `Link` from `@/i18n/navigation`; external and `mailto:` hrefs use a plain `<a>`
- Stories run twice; the `slate/dark/de` pass is the one that finds the real bugs
- Commit after each phase checkpoint at minimum; foundations tokens (T005–T010) in one commit
