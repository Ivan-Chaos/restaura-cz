# Contract: Landing Components (`components/landing/`)

All components are Server Components unless marked `"use client"`. All accept `className` and
forward unknown props to their root element. No component receives display strings as props
— each resolves its own copy via `useTranslations("Landing")` so stories and the route render
identical text. Data props come from `lib/landing/*`.

| Component | Props | Root / semantics | Notes |
|-----------|-------|------------------|-------|
| `Landing` | — | `<main>` | Composes header, hero, 3× capability, steps, pricing, footer. Marks `id="pricing"` on the pricing section for in-page links. |
| `LandingHeader` | — | `<header>` absolutely positioned over hero | Wordmark (`<a href="/">` via i18n `Link`), `LanguageSwitcher`, `AppearanceToggle`, small `Button` sign-up CTA. Text uses `text-overlay-foreground`. |
| `Hero` | `poster: MediaAsset`, `clip?: MediaAsset` | `<section aria-labelledby>` `min-h-svh` | Renders `next/image fill preload sizes="100vw"` poster, `bg-overlay` fallback + `bg-overlay/55` gradient, `<h1>` (the page's only h1), `<p>` sub-headline, primary `Button size="lg"` CTA, optional `HeroVideo`. |
| `HeroVideo` `"use client"` | `src: string`, `poster: string`, `type: "video/mp4" \| "video/webm"` | `<video>` or `null` | Mounts `<video autoPlay muted loop playsInline preload="none" aria-hidden tabIndex={-1}>` only if motion + data preferences allow (research R1). Fades in on `canplay`. Never renders under `prefers-reduced-motion: reduce`. |
| `CapabilitySection` | `capability: CapabilitySection`, `asset: MediaAsset` | `<section data-capability={id} aria-labelledby>` | Eyebrow (icon + label), `<h2>`, body, optional demo `Link`. Media/text order follows `align`; stacks vertically < `md`. Wrapped in `Reveal`. |
| `StepsStrip` | `steps: readonly Step[]` | `<section aria-labelledby>` with `<ol>` | Three numbered steps; numbers from `Landing.steps.{id}.number`-free CSS counters (no text). |
| `Pricing` | `plans: readonly Plan[]` | `<section id="pricing" aria-labelledby>` | `<h2>` + grid of `PlanCard`s: 1 col < `md`, 3 cols ≥ `lg`. Passes `recommended` through. |
| `PlanCard` | `plan: Plan` | `<article data-plan={id} data-availability aria-labelledby>` built on `Card` | `Badge` "Coming soon" (text, not colour only) when `comingSoon`; `Badge` "Recommended" when `recommended`; price line (`formatMoney` + period message, or localized Free / Coming soon); `<ul>` features with lucide `Check`; CTA `Button` (`variant="default"` for signup, `variant="outline"` for notify). `recommended` adds `ring-2 ring-ring shadow-card`. |
| `LandingFooter` | — | `<footer>` | Wordmark, `LanguageSwitcher`, legal/contact placeholder links (message-driven), © line with year via `Intl`. |
| `Reveal` `"use client"` | `children`, `as?: ElementType` | wraps children | Adds `motion-safe:` fade/translate on first intersection (research R6). Server HTML is the visible state. |

## Extended existing components

| Component | Change | Contract |
|-----------|--------|----------|
| `components/layout/Container` | new `size: "xl"` → `max-w-7xl` | Additive; default unchanged. Story `Layout.stories.tsx` gains the variant. |
| `LanguageSwitcher`, `AppearanceToggle` | ensure `className` passthrough to the trigger | Only if not already present; no visual change elsewhere. |

## Story coverage (required)

| Story file | Stories | `play` assertions |
|------------|---------|-------------------|
| `Hero.stories.tsx` | `PosterOnly`, `WithClip`, `MediaFailed` (poster `src` → 404) | h1 visible; CTA has non-empty `href`; `MediaFailed` still shows h1 with `bg-overlay` fallback |
| `LandingHeader.stories.tsx` | `OverHero` | language + appearance controls reachable by keyboard |
| `CapabilitySection.stories.tsx` | `DigitalMenu`, `Pdf`, `Qr` | heading + image alt present |
| `StepsStrip.stories.tsx` | `Default` | three `listitem`s |
| `PlanCard.stories.tsx` | `Free`, `Pro`, `ProPlus` | `Pro`/`ProPlus` contain "coming soon" text (localized); `Free` has recommended badge; `Pro` shows `129` |
| `Pricing.stories.tsx` | `Default` | three articles in order |
| `LandingFooter.stories.tsx` | `Default` | switcher present |
| `Landing.stories.tsx` | `FullPage` (`layout: "fullscreen"`) | exactly one h1; three `[data-capability]`; three `[data-plan]` |

All stories run in both Vitest browser passes with the a11y addon in error mode.
