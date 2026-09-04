# Implementation Plan: Logo & Dish Image Uploads

**Branch**: `feature/be-fe/mvp-menu-creation` (current; spec dir `006-image-uploads`) | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-image-uploads/spec.md`

## Summary

Let an owner upload one square logo for the restaurant and one 4:3 photo per dish, adjusting each in a fixed frame (drag to reposition, zoom), and show them to guests in every visual style, with nothing changing for restaurants and dishes that have no image. The browser posts the original file plus a crop rectangle to a Server Action, which relays it to new multipart API endpoints; the API is the single authority that verifies content by bytes, auto-orients, crops, resizes to one canonical rendition per kind, and writes it to Cloudflare R2 (or local disk when R2 is not configured) under a random key stored on the owning row. Guests receive absolute image URLs that `next/image` optimises per viewport. The frontend already models optional logos and dish photos and renders cleanly without them, so the display side is an adapter change plus a tiny error-fallback leaf; the new work is the upload/adjust UI, the API image module, six nullable columns, and the tests that pin the contract on both sides.

## Technical Context

**Language/Version**: TypeScript 5 (strict) in both apps; Node 22 runtime

**Primary Dependencies**:
- Frontend (`apps/frontend`): Next.js 16.3 (App Router, Server Components, Server Actions), React 19.2, Tailwind CSS 4, shadcn (base-nova on `@base-ui/react`), `next-intl` 4, `react-hook-form` + `zod` via `useActionForm`, Storybook 10 + Vitest browser, Playwright + axe. **New**: `react-easy-crop` (crop tool, ≈ 8 KB gz, dashboard only), shadcn `slider` primitive via CLI.
- API (`apps/api`): NestJS 12 (`@nestjs/platform-express` already bundles multer 2.x), class-validator/class-transformer, Drizzle ORM, Vitest + supertest. **New**: `sharp` 0.35 (already in the workspace lockfile via Next), `@aws-sdk/client-s3` (R2's S3-compatible API), `@types/multer` (dev).

**Storage**: PostgreSQL via Drizzle for all records; migration `0004` adds three nullable columns to `restaurant_profile` and three to `menu_item` with all-or-none CHECKs. Binary renditions in Cloudflare R2 (S3 API) behind a public hostname, or `apps/api/.images/` served at `/dev-images` when R2 is not configured. Keys are random UUIDs under `logos/` and `dishes/`.

**Testing**: API: `pnpm test` (unit: sharp pipeline, crop DTO, 413 mapping, sweep) and `pnpm test:e2e` (supertest, real Postgres, in-memory storage adapter injected). Frontend: `pnpm test:unit` (adapter, contract fixtures, byte sniff, form-data reader), `pnpm test:stories` (two passes with axe), `pnpm test:e2e` (Playwright on a production build with the API on local-disk storage), `pnpm lint` (eslint + design-token gate + message-catalogue gate), `pnpm typecheck`.

**Target Platform**: Web. Owners on desktop and phone browsers (file picker, touch and pointer cropping); guests on mid-tier phones over 4G. Chrome, Safari, Firefox current versions.

**Project Type**: Web application, two apps in one monorepo, cross-app contract in `specs/001-menu-creation-publishing/contracts/http-api.md` (amended by this feature's `contracts/http-api-delta.md`).

**Performance Goals**: Guest page LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 with photos (PR-001); dish photo ≤ 120 KB and logo ≤ 40 KB as delivered to a phone (PR-002); below-fold photos lazy (PR-003); crop dialog interactive ≤ 2 s on a 12 MP file, continuous drag/zoom (PR-004); save ≤ 5 s on broadband with visible progress (PR-005); no new guest-page JavaScript beyond the ≈ 0.5 KB `SafeImage` leaf (PR-006).

**Constraints**: Browser never calls the API or the bucket (AGENTS.md rule). Uploads ≤ 10 MiB; Server Action body limit 12 MB. Accept JPEG/PNG/WebP by content only; SVG never enters the image pipeline. All text in cs/en/de; tokens only; light and dark; WCAG 2.1 AA including the crop dialog; every action keyboard-operable. Public menu page stays `force-dynamic`. No orphaned objects: attach happens in the upload request; deletes are post-commit best-effort plus a sweep command. `useActionForm` remains the one form pattern and forms keep working without client JS (server centre-crops).

**Scale/Scope**: 1 logo per account, ≤ 1 photo per dish, ≤ 1000 dishes per menu (existing cap). API: 1 new module (`images`: processing, storage port, R2 + local adapters, dev route, sweep), 4 new endpoints, 2 services touched, 1 migration, 1 filter branch, ~5 env vars. Frontend: 4 new components (`ImageField`, `ImageCropDialog`, `LogoField`, `SafeImage`), 3 modified (`ItemForm`, `ItemRow`, `DishImage`/`MenuHeader`/`MenuCover` wiring), 2 new actions, 2 extended actions, adapter + types + config, ~25 message keys × 3 locales, 1 new e2e spec, 1 new API e2e spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Root constitution v1.0.0, frontend constitution v1.0.0, API constitution v1.0.0.

| Principle | Requirement | How this plan satisfies it | Status |
|-----------|-------------|----------------------------|--------|
| Root I / FE I / API II. Code quality & readability | Strict TS, lint + typecheck clean, reuse before creation, verified framework APIs, no dead code | Reuses `useActionForm`, `apiRequest`, `AppError`/`HttpErrorFilter`, `requireOwned*` chain, `DishImage`, `MenuHeader`/`MenuCover` logo slots, `ImageModel`, `ConfirmDialog`, shadcn `Dialog`. One `ImageField` + one `ImageCropDialog` serve both hosts. Next docs verified for `serverActions.bodySizeLimit`, `images.remotePatterns`, `onError` needing a Client Component. The `EditDishFormMock` image skeleton is replaced by the real field; the `dangerouslyAllowSVG` "revisit" comment is resolved. | PASS |
| Root II / FE II / API IV. Testing | Acceptance scenarios covered at every layer; both sides of the contract tested; real Postgres for persistence; regression tests deterministic | See research R11 and quickstart's proof table. API e2e injects an in-memory storage adapter so persistence and cascade behaviour are tested against real Postgres with inspectable object keys. Contract pinned by `images.e2e-spec.ts` and `api-contract.test.ts`. No network needed in any test. | PASS |
| Root III / FE III. UX consistency | i18n for all text, tokens only, light + dark, 320–1920, WCAG AA, consistent states, structured API errors | New namespaces `ImageField`, `ImageCrop`, extended `Settings`/`MenuEditor` in cs/en/de. File errors travel as `VALIDATION_FAILED` + `details[]` with three new codes, rendered through the existing field-error mechanism. Crop dialog is shadcn `Dialog` + `Slider` with focus trap, labelled controls, arrow-key nudging. Empty/pending/error/success states mirror the existing forms and toasts. Guest images have derived `alt` text. | PASS |
| Root IV / FE IV. Performance | Measurable targets, static where possible, budgets enforced, `next/image` with explicit dimensions | Renditions stored with dimensions → explicit `width`/`height` → zero CLS. `next/image` optimiser + `sizes` per layout meets the byte caps; lazy by default. Crop tool is dynamically imported on the dashboard only. Guest page gains only `SafeImage`. Playwright asserts CLS and transferred bytes on a photographed menu at 360 px. Settings and editor pages are already dynamic (session-gated); the public page stays `force-dynamic` (unchanged, documented in its header). | PASS |
| FE V / API I. Simplicity & justified complexity | Simplest solution; new deps and abstractions justified against existing ones | No asset table, no reaper scheduler, no presigned-URL flow: attach-in-request removes the orphan state entirely. `ImageStorage` port has two concrete adapters used from day one (R2 in deployment, local disk in dev/test), not a speculative seam. New deps: `sharp` (only sane choice for byte-level detection, orientation, crop, resize, encode; already in the lockfile), `@aws-sdk/client-s3` (R2's documented client; three calls), `react-easy-crop` (replaces several hundred lines of gesture math). Each is recorded in Complexity Tracking. | PASS |
| API III. Reliability | Explicit failure behaviour for every external interaction; multi-record writes transactional; accurate status codes | Storage `put` failure → `500 INTERNAL`, nothing written to DB. DB update failure after `put` → compensating `delete`, then rethrow. Post-commit deletes are best-effort with logged keys and converged by the sweep. Multer 413 mapped to the contract's 400 shape. Row deletes stay inside existing transactions; key collection happens before the delete in the same transaction. | PASS |
| API V. Explicit data contracts | Validate at the boundary; declared response shapes; versioned migrations; constraints in Postgres | Multipart DTO with explicit `@Type(() => Number)` (implicit conversion is off globally). CHECK constraints make "all-or-none image columns" a database invariant. Migration `0004` generated by drizzle-kit. Response types declared on both sides. | PASS |
| API Technology constraints | Postgres is the system of record; no alternative datastores without amendment; config from env; deps pinned and justified | Every record stays in Postgres; R2 holds bytes addressed by keys stored in Postgres. Treated as compliant (object storage is not a record store); a PATCH clarification to the API constitution is recommended and listed as a task. All storage config from env with all-or-nothing validation at boot. | PASS (with recommended clarification) |
| FE Technology constraints | shadcn via CLI, icons from lucide, `@/i18n/navigation`, no secrets committed | `slider` added via CLI; `ImagePlus`/`Trash2`/`RefreshCw` from lucide; no navigation changes; R2 secrets are API-side env only, frontend gets just the public URL. | PASS |
| Cross-app contract | API and frontend change in one reviewable unit, both tested | `http-api-delta.md` mirrored into the canonical contract; `images.e2e-spec.ts` and `api-contract.test.ts` land together. | PASS |

**Gate result (pre-research)**: PASS. Four additions need justification and are recorded in Complexity Tracking; none violates a MUST.

## Project Structure

### Documentation (this feature)

```text
specs/006-image-uploads/
├── plan.md                         # This file
├── research.md                     # Phase 0: decisions R1–R12
├── data-model.md                   # Phase 1: columns, entities, write sequences, validation
├── quickstart.md                   # Phase 1: how to run and prove it
├── contracts/
│   ├── http-api-delta.md           # New endpoints, ImageRef, new field codes, public payload
│   └── image-upload-ui.md          # FormData fields, components, adapter mapping, config, messages
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/
├── package.json                                  # MODIFY: + sharp, @aws-sdk/client-s3; dev + @types/multer; script images:sweep
├── .env.example                                  # MODIFY: R2_* and IMAGE_PUBLIC_URL block
├── .gitignore                                    # MODIFY: .images/
├── src/config/env.ts                             # MODIFY: imageStorage config (all-or-nothing R2 group, IMAGE_PUBLIC_URL)
├── src/app.module.ts                             # MODIFY: import ImagesModule
├── src/db/schema.ts                              # MODIFY: logo_* on restaurant_profile, image_* on menu_item, CHECKs
├── src/db/migrations/0004_*.sql (+ meta)         # NEW: generated
├── src/common/app-error.ts                       # MODIFY: helper for file field errors (VALIDATION_FAILED details)
├── src/common/http-error.filter.ts               # MODIFY: PayloadTooLargeException → 400 VALIDATION_FAILED file/MAX_FILE_SIZE
├── src/images/images.module.ts                   # NEW: provides IMAGE_STORAGE (R2 or local by env), ImageProcessor; DevImagesController when local
├── src/images/image-processor.ts                 # NEW: sharp pipeline: detect, orient, crop, resize, encode (logo/dish renditions)
├── src/images/image-processor.spec.ts            # NEW
├── src/images/dto/crop.dto.ts                    # NEW: cropX/Y/Width/Height with @Type(() => Number), group validator IS_CROP
├── src/images/dto/crop.dto.spec.ts               # NEW
├── src/images/keys.ts                            # NEW: newLogoKey(), newDishKey() (uuid v4)
├── src/images/storage/image-storage.ts           # NEW: ImageStorage interface + IMAGE_STORAGE token
├── src/images/storage/r2-image-storage.ts        # NEW: @aws-sdk/client-s3 adapter
├── src/images/storage/local-image-storage.ts     # NEW: disk adapter under .images/
├── src/images/storage/memory-image-storage.ts    # NEW: test adapter (exported for test/)
├── src/images/dev-images.controller.ts           # NEW: GET /dev-images/*key (local adapter only)
├── src/images/upload.interceptor.ts              # NEW: FileInterceptor('file', { limits: { fileSize: 10 MiB } }) preset
├── src/images/sweep.ts                           # NEW: CLI entry — delete unreferenced objects older than 24 h
├── src/images/sweep.spec.ts                      # NEW
├── src/auth/auth.controller.ts                   # MODIFY: PUT/DELETE /auth/profile/logo
├── src/auth/auth.service.ts                      # MODIFY: PublicProfile.logo; setLogo/removeLogo; getProfile selects logo columns
├── src/menus/menus.controller.ts                 # MODIFY: PUT/DELETE …/items/:itemId/image
├── src/menus/menus.service.ts                    # MODIFY: ItemView.image, PublicMenuItem.image, PublicMenuView.restaurantName/logo; setItemImage/removeItemImage; key collection on deletes; duplicate leaves image null
├── test/app.factory.ts                           # MODIFY: override IMAGE_STORAGE with MemoryImageStorage, expose it
├── test/images.e2e-spec.ts                       # NEW
├── test/profile.e2e-spec.ts, test/menus.e2e-spec.ts  # MODIFY: logo: null / image: null in shape assertions
└── test/fixtures/images/*                        # NEW: tiny generated fixtures (or generated in-test via sharp)

specs/001-menu-creation-publishing/contracts/http-api.md   # MODIFY: mirror the delta

apps/frontend/
├── package.json                                  # MODIFY: + react-easy-crop
├── .env.example                                  # MODIFY: IMAGE_PUBLIC_URL
├── next.config.ts                                # MODIFY: images.remotePatterns from IMAGE_PUBLIC_URL; experimental.serverActions.bodySizeLimit '12mb'; rewrite SVG comment
├── components/ui/slider.tsx                      # NEW: via shadcn CLI
├── components/workspace/ImageField.tsx           # NEW (+ .stories.tsx)
├── components/workspace/ImageCropDialog.tsx      # NEW (+ .stories.tsx); react-easy-crop; loaded with next/dynamic
├── components/settings/LogoField.tsx             # NEW (+ .stories.tsx)
├── components/menu/SafeImage.tsx                 # NEW (+ .stories.tsx): client leaf, onError → fallback
├── components/menu/DishImage.tsx                 # MODIFY: render through SafeImage with the placeholder as fallback
├── components/menu/MenuHeader.tsx, MenuCover.tsx # MODIFY: logo through SafeImage with null fallback
├── components/workspace/ItemForm.tsx             # MODIFY: ImageField kind="dish"; PendingImage state; multipart form data
├── components/workspace/ItemRow.tsx              # MODIFY: thumbnail when item.image
├── components/menu/forms/EditDishFormMock.tsx    # MODIFY: replace image skeleton with ImageField (docs mock)
├── app/[locale]/workspace/settings/profile/page.tsx  # MODIFY: LogoField above ProfileSettingsForm
├── app/[locale]/workspace/layout.tsx             # MODIFY: pass profile.logo to DashboardSidebar
├── components/dashboard/DashboardSidebar.tsx     # MODIFY: optional logo beside the restaurant name
├── lib/api/types.ts                              # MODIFY: ImageRef; logo/image/restaurantName; FieldErrorCode += MAX_FILE_SIZE, IS_IMAGE, IS_CROP
├── lib/api/actions/auth.ts                       # MODIFY: uploadLogoAction, removeLogoAction
├── lib/api/actions/menus.ts                      # MODIFY: addItemAction/updateItemAction orchestrate text + image steps
├── lib/api/client.ts                             # MODIFY: apiRequest accepts a FormData body (no JSON header) for multipart relays
├── lib/validation/image.ts                       # NEW: sniffImageType(bytes), MAX_IMAGE_BYTES, ACCEPTED_IMAGE_TYPES, CropRect
├── lib/validation/form-data.ts                   # MODIFY: readImageUpload(formData) → { file, crop } | remove | none, with codes
├── lib/validation/form-values.ts                 # MODIFY: itemFormData appends image/crop/removeImage; logoFormData
├── lib/menu-display/adapter.ts                   # MODIFY: toImageModel; establishment.logo; item.image
├── messages/{cs,en,de}.json                      # MODIFY: ImageField, ImageCrop namespaces; Settings/MenuEditor keys and fieldErrors
├── tests/unit/api-contract.test.ts               # MODIFY: fixtures with logo/image/restaurantName
├── tests/unit/menu-display-adapter.test.ts       # MODIFY: image mapping and alt text
├── tests/unit/image-validation.test.ts           # NEW: sniff + readImageUpload
├── tests/fixtures/images/*                       # NEW: dish-4x3.jpg (EXIF 6), logo-alpha.png, tiny.webp, not-an-image.png; script for too-big.jpg
├── tests/e2e/images.spec.ts                      # NEW: logo + dish photo journeys, invalid files, keyboard + axe, FR-020 fallback, budgets
├── tests/e2e/helpers/owner.ts                    # MODIFY: uploadImage(page, fixture) helper
├── tests/e2e/public-menu.spec.ts                 # MODIFY: logo alt, photo/no-photo mix, CLS + bytes at 360 px
└── AGENTS.md                                     # MODIFY: images section (upload path, crop semantics, storage, SafeImage, no-orphan rule)
```

**Structure Decision**: Existing two-app layout. The API gains one cohesive `images` module (processing, storage port, adapters, dev route, sweep) that `auth` and `menus` call; ownership rules stay where they are. The frontend gains a reusable field + dialog under `components/workspace/`, a settings host, and a one-line adapter change for display. The contract is owned by `http-api.md` and pinned on both sides.

## Complexity Tracking

| Violation / Addition | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `ImageStorage` port with R2, local-disk and in-memory adapters | Deployment writes to R2; local development and every test must run with no credentials and no network; API e2e must inspect which keys exist. | A single R2 client with mocked SDK calls: tests would prove nothing about the put/update/delete ordering that keeps storage and Postgres consistent, and local development would need a bucket. |
| New API deps `sharp` and `@aws-sdk/client-s3` | Content-based acceptance, orientation, crop, resize and encode need a real image library; R2 speaks S3. | Detect-only libraries still need a resizer; hand-signed fetches to R2 need SigV4 and XML for list/delete. `sharp` is already in the lockfile via Next. |
| New frontend dep `react-easy-crop` (≈ 8 KB gz) + shadcn `slider` | The spec's fixed-frame drag-and-zoom interaction with touch, pinch, wheel, keyboard and bounds. | A hand-rolled cropper is several hundred lines of gesture math and a11y work with a high bug rate; the dependency is under the 20 KB per-route threshold and is dashboard-only, dynamically imported. |
| `SafeImage` client leaf on the guest page (≈ 0.5 KB) | FR-020: a missing object must fall back to the no-image presentation, and `onError` requires a Client Component (verified in Next docs). | A pure Server Component cannot react to a load failure; the browser's default broken-image icon is exactly what the spec forbids. |
| Post-commit best-effort object deletes plus a `sweep` command | Storage and Postgres cannot share a transaction; a delete that fails after commit must still converge to zero orphans (SC-006). | An outbox table and worker: more moving parts for a failure that is rare and fully recoverable by a listing pass. |

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 artifacts were written:

- **Contract**: additive only; every new field has a `null` state and every consumer treats `null`/`undefined` as "no image". Delta documented and mirrored; both test suites named.
- **Data integrity**: the all-or-none CHECKs make partial image rows impossible; attach-in-request means no unattached objects; compensation and sweep cover the two cross-system failure windows.
- **Validation at the boundary**: multipart fields are converted explicitly; unknown parts are rejected by the global whitelist; file content is verified by decoding, never by name or declared type.
- **Frontend rules**: no new `"use client"` beyond `ImageField`, `ImageCropDialog`, `LogoField`, `SafeImage`, each the smallest leaf that needs interactivity; `ItemForm`/`ItemRow` were already client. All copy in three catalogues; no literal visual values; dialog and field verified in both story passes with axe.
- **Performance**: renditions carry dimensions so `next/image` reserves space; per-layout `sizes`; lazy below the fold; budgets asserted in Playwright. The crop dependency never reaches the guest route.
- **Simplicity**: no asset table, no scheduler in-process, no presigned flow, no client-side canvas encode. Four justified additions, none speculative.
- **Open recommendation**: a PATCH amendment to the API constitution clarifying that object storage for binary blobs keyed from Postgres does not constitute an "alternative datastore". Listed as a documentation task; not a gate failure.

**Gate result (post-design)**: PASS.
