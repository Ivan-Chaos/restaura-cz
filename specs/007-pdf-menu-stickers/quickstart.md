# Quickstart: PDF Menu & Table Sticker Downloads

**Date**: 2026-09-04 | **Plan**: [plan.md](./plan.md) | **Contracts**: [http-api-delta.md](./contracts/http-api-delta.md), [print-ui.md](./contracts/print-ui.md)

How to run and prove the feature end to end. Implementation detail lives in `tasks.md`; this is the validation guide.

## Prerequisites

- Node 22, pnpm 11, Docker (for Postgres).
- `docker compose -f apps/api/docker-compose.yml up -d`
- `apps/api/.env` from `.env.example` (R2 lines may stay unset; local-disk images are fine).
- `apps/frontend/.env.local` with `API_URL=http://localhost:3001`. The four `PDF_*` variables may stay unset locally.
- **A Chromium the renderer can launch.** In development this is the one Playwright installed for e2e: `pnpm --filter frontend exec playwright install chromium`. In a deployment image run the same with `--with-deps`, or set `PDF_CHROMIUM_PATH` to a system Chromium. The frontend must run as a Node server; serverless hosting is not supported by this feature.
- `pnpm install` after the dependency changes (`playwright-core`, `qrcode`; dev `@types/qrcode`, `jsqr`, `pdfjs-dist`).

## Run locally

```bash
pnpm --filter api db:migrate      # applies 0005 (owner_account.plan, default 'free')
pnpm --filter api start:dev
pnpm --filter frontend dev
```

Open `http://localhost:3000/cs/sign-up`, register, confirm with the code the API logs, complete the profile, then:

1. **Menu PDF (Free plan)**: create a menu, add two sections and a few dishes (one with a photo), pick the Refined style. Under the publish box, "Stáhnout PDF jídelního lístku" opens a dialog with a first-page preview in the Refined look; no branding switch is shown. Download. Open the file: A4, every dish and price present, Refined typography, the menu name repeated at the top of every page, "Powered by restaura.cz" at the very end. Change the style to Green Bar and download again: dark board, brass section bars, same content.
2. **Empty menu**: a menu with no dishes shows the menu button disabled with a hint.
3. **Stickers**: the stickers button is disabled with a hint until you publish. Publish, open the stickers dialog, enter 10, watch the preview show four numbered stickers. Download: three pages (4 + 4 + 2), dashed cut guides, each sticker with the logo (or name), "Naskenujte a zobrazte menu", a QR code on a light tile, a large "Stůl N", and the branding line. Print page one at 100 % and scan each code with a phone: the menu opens; the address ends in `?table=N`. Enter `0`, `201`, `2.5`: inline message naming 1–200, Download disabled.
4. **Paid plan**: in psql, `update owner_account set plan = 'pro' where email = '<yours>'`. Reload the editor: both dialogs now show "Zobrazit značku Restaura", off by default; downloads carry no branding line and the space is closed up; switch it on and the line is back. `update … set plan = 'gold'` is rejected by the CHECK. Settings → Předplatné shows "Pro".
5. **Guest page unchanged**: open the public address with and without `?table=3` in a private window: identical.
6. **Print by hand**: open `/cs/print/menu/<menuId>` directly and use the browser's print dialog: the same document.

## Automated checks

```bash
# API
pnpm --filter api lint && pnpm --filter api build
pnpm --filter api test                     # unit: plans literal pin
RESEND_API_KEY= pnpm --filter api test:e2e # auth.e2e-spec: plan on every account payload; CHECK; setPlan

# Frontend
pnpm --filter frontend lint && pnpm --filter frontend typecheck   # token gate sees no literals; message gate sees Print in cs/en/de
pnpm --filter frontend test:unit           # plans pin + entitlements, print validation, filename, qr, contrast of the new tokens in every theme
pnpm --filter frontend test:stories        # PrintMenu, StickerSheet, QrCode, PoweredBy, PrintDownloadDialog (two passes, axe)
pnpm --filter frontend test:e2e            # print.spec.ts + extended public-menu.spec.ts
```

`test:e2e` boots the API and the frontend as a production build (`playwright.config.ts`); the renderer inside the frontend launches the same Chromium the tests drive. No external service is needed.

## What each layer proves

| Spec item | Where it is proven |
|---|---|
| US1 menu PDF: download, filename, draft allowed, empty disabled, ownership | `tests/e2e/print.spec.ts` "menu PDF": `page.waitForEvent('download')`, suggested filename, `pdfjs-dist` page count and text; disabled state on an empty menu; a second owner's fetch of the handler → 404 |
| US1 content parity and style | `print.spec.ts`: extracted PDF text contains every section title, dish name and price the editor holds; preview JPEGs of the same menu in two styles differ; `PrintMenu` stories in every recipe |
| US1 running header, no split dish, final-page branding | `print.spec.ts` on a 60-dish menu: every page's text contains the menu name; each dish name and its price fall on the same page; "Powered by" appears once, on the last page |
| US2 stickers: count → pages, numbering, guides, disabled until published | `print.spec.ts` "stickers": 10 → 3 pages; text contains "Stůl 1" … "Stůl 10" exactly once each; button disabled on a draft; handler answers `409 NOT_PUBLISHED` |
| US2 QR content and scannability (SC-003) | `print.spec.ts`: screenshot each QR tile on the rendered sticker page, decode with `jsqr`, expect `…/cs/m/<slug>?table=N`; `qr.test.ts` pins module count and quiet zone for a known input |
| US2 invalid counts (SC-006) | `print.spec.ts`: `0`, `201`, `2.5`, blank → inline message naming 1–200, Download disabled, no request made; handler answers `400 VALIDATION_FAILED` for the same values |
| US3 branding by plan, tamper-proof | `print.spec.ts` with `setPlan(email, 'pro')`: switch present and off; PDF text lacks "Powered by"; on → present; Free account requesting `branding=0` still receives "Powered by"; API e2e proves `plan` on `/auth/me` and the CHECK |
| US4 preview reflects options, degrades gracefully | `print.spec.ts`: preview `<img>` loads within budget, `src` changes after count/branding edits; with the preview endpoint blocked by the test, notice shown and Download still works; `PrintDownloadDialog` stories |
| FR-003 light appearance and glass fallback | `print.spec.ts` renders the dashboard in dark mode and downloads a Liquid Glass menu: sampled background is the light ground; `@media print` fallback covered by a story pass with print emulation |
| FR-010/SC-008 guest page untouched | `tests/e2e/public-menu.spec.ts`: DOM text of `/cs/m/<slug>` equals that of `/cs/m/<slug>?table=3` |
| FR-011 QR contrast in every style | `contrast.test.ts` via the new `qr-foreground`/`qr-surface` pair at 7:1 for all seven themes in both appearances |
| FR-021 localisation | message-catalogue gate; `print.spec.ts` runs the download flow in `cs` and `en` and checks the in-document prompt and "Table"/"Stůl" wording |
| FR-022/SC-009 keyboard and AA | `PrintDownloadDialog` stories with axe in both passes; `print.spec.ts` completes a download with keyboard only |
| FR-023 failures never produce a file | `print.spec.ts`: with the render origin misconfigured (env override in a dedicated test server) the handler answers JSON `RENDER_FAILED`, the dialog shows Retry, no download event fires |
| PR-001..PR-004 budgets | `print.spec.ts`: elapsed time of a 200-dish (photographed) download ≤ 10 s and ≤ 15 MB; 200 stickers ≤ 10 s and ≤ 5 MB; first preview ≤ 3 s |
| PR-005 no guest/editor regression | existing `public-menu.spec.ts` byte and CLS assertions unchanged; editor route JS budget unchanged beyond the dialog leaf |
| Slug stability behind sticker longevity | `apps/api/test/publish.e2e-spec.ts` "keeps the slug after unpublishing, and reuses it on republish" (existing) |

## Known operational notes

- First render after server start pays the Chromium launch (a few seconds); subsequent renders reuse the browser.
- If downloads fail with `RENDER_FAILED` right after deployment, check that a Chromium is installed for `playwright-core` 1.62.1 or that `PDF_CHROMIUM_PATH` points at one, and that `PDF_RENDER_ORIGIN` is reachable from the server itself.
