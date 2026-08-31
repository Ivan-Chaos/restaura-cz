# Implementation Plan: Sign-Up Expansion & Dashboard Revamp

**Branch**: `feature/be-fe/signup-dashboard-revamp` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-signup-dashboard-revamp/spec.md`

## Summary

Extend registration to collect a full restaurant profile (restaurant name, 1–3 phone numbers, location) alongside email + password + confirmation, and gate all dashboard access on a complete profile. Rework the signed-in experience into a proper dashboard shell (header + sidebar, forced light tones) rendered by a shared `workspace` layout; restyle the menus list into menu-like cards; add a Settings page with URL-addressable tabs (profile editing + subscription placeholder).

Technical approach: one new Postgres table (`restaurant_profile`, 1:1 with `owner_account`) behind an extended `POST /auth/sign-up`, an extended `GET /auth/me`, and a new `PUT /auth/profile` upsert. On the frontend: a new `RegistrationForm`, a `/complete-profile` gate route for profile-less accounts, a `workspace/layout.tsx` dashboard shell using the shadcn sidebar primitive, a forced-light appearance scope implemented in CSS (no JS, mirroring `ThemeScope`), menu cards, and `workspace/settings/{profile,subscription}` nested routes acting as tabs.

## Technical Context

**Language/Version**: TypeScript 5 (strict) in both apps

**Primary Dependencies**:
- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn (base-nova / `@base-ui/react`), `next-intl` 4, `next-themes`, `lucide-react`, `motion`
- API: NestJS 12, Drizzle ORM 0.45, `class-validator`, `@node-rs/argon2`, `pg`

**Storage**: PostgreSQL (system of record; Drizzle migrations). New table `restaurant_profile`.

**Testing**:
- API: Vitest unit + e2e against real Postgres (`test/*.e2e-spec.ts`, docker-compose)
- Frontend: Vitest unit + component tests, Playwright e2e (`tests/e2e`), Storybook stories for new components, contract tests (`tests/unit/api-contract.test.ts`) mirroring `contracts/http-api.md`

**Target Platform**: Web — owner dashboard usable 320px–1920px; API on Node (Linux server)

**Project Type**: Monorepo web application (`apps/frontend` + `apps/api`); cross-app feature governed by root constitution

**Performance Goals**:
- Registration page LCP ≤ 2.5 s on mid-tier mobile / 4G (production build); CLS ≤ 0.1; INP ≤ 200 ms
- Dashboard pages: server-rendered per request (session-scoped); TTFB dominated by two API reads (`/auth/me`, page data), each budgeted ≤ 200 ms p95 locally
- Initial route JS ≤ 200 KB gzipped on every new/changed route; no new runtime dependency > 20 KB (target: zero new runtime deps)

**Constraints**:
- All dashboard routes are dynamically rendered — per-owner session data; documented here per frontend constitution IV (static rendering not possible for authenticated content)
- Dashboard subtree MUST render light-token values even when `<html>` carries `.dark` (spec FR-011) without breaking light/dark support elsewhere
- Localization: every new user-facing string in `cs`, `en`, `de` in the same change
- API error shape unchanged (`{ error: { code, message, details? } }`); new validation reuses existing codes

**Scale/Scope**: Single-owner accounts, ≤ 3 phone numbers, 1 profile per account; ~6 new/changed routes, ~10 new components, 1 migration, 3 endpoint changes

## Constitution Check

*GATE: evaluated against root constitution v1.0.0, frontend constitution v1.0.0, API constitution v1.0.0. Re-checked post-design (Phase 1) — still passing.*

### Root constitution

| Principle | Status | Notes |
|---|---|---|
| I. Code Quality | PASS | Strict TS both apps; reuse-first (existing `field`, `input`, `tabs`, `sheet`, `Empty`, `ConfirmDialog`, form-state plumbing); sidebar added via shadcn CLI, not hand-copied; lint + type-check gates listed in quickstart |
| II. Testing Standards | PASS | Contract covered on both sides (API e2e serves shapes; frontend `api-contract.test.ts` expects them, updated in same change set); unit + component + e2e layers planned per story |
| III. UX Consistency | PASS | All new strings via `next-intl` (new namespaces `Registration`, `Dashboard`, `Settings`, extended `Auth`/`Workspace`); tokens only; API errors keep single structured shape; WCAG 2.1 AA (labels, `aria-invalid`, focus, keyboard-operable sidebar/tabs) |
| IV. Performance | PASS | Budgets stated above; no unbounded queries (profile is 1:1 lookup); dashboard dynamic rendering justified |

### Frontend constitution

| Rule | Status | Notes |
|---|---|---|
| Navigation from `@/i18n/navigation` | PASS | All new links/redirects use it |
| Locale validation + `setRequestLocale` in every page/layout | PASS | Including new `workspace/layout.tsx`, `complete-profile`, settings routes |
| Design tokens only; no raw colors | PASS | Forced-light scope implemented by re-declaring token custom properties in theme CSS (see research R2), not by raw values in components |
| Light + dark support per component | PASS (scoped) | Every new component remains token-driven and renders correctly under both appearances (verified in Storybook). The dashboard *pages* pin their subtree to light tokens — a product requirement (spec FR-011), applied at the layout scope, not in components. Public pages unaffected. |
| Server Components default; `"use client"` at leaves | PASS | Client leaves: phone-list field, registration form state, sidebar toggle, tabs nav highlight; pages/layouts stay server |
| shadcn CLI for primitives | PASS | `sidebar` primitive via CLI (research R3) |
| No new runtime dependency without justification | PASS | Zero new runtime deps planned |
| E2E in `cs` + one more locale | PASS | Planned in `cs` + `en` |

### API constitution

| Principle | Status | Notes |
|---|---|---|
| I. Simplicity First | PASS | One new table with a `text[]` phones column instead of a child table (research R1); profile write is a single upsert endpoint instead of separate create/update |
| II. Readability | PASS | Follows existing module layout (`auth/` owns account-scoped profile) |
| III. Reliability | PASS | Sign-up creates account + profile in one transaction; upsert is single-statement; accurate status codes reuse existing error filter |
| IV. Test What Matters | PASS | e2e against real Postgres for sign-up (extended), profile gate, upsert; migration runs cleanly from empty DB |
| V. Explicit Data Contracts | PASS | DTO validation at boundary; NOT NULL / CHECK / FK constraints in Postgres (data-model.md); versioned Drizzle migration |

**Gate result**: PASS — no violations to justify; Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-signup-dashboard-revamp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── http-api.md      # Phase 1 output — auth/profile contract delta
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts        # extend sign-up + me; add PUT /auth/profile
│   │   ├── auth.service.ts           # transactional sign-up with profile; profile read/upsert
│   │   └── dto/
│   │       ├── sign-up.dto.ts        # + restaurantName, phones[], location
│   │       └── profile.dto.ts        # NEW — shared profile field rules
│   ├── common/validators.ts          # + loose phone-number validator
│   └── db/
│       ├── schema.ts                 # + restaurant_profile table
│       └── migrations/               # + generated migration
└── test/
    ├── auth.e2e-spec.ts              # extended: full-profile sign-up, validation matrix
    └── profile.e2e-spec.ts           # NEW — me-with-profile, upsert, gate semantics

apps/frontend/
├── app/[locale]/
│   ├── sign-up/page.tsx              # renders RegistrationForm
│   ├── sign-in/page.tsx              # honors ?next= return destination
│   ├── complete-profile/page.tsx     # NEW — gate route for profile-less accounts
│   └── workspace/
│       ├── layout.tsx                # NEW — dashboard shell: header + sidebar + light scope + profile gate
│       ├── page.tsx                  # redirect → /workspace/menus (shell owns chrome)
│       ├── menus/
│       │   ├── page.tsx              # NEW home of the menus list (moved from workspace/page.tsx)
│       │   └── [menuId]/page.tsx     # existing editor, now inside shell
│       └── settings/
│           ├── layout.tsx            # NEW — settings tab nav
│           ├── page.tsx              # NEW — redirect → settings/profile
│           ├── profile/page.tsx      # NEW — profile edit tab
│           └── subscription/page.tsx # NEW — subscription placeholder tab
├── components/
│   ├── auth/
│   │   ├── AuthForm.tsx              # slimmed to sign-in only
│   │   ├── RegistrationForm.tsx      # NEW — full registration (client)
│   │   ├── ProfileFields.tsx         # NEW — restaurant name / phones / location group (shared with settings + completion)
│   │   └── PhoneListField.tsx        # NEW — add/remove phone inputs (client)
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx       # NEW
│   │   ├── DashboardSidebar.tsx      # NEW (composes ui/sidebar)
│   │   └── AppearanceScope.tsx       # NEW — forced-light wrapper (server, no JS)
│   ├── ui/sidebar.tsx                # NEW — via shadcn CLI
│   └── workspace/
│       ├── MenuCardList.tsx          # NEW — menu-like cards (replaces MenuList usage)
│       └── MenuList.tsx              # removed after replacement
├── lib/api/
│   ├── actions/auth.ts               # extended sign-up action; NEW profile action
│   ├── session.ts                    # requireAccount → account+profile; requireProfile gate
│   └── types.ts                      # + RestaurantProfile, extended AccountResponse
├── styles/themes/warm.css            # + [data-appearance="light"] selector (research R2)
├── messages/{cs,en,de}.json          # new keys
└── tests/
    ├── unit/api-contract.test.ts     # extended contract expectations
    ├── unit/…                        # phone normalization/validation helpers
    └── e2e/…                         # registration, gate, dashboard shell, settings, menus cards
```

**Structure Decision**: Existing two-app monorepo layout is kept; no new packages. The dashboard shell lives in the `workspace` route segment's new `layout.tsx` so every signed-in page inherits header, sidebar, forced-light scope, and the profile-completion gate from one place. The API keeps the profile inside the `auth` module (account-scoped 1:1 resource) rather than a new module.

## Complexity Tracking

> No constitution violations. The one addition worth recording:

| Addition | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `pg` + `@types/pg` as **dev**Dependencies of `apps/frontend` | The profile-completion gate (FR-005) only triggers for an account with credentials and no profile. Registration writes both in one transaction and no endpoint deletes a profile, so the e2e suite has to seed that state in the database — the same way `apps/api/test/database.ts` already does. | A test-only API endpoint would put a profile-deleting route in production code; reaching into `apps/api/node_modules` would couple the packages by path. Zero runtime bytes ship, and the e2e suite already requires a live Postgres. |

### Deviations from the design, found during implementation

- **Phone errors are reported per list, not per index.** class-validator's `each: true` attaches the failure to `phones`, with no per-index field path available. The contract now says so; the Server Action applies the same rule per entry (research R5 already put the rule on both sides) so the form still marks the one input at fault. `contracts/http-api.md` and `data-model.md` were updated to match.
- **`POST /auth/sign-in` also returns `profile`.** One shape across all three auth responses means one frontend type and one contract test, and it lets sign-in route a profile-less owner straight to completion instead of bouncing off the dashboard gate.
- **`proxy.ts`'s matcher was silently broken and had to be fixed.** In a JavaScript string `"\."` is `"."`, so the "has a file extension" exclusion read as "has any character at all" and the middleware ran on `/` alone. Harmless while its only job was the root locale redirect; fatal to the pathname header the gate needs. Fixed by escaping the backslash.
- **`sidebar_state` was added to the cookie inventory.** The shadcn sidebar remembers whether it is collapsed, and `lib/legal/cookies.ts` is this repo's single source of truth for anything stored on a visitor's device.
- **Dashboard pages render a `<div>`, not a `<main>`.** `SidebarInset` is already the page's `main` landmark; nesting a second one is invalid HTML.
