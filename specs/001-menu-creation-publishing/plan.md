# Implementation Plan: Base Menu Creation & Publishing

**Branch**: `feature/be-fe/mvp-menu-creation` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-menu-creation-publishing/spec.md`

## Summary

Restaurant owners sign up with email + password, create menus (sections containing items with name/description/price), and publish them; only after publishing is a menu publicly viewable at a stable address. This is the first cross-app feature: the NestJS API gains its database layer (PostgreSQL via Drizzle ORM, versioned migrations), session-cookie authentication, and menu CRUD + publish endpoints; the Next.js frontend gains sign-up/sign-in pages, an owner workspace with a menu editor (visual-variant switcher present but stubbed to the single default variant), and a public menu page that reuses the existing design-system menu components via a small display adapter. All frontend data access happens server-side (Server Components + Server Actions) against the API, forwarding the session cookie — no CORS, no client-held tokens.

## Technical Context

**Language/Version**: TypeScript 5 (frontend, strict) / TypeScript 6 (API, strict); Node.js ≥ 22

**Primary Dependencies**:
- API: NestJS 12 (Express platform, ESM), Drizzle ORM + `pg` (new), `drizzle-kit` migrations (new, dev), `@node-rs/argon2` password hashing (new), `class-validator` + `class-transformer` boundary validation (new), `cookie-parser` (new)
- Frontend: Next.js 16 App Router, React 19, Tailwind 4 + shadcn (base-nova), `next-intl` 4 (cs/en/de), `next-themes` — **no new runtime dependencies**

**Storage**: PostgreSQL (system of record per API constitution); local dev via Docker. Sessions stored in Postgres (no Redis — YAGNI).

**Testing**: API — Vitest unit + integration/e2e against a real Postgres instance (constitutionally required; DB mocks may not be the only persistence coverage). Frontend — Vitest unit + Storybook story tests (2 theme/locale passes with axe), Playwright e2e (default locale `cs` + one more). Cross-app contract asserted by tests on both sides against `contracts/http-api.md`.

**Target Platform**: Linux server (API + Postgres); frontend on Node server/edge-capable host; guests on mobile browsers over cellular.

**Project Type**: Web application — pnpm monorepo, `apps/api` (NestJS) + `apps/frontend` (Next.js)

**Performance Goals**: Public menu GET p95 ≤ 200 ms server-side; owner mutations p95 ≤ 300 ms; public menu page LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1 on mid-tier mobile over 4G (guest sees content within 3 s per SC-004); initial route JS ≤ 200 KB gzipped.

**Constraints**: Unpublish must take effect for new public requests immediately → the public menu page renders dynamically (documented reason below; no static caching of publish state). All owner routes require an authenticated session. No unbounded queries: menu lists are scoped to the owner and capped; item/section reads are bounded per menu with defensive limits.

**Scale/Scope**: MVP scale — hundreds of owner accounts, menus up to ~30 sections / ~500 items; 4 user stories, ~7 frontend routes, ~15 API endpoints, 5 database tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the root constitution v1.0.0, the frontend constitution v1.0.0, and the API constitution v1.0.0.

| # | Gate | Status | How this plan satisfies it |
|---|------|--------|----------------------------|
| 1 | Root I / FE I / API II — strict TS, lint + type-check zero errors, no `any` | PASS | Both apps already gate on `pnpm lint` + `tsc --noEmit` (FE) / `oxlint` + `nest build` (API); feature adds code under those gates, no rule disabling planned |
| 2 | Root I — reuse before creation | PASS | Public display reuses `components/menu/*` and `lib/design-system/` (Price, DishRow, CategoryHeading, MenuHeader…) through an adapter; editor UI composes existing `components/ui` shadcn primitives, added via shadcn CLI only |
| 3 | Root II / API IV — acceptance scenarios covered by automated tests; Postgres integration tests, not DB mocks alone | PASS | Test plan (quickstart.md) maps every acceptance scenario to a layer: API integration tests run against real Postgres; FE e2e covers sign-up→publish→public-view in `cs` + `en` |
| 4 | Root II — cross-app contract tested on both sides | PASS | `contracts/http-api.md` is the single contract; API e2e asserts served shapes, FE contract tests assert expected shapes; a contract change updates both in one change set |
| 5 | Root III / FE III — all user-visible text via next-intl (cs/en/de), design tokens only, light+dark, WCAG 2.1 AA | PASS | All new namespaces added to all three catalogs (CI-gated); editor & public page use token utilities only (`scripts/check-design-tokens.mjs` gate); API errors are structured codes that the FE maps to translated messages |
| 6 | Root III / API V — single structured machine-readable error shape | PASS | Global exception filter emits `{ error: { code, message, details? } }` on every non-2xx (defined in contract); FE renders errors from `code`, never from raw API message text |
| 7 | Root IV / FE IV — measurable performance targets stated and verified; static rendering wherever possible | PASS (documented dynamic exception) | Budgets in Technical Context; public menu page renders dynamically because publish/unpublish must be honored on the next request (spec US3) and content is owner-editable at any time — static rendering is impossible without stale-visibility violations; auth/workspace pages are inherently per-user dynamic. Landing/legal pages remain static |
| 8 | API I / FE V — simplicity, new dependencies justified | PASS | Each new API dependency justified in research.md (R1–R6); no new frontend runtime deps; no state library, no Redis, no JWT infrastructure, no shared-package layer for contracts (markdown contract + two-sided tests instead) |
| 9 | API Tech Constraints — Postgres only, single shared data-access layer, env-based config, migrations | PASS | One `db/` module exports the Drizzle client + schema; all queries go through it; `DATABASE_URL` etc. from environment; schema changes only via versioned drizzle-kit migrations; constraints (FK, NOT NULL, CHECK, UNIQUE) live in Postgres |
| 10 | FE Tech Constraints — i18n navigation imports, locale validation, `pnpm` only, shadcn via CLI | PASS | New routes under `app/[locale]/` follow `hasLocale` + `setRequestLocale` pattern; navigation from `@/i18n/navigation`; primitives via `pnpm dlx shadcn@latest add` |
| 11 | Root/Workflow — cross-app change lands as one reviewable unit | PASS | Single feature branch `feature/be-fe/mvp-menu-creation` carries API + FE + contract together |

**Post-design re-check (after Phase 1)**: PASS — data-model.md enforces every invariant in Postgres (unique lowered email, FK cascades, CHECK on price ≥ 0 and status enum); contract defines the uniform error shape and bounded responses; no design artifact introduced a new dependency or violation beyond those justified above.

## Project Structure

### Documentation (this feature)

```text
specs/001-menu-creation-publishing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── http-api.md      # Phase 1 output — the cross-app contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── main.ts                    # bootstrap: cookie-parser, global pipes/filter (edit)
│   ├── app.module.ts              # wires modules (edit)
│   ├── config/
│   │   └── env.ts                 # typed env access (DATABASE_URL, PORT, …)
│   ├── db/                        # THE single data-access layer
│   │   ├── schema.ts              # Drizzle tables: owner_account, session, menu, menu_section, menu_item
│   │   ├── client.ts              # pg Pool + Drizzle instance (DI provider)
│   │   └── migrations/            # drizzle-kit generated, versioned, committed
│   ├── common/
│   │   ├── http-error.filter.ts   # global filter → { error: { code, message, details? } }
│   │   └── session.guard.ts       # reads session cookie → attaches account, else 401
│   ├── auth/
│   │   ├── auth.module.ts / auth.controller.ts / auth.service.ts
│   │   └── dto/                   # sign-up / sign-in DTOs (class-validator)
│   └── menus/
│       ├── menus.module.ts
│       ├── menus.controller.ts    # owner CRUD + publish/unpublish (guarded)
│       ├── public-menus.controller.ts  # GET /public/menus/:slug (unguarded)
│       ├── menus.service.ts
│       └── dto/
├── test/                          # integration/e2e against real Postgres
└── drizzle.config.ts

apps/frontend/
├── app/[locale]/
│   ├── sign-up/page.tsx           # US1
│   ├── sign-in/page.tsx           # US1
│   ├── workspace/
│   │   ├── page.tsx               # menu list + create (US2)
│   │   └── menus/[menuId]/page.tsx  # editor: sections, items, variant stub, publish (US2/US3)
│   └── m/[slug]/page.tsx          # public menu display (US4), dynamic rendering
├── components/
│   ├── auth/                      # sign-up/sign-in forms (new)
│   ├── workspace/                 # menu list, section/item editors, variant switcher stub, publish controls (new)
│   └── menu/                      # existing display components (REUSED, not modified)
├── lib/
│   ├── api/
│   │   ├── client.ts              # server-only fetch wrapper: API_URL + cookie forwarding
│   │   ├── types.ts               # contract types mirroring contracts/http-api.md
│   │   └── actions/               # Server Actions: auth, menus, sections, items, publish
│   └── menu-display/
│       └── adapter.ts             # API public menu shape → lib/design-system/types.ts Menu
├── messages/{cs,en,de}.json       # new namespaces (edit)
└── tests/                         # unit + e2e additions
```

**Structure Decision**: Existing two-app pnpm monorepo is kept as-is. The API gains `config/`, `db/`, `common/`, `auth/`, `menus/` modules inside the existing NestJS scaffold. The frontend adds routes under the existing `app/[locale]/` tree and new feature components under `components/auth` and `components/workspace`, while the public page reuses `components/menu` untouched via `lib/menu-display/adapter.ts`.

## Complexity Tracking

No constitution violations — table intentionally empty. The one exception-shaped item (dynamic rendering of the public menu page) is a documented, constitution-sanctioned decision (FE IV allows dynamic rendering with a documented reason), recorded in Constitution Check gate 7 and research.md R9.
