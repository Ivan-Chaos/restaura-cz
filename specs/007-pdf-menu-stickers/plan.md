# Implementation Plan: PDF Menu & Table Sticker Downloads

**Branch**: `feature/be-fe/mvp-menu-creation` (current; spec dir `007-pdf-menu-stickers`) | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-pdf-menu-stickers/spec.md`

## Summary

Give an owner two downloads from the menu editor: the menu as an A4 PDF and a sheet of numbered table QR stickers, four per A4 page, both rendered in the menu's chosen visual style and both carrying a "Powered by restaura.cz" line that Pro and Pro Plus accounts may switch off. The styles are CSS tokens, `next/font` faces and React presentation recipes that exist only in the frontend, so the frontend produces the documents: two session-gated print routes render the menu and the sticker sheet with the same components and adapter the guest page uses, and Next.js Route Handlers drive a headless Chromium (`playwright-core`, already the e2e engine) at those routes to emit the PDF, and a first-page screenshot for the preview, from one pipeline. The API's only change is an account `plan` column surfaced on `/auth/me`, which is what the branding entitlement keys off. QR codes are drawn as inline SVG from two new design tokens so they stay dark-on-light in every style, and each encodes the public address plus `?table=N`, which the guest page already ignores.

## Technical Context

**Language/Version**: TypeScript 5 (strict) in both apps; Node 22 runtime

**Primary Dependencies**:
- Frontend (`apps/frontend`): Next.js 16.3 (App Router, Server Components, Route Handlers), React 19.2, Tailwind CSS 4, shadcn (base-nova on `@base-ui/react`), `next-intl` 4, `zod`, Storybook 10 + Vitest browser, Playwright + axe. **New runtime**: `playwright-core` 1.62.1 (pinned to the existing `playwright` devDependency so the browser revision agrees), `qrcode` (module matrix only; we draw the SVG). **New dev**: `@types/qrcode`, `jsqr` (decode QR codes in e2e), `pdfjs-dist` (page count and text extraction in e2e).
- API (`apps/api`): NestJS 12, Drizzle ORM, Vitest + supertest. **No new dependencies.**

**Storage**: PostgreSQL via Drizzle. Migration `0005` adds `owner_account.plan text not null default 'free'` with a CHECK on the three plan ids. Produced documents are never stored; every download renders fresh.

**Testing**: API: `pnpm test` (plan literal pin) and `pnpm test:e2e` (`/auth/me` carries `plan`, default `free`, CHECK rejects unknown values). Frontend: `pnpm test:unit` (plan pin + entitlement, sticker-count schema, filename, QR matrix → path, contrast of the two new tokens in every theme), `pnpm test:stories` (print compositions, QR, branding line, download dialog, two passes with axe), `pnpm test:e2e` (`print.spec.ts`: real downloads on a production build, PDF page counts and text via `pdfjs-dist`, QR decoded via `jsqr`, plan flipped in the database), `pnpm lint` (eslint + design-token gate + message-catalogue gate), `pnpm typecheck`.

**Target Platform**: Web. Owners on desktop browsers (downloads, print). The renderer is a Node server with a Chromium binary reachable by `playwright-core`: in development the browsers Playwright already installed; in deployment `pnpm exec playwright install chromium --with-deps` at image build, or a system Chromium via `PDF_CHROMIUM_PATH`. **Not compatible with a serverless frontend deployment**; the repository does not document a deployment target, so this is recorded as a risk (research R2).

**Project Type**: Web application, two apps in one monorepo. Cross-app contract in `specs/001-menu-creation-publishing/contracts/http-api.md`, amended by this feature's `contracts/http-api-delta.md`. Frontend-internal contract (routes, query parameters, response codes, components, messages) in `contracts/print-ui.md`.

**Performance Goals**: Menu PDF for 200 dishes with photos delivered ≤ 10 s (PR-001); 200-sticker sheet ≤ 10 s (PR-002); menu PDF ≤ 15 MB with photos, ≤ 2 MB without, sticker sheet ≤ 5 MB (PR-003); first-page preview ≤ 3 s to appear, ≤ 2 s to update (PR-004); no measurable change to the editor or guest page load (PR-005). QR codes scan from a 100 % A4 print at 30 cm (SC-003).

**Constraints**: Browser never calls the API (AGENTS.md); the browser calls only our own Route Handlers, which relay the session server-side. All text in cs/en/de; tokens only; WCAG 2.1 AA in the dialog and in the documents' text; every action keyboard-operable. Documents always render the light appearance and the solid fallback of translucent styles. Entitlement decided server-side from the account's plan at render time, never from the request. Guest page untouched. Public address stays stable across unpublish/republish (already true, pinned by API e2e). Bounded renderer concurrency and timeouts so a burst of downloads cannot exhaust the server.

**Scale/Scope**: ≤ 1000 dishes per menu (existing cap), 1–200 stickers per sheet. API: 1 migration, 1 pinned literal, 1 field on one payload, 1 helper in tests. Frontend: 2 print pages + 1 print layout, 4 Route Handlers, 1 renderer module (browser singleton, semaphore, render), 6 new components (`PrintMenu`, `MenuSections` extracted from `GuestMenu`, `StickerSheet`, `Sticker`, `QrCode`, `PoweredBy`, `PrintDownloadDialog`), 2 new tokens across 7 theme files, 1 new message namespace × 3 locales, 1 new e2e spec, ~5 unit specs, 5 stories, 4 env vars.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Root constitution v1.0.0, frontend constitution v1.0.0, API constitution v1.0.1.

| Principle | Requirement | How this plan satisfies it | Status |
|-----------|-------------|----------------------------|--------|
| Root I / FE I / API II. Code quality & readability | Strict TS, lint + typecheck clean, reuse before creation, verified framework APIs, no dead code | Reuses `GuestMenu`'s parts (`MenuHeader`, `CategoryHeading`, `DishRow`, `DishCard`, `MenuPanel`, `MenuFooter`, `SafeImage`), the adapter, `themeForVariant`/`presentationForTheme`, `ThemeScope`, `requireProfile`, `getSession`, `getMenu`, shadcn `Dialog`/`Field`/`Input`/`Switch`/`Button`, `PlanId` from `lib/landing/plans.ts`, the API's `slugify` shape. `GuestMenu`'s category loop is extracted into `MenuSections` so `PrintMenu` and `GuestMenu` share one body rather than two copies. Route Handlers (`route.ts`), `cookies()`, `serverExternalPackages` verified in `node_modules/next/dist/docs`; `page.pdf`, `emulateMedia`, `addCookies`, `executablePath` verified in `playwright-core@1.62.1/types`. | PASS |
| Root II / FE II / API IV. Testing | Acceptance scenarios covered at every layer; both sides of the contract tested; real Postgres; deterministic | See quickstart's proof table. API e2e proves `plan` is served and defaults to `free`; frontend `api-contract.test.ts` proves it is expected; both pin the literal list. Playwright downloads the real PDFs from a production build and inspects them (`pdfjs-dist`), decodes real QR codes (`jsqr`), and flips a plan in the database with a helper mirroring `removeProfile`. Renders are deterministic: same content, same style, same options → same text and page count. | PASS |
| Root III / FE III. UX consistency | i18n for all text, tokens only, light + dark, 320–1920, WCAG AA, consistent states | New namespace `Print` in cs/en/de covers dialog and in-document strings; documents use `getTranslations({ locale })` with the owner's locale. Two new tokens (`qr-foreground`, `qr-surface`) added to the catalogue and every theme with a 7:1 contract, so QR codes never depend on a theme's ground. Dialog is shadcn `Dialog` with labelled controls, `role="alert"` errors, pending/disabled states matching `PublishControls`. The dialog renders in the dashboard's light shell; the print routes render only light by design (spec FR-003) and the stories still run both passes to catch hard-coded values. | PASS |
| Root IV / FE IV. Performance | Measurable targets, static where possible, budgets enforced, no heavy client JS | Renderer is server-only; `playwright-core` and `qrcode` add zero bytes to any client route (`serverExternalPackages`). The dialog is one small client leaf on an already-interactive editor page; the guest route is untouched (asserted by e2e). Print routes are dynamic for the same reason the editor is (session-gated owner data); documented below. Budgets from PR-001..PR-004 are asserted in `print.spec.ts` (elapsed time and byte size of downloads, time to first preview). Renderer concurrency is bounded (`PDF_MAX_CONCURRENT_RENDERS`, default 2) with a per-render timeout, so previews and downloads degrade to a queue, never to memory exhaustion. | PASS |
| FE V / API I. Simplicity & justified complexity | Simplest solution; new deps and abstractions justified against existing ones | One pipeline produces both the PDF and its preview (a screenshot of the same page), so there is no second rendering path to keep faithful. No document storage, no job queue, no worker process: a semaphore in-process is enough for the load a restaurant dashboard sees. No new API endpoints; the plan is one column. Each new dependency is recorded in Complexity Tracking with the rejected alternative. | PASS |
| API III. Reliability | Explicit failure behaviour; transactional writes; accurate status codes | The API change is a defaulted column; no new write paths. The frontend Route Handlers return a structured `{ error: { code } }` for every failure (401, 404, 400, 409, 504, 500) and never a partial file: the PDF buffer is complete before any byte is sent. A crashed browser is relaunched on the next request (singleton guards `isConnected()`). | PASS |
| API V. Explicit data contracts | Validate at the boundary; declared shapes; versioned migrations; constraints in Postgres | `plan` is constrained by a CHECK on the pinned literal; migration `0005` generated by drizzle-kit; `PublicAccount.plan` declared in the service and mirrored in `lib/api/types.ts`. Frontend Route Handlers validate `count`, `branding`, `locale` with zod before doing anything. | PASS |
| API Technology constraints | Postgres system of record; config from env; deps pinned | No new API dependency. Plan lives in Postgres. | PASS |
| FE Technology constraints | shadcn via CLI, icons from lucide, `@/i18n/navigation`, no secrets committed | No new primitives needed (`Dialog`, `Field`, `Input`, `Switch`, `Button`, `Skeleton` exist); `Download`, `QrCode`, `FileText` icons from lucide; no navigation changes; renderer settings are server env only. | PASS |
| Cross-app contract | API and frontend change in one reviewable unit, both tested | `http-api-delta.md` mirrored into the canonical contract; `auth.e2e-spec.ts` and `api-contract.test.ts` land together. | PASS |

**Gate result (pre-research)**: PASS. Additions needing justification are recorded in Complexity Tracking; none violates a MUST. One documented dynamic-rendering reason (print routes) below.

## Project Structure

### Documentation (this feature)

```text
specs/007-pdf-menu-stickers/
├── plan.md                         # This file
├── research.md                     # Phase 0: decisions R1–R12
├── data-model.md                   # Phase 1: plan column, derived documents, validation, state
├── quickstart.md                   # Phase 1: how to run and prove it
├── contracts/
│   ├── http-api-delta.md           # account.plan on /auth/me and session payloads
│   └── print-ui.md                 # print routes, Route Handlers, components, messages, env
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/
├── src/db/schema.ts                              # MODIFY: owner_account.plan + CHECK
├── src/db/migrations/0005_*.sql (+ meta)         # NEW: generated
├── src/auth/plans.ts                             # NEW: PLAN_IDS = ['free','pro','proPlus'], DEFAULT_PLAN
├── src/auth/plans.spec.ts                        # NEW: literal pin
├── src/auth/auth.service.ts                      # MODIFY: PublicAccount.plan; every select that builds an account reads plan
├── test/helpers.ts                               # MODIFY: setPlan(accountId, plan)
└── test/auth.e2e-spec.ts                         # MODIFY: me/sign-up/sign-in shapes include plan: 'free'; CHECK rejects 'gold'

specs/001-menu-creation-publishing/contracts/http-api.md   # MODIFY: mirror the delta

apps/frontend/
├── package.json                                  # MODIFY: + playwright-core (exact 1.62.1), qrcode; dev + @types/qrcode, jsqr, pdfjs-dist
├── next.config.ts                                # MODIFY: serverExternalPackages: ['playwright-core']
├── .env.example                                  # MODIFY: PDF_RENDER_ORIGIN, PDF_CHROMIUM_PATH, PDF_CHROMIUM_NO_SANDBOX, PDF_MAX_CONCURRENT_RENDERS
├── app/globals.css                               # MODIFY: @media print joins the translucency fallback block
├── lib/design-system/tokens.ts                   # MODIFY: qr-foreground, qr-surface in MENU_COLOR_TOKENS, TOKEN_PURPOSE, CONTRAST_PAIRS (7:1)
├── styles/themes/*.css (7 files)                 # MODIFY: --qr-foreground / --qr-surface in light and dark blocks
├── app/[locale]/print/layout.tsx                 # NEW: light-only shell, print.css, no cookie banner
├── app/[locale]/print/print.css                  # NEW: @page A4, running header band, sticker page geometry
├── app/[locale]/print/menu/[menuId]/page.tsx     # NEW: PrintMenu in ThemeScope; ?branding=
├── app/[locale]/print/stickers/[menuId]/page.tsx # NEW: StickerSheet in ThemeScope; ?count=&branding=
├── app/api/print/menu/[menuId]/route.ts          # NEW: GET → application/pdf
├── app/api/print/menu/[menuId]/preview/route.ts  # NEW: GET → image/jpeg (first page)
├── app/api/print/stickers/[menuId]/route.ts      # NEW: GET → application/pdf
├── app/api/print/stickers/[menuId]/preview/route.ts # NEW: GET → image/jpeg
├── lib/pdf/browser.ts                            # NEW: lazy Chromium singleton on globalThis, relaunch if disconnected
├── lib/pdf/render.ts                             # NEW: renderPdf / renderPreview: context + cookie, emulateMedia, goto, fonts.ready, pdf/screenshot
├── lib/pdf/semaphore.ts                          # NEW: bounded concurrency
├── lib/pdf/request.ts                            # NEW: shared handler plumbing: session, menu, options parsing, error responses, filename header
├── lib/pdf/filename.ts                           # NEW: file-system-safe name with ASCII fallback + RFC 5987 form
├── lib/pdf/qr.ts                                 # NEW: qrModules(text) → { size, path } via qrcode.create
├── lib/pdf/sticker-url.ts                        # NEW: publicMenuUrl(locale, slug, table)
├── lib/plans/entitlements.ts                     # NEW: planOf(account), canRemoveBranding(plan), resolveBranding(plan, requested)
├── lib/validation/print.ts                       # NEW: stickerCountSchema (1..200 int), brandingSchema, printLocaleSchema
├── lib/api/types.ts                              # MODIFY: Account.plan: PlanId
├── components/menu/MenuSections.tsx              # NEW: extracted category loop (rows/cards/panel) used by GuestMenu and PrintMenu
├── components/menu/GuestMenu.tsx                 # MODIFY: delegates to MenuSections
├── components/print/PrintMenu.tsx                # NEW (+ .stories.tsx): header, sections with break-inside-avoid, footer, PoweredBy
├── components/print/StickerSheet.tsx             # NEW (+ .stories.tsx): pages of 4 Stickers with cut guides
├── components/print/Sticker.tsx                  # NEW: identity, prompt, QrCode, table number, PoweredBy
├── components/print/QrCode.tsx                   # NEW (+ .stories.tsx): SVG from qrModules, currentColor, quiet zone
├── components/print/PoweredBy.tsx                # NEW (+ .stories.tsx): the branding line
├── components/print/RunningHeader.tsx            # NEW: fixed band repeating the menu name on every printed page
├── components/workspace/PrintDownloadDialog.tsx  # NEW (+ .stories.tsx): options, debounced preview <img>, fetch → blob download, errors, no-JS form fallback
├── components/workspace/PrintDownloads.tsx       # NEW: the two trigger buttons + availability hints, hosts both dialogs
├── app/[locale]/workspace/menus/[menuId]/page.tsx    # MODIFY: <PrintDownloads> under PublishControls
├── app/[locale]/workspace/settings/subscription/page.tsx # MODIFY: show the account's real plan name
├── messages/{cs,en,de}.json                      # MODIFY: Print namespace; Settings.subscriptionTab plan wording
├── tests/unit/plans.test.ts                      # NEW: literal pin vs API, entitlements, resolveBranding
├── tests/unit/print-validation.test.ts           # NEW: count schema, filename, sticker url
├── tests/unit/qr.test.ts                         # NEW: matrix size/path for a known input, quiet zone
├── tests/unit/api-contract.test.ts               # MODIFY: account fixtures carry plan
├── tests/unit/contrast.test.ts                   # (unchanged; picks up the new pairs from tokens.ts)
├── tests/e2e/helpers/database.ts                 # MODIFY: setPlan(email, plan)
├── tests/e2e/helpers/owner.ts                    # MODIFY: openDownloads(page), downloadPdf(page, kind, options) helpers
├── tests/e2e/print.spec.ts                       # NEW: US1–US4, budgets, QR decode, guest page unchanged with ?table
├── tests/e2e/public-menu.spec.ts                 # MODIFY: ?table=3 renders identically
└── AGENTS.md                                     # MODIFY: printing section (renderer, print routes, tokens, entitlement, env)
```

**Structure Decision**: Existing two-app layout. The API gains a column and a pinned literal; nothing else. The frontend gains a `print` route group beside `preview` (same reasoning: full-bleed, outside the dashboard shell, carries its own gate), an `api/print` group of Route Handlers (the proxy already skips `/api`), a `lib/pdf` module that owns the browser, and a `components/print` family that composes existing menu parts. The download UI lives in `components/workspace/` beside `PublishControls`, which is where the owner already thinks about the public address.

**Dynamic rendering, documented (FE constitution IV)**: `app/[locale]/print/**` is `force-dynamic`: it renders one owner's private menu behind a session, exactly like `/preview`. The Route Handlers under `app/api/print/**` are dynamic by nature (they read cookies and produce a per-request binary).

## Complexity Tracking

| Violation / Addition | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `playwright-core` as a frontend runtime dependency, plus a Chromium binary at deploy | The spec's "inherit styles from the main menu" means the six styles' CSS tokens, `next/font` faces, Tailwind utilities and presentation recipes must render as they do for guests. Only a browser engine renders that CSS. Playwright is already the project's browser driver, so no second automation stack is introduced. | `@react-pdf/renderer`: its own layout engine, no CSS variables, would mean re-implementing six styles twice (menu and stickers) and keeping them in sync by hand. `window.print()`: no file delivered, no filename or progress, no server-side entitlement. Puppeteer: same engine, second dependency. |
| Preview served as a first-page screenshot from the same renderer | The preview must match the PDF, including pagination and the light appearance. Only `warm.css` honours `data-appearance="light"`; an `<iframe>` of the print route inside an owner's dark-mode dashboard would render dark for five of six styles. One pipeline also means one thing to keep faithful. | `<iframe>` of the print route: wrong appearance for non-default themes unless every theme file gains a pinned-light rule (a foundations change touching seven files for a preview), and page breaks would not match. Static swatches: not a preview of the owner's document. |
| Two new required colour tokens `qr-foreground` / `qr-surface` (foundations change: `tokens.ts` + 7 theme files + contrast pair) | A QR code must stay dark-on-light at high contrast in every style; Green Bar's light appearance is a dark board, so `foreground`/`background` would invert the code, and inverted codes fail on many scanners. | Hard-coded black on white: forbidden by the design-token gate and would clash with themed stickers. Reusing `card`/`card-foreground`: dark in Green Bar. Reusing `overlay-foreground`/`overlay`: semantically a scrim, and `overlay` is dark. |
| `qrcode` runtime dependency (matrix generation only) | Reed–Solomon encoding and mask selection are not something to hand-roll; the package is dependency-free and we consume only its matrix, drawing the SVG ourselves with `currentColor` so tokens apply. | Letting `qrcode` emit its own SVG: hard-codes hex colours. A PNG data URI: raster in a print document, larger file, no theming. |
| In-process render semaphore and timeout (`lib/pdf/semaphore.ts`) | A dashboard's burst of downloads and previews must not launch unbounded Chromium pages; PR-001/PR-004 need a predictable ceiling. | A job queue and worker: more moving parts than a bounded in-process gate for a load that is, at most, a handful of owners at once. |
| Extracting `MenuSections` from `GuestMenu` | `PrintMenu` needs the same rows-or-cards-per-category logic; copying it would be the duplicated functionality the constitution forbids. | Reusing `GuestMenu` whole: it renders `CategoryNav`, `LanguageSwitcher` and `AppearanceToggle`, none of which belong on paper. |
| Dev dependencies `jsqr` and `pdfjs-dist` (tests only) | SC-003 and content parity are only provable by decoding a real QR code and reading a real PDF. | Asserting on bytes or regexes: Chromium's PDF object streams are not reliably greppable, and a QR code's correctness is its decodability. |

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 artifacts were written:

- **Contract**: additive only. `account.plan` has a default on every path (`free`) and every frontend consumer treats a missing value as `free`, so an older API keeps working. Delta documented and mirrored; both test suites named.
- **Entitlement**: decided in the Route Handler and again in the print page from the session's plan at render time; the `branding` query parameter is a request, not an authority. Free-plan tampering is a named e2e case.
- **Guest page**: untouched. `?table=N` is ignored by `app/[locale]/m/[slug]/page.tsx` as any unknown parameter is; `public-menu.spec.ts` asserts identical rendering with and without it.
- **Validation at the boundary**: `count`, `branding`, `locale`, `menuId` parsed by zod in one shared helper used by all four handlers and both pages; failures return `400 VALIDATION_FAILED` with a localized message that names the range.
- **Frontend rules**: the only new `"use client"` leaf is `PrintDownloadDialog` (and the thin `PrintDownloads` host), both dashboard-only. Print compositions are Server Components; `SafeImage` (already client) keeps its role. All copy in three catalogues; no literal visual values (the QR path is `currentColor`; the two tokens are catalogue entries); stories verified in both passes with axe.
- **Performance**: renderer is server-only; zero new client bytes on guest or landing routes; concurrency bounded; budgets asserted in Playwright; the preview endpoint is debounced client-side and its response is `no-store`.
- **Simplicity**: no document storage, no queue, no worker, no new API endpoint. Seven justified additions, none speculative; the foundations change is the smallest that makes QR contrast a system property rather than a hope.
- **Deployment risk (not a gate failure)**: the frontend host must run Node with Chromium available. Recorded in research R2 and quickstart; the repository does not yet document its deployment target.

**Gate result (post-design)**: PASS.
