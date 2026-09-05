# Data Model: Dish Declarations and Availability

**Date**: 2026-09-05 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/http-api-delta.md](contracts/http-api-delta.md)

One table changes. Migration `0006_mysterious_the_santerians`.

## `menu_item` — new columns

| Column | Type | Null | Default |
|---|---|---|---|
| `dietary` | `text[]` | no | `'{}'` |
| `allergens` | `smallint[]` | no | `'{}'` |
| `spice_level` | `integer` | no | `0` |
| `warnings` | `text[]` | no | `'{}'` |
| `availability` | `text` | no | `'available'` |

`{}` rather than NULL is the empty state, so "declares nothing" has exactly one spelling and no read path has to handle two.

### Why arrays and not join tables

The argument was already settled in this schema, in the comment on `restaurant_profile.phones`: *"An array rather than a child table: the list is capped, has no per-entry metadata, and is always read and written whole, so a join would buy nothing."* All three set columns meet the same three conditions.

Join tables would additionally have cost three names in `truncateAll`, extra reads in six paths, and — decisively — `MenusService.ITEM_COLUMNS`, the single point of change the codebase deliberately built so a new column cannot be forgotten, cannot express a join. The abstraction that exists to prevent drift would have stopped covering exactly the fields it was built for.

No GIN index: these arrays are never searched, only read whole by `section_id`.

## Constraints

```sql
menu_item_dietary_known      cardinality(dietary)  <= 7  and dietary  <@ array[…7 ids…]::text[]
menu_item_allergens_known    cardinality(allergens)<= 14 and allergens<@ array[1…14]::smallint[]
menu_item_spice_level_range  spice_level between 0 and 3
menu_item_warnings_known     cardinality(warnings) <= 5  and warnings <@ array[…5 ids…]::text[]
menu_item_availability_known availability in ('available','limited','soldOut','hidden')
```

Three mechanics worth recording, because each one fails quietly or loudly if missed:

- **`<@` (containment), not `in`.** `in` compares scalars, which is why `menu_status_valid` uses it and these cannot.
- **The `::smallint[]` cast is load-bearing.** `array[1,2,…]` infers as `integer[]`, and `smallint[] <@ integer[]` has no operator — without the cast the constraint fails to *create*.
- **Cardinality bounds are written as literals**, not as `${DIETARY_IDS.length}`. drizzle-kit stores the rendered SQL in its snapshot and diffs it textually; a TypeScript constant inside a `sql` template becomes a bound parameter rather than a literal, and every generate would see a change.

### Duplicates are normalised, not rejected

A CHECK constraint may not contain a subquery, and every SQL formulation of "this array has no repeated element" needs one. `<@` plus a cardinality cap does **not** imply uniqueness: `{1,1,1}` satisfies both.

So the database bounds the vocabulary and the size, and `orderedSubsetOf` in `apps/api/src/menus/item-attributes.ts` bounds the shape — deduplicating and sorting into catalogue order on every write. That also buys a stable render order and a payload a test can assert with `toEqual`. This is the one place these columns differ from `phones`, where the owner's order *is* the data.

A NULL element would defeat containment silently if `<@` returned NULL, because a CHECK evaluating to NULL passes. It does not: `array['a', null]::text[] <@ array['a','b']::text[]` is `false`, verified against Postgres 17 before the migration was committed.

## Migration: no backfill

`ADD COLUMN … DEFAULT … NOT NULL` on PostgreSQL 11+ fills existing rows from `pg_attribute.attmissingval` without rewriting the table, and each default already satisfies its CHECK — an empty set declares nothing, 0 is not spicy, and `available` is what every dish was before this feature existed. That is why the defaults are the design and not a convenience: a menu published yesterday reads identically today.

The column adds must stay ahead of the constraint adds, because `ADD CONSTRAINT` scans the table to validate and can only pass once the defaults are in place. drizzle-kit orders them that way.

## Reading paths

| Path | Sees hidden dishes? |
|---|---|
| `GET /menus/:menuId` and every `{ item }` response | **Yes** — that is what makes hiding reversible rather than a delete with extra steps |
| `GET /public/menus/:slug` | No |
| Guest page, `/preview`, `/print/**` | No |

The public filter lives in the **join condition**, not the `WHERE` clause:

```ts
.leftJoin(menuItem, and(eq(menuItem.sectionId, menuSection.id), ne(menuItem.availability, 'hidden')))
```

A `WHERE` clause is evaluated after the left join has produced its rows, and `ne(NULL, 'hidden')` is NULL — so it would discard the all-null row an empty section produces, breaking the existing "a section with no items renders as an empty list" behaviour, and would take an all-hidden section's heading with it.

`/preview` and `/print/**` build from the owner's own `MenuDetail`, not from the public payload, so the server-side filter alone would still have printed hidden dishes. `lib/menu-display/adapter.ts#toCategory` filters them for those paths — one seam, three surfaces, no chance of drift.
