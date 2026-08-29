# Implementation Plan: Marketing Landing Page

**Branch**: `002-marketing-landing-page` (git: `feature/frontend/theme-setup` until a `feature/frontend/landing-page` branch is cut) | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-marketing-landing-page/spec.md`

**User direction for this plan**: download all Pexels assets locally for now — images *and* video (where video is eventually hosted is deferred); follow the pre-existing design system and modify it where the landing page genuinely needs something it lacks.

## Summary

Replace the placeholder locale root (`app/[locale]/page.tsx`) with a statically rendered,
premium marketing page for restaurant owners: a full-viewport hero (Pexels photo poster with an
optional silent looping Pexels clip), three capability sections (digital menu, PDF, table QR),
a three-step "how it starts" strip, a three-plan pricing section (Free live; Pro 129 CZK/mo and
Pro Plus marked coming soon), and a minimal footer. Everything is built from the existing
design system (`components/ui`, `components/layout`, warm theme, `next-intl`, appearance axis)
and the only foundations change is two new semantic tokens for text over photography
(`overlay`, `overlay-foreground`). Assets are fetched by a manifest-driven script into
`public/landing/` with attribution recorded in the repo. Landing sections are Server
Components; the two client leaves are the hero video (reduced-motion / save-data aware) and a
~1 KB in-view reveal hook. Verified by stories (both Storybook passes), a Playwright e2e suite on
a production build, and unit tests for the asset manifest and pricing catalogue. See
[research.md](./research.md) for decisions R1–R10.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2, Next.js 16.3 (App Router, Server Components first)

**Primary Dependencies**: Existing only — Tailwind CSS 4, shadcn `base-nova` primitives already in `components/ui` (button, card, badge, separator, tooltip), `next-intl` 4, `next-themes`, `lucide-react`, `next/image`, `next/font`. **No new runtime dependencies.** `motion` is deliberately *not* used on this route (R6). **New dev-only**: none (asset fetch script uses Node's built-in `fetch`).

**Storage**: N/A at runtime. Static assets in `public/landing/` (JPEG/WebP posters + MP4 clip), manifest in `lib/landing/assets.ts`, attribution in `public/landing/ATTRIBUTION.md`.

**Testing**: Vitest unit (asset manifest integrity, plan catalogue, CTA href resolution) · Storybook stories with `play` functions run under both Vitest browser passes (`warm/light/cs` and `slate/dark/de`) with axe · Playwright e2e `tests/e2e/landing.spec.ts` against `next build` (cs + de, 5 viewports, light/dark, axe, blocked-media hero readability, CTA targets, plan order) · existing `check-design-tokens.mjs` and `check-messages.mjs` gates

**Target Platform**: Mobile-first public web (320–1920 px), evergreen browsers; typical visitor is a restaurant owner on a phone

**Project Type**: Web frontend — one new route composition plus a `components/landing/` feature directory inside the existing Next app

**Performance Goals**: Landing route on production build: LCP ≤ 2.5 s (hero poster is the LCP element, `preload`ed, `sizes="100vw"`, fixed aspect → CLS 0), INP ≤ 200 ms, CLS ≤ 0.1; route JS ≤ shared bundle + ~3 KB (hero video leaf + reveal hook); hero poster ≤ 180 KB at 1920 w; hero clip ≤ 6 MB, ≤ 15 s, 1080p, no audio track, `preload="none"` until poster painted

**Constraints**: Zero literal visual values in `components/`/`app/` (gate); all strings via `next-intl` in `cs`/`en`/`de`; static rendering (`setRequestLocale`, no `searchParams`); WCAG 2.1 AA including text over media in both appearances; reduced motion → no autoplay, no reveal animation; `prefers-reduced-data`/Save-Data → no video download; Pexels licence honoured (no resale, no implied endorsement, attribution recorded)

**Scale/Scope**: 1 route, ~9 landing components, 1 client hook, 1 client leaf, 2 new tokens (× 2 themes × 2 appearances), 1 `Landing` message namespace (~60 keys × 3 locales), ~5 photos + 1 clip, ~10 stories, 1 e2e spec, 2 unit specs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | How the plan satisfies it |
|-----------|------|--------|---------------------------|
| I. Code Quality | Strict TS, lint + `tsc` clean, verified Next APIs, `@/i18n/navigation` imports, reuse-before-create, shadcn via CLI only, locale validation on every page | ✅ | `next/image` `preload` (not deprecated `priority`), `<video>` per `guides/videos.md`, metadata per `getting-started/14-metadata-and-og-images.md` — all read before coding. Reuses `Container`, `Stack`, `Section`, `Button`, `Card`, `Badge`, `LanguageSwitcher`, `AppearanceToggle`, `formatMoney`. No new primitives needed; if one is, it is added with `pnpm dlx shadcn@latest add`. |
| I. Code Quality | No dead code | ✅ | `HomePage` message namespace and the placeholder page body are removed in the same change. |
| II. Testing | Acceptance scenarios → automated tests at unit / component / e2e layers in `cs` + one more locale; behaviour-level assertions; message parity in CI; deterministic | ✅ | Each spec acceptance scenario maps to a story `play` or an e2e test (see quickstart.md matrix). Hero "readable before media loads" is tested by blocking `**/landing/**` requests in Playwright and asserting the h1 + CTA are visible. Screenshot tests disable animations. |
| III. UX Consistency | All text via `next-intl`; tokens only; light + dark for every component; 320–1920 responsive; AA a11y; consistent states; reduced motion | ✅ | `Landing` namespace in all three catalogues; `overlay`/`overlay-foreground` tokens added to `tokens.ts`, `CONTRAST_PAIRS`, warm + slate (so the theme test and contrast test enforce them); `motion-safe:` utilities + `useReducedMotion`-equivalent media query in the video leaf. |
| IV. Performance | Static rendering; CWV budgets; minimal client JS; `next/image` + `next/font`; only active locale messages | ✅ | Route is fully static (`generateStaticParams` from layout; no request-time APIs). Hero poster via `next/image fill preload sizes="100vw"`; video is a client leaf that only mounts `<video>` when motion + data preferences allow, `preload="none"`, poster painted first. No `motion` import on this route (R6) keeps route JS ≈ shared bundle. |
| V. Simplicity | Simplest solution; justify deps/abstractions; platform primitives | ✅ | No CMS, no MDX, no animation library, no form backend: CTAs resolve to configurable URLs (R4). Content lives in typed constants + messages. One small script instead of a Pexels SDK. |
| Tech constraints | pnpm, shadcn CLI, lucide icons, locales in `i18n/routing.ts`, env for secrets | ✅ | Optional `PEXELS_API_KEY` only read by the dev script from env; runtime reads `NEXT_PUBLIC_SIGNUP_URL` / `NEXT_PUBLIC_NOTIFY_URL` with safe defaults. |
| Workflow | Spec Kit flow, branch naming, PR gates, commit prefixes, AGENTS.md updated | ✅ | AGENTS.md gains a short "Landing page & marketing assets" section (asset manifest, fetch script, overlay tokens, CTA env vars). |

**Pre-Phase-0 result**: PASS. **Post-Phase-1 result**: PASS (see re-evaluation at the end).

## Project Structure

### Documentation (this feature)

```text
specs/002-marketing-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R10
├── data-model.md        # Phase 1 — Plan, CapabilitySection, Step, MediaAsset, CTA
├── quickstart.md        # Phase 1 — how to fetch assets, run, and validate
├── contracts/
│   ├── component-api.md       # Public props of components/landing/*
│   ├── messages-contract.md   # `Landing` namespace keys
│   ├── assets-contract.md     # Manifest schema, file layout, fetch-script CLI, licence rules
│   └── tokens-contract.md     # The two new semantic tokens and their contrast pairs
├── checklists/requirements.md
└── tasks.md             # Phase 2 — created by /speckit-tasks
```

### Source Code (`apps/frontend`)

```text
app/
└── [locale]/
    ├── layout.tsx                  # unchanged (fonts, AppearanceProvider, NextIntlClientProvider)
    └── page.tsx                    # REPLACED: composes <Landing/> ; generateMetadata (title, description, OG image)

components/
├── landing/
│   ├── Landing.tsx                 # Full-page composition (Server Component)
│   ├── LandingHeader.tsx           # Transparent-over-hero header: wordmark, LanguageSwitcher, AppearanceToggle, CTA
│   ├── Hero.tsx                    # Full-viewport media + centred headline + CTA (Server Component)
│   ├── HeroVideo.tsx               # "use client" — mounts <video> only when motion/data prefs allow
│   ├── CapabilitySection.tsx       # Alternating media/text block; used 3× (menu, PDF, QR)
│   ├── StepsStrip.tsx              # 3-step "how it starts"
│   ├── Pricing.tsx                 # Section wrapper + 3 PlanCards, responsive grid
│   ├── PlanCard.tsx                # Name, price line, coming-soon badge, feature list, CTA
│   ├── LandingFooter.tsx           # Wordmark, LanguageSwitcher, legal/contact placeholders
│   ├── Reveal.tsx                  # "use client" — wraps children; adds in-view class (motion-safe)
│   └── *.stories.tsx               # one per component + Landing.stories.tsx (full page)
├── layout/Container.tsx            # + `xl` size variant (max-w-7xl) for wide marketing sections
└── theme/ThemeScope.tsx            # unchanged

hooks/
└── use-in-view.ts                  # IntersectionObserver once-only hook used by Reveal

lib/
├── design-system/tokens.ts         # + "overlay", "overlay-foreground" in MENU_COLOR_TOKENS, TOKEN_PURPOSE, CONTRAST_PAIRS
└── landing/
    ├── assets.ts                   # MediaAsset manifest (Pexels id, author, url, file, dimensions, alt message key)
    ├── plans.ts                    # Plan catalogue (Free / Pro / Pro Plus) as typed data
    ├── capabilities.ts             # Capability + Step catalogue (ids, icon, asset, message keys)
    └── links.ts                    # resolveSignupHref() / resolveNotifyHref() from env with defaults

styles/themes/
├── warm.css                        # + --overlay / --overlay-foreground (light + dark)
└── slate.css                       # + --overlay / --overlay-foreground (light + dark)
app/globals.css                     # + --color-overlay / --color-overlay-foreground in @theme inline

public/landing/
├── hero.jpg · hero.webm|mp4 · menu.jpg · pdf.jpg · qr.jpg · og.jpg   # fetched, committed
└── ATTRIBUTION.md                  # generated from the manifest by the fetch script

scripts/
└── fetch-landing-assets.mjs        # reads lib/landing/assets manifest → downloads → writes ATTRIBUTION.md

messages/{cs,en,de}.json            # + Landing namespace; − HomePage namespace

tests/
├── unit/
│   ├── landing-assets.test.ts      # every manifest entry: file exists, dims match, alt key exists in all locales
│   └── landing-plans.test.ts       # plan order, Free recommended, coming-soon plans have notify CTA, Pro price 129 CZK
└── e2e/
    └── landing.spec.ts             # locales × viewports × appearance; axe; blocked-media hero; CTA hrefs; plan cards
```

**Structure Decision**: A `components/landing/` feature folder (mirrors `components/menu/`) plus
a `lib/landing/` data folder. Content (plans, capabilities, assets) is typed data separate from
presentation so the pricing can change without touching components, and so unit tests can
assert the spec's numbers directly. No new package, no CMS.

## Design Decisions Carried Into Phase 1

1. **Media over text needs tokens, not literals.** Text on photography must be light in *both*
   appearances, which no existing token guarantees. Add `overlay` (a dark scrim colour, used at
   token-defined opacity via `bg-overlay/60`) and `overlay-foreground` to the required set, with a
   4.5:1 contrast pair. Every theme declares them (test-enforced). Hero fallback when media fails
   = `bg-overlay` alone, so the headline stays readable (FR-003).
2. **Hero = poster first, clip second.** `next/image fill preload` poster is the LCP element and
   always renders. `HeroVideo` (client leaf) mounts `<video autoPlay muted loop playsInline
   preload="none" poster>` only when `prefers-reduced-motion: no-preference` and not
   `prefers-reduced-data: reduce` / `navigator.connection.saveData`. No controls; it is
   decorative (`aria-hidden`), so no captions track is required.
3. **Assets are manifest-driven.** `lib/landing/assets.ts` is the single source: id, Pexels
   page URL, author, download URL, local file, width/height, alt message key. The script
   downloads and regenerates `ATTRIBUTION.md`; the unit test proves the manifest and the disk
   agree. Video hosting decision deferred — files committed under a 6 MB budget for now.
4. **CTAs are configurable, never dead ends.** `NEXT_PUBLIC_SIGNUP_URL` and
   `NEXT_PUBLIC_NOTIFY_URL` (per-plan suffix) with `mailto:` defaults carrying a localized
   subject. Swapping to a real form or the future sign-up route is a config change.
5. **Sections are Server Components; interactivity is two leaves.** `HeroVideo` and `Reveal`
   are the only `"use client"` files. `Reveal` is `motion-safe:` CSS + a once-only
   IntersectionObserver hook — no `motion` on this route.
6. **Stories are the tests.** Every landing component has a story; `Landing.stories.tsx`
   renders the whole page. The alt pass (slate/dark/de) is what catches text-over-media
   contrast and German-length headline wrapping.
7. **Premium restaurant aesthetic, in tokens.** Hero headline `font-display` at `text-5xl
   sm:text-6xl lg:text-7xl`, `tracking-tight`, `text-balance`; sections separated by generous
   `py-24 lg:py-32`; one accent (`primary`) reserved for CTAs; imagery edge-to-edge in
   `Container size="xl"`; no drop shadows on flat sections, `shadow-card` only on plan cards.

## Complexity Tracking

| Violation / addition | Why needed | Simpler alternative rejected because |
|----------------------|------------|--------------------------------------|
| Two new required tokens (`overlay`, `overlay-foreground`) — a foundations change touching `tokens.ts`, both themes, `globals.css`, contrast pairs | Text over photographs must stay AA in light *and* dark; hero must stay readable with no media (FR-003, FR-016) | Reusing `foreground`/`background` flips with appearance and fails on photos; `primary-foreground` is semantically a button colour and differs per theme (slate dark uses a dark value). Hard-coding is forbidden by the token gate. |
| `"use client"` in `HeroVideo` and `Reveal` | Autoplay eligibility and in-view state exist only in the browser | A server-rendered `<video autoPlay>` cannot honour reduced-motion/save-data (CSS `display:none` still downloads with `preload≠none`), and CSS scroll-driven animations lack cross-browser support in 2026 baseline. Both leaves are < 2 KB gz combined. |
| Committing a ≤ 6 MB video into git | User explicitly chose local assets for now; hosting decision deferred | Hot-linking Pexels violates FR-012 and is not licence-safe for production. Git LFS / object storage recorded as the follow-up in research R2. |
| `Container` gains an `xl` variant | Marketing sections want a wider measure (80 rem) than the menu's `lg` (72 rem) | A one-off `max-w-[80rem]` is an arbitrary value (gate) and a landing-only container would duplicate `Container`. |
| Two `NEXT_PUBLIC_*` env vars for CTA targets | No sign-up or waitlist backend exists yet; CTAs must not dead-end (spec edge case) | A hard-coded `mailto:` would need a code change when sign-up ships; a placeholder `/start` route with a form needs a backend that is out of scope. |

## Post-Design Constitution Re-check

Re-evaluated after producing research.md, data-model.md, contracts/ and quickstart.md:

- **I** — Contracts define one component per concept; `Container` is extended, not duplicated; `LanguageSwitcher`/`AppearanceToggle`/`Button`/`Card`/`Badge`/`formatMoney` reused. ✅
- **II** — quickstart.md maps every acceptance scenario (US1 1–4, US2 1–6, US3 1–3, edge cases) to a story or e2e test; unit tests pin the pricing numbers. ✅
- **III** — tokens-contract.md adds the overlay pair to `CONTRAST_PAIRS`; messages-contract.md enumerates every string incl. image alts and mailto subjects. ✅
- **IV** — zero new runtime deps; static route; poster preloaded with `sizes`; video gated and `preload="none"`. ✅
- **V** — content as typed data, two tiny client leaves, one script. Additions justified above. ✅

**Gate result**: PASS — ready for `/speckit-tasks`.
