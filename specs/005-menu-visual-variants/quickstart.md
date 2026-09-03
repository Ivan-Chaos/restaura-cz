# Quickstart: Validating Menu Visual Variants

**Feature**: 005-menu-visual-variants

This is a validation guide, not an implementation guide. Implementation detail lives in `plan.md`, `research.md` and `tasks.md`.

## Prerequisites

- `pnpm install` at the repo root (pnpm 11).
- API: PostgreSQL reachable per `apps/api/.env`; run `pnpm --filter api db:migrate` (no new migration is expected; this confirms the schema is current).
- Frontend: `apps/frontend/.env.local` pointing at the API (`API_URL`) and `NEXT_PUBLIC_SITE_URL`.
- Playwright browsers installed (`pnpm --filter frontend exec playwright install`).

## 1. Contract and unit gates (fast, no browser)

```bash
# API: allowlist accepted, unknown rejected, ownership intact
cd apps/api && RESEND_API_KEY= pnpm test:e2e -- menus

# Frontend: catalogue ↔ allowlist pin, mapping, token contract, contrast for all 7 themes, glass composite
cd apps/frontend && pnpm test:unit
```

Expected: all green. A failing contrast test names the theme, appearance, pair and measured ratio. A failing `variants.test.ts` means the two apps disagree on the id list.

## 2. Static gates

```bash
cd apps/frontend && pnpm lint && pnpm typecheck
cd apps/api && pnpm lint
```

`pnpm lint` on the frontend also runs the design-token gate (no literal colours or arbitrary utilities in `components/` or `app/`) and the message gate (every new key exists in cs, en, de and no removed key lingers).

## 3. Stories (component tests, two passes)

```bash
cd apps/frontend && pnpm test:stories
```

Covers `VariantSwitcher` (select → action receives the id; error state renders a translated message), `MenuPanel` (no box under warm/slate; glass box under liquid-glass), and the Sample Menu page. The second pass runs slate/dark/de.

Manual check: `pnpm storybook`, open **Examples / Sample Menu Page**, cycle the Theme toolbar through all seven themes in both appearances. Classic and Slate must look exactly as before.

## 4. End-to-end (production build)

```bash
cd apps/frontend && pnpm build && pnpm test:e2e
```

Scenarios exercised (map to spec user stories):

| Spec | Test | Expectation |
|------|------|-------------|
| US1 | `menu-editor.spec.ts` "picks and keeps a visual style" | Six enabled radios; choose Green Bar; toast; reload; Green Bar still checked |
| US1 | API e2e | Non-owner PATCH refused; unknown id 400 |
| US2 | `public-menu.spec.ts` "renders the chosen style" | Guest page `[data-theme]` is `green-bar`; all dishes and prices present |
| US2 | `sample-menu.spec.ts` theming loop | Every theme × light/dark @320px: no horizontal scroll, zero axe violations; perf assertions hold |
| US3 | `preview.spec.ts` | Owner opens `/cs/preview/<menuId>/refined` for a draft: menu renders, `data-theme="refined"`; "Use this style" saves; signed-out visitor gets the sign-in redirect |
| US4 | `sample-menu.spec.ts` / `landing.spec.ts` | `/cs/sample-menu/<theme>` returns 200 for every catalogue theme; landing links resolve |
| Edge | `public-menu.spec.ts` | A menu with variant `default` still renders `data-theme="warm"` |

## Results recorded 2026-09-03 (implementation run)

| Gate | Result |
|------|--------|
| API lint, unit, e2e (`RESEND_API_KEY=`) | green; e2e 117 tests incl. each of the six ids accepted, `elegant` rejected, non-owner refused |
| Frontend typecheck, lint (tokens + messages) | green; 536 message keys in cs/en/de |
| Frontend unit | 317 passed, incl. token/contrast contract for all 7 themes and the glass composite test |
| Stories, both passes (warm/light/cs and slate/dark/de) | 76 files, 361 tests passed |
| Storybook e2e | 5 passed, incl. the new liquid-glass toolbar check |
| Frontend e2e, full suite, production build | 207 passed |

**Second pass, same day (structural presentation, tasks T058–T067).** After review the styles gained
distinct structure through presentation recipes. Re-run: typecheck and lint green; unit 323 passed
(new `presentation.test.ts`); menu stories 220 passed in both passes; affected e2e specs
(sample-menu, public-menu, preview, menu-editor, landing-styles) 79 passed against the dev servers.
Screenshots of all six styles in light and dark, desktop and phone, were reviewed.

Environment notes: the machine's port 3000 was held by another project, so the e2e suite ran through a
temporary config on port 3100 with `RESEND_API_KEY` blanked for the API server (the suites confirm
accounts through the database). That config was not committed.

## 5. Manual checks the automation cannot make

Of the list below, items 2 (a real mid-tier phone), 3 (font network panel) and 4 (dark OS vs light
dashboard) remain manual. Reduced motion (part of 1), German at 320px (5) and "blur once per category"
are now covered by `tests/e2e/sample-menu.spec.ts`; reduced-transparency emulation is not available in
Playwright and stays a DevTools check.

1. **Liquid Glass fallbacks**: in Chrome DevTools → Rendering, emulate `prefers-reduced-transparency: reduce`; panels become solid and the ambient disappears. Emulate `prefers-reduced-motion: reduce`; the ambient no longer drifts. Open in Firefox; panels are solid if `backdrop-filter` is disabled.
2. **Glass on a long menu**: publish a 50-dish menu in Liquid Glass, scroll on a mid-tier Android; no visible jank (DevTools Performance: no long frames from compositing).
3. **Fonts**: in the Network panel on a Classic public menu, confirm no Inter/Oswald/Manrope/Cormorant/DM Sans files load; on a Refined menu, Cormorant Garamond and DM Sans load, nothing else new.
4. **Dashboard stays light**: switch the OS to dark; the editor and picker remain light; each swatch shows its own style's light appearance.
5. **German at 320px**: open `/de/sample-menu/green-bar` and `/de/sample-menu/refined` at 320px; no clipped dish names.

## 6. Performance budget

```bash
cd apps/frontend && pnpm build
# then the perf test in sample-menu.spec.ts, or Lighthouse mobile on:
#   /cs/sample-menu/liquid-glass  /cs/sample-menu/refined  /cs/sample-menu/green-bar
```

Expected: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; guest-route JS unchanged from `main`.

**Recorded 2026-09-03 (implementation run).** Next 16's `next build` route table no longer prints per-route
first-load JS, so the PR-002 check is structural instead: the guest route (`/[locale]/m/[slug]`) gained no
`"use client"` module — `MenuPanel` and `ThemeScope` are Server Components, the only new client
components (`VariantSwitcher`, `PreviewBar`) are mounted on the dashboard and preview routes — and the
route stays `ƒ (Dynamic)` as before. The build prerendered 24 sample-menu paths (8 themes × 3 locales).
Lighthouse on the three heaviest styles is still a manual step (§5).

## Done when

- Every command above passes.
- `specs/001-menu-creation-publishing/contracts/http-api.md` shows the six-id allowlist.
- `apps/frontend/specs/001-menu-design-system/contracts/theme-contract.md` documents the optional token group and fallbacks.
- `apps/frontend/AGENTS.md` explains variants ↔ themes, the panel/ambient tokens, and the preview route's gate.
