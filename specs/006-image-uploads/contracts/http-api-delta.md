# Contract Delta: HTTP API (images)

Applies to `specs/001-menu-creation-publishing/contracts/http-api.md` as amended by 002, 003 and 005. The canonical document is updated in the same change set; this file records what changes and why. Tests on both sides pin it (see the end).

## Shared type

```ts
/** A stored image rendition, ready to display. Keys are never exposed. */
interface ImageRef {
  url: string;    // absolute, under IMAGE_PUBLIC_URL
  width: number;  // pixels of the stored rendition
  height: number;
}
```

## New field-error codes

Added to the `details[].code` vocabulary:

| Code | Field | Meaning |
|---|---|---|
| `MAX_FILE_SIZE` | `file` | Upload exceeds 10 MiB (raw multer limit, translated from 413 to `400 VALIDATION_FAILED`) |
| `IS_IMAGE` | `file` | Content is not a decodable JPEG, PNG or WebP (SVG, GIF, HEIC, renamed text, truncated files all land here) |
| `IS_CROP` | `crop` | Crop fields are partially supplied, or the rectangle does not fit inside the oriented image |

Existing codes `IS_INT` and `MIN` may also appear on `cropX`, `cropY`, `cropWidth`, `cropHeight`.

## Multipart request shape (shared by both `PUT … image` endpoints)

`Content-Type: multipart/form-data`

| Part | Type | Required | Rule |
|---|---|---|---|
| `file` | file | yes | ≤ 10 MiB; JPEG, PNG or WebP by content |
| `cropX` | text (integer) | no* | ≥ 0 |
| `cropY` | text (integer) | no* | ≥ 0 |
| `cropWidth` | text (integer) | no* | ≥ 1 |
| `cropHeight` | text (integer) | no* | ≥ 1 |

\* All four or none. Coordinates are in **oriented** source pixels (what the browser displays after EXIF rotation). When absent, the API centre-crops to the target aspect. The API always auto-orients, crops, resizes to the canonical rendition, strips metadata, and discards the original.

## Auth endpoints

### GET /auth/me 🔒, POST /auth/sign-up, POST /auth/sign-in, PUT /auth/profile 🔒 — response change

`profile` gains `logo`:

```json
{ "profile": { "restaurantName": "U Zlaté Lípy", "phones": ["+420 601 234 567"], "location": "…", "logo": null } }
```

`logo` is `ImageRef | null`. `PUT /auth/profile` does not accept `logo` in its body (the whitelist rejects it with `VALIDATION_FAILED`); the logo has its own endpoints below and is untouched by a profile save.

### PUT /auth/profile/logo 🔒 (new)

Multipart, shape above. Requires a session **and** a restaurant profile (an account with `profile: null` gets `404 NOT_FOUND`). Email verification is **not** required (the profile is editable before verification today, and the logo follows the profile).

- `200` → `{ "profile": { …, "logo": { "url": "https://img.example/logos/3f2c….png", "width": 512, "height": 512 } } }`
- Replaces any existing logo; the previous object is no longer served.
- `400 VALIDATION_FAILED` with `details` per the table above.
- `401 UNAUTHENTICATED`.

### DELETE /auth/profile/logo 🔒 (new)

No body. `200` → `{ "profile": { …, "logo": null } }`. Idempotent: removing when none is set is still `200` with `logo: null`. `404` when the account has no profile.

## Owner item endpoints (all 🔒, ownership via the full path, verified email required as for every `/menus` route)

### GET /menus/:menuId, POST/PATCH item endpoints — response change

Every `item` gains `image: ImageRef | null`:

```json
{ "item": { "id": "…", "name": "Svíčková", "description": null, "priceCzk": 189, "position": 0, "image": null } }
```

`PATCH …/items/:itemId` does **not** accept `image` (whitelist). `POST …/items/:itemId/duplicate` copies name, description and price; the copy's `image` is `null`.

### PUT /menus/:menuId/sections/:sectionId/items/:itemId/image 🔒 (new)

Multipart, shape above.

- `200` → `{ "item": { …, "image": { "url": "https://img.example/dishes/9a1e….jpg", "width": 1600, "height": 1200 } } }`
- Replaces any existing photo. Touches the menu's `updatedAt`.
- `400 VALIDATION_FAILED` (`file`/`MAX_FILE_SIZE`, `file`/`IS_IMAGE`, `crop`/`IS_CROP`, …).
- `401`, `403 EMAIL_UNVERIFIED`, `404 NOT_FOUND` (foreign or missing menu/section/item, indistinguishable).

### DELETE /menus/:menuId/sections/:sectionId/items/:itemId/image 🔒 (new)

No body. `200` → `{ "item": { …, "image": null } }`. Idempotent. Touches `updatedAt`.

### DELETE item / section / menu — behaviour note

Unchanged shapes. In addition to the row cascade, every photo under the deleted subtree is removed from storage.

## Public endpoint

### GET /public/menus/:slug — response change

```json
{
  "menu": {
    "name": "Polední menu",
    "restaurantName": "U Zlaté Lípy",
    "visualVariant": "modern",
    "logo": { "url": "https://img.example/logos/3f2c….png", "width": 512, "height": 512 },
    "sections": [
      {
        "title": "Hlavní jídla",
        "items": [
          { "name": "Svíčková", "description": null, "priceCzk": 189,
            "image": { "url": "https://img.example/dishes/9a1e….jpg", "width": 1600, "height": 1200 } },
          { "name": "Kulajda", "description": "…", "priceCzk": 89, "image": null }
        ]
      }
    ]
  }
}
```

- `restaurantName` is added so the logo's text alternative can be the restaurant, not the menu (spec FR-004). It is display data already visible on the restaurant's own menus and reveals nothing new about the account.
- `logo` and each `image` are `ImageRef | null`. Consumers MUST render the no-image presentation for `null` and MUST NOT treat it as an error.
- Still display fields only: no ids, no keys, no timestamps.

## Local development route (not part of the production contract)

### GET /dev-images/*key

Served only when the API runs without R2 configuration. Streams the stored rendition with its `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`. `404` for unknown keys. The frontend's `IMAGE_PUBLIC_URL` defaults to this route so `next/image` can optimise local uploads.

## Compatibility

- Additive: no field removed, no shape changed for existing fields. A frontend built before this change ignores `logo`, `image` and `restaurantName`.
- A frontend built after this change against an older API sees `undefined` where it expects `null`; the adapter and forms treat both as "no image".
- Deploy the API first or together.

## Tests that pin this contract

- API e2e: `apps/api/test/images.e2e-spec.ts` (new): every endpoint above, each error code, ownership/auth, idempotent deletes, cascade removes objects, public payload shape, keys not derived from ids. `profile.e2e-spec.ts` and `menus.e2e-spec.ts`: existing assertions extended with `logo: null` / `image: null`.
- Frontend: `tests/unit/api-contract.test.ts` fixtures gain `logo`, `image`, `restaurantName`; `FieldErrorCode` gains the three codes; `tests/unit/menu-display-adapter.test.ts` maps `ImageRef` to `ImageModel`.
