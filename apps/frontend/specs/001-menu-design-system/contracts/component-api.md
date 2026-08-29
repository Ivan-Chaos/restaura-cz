# Contract: Component APIs

Public props of non-shadcn components. shadcn primitives in `components/ui/**` keep their
generated APIs (documented by shadcn) and are not repeated here. All components:

- accept `className` (merged with `cn()`), forward `ref`, and spread remaining native props;
- render **no** hard-coded user-visible text — labels come from `useTranslations` inside the
  component (namespace listed) or from props;
- are Server Components unless marked `client`;
- have ≥1 Storybook story per listed variant/state; interactive ones have a `play` function.

Types referenced (`Establishment`, `MenuItem`, `PriceModel`, …) are defined in
[data-model.md](../data-model.md).

---

## Theme

| Component | Props | Notes |
|-----------|-------|-------|
| `ThemeScope` | `theme: ThemeId; as?: "div" \| "section" \| "main"; children` | Renders `data-theme`; `className="contents"` by default so it does not affect layout |
| `AppearanceProvider` (client) | `children` | Wraps `next-themes` `ThemeProvider` with project config; used once in layout |
| `AppearanceToggle` (client) | `variant?: "icon" \| "segmented"` | ns `Appearance` (light/dark/system labels); stories: both variants, keyboard cycle |

## Layout

| Component | Props | Notes |
|-----------|-------|-------|
| `Container` | `size?: "sm" \| "md" \| "lg" \| "full"` | Max-widths 640/768/1024/none; horizontal padding scales with `--density` |
| `Stack` | `direction?: "row" \| "column"; gap?: 1..8; align?; justify?; wrap?` | Gap steps map to `--spacing * --density` |
| `Grid` | `cols?: { base: n; sm?: n; md?: n; lg?: n }; gap?` | Dish grids: `{ base: 1, md: 2, lg: 3 }` |
| `Section` | `id?: string; title?: ReactNode; description?: ReactNode; children` | Adds scroll-margin for `CategoryNav` anchors |

## Menu

| Component | Props | Stories / states |
|-----------|-------|------------------|
| `MenuHeader` | `establishment: Establishment; actions?: ReactNode` | with/without logo, tagline, opening hours; long name |
| `MenuCover` | `establishment; href: string; welcome?: string` | ns `Menu` (`viewMenu`); dark/light |
| `ShareMenu` (client) | `url: string; qr?: ReactNode` | ns `Menu` (`share`, `copyLink`, `copied`); play: click copies, toast shown |
| `CategoryNav` (client) | `categories: Pick<MenuCategory,"id"\|"name">[]; activeId?: string; onSelect?(id)` | horizontal scroll ≤ md, sticky; scroll-spy sets active; play: arrow keys + Enter move focus/activate |
| `CategoryHeading` | `name: string; description?: string; count?: number` | with/without description |
| `DishCard` | `item: MenuItem; layout?: "vertical" \| "horizontal"; priority?: boolean` | image / no image / no description / sold out / limited / highlights / spice / long text |
| `DishRow` | `item: MenuItem` | compact list; same edge cases |
| `DishImage` | `image?: MenuItem["image"]; aspect?: "4/3" \| "1/1" \| "16/9"; priority?` | `next/image`; placeholder when absent |
| `Price` | `price: PriceModel; size?: "sm" \| "md" \| "lg"; emphasis?: boolean` | ns `Price` (`from`, `marketPrice`); all 4 kinds × cs/en/de |
| `PriceList` | `variants: PriceModel & {kind:"variants"}` | inline vs stacked |
| `DietaryMarker` | `id: DietaryMarkerId; showLabel?: boolean; size?` | ns `DietaryMarkers`; icon always has accessible name |
| `DietaryMarkerList` | `dietary?: DietaryMarkerId[]; allergens?: AllergenNumber[]; max?: number` | overflow "+N" with tooltip listing the rest |
| `DietaryLegend` | `compact?: boolean` | ns `Allergens`, `DietaryMarkers`; renders all 14 + dietary |
| `AvailabilityBadge` | `status: MenuItem["availability"]` | ns `Availability`; `available` renders nothing by default (`showAvailable?`) |
| `HighlightBadge` | `kind: MenuItem["highlights"][number]` | ns `Menu.highlights` |
| `SpecialsStrip` | `title: string; items: MenuItem[]` | horizontal snap scroll; empty → not rendered |
| `MenuFooter` | `establishment: Establishment` | contact / notes / legend link |
| `LanguageSwitcher` (client) | `variant?: "select" \| "inline"` | replaces `components/LocaleSwitcher.tsx`; uses `@/i18n/navigation`; ns `LocaleSwitcher` |
| `SampleMenu` | `establishment; categories: MenuCategory[]; specials?: MenuItem[]` | full composition; used by route + "Examples / Sample Menu Page" story |

## Ordering (future-facing; `client` where interactive; never imported from `app/**`)

| Component | Props | Stories / states |
|-----------|-------|------------------|
| `QuantityStepper` (client) | `value: number; min?: number (1); max?: number; onChange(next); label?: string` | ns `Ordering`; play: +/- clicks, ArrowUp/Down, disabled at bounds, `aria-valuenow` |
| `SelectableDishCard` (client) | `item: MenuItem; selected?: boolean; quantity?: number; onSelect?(); onQuantityChange?(n)` | unselected / selected / with stepper; layout identical to `DishCard` |
| `OptionGroup` (client) | `group: OptionGroupModel; value: string[]; onChange(ids); error?: string` | single (radio) / multiple (checkbox) / with price deltas / unavailable option / min-max error |
| `LineItem` | `line: LineItemModel; onQuantityChange?; onRemove?` | with options / with note / read-only |
| `OrderSummary` | `summary: OrderSummaryModel` | with/without adjustments |
| `StickyActionBar` (client) | `label: string; count?: number; total?: Money; onAction(); disabled?` | fixed bottom, safe-area padding; play: focusable, Enter triggers |
| `ProgressStepper` | `steps: { id; label }[]; currentId: string` | 3–5 steps, 320 px wrap |
| `CurrencyInput` (client) | `value?: number; currency: Money["currency"]; onChange(n); locale-aware` | invalid / disabled |
| `SpecialRequestField` (client) | `value; onChange; maxLength?: number (200)` | ns `Ordering`; counter |
| `OrderStatus` | `status: OrderStatusModel` | all 5 statuses |
| `ReviewSelectionMock` | — | story-only composition for Story 5 |

## Story matrix (applies to every component above)

Each component's stories are rendered by the Storybook toolbar in **2 themes × 2 appearances × 3
locales**; the Vitest addon runs each story with `play` in the default combination and the
`slate`/`dark`/`de` combination (longest strings, opposite theme) — 2 runs per story.
