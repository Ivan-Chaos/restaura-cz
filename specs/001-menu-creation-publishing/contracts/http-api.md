# HTTP API Contract: Base Menu Creation & Publishing

**Date**: 2026-08-31 | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

This document is the single source of truth for the frontend ↔ API contract. Per the root constitution, it is covered by tests **on both sides**: API e2e tests prove these shapes are served; frontend contract tests prove these shapes are expected. A change here changes both apps in the same change set.

## Conventions

- Base URL: `API_URL` env var (e.g. `http://localhost:3001`). All bodies are JSON (`Content-Type: application/json`).
- **Authentication**: opaque session token in an `httpOnly` cookie named `restaura_session` (`Secure` outside dev, `SameSite=Lax`, `Path=/`, 30-day expiry). Endpoints marked 🔒 require it and return `401 UNAUTHENTICATED` without a valid, unexpired session.
- **Ownership**: 🔒 endpoints addressing a menu/section/item that doesn't exist *or* isn't owned by the caller return `404 NOT_FOUND` — never `403` (no existence leak).
- **IDs** are UUID strings. **Prices** are integers, whole CZK (major units), ≥ 0. **Timestamps** are ISO 8601 UTC strings.

### Error shape (every non-2xx response)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable summary (developer-facing; the frontend translates by code)",
    "details": [{ "field": "priceCzk", "code": "MIN", "message": "must be >= 0" }]
  }
}
```

`details` is present only for `VALIDATION_FAILED`. Frontend rendering keys off `error.code` (and `details[].field`/`details[].code` for forms), mapping to `next-intl` messages — raw `message` text is never shown to users (root constitution III).

**Error codes**: `VALIDATION_FAILED` (400) · `UNAUTHENTICATED` (401) · `EMAIL_TAKEN` (409) · `INVALID_CREDENTIALS` (401) · `NOT_FOUND` (404) · `INTERNAL` (500).

## Auth endpoints

### POST /auth/sign-up

Creates an account and signs it in (US1/AS1).

Request: `{ "email": "owner@example.com", "password": "min 8 chars" }`

- Validation: `email` — required, valid email format, ≤ 254 chars; `password` — required, 8–128 chars.
- `201` → `{ "account": { "id": "…", "email": "owner@example.com" } }` + `Set-Cookie: restaura_session=…`
- `409 EMAIL_TAKEN` — case-insensitive duplicate (US1/AS2).
- `400 VALIDATION_FAILED`.

### POST /auth/sign-in

- Request: `{ "email": "…", "password": "…" }`
- `200` → `{ "account": { "id", "email" } }` + `Set-Cookie`.
- `401 INVALID_CREDENTIALS` — same response whether the email is unknown or the password wrong (FR-004, non-revealing).

### POST /auth/sign-out 🔒

- `204` (no body) + cookie cleared; session row deleted. Idempotent: an already-invalid session still gets `204` + cleared cookie.

### GET /auth/me 🔒

- `200` → `{ "account": { "id", "email" } }`. Used by the frontend to gate workspace routes.

## Owner menu endpoints (all 🔒)

### GET /menus

Workspace list (FR-012). Scoped to the session's account, ordered by `updatedAt` desc, capped at 100.

`200` →

```json
{ "menus": [ { "id": "…", "name": "Lunch", "status": "draft", "publicSlug": null, "updatedAt": "…" } ] }
```

`status` ∈ `"draft" | "published"`; `publicSlug` is `null` until first publish, then permanent.

### POST /menus

Request: `{ "name": "1–120 chars" }` → `201` with the full menu detail (below), `status: "draft"`, empty `sections` (FR-006).

### GET /menus/:menuId

Full editor payload:

```json
{
  "menu": {
    "id": "…", "name": "Lunch", "status": "draft", "publicSlug": null,
    "visualVariant": "default", "updatedAt": "…",
    "sections": [
      {
        "id": "…", "title": "Starters", "position": 0,
        "items": [
          { "id": "…", "name": "Soup", "description": null, "priceCzk": 89, "position": 0 }
        ]
      }
    ]
  }
}
```

Sections and items sorted by `(position, id)`.

### PATCH /menus/:menuId

Request (all optional, at least one): `{ "name": "…", "visualVariant": "default" }`

- `visualVariant` allowlist for this feature: `["default"]` — any other value → `400 VALIDATION_FAILED` (FR-010 stub).
- `200` → full menu detail.

### DELETE /menus/:menuId

`204`. Cascades sections/items; a published menu's address 404s afterward (FR-013).

### POST /menus/:menuId/publish

`200` → `{ "status": "published", "publicSlug": "u-modre-kachny-x7k2qf", "publicPath": "/m/u-modre-kachny-x7k2qf" }`

- First publish generates the slug; republish returns the existing one (R5). Idempotent on an already-published menu.
- Publishing an empty menu succeeds (edge case — owner's choice).
- `publicPath` is locale-less; the frontend prefixes the locale when displaying the shareable address (FR-017).

### POST /menus/:menuId/unpublish

`200` → `{ "status": "draft", "publicSlug": "u-modre-kachny-x7k2qf" }` — slug retained. Idempotent on a draft.

## Owner section & item endpoints (all 🔒, ownership via the full path)

### POST /menus/:menuId/sections

Request: `{ "title": "1–120 chars" }` → `201` `{ "section": { "id", "title", "position", "items": [] } }` — appended at the end.

### PATCH /menus/:menuId/sections/:sectionId

Request (at least one): `{ "title": "…", "position": 2 }` — position is clamped to `[0, sectionCount-1]`; siblings renumbered transactionally (FR-007 rename/reorder). `200` → `{ "section": … }`.

### DELETE /menus/:menuId/sections/:sectionId

`204`. Cascades items (UI confirms first — edge case).

### POST /menus/:menuId/sections/:sectionId/items

Request: `{ "name": "1–200 chars", "description": "≤ 2000 chars, optional", "priceCzk": 89 }`

- Validation (FR-009): `name` required; `priceCzk` required, integer, ≥ 0; `description` optional/nullable.
- `201` → `{ "item": { "id", "name", "description", "priceCzk", "position" } }` — appended at the end.

### PATCH /menus/:menuId/sections/:sectionId/items/:itemId

Request (at least one): `{ "name", "description", "priceCzk", "position" }` — same validation; `description: null` clears it. `200` → `{ "item": … }`.

### DELETE /menus/:menuId/sections/:sectionId/items/:itemId

`204`.

## Public endpoint (no auth)

### GET /public/menus/:slug

Serves a published menu for guest display (FR-018). Draft menus and unknown slugs return the identical `404 NOT_FOUND` (FR-015, US4/AS3).

`200` →

```json
{
  "menu": {
    "name": "Lunch",
    "visualVariant": "default",
    "sections": [
      {
        "title": "Starters",
        "items": [ { "name": "Soup", "description": null, "priceCzk": 89 } ]
      }
    ]
  }
}
```

- Display fields only — no ids, no account data, no timestamps.
- Reflects the latest saved content on every request (FR-020); performance budget p95 ≤ 200 ms.

## Contract test obligations

| Side | Proves |
|---|---|
| API e2e (real Postgres) | Every endpoint above: happy path, each documented error code, auth/ownership rules, error shape, idempotency of publish/unpublish/sign-out, immediate 404 after unpublish |
| Frontend contract tests | `lib/api/types.ts` matches every response shape used; `lib/menu-display/adapter.ts` maps the public payload onto the design-system `Menu` model; form error mapping covers every `details[].code` it renders |
