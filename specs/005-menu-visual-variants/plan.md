# Implementation Plan: Menu Visual Variants

**Branch**: `feature/be-fe/mvp-menu-creation` (current; spec dir `005-menu-visual-variants`) | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-menu-visual-variants/spec.md`

## Summary

Turn the stubbed "Visual style" picker into a working choice of six styles (Classic plus Plain White, Liquid Glass, Green Bar, Modern, Refined) and make the guest page render the chosen one. The existing theming architecture already does the heavy lifting: a style is a theme CSS file plus a registry entry, `<ThemeScope>` applies it with no component change, and the menu row already stores `visualVariant`. The work is therefore: (1) widen the API allowlist and contract, (2) author five theme files with new palette ramps and fonts, (3) add a small optional token group so Liquid Glass can express translucency, blur and an ambient background inside the token system, (4) map the stored variant id onto a theme id and apply it on the public page, (5) replace the disabled picker with a saving radio-card group plus swatches and a full-page preview route, and (6) extend the test matrix so every theme is proven accessible in both appearances.

## Technical Context

**Language/Version**: TypeScript 5 (strict) in both apps; Node 22 runtime

**Primary Dependencies**:
- Frontend (`apps/frontend`): Next.js 16.3 (App Router, Server Components, Server Actions), React 19.2, Tailwind CSS 4, shadcn (base-nova on `@base-ui/react`), `next-intl` 4, `next-themes`, `next/font/google`, `culori` (test-only contrast), Storybook 10 + Vitest browser, Playwright + axe
- API (`apps/api`): NestJS 12, class-validator, Drizzle ORM, Vitest + supertest

**Storage**: PostgreSQL via Drizzle. `menu.visual_variant` is already `text NOT NULL DEFAULT 'default'`; **no migration**.

**Testing**: API: `pnpm test` (unit) and `pnpm test:e2e` (supertest, real DB). Frontend: `pnpm test:unit` (token/contrast contract, adapters), `pnpm test:stories` (every story, two passes: warm/light/cs and slate/dark/de, axe on), `pnpm test:e2e` (Playwright, production build, axe), `pnpm lint` (eslint + design-token gate + message-catalogue gate), `pnpm typecheck`.

**Target Platform**: Web. Guests on mid-tier Android/iOS phones over 4G; owners on desktop browsers. Chrome, Safari, Firefox current versions (Firefox partial `backdrop-filter`: fallback required).

**Project Type**: Web application, two apps in one monorepo (NestJS API + Next.js frontend), cross-app contract in `specs/001-menu-creation-publishing/contracts/http-api.md`.

**Performance Goals**: Guest page LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on the reference mobile profile in every style (PR-001). Guest-page initial client JS unchanged (PR-002). Liquid Glass: blur bounded to at most one sticky bar plus one panel per category, never per dish row (PR-003). New font faces not preloaded and swap-in with a system fallback (PR-004).

**Constraints**: No literal visual values outside `styles/palette.css` (lint gate). A theme may only assign catalogued tokens (unit gate). New tokens must be added to `tokens.ts` and every theme in one commit. Every user-visible string in cs/en/de. Both appearances per theme, WCAG 2.1 AA on every contract pair. Dashboard stays light-locked. Public menu page stays `force-dynamic`.

**Scale/Scope**: 6 styles × 2 appearances × 3 locales. 5 new theme CSS files, ~6 new palette ramps, 5 new font faces, 1 optional token group (5 tokens), 1 new component (panel), 1 rewritten component (picker), 1 new route (preview), 1 new server action, API allowlist + contract + tests, ~10 message keys × 3 locales.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Root constitution v1.0.0 and frontend constitution v1.0.0. The API has no constitution yet (TODO recorded in root); root rules apply to it directly.

| Principle | Requirement | How this plan satisfies it | Status |
|-----------|-------------|----------------------------|--------|
| I. Code Quality | Strict TS, lint + typecheck zero errors, reuse before creation, verified framework APIs, no dead code | Reuses `ThemeScope`, `GuestMenu`, `toDisplayMenu`, `useActionState` pattern, theme registry, sample-menu route fan-out. `next/font` `preload` option verified against `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`. Removes the `PLANNED_VARIANT_COUNT` placeholder and the `variantComingSoon`/`variantDefault` keys it used. | PASS |
| II. Testing | Acceptance scenarios covered by automated tests at every layer; both sides of a contract change tested; deterministic | API e2e loops over the allowlist and rejects an unknown id. Frontend unit: variant→theme mapping, catalogue ↔ API allowlist pin, token contract and contrast for all 7 themes, glass composite contrast. Stories: picker, panel, sample page under theme toolbar. E2E: editor picks and persists a style; guest page carries the mapped `data-theme`; sample menu for every theme × appearance @320 with axe; preview route. | PASS |
| III. UX Consistency | i18n for all text, tokens only, light+dark, 320–1920 responsive, WCAG AA, consistent states | New `VisualVariants` message namespace in cs/en/de. All colours via palette → theme → utilities. Every theme declares light and dark. Contrast contract enforced by test; glass has an additional composite test. Picker uses existing radio/fieldset semantics and the editor's toast-on-save pattern. | PASS |
| IV. Performance | Measurable targets in spec, static where possible, budgets enforced | Sample-menu route stays fully prerendered (fan-out over `THEME_IDS`). Public page unchanged in rendering mode. Picker is a client component in the dashboard only; guest page gains no client JS. Fonts `preload: false`, `display: swap`. Blur bounded by design (panel tokens only). Playwright perf assertion on the sample menu extended to all themes. | PASS |
| V. Simplicity (frontend) | Simplest solution, justify abstractions, prefer platform primitives | No new runtime dependency. Translucency, blur and ambient are CSS custom properties resolved by Tailwind utilities, the same mechanism every other token uses. Preview is a Server Component page, not a client-side renderer. See Complexity Tracking for the three deliberate additions. | PASS |
| Frontend: static rendering | Pages static wherever possible; dynamic needs a documented reason | Preview route is dynamic because it renders one owner's draft menu behind a session, same reason as the editor. Documented in the route's header comment and here. | PASS (justified) |
| Frontend: client JS budget | `"use client"` at the smallest leaf; no dependency > 20 KB without justification | `VariantSwitcher` stays the only client leaf and only in the dashboard. No new dependency. | PASS |
| Cross-app contract | API and frontend change in one reviewable unit, both tested | Allowlist, contract doc, API e2e, frontend catalogue pin and contract type test all land in this feature. | PASS |

**Gate result (pre-research)**: PASS. Three design choices need justification and are recorded in Complexity Tracking; none violates a MUST.

## Project Structure

### Documentation (this feature)

```text
specs/005-menu-visual-variants/
├── plan.md                         # This file
├── research.md                     # Phase 0: decisions R1–R10
├── data-model.md                   # Phase 1: Visual Style catalogue, Menu, tokens
├── quickstart.md                   # Phase 1: how to validate end to end
├── contracts/
│   ├── http-api-delta.md           # PATCH /menus/:id allowlist change; public payload
│   └── visual-variant-catalogue.md # Frontend catalogue, theme contract additions, mapping
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/
├── src/menus/visual-variants.ts            # MODIFY: allowlist becomes six ids
├── test/menus.e2e-spec.ts                  # MODIFY: accept every id, reject unknown
└── (no schema change; column already text)

specs/001-menu-creation-publishing/contracts/http-api.md   # MODIFY: allowlist note

apps/frontend/
├── app/globals.css                          # MODIFY: import 5 themes; expose panel/ambient tokens; `ambient` utility; reduced-transparency + @supports fallbacks
├── app/[locale]/layout.tsx                  # MODIFY: load 5 more faces with preload:false
├── app/[locale]/m/[slug]/page.tsx           # MODIFY: ThemeScope theme = themeForVariant(menu.visualVariant)
├── app/[locale]/sample-menu/[[...theme]]/page.tsx   # UNCHANGED (fans out over THEME_IDS)
├── app/[locale]/preview/[menuId]/[variant]/page.tsx  # NEW: owner-only full-page preview
├── app/[locale]/workspace/menus/[menuId]/page.tsx    # MODIFY: pass action + variant to picker; preview links
├── components/menu/MenuPanel.tsx            # NEW: section panel (bg-panel, blur, inset); transparent in non-glass themes
├── components/menu/MenuPanel.stories.tsx    # NEW
├── components/menu/GuestMenu.tsx            # MODIFY: wrap sections in MenuPanel; root gets `ambient`
├── components/menu/SampleMenu.tsx           # MODIFY: same
├── components/workspace/VariantSwitcher.tsx # REWRITE: radio-card group with swatches, saves via action
├── components/workspace/VariantSwitcher.stories.tsx  # NEW
├── components/workspace/VariantSwatch.tsx   # NEW: mini ThemeScope preview used by picker and preview bar
├── components/workspace/PreviewBar.tsx      # NEW: "Previewing X — back / use this style"
├── components/landing/...                   # MODIFY (US4): demo capability lists per-style sample links
├── lib/menu-display/variants.ts             # NEW: VISUAL_VARIANTS catalogue (id → themeId), isVisualVariant, themeForVariant
├── lib/design-system/themes.ts              # MODIFY: 5 registry entries; FontKey/FONT_VARIABLES for new faces
├── lib/design-system/tokens.ts              # MODIFY: OPTIONAL_TOKENS += panel, panel-border, panel-blur, panel-inset, ambient, ambient-motion; TOKEN_PURPOSE entries
├── lib/design-system/contrast.ts            # MODIFY: composite() helper for alpha-over-colour
├── lib/api/actions/menus.ts                 # MODIFY: setVisualVariantAction
├── lib/validation/schemas.ts                # MODIFY: visualVariantSchema
├── lib/validation/form-data.ts              # MODIFY: readVisualVariant
├── lib/landing/capabilities.ts              # MODIFY: per-style demo hrefs
├── styles/palette.css                       # MODIFY: ramps ink, bottle, brass, ivory, aurora, signal; glass alpha steps
├── styles/themes/plain-white.css            # NEW
├── styles/themes/liquid-glass.css           # NEW
├── styles/themes/green-bar.css              # NEW
├── styles/themes/modern.css                 # NEW
├── styles/themes/refined.css                # NEW
├── styles/themes/warm.css, slate.css        # MODIFY: declare the new optional tokens with neutral defaults
├── messages/{cs,en,de}.json                 # MODIFY: VisualVariants namespace; Themes ids; MenuEditor/Preview keys; remove variantComingSoon/variantDefault
├── tests/unit/variants.test.ts              # NEW: mapping, catalogue ↔ API pin, unknown → warm
├── tests/unit/glass-contrast.test.ts        # NEW: composite panel over ambient stops and background
├── tests/unit/themes.test.ts                # MODIFY: default theme check unchanged; nothing else (loops registry)
├── tests/e2e/menu-editor.spec.ts            # MODIFY: replace "locked" test with pick-and-persist
├── tests/e2e/public-menu.spec.ts            # MODIFY: guest page carries mapped data-theme
├── tests/e2e/sample-menu.spec.ts            # MODIFY: loop THEME_IDS for a11y/320 and perf
├── tests/e2e/preview.spec.ts                # NEW: owner preview renders draft in chosen style; guest cannot open
├── specs/001-menu-design-system/contracts/theme-contract.md  # MODIFY: optional token group; fallback rules
└── AGENTS.md                                # MODIFY: variants ↔ themes mapping; panel/ambient tokens; preview route gate
```

**Structure Decision**: Existing two-app layout. Style identity lives entirely in `styles/themes/*.css` + palette + registry (design system), product identity in `lib/menu-display/variants.ts` (catalogue mirroring the API allowlist). The API owns the allowlist; the frontend pins it in a test so the two cannot drift silently.

## Complexity Tracking

| Violation / Addition | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New optional token group (`panel`, `panel-border`, `panel-blur`, `panel-inset`, `ambient`, `ambient-motion`) and one new component (`MenuPanel`) | Liquid Glass is defined by translucent panels with backdrop blur over an ambient colour field. The current catalogue has no way to say "translucent", "blurred" or "background image"; without tokens the look would need per-theme component CSS. | (a) Theme CSS targeting `[data-slot="dish-card"]` selectors: couples themes to component internals, bypasses the token gate and the "zero component changes" contract. (b) Making `--surface-raised` translucent: breaks the contrast test's assumption that surfaces are opaque and would silently pass an unreadable panel. |
| Preview route outside the `/workspace` shell, repeating the profile gate | A faithful preview must be full-bleed, must honour dark appearance and must not show the sidebar. The workspace layout light-locks and wraps everything in the shell. | Rendering inside the shell would lock light appearance (FR-010 preview parity impossible) and show a menu inside a dashboard frame, which is not what guests see. |
| Five additional Google font faces (Inter, Oswald, Manrope, Cormorant Garamond, DM Sans) | Modern, Refined and Green Bar are typographic identities; reusing Fraunces/Nunito for all would make the styles look like colour swaps. | Two shared faces would fail the spec's style directions. Cost bounded: `preload: false` so faces load only when a theme's CSS references them; `latin-ext` subset only. |

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 artifacts were written:

- Token additions are catalogued (`tokens.ts`) and declared in all seven themes, so the "declares no token outside the catalogue" and "declares every required token" gates still hold (the group is optional, defaults documented).
- The contrast contract is extended, not weakened: opaque semantic tokens keep the existing pairs; translucent panels get an additional composite test over every ambient stop and `--background`.
- No new client JS on the guest route; `MenuPanel` is a Server Component.
- Contract change is documented in `contracts/http-api-delta.md` and mirrored into the canonical `http-api.md` in the same change set.
- Fallback rules for `prefers-reduced-transparency` and missing `backdrop-filter` live in `globals.css` so they are generic to any translucent theme and do not confuse the CSS-parsing tests.

**Gate result (post-design)**: PASS.
