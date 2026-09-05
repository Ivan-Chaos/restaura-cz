# Data Model: PDF Menu & Table Sticker Downloads

**Date**: 2026-09-04 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) (R10, R11, R12)

## Principle

Documents are derived, never stored. The one durable fact this feature adds is which plan an account is on; everything else is computed at request time from records that already exist (menu, sections, items, restaurant profile) plus the owner's options for that one download.

## Schema changes (migration `0005`)

### `owner_account` (modified)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `plan` | `text` | no | `'free'` | One of the pinned plan ids. Never derived; set by a future billing feature, or directly in the database until then. |

Constraint `owner_account_plan_known`: `plan in ('free', 'pro', 'proPlus')`.

No backfill needed: the default gives every existing row `free`, which is exactly the state the spec requires for launch. No other table changes.

## Entities

### Account plan

- **Owner**: one `owner_account` row.
- **Values**: `free` (default), `pro`, `proPlus`. Pinned in `apps/api/src/auth/plans.ts` and mirrored by `PlanId` in `apps/frontend/lib/landing/plans.ts`; `tests/unit/plans.test.ts` fails if they diverge.
- **Read**: every account payload (`/auth/sign-up`, `/auth/sign-in`, `/auth/me`) carries `account.plan`.
- **Write**: none in this feature.
- **Derived entitlement**: `canRemoveBranding(plan)` is `plan !== 'free'`.

### Branding decision (computed)

Inputs: the account's plan at render time and the request's `branding` option (`"1"`, `"0"`, or absent).

| Plan | Requested | Result (line shown?) |
|---|---|---|
| `free` | anything | yes |
| `pro` / `proPlus` | `"1"` | yes |
| `pro` / `proPlus` | `"0"` or absent | no |

Implemented once in `lib/plans/entitlements.ts#resolveBranding` and applied by both the Route Handlers and the print pages, so a hand-typed URL cannot bypass it (FR-017).

### Menu PDF (derived, not stored)

- **Source**: `MenuDetail` from `GET /menus/:menuId` (owner-scoped: name, status, `visualVariant`, sections in position order, items in position order with name, description, `priceCzk`, image), the session profile (`restaurantName`, `logo`), the owner's locale, the branding decision.
- **Preconditions**: owner session with a profile; menu belongs to the account; at least one item across all sections (else `409 EMPTY_MENU`). Draft or published are both allowed.
- **Shape**: A4 portrait, `@page` margins 12 mm top/bottom and 14 mm left/right; a running band repeating the menu name on every page; sections in order; a dish never split across pages; `PoweredBy` after the footer on the final page when branding is on.
- **Display mapping**: `toDisplayMenu({ ...menu, restaurantName, logo })`, the same call `/preview` makes, so `establishment.name` is the menu name, `establishment.logo` is the restaurant logo with the restaurant's name as alt text, prices are korunas.
- **Filename**: `<menu-name-slug>-<localized suffix>.pdf` (e.g. `poledni-menu-jidelni-listek.pdf`), ASCII fallback plus RFC 5987 `filename*`.

### Table sticker sheet (derived, not stored)

- **Source**: the menu's `publicSlug` and `visualVariant`, the session profile (`restaurantName`, `logo`), the owner's locale, the requested `count`, the branding decision, `NEXT_PUBLIC_SITE_URL`.
- **Preconditions**: as above, plus `status === 'published'` (else `409 NOT_PUBLISHED`); `count` an integer in `[1, 200]` (else `400 VALIDATION_FAILED`).
- **Shape**: ⌈count / 4⌉ A4 pages, each a 2 × 2 grid of equal cells with dashed cut guides on the shared edges; the last page holds `count mod 4` stickers when that is not zero, the remaining cells empty and unguided.
- **Filename**: `<menu-name-slug>-<localized suffix>.pdf` (e.g. `poledni-menu-stolky.pdf`).

### Sticker (one cell)

| Element | Source | Rule |
|---|---|---|
| Table number `n` | position in the sheet, 1-based | Consecutive from 1 to `count`; the largest text on the sticker |
| QR code | `${SITE_URL}/${locale}/m/${slug}?table=${n}` | Error correction Q; ≥ 44 mm printed; 4-module quiet zone; `qr-foreground` on `qr-surface` |
| Identity | profile logo, else `restaurantName` | Logo through `SafeImage` with a text fallback of the name |
| Prompt | `Print.scanPrompt` in the owner's locale | e.g. "Scan to see the menu" |
| Branding line | `PoweredBy` | Present iff the branding decision is yes |

### Preview image (derived, not stored)

The first A4 page of the corresponding document as `image/jpeg` (quality 80, 794 × 1123 px), produced by the same rendered page a PDF would come from. Same preconditions and options as the document it previews.

## Validation rules (`lib/validation/print.ts`)

| Input | Rule | Failure |
|---|---|---|
| `menuId` | UUID (the API rejects otherwise) | `404 NOT_FOUND` |
| `locale` | one of `routing.locales`; default `cs` | `400 VALIDATION_FAILED` |
| `count` | `z.coerce.number().int().min(1).max(200)`; required for stickers | `400 VALIDATION_FAILED`, message `Print.countInvalid` naming the range |
| `branding` | `"0"` \| `"1"` \| absent | treated as absent if anything else |

The client applies the same `count` schema before enabling Download, so an invalid count never leaves the dialog (SC-006).

## State and lifecycle

- **No persistence**: a download is a request/response; nothing is written on either side. Two downloads of an unchanged menu produce equal text and page counts.
- **Plan changes** between opening the dialog and downloading take effect immediately: the decision is made at render time from `/auth/me`.
- **Public address stability**: publishing keeps an existing `publicSlug`; unpublishing does not clear it; republishing reuses it (`menus.service.ts#publish`, pinned by `publish.e2e-spec.ts`). Stickers therefore survive an unpublish/republish cycle. No current flow changes an address, so FR-024's warning has nothing to attach to yet; any future slug-changing feature must add it.

## Frontend types touched

- `lib/api/types.ts`: `Account.plan: PlanId` (imported from `lib/landing/plans.ts`).
- `lib/plans/entitlements.ts`: `planOf(account: Pick<Account, 'plan'> | { plan?: unknown }): PlanId` (unknown or missing → `free`).
- `lib/validation/print.ts`: `StickerCount`, `PrintOptions = { locale: Locale; branding: boolean }`, `StickerOptions = PrintOptions & { count: number }`.
- `lib/pdf/request.ts`: `PrintErrorCode = 'UNAUTHENTICATED' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'NOT_PUBLISHED' | 'EMPTY_MENU' | 'RENDER_TIMEOUT' | 'RENDER_FAILED'`.
