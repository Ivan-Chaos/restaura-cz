# Quickstart: Logo & Dish Image Uploads

**Date**: 2026-09-03 | **Plan**: [plan.md](./plan.md) | **Contracts**: [http-api-delta.md](./contracts/http-api-delta.md), [image-upload-ui.md](./contracts/image-upload-ui.md)

How to run and prove the feature end to end. Implementation detail lives in `tasks.md`; this is the validation guide.

## Prerequisites

- Node 22, pnpm 11, Docker (for Postgres).
- `docker compose -f apps/api/docker-compose.yml up -d`
- `apps/api/.env` from `.env.example`. **Leave the five `R2_*`/`IMAGE_PUBLIC_URL` lines unset** for local work: the API stores images under `apps/api/.images/` and serves them at `http://localhost:3001/dev-images/…`.
- `apps/frontend/.env.local` with `API_URL=http://localhost:3001`. `IMAGE_PUBLIC_URL` may stay unset (defaults to the local route).
- Fixture images live in `apps/frontend/tests/fixtures/images/` and are described in the README beside them: `dish-4x3.jpg` (EXIF orientation 6), `logo-alpha.png` (transparent), `tiny.webp`, `not-an-image.png` (text renamed). Two large ones are generated on demand and git-ignored: `node tests/fixtures/images/generate.mjs` writes `too-big.jpg` and `big-12mp.jpg`; add `--all` to rebuild the committed ones too.

## Run locally

```bash
pnpm --filter api db:migrate      # applies 0004 (nullable image columns)
pnpm --filter api start:dev
pnpm --filter frontend dev
```

Open `http://localhost:3000/cs/sign-up`, register, confirm with the code the API logs, then:

1. **Logo**: Settings → Restaurace. "Nahrát logo" → pick `logo-alpha.png` → drag/zoom in the square → Potvrdit. Expect a success toast, the preview shows your framing, the sidebar header shows the logo. Reload: still there. "Odebrat" → confirm → text name returns.
2. **Dish photo**: open a menu, add a section, in the dish form pick `dish-4x3.jpg` (sideways in the file, upright in the dialog), adjust, Potvrdit, fill name and price, "Přidat jídlo". The row shows a thumbnail. Edit → Nahradit / Odebrat behave as expected. Cancelling an edit after choosing a file uploads nothing (watch the network tab).
3. **Guest**: publish, open the `/cs/m/<slug>` address in a private window at 360 px wide. Logo in the header with `alt` = restaurant name; photographed dishes show photos, others do not; no layout shift while scrolling. Switch visual styles in the editor and confirm each treats photos per its recipe.
4. **Invalid files**: `not-an-image.png` and `too-big.jpg` are refused inline with no network request.
5. **No JavaScript**: disable JS, pick a file in the dish form, save. The API centre-crops; the dish shows a photo.

## Automated checks

```bash
# API
pnpm --filter api lint && pnpm --filter api build
pnpm --filter api test                     # unit: image-processing, crop dto, 413 mapping
RESEND_API_KEY= pnpm --filter api test:e2e # images.e2e-spec + extended profile/menus specs

# Frontend
pnpm --filter frontend lint && pnpm --filter frontend typecheck
pnpm --filter frontend test:unit           # adapter, api-contract, image sniff, readImageUpload
pnpm --filter frontend test:stories        # ImageField, ImageCropDialog, LogoField, ItemForm, ItemRow (two passes, axe)
pnpm --filter frontend test:e2e            # images.spec.ts + extended settings/menu-editor/public-menu
```

`test:e2e` boots the API on local-disk storage and the frontend as a production build (see `playwright.config.ts`). No R2 credentials are ever needed to run any test.

## What each layer proves

| Spec item | Where it is proven |
|---|---|
| US1 (logo upload, adjust, replace, remove, errors, ownership) | `tests/e2e/images.spec.ts` "restaurant logo"; `test/images.e2e-spec.ts` logo sections; `LogoField` and `ImageField` stories |
| US2 (guest sees the logo, text fallback, freshness) | `tests/e2e/images.spec.ts` "guests and images"; `test/images.e2e-spec.ts` "what a guest is served" |
| US3 (dish photo in the form, cancel leaves nothing, delete cascades) | `tests/e2e/images.spec.ts` "dish photographs"; `test/images.e2e-spec.ts` dish and cascade sections; `ItemForm`/`ItemRow` stories |
| US4 (guest sees photos, no layout shift, sized for the viewport) | `tests/e2e/images.spec.ts` "guests and images": layout-shift observer ≤ 0.1 and ≤ 120 KB per delivered photo at 360 px |
| FR-010 content-based acceptance | `image-processor.spec.ts` (text, SVG, GIF, truncated all rejected); API e2e `file:IS_IMAGE`; `image-validation.test.ts` for the browser's own sniff |
| FR-011 orientation | `image-processor.spec.ts` with an EXIF-6 fixture, including a crop legal only in oriented space; API e2e asserts the stored rendition is landscape |
| FR-013 transparency | `image-processor.spec.ts` and API e2e both assert the alpha channel survives |
| FR-014/FR-015/SC-006 no orphans | API e2e: objects removed on replace, remove and every cascade; a failed attach is compensated; `sweep` proven against real Postgres, plus `sweep-logic.spec.ts` for the grace period |
| FR-018 unguessable URLs | API e2e: the key is a random UUID containing neither the account id nor the email |
| FR-020 missing object fallback | `SafeImage` stories with a 404 `src`; e2e asserts no image on a guest menu ever fails to decode |
| FR-021 localization | `pnpm lint` message-catalogue gate; story assertions match all three catalogues |
| FR-022 accessibility | axe (WCAG 2.1 A/AA) on the settings page and with the framing dialog open; a keyboard-only path through the whole logo flow |
| PR-002 delivered size | e2e byte budget on every `/_next/image` response for a photographed menu |
| PR-006 no new guest JS beyond `SafeImage` | the crop tool is `next/dynamic` inside `ImageField`, which no guest route imports |

## Deploying with R2 (one-time setup)

1. Cloudflare dashboard → R2 → Create bucket (e.g. `restaura-images`).
2. Bucket → Settings → Public access → connect a custom domain (e.g. `img.restaura.cz`). The `*.r2.dev` hostname works for staging but is rate-limited and not for production.
3. R2 → Manage API tokens → Create token, permission **Object Read & Write**, scoped to the bucket. Note the Access Key ID and Secret Access Key.
4. Set in the API environment: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `IMAGE_PUBLIC_URL=https://img.restaura.cz`.
5. Set in the frontend build environment: `IMAGE_PUBLIC_URL=https://img.restaura.cz` (build-time; it feeds `next/image`'s allowlist).
6. Schedule the sweep daily (any scheduler; it is idempotent and needs only the API's environment):

   ```bash
   pnpm --filter api images:sweep          # delete unreferenced objects
   node dist/images/sweep.js --dry-run     # report what it would delete
   ```

   In ordinary operation it finds nothing: uploads attach in the same request, so there is no orphan state to collect. It exists for the two windows a single request cannot close — a crash between writing an object and recording it, and a post-commit delete that failed — and it leaves anything less than a day old alone, because that is an upload still in flight rather than litter.

No bucket CORS configuration is needed: only the API writes, and guests read through `next/image`'s server-side optimiser.
