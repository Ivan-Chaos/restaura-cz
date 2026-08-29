# Data Model: Digital Menu Design System

**Feature**: 001-menu-design-system | **Date**: 2026-08-29

This feature has no persistence. "Data" here means (a) the token/theme model expressed in CSS
and a small TypeScript registry, and (b) the **display models** menu components consume. Backend
entities are unknown and will be mapped onto these display models by adapters in later features.

---

## 1. Token model

### 1.1 Token (concept)

| Field | Type | Notes |
|-------|------|-------|
| `name` | string (`--kebab-case`) | Purpose-based, never appearance-based (FR-002) |
| `layer` | `palette` \| `semantic` \| `utility` | See below |
| `category` | `color` \| `typography` \| `space` \| `radius` \| `shadow` \| `motion` \| `scale` | |
| `value` | per (theme × appearance) | oklch for colors, rem for sizes, ms for durations |
| `required` | boolean | Whether a theme MUST define it (see theme-contract.md) |

### 1.2 Layers

1. **Palette** (`styles/palette.css`, `--palette-<hue>-<step>`): raw ramps, never referenced by
   components. Warm ramps: `cream`, `parchment`, `linen`, `terracotta`, `paprika`, `wine`,
   `olive`, `herb`, `honey`, `cocoa` (warm charcoal). Cool ramps for the example theme:
   `graphite`, `cobalt`. Steps 50–950.
2. **Semantic** (`styles/tokens.css` + `styles/themes/*.css`): shadcn core set + menu extension.
   Enumerated in `lib/design-system/tokens.ts` as `const SEMANTIC_TOKENS = [...] as const` so
   docs tables and the contract test are generated from one list.
3. **Utility**: Tailwind classes produced by `@theme inline` (`bg-card`, `text-price`,
   `font-display`, `rounded-lg`, `gap-density-4`…).

### 1.3 Semantic token catalogue

**Core (shadcn)** — pairs are `X` / `X-foreground` unless noted:
`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`,
`destructive`, `border`, `input`, `ring`, `radius`, `chart-1..5`, `sidebar`, `sidebar-primary`,
`sidebar-accent`, `sidebar-border`, `sidebar-ring`.

**Menu extension**:

| Token | Category | Purpose |
|-------|----------|---------|
| `--success` / `--success-foreground` | color | Available, vegan/vegetarian positive markers |
| `--warning` / `--warning-foreground` | color | Limited availability, allergen emphasis |
| `--info` / `--info-foreground` | color | Neutral notes (service info, "market price") |
| `--highlight` / `--highlight-foreground` | color | Chef's pick, new, seasonal badges |
| `--price` | color | Price text (defaults to `foreground` in `slate`, to `wine` in `warm`) |
| `--surface-raised` / `--surface-raised-foreground` | color | Dish card surface sitting on `background` |
| `--font-display` | typography | Headings, establishment name, dish names |
| `--font-body` | typography | Body, prices, UI |
| `--density` | scale | Unitless multiplier applied to menu spacing utilities (1 default) |
| `--shadow-card`, `--shadow-overlay` | shadow | Warm-tinted shadows (cool in `slate`) |
| `--motion-fast`, `--motion-base`, `--motion-slow` | motion | 120 / 200 / 320 ms defaults |
| `--motion-ease` | motion | Easing curve |

**Validation rules** (enforced by `tests/unit/contrast.test.ts` and the token gate script):
- Every `X-foreground` on `X` ≥ 4.5:1 (body) in every theme × appearance.
- `--border` on `--background` ≥ 3:1; `--ring` on `--background` ≥ 3:1.
- `--price` on `--card` and on `--surface-raised` ≥ 4.5:1.
- `--muted-foreground` on `--muted` and on `--background` ≥ 4.5:1.
- No literal color/size in `components/**` (see research R6).

---

## 2. Theme model

### 2.1 Theme

| Field | Type | Notes |
|-------|------|-------|
| `id` | `"warm" \| "slate"` (extensible union `ThemeId`) | Used as `data-theme` value and CSS file name |
| `displayName` | translated string | `messages.Themes.<id>` |
| `isDefault` | boolean | Exactly one theme is default (`warm`); its values also live in `:root`/`.dark` |
| `cssFile` | `styles/themes/<id>.css` | Defines `[data-theme="<id>"]` and `.dark [data-theme="<id>"], [data-theme="<id>"].dark` |
| `fonts` | `{ display: FontKey; body: FontKey }` | Must reference fonts loaded by the root layout |

Registry: `lib/design-system/themes.ts` exports `THEMES: readonly Theme[]`, `DEFAULT_THEME`,
`isThemeId(x): x is ThemeId`.

### 2.2 Appearance

`"light" | "dark" | "system"` — owned by `next-themes`; `system` resolves via
`prefers-color-scheme`. Independent from `Theme` (FR-009). Persisted by `next-themes` in
`localStorage` under key `restaura-appearance`.

### 2.3 Theme × Appearance resolution (cascade)

```
:root                       → warm light   (default)
.dark                       → warm dark
[data-theme="slate"]        → slate light  (scoped)
.dark [data-theme="slate"]  → slate dark   (scoped, wins by specificity)
```

State transitions: none stateful — the DOM attribute/class *is* the state.

---

## 3. Display models (consumed by `components/menu/**`)

### 3.1 `Establishment`

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✔ |
| `tagline` | string | |
| `logo` | `{ src: string; alt: string; width: number; height: number }` | |
| `openingHours` | `OpeningHoursLine[]` (`{ label: string; hours: string }`) | |
| `contact` | `{ address?: string; phone?: string; website?: string }` | |
| `serviceNotes` | string[] | e.g. "Prices include VAT", "Allergen list 1–14 available" |
| `shareUrl` | string (URL) | For `ShareMenu` |

### 3.2 `MenuCategory`

| Field | Type | Required |
|-------|------|----------|
| `id` | string (slug, used as anchor) | ✔ |
| `name` | string | ✔ |
| `description` | string | |
| `items` | `MenuItem[]` | ✔ (may be empty → `Empty` state) |

### 3.3 `MenuItem`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | string | ✔ | |
| `name` | string | ✔ | Wraps; `DishRow` clamps at 2 lines with full text in `title` |
| `description` | string | | Clamped at 3 lines in card, 2 in row |
| `image` | `{ src; alt; width; height }` | | Absent → no image block, layout collapses (FR-015) |
| `price` | `PriceModel` | ✔ | See 3.4; `{ kind: "market" }` allowed |
| `dietary` | `DietaryMarkerId[]` | | Rendered via `DietaryMarkerList`, max 6 visible + "+N" |
| `allergens` | `AllergenNumber[]` (1–14) | | Rendered as numbered chips |
| `availability` | `"available" \| "limited" \| "soldOut"` | ✔ default `available` | `soldOut` dims + labels the item |
| `highlights` | `("chefsPick" \| "new" \| "seasonal" \| "popular")[]` | | Max 2 shown |
| `spiceLevel` | `0 \| 1 \| 2 \| 3` | | 0 = none |

### 3.4 `PriceModel` (discriminated union)

```
{ kind: "single";  amount: Money }
{ kind: "from";    amount: Money }                          // "from 189 Kč"
{ kind: "variants"; variants: { label: string; amount: Money }[] }  // sizes / portions
{ kind: "market" }                                          // "market price"
Money = { amount: number; currency: "CZK" | "EUR" }         // minor units NOT used; amount in major units
```

Formatting: `formatPrice(locale, price)` via `Intl.NumberFormat` (cs → `189 Kč`, en → `CZK 189`
or `189 Kč` per style option, de → `189 Kč`). Zero amount renders as formatted `0`, never blank.

### 3.5 `DietaryMarker`

| Field | Type |
|-------|------|
| `id` | `"vegetarian" \| "vegan" \| "glutenFree" \| "lactoseFree" \| "halal" \| "kosher" \| "spicy"` |
| `icon` | lucide icon name |
| `labelKey` | `DietaryMarkers.<id>` |

### 3.6 `Allergen` (EU 1169/2011)

| Field | Type |
|-------|------|
| `number` | `1..14` |
| `id` | `gluten, crustaceans, eggs, fish, peanuts, soy, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs` |
| `labelKey` | `Allergens.<id>` |

`DietaryLegend` renders all 14 + dietary markers with number, icon, label.

---

## 4. Future-facing display models (consumed by `components/ordering/**` only)

### 4.1 `OptionGroup`

| Field | Type | Rules |
|-------|------|-------|
| `id`, `name` | string | |
| `selection` | `"single" \| "multiple"` | single → radio group, multiple → checkboxes |
| `min`, `max` | number | `single` implies `max = 1`; `min = 0` makes group optional |
| `options` | `{ id; name; priceDelta?: Money; available?: boolean }[]` | delta rendered as `+ 20 Kč` |

### 4.2 `LineItem`

| Field | Type |
|-------|------|
| `id` | string |
| `item` | `Pick<MenuItem, "id" \| "name" \| "image" \| "dietary">` |
| `selectedOptions` | `{ groupName: string; optionName: string; priceDelta?: Money }[]` |
| `quantity` | number ≥ 1 |
| `unitPrice`, `linePrice` | `Money` |
| `note` | string |

### 4.3 `OrderSummaryModel`

`{ lines: LineItem[]; subtotal: Money; adjustments: { label: string; amount: Money }[]; total: Money }`

### 4.4 `OrderStatus`

`"received" | "preparing" | "ready" | "served" | "cancelled"` — presentational only.

**Validation**: `QuantityStepper` clamps to `[min, max]` and disables the corresponding button;
`OptionGroup` shows a `Field` error when selection count violates `min`/`max`. No state is held —
parents pass values and receive callbacks.

---

## 5. Fixture: sample menu

`lib/design-system/fixtures/sample-menu.ts` exports one `Establishment` ("U Zlaté Lžíce" —
fictional) with 4 categories (Starters, Mains, Desserts, Drinks) and 14 items covering every edge
case: no image, no description, market price, variant prices, "from" price, sold out, limited,
chef's pick + new, spice 3, 120-char unbroken name, all 14 allergens across items. Strings are
provided in all three locales under the `SampleMenu` namespace.
