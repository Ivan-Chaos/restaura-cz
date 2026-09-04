# Research: Logo & Dish Image Uploads

**Date**: 2026-09-03 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Every decision below was checked against the installed code and docs (`apps/api/src`, `apps/frontend`, `node_modules/next/dist/docs`). No `NEEDS CLARIFICATION` remained after this phase.

## R1. Upload path: browser → Server Action → API → storage

**Decision**: The owner's browser posts a `multipart/form-data` body (the original file plus crop fields) to a Next.js Server Action. The action forwards it, unchanged, to a new multipart API endpoint through the existing server-side `apiRequest`, which relays the session cookie. The API processes the image and writes it to storage. The browser never talks to the API or to R2.

**Rationale**:
- Keeps the architectural rule in `apps/frontend/AGENTS.md` ("the browser never calls the API"): no CORS, no credential in client JavaScript, one request shape.
- The API sees the bytes, so it is the single authority for FR-010 (content-based acceptance), FR-011 (orientation), FR-012 (normalisation, no original retained) and FR-018 (unguessable keys). A direct-to-bucket upload would have to trust the client or add a second verification pass.
- Attaching happens in the same request as the upload (see R5), so there is never an unattached object and FR-014 needs no cleanup scheduler.
- Verified: Next.js docs (`serverActions.md`) confirm the Server Action body limit is configurable via `experimental.serverActions.bodySizeLimit`, that the limit covers multipart overhead, and that a `File` in `FormData` reaches the action intact. Node 22's `fetch` forwards `FormData` with a `File` to the API.

**Alternatives considered**:
- *Presigned PUT straight to R2 from the browser*: fastest bytes path, but breaks the no-browser-to-API rule in spirit (a second origin the browser must be allowed to reach, bucket CORS), forces a two-phase upload-then-attach with an orphan window and a reaper, and leaves the API unable to inspect or normalise content without a second fetch. Rejected.
- *Browser → API directly for uploads only*: needs CORS and a cookie relay across origins, and would be the one exception to a rule every other flow relies on. Rejected.

## R2. Crop semantics: original bytes plus a crop rectangle; the API crops

**Decision**: The client sends the untouched original file and four integer fields (`cropX`, `cropY`, `cropWidth`, `cropHeight`) expressed in *oriented* source pixels. The API auto-orients from EXIF, validates the rectangle against the oriented dimensions, extracts it, then resizes to the canonical rendition (R3). If no rectangle is supplied (no client JavaScript, or a plain form post), the API centre-crops to the target aspect.

**Rationale**:
- One lossy encode, done once, by one implementation. A canvas export in the browser followed by a server re-encode is two lossy passes and two sets of browser-specific quirks (WebP/alpha support in `canvas.toBlob`, colour management).
- The no-JavaScript path (a bare `<input type="file">` post) works and yields a sensible result, which keeps `useActionForm`'s progressive-enhancement promise.
- Browsers display images with EXIF orientation applied (`image-orientation: from-image` is the default), so the crop tool's pixel coordinates are already in oriented space; `sharp().rotate()` with no argument auto-orients into that same space before `extract()`. The two agree by construction.
- The original never leaves the request handler: after processing, only the rendition is written (FR-012).

**Alternatives considered**:
- *Client-side canvas crop and export*: smaller upload, but double compression, browser-dependent output, and a divergent no-JS path. Rejected. Noted as a future optimisation (downscale only, keep server crop) if upload weight ever matters.
- *Store the original and crop on read*: needs an on-the-fly image service in front of R2 (Cloudflare Image Resizing is a paid add-on) and violates FR-012. Rejected.

## R3. Image processing on the API with `sharp`

**Decision**: Add `sharp` to `apps/api` (version 0.35.x, already in the workspace lockfile as Next.js's optimiser dependency, so no new native build is introduced). Processing per upload:

1. Read metadata; accept only `format ∈ {jpeg, png, webp}`; anything else, or an unreadable buffer, fails with field error `file` / `IS_IMAGE`. SVG, GIF, HEIC, AVIF, BMP, TIFF are all rejected. Animated WebP: sharp decodes only the first frame unless `animated: true`, which satisfies the "single still frame" edge case.
2. Cap input at 40 megapixels (`limitInputPixels`) as decompression-bomb protection; a 12 MP phone photo is well inside.
3. `.rotate()` (auto-orient), `.extract(rect)` when supplied, then `.resize(w, h, { fit: 'cover', position: 'centre' })`.
4. Encode: **logo** → PNG, 512×512, alpha preserved (FR-013); **dish photo** → JPEG, 1600×1200 (4:3), quality 82, progressive, mozjpeg. Metadata is stripped (sharp's default when `withMetadata()` is not called).
5. Return `{ buffer, contentType, width, height }`.

**Rationale**: libvips is the standard for this job, fast enough that a 12 MP decode plus resize takes well under a second, and it is the only library needed for detection, orientation, cropping, resizing and encoding. Detecting the format from bytes rather than from the filename or `Content-Type` is what FR-010 requires.

**Alternatives considered**: `jimp` (pure JS, slow on large photos, no mozjpeg); `image-size` + `file-type` for detection only (would still need a resizer). Rejected.

## R4. Storage: an `ImageStorage` port with R2 and local-disk adapters

**Decision**: A small interface in `apps/api/src/images/storage/image-storage.ts`:

```ts
interface ImageStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(keys: string[]): Promise<void>;
  publicUrl(key: string): string;
  list(prefix: string): AsyncIterable<{ key: string; lastModified: Date }>; // sweep only
}
```

Two adapters, chosen at boot from the environment:

- **`R2ImageStorage`** using `@aws-sdk/client-s3` against R2's S3-compatible endpoint (`https://<accountId>.r2.cloudflarestorage.com`, region `auto`). Objects are written with `Cache-Control: public, max-age=31536000, immutable`. Public reads go through the bucket's public hostname (a custom domain such as `img.restaura.cz`, or the `*.r2.dev` development hostname). Configured by `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `IMAGE_PUBLIC_URL`. The five are all-or-nothing: a partial set fails boot with a readable message, matching `config/env.ts` conventions.
- **`LocalImageStorage`** writing under `apps/api/.images/` (git-ignored) and served by a tiny `GET /dev-images/*key` controller with the right `Content-Type` and the same cache header. Used when no R2 variables are set, so the feature is developable and testable offline, exactly as `RESEND_API_KEY` is optional for email. `IMAGE_PUBLIC_URL` then defaults to `http://localhost:<PORT>/dev-images`.

Object keys are `logos/<uuidv4>.png` and `dishes/<uuidv4>.jpg`: random, never derived from account, menu or item ids (FR-018). Every upload gets a fresh key and the previous object is deleted after the row is updated, so a replaced image is a new URL and no cache anywhere can serve a stale one (FR-019).

**Rationale**: R2 is the product owner's decision. The S3 client is what Cloudflare's own R2 documentation uses and the three operations needed (put, delete, list) are the most stable part of that API. The port exists so tests and local development do not need credentials, not as speculative abstraction: two adapters are used on day one.

**Alternatives considered**: `aws4fetch` (smaller, but hand-built XML for list/delete; bundle size is irrelevant on a server); Cloudflare Images (a separate paid product with its own variants pipeline; not what was asked for); serving files from the API itself in production (couples image bandwidth to API capacity). Rejected.

**Constitution note**: the API constitution says PostgreSQL is the system of record and "alternative datastores MUST NOT be introduced". Object storage for binary blobs is not a record store: every fact the system depends on (which image belongs to which dish, its dimensions) lives in Postgres, and R2 holds only bytes addressed by a key stored there. This plan treats that as compliant and recommends a PATCH-level clarification to the API constitution stating so.

## R5. Data model: nullable columns on the owning rows, no asset table, no reaper

**Decision**: Add `logo_key`, `logo_width`, `logo_height` to `restaurant_profile` and `image_key`, `image_width`, `image_height` to `menu_item`, all nullable, each triple guarded by a CHECK that they are all null or all set. Upload and attach happen in one request: the object is written first, then the row is updated in a single statement; if the update fails, the just-written object is deleted (compensation). On replace: write new object, update row, delete old object. On delete of an item, section, menu or profile: the service collects the affected keys inside the transaction, lets `ON DELETE CASCADE` remove rows, commits, then deletes the objects best-effort, logging any failure with the key.

A maintenance command, `node dist/images/sweep.js`, lists `logos/` and `dishes/` in storage, compares against the two columns, and deletes any unreferenced object older than 24 hours. It exists to converge after a crash between object write and row update, or a failed post-commit delete, and is what makes SC-006 ("zero orphans after 24 hours") true under failure.

**Rationale**: The spec's "Uploaded Image File" entity is always referenced by exactly one owner the moment it exists, so a separate table would only record what the owning row already says. FR-014's grace-period cleanup is satisfied trivially because there is no unattached state; the sweep handles the residual failure cases without a scheduler in the API process.

**Alternatives considered**: an `image_asset` table with a two-step upload/attach and a periodic reaper (rejected: adds a table, a job runner and an orphan state for a flow that does not need one); storing dimensions as constants instead of columns (rejected: changing a rendition size later would make `next/image` reserve the wrong box for existing images and cause layout shift).

## R6. API surface: dedicated multipart endpoints beside the JSON ones

**Decision**: Four new owner endpoints, all multipart or bodiless, so the existing JSON DTOs and their `AtLeastOneOf` rules stay untouched:

- `PUT /auth/profile/logo` (multipart `file` + optional crop fields) → `{ profile }`
- `DELETE /auth/profile/logo` → `{ profile }`
- `PUT /menus/:menuId/sections/:sectionId/items/:itemId/image` (multipart) → `{ item }`
- `DELETE /menus/:menuId/sections/:sectionId/items/:itemId/image` → `{ item }`

Multipart is handled by `@nestjs/platform-express`'s `FileInterceptor` (multer 2.x is already a dependency of that package; only `@types/multer` is added, dev-only). `limits.fileSize` is 10 MiB. Multer's size rejection surfaces as Nest's `PayloadTooLargeException` (413); `HttpErrorFilter` is extended to translate that into the contract's `400 VALIDATION_FAILED` with `details: [{ field: "file", code: "MAX_FILE_SIZE" }]`, so the form pins it to the image field like any other field error. Unsupported or unreadable content is `details: [{ field: "file", code: "IS_IMAGE" }]`. A crop rectangle outside the oriented image is `details: [{ field: "crop", code: "IS_CROP" }]`.

Because the global `ValidationPipe` runs with `enableImplicitConversion: false`, multipart text fields arrive as strings; the crop DTO uses `@Type(() => Number)` explicitly before `@IsInt()`/`@Min(0)`.

Response shapes gain an `ImageRef = { url, width, height } | null`: `profile.logo`, `item.image`, public `menu.logo`, public item `image`, and the public menu additionally carries `restaurantName` so the logo's text alternative can be the restaurant's name (FR-004). Full detail in `contracts/http-api-delta.md`.

**Alternatives considered**: folding the file into `PATCH …/items/:itemId` as multipart (rejected: turns every item update into multipart, breaks `enableImplicitConversion: false` for `priceCzk`, and mixes two failure domains in one request); a generic `POST /uploads` returning an id to attach later (rejected: reintroduces the orphan state R5 removes).

## R7. Owner UI: one `ImageField`, one `ImageCropDialog`, two hosts

**Decision**:
- `components/workspace/ImageField.tsx` (client): the reusable field. Shows the empty state ("Add photo"/"Upload logo", accepted formats, size limit), or the current image with **Replace** and **Remove**. Owns a visually hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`. On selection it pre-validates size (≤ 10 MiB) and sniffs the first bytes for JPEG/PNG/WebP magic numbers (the browser's `file.type` is extension-derived and not trustworthy), so an invalid file is refused before any upload (SC-004), then opens the crop dialog. The pending selection is held in component state as `{ file, crop }` with an object-URL preview drawn to match the crop.
- `components/workspace/ImageCropDialog.tsx` (client, loaded with `next/dynamic` only when opened): shadcn `Dialog` around `react-easy-crop` with `aspect` 1 (logo) or 4/3 (dish), `objectFit="cover"`-style bounds so no empty frame area is exposed, a shadcn `Slider` for zoom (added via the shadcn CLI), arrow-key nudging (`keyboardStep`), pinch and wheel zoom, Confirm and Cancel. The dialog returns `croppedAreaPixels` in source pixel coordinates (R2).
- **Logo host**: `components/settings/LogoField.tsx` on the profile settings page, above the existing `ProfileSettingsForm`, with its own two Server Actions (`uploadLogoAction`, `removeLogoAction`). Confirming the crop saves immediately (US1 AS3); it does not wait for the profile form's Save.
- **Dish host**: `ItemForm` gains the `ImageField` in the slot the mock already reserves. The selection travels in the same `FormData` as the text fields (`image` file, `cropX…`, or `removeImage=1`). `addItemAction` creates the dish (JSON) and then uploads the image; `updateItemAction` patches text (if changed), then uploads or deletes the image as requested. If the text save succeeds and the image step fails, the action returns a field error on `image` so the dish is saved and the form still shows what to retry (US3 AS8, FR-016). Cancelling the form discards the in-memory selection, so nothing was ever uploaded (US3 AS4).
- The editor's read-only `ItemRow` shows a small thumbnail when `item.image` is set and nothing when it is not (FR-009).

**Rationale**: One field component and one dialog satisfy the spec's "same tool for both" assumption and the reuse-before-creation rule. Keeping the logo save independent of the profile form matches the spec's immediate-save acceptance scenario and avoids turning the profile `PUT` into multipart.

**Alternatives considered**: putting the logo inside the profile form's submit (rejected: multipart profile `PUT`, and the spec wants the crop confirm to save); uploading dish photos the moment the crop is confirmed (rejected: a new dish has no id yet, and it recreates the orphan-on-cancel problem).

## R8. Crop tool library: `react-easy-crop`

**Decision**: Add `react-easy-crop` (≈ 8 KB gzipped) to `apps/frontend`, imported only inside `ImageCropDialog`, which is itself dynamically imported. It provides the exact interaction the spec describes (fixed frame, drag to reposition, zoom, bounds that never expose empty frame area), handles touch, pinch, wheel and arrow keys, and reports the crop in natural pixel coordinates.

**Rationale**: A hand-rolled cropper is a few hundred lines of pointer math plus pinch gestures, inertia, bounds clamping and keyboard handling, every one of which is a bug surface. The library is under the constitution's 20 KB per-route threshold and lands only on the owner's dashboard route, never on the guest page (PR-006).

**Alternatives considered**: hand-rolled with pointer events (rejected above); `react-image-crop` (draws a selection rectangle over a static image, the opposite UX); `cropperjs` (≈ 30 KB, imperative DOM API awkward under React 19). Rejected.

## R9. Guest delivery through `next/image` with a remote pattern

**Decision**: Stored renditions are referenced by absolute URL; `next.config.ts` adds `images.remotePatterns` for `IMAGE_PUBLIC_URL` (read at build time; defaults to the local-disk URL so the production build used by Playwright works offline). The existing `DishImage` and `MenuHeader`/`MenuCover` components already take an `ImageModel` and render `next/image` with explicit width/height; the adapter (`lib/menu-display/adapter.ts`) maps `ImageRef` onto `ImageModel` with `alt` set to the dish name or restaurant name. Next's optimiser resizes and re-encodes per viewport, which is how PR-002 is met, and `next/image` lazy-loads below-the-fold images by default (PR-003). `sizes` is set per dish layout so a phone requests a phone-width rendition.

FR-020 (a missing object must not show a broken image): `DishImage` and the header logo render through a very small client leaf, `components/menu/SafeImage.tsx`, that wraps `next/image` and swaps to the no-image presentation on `onError`. Verified: the Next docs state `onError` requires a Client Component. This is the only client JavaScript the feature adds to the guest page and is recorded in Complexity Tracking.

`dangerouslyAllowSVG` stays enabled for the sample menu's own SVG placeholders. User uploads can never be SVG (R3 rejects them at the API), and the remote pattern pins the optimiser to the one image host, so the config's "revisit if user-supplied images are ever served" note is answered and rewritten.

**Alternatives considered**: `unoptimized` images straight from R2 (rejected: fails PR-002 on phones and loses format negotiation); Cloudflare Image Resizing in front of the bucket (rejected: paid add-on and a second resizing implementation).

## R10. Limits and budgets

| Concern | Value | Where enforced |
|---|---|---|
| Accepted formats | JPEG, PNG, WebP by content | Browser sniff (courtesy), API `sharp` metadata (authority) |
| Max upload | 10 MiB | Browser check, multer `limits.fileSize`, Server Action `bodySizeLimit: '12mb'` (10 MiB + multipart overhead + fields) |
| Input pixel cap | 40 MP | `sharp({ limitInputPixels })` |
| Logo rendition | 512×512 PNG | API |
| Dish rendition | 1600×1200 JPEG q82 progressive | API |
| Delivered dish photo at 360–430 px viewport | ≤ 120 KB | `next/image` sizes + Playwright assertion on transferred bytes |
| Delivered logo | ≤ 40 KB | same |
| Guest page CLS | ≤ 0.1 with photos | explicit dimensions; Playwright layout-shift observer |
| Adjust step interactive | ≤ 2 s for a 12 MP file | browser decodes once into `<img>`; measured in e2e with a fixture |

## R11. Testing strategy

- **API unit** (`vitest run`): `image-processing.spec.ts` with tiny generated fixtures (sharp can create them in-test): rejects text, SVG and GIF bytes; honours EXIF orientation; preserves PNG alpha for logos; produces exact rendition sizes; centre-crops when no rectangle; rejects an out-of-bounds rectangle. `crop.dto` and the 413 → `MAX_FILE_SIZE` filter mapping.
- **API e2e** (`vitest run --config vitest.config.e2e.ts`, real Postgres): the test app overrides the `IMAGE_STORAGE` provider with an in-memory adapter so assertions can inspect stored keys. Covers: logo put/replace/delete (old key gone), item image put/replace/delete, cascade on item/section/menu delete removes keys, 401/404 ownership, `VALIDATION_FAILED` codes for size/type/crop, public payload carries `restaurantName`, `logo` and per-item `image`, keys are not derived from ids.
- **Frontend unit**: adapter maps `image`/`logo` to `ImageModel` with the right `alt`; `api-contract.test.ts` fixtures extended; `readImageUpload` form-data reader; magic-byte sniff helper.
- **Stories** (two passes, axe): `ImageField` (empty, with image, invalid-file error), `ImageCropDialog` with a fixture photo, `ItemForm` with an image, `LogoField`, `ItemRow` with thumbnail.
- **Playwright e2e** (production build, API on local-disk storage): upload logo via `setInputFiles` with a fixture JPEG, adjust with keyboard, confirm, reload persists; guest header shows the logo with `alt` = restaurant name; remove restores text-only header; add a dish photo, thumbnail appears, guest page shows it with `alt` = dish name while a photo-less dish is unchanged; a renamed `.txt` is refused with no network request; axe on the open dialog; CLS and transferred-bytes budgets on a menu with photos at 360 px.

## R12. Environment and configuration additions

`apps/api/.env.example`:

```
# Cloudflare R2. Leave all five unset locally: the API then stores images under
# apps/api/.images and serves them itself at /dev-images. Set all five in every
# deployed environment.
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET=restaura-images
# IMAGE_PUBLIC_URL=https://img.restaura.cz
```

`apps/frontend/.env.example`:

```
# Public base URL of uploaded images; must match the API's IMAGE_PUBLIC_URL.
# Read at build time for next/image's remote allowlist. Defaults to the API's
# local-disk route.
IMAGE_PUBLIC_URL=http://localhost:3001/dev-images
```

R2 bucket setup (one-time, documented in quickstart): create bucket, enable public access via a custom domain, create an API token scoped to that bucket with Object Read & Write.
