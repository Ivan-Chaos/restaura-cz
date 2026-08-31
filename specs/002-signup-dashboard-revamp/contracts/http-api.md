# HTTP API Contract Delta: Sign-Up Expansion & Dashboard Revamp

**Date**: 2026-08-31 | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

This document amends [specs/001-menu-creation-publishing/contracts/http-api.md](../../001-menu-creation-publishing/contracts/http-api.md). Conventions (base URL, cookie auth, error shape, 🔒 marker) are unchanged and not repeated. Per the root constitution this contract is test-covered on **both sides** in the same change set: API e2e proves the shapes are served; `apps/frontend/tests/unit/api-contract.test.ts` proves they are expected.

## Shared shape

```json
"profile": {
  "restaurantName": "U Zlaté Lípy",
  "phones": ["+420 601 234 567"],
  "location": "Náměstí Míru 12, 120 00 Praha 2"
}
```

- `phones`: 1–3 strings, owner's entry order preserved, each trimmed; accepted format `^\+?[0-9 ()-]{5,24}$` with 6–15 digits.
- `restaurantName`: 1–120 chars (trimmed before validation). `location`: 1–200 chars (trimmed).
- New validation `details[].code` values: `IS_PHONE` (one or more entries is not a phone number), `ARRAY_MIN_SIZE` (fewer than one), `ARRAY_MAX_SIZE` (more than three). Field paths: `restaurantName`, `phones`, `location`.
- **The phone list is validated as a unit**: a bad entry is reported against `phones`, not against an index. Working out *which* entry is at fault is the form's job — it applies the identical rule client-side (`lib/api/phone.ts`, asserted against the same matrix as the API's validator) so it can mark the offending input.

## Changed: POST /auth/sign-up

Creates the account **and** its restaurant profile in one transaction (all-or-nothing; spec FR-004 — no profile-less accounts can result from this endpoint).

Request:

```json
{
  "email": "owner@example.com",
  "password": "min 8 chars",
  "restaurantName": "U Zlaté Lípy",
  "phones": ["+420 601 234 567", "222 333 444"],
  "location": "Náměstí Míru 12, 120 00 Praha 2"
}
```

Note: `confirmPassword` is a frontend-only check and MUST NOT appear in this contract.

- `201` → `{ "account": { "id", "email" }, "profile": { … } }` + `Set-Cookie: restaura_session=…`
- `409 EMAIL_TAKEN` — unchanged.
- `400 VALIDATION_FAILED` — now also covers the profile fields (codes above).

**Breaking change note**: the two-field body from feature 001 is no longer accepted (missing profile fields → `400 VALIDATION_FAILED`). Both apps change in this change set, so no compatibility window is provided (pre-launch product, root constitution workflow rule).

## Changed: GET /auth/me 🔒

- `200` → `{ "account": { "id", "email" }, "profile": { … } | null }`

`profile: null` identifies a legacy/incomplete account and drives the frontend's profile-completion gate (spec FR-005). No other behavior change.

## Changed: POST /auth/sign-in

Request unchanged. The response now carries the profile too — the same `{ account, profile }` shape sign-up and `me` return:

- `200` → `{ "account": { "id", "email" }, "profile": { … } | null }` + `Set-Cookie`

One shape across all three auth responses means one frontend type and one contract test, and it lets sign-in route a profile-less owner straight to the completion step instead of bouncing them off the dashboard. `401 INVALID_CREDENTIALS` unchanged (still identical for an unknown email and a wrong password).

## New: PUT /auth/profile 🔒

Idempotent upsert of the caller's restaurant profile. Serves both the profile-completion step (row missing → insert) and the Settings profile tab (row present → full replace). Always a **whole-profile** write — partial updates are not accepted (spec FR-018: same rules as registration; FR-020: invalid edits never overwrite stored data).

Request:

```json
{
  "restaurantName": "U Zlaté Lípy",
  "phones": ["+420 601 234 567"],
  "location": "Náměstí Míru 12, 120 00 Praha 2"
}
```

- `200` → `{ "profile": { … } }` (both insert and update paths — the caller does not care which happened)
- `400 VALIDATION_FAILED` — field codes as above; stored profile untouched.
- `401 UNAUTHENTICATED` — unchanged semantics.

## Endpoint inventory after this feature (auth namespace)

| Method & path | Auth | Change |
|---|---|---|
| `POST /auth/sign-up` | — | **changed** (profile fields required; returns profile) |
| `POST /auth/sign-in` | — | **changed** (returns `profile` alongside `account`) |
| `POST /auth/sign-out` | cookie (lenient) | unchanged |
| `GET /auth/me` | 🔒 | **changed** (adds `profile` — nullable) |
| `PUT /auth/profile` | 🔒 | **new** |

Menu and public endpoints: unchanged by this feature.
