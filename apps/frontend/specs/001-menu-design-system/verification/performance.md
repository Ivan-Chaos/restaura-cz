# Performance verification (T096)

**Date**: 2026-08-29 · **Route**: `/cs/sample-menu` · **Build**: `next build` (Turbopack), served by `next start`

## Budgets (constitution, Principle IV)

| Metric | Budget | Measured | Result |
|--------|--------|----------|--------|
| Initial route JS | < 200 KB gzipped | **199.8 KB** | PASS (tight) |
| CLS | ≤ 0.1 | **0.0000** | PASS |
| LCP | ≤ 2.5 s | 152 ms local, unthrottled | Indicative only — see caveat |
| Static rendering | required | all 15 pages `●` (SSG) | PASS |
| Client data fetching | none | 0 fetch/XHR after load | PASS (asserted in e2e) |

**LCP caveat**: measured on localhost with no CPU or network throttling, so 152 ms
says only that nothing blocks the critical path. It is *not* evidence of the
mid-tier-mobile-over-4G budget the constitution sets. A throttled Lighthouse run
on deployed infrastructure is still required before that row can be called PASS.
CLS and the JS budget are device-independent and stand on their own.

## How the JS budget was met

The starting point was **237.0 KB** — 37 KB over. The measurement that mattered:

> `/cs` (home) and `/cs/sample-menu` loaded **byte-for-byte identical** bundles.
> The menu route adds **0 KB** of client JavaScript.

Every menu component — `DishCard`, `Price`, `DietaryMarkerList`, `SpecialsStrip`,
`MenuHeader`, `MenuFooter`, `DietaryLegend`, the whole composition — is a Server
Component. The overage was entirely the shared baseline, so that is where the
work went:

| Change | Saved | Rationale |
|--------|-------|-----------|
| Removed `MotionProvider` | ~0 KB measured | Nothing used `motion`; the provider set a `MotionConfig` that CSS `prefers-reduced-motion` already handles. Dead weight regardless of the number. |
| Split `LanguageSelect` out of `LanguageSwitcher` | **27.3 KB** | The base-ui `Select` primitive was in the shared bundle for a control the guest menu does not use. The guest menu now shows three language buttons — one tap instead of two on a phone — and the dropdown lives in its own module for dense admin screens. |
| Removed the global `<Toaster />` | **9.9 KB** | Sonner was mounted in the root layout for every route, including the guest menu, which never raises a toast. Routes hosting `ShareMenu` or the dish form mount their own. |

## Standing risk

199.8 KB against a 200 KB budget is **0.2 KB of headroom**. The next client
component added to a shared path will breach it. The floor is React 19 + the
Next 16 App Router runtime + `NextIntlClientProvider` + `next-themes`; roughly
180 KB of that is framework we do not control.

Two things follow:

1. Treat the budget as a CI gate, not a one-off check, or it will drift silently.
   The measurement is ~15 lines of Playwright plus `zlib.gzipSync` over the
   chunks the page actually requests — worth adding to the pipeline.
2. Before adding any client component to the root layout or to a component the
   menu renders, measure first. `"use client"` on a leaf is cheap; on a shared
   ancestor it is not.

## Reproducing

```bash
pnpm build && pnpm start
# capture the JS the page requests, gzip those chunks, sum them
```

The e2e suite asserts the device-independent parts continuously:
`tests/e2e/sample-menu.spec.ts` covers CLS-adjacent layout stability (no
horizontal scroll at five viewports × two locales × two appearances × two
themes) and the "no client data fetching" guarantee.
