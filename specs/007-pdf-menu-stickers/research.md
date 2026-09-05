# Research: PDF Menu & Table Sticker Downloads

**Date**: 2026-09-04 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Every decision below was checked against the installed code and docs (`apps/api/src`, `apps/frontend`, `node_modules/next/dist/docs`, `node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/types/types.d.ts`). No `NEEDS CLARIFICATION` remained after this phase.

## R1. Rendering engine: headless Chromium rendering the real menu components

**Decision**: Documents are produced by a headless Chromium (`playwright-core`, the engine the e2e suite already drives) navigating to dedicated print routes served by the same Next.js server, then calling `page.pdf()`. The print routes render the menu with the very same components, adapter, theme scope and presentation recipe as the guest page.

**Rationale**:
- "Inherit styles from the main menu" is literal here: a style is a CSS file of tokens under `[data-theme]`, faces loaded by `next/font`, Tailwind utilities declared `@theme inline`, and a structural recipe in `lib/menu-display/presentation.ts` consumed by `MenuHeader`, `CategoryHeading`, `DishRow`, `DishCard`, `MenuPanel`. Only a browser engine renders that. Anything else re-implements six styles by hand and lets them drift.
- Chromium's PDF output keeps text as text (searchable, selectable, accessible with `tagged: true`), embeds the exact web fonts, and draws inline SVG (the QR codes) as vectors. File sizes stay inside PR-003 without effort.
- `playwright-core` 1.62.1 is already in the workspace lockfile as `playwright`'s core; pinning the same exact version means the browser revision Playwright installed for e2e is the one the renderer launches. Verified in the installed types: `page.pdf({ format, printBackground, preferCSSPageSize, tagged, margin })`, `page.emulateMedia({ media, colorScheme, reducedMotion })`, `context.addCookies`, `chromium.launch({ executablePath, chromiumSandbox })`.

**Alternatives considered**:
- *`@react-pdf/renderer`*: its own layout engine (Yoga) and style props; no CSS custom properties, no Tailwind, no `next/font`. Six styles × two documents re-implemented and maintained separately. Rejected.
- *Browser-side `window.print()` on the print route*: perfect fidelity, zero server work, but no file is delivered, filename and paper size depend on the browser's dialog, there is no progress or retry, and the branding entitlement would be client-enforced. Rejected as the primary path. The print routes it would have used exist anyway and remain usable by a person for a quick print.
- *Puppeteer*: same engine, a second automation dependency next to Playwright. Rejected.
- *Client-side `html2canvas` + `jsPDF`*: rasterised text, large files, poor accessibility. Rejected.

## R2. Ownership: the frontend produces documents; the API adds only the plan

**Decision**: PDF and preview generation live in Next.js Route Handlers under `app/api/print/**`. The API's contribution is one column, `owner_account.plan`, surfaced on every account payload. No new API endpoints.

**Rationale**:
- Every input a document needs is already available to the frontend server: the menu via `getMenu` (`GET /menus/:menuId`, owner-scoped), the restaurant name and logo via the session's profile, the visual style, and now the plan via `/auth/me`. Rendering is presentation, and presentation is the frontend's domain (`AGENTS.md`, feature 005).
- The AGENTS.md rule "the browser never calls the API" holds: the browser calls our own Route Handlers, which read the session cookie with `cookies()` (verified in `route.md`) and relay it, exactly as Server Components and Actions do through `lib/api/client.ts`.
- Entitlement is still system-enforced (FR-017): the Route Handler and the print page both resolve the branding decision from the plan the API reports, never from the request.
- An API-owned renderer would need the API to reach the frontend with a trusted token, a shared secret between the apps, and a Chromium in the API image: strictly more coupling for no gain.

**Deployment consequence (risk, recorded)**: the frontend must run as a long-lived Node server with a Chromium binary present. `pnpm exec playwright install chromium --with-deps` at image build, or `PDF_CHROMIUM_PATH` pointing at a system Chromium, covers containers and VMs. A serverless frontend (Vercel functions) cannot host this without `@sparticuz/chromium`-style packaging, which is out of scope. The repository documents no deployment target; the quickstart states the requirement plainly.

**Alternatives considered**: API-owned rendering (above); a third "renderer" service (a whole deployable for one function). Rejected.

## R3. Print routes: `/[locale]/print/menu/[menuId]` and `/[locale]/print/stickers/[menuId]`

**Decision**: Two Server Component pages under `app/[locale]/print/`, gated by `requireProfile(locale)` like `/preview`, `force-dynamic`, `robots: noindex`. They render inside a `ThemeScope` for `themeForVariant(menu.visualVariant)` with `presentationForTheme`, wrapped by a `print/layout.tsx` that imports `print.css` and omits the cookie banner. Query parameters: `branding` (`0`/`1`) on both, `count` on stickers. The stickers page answers `notFound()` for an unpublished menu (no public address, nothing to encode).

**Rationale**:
- The same reasoning that put `/preview` outside `/workspace` applies: full-bleed, not the dashboard shell, and it must carry its own gate because it is not under the layout that gates. Owners can also open these routes directly and use the browser's print dialog; nothing about them is renderer-specific.
- `PrintMenu` composes `MenuHeader` (no `actions`), `MenuSections` (extracted from `GuestMenu`, see R9), `MenuFooter`, a `RunningHeader` and `PoweredBy`. `StickerSheet` lays out `Sticker`s four per page. Both read the same `Menu` model the adapter produces, so they cannot drift from what guests see.
- The page enforces branding itself (`resolveBranding(plan, requested)`), so even a person opening the URL by hand cannot see an unbranded document they are not entitled to.

**Alternatives considered**: a single route with a `kind` parameter (two documents with different geometry share almost nothing at page level); rendering HTML to a string and `page.setContent` (loses Next's compiled CSS, fonts and image optimiser). Rejected.

## R4. Route Handlers: `app/api/print/{menu,stickers}/[menuId]{,/preview}/route.ts`

**Decision**: Four `GET` handlers. `…/[menuId]` returns `application/pdf` with `Content-Disposition: attachment`; `…/[menuId]/preview` returns `image/jpeg` of the first A4 page. Query: `locale` (validated against `routing.locales`, default `cs`), `branding`, `count` (stickers). All responses `Cache-Control: private, no-store`. Failures are JSON `{ error: { code } }` with codes `UNAUTHENTICATED` (401), `NOT_FOUND` (404: unknown or unowned menu), `VALIDATION_FAILED` (400), `NOT_PUBLISHED` (409, stickers only), `EMPTY_MENU` (409, menu PDF only), `RENDER_TIMEOUT` (504), `RENDER_FAILED` (500).

**Rationale**:
- The proxy's matcher already excludes `/api` (`proxy.ts`), so these paths are not localised or redirected; the document language travels as `locale=`, which is the owner's interface language at the moment of download (spec assumption).
- Shared plumbing in `lib/pdf/request.ts`: read session (`getSession()`), fetch the menu (`getMenu`), parse options (`lib/validation/print.ts`), decide branding (`lib/plans/entitlements.ts`), build the print URL, call the renderer, set headers. Each handler is a few lines.
- Ownership is the API's: `GET /menus/:menuId` answers 404 for another owner's menu, and the handler passes that through, so a draft and a stranger's menu look identical, as everywhere else.
- Complete-buffer responses: `page.pdf()` resolves to a `Buffer`; nothing is streamed, so a failure can never produce a truncated file (FR-023).

## R5. Light appearance and print media, and why the preview is a screenshot

**Decision**: The renderer opens a fresh browser context (`colorScheme: 'light'`, no storage) and calls `page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' })` before navigating. Both the PDF and the preview come from that page: `page.pdf()` and `page.screenshot({ type: 'jpeg', quality: 80, clip: first A4 page })`. The translucency fallback in `app/globals.css` gains `@media print` alongside `prefers-reduced-transparency`, so Liquid Glass prints on solid panels with no ambient field.

**Rationale**:
- `AppearanceProvider` uses `next-themes` with `defaultTheme="system"`; a fresh context with a light colour scheme and no `restaura-appearance` key never adds `.dark` to `<html>`. That is the light appearance for every theme, with no CSS change.
- Only `warm.css` redeclares tokens under `[data-appearance="light"]`; the five owner-selectable styles from feature 005 do not. An `<iframe>` preview of the print route inside an owner's dark-mode dashboard would therefore render five of six styles dark, and its page breaks would not match the PDF's. A screenshot from the renderer is exactly the document's first page, appearance and pagination included.
- Emulating print media for the screenshot too means `@page`, `break-*` and the print fallback all apply identically to both outputs.
- `reducedMotion: 'reduce'` disables the ambient drift and entrance motion; the `@media print` fallback removes the ambient image entirely, which is what paper wants.

**Alternatives considered**: extending `[data-appearance="light"]` to every theme (a seven-file foundations change made for a preview, and the theme test parser expects exact selectors); an inline script stripping `.dark` on the print page (a workaround fighting the provider); `forcedTheme` on the provider (the root layout cannot know the route without `headers()`, which would make every page dynamic). Rejected.

## R6. Session relay to the renderer

**Decision**: The Route Handler reads the `restaura_session` cookie from `cookies()` and injects it into the renderer's context with `context.addCookies([{ name, value, url: PDF_RENDER_ORIGIN, httpOnly: true, sameSite: 'Lax' }])`. `PDF_RENDER_ORIGIN` is the internal address Chromium uses to reach this Next server (default `http://localhost:${PORT ?? 3000}`).

**Rationale**: The print route is gated by `requireProfile`, so the renderer must act as the owner. The cookie never leaves the server: handler and browser run on the same machine, and the context is closed after the render. An alternative one-time token scheme would add a signing secret and a second gate for the same effect.

**Alternatives considered**: signed one-time URLs (more machinery, same trust boundary); an ungated internal-only route (any process on the host could read any owner's menu). Rejected.

## R7. Browser lifecycle, concurrency and timeouts

**Decision**: `lib/pdf/browser.ts` lazily launches one Chromium per server process and keeps it on `globalThis` (survives dev HMR), relaunching if `browser.isConnected()` is false. `lib/pdf/semaphore.ts` bounds concurrent renders to `PDF_MAX_CONCURRENT_RENDERS` (default 2); waiting requests queue. Each render has a hard timeout (25 s menu PDF, 15 s stickers, 10 s previews) after which the context is closed and the handler answers `504 RENDER_TIMEOUT`. `chromiumSandbox` stays on unless `PDF_CHROMIUM_NO_SANDBOX=true` (some containers need it). `next.config.ts` lists `playwright-core` in `serverExternalPackages` (Node-specific package; documented in `serverExternalPackages.md`).

**Rationale**: Launching Chromium costs seconds; a persistent browser with per-request contexts is the standard pattern and is what makes PR-001/PR-004 reachable. Bounded concurrency is what keeps a burst of preview requests from exhausting memory. Contexts, not pages, are per request so cookies and storage never leak between owners.

## R8. Wait strategy and PDF options

**Decision**: `page.goto(url, { waitUntil: 'networkidle' })`, then `await page.evaluate(() => document.fonts.ready)`, then `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })`. Margins live in `@page` (`print.css`) so the in-browser print dialog and the renderer agree. Viewport 794 × 1123 CSS px (A4 at 96 dpi), `deviceScaleFactor: 1`.

**Rationale**: `networkidle` covers the optimiser-served photos and the logo; `fonts.ready` covers `next/font` faces that load on first use (`preload: false` for the non-default styles). `SafeImage` hydrates in the headless page, so a missing object falls back to the no-image presentation before the snapshot (edge case in the spec). `printBackground` is what makes themed grounds print at all; `tagged` produces a structured, accessible PDF.

## R9. Print compositions and pagination

**Decision**:
- `MenuSections` is extracted from `GuestMenu` (the per-category rows-or-cards decision, `MenuPanel` wrapping, `CategoryHeading`) and used by both. `GuestMenu` keeps header actions and nav; `PrintMenu` uses `MenuHeader` without `actions`, no `CategoryNav`, `MenuSections`, `MenuFooter`, then `PoweredBy` in normal flow at the very end (final page only, FR-014).
- Each dish is wrapped in a `break-inside-avoid` box inside `MenuSections` when rendering for print (a `print` prop, or simply always; the utility is inert on screen). Section headings get `break-after-avoid` so a heading never ends a page alone.
- `RunningHeader` is a `position: fixed; top: 0` band with the menu name and restaurant identity; Chromium repeats fixed elements on every printed page, which satisfies FR-004 with the theme's own type. `print.css` gives `body` top padding equal to the band so page one does not overlap it, and `@page { size: A4; margin: 12mm 14mm }`.
- `StickerSheet` renders ⌈count / 4⌉ `section`s of exactly `297mm − margins` height with `break-after: page`, each a 2 × 2 grid with `border-dashed border-border` cut guides on the inner edges and a safe inner padding. `Sticker`: logo (`SafeImage`) or restaurant name, the localized prompt, `QrCode` at ≥ 44 mm, the table number in the display face at a size legible while standing, `PoweredBy` when branding is on. Long names wrap; the grid rows are fixed height so nothing overflows into a neighbour.

**Rationale**: Reuse before creation; the recipe and tokens do all the styling; only pagination is new, and it is CSS the browser already understands. Fixed-height sticker cells make the sheet's geometry independent of content length, which the cut guides require.

## R10. QR codes: matrix from `qrcode`, SVG drawn by us, coloured by two new tokens

**Decision**: `lib/pdf/qr.ts` calls `qrcode.create(text, { errorCorrectionLevel: 'Q' })` and turns the module matrix into one SVG path string. `QrCode.tsx` renders `<svg viewBox …><path fill="currentColor" d=… /></svg>` on a tile with a 4-module quiet zone, classes `bg-qr-surface text-qr-foreground`. Two new required colour tokens, `qr-surface` and `qr-foreground`, are added to `MENU_COLOR_TOKENS`, `TOKEN_PURPOSE` and `CONTRAST_PAIRS` with `min: 7` (both appearances), and declared in all seven theme files as a near-black on a near-white from the theme's own palette (e.g. warm: `cocoa-950` on `cream-50`; green-bar: `bottle-950` on `cream-50`). The encoded text is `${NEXT_PUBLIC_SITE_URL}/${locale}/m/${slug}?table=${n}`.

**Rationale**:
- Green Bar's light appearance is a dark board; a QR drawn in `foreground` on `background` there is an inverted code, which many scanner apps reject. Sticker readability cannot depend on a theme author remembering that, so it becomes a token with a contract the contrast test enforces.
- Error correction Q (25 %) tolerates the wear a table sticker gets; at ≥ 44 mm on a quarter-A4 sticker a version-4/5 code has modules of ~1.2 mm, comfortably scannable at 30 cm (SC-003).
- Drawing the SVG ourselves keeps colour in tokens (the design-token gate forbids hex in components) and keeps the code a vector in the PDF.
- `?table=N` is an unknown query parameter to `app/[locale]/m/[slug]/page.tsx`; Next ignores it and the page is `force-dynamic`, so there is no cache key concern. The guest page is not modified (FR-010); `public-menu.spec.ts` asserts identical rendering.

**Alternatives considered**: `qrcode.toString(..., { type: 'svg' })` (emits hex colours); a PNG data URI (raster, larger, unthemable); encoding the table in the path (`/m/slug/t/3`) (a new route on the guest side, which the spec forbids touching). Rejected.

## R11. Account plan: one column, one pinned literal, surfaced everywhere an account is

**Decision**: `owner_account.plan text not null default 'free'` with `CHECK (plan in ('free','pro','proPlus'))`, migration `0005`. `apps/api/src/auth/plans.ts` pins `PLAN_IDS` and `DEFAULT_PLAN`; `PublicAccount` gains `plan`, read in every select that builds an account (sign-up returns `free`, sign-in, `resolveSession`, `/auth/me`). No endpoint changes a plan (out of scope); tests set it in the database (`setPlan` helpers on both sides, mirroring `markEmailVerified` and `removeProfile`). Frontend: `Account.plan: PlanId` (the `PlanId` type already in `lib/landing/plans.ts`), `lib/plans/entitlements.ts` with `planOf(account)` (missing → `free`), `canRemoveBranding(plan)` (`pro` and `proPlus`), `resolveBranding(plan, requested)` (Free → always `true`; paid → `requested ?? false`). `tests/unit/plans.test.ts` pins the literal against the API's, as `variants.test.ts` does. The subscription settings tab shows the account's real plan name via `Landing.plans.{id}.name` instead of a constant.

**Rationale**: The pricing catalogue already names exactly these three plans with these ids, so the wire vocabulary exists; storing it verbatim avoids a mapping. A CHECK makes the vocabulary a database invariant (API constitution V). Defaulting to `free` keeps every existing account and every older client correct (FR-015). Deciding branding in one pure function, called by the handler and by the page, is what makes FR-017 testable.

**Alternatives considered**: an `entitlements` table or a `subscription` table (billing is not specified; a column can migrate into one later); a boolean `brandingRemovable` (encodes a policy, not a fact). Rejected.

## R12. Download dialog: options, debounced preview, fetch-to-blob, no-JS fallback

**Decision**: `PrintDownloads` (server-fed props: locale, menuId, status, hasDishes, plan) renders two buttons under `PublishControls`; each opens a `PrintDownloadDialog` (client) with: for stickers, a `count` number field (shadcn `Field` + `Input`, zod `stickerCountSchema`, inline localized message naming the range); for entitled owners, a `Switch` "Show Restaura branding" defaulting to off; a preview `<img>` whose `src` is the preview endpoint with the current options, updated after a 400 ms debounce, with a `Skeleton` while loading and a localized notice on error (download stays enabled, FR-019); a Download button inside a `<form method="get" action={pdfUrl}>`. With JavaScript the submit is intercepted: `fetch(pdfUrl)` → on `ok`, `blob()` → object URL → programmatic `<a download={filename}>` click → success toast; on failure, parse `{ error: { code } }` → `role="alert"` message from `Print.errors` with a Retry button. Pending state disables the button and announces progress. Without JavaScript the form navigates to the handler, which answers `Content-Disposition: attachment`, so the browser downloads and the page stays. The menu button is disabled with a hint when the menu has no dishes; the stickers button is disabled with a hint when the menu is not published.

**Rationale**: A same-origin fetch to our own handler is the pattern the constitution prefers over inventing a streaming Server Action, and it is what gives FR-022/FR-023 their progress and retry. The plain form fallback keeps the download reachable with scripts off. Filename comes from the response's `Content-Disposition` so there is one source (`lib/pdf/filename.ts`).

**Alternatives considered**: a Server Action returning bytes (no streaming, base64 through RSC); opening the PDF in a new tab (no filename control, no error handling). Rejected.
