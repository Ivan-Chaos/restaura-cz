# Tasks: Sign-Up Expansion & Dashboard Revamp

**Input**: Design documents from `/specs/002-signup-dashboard-revamp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, quickstart.md

**Tests**: INCLUDED — the root constitution (II) requires automated tests for every acceptance scenario, on both sides of the cross-app contract, in the same change set.

**Organization**: Tasks are grouped by user story. Stories are sequenced P1 → P4; US2–US4 build on the shell/gate files US1/US2 create, but each phase ends independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 (registration & gate), US2 (dashboard shell), US3 (menu cards), US4 (settings tabs)

## Path Conventions

Monorepo per plan.md: API work under `apps/api/`, frontend work under `apps/frontend/`.

---

## Phase 1: Setup

**Purpose**: Verify the baseline is green before touching it; establish the work branch.

- [X] T001 Create branch `feature/be-fe/signup-dashboard-revamp` from current work; verify baseline gates pass in both apps (`pnpm lint` + `pnpm exec tsc --noEmit` in `apps/api` and `apps/frontend`) so later failures are attributable to this feature
- [X] T002 Start Postgres (`docker-compose up -d` in `apps/api`) and confirm existing migrations run cleanly from the current state (`pnpm db:migrate` in `apps/api`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data layer, validation primitives, and cross-app contract types every story reads. No story work can begin until this phase is complete.

**⚠️ CRITICAL**: T003–T004 (schema/migration) block all API tasks; T006–T008 (types/helpers) block all frontend tasks.

- [X] T003 Add `restaurant_profile` table to `apps/api/src/db/schema.ts` per data-model.md: `account_id` uuid PK + FK → `owner_account.id` ON DELETE CASCADE; `restaurant_name` text NOT NULL CHECK 1–120; `phones` text[] NOT NULL CHECK cardinality 1–3; `location` text NOT NULL CHECK 1–200; `created_at`/`updated_at` timestamptz NOT NULL DEFAULT now(); export `RestaurantProfileRow` type
- [X] T004 Generate the Drizzle migration (`pnpm db:generate` in `apps/api`), inspect the SQL for the constraints above, and verify it applies cleanly from an empty database (`pnpm db:migrate` against a fresh volume)
- [X] T005 [P] Add loose phone validator to `apps/api/src/common/validators.ts` (custom class-validator decorator `IsPhone`, emitted field-error code `IS_PHONE`): trimmed value matches `^\+?[0-9 ()-]{5,24}$` AND contains 6–15 digits (research R5); cover accept/reject matrix in `apps/api/src/common/validators.spec.ts` (or the existing unit-test location for `common/`)
- [X] T006 [P] Extend `apps/frontend/lib/api/types.ts` per data-model.md: add `RestaurantProfile`, `ProfileResponse`; change `AccountResponse` to `{ account, profile: RestaurantProfile | null }`; add `"IS_PHONE"` and `"ARRAY_SIZE"` to `FieldErrorCode`
- [X] T007 [P] Create `apps/frontend/lib/api/phone.ts`: `normalizePhone` (trim, collapse internal whitespace) and `isValidPhone` mirroring the API rule; unit tests in `apps/frontend/tests/unit/phone.test.ts` with the same accept/reject matrix as T005
- [X] T008 Update the cross-app contract expectations in `apps/frontend/tests/unit/api-contract.test.ts` to `specs/002-signup-dashboard-revamp/contracts/http-api.md`: extended sign-up request/response, `me` with nullable `profile`, `PUT /auth/profile` shapes, new field-error codes (depends on T006)
- [X] T009 Create `apps/api/src/auth/dto/profile.dto.ts`: `ProfileDto` with `restaurantName` (string, trimmed, 1–120), `phones` (array 1–3, each `@IsPhone`), `location` (string, trimmed, 1–200) — the single source of profile field rules reused by sign-up and profile upsert (depends on T005)

**Checkpoint**: Schema migrated, validators tested, contract types agreed on both sides — story phases can begin.

---

## Phase 3: User Story 1 — Full Registration with Restaurant Profile (Priority: P1) 🎯 MVP

**Goal**: Registration collects the full restaurant profile; the dashboard is unreachable without one; profile-less legacy accounts are routed to a completion step; sign-in/gate honors a `?next=` return destination.

**Independent Test**: Quickstart scenarios 1–2 — register via the expanded form (validation matrix included), land in the workspace, profile survives sign-out/sign-in; a DB-seeded profile-less account is forced through `/complete-profile` and returned to its intended destination.

### Tests for User Story 1 (write first, watch them fail)

- [X] T010 [P] [US1] Extend `apps/api/test/auth.e2e-spec.ts`: sign-up with full profile → 201 `{ account, profile }` + cookie; profile row exists; legacy two-field body → 400 VALIDATION_FAILED; per-field validation matrix (`restaurantName`, `phones` — empty array, 4 entries, bad format `phones.1`, `location`) with codes `IS_PHONE`/`ARRAY_SIZE`; duplicate email → 409 and **no orphan profile row** (transactionality)
- [X] T011 [P] [US1] Create `apps/api/test/profile.e2e-spec.ts`: `GET /auth/me` → `profile: null` for a directly-inserted profile-less account and full profile after sign-up; `PUT /auth/profile` unauthenticated → 401; insert path (profile-less account) → 200 `{ profile }`; update path → 200 with replaced values and bumped `updated_at`; invalid body → 400 and stored row untouched
- [X] T012 [P] [US1] Frontend e2e `apps/frontend/tests/e2e/registration.spec.ts` (locales `cs` + `en`): happy path lands on workspace; password mismatch inline error; per-field errors block submit; phone add/remove (min 1 kept); duplicate email message links to sign-in
- [X] T013 [P] [US1] Frontend e2e `apps/frontend/tests/e2e/profile-gate.spec.ts`: signed-out deep link to a workspace URL → sign-in → returned to it after auth; profile-less session deep-linking to workspace → `/complete-profile` → completing form → arrives at original destination; malicious `next` (absolute URL) is ignored

### API implementation for User Story 1

- [X] T014 [US1] Extend `apps/api/src/auth/dto/sign-up.dto.ts` to embed the profile fields from `ProfileDto` (composition or mapped-type, whichever reads cleaner under the API constitution II)
- [X] T015 [US1] Extend `apps/api/src/auth/auth.service.ts`: `signUp` creates `owner_account` + `restaurant_profile` in **one transaction** and returns both; add `getProfile(accountId)` and `upsertProfile(accountId, profile)` (single-statement `INSERT … ON CONFLICT (account_id) DO UPDATE`, setting `updated_at`)
- [X] T016 [US1] Extend `apps/api/src/auth/auth.controller.ts`: sign-up returns `{ account, profile }`; `GET /auth/me` returns `{ account, profile: … | null }`; add `PUT /auth/profile` (SessionGuard) → `{ profile }` per contracts/http-api.md; run T010–T011 until green

### Frontend implementation for User Story 1

- [X] T017 [P] [US1] Create `apps/frontend/components/auth/PhoneListField.tsx` (client): 1–3 phone inputs, add/remove controls (remove hidden at one entry), `name="phones"` repeated entries so the Server Action reads `formData.getAll("phones")`, per-entry error slots, full label/`aria-invalid` wiring; Storybook story `PhoneListField.stories.tsx`
- [X] T018 [P] [US1] Create `apps/frontend/components/auth/ProfileFields.tsx`: restaurant name, `PhoneListField`, location — the field group shared by registration, completion, and settings, taking a `fields` error map and optional default values; story in `ProfileFields.stories.tsx`
- [X] T019 [US1] Create `apps/frontend/components/auth/RegistrationForm.tsx` (client, `useActionState`, `noValidate`): email, password, confirm password (inline mismatch on blur/submit), `ProfileFields`, summary error slot, pending state, sign-in link; story in `RegistrationForm.stories.tsx` (depends on T017–T018)
- [X] T020 [US1] Extend `apps/frontend/lib/api/actions/auth.ts`: `signUpAction` reads all fields, validates confirm-password match server-side (field error, API never sees it — research R4) and phone shape via `lib/api/phone.ts`, posts the extended body, honors validated path-only `next`; add `upsertProfileAction` calling `PUT /auth/profile`; extend `signInAction` to redirect to validated `next` (default `/workspace`)
- [X] T021 [US1] Rework `apps/frontend/lib/api/session.ts`: `getSession(): Promise<{ account, profile } | null>` from `me`; `requireAccount(locale, next?)` redirects to `/sign-in?next=…`; new `requireProfile(locale, next?)` additionally redirecting profile-less sessions to `/complete-profile?next=…`; shared path-only sanitizer for `next`
- [X] T022 [US1] Create bare gate layout `apps/frontend/app/[locale]/workspace/layout.tsx`: locale validation + `setRequestLocale`, `requireProfile` for the whole segment (no chrome yet — US2 adds it); remove now-redundant `requireAccount` calls from `workspace/page.tsx` and `workspace/menus/[menuId]/page.tsx` where the layout covers them (keep their `getSession` data needs)
- [X] T023 [US1] Create `apps/frontend/app/[locale]/complete-profile/page.tsx`: requires session but no profile (redirects appropriately in both wrong states), renders a completion form composed of `ProfileFields` + `upsertProfileAction`, forwards to sanitized `next` (default `/workspace`) on success
- [X] T024 [US1] Update `apps/frontend/app/[locale]/sign-up/page.tsx` to render `RegistrationForm`; slim `apps/frontend/components/auth/AuthForm.tsx` to sign-in only (rename mode-specific copy, drop sign-up branches) and update `sign-in/page.tsx` to pass through `?next=`; update `AuthForm.stories.tsx`
- [X] T025 [US1] Add all US1 message keys to `apps/frontend/messages/cs.json`, `en.json`, `de.json` in the same change: `Registration` namespace (labels, hints, add/remove phone, mismatch, completion page copy), `Auth.fieldErrors.IS_PHONE`/`ARRAY_SIZE`, duplicate-email copy — no hard-coded strings anywhere in T017–T024
- [X] T026 [US1] Component tests for `RegistrationForm` + `PhoneListField` in `apps/frontend/tests/` (mirroring existing component-test location): mismatch error rendering, add/remove behavior and min-1 rule, `aria-invalid`/error association, all assertions on roles/text not classes; run T012–T013 until green

**Checkpoint**: MVP — new users register fully, incomplete accounts are gated, all US1 tests green. Deployable.

---

## Phase 4: User Story 2 — Reworked Dashboard Shell (Priority: P2)

**Goal**: Every signed-in page shares a header + sidebar shell in forced light tones; `/workspace` becomes a redirect to `/workspace/menus`; mobile-usable.

**Independent Test**: Quickstart scenario 3 — header/sidebar on every dashboard page, active nav state, dashboard light under OS dark while public pages still honor dark, signed-out deep link round-trips through sign-in, 360px viewport usable.

### Tests for User Story 2

- [X] T027 [P] [US2] Frontend e2e `apps/frontend/tests/e2e/dashboard-shell.spec.ts` (locales `cs` + `en`): header (identity, email, sign-out) and sidebar (Menus, Settings, active state) on `/workspace/menus` and the menu editor; with dark appearance forced, a dashboard surface's computed background equals the light token value while `/cs` landing goes dark; `/workspace` redirects to `/workspace/menus`; 360×740 viewport — sidebar collapses to trigger, no horizontal scroll

### Implementation for User Story 2

- [X] T028 [US2] Add the shadcn sidebar primitive via CLI (`pnpm dlx shadcn@latest add sidebar` in `apps/frontend`) → `components/ui/sidebar.tsx`; verify against installed base-nova/@base-ui setup and that no new runtime dependency lands (plan: zero)
- [X] T029 [P] [US2] Add `[data-appearance="light"]` to the light-token selector block in `apps/frontend/styles/themes/warm.css` plus `color-scheme: light` on that scope (research R2 — no value duplication, extend the existing `:root` selector list)
- [X] T030 [P] [US2] Create `apps/frontend/components/dashboard/AppearanceScope.tsx` (server, zero JS): wrapper rendering `data-appearance="light"`, modeled on `ThemeScope`; Storybook story demonstrating light-pinned subtree under `.dark`
- [X] T031 [P] [US2] Create `apps/frontend/components/dashboard/DashboardHeader.tsx` (server): product identity linking to `/workspace`, signed-in email, `SignOutButton` reuse, sidebar trigger slot for mobile; story in `DashboardHeader.stories.tsx`
- [X] T032 [US2] Create `apps/frontend/components/dashboard/DashboardSidebar.tsx`: composes `ui/sidebar`, nav entries Menus (`/workspace/menus`) and Settings (`/workspace/settings`) with `lucide-react` icons, active state via `usePathname` from `@/i18n/navigation` (client leaf as small as the primitive allows); story in `DashboardSidebar.stories.tsx` (depends on T028)
- [X] T033 [US2] Flesh out `apps/frontend/app/[locale]/workspace/layout.tsx`: wrap the segment in `AppearanceScope` + sidebar provider + `DashboardHeader` + `DashboardSidebar` around the content area (gate from T022 stays); move signed-in identity/sign-out out of `workspace/page.tsx`
- [X] T034 [US2] Move the menus list markup from `apps/frontend/app/[locale]/workspace/page.tsx` to new `apps/frontend/app/[locale]/workspace/menus/page.tsx` (metadata, create form, list — content unchanged this phase); replace `workspace/page.tsx` body with a locale-aware redirect to `/workspace/menus` (research R11)
- [X] T035 [US2] Add `Dashboard` namespace keys (nav labels, sidebar aria labels, skip-to-content) to `apps/frontend/messages/cs.json`, `en.json`, `de.json`; component tests for `DashboardSidebar` active-state and keyboard operability in `apps/frontend/tests/`; run T027 until green

**Checkpoint**: Signed-in experience has proper chrome in forced light; US1 tests still green.

---

## Phase 5: User Story 3 — Menus Presented Like Menus (Priority: P3)

**Goal**: The menus list becomes a card grid where each card evokes a physical menu (display font, paper surface, status badge) and click-through opens the editor; inviting empty state.

**Independent Test**: Quickstart scenario 4 — cards render name/status/public path, card click opens the editor, delete still confirms, empty state invites creation.

### Tests for User Story 3

- [X] T036 [P] [US3] Frontend e2e `apps/frontend/tests/e2e/menu-cards.spec.ts` (locales `cs` + `en`): seeded draft + published menus render as cards (accessible name = menu name, status badge text, `/m/<slug>` on published); activating a card navigates to `/workspace/menus/<id>`; delete flow still confirm-guarded; zero-menu account sees empty state whose CTA focuses/reaches the create form; creating a menu shows its card

### Implementation for User Story 3

- [X] T037 [US3] Create `apps/frontend/components/workspace/MenuCardList.tsx` with `MenuCard`: responsive grid; card = link overlay to `/workspace/menus/[menuId]` with separately focusable delete (`ConfirmDialog` reuse) — no nested interactive elements; display-font (`--font-display`) name, decorative rule, `card`/`surface-raised` tokens, status `Badge`, public path when published, updated-at line; `Empty` + create CTA for zero menus; all strings via `next-intl` (research R10)
- [X] T038 [US3] Storybook stories `apps/frontend/components/workspace/MenuCardList.stories.tsx`: draft/published/long-name/empty variants, verified in light and dark (component stays theme-capable even though the dashboard pins light)
- [X] T039 [US3] Replace `MenuList` usage in `apps/frontend/app/[locale]/workspace/menus/page.tsx` with `MenuCardList`; delete `apps/frontend/components/workspace/MenuList.tsx` and `MenuList.stories.tsx` (no dead code); extend `Workspace` messages in `cs/en/de` for any new card copy (updated-at label, open-menu aria)
- [X] T040 [US3] Component tests for `MenuCard`/`MenuCardList` in `apps/frontend/tests/` (name/status/link/delete-dialog/empty-state by role and text); run T036 until green

**Checkpoint**: Menus surface looks designed; navigation to editor intact; US1–US2 tests still green.

---

## Phase 6: User Story 4 — Settings Page with Tabs (Priority: P4)

**Goal**: `/workspace/settings` with URL-addressable tabs: editable profile (same rules as registration) and a read-only subscription placeholder.

**Independent Test**: Quickstart scenario 5 — settings redirect lands on the profile tab, tab switch changes URL, deep link works, profile edits persist across sessions, invalid edits blocked without overwriting.

### Tests for User Story 4

- [X] T041 [P] [US4] Frontend e2e `apps/frontend/tests/e2e/settings.spec.ts` (locales `cs` + `en`): `/workspace/settings` → `/workspace/settings/profile`; tab nav switches URL + active indication; deep link to `/workspace/settings/subscription` renders the placeholder; profile edit (rename + add phone) → success feedback → survives sign-out/sign-in; clearing restaurant name or removing all phones → field errors, stored values unchanged on reload

### Implementation for User Story 4

- [X] T042 [P] [US4] Create `apps/frontend/components/settings/SettingsTabs.tsx`: tab-styled link nav (visual language of `ui/tabs`, semantics of links) marking the active child route via `usePathname` from `@/i18n/navigation`; story in `SettingsTabs.stories.tsx`
- [X] T043 [P] [US4] Create `apps/frontend/components/settings/ProfileSettingsForm.tsx` (client, `useActionState`): `ProfileFields` prefilled from the session profile, save via `upsertProfileAction` (no redirect — success feedback in place), field errors per registration rules; story in `ProfileSettingsForm.stories.tsx`
- [X] T044 [US4] Create the settings routes: `apps/frontend/app/[locale]/workspace/settings/layout.tsx` (heading + `SettingsTabs`), `settings/page.tsx` (redirect → `settings/profile`), `settings/profile/page.tsx` (loads session profile, renders `ProfileSettingsForm`), `settings/subscription/page.tsx` (static localized plan-placeholder card per research R9) — each with locale validation + metadata (depends on T042–T043)
- [X] T045 [US4] Add `Settings` namespace keys (tab labels, headings, save/success copy, subscription placeholder copy) to `apps/frontend/messages/cs.json`, `en.json`, `de.json`; component tests for `SettingsTabs` (active state, keyboard) and `ProfileSettingsForm` (error rendering, success state) in `apps/frontend/tests/`; run T041 until green

**Checkpoint**: All four stories functional and independently tested.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T046 [P] Message-catalog parity sweep: every key added in T025/T035/T039/T045 present in all three of `apps/frontend/messages/{cs,en,de}.json`; parity unit test green; `pnpm build` type-checks keys
- [X] T047 [P] Accessibility pass per quickstart scenario 6: keyboard-only walk of registration → dashboard → cards → settings; focus visibility, `aria-invalid` associations, sidebar/tab semantics; fix findings in the touched components
- [X] T048 [P] Performance verification per plan budgets: `pnpm build` first-load JS ≤ 200 KB on changed routes; Lighthouse (mobile) on `/cs/sign-up` and `/cs/workspace/menus` production build — LCP ≤ 2.5 s, CLS ≤ 0.1; record numbers in the PR description
- [X] T049 Full gate run (root constitution workflow): `apps/api` — `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm test:e2e` (fresh DB); `apps/frontend` — `pnpm lint`, `tsc --noEmit`, `pnpm build`, `pnpm test`, `pnpm exec playwright test`; zero errors everywhere
- [X] T050 Execute quickstart.md scenarios 1–6 manually end-to-end; update `apps/frontend/AGENTS.md` only if a new convention was actually introduced (e.g., `AppearanceScope` usage note); confirm no dead code (old `MenuList`, unused `AuthForm` branches) remains

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → nothing
- **Foundational (Phase 2)** → depends on Setup; **blocks all stories**. Internal: T003 → T004; T005 → T009; T006 → T007 (types imported), T006 → T008
- **US1 (Phase 3)** → depends on Foundational. Internal: T010–T013 first; API T014 → T015 → T016; frontend T017/T018 → T019; T020–T021 → T022–T024; T025 alongside; T026 last
- **US2 (Phase 4)** → depends on US1's T021/T022 (gate layout it decorates). Internal: T028 → T032 → T033; T029 → T030 → T033; T033 → T034
- **US3 (Phase 5)** → depends on US2's T034 (list's new home). Internal: T037 → T038/T039 → T040
- **US4 (Phase 6)** → depends on US1's T018/T020 (ProfileFields, upsert action) and US2's T033 (shell). Internal: T042/T043 → T044 → T045
- **Polish (Phase 7)** → all stories done

### User Story Dependencies

- **US1**: none beyond Foundational — standalone MVP
- **US2**: US1 (layout file + session helpers)
- **US3**: US2 (menus route location); content-independent of US4
- **US4**: US1 (profile form pieces + action) and US2 (shell); independent of US3

### Parallel Opportunities

- Phase 2: T005, T006, T007 in parallel after T003/T004 kick off (T005/T006/T007 don't touch schema)
- US1: all four test tasks T010–T013 in parallel; T017 ∥ T018; API chain (T014–T016) ∥ frontend chain (T017–T019)
- US2: T029, T030, T031 in parallel; T028 ∥ T029–T031
- US3 ∥ US4: after US2, one developer can take menu cards while another takes settings (disjoint files)
- Polish: T046, T047, T048 in parallel

## Parallel Example: User Story 1

```bash
# Kick off all US1 tests together (must fail first):
Task: "Extend apps/api/test/auth.e2e-spec.ts with full-profile sign-up matrix"
Task: "Create apps/api/test/profile.e2e-spec.ts"
Task: "Create apps/frontend/tests/e2e/registration.spec.ts"
Task: "Create apps/frontend/tests/e2e/profile-gate.spec.ts"

# Then run the two implementation chains side by side:
#   API:      T014 → T015 → T016
#   Frontend: (T017 ∥ T018) → T019 → T020 → T021 → T022/T023/T024
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1–2 (setup + foundational)
2. Phase 3 (US1) — **stop and validate**: quickstart scenarios 1–2, all US1 tests green
3. This alone is deployable: full registration + gate, with the old workspace UI intact behind it

### Incremental Delivery

1. US1 → registration/gate (MVP)
2. US2 → dashboard shell + forced light (biggest visual payoff)
3. US3 → menu cards
4. US4 → settings tabs
5. Polish → gates, a11y, budgets, quickstart sign-off

Each checkpoint re-runs the previous stories' e2e specs — a later phase must never break an earlier story.

## Notes

- Every task's user-visible strings go through `next-intl` with keys in `cs`, `en`, `de` in the same task — this is a merge gate, not polish
- Tests assert roles/text/navigation, never class names or internal state (constitutions II)
- Commit after each task or coherent group (`feat:`/`fix:`/`test:` prefixes)
- The contract (`contracts/http-api.md`) changes both apps in this one change set — never merge one side alone
