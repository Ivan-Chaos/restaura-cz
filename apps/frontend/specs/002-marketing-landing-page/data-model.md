# Data Model: Marketing Landing Page

**Phase 1 output** · 2026-08-29

All landing content is static, typed data in `lib/landing/` consumed by Server Components. There is
no persistence, no fetching, no user input beyond following links. Display strings are never stored
in these models — models carry **message keys**, and components resolve them with `next-intl`.

## Plan

A pricing tier shown in the pricing section.

| Field | Type | Rules |
|-------|------|-------|
| `id` | `"free" \| "pro" \| "proPlus"` | Unique; also the message-key segment (`Landing.plans.{id}.*`) and `data-plan` attribute |
| `availability` | `"available" \| "comingSoon"` | `free` is `available`; others `comingSoon` |
| `price` | `Money \| null` | `Money` from `lib/design-system/types.ts` (`{ amount, currency }`). `free` → `null` (renders localized "Free"); `pro` → `{ 129, "CZK" }`; `proPlus` → `null` (renders localized "Coming soon") |
| `period` | `"month" \| null` | Only when `price` is set |
| `features` | `readonly string[]` | Message-key suffixes, order preserved (`Landing.plans.{id}.features.{key}`) |
| `cta` | `"signup" \| "notify"` | `available` → `signup`; `comingSoon` → `notify` |
| `recommended` | `boolean` | Exactly one plan (`free`) is `true` |

**Catalogue (from spec FR-007–FR-011)**

| id | availability | price | features (ordered) | cta | recommended |
|----|--------------|-------|--------------------|-----|-------------|
| `free` | available | — | `oneMenu`, `thirtyItems`, `brandedPdf`, `brandedQr` | signup | ✅ |
| `pro` | comingSoon | 129 CZK / month | `fiveMenus`, `unlimitedItems`, `noBranding` | notify | — |
| `proPlus` | comingSoon | — | `menuParsing`, `unlimitedMenus`, `unlimitedSize`, `timeMenus`, `qrCodes`, `pdfTemplates` | notify | — |

**Invariants (unit-tested)**: order is `free, pro, proPlus`; `recommended` count = 1; every
`comingSoon` plan has `cta === "notify"`; `pro.price` equals `{ amount: 129, currency: "CZK" }`;
`proPlus.price === null`; every feature key exists in all three catalogues.

## CapabilitySection

One of the three shipped-feature blocks after the hero.

| Field | Type | Rules |
|-------|------|-------|
| `id` | `"digitalMenu" \| "pdf" \| "qr"` | Unique; message-key segment and `data-capability` attribute |
| `order` | `1 \| 2 \| 3` | Rendered ascending; digitalMenu=1, pdf=2, qr=3 |
| `icon` | `LucideIcon` name | From `lucide-react` only (e.g. `Smartphone`, `FileText`, `QrCode`) |
| `asset` | `MediaAsset["id"]` | Must reference an `image` asset |
| `align` | `"mediaLeft" \| "mediaRight"` | Alternates by order for rhythm |
| `demoHref` | `string \| undefined` | Only `digitalMenu` links to `/sample-menu` (live demo) |

Text resolved from `Landing.capabilities.{id}.title`, `.body`, `.eyebrow`.

## Step

The three-step "how it starts" strip (FR-005).

| Field | Type | Rules |
|-------|------|-------|
| `id` | `"create" \| "generate" \| "scan"` | Order fixed as listed |
| `icon` | `LucideIcon` name | lucide only |

Text from `Landing.steps.{id}.title`, `.body`.

## MediaAsset

An entry in the asset manifest (`lib/landing/assets.ts`); the fetch script and the unit test both
read it.

| Field | Type | Rules |
|-------|------|-------|
| `id` | `"hero" \| "heroClip" \| "digitalMenu" \| "pdf" \| "qr" \| "og"` | Unique |
| `kind` | `"image" \| "video"` | `heroClip` is the only `video` |
| `pexelsId` | `number` | Numeric id from the Pexels URL |
| `pageUrl` | `string` | `https://www.pexels.com/photo/...` or `/video/...` |
| `author` | `string` | Photographer / videographer display name |
| `authorUrl` | `string` | Pexels profile URL |
| `downloadUrl` | `string` | Direct file URL used by the script (CDN URL with size params for images; file URL for video) |
| `file` | `string` | Path under `public/`, e.g. `landing/hero.jpg` |
| `width`, `height` | `number` | Intrinsic pixel dimensions of the stored file; used for `next/image` and aspect-ratio boxes |
| `altKey` | `string \| null` | `Landing.assets.{id}.alt`; `null` only for decorative media (`heroClip`) |
| `maxBytes` | `number` | Budget enforced by the script: poster 180 KB, section images 400 KB, og 300 KB, video 6 MB |

**Invariants (unit-tested)**: file exists; header-parsed dimensions equal `width`/`height`;
size ≤ `maxBytes`; `altKey` present in `cs`/`en`/`de` when not null; `ATTRIBUTION.md` contains
every `author` and `pageUrl`.

## CallToAction (resolved link)

Not stored — computed by `lib/landing/links.ts`.

| Input | Output |
|-------|--------|
| `resolveSignupHref(locale)` | `NEXT_PUBLIC_SIGNUP_URL` with `{locale}` substituted, else `mailto:<contact>?subject=<t("Landing.cta.mailSubjectSignup")>` |
| `resolveNotifyHref(locale, planId)` | `NEXT_PUBLIC_NOTIFY_URL` with `{locale}`/`{plan}` substituted, else `mailto:<contact>?subject=<t("Landing.cta.mailSubjectNotify", { plan })>` |

Rule: the result is never empty and never `#`. Internal targets (leading `/`) render through
`@/i18n/navigation` `Link`; external/`mailto:` targets render as plain `<a>` with
`rel="noopener"` where applicable.

## Relationships

```
Landing
├── LandingHeader ── CallToAction(signup)
├── Hero ── MediaAsset(hero) ── MediaAsset(heroClip)? ── CallToAction(signup)
├── CapabilitySection ×3 ── MediaAsset(image)
├── StepsStrip ── Step ×3
├── Pricing ── PlanCard ×3 ── Plan ── CallToAction(signup | notify)
└── LandingFooter ── CallToAction(signup)
```

## New design tokens (see contracts/tokens-contract.md)

| Token | Purpose | Contrast pair |
|-------|---------|---------------|
| `overlay` | Dark scrim laid over photography; hero fallback background | — |
| `overlay-foreground` | Text/icons on `overlay` and on media covered by it | ≥ 4.5:1 on `overlay` |
