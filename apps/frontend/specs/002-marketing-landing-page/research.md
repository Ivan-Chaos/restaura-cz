# Research: Marketing Landing Page

**Phase 0 output** · 2026-08-29 · resolves every open technical question in [plan.md](./plan.md)

Sources consulted: `node_modules/next/dist/docs/01-app/02-guides/videos.md`,
`.../03-api-reference/02-components/image.md`, `.../01-getting-started/14-metadata-and-og-images.md`,
existing design system (`lib/design-system/tokens.ts`, `styles/themes/*.css`, `app/globals.css`,
`scripts/check-design-tokens.mjs`, `vitest.config.ts`, `playwright.config.ts`,
`tests/e2e/sample-menu.spec.ts`), Pexels licence terms (pexels.com/license), constitution v1.0.0.

---

## R1 — Hero media: poster image + optional silent clip

**Decision**: The hero always renders a `next/image` poster (`fill`, `preload`, `sizes="100vw"`,
`object-cover`). A client leaf `HeroVideo` mounts a `<video autoPlay muted loop playsInline
preload="none" poster={poster} aria-hidden>` on top of it only when
`matchMedia("(prefers-reduced-motion: no-preference)")` matches **and** neither
`matchMedia("(prefers-reduced-data: reduce)")` nor `navigator.connection?.saveData` is true.
The video fades in over the poster once `canplay` fires; until then the poster is what the user
sees. No controls, no audio track, no captions (decorative content, hidden from AT).

**Rationale**: The Next video guide recommends `autoPlay + muted + playsInline` for background
clips and `preload="none"` to avoid impacting page weight. The poster is the LCP element and
is server-rendered, so the constitution's LCP budget does not depend on the clip. Gating in JS
(not CSS) is required because a `display:none` video with default `preload` still downloads.
Spec FR-003 requires the still first and no autoplay under reduced motion.

**Alternatives considered**: video-only hero (fails FR-003 and LCP on 4G); CSS-only hide under
reduced motion (still downloads); YouTube/Vimeo iframe (third-party script, cookies, not
licence-relevant, off-brand).

## R2 — Sourcing and storing Pexels assets locally

**Decision**: A manifest `lib/landing/assets.ts` lists every asset (Pexels id, page URL, author,
author URL, direct download URL, local filename, width, height, kind `image|video`, alt message
key). `scripts/fetch-landing-assets.mjs` reads the manifest, downloads each file into
`public/landing/` with Node's built-in `fetch`, verifies size budgets (image ≤ 400 KB, hero
poster ≤ 180 KB at 1920 w, video ≤ 6 MB), and regenerates `public/landing/ATTRIBUTION.md`.
Images are requested from Pexels' CDN with `?auto=compress&cs=tinysrgb&w=1920` (and `w=1280` for
section images); video uses the 1080p or 720p file link from the Pexels video page. The script
works without an API key; if `PEXELS_API_KEY` is set it additionally validates ids via
`https://api.pexels.com/v1/photos/{id}` / `videos/videos/{id}` to keep author metadata honest.
Downloaded files are committed. Curating which photos/clip to use is an implementation task
guided by the brief in [contracts/assets-contract.md](./contracts/assets-contract.md).

**Rationale**: User direction ("download images locally for now, videos too"). Pexels licence:
free for commercial use, no attribution required (we record it anyway), modifications allowed;
prohibited: selling unaltered copies, implying endorsement by depicted people/brands,
identifiable people in a way that is offensive. Hot-linking from the Pexels CDN is fragile and
not what the licence is for. The manifest makes the repo self-describing and lets a unit test
prove the disk matches.

**Alternatives considered**: hot-linking (rejected: FR-012, fragility); `remotePatterns` +
Next image optimisation of remote URLs (still hot-links); Pexels API as a runtime dependency
(needs a key at build time, no benefit for a fixed set of six assets).

**Deferred (owner decision)**: where video is ultimately hosted. Options to revisit: Git LFS,
object storage + CDN, or Vercel Blob. Until then the ≤ 6 MB budget keeps the repo tolerable.

## R3 — Design-system modification: text over media

**Decision**: Add two required semantic colour tokens to `MENU_COLOR_TOKENS`:
`overlay` — a dark scrim colour drawn from each theme's darkest neutral palette step (warm:
`cocoa-950`, slate: `graphite-950`) — and `overlay-foreground` — the text colour on that scrim
(warm: `cream-50`, slate: `graphite-50`). Both appearances use the *same* values (a scrim is dark
regardless of appearance). Add `{ foreground: "overlay-foreground", background: "overlay", min: 4.5 }`
to `CONTRAST_PAIRS`, purpose strings to `TOKEN_PURPOSE`, `--color-overlay(-foreground)` to
`@theme inline`. Components use `bg-overlay/55` (Tailwind opacity modifier on a token utility is
not an arbitrary value) for gradients/scrims and `text-overlay-foreground` for hero text and the
transparent header.

**Rationale**: No current token is "light text that stays light in dark mode". `foreground`
flips with appearance; `primary-foreground` is a control colour and is dark in slate-dark. The
token gate forbids literals. Making the pair *required* (not optional) means `themes.test.ts`
forces every future theme to define it and `contrast.test.ts` proves it is legible.

**Alternatives considered**: reuse `--info`/`--info-foreground` (semantically wrong, slate values
unknown); `mix-blend-mode` tricks (contrast unverifiable); making the tokens optional (a theme
that forgets them silently breaks the hero).

Also: `Container` gets an `xl` size (`max-w-7xl`) — see plan Complexity Tracking.

## R4 — CTA destinations without a backend

**Decision**: `lib/landing/links.ts` exports `resolveSignupHref(locale)` and
`resolveNotifyHref(locale, planId)`. They read `process.env.NEXT_PUBLIC_SIGNUP_URL` and
`process.env.NEXT_PUBLIC_NOTIFY_URL` (both optional, inlined at build time). Defaults are
`mailto:` links to a project address constant with a localized subject from messages
(`Landing.cta.mailSubjectSignup`, `Landing.cta.mailSubjectNotify` with `{plan}`), so the CTA is
never a dead end. Env values may contain `{plan}` and `{locale}` placeholders.

**Rationale**: Spec assumption: sign-up may not be live; edge case: CTA must lead somewhere
useful. A form needs a backend (out of scope); a static `/start` route would duplicate this
later. Env-driven URLs let the owner point CTAs at a Tally/Google Form today and the real
sign-up route tomorrow with no code change. Values are public, non-secret.

**Alternatives considered**: `/[locale]/start` placeholder page (extra route, still no capture);
inline email form (needs an endpoint + spam handling); linking to `/sample-menu` (misrepresents
"start for free").

## R5 — Price formatting

**Decision**: Reuse `formatMoney(locale, { amount: 129, currency: "CZK" })` from
`lib/design-system/price.ts` and wrap it in a message: `Landing.plans.pro.price` =
`"{price}/month"` (`"{price}/měsíc"`, `"{price}/Monat"`). Free shows `Landing.plans.free.price`
(`"Free"`/`"Zdarma"`/`"Kostenlos"`); Pro Plus shows `Landing.plans.proPlus.price`
(`"Coming soon"` styled as the price line) — no numeric price.

**Rationale**: One price formatter in the codebase (constitution reuse rule); locale-correct
`Kč`/`CZK` placement comes for free; the period suffix is language, so it lives in messages.

## R6 — Motion: reveal-on-scroll without the `motion` library on this route

**Decision**: `hooks/use-in-view.ts` — a once-only IntersectionObserver hook (`threshold 0.2`,
disconnects after first intersection, returns `true` immediately when IO is unavailable or
reduced motion is preferred). `components/landing/Reveal.tsx` (`"use client"`) applies
`motion-safe:transition-[opacity,transform] motion-safe:duration-(--motion-slow)` plus
`opacity-0 translate-y-4` → `opacity-100 translate-y-0` when in view. Server-rendered HTML is
the *visible* state; the hidden state is applied only after hydration (`useIsHydrated` exists
in `hooks/`), so content is never invisible without JS.

**Rationale**: Constitution IV caps route JS and asks for justification above 20 KB per dep;
`motion` would add ~15–30 KB gz for a fade. `duration-(--motion-slow)` uses the CSS-variable
shorthand, which is not an arbitrary bracket value, so it passes the token gate and respects
the theme's motion tokens. Reduced motion is honoured by `motion-safe:` and by the hook.

**Alternatives considered**: `motion` `whileInView` (bundle cost, redundant); CSS
`animation-timeline: view()` (Safari/Firefox support still gated in baseline); no motion at all
(acceptable fallback, but subtle reveal is part of the "premium" brief).

## R7 — Route, metadata and Open Graph

**Decision**: Landing composition replaces `app/[locale]/page.tsx`. `generateMetadata` uses
`getTranslations({ locale, namespace: "Landing.meta" })` for title/description and points
`openGraph.images` at the static `public/landing/og.jpg` (1200×630, curated crop of the hero
poster produced by the fetch script or committed manually). `alternates.languages` lists the
three locale roots. The page keeps `hasLocale` + `setRequestLocale` and stays static (no
`searchParams`, no `headers()`).

**Rationale**: Static OG file is simpler than `opengraph-image.tsx` generation and avoids an
extra edge function; metadata API verified in the Next 16 docs. Landing is the highest-traffic
static page — social previews matter for "catching customers".

## R8 — Testing strategy mapped to the constitution

**Decision**:
- *Unit* (`tests/unit/`): `landing-assets.test.ts` — every manifest entry's file exists,
  dimensions match via header parse, alt key present in all three catalogues, ATTRIBUTION.md
  lists every author; `landing-plans.test.ts` — order Free→Pro→Pro Plus, Free `recommended`,
  Pro `price.amount === 129 && currency === "CZK"`, both non-free plans `availability ===
  "comingSoon"` and `cta === "notify"`, Pro Plus has no price.
- *Stories* (both Vitest browser passes, axe on): one per component; `PlanCard` stories for
  each plan; `Hero` stories `WithVideo`, `PosterOnly`, `MediaFailed` (broken src); `Landing`
  full page.
- *E2E* (`tests/e2e/landing.spec.ts`, production build): locales `cs`,`de` × 5 viewports ×
  light/dark: h1 + primary CTA visible in the initial viewport, no horizontal scroll, axe clean;
  `route("**/landing/**", abort)` → h1 + CTA still visible (FR-003); exactly three
  `section[data-capability]`; pricing has three `article[data-plan]` in order with coming-soon
  text on Pro/Pro Plus; CTA hrefs resolve to non-empty targets; German hero headline does not
  overlap the CTA (bounding boxes); reduced-motion emulation → no `<video>` in DOM; screenshots
  at 375 and 1440 per appearance.

**Rationale**: Mirrors the existing `sample-menu.spec.ts` matrix so reviewers recognise it;
the alt Storybook pass is the cheapest catcher of overlay-contrast and German-length issues.

## R9 — Header over the hero

**Decision**: `LandingHeader` is absolutely positioned over the hero, transparent, using
`text-overlay-foreground`; it reuses `LanguageSwitcher` and `AppearanceToggle` inside a
`ThemeScope`-free wrapper and passes a `tone="onMedia"` class hook only through `className`
(existing components accept `className`). No sticky/scroll-aware behaviour (would need JS and
adds nothing to conversion). Footer repeats the language switcher on a normal surface.

**Rationale**: Premium restaurant sites keep chrome minimal over the hero; reuse beats a new
switcher. If `LanguageSwitcher`/`AppearanceToggle` cannot be recoloured via `className`, the
task is to add a `className` passthrough to them, not to fork them.

## R10 — Copy and visual direction (for the implementer, not a code decision)

**Decision**: Voice: confident, short, owner-centric ("Your menu, on every table, in minutes").
Hero headline ≤ 6 words per locale; sub-headline ≤ 14 words. Capability copy states the owner
benefit first, mechanism second. Pricing copy is literal (numbers from the spec). Photography
brief: warm interiors, plated dishes, hands scanning a phone at a table; no faces as focal
points; consistent warm colour temperature so the warm theme and the imagery agree. Typography
per plan §7. Follow `frontend-design` skill guidance when implementing for distinctive, non-
templated composition.

**Rationale**: "Premium" is mostly restraint: one accent, big type, real photography, whitespace.

---

## Verified against installed docs (T002, 2026-08-29)

- `next/image`: `priority` **is** deprecated in Next 16 in favour of `preload`; a `fill` image's
  parent must be `position: relative|fixed|absolute`; `width`/`height` are required unless the
  image is statically imported or uses `fill`. Plan R1 confirmed as written.
- `<video>`: `autoPlay` requires `muted`, plus `playsInline` for iOS; `preload="none"` keeps the
  clip off the critical path. Plan R1 confirmed as written.
- **Correction to R7**: `openGraph.images` must be an *absolute* URL, or `metadataBase` must be
  set — a relative path without `metadataBase` is a build error. Implementation therefore sets
  `metadataBase` from `NEXT_PUBLIC_SITE_URL` (default `http://localhost:3000`) in the locale
  layout, and keeps the relative `/landing/og.jpg` in the page metadata.
