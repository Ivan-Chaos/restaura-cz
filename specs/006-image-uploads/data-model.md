# Data Model: Logo & Dish Image Uploads

**Date**: 2026-09-03 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) (R3, R5)

## Principle

An image is a property of the thing it depicts. There is no separate asset entity: the row for a restaurant profile or a menu item carries the storage key and the stored dimensions of its one image, and the image exists in storage only while that row references it. The database remains the system of record; object storage holds bytes addressed by keys the database owns.

## Schema changes (migration `0004`)

### `restaurant_profile` (modified)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `logo_key` | `text` | yes | Storage key, `logos/<uuid>.png`. Random; never derived from `account_id`. |
| `logo_width` | `integer` | yes | Pixel width of the stored rendition (512 today). |
| `logo_height` | `integer` | yes | Pixel height of the stored rendition (512 today). |

Constraint `restaurant_profile_logo_complete`:
`(logo_key is null and logo_width is null and logo_height is null) or (logo_key is not null and logo_width > 0 and logo_height > 0)`

### `menu_item` (modified)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `image_key` | `text` | yes | Storage key, `dishes/<uuid>.jpg`. Random; never derived from item, section or menu ids. |
| `image_width` | `integer` | yes | Pixel width of the stored rendition (1600 today). |
| `image_height` | `integer` | yes | Pixel height of the stored rendition (1200 today). |

Constraint `menu_item_image_complete`: same shape as the logo constraint.

No other table changes. No backfill: every existing row is the "no image" state, which is exactly what the spec requires for menus and restaurants that predate the feature.

## Entities

### Restaurant Logo

- **Owner**: one `restaurant_profile` row (therefore one per account).
- **Attributes**: `logoKey`, `logoWidth`, `logoHeight`.
- **Rendition**: square PNG, 512×512, alpha preserved, metadata stripped.
- **Text alternative**: the restaurant's `restaurantName`, derived at render time, never stored.
- **Lifecycle**: absent → set (upload) → replaced (upload; the previous object is deleted after the row update commits) → absent (remove). Deleted with the profile row.

### Dish Photo

- **Owner**: one `menu_item` row.
- **Attributes**: `imageKey`, `imageWidth`, `imageHeight`.
- **Rendition**: landscape JPEG 4:3, 1600×1200, quality 82, progressive, metadata stripped.
- **Text alternative**: the dish's `name`, derived at render time.
- **Lifecycle**: same as the logo. Deleted when the item is deleted, or when its section or menu is deleted (cascade), or when the account is deleted (cascade). Duplicating a dish (`…/duplicate`) does **not** copy the photo: the copy starts without an image, so two rows never share a key and a delete can never orphan a sibling. (Documented in the contract delta.)

### Stored Object (in object storage, not in Postgres)

- **Key**: `logos/<uuidv4>.png` or `dishes/<uuidv4>.jpg`.
- **Headers**: `Content-Type` per rendition; `Cache-Control: public, max-age=31536000, immutable`.
- **Invariant**: referenced by exactly one row at any moment it is intended to exist. Any object under those prefixes with no referencing row and a `LastModified` older than 24 hours is garbage; the sweep command deletes it.

## Write sequences

### Upload or replace (logo or dish photo)

1. Validate ownership (existing `requireOwnedMenu`/`requireSection`/`requireItem` chain, or the session's own profile).
2. Process bytes (research R3). Failures here return `VALIDATION_FAILED` and nothing has been written.
3. `storage.put(newKey, buffer, contentType)`.
4. `UPDATE … SET image_key = newKey, image_width, image_height` (single statement; for items, also `touchMenu`). Read the previous key in the same statement via `RETURNING` on a CTE, or select it first inside a transaction.
5. If step 4 throws: `storage.delete([newKey])` best-effort, then rethrow.
6. If a previous key existed: `storage.delete([previousKey])` best-effort after commit; log failure with the key.

### Remove

1. Ownership check.
2. `UPDATE … SET image_key = null, image_width = null, image_height = null RETURNING previous key`.
3. `storage.delete([previousKey])` best-effort after commit.

### Delete item / section / menu

Inside the existing transaction, before the `DELETE`:
`SELECT image_key FROM menu_item WHERE … AND image_key IS NOT NULL` for the affected subtree (item; items of section; items of all sections of menu). After commit, `storage.delete(keys)` best-effort with logging. Row deletion is unchanged; cascades do the rest.

### Sweep (`node dist/images/sweep.js`)

For each prefix: list objects; load the set of referenced keys from the two columns; delete objects not in the set whose `LastModified` is older than 24 hours. Prints counts. Safe to run at any time; intended for a daily schedule outside the API process.

## Validation rules (boundary)

| Field | Rule | Error (`details[]`) |
|---|---|---|
| `file` | present, ≤ 10 MiB | `file` / `MAX_FILE_SIZE` (from multer's 413, translated) |
| `file` | decodes as JPEG, PNG or WebP | `file` / `IS_IMAGE` |
| `cropX`, `cropY`, `cropWidth`, `cropHeight` | all four present or all absent; integers ≥ 0; `cropWidth`, `cropHeight` ≥ 1 | `cropX` … / `IS_INT`, `MIN`; group rule `crop` / `IS_CROP` |
| crop rectangle | fits inside the oriented image (`x + w ≤ width`, `y + h ≤ height`) | `crop` / `IS_CROP` |

## Read shapes

`ImageRef` (wire): `{ url: string, width: number, height: number }`, or `null`. `url` is `storage.publicUrl(key)`, an absolute URL under `IMAGE_PUBLIC_URL`. Keys themselves are never exposed to the frontend; only URLs are.

- `PublicProfile.logo: ImageRef | null`
- `ItemView.image: ImageRef | null`
- `PublicMenuView.restaurantName: string`, `PublicMenuView.logo: ImageRef | null`
- `PublicMenuItem.image: ImageRef | null`

Frontend `ImageModel` (design system) is `{ src, alt, width, height }`; the adapter fills `src` from `url` and `alt` from the dish or restaurant name.

## Drizzle sketch (for orientation only; the migration is generated)

```ts
// restaurant_profile
logoKey: text('logo_key'),
logoWidth: integer('logo_width'),
logoHeight: integer('logo_height'),
// check('restaurant_profile_logo_complete', …)

// menu_item
imageKey: text('image_key'),
imageWidth: integer('image_width'),
imageHeight: integer('image_height'),
// check('menu_item_image_complete', …)
```
