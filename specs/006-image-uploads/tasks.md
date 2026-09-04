# Tasks: Logo & Dish Image Uploads

**Input**: Design documents from `/specs/006-image-uploads/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R12), data-model.md, contracts/http-api-delta.md, contracts/image-upload-ui.md, quickstart.md

**Tests**: INCLUDED — the root, frontend and API constitutions make acceptance-scenario tests, two-sided contract tests, real-Postgres integration tests and the lint/message/token gates mandatory before merge.

**Organization**: Tasks are grouped by user story so each story is an independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US4)
- Every task names exact file paths

## Path Conventions

Monorepo per plan.md: API work under `apps/api/`, frontend work under `apps/frontend/`. API rules: strict TS, every external interaction has a defined failure behaviour, multi-row writes are transactional, constraints live in Postgres, DTOs validate at the boundary, integration tests run against real Postgres. Frontend rules: strict TS, all text via next-intl (cs+en+de in the same change), tokens only (no literal colours or arbitrary utilities in `components/` or `app/`), navigation from `@/i18n/navigation`, shadcn primitives only via the CLI, every new component gets a colocated `*.stories.tsx`, `useActionForm` is the one form pattern, forms keep working without client JavaScript. The browser never calls the API or the bucket.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, configuration and fixtures every later task relies on. Nothing user-visible changes.

- [X] T001 Add dependencies to `apps/api/package.json`: `sharp` (^0.35), `@aws-sdk/client-s3` (latest v3); dev `@types/multer`; add script `"images:sweep": "node dist/images/sweep.js"`; run `pnpm install` at the repo root and confirm `pnpm-lock.yaml` reuses the existing `sharp@0.35.4` entry
- [X] T002 [P] Add `react-easy-crop` to `apps/frontend/package.json` dependencies and run `pnpm install`; then add the shadcn slider primitive with `pnpm dlx shadcn@latest add slider` from `apps/frontend/` (creates `apps/frontend/components/ui/slider.tsx`; never hand-edit it)
- [X] T003 [P] Extend `apps/api/src/config/env.ts`: add `imageStorage: { kind: 'r2'; accountId; accessKeyId; secretAccessKey; bucket; publicUrl } | { kind: 'local'; directory: string; publicUrl: string }` to `Env`; read `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `IMAGE_PUBLIC_URL` as an all-or-nothing group (any subset set → throw a readable error naming the missing ones); when none set, `kind: 'local'` with `directory` = `<cwd>/.images` and `publicUrl` = `http://localhost:<port>/dev-images`; strip trailing slashes from `publicUrl`; unit-test the group rule in `apps/api/src/config/env.spec.ts` (new)
- [X] T004 [P] Document the storage variables in `apps/api/.env.example` per research R12 (commented-out block explaining that leaving all five unset stores under `apps/api/.images` and serves `/dev-images`); add `.images/` to `apps/api/.gitignore`
- [X] T005 [P] Document `IMAGE_PUBLIC_URL` in `apps/frontend/.env.example` per research R12 (build-time, must match the API's value, defaults to `http://localhost:3001/dev-images`)
- [X] T006 [P] Update `apps/frontend/next.config.ts`: add `experimental.serverActions.bodySizeLimit: "12mb"`; add `images.remotePatterns: [new URL(\`${(process.env.IMAGE_PUBLIC_URL ?? "http://localhost:3001/dev-images").replace(/\/$/, "")}/**\`)]`; rewrite the `dangerouslyAllowSVG` comment to state that user uploads are never SVG (the API rejects them by content) and that `remotePatterns` confines the optimiser to the one image host; keep `contentDispositionType` and the CSP
- [X] T007 [P] Create test fixtures in `apps/frontend/tests/fixtures/images/`: `dish-4x3.jpg` (≈ 1600×1200 photo-like JPEG, EXIF orientation 6 so the file is stored sideways), `logo-alpha.png` (600×400 PNG with a transparent background), `tiny.webp` (200×150), `not-an-image.png` (plain text bytes), plus `apps/frontend/tests/fixtures/images/generate.mjs` that writes `too-big.jpg` (> 10 MiB) on demand using `sharp` from the frontend's node_modules; add `too-big.jpg` to `apps/frontend/.gitignore`; write a short `README.md` in the folder describing each file
- [X] T008 [P] Create API test fixtures in `apps/api/test/fixtures/images.ts`: functions that build tiny buffers in-test with `sharp` — `jpegWithOrientation6(width, height)` (uses `.withMetadata({ orientation: 6 })`), `pngWithAlpha(width, height)`, `webp(width, height)`, `gif()` (a hand-written 1×1 GIF byte array), `svg()` (a small SVG string as bytes), `textBytes()`; export them for both unit and e2e suites

**Checkpoint**: `pnpm install` clean; `pnpm --filter api build` and `pnpm --filter frontend typecheck` green; `apps/frontend/components/ui/slider.tsx` exists.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, the API image module (processing, storage, dev route, error mapping), the frontend upload primitives (field, crop dialog, validation, adapter, error codes) and the contract mirror. After this phase nothing is wired to a screen yet, but every building block exists and is tested.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Schema and migration

- [X] T009 Extend `apps/api/src/db/schema.ts` per data-model.md: on `restaurantProfile` add `logoKey: text('logo_key')`, `logoWidth: integer('logo_width')`, `logoHeight: integer('logo_height')` and `check('restaurant_profile_logo_complete', …)` (all null, or key not null and both dimensions > 0); on `menuItem` add `imageKey`, `imageWidth`, `imageHeight` and `check('menu_item_image_complete', …)`; doc comments explain "an image is a property of the row it depicts; keys are random, never derived from ids"
- [X] T010 Generate the migration with `pnpm --filter api db:generate` → `apps/api/src/db/migrations/0004_*.sql` + `meta/0004_snapshot.json` + `_journal.json`; review the SQL adds six nullable columns and two CHECKs and nothing else; apply with `pnpm --filter api db:migrate` against the dev database

### API image module

- [X] T011 [P] Create `apps/api/src/images/storage/image-storage.ts`: `export const IMAGE_STORAGE = 'IMAGE_STORAGE'`; `export interface ImageStorage { put(key, body: Buffer, contentType): Promise<void>; delete(keys: string[]): Promise<void>; publicUrl(key): string; list(prefix): AsyncIterable<{ key: string; lastModified: Date }> }`; `export interface StoredObject` type for list entries; doc comment states the invariant "referenced by exactly one row while it exists"
- [X] T012 [P] Create `apps/api/src/images/keys.ts`: `newLogoKey(): \`logos/${randomUUID()}.png\``, `newDishKey(): \`dishes/${randomUUID()}.jpg\``, `LOGO_PREFIX`, `DISH_PREFIX`; unit test in `apps/api/src/images/keys.spec.ts` asserts the UUID shape and that two calls differ
- [X] T013 [P] Create `apps/api/src/images/storage/memory-image-storage.ts`: `MemoryImageStorage implements ImageStorage` backed by a `Map<string, { body, contentType, lastModified }>`, `publicUrl(key)` = `http://images.test/${key}`, exposes `keys(): string[]` and `has(key)` for tests
- [X] T014 [P] Create `apps/api/src/images/storage/local-image-storage.ts`: `LocalImageStorage(directory, publicUrl)` writes `<directory>/<key>` (creates parent dirs, rejects keys containing `..` or not matching `^(logos|dishes)/[0-9a-f-]{36}\.(png|jpg)$`), `delete` ignores ENOENT, `list` walks the prefix directory returning `mtime`, `publicUrl(key)` = `${publicUrl}/${key}`; unit test in `apps/api/src/images/storage/local-image-storage.spec.ts` using a temp dir (put/read back/delete/list/key rejection)
- [X] T015 [P] Create `apps/api/src/images/storage/r2-image-storage.ts`: `R2ImageStorage` using `S3Client({ region: 'auto', endpoint: \`https://${accountId}.r2.cloudflarestorage.com\`, credentials })`; `put` → `PutObjectCommand` with `ContentType` and `CacheControl: 'public, max-age=31536000, immutable'`; `delete` → `DeleteObjectsCommand` in chunks of 1000 (no-op on empty); `list` → paginated `ListObjectsV2Command`; `publicUrl(key)` = `${publicUrl}/${key}`; every SDK call wrapped so a failure rethrows an `Error` carrying the operation and key (never swallowed); unit test in `apps/api/src/images/storage/r2-image-storage.spec.ts` with the SDK client's `send` stubbed, asserting command inputs (bucket, key, cache header, chunking)
- [X] T016 [P] Create `apps/api/src/images/image-processor.ts` per research R3: `RENDITIONS = { logo: { width: 512, height: 512, format: 'png' }, dish: { width: 1600, height: 1200, format: 'jpeg' } }`; `export interface CropRect { x; y; width; height }`; `processImage(input: Buffer, kind: 'logo' | 'dish', crop?: CropRect): Promise<{ buffer; contentType; width; height }>` — `sharp(input, { limitInputPixels: 40_000_000 })`, `.rotate()`, read `metadata()` after orientation, throw `ImageRejected('IS_IMAGE')` unless `format ∈ {jpeg,png,webp}`, validate crop against oriented dims (throw `ImageRejected('IS_CROP')` on overflow/zero size), `.extract(crop)` when given, `.resize(w, h, { fit: 'cover', position: 'centre' })`, `.png()` for logo (alpha kept) or `.jpeg({ quality: 82, progressive: true, mozjpeg: true })` for dish; export `class ImageRejected extends Error { constructor(readonly code: 'IS_IMAGE' | 'IS_CROP', readonly field: 'file' | 'crop') }`; any other sharp error (corrupt data) is mapped to `IS_IMAGE`
- [X] T017 [P] Create `apps/api/src/images/image-processor.spec.ts` using `test/fixtures/images.ts`: rejects text, SVG and GIF bytes with `IS_IMAGE`; accepts JPEG/PNG/WebP; EXIF-6 JPEG comes out upright (assert output width/height and that a crop given in oriented coordinates selects the expected region by colour); logo output is 512×512 PNG with `hasAlpha` true when the input had alpha; dish output is 1600×1200 JPEG; no crop → centre crop; out-of-bounds crop → `IS_CROP`; metadata (EXIF) absent in output; input larger than 40 MP rejected with `IS_IMAGE`
- [X] T018 [P] Create `apps/api/src/images/dto/crop.dto.ts`: `CropDto` with `cropX`, `cropY`, `cropWidth`, `cropHeight` each `@IsOptional() @Type(() => Number) @IsInt() @Min(0 | 1)`; class-level custom validator `@AllOrNoneOf(['cropX','cropY','cropWidth','cropHeight'])` registered under property `crop` with constraint name `isCrop` (so it surfaces as `crop`/`IS_CROP`) — add the decorator to `apps/api/src/common/validators.ts` beside `AtLeastOneOf`; export `toCropRect(dto): CropRect | undefined`; unit test in `apps/api/src/images/dto/crop.dto.spec.ts` and extend `apps/api/src/common/validators.spec.ts` for `AllOrNoneOf`
- [X] T019 [P] Create `apps/api/src/images/upload.interceptor.ts`: `export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024`; `export function ImageUpload() { return UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }, storage: memoryStorage() })) }`; doc comment: multer buffers in memory, size is enforced by multer before the handler runs, content is verified by `processImage`
- [X] T020 Extend `apps/api/src/common/app-error.ts` and `apps/api/src/common/http-error.filter.ts`: add `AppError.fileRejected(field, code)` returning `VALIDATION_FAILED` with `details: [{ field, code, message }]`; in the filter, map `PayloadTooLargeException` (multer `LIMIT_FILE_SIZE`) to `400 VALIDATION_FAILED` with `details: [{ field: 'file', code: 'MAX_FILE_SIZE' }]` and map `ImageRejected` to `fileRejected(error.field, error.code)`; add a missing-file case (`file` undefined → `fileRejected('file', 'IS_IMAGE')`) helper `requireFile(file)`; unit test the filter branches in `apps/api/src/common/http-error.filter.spec.ts` (new)
- [X] T021 Create `apps/api/src/images/dev-images.controller.ts`: `@Controller('dev-images')` with `@Get('*key')` that validates the key with the same regex as `LocalImageStorage`, streams the file with `Content-Type` from the extension, `Cache-Control: public, max-age=31536000, immutable`, `404 NOT_FOUND` when missing; registered only when `env.imageStorage.kind === 'local'`
- [X] T022 Create `apps/api/src/images/images.module.ts`: `@Global()` (or exported) module providing `IMAGE_STORAGE` via `useFactory` on `loadEnv().imageStorage` (`R2ImageStorage` or `LocalImageStorage`), exporting `IMAGE_STORAGE`; controllers `[DevImagesController]` only for the local kind (use `ImagesModule.forRoot()` static returning a `DynamicModule`); import it in `apps/api/src/app.module.ts`
- [X] T023 Extend `apps/api/test/app.factory.ts`: `.overrideProvider(IMAGE_STORAGE).useValue(new MemoryImageStorage())` and expose `storage: MemoryImageStorage` on `TestApp`; `reset()` also clears the storage map; extend `apps/api/test/helpers.ts` with `uploadImage(testApp, cookie, path, buffer, crop?)` that builds the supertest multipart request (`.attach('file', buffer, 'photo.jpg')` and `.field('cropX', …)`)

### Contract and shared frontend types

- [X] T024 [P] Mirror `specs/006-image-uploads/contracts/http-api-delta.md` into `specs/001-menu-creation-publishing/contracts/http-api.md`: `ImageRef` type, the three new field codes, `profile.logo`, `PUT/DELETE /auth/profile/logo`, `item.image`, `PUT/DELETE …/items/:itemId/image`, duplicate leaves `image: null`, public `restaurantName`/`logo`/`image`, and a note that `/dev-images` is development-only
- [X] T025 [P] Extend `apps/frontend/lib/api/types.ts`: `export interface ImageRef { url: string; width: number; height: number }`; `RestaurantProfile.logo: ImageRef | null`; `MenuItemView.image: ImageRef | null`; `PublicMenuItem.image: ImageRef | null`; `PublicMenu.restaurantName: string; logo: ImageRef | null`; `FieldErrorCode` += `"MAX_FILE_SIZE" | "IS_IMAGE" | "IS_CROP"`; update the header comment to cite the 006 delta
- [X] T026 [P] Extend `apps/frontend/tests/unit/api-contract.test.ts`: account/profile fixture gains `logo: null` and a second fixture with a full `ImageRef`; menu detail item fixture gains `image`; public menu fixture gains `restaurantName`, `logo`, per-item `image` (one set, one `null`); `toFormState` maps a `details` entry `{ field: "file", code: "MAX_FILE_SIZE" }` to `fields.file`
- [X] T027 [P] Extend `apps/frontend/lib/api/client.ts`: `ApiRequest.body` may be a `FormData`; when it is, send it as-is with **no** `Content-Type` header (fetch sets the multipart boundary) and no `JSON.stringify`; doc comment explains the relay; keep JSON behaviour unchanged for every other body
- [X] T028 [P] Create `apps/frontend/lib/validation/image.ts`: `MAX_IMAGE_BYTES = 10 * 1024 * 1024`, `ACCEPTED_IMAGE_TYPES = ["image/jpeg","image/png","image/webp"]`, `ACCEPT_ATTRIBUTE`, `export interface CropRect { x; y; width; height }`, `sniffImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | null` (JPEG `ff d8 ff`, PNG `89 50 4e 47 0d 0a 1a 0a`, WebP `RIFF????WEBP`), `validateImageFile(file: File): Promise<FieldErrorCode | null>` (size → `MAX_FILE_SIZE`, sniff of the first 16 bytes → `IS_IMAGE`), `isCropRect(value): value is CropRect`
- [X] T029 [P] Extend `apps/frontend/lib/validation/form-data.ts`: `readImageUpload(formData): { ok: true; value: { kind: "none" } | { kind: "remove" } | { kind: "replace"; file: File; crop?: CropRect } } | { ok: false; state: FormState }` — `removeImage === "1"` → remove; `image instanceof File && size > 0` → validate with `validateImageFile` and read the four crop fields as an all-or-none group (partial or non-integer → `IS_CROP`); failures produce `FormState` with `fields: { image: code }`
- [X] T030 [P] Extend `apps/frontend/lib/validation/form-values.ts`: `itemFormData(values, hidden, image?: PendingImage)` appends `image` + `cropX…cropHeight` for `replace` or `removeImage=1` for `remove`; add `logoFormData(file, crop, context)`; export the `PendingImage` type from `apps/frontend/lib/validation/image.ts` (`{ kind: "keep" } | { kind: "remove" } | { kind: "replace"; file; crop; previewUrl }`)
- [X] T031 [P] Create `apps/frontend/tests/unit/image-validation.test.ts`: `sniffImageType` on each fixture from `tests/fixtures/images/` and on random bytes; `validateImageFile` returns `MAX_FILE_SIZE` for an 11 MiB `File`, `IS_IMAGE` for `not-an-image.png`, `null` for `tiny.webp`; `readImageUpload` returns `none`/`remove`/`replace` correctly, rejects a partial crop group with `IS_CROP`, ignores `removeImage` when a file is present; `itemFormData` appends the expected parts
- [X] T032 [P] Extend `apps/frontend/lib/menu-display/adapter.ts`: `toImageModel(ref: ImageRef | null | undefined, alt: string): ImageModel | undefined`; `toDisplayMenu` sets `establishment: { name: menu.name, logo: toImageModel(menu.logo, menu.restaurantName) }` and `item.image = toImageModel(item.image, item.name)` (omit the key when undefined); extend `apps/frontend/tests/unit/menu-display-adapter.test.ts`: logo alt is the restaurant name, dish alt is the dish name, `null` and `undefined` both yield no image, width/height carried through

### Frontend upload primitives

- [X] T033 Add message namespaces to `apps/frontend/messages/en.json`, `cs.json`, `de.json` per contracts/image-upload-ui.md §6: `ImageField` (`addPhoto`, `uploadLogo`, `replace`, `remove`, `hint`, `pendingPhoto`, `pendingLogo`, `removedPending`, `previewLabel`), `ImageCrop` (`title`, `instructions`, `zoom`, `confirm`, `cancel`, `dragHint`); add `MAX_FILE_SIZE`, `IS_IMAGE`, `IS_CROP` to `MenuEditor.fieldErrors`; add `Settings.fieldErrors` with the same three keys plus `Settings.logoSection`, `logoDescription`, `logoSaved`, `logoRemoved`, `removeLogoTitle`, `removeLogoBody`, `removeLogoConfirm`; add `MenuEditor.itemPhoto`, `itemPhotoThumb`; run `node scripts/check-messages.mjs` from `apps/frontend/`
- [X] T034 Create `apps/frontend/components/workspace/ImageCropDialog.tsx` (client) per contracts/image-upload-ui.md §3: shadcn `Dialog` (`DialogContent`, `DialogTitle`, `DialogDescription`), `react-easy-crop` `<Cropper image={objectUrl} crop zoom aspect restrictPosition zoomWithScroll onCropChange onZoomChange onCropComplete={(area, pixels) => setPixels(pixels)} keyboardStep={5} />`, shadcn `Slider` for zoom (1–4, step 0.01) with a visible label from `ImageCrop.zoom`, Confirm/Cancel buttons, `Escape` cancels; creates and revokes the object URL in an effect; exports `ImageCropDialogProps`; all copy from the `ImageCrop` namespace; only tokens for styling; the frame area uses `aspect-square` / a `4/3` box via existing utilities
- [X] T035 [P] Create `apps/frontend/components/workspace/ImageCropDialog.stories.tsx`: story loads `tests/fixtures/images/dish-4x3.jpg` as a `File` via `fetch` of a static import, opens the dialog with `aspect: 4/3`; play test asserts the dialog is labelled, the zoom slider has an accessible name, arrow keys move the crop (crop state changes), Confirm calls `onConfirm` with positive integer width/height; second story with `aspect: 1` and `logo-alpha.png`
- [X] T036 Create `apps/frontend/components/workspace/ImageField.tsx` (client) per contracts/image-upload-ui.md §3: props `kind`, `current`, `onChange`, `idPrefix`, `error`, `disabled`, `previewAlt`; visually hidden `<input type="file" accept={ACCEPT_ATTRIBUTE}>` triggered by a real `<Button>`; on change → `validateImageFile` → set local error (translated via the host's `fieldErrors`) or open `ImageCropDialog` (imported with `next/dynamic`, `ssr: false`); on confirm → build `previewUrl` (object URL) and call `onChange({ kind: "replace", file, crop, previewUrl })`; filled state shows the preview `<img>` (plain `<img>` for object URLs, `next/image` for `current`) with **Replace** and **Remove** buttons; `remove` → `onChange({ kind: "remove" })`; `role="status"` line announces pending/removed; revokes object URLs on unmount; empty state shows `ImageField.hint`; the field uses `Field`/`FieldLabel`/`FieldDescription`/`FieldError` from `components/ui/field`
- [X] T037 [P] Create `apps/frontend/components/workspace/ImageField.stories.tsx`: stories `EmptyDish`, `EmptyLogo`, `WithCurrentImage` (a fixture `ImageModel`), `InvalidFile` (play test sets `not-an-image.png` on the input and asserts the `IS_IMAGE` message renders and no dialog opens), `Pending` (after confirming the dialog, preview and Replace/Remove render, `onChange` called with `replace`), `Removed` (Remove → `onChange({ kind: "remove" })`); axe passes in both passes
- [X] T038 [P] Create `apps/frontend/components/menu/SafeImage.tsx` (client, tiny): `type SafeImageProps = ImageProps & { fallback: React.ReactNode }`; renders `next/image`, tracks `failed` state via `onError`, renders `fallback` when failed; doc comment cites the Next docs note that `onError` needs a Client Component and states this is the only client leaf the feature adds to the guest page; story `apps/frontend/components/menu/SafeImage.stories.tsx` with a `src` that 404s asserting the fallback renders

**Checkpoint**: `pnpm --filter api test` green (processor, crop dto, validators, filter, keys, local + r2 storage); `pnpm --filter api test:e2e` still green (migration applies from empty; existing shapes untouched); `pnpm --filter frontend lint`, `typecheck`, `test:unit`, `test:stories` green. No screen has changed yet.

---

## Phase 3: User Story 1 - Owner Uploads and Adjusts a Logo (Priority: P1) 🎯 MVP

**Goal**: From Settings → Restaurant, an owner picks an image, frames it in a square, confirms, and the logo is saved and shown in the workspace; Replace and Remove work; invalid files and failures are reported inline; only the owner can change it.

**Independent Test**: Sign in, open profile settings, upload `logo-alpha.png`, adjust with drag/zoom (and with arrow keys), confirm, reload: the saved logo shows the chosen framing and the sidebar shows it. Remove it: the empty state and the text name return. Pick `not-an-image.png` or `too-big.jpg`: refused inline with no network request.

### API

- [X] T039 [US1] Extend `apps/api/src/auth/auth.service.ts`: `PublicProfile.logo: ImageRef | null` (define `export interface ImageRef { url; width; height }` in `apps/api/src/images/image-ref.ts` and a `toImageRef(storage, key, width, height)` helper); `getProfile`/`upsertProfile`/sign-up/sign-in selects and maps the logo columns (upsert must not touch them: use `set: { restaurantName, phones, location, updatedAt }` explicitly); add `setLogo(accountId, file: Buffer, crop?: CropRect): Promise<PublicProfile>` — require the profile row (`AppError.notFound()` if none), `processImage(file, 'logo', crop)`, `storage.put(newKey)`, single `UPDATE … RETURNING` old key, on update failure `storage.delete([newKey])` best-effort then rethrow, after success `storage.delete([oldKey])` best-effort with `Logger.error` on failure; add `removeLogo(accountId): Promise<PublicProfile>` (idempotent; `UPDATE … SET null RETURNING` old key, then best-effort delete); inject `IMAGE_STORAGE`
- [X] T040 [US1] Extend `apps/api/src/auth/auth.controller.ts`: `@Put('profile/logo') @UseGuards(SessionGuard) @ImageUpload()` with `@UploadedFile() file: Express.Multer.File | undefined` and `@Body() crop: CropDto` → `requireFile(file)` → `{ profile: await this.auth.setLogo(account.id, file.buffer, toCropRect(crop)) }`; `@Delete('profile/logo') @HttpCode(200) @UseGuards(SessionGuard)` → `{ profile: await this.auth.removeLogo(account.id) }`; doc comments state why email verification is not required (the logo follows the profile, editable before verification)
- [X] T041 [US1] Create `apps/api/test/images.e2e-spec.ts` (logo section): `PUT /auth/profile/logo` with `pngWithAlpha` → `200`, `profile.logo` has `url` starting with `http://images.test/logos/`, `width === 512`, `height === 512`, and the key exists in `testApp.storage`; a second upload replaces (new key present, old key gone); with crop fields → `200` and the rendition differs from the uncropped one; partial crop group → `400` with `details[0].field === 'crop'`, `code === 'IS_CROP'`; out-of-bounds crop → `IS_CROP`; `textBytes`/`svg()`/`gif()` → `400` `file`/`IS_IMAGE`; an 11 MiB buffer → `400` `file`/`MAX_FILE_SIZE`; missing file → `400` `file`/`IS_IMAGE`; no session → `401`; a profile-less account (`signUpWithoutProfile`) → `404`; `DELETE /auth/profile/logo` → `200`, `logo: null`, key removed; second `DELETE` still `200`; `GET /auth/me` echoes `logo`; the stored key contains neither the account id nor the email
- [X] T042 [P] [US1] Extend `apps/api/test/profile.e2e-spec.ts`: existing `GET /auth/me` and `PUT /auth/profile` assertions expect `logo: null`; `PUT /auth/profile` with `logo` in the body → `400 VALIDATION_FAILED` (whitelist); `PUT /auth/profile` after a logo was set leaves `logo` unchanged

### Frontend

- [X] T043 [US1] Extend `apps/frontend/lib/api/actions/auth.ts`: `uploadLogoAction(_prev, formData): Promise<FormState>` — `toLocale`, `readImageUpload` (must be `replace`; `none`/`remove` → `INVALID` on `image`), build a `FormData` with `file` + crop fields, `apiRequest<ProfileResponse>("/auth/profile/logo", { method: "PUT", body })`, on error `toFormState`, then `revalidatePath` for `/${locale}/workspace/settings/profile` and `/${locale}/workspace` (layout + sidebar), return `SAVED`; `removeLogoAction(_prev, formData)` — `DELETE /auth/profile/logo`, same revalidation
- [X] T044 [US1] Create `apps/frontend/components/settings/LogoField.tsx` (client) per contracts/image-upload-ui.md §3: props `logo: ImageRef | null`, `restaurantName`, `uploadAction`, `removeAction`, `locale`; renders a section heading `Settings.logoSection` + `logoDescription`; hosts `ImageField kind="logo"` with `current = toImageModel(logo, restaurantName)`; on `onChange` `replace` → immediately submit `uploadLogoAction` via `useActionState` inside `startTransition` with `logoFormData(file, crop, { locale })`; `remove` → open `ConfirmDialog` (`removeLogoTitle/Body/Confirm`) whose action is `removeLogoAction`; toasts `Settings.logoSaved` / `logoRemoved` on success; field-level errors translated with `Settings.fieldErrors`, summary with `Auth.errors`; pending state disables the field and shows `Settings.saving`
- [X] T045 [P] [US1] Create `apps/frontend/components/settings/LogoField.stories.tsx`: `Empty`, `WithLogo`, `UploadSucceeds` (stub action resolves `SAVED`; play test picks the fixture, confirms the dialog, asserts the toast/`role="status"` text), `UploadRejected` (stub returns `fields: { image: "IS_IMAGE" }`; error shown under the field), `RemoveConfirms` (Remove → dialog → confirm → stub called); both passes with axe
- [X] T046 [US1] Update `apps/frontend/app/[locale]/workspace/settings/profile/page.tsx`: render `<LogoField logo={profile.logo} restaurantName={profile.restaurantName} uploadAction={uploadLogoAction} removeAction={removeLogoAction} locale={locale} />` above `ProfileSettingsForm` inside a `flex flex-col gap-10` wrapper
- [X] T047 [P] [US1] Show the logo in the workspace: extend `apps/frontend/components/dashboard/DashboardSidebar.tsx` with an optional `logo?: ImageModel` prop rendered as a `size-8 rounded-md object-cover` `next/image` beside the restaurant name (nothing rendered when absent); pass `toImageModel(profile.logo, profile.restaurantName)` from `apps/frontend/app/[locale]/workspace/layout.tsx`; update `apps/frontend/components/dashboard/DashboardSidebar.stories.tsx` with a `WithLogo` story
- [X] T048 [US1] Create `apps/frontend/tests/e2e/images.spec.ts` (logo section) using a new `uploadImage(page, inputLabel, fixturePath)` helper added to `apps/frontend/tests/e2e/helpers/owner.ts` (`setInputFiles` on the hidden input located via its label button, then waits for the crop dialog): signs up, opens `/cs/workspace/settings/profile`, uploads `logo-alpha.png`, presses `ArrowRight` ×3 and drags the zoom slider, confirms; asserts the success status text, the preview `img` with `alt` = restaurant name, the sidebar `img`; reloads and asserts the logo persists; **Replace** with `tiny.webp` → preview `src` changes; **Remove** → confirm → empty state and no sidebar `img`; `not-an-image.png` → `IS_IMAGE` message visible and `page.waitForRequest` with a 1 s timeout proves no POST was made; `too-big.jpg` (generated by `tests/fixtures/images/generate.mjs` in a `beforeAll`) → `MAX_FILE_SIZE` message, no request; axe (`@axe-core/playwright`) on the page with the crop dialog open reports no violations; the whole logo flow is repeated keyboard-only (Tab to the upload button, Enter, `setInputFiles`, arrow keys, Tab to Confirm, Enter)
- [X] T049 [P] [US1] Extend `apps/frontend/tests/e2e/settings.spec.ts`: the profile tab shows the logo section heading and the upload button in `cs`; saving the profile form after a logo exists keeps the logo visible

**Checkpoint**: `pnpm --filter api test:e2e` (images + profile) green; `pnpm --filter frontend test:stories` and `test:e2e images.spec.ts settings.spec.ts` green. An owner can set, replace and remove a logo and see it in the workspace. Guests do not see it yet.

---

## Phase 4: User Story 2 - Guests See the Logo (Priority: P1)

**Goal**: A published menu shows the restaurant logo in the header and cover in every visual style, sharp on high-density screens, with the restaurant name as its text alternative; without a logo the header is exactly as today; replacing or removing shows on the next guest load.

**Independent Test**: Publish a menu for an account with a logo, open `/cs/m/<slug>` in a fresh context at 360 px: the header `img` has `alt` = restaurant name and a `src` under the image host. Remove the logo, reload: no `img`, text name only. Repeat across the six styles in both appearances.

- [X] T050 [US2] Extend `apps/api/src/menus/menus.service.ts` `getPublicMenu`: join `restaurantProfile` on `menu.accountId` to select `restaurantName`, `logoKey`, `logoWidth`, `logoHeight`; `PublicMenuView` gains `restaurantName: string` and `logo: ImageRef | null` (via `toImageRef`); inject `IMAGE_STORAGE`; use an inner join, since every published menu belongs to an account with a profile (publishing requires a verified, complete account) and a menu without one is served as `404 NOT_FOUND` like any other unpublishable menu; document that reasoning in a comment
- [X] T051 [P] [US2] Extend `apps/api/test/images.e2e-spec.ts` (public section): after setting a logo and publishing, `GET /public/menus/:slug` carries `restaurantName === PROFILE.restaurantName` and `logo` with the 512×512 `ImageRef`; after `DELETE /auth/profile/logo` the same request carries `logo: null`; the payload still has no `id`, no key, no timestamps; extend `apps/api/test/publish.e2e-spec.ts` shape assertion with `restaurantName` and `logo: null`
- [X] T052 [US2] Route the logo through `SafeImage` in `apps/frontend/components/menu/MenuHeader.tsx` and `apps/frontend/components/menu/MenuCover.tsx`: replace the `next/image` logo nodes with `<SafeImage … fallback={null} sizes="80px" priority />` keeping the existing classes per layout, so a missing object leaves the text name alone; confirm every one of the six header layouts still positions the logo per its recipe (no new layout work)
- [X] T053 [P] [US2] Extend `apps/frontend/components/menu/MenuHeader.stories.tsx` and `MenuCover.stories.tsx`: a `WithLogo` story per header layout using the fixture logo `ImageModel` with `alt` set to a restaurant name; play test asserts `getByRole("img", { name })`; a `LogoMissing` story with a 404 `src` asserts no `img` remains and the name is still a heading
- [X] T054 [US2] Extend `apps/frontend/tests/e2e/images.spec.ts` (guest logo section) and `apps/frontend/tests/e2e/public-menu.spec.ts`: sign up, upload the logo, create and publish a menu, open the public address in a new context at 360×780: header `img` has `alt` = restaurant name, `src` starts with `/_next/image?url=` and the decoded `url` starts with `http://localhost:3001/dev-images/logos/`, natural size is served at ≥ 2× the CSS box (sharp on high density); `chooseStyle` through each of the six styles reloading the guest page each time and asserting the logo `img` is present and axe passes in light and dark (`page.emulateMedia({ colorScheme })`); remove the logo, reload the guest page → no `img` in the header, heading text unchanged; transferred bytes of the logo response ≤ 40 KB
- [X] T055 [P] [US2] Extend `apps/frontend/tests/e2e/sample-menu.spec.ts` (or confirm existing coverage): the fixture establishment already has a logo; assert the header `img` is present in every theme × appearance loop so the logo slot is proven in all six styles without needing an uploaded file

**Checkpoint**: Guests see the logo (or the text name) in every style and appearance; the API public payload carries `restaurantName` and `logo`; all API and frontend suites green.

---

## Phase 5: User Story 3 - Owner Adds a Photo to a Dish (Priority: P2)

**Goal**: In the dish form, the owner adds, replaces or removes a 4:3 photo with the same crop tool; the selection is saved with the dish; cancelling uploads nothing; deleting a dish, section or menu removes the stored photo; the editor shows a thumbnail only where a photo exists.

**Independent Test**: Open a menu, edit a dish, pick `dish-4x3.jpg` (sideways file, upright in the dialog), adjust, confirm, save; the row shows a thumbnail; reload persists; Replace and Remove work through the edit form; choosing a file then cancelling the edit leaves the dish without a photo and (API test) no key in storage; deleting the dish removes its key.

### API

- [X] T056 [US3] Extend `apps/api/src/menus/menus.service.ts` (items): `ItemView.image: ImageRef | null`; every item select (`getMenuDetail`, `addItem`, `duplicateItem`, `updateItem`, `itemsOfSection`) selects `imageKey/imageWidth/imageHeight` and maps via `toImageRef`; `duplicateItem` inserts with image columns `null` (comment: the copy starts without a photo so two rows never share a key); add `setItemImage(accountId, menuId, sectionId, itemId, file: Buffer, crop?: CropRect): Promise<ItemView>` (ownership chain, `processImage(file, 'dish', crop)`, `storage.put`, transactional `UPDATE … RETURNING` old key + `touchMenu`, compensation on failure, best-effort delete of the old key after commit) and `removeItemImage(...)` (idempotent); in `deleteItem`, `deleteSection` and `deleteMenu` select the affected `image_key`s inside the transaction before deleting, then `storage.delete(keys)` best-effort after commit with `Logger.error` on failure
- [X] T057 [US3] Extend `apps/api/src/menus/menus.controller.ts`: `@Put(':menuId/sections/:sectionId/items/:itemId/image') @ImageUpload()` with `@UploadedFile()` + `@Body() crop: CropDto` → `requireFile` → `{ item: await this.menus.setItemImage(…, file.buffer, toCropRect(crop)) }`; `@Delete(':menuId/sections/:sectionId/items/:itemId/image') @HttpCode(200)` → `{ item: await this.menus.removeItemImage(…) }`; both inherit the controller's `SessionGuard, VerifiedGuard`
- [X] T058 [US3] Extend `apps/api/test/images.e2e-spec.ts` (dish section): `PUT …/image` with `jpegWithOrientation6(1200, 1600)` → `200`, `item.image` is `1600×1200` with `url` under `dishes/`, key present in storage, output orientation upright (decode the stored buffer with `sharp` and assert `width > height`); replace → old key gone; `DELETE …/image` → `200` `image: null`, key gone; second `DELETE` still `200`; `IS_IMAGE`, `MAX_FILE_SIZE`, `IS_CROP` cases; owner B on owner A's item → `404`; unverified account → `403 EMAIL_UNVERIFIED`; no session → `401`; `POST …/duplicate` of a photographed dish yields `image: null` and leaves the original's key intact; `DELETE` item removes its key; `DELETE` section removes every item key beneath; `DELETE` menu removes every key beneath; `PATCH …/items/:itemId` with `image` in the body → `400` (whitelist)
- [X] T059 [P] [US3] Extend `apps/api/test/menus.e2e-spec.ts`: every existing `item` shape assertion expects `image: null`

### Frontend

- [X] T060 [US3] Extend `apps/frontend/lib/api/actions/menus.ts` per contracts/image-upload-ui.md §1: in `addItemAction` — `readItem`, then `readImageUpload`; on image validation failure return its state without any request; `POST` the item; if `replace`, `PUT …/items/${item.id}/image` with a multipart `FormData`; if that fails return `{ status: "error", code: "VALIDATION_FAILED", fields: { image: <code from details or "INVALID"> } }` (the dish exists; the form stays open); in `updateItemAction` — patch text only when a text field is present, then `PUT …/image` for `replace` or `DELETE …/image` for `remove`, same error handling; both `revalidateEditor` and revalidate `/${locale}/m/${slug}` when the menu is published (fetch the detail response's `publicSlug`)
- [X] T061 [US3] Extend `apps/frontend/components/workspace/ItemForm.tsx`: accept `currentImage?: ImageModel` in `defaults`; hold `const [image, setImage] = useState<PendingImage>({ kind: "keep" })`; render `<ImageField kind="dish" current={defaults?.currentImage ?? null} previewAlt={form.watch("name") || t("itemPhoto")} idPrefix error={fieldCode(errors.image?.message)} onChange={setImage} />` between description and price; pass `image` into `itemFormData(values, hidden, image)`; on success reset `image` to `keep` and revoke any preview URL; `onCancel` also resets `image` (nothing was uploaded); the schema gains an optional `image` field of type `unknown` in `menuItemFormSchema` only so `setError("image", …)` is typed — the value never goes through zod
- [X] T062 [P] [US3] Extend `apps/frontend/components/workspace/ItemRow.tsx`: when `item.image` is set render a `next/image` thumbnail (`width={64} height={48}`, `sizes="64px"`, `className="rounded-md object-cover"`, `alt={item.name}`) before the text block; nothing image-related otherwise; pass `currentImage: toImageModel(item.image, item.name)` into the edit form's `defaults`
- [X] T063 [P] [US3] Stories: extend `apps/frontend/components/workspace/ItemForm.stories.tsx` (create if missing) with `AddWithPhoto` (play test picks the fixture, confirms, submits, asserts the stub action received a `FormData` containing `image` and the four crop fields), `EditRemovePhoto` (Remove → submit → `removeImage=1`), `ImageRejectedByServer` (stub returns `fields: { image: "IS_IMAGE" }` → error under the image field, other fields keep their values); extend `apps/frontend/components/workspace/ItemRow.stories.tsx` (create if missing) with `WithThumbnail` and `WithoutThumbnail`; replace the `Skeleton` in `apps/frontend/components/menu/forms/EditDishFormMock.tsx` with `ImageField kind="dish"` so the design-system docs show the real control; both passes with axe
- [X] T064 [US3] Extend `apps/frontend/tests/e2e/images.spec.ts` (dish section) and `apps/frontend/tests/e2e/menu-editor.spec.ts`: extend `addItem` in `helpers/owner.ts` with an optional `photo` fixture path that goes through `uploadImage`; add a dish with `dish-4x3.jpg` → the row shows an `img` with `alt` = dish name; the crop dialog showed the photo upright (assert the cropper image's rendered aspect is portrait-corrected: `naturalWidth > naturalHeight` after orientation is impossible to read directly, so assert the confirmed crop produced a landscape thumbnail whose `src` decodes with `width > height` via `/_next/image` metadata request); reload persists; Edit → Replace with `tiny.webp` → thumbnail `src` changes; Edit → Remove → save → no `img`; Edit → pick a file → Cancel → no request was made and no `img`; add a second dish without a photo → no `img` and no placeholder in its row; delete the photographed dish → its `/dev-images/dishes/*` URL now returns 404 from the API (proves the object was removed); keyboard-only path for adding a photo; axe on the editor with the dialog open

**Checkpoint**: Dish photos can be added, replaced and removed from the editor; cancel leaves nothing; deletes clean storage; all API and frontend suites green. Guests do not see dish photos yet.

---

## Phase 6: User Story 4 - Guests See Dish Photos (Priority: P2)

**Goal**: A published menu shows photos on the dishes that have them in the shape each visual style defines, lazy below the fold, sized for the viewport, with zero layout shift; photo-less dishes render exactly as before; unavailable-state markers remain distinct.

**Independent Test**: Publish a menu with a mix of photographed and plain dishes; open at 360 px on a throttled connection: photos appear on the right dishes at a consistent 4:3 shape, no layout shift while scrolling, plain dishes unchanged; repeat across the six styles in both appearances; a photo whose object is missing falls back to the placeholder.

- [X] T065 [US4] Extend `apps/api/src/menus/menus.service.ts` `getPublicMenu`: select `imageKey/imageWidth/imageHeight` in the item join; `PublicMenuItem.image: ImageRef | null`; extend `apps/api/test/images.e2e-spec.ts` (public section): a published menu with one photographed and one plain dish returns `image` set and `null` respectively, `url` under `dishes/`, no keys or ids anywhere in the payload
- [X] T066 [US4] Route dish photos through `SafeImage` in `apps/frontend/components/menu/DishImage.tsx`: both the `4/3` and the boxed branches render `<SafeImage … fallback={<placeholder box />} />` reusing the existing placeholder markup (factor it into a local `Placeholder` component); default `sizes` per `aspect`/layout: `"(min-width: 768px) 33vw, 100vw"` for cards and `"96px"` for the row thumbnail; keep `priority` for the first above-the-fold card; extend `apps/frontend/components/menu/DishImage.stories.tsx` with `MissingObject` (404 `src` → placeholder renders, no `img`)
- [X] T067 [P] [US4] Verify `apps/frontend/components/menu/GuestMenu.tsx` renders photographed items as cards where `presentation.cards` says so and rows elsewhere (the adapter now supplies `item.image`, so `usesCards`/`DishCard` paths activate); confirm `DishRow` shows a thumbnail only when the layout supports one; add a `WithPhotos` story to `apps/frontend/components/menu/GuestMenu.stories.tsx` (create if missing) rendering a mixed menu under each presentation; play test asserts `img` count equals the number of photographed dishes and every `img` has `alt` = its dish name; both passes with axe, including an unavailable photographed dish keeping its `AvailabilityBadge` text
- [X] T068 [US4] Extend `apps/frontend/tests/e2e/images.spec.ts` (guest photos section) and `apps/frontend/tests/e2e/public-menu.spec.ts`: publish a menu with three photographed dishes and two plain ones; open at 360×780 in a new context: `img` count = 3, each `alt` = dish name, plain dishes have no `img` and no placeholder; install a `PerformanceObserver` for `layout-shift` before navigation (via `page.addInitScript`), scroll to the bottom, assert cumulative CLS ≤ 0.1; assert the first photo's `<img>` has no `loading="lazy"` and the last has `loading="lazy"`; via `page.on("response")` assert each `/_next/image` response for a dish photo transfers ≤ 120 KB; loop the six styles (`chooseStyle` + reload) asserting `img` count and axe in light and dark; delete the stored file for one dish under `apps/api/.images/dishes/` (fs from the test) and reload → that dish shows the placeholder box (`data-slot="dish-image"` without an `img`) and the page has no broken image (`naturalWidth === 0` on any `img` fails the test)
- [X] T069 [P] [US4] Add a PR-004 timing check to `apps/frontend/tests/e2e/images.spec.ts`: generate a 12 MP JPEG fixture in `beforeAll` via `tests/fixtures/images/generate.mjs` (`big-12mp.jpg`, git-ignored), pick it in the dish form and assert the crop dialog's cropper image is visible within 2 000 ms of `setInputFiles`; assert the subsequent save completes within 5 000 ms and that a `role="status"` or disabled submit indicates progress meanwhile

**Checkpoint**: Guests see dish photos in every style with zero CLS and within byte budgets; missing objects fall back cleanly; all suites green. Every user story is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Convergence tooling, documentation, constitution follow-up, and the final gates.

- [X] T070 [P] Create `apps/api/src/images/sweep.ts`: CLI entry (`await main()` like `main.ts`) that loads env, builds the storage adapter and a Drizzle pool, lists `logos/` and `dishes/`, loads the set of referenced keys from `restaurant_profile.logo_key` and `menu_item.image_key`, deletes unreferenced objects with `lastModified` older than 24 h (`--dry-run` flag prints instead), prints counts and exits non-zero on any storage error; factor the decision into a pure `selectOrphans(objects, referenced, now)` in `apps/api/src/images/sweep-logic.ts` with `apps/api/src/images/sweep-logic.spec.ts` (young orphans kept, old orphans selected, referenced never selected) and an e2e in `apps/api/test/images.e2e-spec.ts` that runs the sweep against `MemoryImageStorage` after planting an old orphan
- [X] T071 [P] Update `apps/frontend/AGENTS.md` with an "Images (feature 006)" section: browser → Server Action → API multipart path; original + crop rect semantics and why the API crops; `ImageStorage` adapters and `/dev-images`; attach-in-request and the no-orphan rule; `SafeImage` as the only guest client leaf; `IMAGE_PUBLIC_URL` build-time coupling with `next.config.ts`; `ImageField`/`ImageCropDialog` reuse rule; fixtures folder
- [X] T072 [P] Propose the PATCH amendment to `apps/api/.specify/memory/constitution.md` Technology Constraints: add one sentence clarifying that object storage for binary blobs whose keys and metadata live in Postgres is not an "alternative datastore"; bump to 1.0.1 with a Sync Impact Report entry; note in the PR description that this is a clarification, not a rule change
- [X] T073 [P] Update `specs/006-image-uploads/quickstart.md` if any command, path or fixture name changed during implementation, and add the `sweep --dry-run` example
- [X] T074 Run the full gates and fix anything red: `pnpm --filter api lint && pnpm --filter api build && pnpm --filter api test && RESEND_API_KEY= pnpm --filter api test:e2e`; `pnpm --filter frontend lint && pnpm --filter frontend typecheck && pnpm --filter frontend build && pnpm --filter frontend test:unit && pnpm --filter frontend test:stories && pnpm --filter frontend test:e2e`; confirm the route-JS budget assertion still passes for `/m/[slug]` (only `SafeImage` added) and that `next build` logs no `remotePatterns` warning
- [~] T075 Walk `specs/006-image-uploads/quickstart.md` manually in `cs` and `de` (logo, dish photo, guest at 360 px, invalid files, no-JavaScript centre-crop) and record the outcome in `specs/006-image-uploads/checklists/requirements.md` Notes; run `/speckit-analyze`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001–T008 are independent except that T002 needs T001's `pnpm install` to have run once (lockfile).
- **Foundational (Phase 2)**: Depends on Setup. T009 → T010 (schema before migration). T011 → T013, T014, T015, T022 (port before adapters and module). T016 → T017, T020 (processor before its test and the filter mapping). T018 → T020 (DTO before the filter knows `IS_CROP`). T021, T022 → T023 (module before the test factory override). T025 → T026, T029, T030, T032 (types before consumers). T028 → T029, T030, T031. T033 (messages) → T034, T036 (components use the namespaces). T034 → T035, T036 → T037. **BLOCKS all user stories.**
- **US1 (Phase 3)**: T039 → T040 → T041; T043 → T044 → T046 → T048; T042, T045, T047, T049 parallel within the story.
- **US2 (Phase 4)**: T050 → T051; T052 → T053, T054; needs US1's `setLogo` for its e2e (T054) but the API/adapter/`SafeImage` wiring (T050, T052) is independent of US1 code.
- **US3 (Phase 5)**: T056 → T057 → T058; T060 → T061 → T064; T059, T062, T063 parallel.
- **US4 (Phase 6)**: T065 → T068; T066 → T067, T068; needs US3's `setItemImage` for its e2e (T068, T069).
- **Polish (Phase 7)**: after all desired stories; T070–T073 parallel; T074 then T075 last.

### User Story Dependencies

- **US1 (P1)**: Foundation only.
- **US2 (P1)**: Foundation; its end-to-end proof uses US1's upload, but its own code (public payload, `SafeImage` wiring, stories on fixtures) ships and tests independently via the sample menu.
- **US3 (P2)**: Foundation; reuses `ImageField`/`ImageCropDialog` from Phase 2, not anything from US1.
- **US4 (P2)**: Foundation; its end-to-end proof uses US3's upload; its own code (public item image, `DishImage` via `SafeImage`, `GuestMenu` stories on fixtures) is independent.

### Parallel Opportunities

- Phase 1: T002–T008 together after T001.
- Phase 2: API track (T011–T023) and frontend track (T024–T038) are fully parallel; inside the API track T012, T013, T014, T015, T016, T018, T019 are parallel; inside the frontend track T025, T027, T028 first, then T026, T029–T032 and T035, T037, T038 in parallel.
- Phase 3: API (T039–T042) and frontend (T043–T049) tracks parallel; T042, T045, T047, T049 parallel within tracks.
- Phase 4: T050/T051 parallel with T052/T053; T054 and T055 after both.
- Phase 5: API (T056–T059) and frontend (T060–T063) tracks parallel.
- Phase 6: T065 parallel with T066/T067; T068, T069 after both.
- Phase 7: T070–T073 parallel.

---

## Parallel Example: Phase 2 (two developers)

```bash
# Developer A — API image module
Task: "T011 ImageStorage port in apps/api/src/images/storage/image-storage.ts"
Task: "T016 sharp pipeline in apps/api/src/images/image-processor.ts"
Task: "T018 CropDto + AllOrNoneOf in apps/api/src/images/dto/crop.dto.ts, apps/api/src/common/validators.ts"
# then T013/T014/T015 adapters, T017 tests, T019–T023

# Developer B — frontend primitives
Task: "T025 ImageRef + codes in apps/frontend/lib/api/types.ts"
Task: "T028 sniff + validate in apps/frontend/lib/validation/image.ts"
Task: "T033 messages in apps/frontend/messages/{cs,en,de}.json"
# then T029–T032, T034–T038
```

## Parallel Example: User Story 1

```bash
# API track
Task: "T039 setLogo/removeLogo in apps/api/src/auth/auth.service.ts"
Task: "T040 PUT/DELETE /auth/profile/logo in apps/api/src/auth/auth.controller.ts"
Task: "T041 logo e2e in apps/api/test/images.e2e-spec.ts"  +  "T042 profile.e2e-spec.ts shapes"

# Frontend track (in parallel with the API track)
Task: "T043 uploadLogoAction/removeLogoAction in apps/frontend/lib/api/actions/auth.ts"
Task: "T044 LogoField in apps/frontend/components/settings/LogoField.tsx"  +  "T045 stories"
Task: "T047 sidebar logo in apps/frontend/components/dashboard/DashboardSidebar.tsx"
# then T046 page wiring, T048/T049 e2e once both tracks land
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything; proves the image pipeline and the upload primitives in isolation).
3. Complete Phase 3: US1 — owners can set a logo and see it in the workspace.
4. Complete Phase 4: US2 — guests see it. **STOP and VALIDATE** with quickstart steps 1 and 3 (logo parts) plus `images.spec.ts` logo sections.
5. Deploy or demo: a branded menu with no dish photos yet is a complete, valuable increment.

### Incremental Delivery

1. Setup + Foundational → pipeline and primitives proven, nothing visible changes.
2. US1 → logo in the workspace → demo.
3. US2 → logo for guests in every style → **MVP demo**.
4. US3 → dish photos in the editor → demo.
5. US4 → dish photos for guests within budgets → demo.
6. Polish → sweep command, docs, constitution clarification, full gates.

### Parallel Team Strategy

With two developers: one takes the API track and one the frontend track through Phases 2–6, meeting at each story's e2e task (T048, T054, T064, T068), which needs both halves. With one developer: follow the phases in order; within a phase, do the API half first so the frontend half can be exercised against real endpoints.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps a task to a spec user story for traceability
- Every story is independently completable; US2 and US4 e2e proofs reuse the previous story's upload but their own code is independently testable via fixtures and stories
- Write each test task before or alongside its implementation task and watch it fail first; API e2e suites need Postgres running (`docker compose -f apps/api/docker-compose.yml up -d`) and no R2 credentials
- Commit after each task or logical group with `<type>: <summary>` messages
- Never expose storage keys to the frontend; only URLs. Never derive a key from an id.
- Avoid: literal colours or arbitrary utilities, hard-coded strings, `"use client"` above the smallest leaf, hand-editing `components/ui/`, calling the API or bucket from the browser
