# HTTP API Contract Delta: Sign-Up Validation & Email Confirmation

**Date**: 2026-09-01, amended 2026-09-02 (`locale` on verify-email; welcome email)

This document amends [specs/001-menu-creation-publishing/contracts/http-api.md](../../001-menu-creation-publishing/contracts/http-api.md) as already amended by [specs/002-signup-dashboard-revamp/contracts/http-api.md](../../002-signup-dashboard-revamp/contracts/http-api.md). Conventions (base URL, cookie auth, error shape, 🔒 marker) are unchanged and not repeated. Per the root constitution this contract is test-covered on **both sides** in the same change set: `apps/api/test/verify-email.e2e-spec.ts` proves the shapes are served; `apps/frontend/tests/unit/api-contract.test.ts` proves they are expected.

## Summary

A newly registered account must prove it can read the address it gave before it can do anything else. Registration still creates the account and signs it in — the owner is not asked to hold a password in their head across an email round trip — but the account is **unconfirmed**, and every owner-facing menu route refuses it until a 6-digit code is entered.

## New error codes

The `ErrorCode` union gains four members. Each is a business outcome rather than a shape failure, which is why none is folded into `VALIDATION_FAILED` with a field detail: the advice differs per case, and a form with one input has nowhere useful to pin a field error.

| Code | Status | Meaning |
|---|---|---|
| `CODE_INVALID` | 400 | A well-formed code that is wrong. An attempt has been charged. |
| `CODE_EXPIRED` | 400 | The code has lapsed, **or** none was ever issued. Both mean "ask for a new one". |
| `TOO_MANY_ATTEMPTS` | 429 | Five wrong guesses against the current code, **or** a resend asked for inside the cooldown. |
| `EMAIL_UNVERIFIED` | 403 | A valid session whose account has not confirmed. 403 and not 401: the credentials are fine, the account is not yet permitted. |

## Changed: the account shape

`account` gains `emailVerified`, on all three of sign-up, sign-in and `me`:

```json
"account": { "id": "8d1c…", "email": "owner@example.com", "emailVerified": false }
```

A boolean, not the stored timestamp — no caller renders the date. `false` is what routes an owner to the confirmation step and what `VerifiedGuard` refuses menu writes on.

**Migration note**: every account that existed before this feature is backfilled `email_verified_at = created_at`, so no existing owner is locked out by a code that was never sent to them.

## Changed: POST /auth/sign-up

Request gains one optional field:

```json
{
  "email": "owner@example.com",
  "password": "min 8 chars",
  "restaurantName": "U Zlaté Lípy",
  "phones": ["+420 601 234 567"],
  "location": "Náměstí Míru 12, 120 00 Praha 2",
  "locale": "cs"
}
```

- `locale`: optional, one of `cs` | `en` | `de`, default `cs`. Chooses the language of the confirmation email. Declared on the DTO because the global ValidationPipe runs with `forbidNonWhitelisted` — an undeclared property is a 400, so the frontend could not send the locale it already knows without it. An unsupported value → `400 VALIDATION_FAILED` with `details[].code = IS_IN`.
- `email` is now **trimmed** before validation, matching the other text fields. A trailing space pasted from a password manager would otherwise create an account whose address could not be signed in with.

Behaviour: on success the endpoint also issues a confirmation code and emails it. **The send is best-effort** — a provider outage is logged and the registration still succeeds, because an account that silently failed to exist is a far worse outcome than one whose owner has to press Resend. The response is unchanged apart from `emailVerified: false`.

- `201` → `{ "account": { "id", "email", "emailVerified": false }, "profile": { … } }` + `Set-Cookie`

## New: POST /auth/verify-email 🔒

Confirms the caller's own address. Session-guarded, which is what keeps it off the enumeration surface: there is no email in the body to probe with, so a caller can only ever confirm the account they already hold a session for.

Request:

```json
{ "code": "123456", "locale": "cs" }
```

- `code`: exactly six digits (`^\d{6}$`). Malformed → `400 VALIDATION_FAILED` (`details[].code = MATCHES`, which the frontend degrades to its generic `INVALID` message — a value users normally never see, because the form validates the shape before submitting).
- `locale`: optional, `cs` | `en` | `de`, default `cs`. Chooses the language of the welcome email sent on success. An unsupported value → `400 VALIDATION_FAILED` (`details[].code = IS_IN`), and no attempt is charged, because validation runs before the code is looked at.

Responses:

- `200` → `{ "account": { …, "emailVerified": true }, "profile": { … } | null }` — the same shape sign-up and sign-in return, so the frontend has one type for every session-shaped answer.
- `400 CODE_INVALID` — wrong code; an attempt was charged.
- `400 CODE_EXPIRED` — lapsed, or never issued.
- `429 TOO_MANY_ATTEMPTS` — the five-attempt budget is spent. A **new code is required**; waiting does not restore attempts.
- `401 UNAUTHENTICATED` — no session.

**Idempotent**: submitting against an already-confirmed account is `200`, not an error. A stale tab or a double submit is not a mistake worth punishing.

**Welcome email**: on the first successful confirmation the API sends a welcome email to the confirmed address, in the requested `locale`. It is best-effort in the same way sign-up's confirmation send is: a provider failure is logged and the response is still `200`. An already-confirmed account gets no second welcome, because the idempotent early return happens before the send.

## New: POST /auth/verify-email/resend 🔒

Replaces the outstanding code with a fresh one and emails it. Resetting the attempt counter is the point: a new code that inherited a spent budget would be useless.

Request: `{ "locale": "cs" }` — optional, same values and default as sign-up.

- `204` — sent (or the account was already confirmed, which is a no-op rather than an error).
- `429 TOO_MANY_ATTEMPTS` — asked for inside the 60-second cooldown.
- `500 INTERNAL` — the provider rejected the send. **Unlike sign-up, this failure is reported**: the owner pressed a button whose only purpose was to deliver an email, so silence would be a lie.
- `401 UNAUTHENTICATED` — no session.

## Changed: every owner-facing menu route 🔒

`POST/GET/PATCH/DELETE /menus/**` now answer `403 EMAIL_UNVERIFIED` for a session whose account is unconfirmed. Enforced by `VerifiedGuard`, mounted on the controller after `SessionGuard`.

The frontend also redirects an unconfirmed owner to the confirmation screen, but that is the courtesy, not the security — the API listens on its own port and answers anyone holding a session cookie. **`GET /public/menus/:slug` is deliberately untouched**: a diner is not an account.

## Code policy

Values live in `apps/api/src/auth/email-confirmation.ts`. They are a set, not independent knobs: six digits is only safe because attempts are capped, and the cap is only usable because a new code can be requested.

| Rule | Value | Why |
|---|---|---|
| Length | 6 digits | Typed from a phone screen without re-reading. |
| TTL | 15 minutes | Long enough for a slow inbox, short enough that a leaked code is stale. |
| Max attempts | 5 per issued code | The real defence. A million possibilities only helps if guessing is bounded. |
| Resend cooldown | 60 seconds | Stops the resend button being an open relay to a stranger's inbox. |

Storage: only `sha256("<accountId>.<code>")` is persisted, following the `session.token_hash` precedent — a leaked database hands out no working codes. Mixing in the account id means one precomputed table cannot be matched against every row at once.

## Endpoint inventory after this feature (auth namespace)

| Method & path | Auth | Change |
|---|---|---|
| `POST /auth/sign-up` | — | **changed** (optional `locale`; trims email; issues a code; `emailVerified` in response) |
| `POST /auth/sign-in` | — | **changed** (`emailVerified` in response) |
| `POST /auth/sign-out` | cookie (lenient) | unchanged |
| `GET /auth/me` | 🔒 | **changed** (`emailVerified` in response) |
| `PUT /auth/profile` | 🔒 | unchanged |
| `POST /auth/verify-email` | 🔒 | **new** (optional `locale`; sends the welcome email on success) |
| `POST /auth/verify-email/resend` | 🔒 | **new** |

Menu endpoints: unchanged in shape, but now gated on confirmation. Public endpoints: unchanged.
