# Tasks: Base Menu Creation & Publishing

**Input**: Design documents from `/specs/001-menu-creation-publishing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, quickstart.md

**Tests**: INCLUDED — the root and app constitutions make acceptance-scenario tests, two-sided contract tests, and real-Postgres integration tests mandatory merge gates.

**Organization**: Tasks are grouped by user story so each story is an independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US4)
- Every task names exact file paths

## Path Conventions

Monorepo per plan.md: API work under `apps/api/`, frontend work under `apps/frontend/`. Frontend rules apply throughout: strict TS, text via next-intl (cs+en+de in the same change), design tokens only, navigation from `@/i18n/navigation`, shadcn primitives via CLI only, every new component gets a colocated `*.stories.tsx`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dev database, new dependencies, migration tooling

- [X] T001 Create `apps/api/docker-compose.yml` (Postgres 17, db/user/password `restaura`, port 5432, named volume) and `apps/api/.env.example` (`DATABASE_URL`, `PORT=3001`, `COOKIE_SECURE=false`); confirm `.env` is gitignored
- [X] T002 Add API dependencies per research.md R1–R6: `pnpm --filter api add drizzle-orm pg @node-rs/argon2 class-validator class-transformer cookie-parser` and `pnpm --filter api add -D drizzle-kit @types/pg @types/cookie-parser` (updates `apps/api/package.json`, `pnpm-lock.yaml`)
- [X] T003 Create `apps/api/drizzle.config.ts` (schema `src/db/schema.ts`, out `src/db/migrations`, dialect postgresql, url from `DATABASE_URL`) and add `db:generate` / `db:migrate` scripts to `apps/api/package.json`
- [X] T004 [P] Create typed env access in `apps/api/src/config/env.ts` — reads and validates `DATABASE_URL`, `PORT`, `COOKIE_SECURE` at bootstrap, fails fast with a clear message on missing vars (no @nestjs/config; research R6 simplicity)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, error/validation infrastructure, test harness, frontend API client — everything every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Define the full Drizzle schema in `apps/api/src/db/schema.ts` — tables `owner_account`, `session`, `menu`, `menu_section`, `menu_item` exactly per data-model.md: all NOT NULL / FK ON DELETE CASCADE / CHECK / UNIQUE constraints (incl. `lower(email)` unique index and partial unique on `public_slug`), defaults, and the listed indexes
- [X] T006 Generate the initial migration with `pnpm --filter api db:generate` into `apps/api/src/db/migrations/`, verify the SQL matches data-model.md, and apply it cleanly to an empty database with `pnpm --filter api db:migrate`
- [X] T007 Create the single data-access layer: `apps/api/src/db/client.ts` (pg Pool + Drizzle instance as an injectable provider with graceful shutdown) and `apps/api/src/db/db.module.ts` exporting it (API constitution: all queries go through this module)
- [X] T008 [P] Create global exception filter `apps/api/src/common/http-error.filter.ts` emitting the contract error shape `{ error: { code, message, details? } }` for every non-2xx, mapping ValidationPipe errors to `VALIDATION_FAILED` with per-field `details` and unexpected errors to `INTERNAL` without leaking internals
- [X] T009 Rewire the app skeleton: update `apps/api/src/main.ts` (cookie-parser middleware, global `ValidationPipe` with `whitelist/forbidNonWhitelisted/transform`, global exception filter, port from env) and `apps/api/src/app.module.ts` (import DbModule); delete scaffold dead code `apps/api/src/app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`
- [X] T010 [P] Build the integration-test harness: `apps/api/test/setup.ts` (connect via `DATABASE_URL`, run all migrations from empty, truncate all tables between suites) and `apps/api/test/app.factory.ts` (boot the Nest app with real Postgres for supertest); adjust `apps/api/vitest.config.e2e.ts` to use it
- [X] T011 [P] Create the frontend contract layer: `apps/frontend/lib/api/types.ts` (request/response/error types mirroring contracts/http-api.md) and server-only `apps/frontend/lib/api/client.ts` (fetch wrapper over `API_URL`, forwards incoming `restaura_session` cookie via `cookies()`, parses the uniform error shape, exposes Set-Cookie relay helper per research R4); add `API_URL` to `apps/frontend/.env.local` guidance

**Checkpoint**: Foundation ready — user story phases can begin

---

## Phase 3: User Story 1 - Restaurant Owner Sign-Up & Sign-In (Priority: P1) 🎯 MVP

**Goal**: Owners can create an account, sign in/out, and land in a private, persistent (empty) workspace

**Independent Test**: Register a new account, sign out, sign back in — the account persists and gates the workspace (quickstart US1 walkthrough)

### Implementation for User Story 1

- [X] T012 [US1] Implement `apps/api/src/auth/auth.service.ts` — sign-up (Argon2id hash, insert account, handle case-insensitive duplicate as `EMAIL_TAKEN`), sign-in (verify hash, generic `INVALID_CREDENTIALS`), session lifecycle per research R2 (256-bit token, SHA-256 hash stored, 30-day expiry, delete on sign-out), all via the DbModule client
- [X] T013 [US1] Implement session guard `apps/api/src/common/session.guard.ts` — reads `restaura_session` cookie, resolves unexpired session → attaches account to the request, else 401 `UNAUTHENTICATED`
- [X] T014 [US1] Implement `apps/api/src/auth/auth.controller.ts` with DTOs `apps/api/src/auth/dto/sign-up.dto.ts`, `dto/sign-in.dto.ts` (email format ≤254, password 8–128) and `apps/api/src/auth/auth.module.ts`; endpoints POST /auth/sign-up (201 + Set-Cookie), POST /auth/sign-in, POST /auth/sign-out (idempotent 204, clears cookie), GET /auth/me — exactly per contract; wire module into `apps/api/src/app.module.ts`
- [X] T015 [P] [US1] API integration tests `apps/api/test/auth.e2e.spec.ts` against real Postgres: every US1 acceptance scenario + contract obligations (201+cookie, 409 case-insensitive, 401 identical for unknown email vs wrong password, sign-out idempotency, /me with and without session, error shape)
- [X] T016 [P] [US1] Add `Auth` and `Workspace` message namespaces (form labels, validation messages keyed by contract `details[].code`, error codes `EMAIL_TAKEN`/`INVALID_CREDENTIALS`/`UNAUTHENTICATED`, empty-workspace state, sign-out) to `apps/frontend/messages/cs.json`, `en.json`, `de.json`
- [X] T017 [US1] Implement Server Actions `apps/frontend/lib/api/actions/auth.ts` — `signUp`, `signIn` (relay API Set-Cookie onto the Next response via `cookies().set()`, redirect to workspace), `signOut` (clear cookie, redirect), plus a `requireAccount()` helper calling GET /auth/me for route gating
- [X] T018 [US1] Build `apps/frontend/components/auth/SignUpForm.tsx` and `SignInForm.tsx` (client leaves using native form + Server Actions, shadcn primitives, translated inline errors from error codes, loading/disabled states) with colocated `SignUpForm.stories.tsx`, `SignInForm.stories.tsx`
- [X] T019 [US1] Create pages `apps/frontend/app/[locale]/sign-up/page.tsx` and `apps/frontend/app/[locale]/sign-in/page.tsx` — `hasLocale` + `setRequestLocale`, metadata via `getTranslations`, redirect already-authenticated visitors to the workspace
- [X] T020 [US1] Create workspace shell `apps/frontend/app/[locale]/workspace/page.tsx` — gated by `requireAccount()` (redirect to sign-in when unauthenticated), renders translated empty state and a sign-out control; dynamic rendering (per-user)
- [X] T021 [US1] Frontend e2e `apps/frontend/tests/e2e/auth.spec.ts` (Playwright, `cs` + `en`): sign-up → lands in workspace; duplicate email guidance; wrong-password generic error; sign-out locks the workspace

**Checkpoint**: US1 fully functional — accounts, sessions, gated empty workspace

---

## Phase 4: User Story 2 - Menu Creation & Filling (Priority: P2)

**Goal**: Owners create menus, fill sections and items (name/description/price), see the stubbed variant switcher; everything persists across sessions

**Independent Test**: Create a menu, add sections/items, sign out and back in — all content intact; invalid input rejected inline (quickstart US2 walkthrough)

### Implementation for User Story 2

- [X] T022 [US2] Implement `apps/api/src/menus/menus.service.ts` (owner-scoped, via DbModule): menu create/list(cap 100, updatedAt desc)/detail(bounded reads, ordered by position,id)/rename/variant-update/delete; section add/rename/reorder/delete; item add/edit/reorder/delete — reorders renumber siblings in one transaction (research R8), every content change touches `menu.updated_at`, all lookups scoped by `account_id` so foreign/missing → `NOT_FOUND`
- [X] T023 [US2] Implement `apps/api/src/menus/menus.controller.ts` (guarded by session guard) with DTOs in `apps/api/src/menus/dto/` (create-menu, update-menu with `visualVariant` allowlist `["default"]`, create/update-section, create/update-item with `priceCzk` integer ≥ 0) and `apps/api/src/menus/menus.module.ts`; all owner endpoints exactly per contract (paths, status codes, payloads); wire into `apps/api/src/app.module.ts`
- [X] T024 [P] [US2] API integration tests `apps/api/test/menus.e2e.spec.ts`: full CRUD happy paths, validation failures (empty name, negative/non-integer price, unknown variant), ownership isolation (owner B gets 404 on owner A's menu), reorder renumbering, cascade delete, persistence across requests, 401 without session
- [X] T025 [P] [US2] Add `MenuList` and `MenuEditor` message namespaces (create/rename/delete + confirmations, section/item forms, validation messages, draft/published badges, variant switcher incl. "coming soon") to `apps/frontend/messages/cs.json`, `en.json`, `de.json`
- [X] T026 [US2] Implement Server Actions `apps/frontend/lib/api/actions/menus.ts` (create/rename/delete/list/detail), `sections.ts` (add/rename/reorder/delete), `items.ts` (add/edit/reorder/delete) — each calls the API client, maps `VALIDATION_FAILED` details to field errors, and `revalidatePath`s the editor
- [X] T027 [US2] Build menu-list UI `apps/frontend/components/workspace/MenuList.tsx` and `CreateMenuForm.tsx` (+ colocated stories) — name, status badge, link to editor, delete with confirm dialog; wire into `apps/frontend/app/[locale]/workspace/page.tsx` replacing the US1 empty state (empty state remains for zero menus)
- [X] T028 [US2] Create editor page `apps/frontend/app/[locale]/workspace/menus/[menuId]/page.tsx` — auth-gated, fetches menu detail server-side, 404 → `notFound()`, composes section/item editors and variant switcher
- [X] T029 [P] [US2] Build `apps/frontend/components/workspace/SectionEditor.tsx` and `ItemEditor.tsx` (+ colocated stories) — add/rename/delete sections (delete-with-items confirm), add/edit/delete items with inline validation (required name, non-negative whole-CZK price), reorder controls (move up/down), save-failure state that preserves entered values
- [X] T030 [P] [US2] Build variant switcher stub `apps/frontend/components/workspace/VariantSwitcher.tsx` (+ story) — default variant selected, 2–3 disabled "coming soon" tiles, fully translated and accessible (radiogroup semantics, disabled state per FR-010)
- [X] T031 [P] [US2] Frontend contract unit tests `apps/frontend/tests/unit/api-contract.test.ts` — assert `lib/api/types.ts` shapes match contracts/http-api.md fixtures for every consumed endpoint and that action error-mapping covers every rendered `details[].code` (frontend side of root constitution II)
- [X] T032 [US2] Frontend e2e `apps/frontend/tests/e2e/menu-editor.spec.ts` (`cs` + `en`): create menu → add 2 sections + items → reload/sign out/sign in → content intact; invalid item rejected inline; variant switcher visible and locked to default

**Checkpoint**: US1 + US2 work — owners build persistent menus end to end

---

## Phase 5: User Story 3 - Menu Publishing (Priority: P3)

**Goal**: Publish gates visibility: draft menus are invisible publicly; Publish exposes a stable public address; Unpublish revokes it on the next request

**Independent Test**: Verify public address 404s while draft, publishes to 200, unpublishes back to 404, republish reuses the same slug (quickstart US3 walkthrough)

### Implementation for User Story 3

- [X] T033 [US3] Add publish/unpublish to `apps/api/src/menus/menus.service.ts` plus slug generator `apps/api/src/menus/slug.ts` (slugified menu name + 6-char `node:crypto` suffix, retry on unique collision; generated on first publish only, retained forever per research R5); both operations idempotent
- [X] T034 [US3] Add POST `/menus/:menuId/publish` and `/menus/:menuId/unpublish` to `apps/api/src/menus/menus.controller.ts` (responses incl. `publicPath` per contract) and create public controller `apps/api/src/menus/public-menus.controller.ts` — unguarded GET `/public/menus/:slug` serving display-only fields for `status='published'`, identical 404 for draft/unknown; register in `apps/api/src/menus/menus.module.ts`
- [X] T035 [P] [US3] API integration tests `apps/api/test/publish.e2e.spec.ts`: draft slug → 404; publish assigns slug once and returns publicPath; public GET 200 with display-only payload (no ids/account/timestamps); saved edit visible on next public GET; unpublish → immediate 404; republish → same slug; publish idempotency; owner B cannot publish owner A's menu; empty menu publishes successfully
- [X] T036 [US3] Build `apps/frontend/components/workspace/PublishControls.tsx` (+ colocated story) with Server Action `apps/frontend/lib/api/actions/publish.ts` — Publish/Unpublish buttons, status badge, shareable locale-prefixed absolute address with copy control after publish (FR-017); add `Publish` namespace keys to `apps/frontend/messages/cs.json`, `en.json`, `de.json`
- [X] T037 [US3] Wire PublishControls into `apps/frontend/app/[locale]/workspace/menus/[menuId]/page.tsx` and surface the public address + published status in `apps/frontend/components/workspace/MenuList.tsx`
- [X] T038 [US3] Frontend e2e `apps/frontend/tests/e2e/publish.spec.ts`: publish flow shows shareable address; public URL serves content in a fresh unauthenticated context; unpublish → friendly not-available; republish keeps the address

**Checkpoint**: Publish gate complete — visibility is owner-controlled

---

## Phase 6: User Story 4 - Public Menu Display (Priority: P4)

**Goal**: Guests open the public address with no account and see the menu rendered by the existing design-system components, mobile-first, in the default variant

**Independent Test**: Open a published menu in a fresh session at ≤ 375 px viewport — full content, no sign-in, no horizontal scroll; unknown/draft slug shows a friendly not-available page (quickstart US4 walkthrough)

### Implementation for User Story 4

- [X] T039 [P] [US4] Implement display adapter `apps/frontend/lib/menu-display/adapter.ts` mapping the public payload onto `lib/design-system/types.ts` `Menu` (mapping table in data-model.md: sections → categories with slug-anchor ids, `priceCzk` → `{ kind: "single", amount: { amount, currency: "CZK" } }`) with unit tests `apps/frontend/tests/unit/menu-display-adapter.test.ts` (incl. empty menu/sections, null descriptions)
- [X] T040 [P] [US4] Add `PublicMenu` message namespace (not-available page title/body, page metadata) to `apps/frontend/messages/cs.json`, `en.json`, `de.json`
- [X] T041 [US4] Create public page `apps/frontend/app/[locale]/m/[slug]/page.tsx` — `hasLocale` + `setRequestLocale`, dynamic rendering with `cache: "no-store"` (documented reason: research R9), fetches GET /public/menus/:slug, renders via the adapter through existing `components/menu/*` (MenuHeader, CategoryHeading, DishRow/PriceList — reuse, do not modify), friendly translated not-available state on 404 (US4/AS3), `generateMetadata` with menu name
- [X] T042 [US4] Frontend e2e `apps/frontend/tests/e2e/public-menu.spec.ts` (`cs` + `en`): unauthenticated mobile viewport (375px) shows name, ordered sections, items with name/description/price, no sign-in prompt, no horizontal scroll; light and dark appearance both render; unpublished/unknown slug → not-available page

**Checkpoint**: All four user stories independently functional — full owner-to-guest journey works

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance verification, documentation, final constitution gates

- [~] T043 [P] PARTIAL — measured and recorded in quickstart.md: `GET /public/menus/:slug`
  p95 = 7.2 ms (budget 200 ms ✅) and guest-page JS = 247.4 KB gzipped, which is at parity
  with the pre-existing `/cs/sample-menu` (246.6 KB) and so is not a regression from this
  feature, but does exceed the 200 KB budget repo-wide. **Still outstanding**: a Lighthouse
  run on a mid-tier mobile 4G profile for LCP/INP/CLS (SC-004), which needs a deployed build.
  Original task: Verify performance budgets on production builds: Lighthouse (mid-tier mobile, 4G throttle) on the public menu page — LCP ≤ 2.5 s / CLS ≤ 0.1 / initial route JS ≤ 200 KB gzipped (SC-004); check public GET p95 ≤ 200 ms locally; record results in `specs/001-menu-creation-publishing/quickstart.md` checklist
- [X] T044 [P] Update agent/dev docs: add auth + workspace + public-menu + `lib/api` conventions to `apps/frontend/AGENTS.md`; document API setup (compose, env, migrations, test harness) in `apps/api/README.md`
- [X] T045 Run the full quickstart.md validation: manual US1–US4 walkthroughs plus all merge gates (`pnpm --filter api lint|build|test|test:e2e`, `pnpm --filter frontend lint|typecheck|test:unit|test:stories|test:e2e`) and tick the expected-outcomes checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T004 parallel with T003 after T002
- **Foundational (Phase 2)**: Depends on Phase 1. Chain: T005 → T006 → T007 → T009; T008, T010, T011 parallel to the chain (T010 needs T006 to exist to run migrations). **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Phase 2
- **Polish (Phase 7)**: Depends on all four stories

### User Story Dependencies

- **US1 (P1)**: Only Phase 2. Independent
- **US2 (P2)**: Requires US1's session guard (T013) and workspace shell (T020) — the API side (T022–T024) only needs T013
- **US3 (P3)**: Requires US2's menus service/controller (T022–T023) and editor page (T028)
- **US4 (P4)**: Requires US3's public endpoint (T034). The adapter (T039) and messages (T040) can start right after Phase 2

### Within Each User Story

- API service → controller → API tests; messages + actions → components → pages → e2e
- Contract tests (T015/T024/T031/T035) prove both sides of contracts/http-api.md — a contract change updates both in the same change set

### Parallel Opportunities

- Phase 2: T008, T010, T011 alongside the T005→T007 chain
- Within each story, API work and frontend work parallelize after the contract is fixed: e.g. T015+T016 together; T024+T025 together; T029+T030+T031 together; T039+T040 together
- After Phase 2, an API-focused track (T012–T015 → T022–T024 → T033–T035) and a frontend track (T016–T021 → T025–T032 → T036–T038) can run concurrently per story, meeting at each story's e2e task

## Parallel Example: User Story 2

```bash
# After T023 (contract served), run concurrently:
Task: "API integration tests in apps/api/test/menus.e2e.spec.ts"          # T024
Task: "MenuList/MenuEditor messages in apps/frontend/messages/*.json"      # T025

# After T028, run concurrently:
Task: "SectionEditor + ItemEditor in apps/frontend/components/workspace/"  # T029
Task: "VariantSwitcher stub in apps/frontend/components/workspace/"        # T030
Task: "Contract unit tests in apps/frontend/tests/unit/api-contract.test.ts"  # T031
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup → Phase 2: Foundational (critical — unblocks everything)
2. Phase 3: US1 → validate independently (quickstart US1): accounts + gated workspace is the smallest demonstrable slice
3. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → demo (MVP: sign-up and a private workspace)
3. US2 → test → demo (persistent menu building)
4. US3 → test → demo (publish gate live)
5. US4 → test → demo (guest-facing payoff)
6. Polish → all constitution gates green

Each story lands without breaking the previous ones; every checkpoint is a valid stopping point.

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Cross-app work stays on this one branch (`feature/be-fe/mvp-menu-creation`) so the contract never breaks on `main` (root constitution)
- Commit after each task or logical group (`<type>: <summary>` convention)
- New UI strings always land in `cs`, `en`, `de` in the same task — `scripts/check-messages.mjs` gates the build
- No literal colors/spacing in new components — `scripts/check-design-tokens.mjs` gates the build
