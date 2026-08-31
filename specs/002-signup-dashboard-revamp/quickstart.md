# Quickstart: Sign-Up Expansion & Dashboard Revamp

**Plan**: [plan.md](./plan.md) | **Contract**: [contracts/http-api.md](./contracts/http-api.md) | **Data model**: [data-model.md](./data-model.md)

Runnable validation scenarios proving the feature end-to-end. Implementation detail lives in `tasks.md`; this is the run/verify guide.

## Prerequisites

```powershell
# 1. Postgres (from apps/api)
cd apps/api; docker-compose up -d

# 2. Migrations from empty DB must run cleanly (API constitution gate)
pnpm db:migrate

# 3. API dev server (http://localhost:3001)
pnpm start:dev

# 4. Frontend dev server (from apps/frontend, http://localhost:3000)
cd ../frontend; pnpm dev
```

## Quality gates (must all pass, per constitutions)

```powershell
# API (from apps/api)
pnpm lint; pnpm exec tsc --noEmit; pnpm test; pnpm test:e2e

# Frontend (from apps/frontend)
pnpm lint; pnpm exec tsc --noEmit; pnpm build; pnpm test; pnpm exec playwright test
```

Translation-key completeness: every new key present in `messages/cs.json`, `messages/en.json`, `messages/de.json` (`pnpm build` type-checks keys; the message-parity unit test must pass).

## Scenario 1 — Full registration gates the dashboard (US1, P1)

1. Open `http://localhost:3000/cs/sign-up`.
2. Submit with mismatched passwords → inline mismatch error, nothing created.
3. Submit with a missing/invalid field (empty restaurant name, phone `"abc"`, empty location) → field-level messages per field; submission blocked.
4. Add a second phone field, then remove it — the remove control disappears when only one phone remains.
5. Submit valid values (email, password ×2, restaurant name, 1–2 phones, location) → land on the dashboard (`/cs/workspace/menus`).
6. Sign out, sign back in → profile intact (verify restaurant name visible in Settings → Profile).

API-level check (contract):

```powershell
# 201 + account + profile; then 409 on repeat
curl -i -X POST http://localhost:3001/auth/sign-up -H "Content-Type: application/json" -d '{"email":"qa@example.com","password":"password1","restaurantName":"QA Bistro","phones":["+420 601 111 222"],"location":"Praha 1"}'
```

**Expected**: `201` with `{ account, profile }` per the contract; duplicate email → `409 EMAIL_TAKEN`; two-field legacy body → `400 VALIDATION_FAILED`.

## Scenario 2 — Legacy (profile-less) account is gated (US1/AS7, FR-005)

1. Create a profile-less account directly in the DB (insert into `owner_account` only), or use a pre-feature fixture.
2. Sign in with it → redirected to `/cs/complete-profile`, dashboard unreachable.
3. Deep-link to `http://localhost:3000/cs/workspace/settings/profile` while incomplete → redirected to complete-profile; after completing the form → arrive at the originally requested destination.
4. `GET /auth/me` with that session → `profile: null` before completion, full profile after.

## Scenario 3 — Dashboard shell & forced light (US2)

1. Sign in with a complete account. Verify on every dashboard page: header (product identity, signed-in email, sign-out) and sidebar (Menus, Settings) present; active section highlighted.
2. Set the appearance toggle / OS to **dark**. Dashboard pages stay light-toned; open `/cs` (landing) and a published `/cs/m/<slug>` in another tab → still dark. (spec SC-005)
3. Signed out, open `/cs/workspace/menus` directly → redirected to sign-in; after signing in → arrive back at `/cs/workspace/menus` (FR-013).
4. Viewport 360×740: sidebar collapses to an offcanvas/trigger; no horizontal scroll; all nav reachable (SC-008).

## Scenario 4 — Menus look like menus (US3)

1. With several menus (mix of draft/published): Menus section renders cards (display-font name, status badge, public path on published ones) — not plain rows.
2. Click a card → menu editor form for that menu.
3. Delete remains available per card and still asks for confirmation.
4. Account with zero menus → inviting empty state with a create action; creating a menu returns to the styled list showing it (FR-016).

## Scenario 5 — Settings tabs (US4)

1. Sidebar → Settings → lands on `/cs/workspace/settings/profile` (redirect from `/settings`).
2. Switch to Subscription tab → URL changes to `…/settings/subscription`; placeholder plan card renders; active tab indicated.
3. Deep-link `…/settings/subscription` directly → subscription tab active.
4. Profile tab: edit restaurant name, add a phone, save → success feedback; sign out/in → changes persisted (SC-007).
5. Remove all phones / clear restaurant name, save → blocked with field messages; reload → stored data unchanged (FR-020).

```powershell
# Upsert contract check (reuse the session cookie from sign-in)
curl -i -X PUT http://localhost:3001/auth/profile -H "Content-Type: application/json" -b "restaura_session=<token>" -d '{"restaurantName":"QA Bistro 2","phones":["601 111 222"],"location":"Brno"}'
```

**Expected**: `200 { profile }`; with `"phones": []` → `400 VALIDATION_FAILED` with `ARRAY_SIZE`, stored row untouched.

## Scenario 6 — Localization & accessibility spot checks

1. Repeat Scenario 1 happy path in `en` (Playwright covers `cs` + `en` per constitution).
2. Keyboard-only pass: registration form, sidebar navigation, settings tabs, menu cards (card reachable and activatable, delete separately focusable).
3. Verify focus visibility and `aria-invalid`/error association on failed registration fields.

## Performance verification

- `pnpm build` (frontend): confirm new/changed routes report first-load JS ≤ 200 KB gzipped.
- Lighthouse against production build on `/cs/sign-up` and `/cs/workspace/menus` (mobile preset): LCP ≤ 2.5 s, CLS ≤ 0.1.
- Dashboard dynamic rendering is expected (session-scoped) and documented in plan.md Technical Context.
