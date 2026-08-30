# Quickstart: validating the Marketing Landing Page

Run everything from `apps/frontend`. See [plan.md](./plan.md) for structure and
[contracts/](./contracts/) for exact interfaces.

## Prerequisites

- `pnpm install` (no new dependencies expected — verify `pnpm-lock.yaml` unchanged except for
  nothing).
- Playwright browsers: `pnpm exec playwright install chromium` (once).
- Optional: `PEXELS_API_KEY` in `.env.local` to let the fetch script validate authorship.

## 1. Assets

```bash
node scripts/fetch-landing-assets.mjs           # downloads into public/landing/, writes ATTRIBUTION.md
node scripts/fetch-landing-assets.mjs --check   # validates sizes/dimensions only
```

Expected: six files present, each within its `maxBytes`, `ATTRIBUTION.md` lists every author.
`pnpm test:unit` → `landing-assets.test.ts` green. CI never downloads; assets are committed.

## 2. Foundations (tokens)

```bash
pnpm test:unit
```

Expected: `themes.test.ts` shows `overlay` and `overlay-foreground` declared in warm + slate, light
+ dark; `contrast.test.ts` reports the `overlay-foreground / overlay` pair ≥ 4.5:1 in all four
combinations. `pnpm lint` passes the token gate (no literals in `components/landing/**`).

## 3. Workbench

```bash
pnpm storybook
```

Open **Landing/Landing → FullPage**. Toggle theme `warm ↔ slate`, appearance `light ↔ dark`,
locale `cs / en / de`. Check: hero text legible on every combination, German headline wraps
without touching the CTA, three plan cards stack below 768 px, "Coming soon" visible as text on
Pro and Pro Plus. Open **Landing/Hero → MediaFailed**: headline still readable on the
`bg-overlay` fallback.

## 4. Component tests (stories as tests)

```bash
pnpm test:stories
```

Runs every landing story twice (`warm/light/cs`, `slate/dark/de`) with axe. Expected: 0 failures,
0 a11y violations.

## 5. End-to-end on a production build

```bash
pnpm build && pnpm start &      # or: node scripts/serve-static.mjs if the repo uses it
pnpm test:e2e -- tests/e2e/landing.spec.ts
```

Expected (see matrix below): all green, screenshots for `375` and `1440` per appearance
committed under `tests/e2e/landing.spec.ts-snapshots/`.

## 6. Performance smoke (manual, before PR)

Lighthouse (mobile preset) against `/cs`: LCP ≤ 2.5 s with the hero poster as LCP element,
CLS ≤ 0.1, INP ≤ 200 ms; route JS ≈ shared bundle (+ ≤ 3 KB). Confirm the video request does
**not** appear under "Reduce motion" emulation or with `Save-Data` enabled.

## Acceptance → test matrix

| Spec scenario | Where verified |
|---------------|----------------|
| US1-1 hero fills viewport, h1 + CTA visible, no horizontal scroll (320–1920) | e2e viewport matrix |
| US1-2 exactly three capability sections with title/body/visual | e2e `[data-capability]` count; `CapabilitySection` stories |
| US1-3 CTAs lead to sign-up entry point | e2e href assertions; `landing-plans.test.ts` (cta type) |
| US1-4 readable before media loads | e2e with `**/landing/**` aborted; `Hero → MediaFailed` story |
| US2-1 three plans in order Free, Pro, Pro Plus | e2e `[data-plan]` order; unit |
| US2-2 Free card contents + free price + signup CTA | `PlanCard → Free` story; unit |
| US2-3 Pro coming soon, 129 CZK/mo, features | `PlanCard → Pro` story; unit (`amount 129 CZK`) |
| US2-4 Pro Plus coming soon, no price, feature list | `PlanCard → ProPlus` story; unit |
| US2-5 coming-soon CTA → notify, never pay | unit (`cta === "notify"`); e2e href not a checkout |
| US2-6 cards stack < 768 px | e2e 375/320 screenshot + bounding-box order |
| US3-1 every string localized | `check-messages.mjs`; e2e `de` run; alt Storybook pass |
| US3-2 dark appearance AA contrast | contrast unit test (overlay pair); e2e axe dark; alt pass |
| US3-3 reduced motion: no autoplay, no reveal animation | e2e `emulateMedia({ reducedMotion: "reduce" })` → no `<video>`; `Reveal` renders visible state |
| Edge: media fails | `Hero → MediaFailed`; e2e aborted requests |
| Edge: long German copy | alt Storybook pass; e2e `de` bounding boxes |
| Edge: 1366×600 short viewport | e2e extra viewport `{1366, 600}` — h1 and CTA inside viewport |
| Edge: keyboard / screen reader | axe in stories + e2e; `LandingHeader` story tab order |
| Edge: sign-up not live | `links.ts` unit: default resolves to non-empty `mailto:` |

---

## Implementation results (2026-08-29)

**Automated, all green**

| Gate | Result |
|------|--------|
| `pnpm lint` (eslint + token gate + message parity) | pass — 216 keys in `cs`/`en`/`de`, no literal visual values |
| `pnpm typecheck` | pass |
| `pnpm build` | pass — `/cs`, `/en`, `/de` all prerendered (`●` SSG) |
| `pnpm test:unit` | 68 passed (tokens, contrast incl. the new `overlay` pair, plans, links, assets) |
| `pnpm test:stories` | 53 files passed, both passes (`warm/light/cs` **and** `slate/dark/de`) with axe |
| `pnpm exec playwright test tests/e2e/landing.spec.ts` | 37 passed — 2 locales × 6 viewports × 2 appearances, blocked-media hero, plan order and numbers, reduced motion, no-JS, axe in both appearances |

**Verified by test rather than by Lighthouse**

- Hero poster is server-rendered with `preload` and `sizes="100vw"`; the page is static, so the LCP candidate is in the initial HTML.
- No `.mp4`/`.webm` request is made under `prefers-reduced-motion: reduce` (asserted, not assumed).
- With JavaScript disabled, every section renders and nothing sits at `opacity < 1`.

**Not measured**: a Lighthouse mobile run (LCP/INP/CLS numbers) and the per-route JS
figure — the Turbopack build output for this Next version does not print per-route sizes.
Worth running once before the page is publicly linked.

**Deviations from the plan, and why**

1. `public/landing/hero.mp4` is **not** in the repository. Pexels serves its video files
   behind protections an unauthenticated fetch cannot pass (HTTP 403 from `videos.pexels.com`
   and from the video page). The clip is therefore an `optional` asset: the hero renders its
   poster, and `hasAssetFile` picks the clip up automatically the day the file is added.
2. The QR capability shows a **drawn table tent** (`components/landing/TableTent.tsx`) instead
   of a photograph. Every stock QR photo reviewed carried another company's branding on the
   code or the screen behind it (Spotify, Walls.io/Cisco), which would imply an endorsement the
   Pexels licence forbids.
3. The hero poster budget was raised from 180 KB to 256 KB. The committed file is the source
   `next/image` re-encodes from, not what a visitor downloads, so the budget governs repository
   weight rather than LCP.

---

## Hero video (added 2026-08-29)

The hero's moving picture is Pexels 6321912 (*People Eating Healthy Foods*, cottonbro studio),
streamed from the project's own R2 bucket rather than committed:

```
https://pub-1ab2f4df12124ef28ddfc89ae67880ea.r2.dev/public_assets/6321912-uhd_4096_2160_25fps.mp4
```

**Measured**: 132 MB, 4096×2160, 62.8 s, `Accept-Ranges: bytes` (a range request returns 206, so
it genuinely streams). In a real browser the `<video>` mounts ~150 ms after the `load` event and
begins playing with ~1.2 s buffered — it does not download the file to start.

**How it is kept off the critical path** — all asserted in `tests/e2e/landing.spec.ts`:

| Guard | Behaviour |
|-------|-----------|
| Not requested before `load` + idle | `videoRequests` is empty at `domcontentloaded` |
| Streams from our bucket over https | first request matches `https://*.r2.dev/` |
| Skipped under reduced motion | zero video requests, zero `<video>` elements |
| Skipped on phones (< 768 px) | zero video requests at 390 px |
| Skipped on reduced-data / Save-Data / sub-4G | read at decision time in `HeroVideo` |
| Never blocks first paint | poster is server-rendered with `preload`; video mounts client-side |

The e2e suite blocks and records video requests rather than downloading them, so the tests stay
fast and do not depend on the bucket being reachable.

**Outstanding — worth doing before launch.** The source is a 62.8 s UHD master at roughly
17 Mbit/s. A desktop visitor who lets the loop run pulls the full ~132 MB. Transcoding to 1080p
at 3–4 Mbit/s and trimming to 10–15 s would put it near 5 MB — visually identical once scaled
into a hero, and ~25× less data. The manifest takes a new URL and nothing else changes.

**Also outstanding**: `public/landing/hero.jpg` is still the original dining-room photograph, so
the poster and the clip show different scenes and the crossfade reads as a cut. A still exported
from the video would make the transition seamless (and would become the mobile hero).
