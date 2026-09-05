# Contract: Print Routes, Route Handlers and Download UI (frontend)

**Date**: 2026-09-04 | **Plan**: [../plan.md](../plan.md) | **Research**: R3–R10, R12

The frontend-internal contracts this feature introduces: the print pages the renderer (and a person) can open, the Route Handlers the dialog calls, their query parameters and error codes, the components and their props, the message keys, and the environment. Stories, unit tests and `tests/e2e/print.spec.ts` pin them.

## 1. Print pages (Server Components, session-gated, `force-dynamic`, `noindex`)

| Route | Query | Renders | Not available when |
|---|---|---|---|
| `/[locale]/print/menu/[menuId]` | `branding=0\|1` (optional) | `PrintMenu` inside `ThemeScope(themeForVariant(menu.visualVariant))` | no session → sign-in redirect (via `requireProfile`); unknown/unowned menu → 404 |
| `/[locale]/print/stickers/[menuId]` | `count=1..200` (required), `branding=0\|1` (optional) | `StickerSheet` inside the same scope | as above; menu not published → 404; invalid `count` → 404 |

Both pages compute `showBranding = resolveBranding(planOf(session.account), branding)`. Both wrap content in `app/[locale]/print/layout.tsx`, which imports `print.css`, renders no cookie banner and no appearance toggle, and sets `<meta name="robots" content="noindex, nofollow">` through metadata.

## 2. Route Handlers (`app/api/print/**`, outside the locale segment; the proxy skips `/api`)

| Method + path | Query | Success | Failure codes |
|---|---|---|---|
| `GET /api/print/menu/[menuId]` | `locale`, `branding` | `200 application/pdf`, `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…` | `UNAUTHENTICATED` 401 · `NOT_FOUND` 404 · `VALIDATION_FAILED` 400 · `EMPTY_MENU` 409 · `RENDER_TIMEOUT` 504 · `RENDER_FAILED` 500 |
| `GET /api/print/menu/[menuId]/preview` | `locale`, `branding` | `200 image/jpeg` (794 × 1123, first page) | as above |
| `GET /api/print/stickers/[menuId]` | `locale`, `count`, `branding` | `200 application/pdf` with attachment disposition | as above, plus `NOT_PUBLISHED` 409 |
| `GET /api/print/stickers/[menuId]/preview` | `locale`, `count`, `branding` | `200 image/jpeg` | as above |

Common rules:
- `Cache-Control: private, no-store` on every response.
- Failure body: `{ "error": { "code": "<PrintErrorCode>" } }`. No developer message is rendered; the dialog translates the code from `Print.errors`.
- `locale` defaults to `cs`; any value outside `routing.locales` is `VALIDATION_FAILED`.
- `branding` other than `"0"`/`"1"` is treated as absent. Entitlement is decided server-side; a Free account asking for `branding=0` still receives a branded document (200, not an error).
- The handler resolves the menu through `getMenu(menuId)` (owner-scoped API call); the API's 404 for a stranger's menu is passed through unchanged.
- The PDF is fully rendered into memory before the response starts. A response is either a complete document or a JSON error; never a partial file.

## 3. Renderer (`lib/pdf/*`, server-only)

```ts
renderPdf(target: PrintTarget, session: RelayedCookie): Promise<Buffer>
renderPreview(target: PrintTarget, session: RelayedCookie): Promise<Buffer>   // JPEG of page 1
// PrintTarget = { path: `/${locale}/print/menu/${id}` | `/${locale}/print/stickers/${id}`, search: URLSearchParams, timeoutMs }
```

- One Chromium per process (`lib/pdf/browser.ts`), launched lazily with `executablePath: process.env.PDF_CHROMIUM_PATH` when set and `chromiumSandbox: process.env.PDF_CHROMIUM_NO_SANDBOX !== 'true'`; relaunched when disconnected.
- Per request: new context (`colorScheme: 'light'`, viewport 794 × 1123, `deviceScaleFactor: 1`), `addCookies` for the session at `PDF_RENDER_ORIGIN`, `emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' })`, `goto(origin + path + search, { waitUntil: 'networkidle' })`, `document.fonts.ready`, then `pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, margin: 0 })` or `screenshot({ type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 794, height: 1123 } })`. Context closed in `finally`.
- Concurrency bounded by `lib/pdf/semaphore.ts` (`PDF_MAX_CONCURRENT_RENDERS`, default 2). Timeouts: menu PDF 25 s, stickers 15 s, previews 10 s → `RENDER_TIMEOUT`.

## 4. Components

### `components/print/PrintMenu.tsx` (server)
```ts
{ menu: Menu; presentation: Presentation; showBranding: boolean; runningTitle: string }
```
`RunningHeader` (fixed band) → `MenuHeader layout={presentation.header}` (no actions) → `MenuSections` → `MenuFooter` → `PoweredBy` when `showBranding`.

### `components/menu/MenuSections.tsx` (server, extracted from `GuestMenu`)
```ts
{ categories: MenuCategory[]; presentation: Presentation; avoidPageBreaks?: boolean }
```
Per-category rows-or-cards decision, `MenuPanel` wrapping and `CategoryHeading`, exactly as `GuestMenu` does today. With `avoidPageBreaks`, each dish sits in a `break-inside-avoid` box and headings carry `break-after-avoid`. `GuestMenu` renders this with the flag off; its behaviour and markup are unchanged (pinned by the existing `public-menu.spec.ts`).

### `components/print/StickerSheet.tsx` (server)
```ts
{ count: number; stickers: (n: number) => StickerProps }   // or: { count; restaurant: Establishment-like; publicUrlFor(n); prompt; showBranding }
```
Renders `Math.ceil(count / 4)` pages; page `k` holds stickers `4k+1 … min(4k+4, count)`. Fixed page box (`297mm` minus `@page` margins), 2 × 2 grid, dashed guides on shared edges only.

### `components/print/Sticker.tsx` (server)
```ts
{ tableNumber: number; url: string; restaurantName: string; logo?: ImageModel; prompt: string; tableLabel: string; showBranding: boolean }
```

### `components/print/QrCode.tsx` (server)
```ts
{ value: string; className?: string; label: string }   // label → <title> for assistive tech
```
`<svg role="img" aria-labelledby>` with one `<path fill="currentColor">` from `qrModules(value)`, `shape-rendering="crispEdges"`, 4-module quiet zone as padding on a `bg-qr-surface text-qr-foreground rounded-md` tile.

### `components/print/PoweredBy.tsx` (server)
```ts
{ className?: string }
```
Text from `Print.poweredBy` with `restaura.cz` as the visible address; `text-muted-foreground text-xs`.

### `components/workspace/PrintDownloads.tsx` (client host, thin)
```ts
{ locale: string; menuId: string; menuName: string; status: MenuStatus; hasDishes: boolean; plan: PlanId }
```
Two buttons with lucide `FileText` and `QrCode`; each disabled with a hint (`Print.menuNeedsDishes`, `Print.stickersNeedPublish`) when its precondition fails; opens the matching `PrintDownloadDialog`.

### `components/workspace/PrintDownloadDialog.tsx` (client)
```ts
{ kind: 'menu' | 'stickers'; locale: string; menuId: string; canRemoveBranding: boolean; open: boolean; onOpenChange(open: boolean): void;
  /** Injected so stories never hit the network. */ fetchDocument?: typeof fetch }
```
- Fields: `count` (stickers; default 12; `stickerCountSchema`; inline error `Print.countInvalid`), `showBranding` (`Switch`, present iff `canRemoveBranding`, default off).
- Preview: `<img alt={Print.previewAlt}>` with `src` = preview endpoint + current options, debounced 400 ms; `Skeleton` while loading; on error a `Print.previewUnavailable` notice and the download stays enabled.
- Download: `<form method="get" action={documentUrl}>`; JS intercepts → `fetch` → blob → `<a download>`; filename read from `Content-Disposition`. Pending: button disabled, `Print.preparing` announced via `aria-live`. Error: `role="alert"` with `Print.errors.<code>` and a Retry button. Success: toast `Print.downloaded`.
- Keyboard: standard shadcn `Dialog` focus trap; every control labelled; the preview image is not focusable.

## 5. URL building

- Document: `/api/print/${kind}/${menuId}?locale=${locale}&branding=${showBranding ? 1 : 0}[&count=N]`
- Preview: same with `/preview` before the query.
- Sticker QR content: `publicMenuUrl(locale, slug, n)` = `${NEXT_PUBLIC_SITE_URL}/${locale}/m/${slug}?table=${n}` (origin without trailing slash; default `http://localhost:3000`).

## 6. Filenames (`lib/pdf/filename.ts`)

`documentFilename(menuName, suffix)` → `${slug(menuName) || 'menu'}-${suffix}.pdf` where `slug` is the API's `slugify` rule (NFD, strip marks, lowercase, non-alphanumerics to `-`, ≤ 60 chars). Header: `attachment; filename="<ascii>"; filename*=UTF-8''<percent-encoded>`. Suffixes come from `Print.fileSuffix.menu` / `Print.fileSuffix.stickers` in the owner's locale.

## 7. Messages (`Print` namespace, cs/en/de)

| Key | Intent |
|---|---|
| `downloadMenu`, `downloadStickers` | trigger buttons |
| `menuNeedsDishes`, `stickersNeedPublish` | disabled hints |
| `dialogTitle.menu`, `dialogTitle.stickers`, `dialogDescription.menu`, `dialogDescription.stickers` | dialog header |
| `countLabel`, `countHint`, `countInvalid` | sticker count field; `countInvalid` names the range 1–200 |
| `brandingLabel`, `brandingHint` | the switch |
| `previewAlt`, `previewLoading`, `previewUnavailable` | preview image |
| `download`, `preparing`, `retry`, `downloaded`, `cancel` | actions and states |
| `errors.UNAUTHENTICATED`, `errors.NOT_FOUND`, `errors.VALIDATION_FAILED`, `errors.NOT_PUBLISHED`, `errors.EMPTY_MENU`, `errors.RENDER_TIMEOUT`, `errors.RENDER_FAILED` | handler failures |
| `poweredBy` | "Powered by restaura.cz" |
| `scanPrompt` | "Scan to see the menu" |
| `table` | "Table {number}" |
| `fileSuffix.menu`, `fileSuffix.stickers` | filename suffixes |
| `metaTitle.menu`, `metaTitle.stickers` | print page titles |

`Settings.subscriptionTab.planName` is replaced by rendering `Landing.plans.{plan}.name`; `planDescription` wording adjusted to no longer claim one plan for everyone.

## 8. Environment (`apps/frontend/.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `PDF_RENDER_ORIGIN` | `http://localhost:${PORT ?? 3000}` | Address the headless browser uses to reach this Next server |
| `PDF_CHROMIUM_PATH` | unset (Playwright's installed Chromium) | Path to a system Chromium binary |
| `PDF_CHROMIUM_NO_SANDBOX` | `false` | Set `true` only where the container forbids the sandbox |
| `PDF_MAX_CONCURRENT_RENDERS` | `2` | Renderer concurrency ceiling |

`next.config.ts`: `serverExternalPackages: ['playwright-core']`.

## 9. Design tokens (foundations)

`qr-foreground`, `qr-surface` added to `MENU_COLOR_TOKENS` and `TOKEN_PURPOSE`; `CONTRAST_PAIRS` gains `{ foreground: 'qr-foreground', background: 'qr-surface', min: 7 }`. Declared in the light and dark blocks of all seven theme files as a dark palette step on a light palette step. `tests/unit/themes.test.ts` and `contrast.test.ts` enforce presence and ratio.

`app/globals.css`: the translucency fallback block gains `@media print` with the same overrides (`--panel: var(--surface-raised); --panel-blur: 0px; --ambient: none`).
