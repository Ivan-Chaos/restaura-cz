# Quickstart: Validate the Digital Menu Design System

How to run and prove the feature end-to-end. Commands run from `apps/frontend`.

## Prerequisites

- Node 20+, `pnpm` 11 (`corepack enable` or monorepo `devEngines` auto-download)
- Playwright browsers: `pnpm exec playwright install chromium`
- For agent-driven visual checks: the Playwright MCP server configured in this repo's `.mcp.json`

## Setup

```bash
pnpm install
pnpm dlx shadcn@latest init -y -f --no-reinstall --no-monorepo -b base -t next -p nova   # only if lib/utils.ts is missing
pnpm dlx shadcn@latest add button badge card separator avatar skeleton tooltip dialog sheet tabs \
  accordion sonner input textarea select checkbox radio-group switch label field scroll-area empty toggle
```

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next dev server. Menu at `/cs/sample-menu`, alternative theme at `/cs/sample-menu/slate` |
| `pnpm storybook` | Storybook on http://localhost:6006 |
| `pnpm build-storybook` | Static Storybook for CI / hosting |
| `pnpm test:unit` | Vitest node project (`tests/unit/**`) |
| `pnpm test:stories` | Vitest browser project — every story's `play` + a11y |
| `pnpm test:e2e` | Playwright against `next build && next start` |
| `pnpm test:e2e:storybook` | Playwright against the built Storybook |
| `pnpm test` | unit + stories + both e2e suites |
| `pnpm lint` | ESLint + `check-design-tokens.mjs` + `check-messages.mjs` |
| `pnpm typecheck` | `tsc --noEmit` |

## Validation scenarios

### 1. Warm theme renders in light and dark (Story 1, FR-003/004)

```bash
pnpm storybook
```
Open **Examples / Sample Menu Page**. Toolbar → Appearance: `light` then `dark`. Expected: cream/
terracotta in light; warm cocoa-brown (not neutral grey) surfaces in dark; prices, badges, and
markers legible in both. a11y panel shows 0 violations.

### 2. Alternative theme applies with zero component changes (Story 2, SC-003)

Toolbar → Theme: `slate` (or open `/cs/sample-menu/slate`). Expected: all surfaces, accent, radii, shadows and type change; layout
identical; a11y panel 0 violations. `git diff components/` is empty (nothing changed).

### 3. Contrast contract (FR-005, FR-010, SC-002)

```bash
pnpm test:unit
```
Expected: `contrast.test.ts` passes for `warm` and `slate` × light/dark, printing the matrix.
Break it deliberately (set `--muted-foreground` close to `--muted` in `slate.css`) → test fails
naming the pair and ratio. Revert.

### 4. Token-literal gate (SC-004)

```bash
pnpm lint
```
Expected: pass. Add `className="bg-[#ff0000]"` to any file in `components/menu/` → lint fails
with file:line. Revert.

### 5. Component behaviour + accessibility (FR-012, FR-025)

```bash
pnpm test:stories
```
Expected: all stories pass in both configured combinations (`warm/light/cs` and
`slate/dark/de`); keyboard `play` steps (CategoryNav arrows, QuantityStepper bounds, Sheet
focus trap, Tabs) succeed; axe reports 0 serious/critical.

### 6. Real-page e2e, responsiveness, no ordering affordances (SC-007, SC-008, SC-012)

```bash
pnpm test:e2e
```
Expected for `/cs/sample-menu` and `/de/sample-menu` at 320/375/768/1024/1920, light+dark,
themes `warm`+`slate`:
- `document.documentElement.scrollWidth <= innerWidth` (no horizontal scroll)
- dish "Svíčková" (or its translation) and its price visible; sold-out dish labelled
- 0 elements matching `[data-ordering]` (ordering components never rendered)
- axe: 0 violations

Note the theme is a **static route segment**, not a search param: `searchParams` is a
request-time API in Next 16 and reading it would opt the page out of static rendering.
Every locale × theme variant is prerendered instead.

### 7. Interactive verification with Playwright MCP (per-task, during implementation)

With Storybook running, the agent uses the Playwright MCP tools to:
1. `browser_navigate` to `http://localhost:6006/?path=/story/<component>--<story>`
2. toggle appearance/theme via the toolbar (`browser_click`) or open the iframe URL with
   `&globals=theme:slate;appearance:dark`
3. `browser_take_screenshot` + `browser_snapshot` (a11y tree) and compare against the spec's
   acceptance scenario before marking the task complete.

### 8. Performance budget (SC-009)

```bash
pnpm build && pnpm start
```
Measure the gzipped size of the JS the page actually requests (not all chunks in
`.next`, which overcounts): capture the script URLs with Playwright, then gzip those
files. Expected: < 200 KB gzipped, CLS ≤ 0.1, all sample-menu routes marked `●` (SSG)
in the build output. Results and the method: `verification/performance.md`.

A throttled Lighthouse run on deployed infrastructure is still needed to confirm the
LCP budget on a mid-tier phone over 4G — localhost numbers cannot show that.

### 9. Reduced motion (SC-010)

In Storybook or the sample page, emulate `prefers-reduced-motion: reduce` (Playwright
`emulateMedia`). Expected: category-nav indicator and sheet open without animation; toasts
appear instantly.

## Definition of done for the feature

All nine scenarios pass; `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` are
green; AGENTS.md documents the design system conventions; PR opened from
`feature/frontend/theme-setup` to `main`.

---

## Validation log

Run on **2026-08-29** against commit-in-progress on `feature/frontend/theme-setup`.

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Warm theme in light and dark | PASS | `verification/us1-warm-light.png`, `us1-warm-dark.png` — cream/terracotta in light, warm cocoa (not neutral grey) in dark |
| 2 | Alternative theme, zero component changes | PASS | `verification/us2-slate-*.png`; `git diff components/` empty for the theme addition; `SampleMenu.stories.tsx#ScopedToSlate` |
| 3 | Contrast contract | PASS | `pnpm test:unit` — 25 pairs × 2 themes × 2 appearances, tightest 1.58:1 on a 1.5 floor, all text ≥ 4.5:1 |
| 4 | Token-literal gate | PASS | `pnpm lint` → "no literal colour or spacing values in components" |
| 5 | Component behaviour + a11y | PASS | `pnpm exec vitest run` — 487 tests over 102 files, each story run twice (warm/light/cs and slate/dark/de) with axe as a merge gate |
| 6 | Real-page e2e, responsiveness, no ordering | PASS | `pnpm test:e2e` — 32 tests: 5 viewports × 2 locales × 2 appearances, axe clean, 0 `[data-ordering]` |
| 7 | Interactive verification | PASS | Screenshots in `verification/` reviewed for all four theme × appearance combinations plus German at 1024px |
| 8 | Performance budget | PASS (with caveat) | `verification/performance.md` — 199.8 KB gz (budget 200), CLS 0.0000, all routes static. LCP measured locally only. |
| 9 | Reduced motion | PASS | `tests/e2e/sample-menu.spec.ts` — 0 running animations under `prefers-reduced-motion` |

### Defects found and fixed during validation

The suites earned their keep; none of these were visible by inspection.

1. **`sr-only` escaping a scroll container.** Tailwind's `sr-only` is
   `position: absolute` with no positioned ancestor, so visually-hidden labels
   inside the horizontally scrolling specials strip resolved against the page and
   dragged the document to 605px on a 320px viewport. Fixed by giving the marker,
   the price and the scroll containers a containing block.
2. **`aria-label` on a generic `div`.** `Price` composed one accessible label for
   the whole price — right idea, invalid ARIA (prohibited without a role).
   Replaced with a visually-hidden span plus `aria-hidden` visuals.
3. **Opacity breaking text contrast.** `opacity-75` on sold-out cards multiplied
   through to the text and dropped muted copy to 3.43:1. The badge already
   carried the meaning in words; only the photo is dimmed now.
4. **A scroll region no keyboard could reach.** The specials strip scrolls but
   contains nothing focusable, so arrow keys could not move it. Made the region
   focusable — while keeping its list semantics, since `role="group"` orphaned
   the `<li>`s.
5. **Layout rigidity at 200% font.** A fixed-width select, a non-wrapping price
   row, un-shrinkable legend cells and a non-wrapping language switcher each
   pushed the page sideways at 320px with doubled text.
6. **The two-pass test harness was not actually running two passes.**
   `test.env` populates `process.env` on the node side, but the Storybook setup
   file runs in the browser, so the slate/dark/de variant never applied and every
   story was only ever checked in one combination. Caught by a story that asserts
   its own applied globals — kept in `ThemeScope.stories.tsx` so it cannot
   regress silently.
