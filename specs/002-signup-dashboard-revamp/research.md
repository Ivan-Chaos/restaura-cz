# Research: Sign-Up Expansion & Dashboard Revamp

**Date**: 2026-08-31 | **Plan**: [plan.md](./plan.md)

No NEEDS CLARIFICATION markers existed in the Technical Context; the questions below are the design unknowns that had to be settled before Phase 1. Each was resolved against the installed stack (Next.js 16 / React 19 / Tailwind 4 / shadcn base-nova; NestJS 12 / Drizzle 0.45 / Postgres) and the three constitutions.

## R1 — Storing the restaurant profile (table shape, phones)

**Decision**: New table `restaurant_profile`, exactly one row per account (`account_id` is both PK and FK, `ON DELETE CASCADE`). Phone numbers are a `text[]` column with a `CHECK (cardinality(phones) BETWEEN 1 AND 3)` constraint; per-element format/length rules live in the DTO validator.

**Rationale**:
- A separate 1:1 table keeps `owner_account` a pure credentials record (it is also referenced by `session` and `menu`) and makes "profile missing" a natural, queryable state for the completion gate (FR-005) — no nullable-column sprawl.
- `text[]` for 1–3 phones is the fewest moving parts (API constitution I): a child `phone_number` table adds a join, ordering column, and cascade rules for a list capped at three strings that is always read and written as a whole. Postgres still enforces the cardinality invariant (API constitution V).
- Order of entry is preserved by array order for free.

**Alternatives considered**:
- Columns on `owner_account` (`restaurant_name`, `phone1..3`, `location`) — rejected: nullable sprawl, "complete profile" becomes a multi-column predicate, credentials row churns on profile edits.
- Child table `restaurant_phone` — rejected as over-normalization for a max-3 list with no per-phone metadata; revisit only if phones ever gain labels (e.g., "reservations").
- `jsonb` profile blob — rejected: Postgres could no longer enforce NOT NULL/length invariants per field (violates API constitution V).

## R2 — Forcing light tones on the dashboard only

**Decision**: A CSS-only appearance scope, mirroring the existing `ThemeScope` pattern. Add `[data-appearance="light"]` to the selector list of the light-token block in `styles/themes/warm.css` (the block that currently owns `:root`), plus `color-scheme: light` on that scope. A tiny server component `AppearanceScope` (`components/dashboard/AppearanceScope.tsx`) renders a wrapper `<div data-appearance="light">`; `workspace/layout.tsx` wraps all dashboard content in it.

**Rationale**:
- The theming system already resolves Tailwind utilities against the nearest scope (`@theme inline` + attribute scopes); dark values are *inherited* from `.dark` on `<html>`, so a descendant that re-declares the same custom properties wins by inheritance rules — no specificity fight, no `!important`.
- Zero JavaScript, no hydration flash, works in Server Components — identical properties to `ThemeScope`, so it is idiomatic for this codebase.
- The user's stored appearance preference is untouched: public pages (landing, public menus, legal) keep light/dark exactly as today (spec FR-011, edge case "device set to dark").
- `color-scheme: light` keeps native form controls, scrollbars, and the UA default canvas consistent inside the scope.

**Alternatives considered**:
- `next-themes` `forcedTheme` — rejected: it is provider-global (would force light on public pages too) and cannot be scoped to a route segment without nesting providers, which next-themes does not support.
- Removing/adding the `.dark` class per route via an effect in the workspace layout — rejected: client JS, a flash of wrong appearance on navigation, and it mutates global state (a dashboard tab would restyle a public-menu tab's `<html>`? no — but it would fight the toggle and the stored preference).
- Duplicating the light palette in a new stylesheet — rejected: two sources of truth for token values; adding a selector to the existing block keeps one.

**Caveat recorded**: inside the light scope, a nested `ThemeScope` under a dark `<html>` would re-resolve dark tokens (`.dark [data-theme="…"]` outranks by matching the themed element). The dashboard does not nest `ThemeScope`, so this is out of scope; noted for any future "menu preview inside editor" work.

## R3 — Sidebar implementation

**Decision**: Add the shadcn `sidebar` primitive via the shadcn CLI (`components/ui/sidebar.tsx`) and compose a feature-level `DashboardSidebar` (nav entries: Menus, Settings; active-state from `usePathname` via `@/i18n/navigation`). Mobile: the primitive's built-in sheet/offcanvas behavior (the `sheet` primitive is already installed).

**Rationale**: The frontend constitution mandates shadcn CLI for UI primitives and reuse-before-creation. The registry sidebar handles collapse, mobile sheet mode, keyboard navigation, and ARIA out of the box, adds no new runtime dependency (it composes existing primitives + Tailwind), and keeps client JS at the leaf (`SidebarProvider`/trigger only).

**Alternatives considered**:
- Hand-rolled `<aside>` + existing `sheet` — rejected: duplicates state/ARIA/breakpoint logic the registry component already ships; more code to test for no gain.
- Third-party layout library — rejected outright (new dependency, constitution V).

## R4 — Password confirmation placement

**Decision**: `confirmPassword` is validated in two client-reachable layers and never sent to the API: (1) inline in `RegistrationForm` on blur/submit for immediate feedback; (2) authoritatively in the `signUpAction` Server Action (the form uses `noValidate` and must work without client JS). The API contract keeps a single `password` field.

**Rationale**: Confirmation is a UX safeguard against typos, not a business rule; the API storing/validating a duplicate secret adds surface for zero integrity gain (API constitution I). The Server Action check keeps the guarantee even with JS disabled.

**Alternatives considered**: sending `confirmPassword` to the API — rejected: widens the contract and logs/handles the secret twice for a check the action already performs.

## R5 — Phone number validation & normalization

**Decision**: Accept international-friendly input: trim, collapse internal whitespace; validate against `^\+?[0-9 ()-]{5,24}$` with a digit-count rule of 6–15 digits (E.164 ceiling). Store the trimmed original (formatting preserved). Same rule in the API DTO (custom `class-validator` decorator in `common/validators.ts`) and in a shared frontend helper (`lib/api/phone.ts`) unit-tested on both sides.

**Rationale**: Spec edge case requires accepting spaces, dashes, and international prefixes; owners will print these numbers on menus, so preserving their formatting beats canonicalizing to E.164. Digit-count bounds block junk without rejecting real numbers. The API remains the authority (root constitution: validation at the boundary).

**Alternatives considered**:
- Full E.164 canonicalization via `libphonenumber` — rejected: heavyweight dependency (>100 KB) for a display-only field; no dialing/SMS features exist.
- Digits-only storage — rejected: loses owner-intended formatting for display.

## R6 — Profile write endpoint shape

**Decision**: Single idempotent `PUT /auth/profile` 🔒 that upserts the caller's profile (insert when missing — the completion flow; update when present — the settings flow). `GET /auth/me` is extended to return `{ account, profile: RestaurantProfile | null }`.

**Rationale**: Completion and editing are the same write with the same validation (spec FR-018 mandates identical rules); one endpoint, one DTO, one test matrix (API constitution I). `me` returning the profile lets the frontend gate render decisions with the single request it already makes per page.

**Alternatives considered**:
- `POST /profile` + `PATCH /profile` — rejected: two endpoints, client must know which to call; partial PATCH semantics complicate "at least one phone" validation.
- Separate `GET /profile` — rejected: every gated page already calls `me`; a second round-trip per render buys nothing.

## R7 — Profile-completion gate & return destination

**Decision**: The gate lives in `lib/api/session.ts`: `requireProfile(locale, nextPath)` runs in `workspace/layout.tsx` — signed-out visitors go to `/sign-in?next=<path>`, profile-less accounts go to `/complete-profile?next=<path>`. `/complete-profile` itself requires a session but *no* profile (and forwards to `next`, default `/workspace/menus`, once complete). Sign-in honors a validated, same-origin, path-only `next` param.

**Rationale**: A layout-level gate covers every current and future dashboard route from one place (spec FR-004/FR-005/FR-013); path-only validation of `next` avoids open-redirect issues. Layouts in App Router re-render on navigation within the segment only when their data changes — the `me` call is already made per request, so the gate adds no extra round-trip.

**Alternatives considered**:
- Middleware/proxy gate — rejected: `proxy.ts` handles locale redirection only; auth in middleware would need cookie → API verification per asset request and duplicates what `me` already answers during render.
- Per-page gate calls (status quo `requireAccount` in each page) — rejected: N pages × 2 flows to forget; the layout does it once.

## R8 — Settings tabs as nested routes

**Decision**: `workspace/settings/` is a route segment with its own `layout.tsx` rendering the tab navigation (links styled with the existing `tabs` primitive's visual language); tabs are child routes: `settings/profile`, `settings/subscription`. `settings` itself redirects to `settings/profile`.

**Rationale**: URL-addressable tabs satisfy the spec's deep-linking edge case for free, keep each tab a Server Component with its own data needs, and match App Router idiom (layout = shared chrome). The `Tabs` client primitive alone would hold tab state in memory — lost on refresh, not linkable.

**Alternatives considered**:
- Single page + `Tabs` component — rejected: not addressable, all tab content ships in one payload.
- Single page + `?tab=` search param — rejected: forces the page dynamic on a param, uglier than segment routes, and loses per-tab layouts/metadata.

## R9 — Subscription placeholder

**Decision**: Frontend-only. `settings/subscription` renders a static, localized "current plan" card (plan name "Early access / MVP", status, and copy that management is coming). No API surface, no DB entity, no `Subscription` type in the contract.

**Rationale**: The spec scopes subscriptions to a read-only placeholder (FR-019); inventing a backend entity now would be speculation (API constitution I — YAGNI). The tab's existence establishes the information architecture the spec asks for.

**Alternatives considered**: a stub `GET /subscription` endpoint — rejected: contract surface with exactly one hardcoded answer; add it when billing lands.

## R10 — Menus list restyling

**Decision**: Replace `MenuList` with `MenuCardList` + `MenuCard`: a responsive card grid where each card evokes a physical menu — display-font (`--font-display`) menu name, decorative rule, a small "menu-paper" surface using existing `card`/`surface-raised` tokens, publish-status badge, public path when published, updated-at line, and the whole card is the link to `/workspace/menus/[menuId]` (delete stays a secondary action via the existing `ConfirmDialog`). Empty state keeps the existing `Empty` primitive with an inviting create CTA (FR-016).

**Rationale**: Reuses `card`, `badge`, `Empty`, `ConfirmDialog`, and the design-token/display-font system already built for public menus — the "looks like a menu" effect comes from typography and surface tokens, not new assets. Whole-card link with a nested action follows the established pattern (button inside link-card handled with explicit z-index/stopPropagation-free markup: card link overlay + separately focusable action buttons) and stays WCAG-operable.

**Alternatives considered**: keeping rows with heavier styling — rejected: the spec explicitly asks for menu-like items, and rows can't carry the menu-paper metaphor; introducing menu-cover imagery — deferred, no image pipeline for owner content exists yet.

## R11 — Where the menus list lives

**Decision**: Move the list from `workspace/page.tsx` to `workspace/menus/page.tsx`; `workspace` redirects to `workspace/menus`. Header content (signed-in identity, sign-out) moves from the page into `DashboardHeader` in the layout.

**Rationale**: The sidebar needs distinct destinations for Menus and Settings (spec FR-010); `/workspace/menus` already exists as the editor's parent path, so the list becomes its index — URL hierarchy matches navigation hierarchy. The redirect keeps old bookmarks working.

**Alternatives considered**: leaving the list at `/workspace` with sidebar pointing there — rejected: "Menus" and "dashboard home" become the same entry, and a future dashboard home (stats) would force a URL migration.
