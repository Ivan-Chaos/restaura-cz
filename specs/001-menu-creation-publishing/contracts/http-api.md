# HTTP API Contract: Base Menu Creation & Publishing

**Date**: 2026-08-31 | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

This document is the single source of truth for the frontend ↔ API contract. Per the root constitution, it is covered by tests **on both sides**: API e2e tests prove these shapes are served; frontend contract tests prove these shapes are expected. A change here changes both apps in the same change set.

## Conventions

- Base URL: `API_URL` env var (e.g. `http://localhost:3001`). All bodies are JSON (`Content-Type: application/json`).
- **Authentication**: opaque session token in an `httpOnly` cookie named `restaura_session` (`Secure` outside dev, `SameSite=Lax`, `Path=/`, 30-day expiry). Endpoints marked 🔒 require it and return `401 UNAUTHENTICATED` without a valid, unexpired session.
- **Ownership**: 🔒 endpoints addressing a menu/section/item that doesn't exist *or* isn't owned by the caller return `404 NOT_FOUND` — never `403` (no existence leak).
- **IDs** are UUID strings. **Prices** are numbers in CZK (major units) with at most two decimal places, ≥ 0 — `89` and `56.5` are both valid, `56.555` is not. **Timestamps** are ISO 8601 UTC strings.

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

### Image references (feature 006)

Every stored image travels as the same object, or `null` when there is none:

```ts
interface ImageRef { url: string; width: number; height: number }
```

`url` is absolute, under the deployment's image host. Storage keys are **never** exposed. The dimensions are the stored rendition's own, so a consumer can reserve the right box before the bytes arrive.

**Upload requests** are `multipart/form-data` with one file part named `file` (≤ 10 MiB; JPEG, PNG or WebP **by content**, never by filename or declared type) and an optional framing: `cropX`, `cropY`, `cropWidth`, `cropHeight`, as integers in **oriented** source pixels — what the owner saw after the browser applied any EXIF rotation. All four or none; three coordinates are rejected rather than ignored. Without them the API centre-crops, which is what makes a plain form post with no client JavaScript work.

The API always auto-orients, crops, resizes to one fixed rendition per kind, strips metadata, and discards the original. Logos are 512×512 PNG (transparency preserved); dish photos are 1600×1200 JPEG.

**Additional field-error codes** (`details[].code`), all returned as `400 VALIDATION_FAILED` so a form marks the image control exactly as it marks a bad price:

| Code | Field | Meaning |
|---|---|---|
| `MAX_FILE_SIZE` | `file` | Over the 10 MiB cap |
| `IS_IMAGE` | `file` | Not a decodable JPEG, PNG or WebP (SVG, GIF, HEIC, renamed text, truncated files) |
| `IS_CROP` | `crop` | Framing partially supplied, or it does not fit inside the oriented image |

`IS_INT` and `MIN` may also appear on the individual crop fields.

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

### Profile shape (feature 006)

Every response carrying a `profile` — sign-up, sign-in, `/auth/me`, `PUT /auth/profile` — includes `logo`:

```json
{ "profile": { "restaurantName": "U Zlaté Lípy", "phones": ["+420 601 234 567"], "location": "…", "logo": null } }
```

`PUT /auth/profile` does **not** accept `logo` in its body (the whitelist rejects it) and never changes it: the logo has its own endpoints, so saving the restaurant's details cannot disturb it.

### PUT /auth/profile/logo 🔒

Multipart, per the upload shape above. Requires a session **and** an existing profile; an account with `profile: null` gets `404`. Email verification is deliberately *not* required — the profile is editable before verification, and the logo follows the profile.

- `200` → `{ "profile": { …, "logo": { "url": "…/logos/3f2c….png", "width": 512, "height": 512 } } }`
- Replaces any existing logo; the previous object stops being served.
- `400 VALIDATION_FAILED` per the code table; `401 UNAUTHENTICATED`.

### DELETE /auth/profile/logo 🔒

No body. `200` → `{ "profile": { …, "logo": null } }`. Idempotent: removing when none is set is still `200`. `404` when the account has no profile.

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
          { "id": "…", "name": "Soup", "description": null, "priceCzk": 89, "position": 0, "image": null }
        ]
      }
    ]
  }
}
```

Sections and items sorted by `(position, id)`.

### PATCH /menus/:menuId

Request (all optional, at least one): `{ "name": "…", "visualVariant": "default" }`

- `visualVariant` allowlist (feature 005): `["default", "plain-white", "liquid-glass", "green-bar", "modern", "refined"]` — any other value → `400 VALIDATION_FAILED` with the field error on `visualVariant`. `default` is the Classic look every menu starts with. Consumers MUST treat a stored value they do not recognise as `default`; the API does not re-validate stored values on read.
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

- Validation (FR-009): `name` required; `priceCzk` required, number with at most two decimal places, ≥ 0; `description` optional/nullable.
- `201` → `{ "item": { "id", "name", "description", "priceCzk", "position" } }` — appended at the end.

### PATCH /menus/:menuId/sections/:sectionId/items/:itemId

Request (at least one): `{ "name", "description", "priceCzk", "position" }` — same validation; `description: null` clears it. `200` → `{ "item": … }`.

### POST /menus/:menuId/sections/:sectionId/items/:itemId/duplicate

No body. `201` → `{ "item": … }` — a copy of the dish carrying the same name, description and price, inserted directly **after** the original, with the following siblings renumbered. One endpoint rather than a create plus a reorder, so a half-applied duplicate cannot exist.

The copy's `image` is always `null` (feature 006): two rows must never reference one stored object, or deleting either would break the other.

### PUT /menus/:menuId/sections/:sectionId/items/:itemId/image 🔒

Multipart, per the upload shape in Conventions. `PATCH` on the item does **not** accept `image`; the photo has its own endpoints so an ordinary text edit is still an ordinary JSON request.

- `200` → `{ "item": { …, "image": { "url": "…/dishes/9a1e….jpg", "width": 1600, "height": 1200 } } }`
- Replaces any existing photo and touches the menu's `updatedAt`.
- `400 VALIDATION_FAILED` per the code table; `401`; `403 EMAIL_UNVERIFIED`; `404` for a missing or foreign menu, section or item.

### DELETE /menus/:menuId/sections/:sectionId/items/:itemId/image 🔒

No body. `200` → `{ "item": { …, "image": null } }`. Idempotent. Touches `updatedAt`.

### Deleting an item, section or menu (feature 006)

Response shapes are unchanged. In addition to the row cascade, every stored photo beneath the deleted subtree is removed from object storage.

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
    "restaurantName": "U Zlaté Lípy",
    "visualVariant": "default",
    "logo": { "url": "…/logos/3f2c….png", "width": 512, "height": 512 },
    "sections": [
      {
        "title": "Starters",
        "items": [ { "name": "Soup", "description": null, "priceCzk": 89, "image": null } ]
      }
    ]
  }
}
```

- Display fields only — no ids, no keys, no account data, no timestamps.
- `restaurantName` (feature 006) travels so the logo has a text alternative naming the restaurant rather than the menu; a menu called "Lunch" depicts nothing. It is already visible on the restaurant's own menus and reveals nothing new.
- `logo` and each item's `image` are `ImageRef | null`. Consumers MUST render the no-image presentation for `null` and MUST NOT treat it as an error, and MUST fall back to that same presentation if a URL fails to load.
- Reflects the latest saved content on every request (FR-020); performance budget p95 ≤ 200 ms.

### GET /dev-images/*key (development only)

Serves stored renditions from the local disk, and exists **only** when the R2 variables are unset. Deployed environments serve images from the bucket's own hostname and never mount this route. `Cache-Control: public, max-age=31536000, immutable`; `404` for an unknown key. Not part of the production contract.

## Contract test obligations

| Side | Proves |
|---|---|
| API e2e (real Postgres) | Every endpoint above: happy path, each documented error code, auth/ownership rules, error shape, idempotency of publish/unpublish/sign-out, immediate 404 after unpublish |
| Frontend contract tests | `lib/api/types.ts` matches every response shape used; `lib/menu-display/adapter.ts` maps the public payload onto the design-system `Menu` model; form error mapping covers every `details[].code` it renders |
