# Contract: Translation Namespaces

Every key below MUST exist in `messages/cs.json`, `messages/en.json`, and `messages/de.json`
(`scripts/check-messages.mjs` enforces parity; `en.json` remains the type source). One namespace
per component group, per project convention.

| Namespace | Keys | Consumers |
|-----------|------|-----------|
| `Appearance` | `label`, `light`, `dark`, `system` | `AppearanceToggle` |
| `Themes` | `warm`, `slate` | Storybook toolbar docs, future theme picker |
| `Menu` | `viewMenu`, `share`, `copyLink`, `copied`, `openingHours`, `contact`, `serviceNotes`, `allergenLegend`, `emptyCategory`, `highlights.chefsPick`, `highlights.new`, `highlights.seasonal`, `highlights.popular`, `spiceLevel` (ICU plural: `{level}`) | `MenuCover`, `ShareMenu`, `MenuHeader`, `MenuFooter`, `HighlightBadge`, `DishCard`, `Empty` states |
| `Availability` | `available`, `limited`, `soldOut` | `AvailabilityBadge`, `DishCard`, `DishRow` |
| `Price` | `from` (`{price}`), `marketPrice`, `variants` | `Price`, `PriceList` |
| `DietaryMarkers` | `vegetarian`, `vegan`, `glutenFree`, `lactoseFree`, `halal`, `kosher`, `spicy`, `more` (`{count}`) | `DietaryMarker`, `DietaryMarkerList`, `DietaryLegend` |
| `Allergens` | `title`, `gluten`, `crustaceans`, `eggs`, `fish`, `peanuts`, `soy`, `milk`, `nuts`, `celery`, `mustard`, `sesame`, `sulphites`, `lupin`, `molluscs` | `DietaryLegend`, `DietaryMarkerList` tooltips |
| `Ordering` | `quantity`, `increase`, `decrease`, `add`, `remove`, `selected`, `subtotal`, `total`, `note`, `notePlaceholder`, `charactersLeft` (`{count}`), `required`, `chooseBetween` (`{min}, {max}`), `status.received`, `status.preparing`, `status.ready`, `status.served`, `status.cancelled`, `review`, `items` (plural `{count}`) | `components/ordering/**` |
| `LocaleSwitcher` | `label` (existing) | `LanguageSwitcher` |
| `SampleMenu` | establishment name/tagline/notes, 4 category names + descriptions, 14 dish names + descriptions | `lib/design-system/fixtures/sample-menu.ts` (resolved via `getTranslations` in the route and `useTranslations` in the story) |

Rules:
- Keys are camelCase; nested objects allowed one level deep (e.g. `highlights.new`).
- Plurals/arguments use ICU syntax supported by `next-intl`.
- German copy is the length benchmark — every component story is also run in `de`.
