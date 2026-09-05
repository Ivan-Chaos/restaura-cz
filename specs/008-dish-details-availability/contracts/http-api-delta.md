# HTTP API Contract Delta: Dish Declarations and Availability

**Date**: 2026-09-05 | **Spec**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

Amends `specs/001-menu-creation-publishing/contracts/http-api.md` (as already amended by features 002, 003, 006 and 007). Additive only. Mirror this section into the canonical contract in the same change.

## Vocabularies

Pinned in `apps/api/src/menus/item-attributes.ts` and copied into `apps/frontend/lib/design-system/dietary.ts`. `test/menus.e2e-spec.ts` (API) and `tests/unit/item-attributes.test.ts` (frontend) each pin the literals, so a change to one side fails a test on the other.

```
dietary       vegetarian | vegan | glutenFree | lactoseFree | halal | kosher | lenten
allergens     1 … 14                       (EU Regulation 1169/2011, in its own order)
warnings      containsAlcohol | rawOrUndercooked | mayContainBones | servedVeryHot | containsCaffeine
availability  available | limited | soldOut | hidden
spiceLevel    0 … 3                        (0 = not spicy)
```

`spicy` is deliberately **not** a dietary marker. Heat is a degree, so it travels as `spiceLevel`; two spellings of "this dish is spicy" would eventually disagree.

## Item shape (owner-side)

Every item in `GET /menus/:menuId` and in every `{ "item": … }` response gains five fields. All are always present and never `null`: the columns are NOT NULL with empty defaults, so "declares nothing" has exactly one spelling.

```jsonc
{
  "id": "…", "name": "Soup", "description": null, "priceCzk": 89, "position": 0, "image": null,
  "dietary": ["vegetarian"],          // NEW, in catalogue order
  "allergens": [3, 7],                // NEW, ascending
  "spiceLevel": 2,                    // NEW, 0–3
  "warnings": ["rawOrUndercooked"],   // NEW, in catalogue order
  "availability": "available"         // NEW, one of the four
}
```

Sets are stored **deduplicated and in catalogue order**, whatever order they were sent in: two dishes carrying the same claims must read identically. A duplicate entry is normalised away rather than rejected.

## POST /menus/:menuId/sections/:sectionId/items

Request gains the five fields, all optional:

```jsonc
{
  "name": "Soup", "priceCzk": 89,
  "dietary": ["vegetarian"], "allergens": [3, 7],
  "spiceLevel": 2, "warnings": ["rawOrUndercooked"], "availability": "limited"
}
```

Omitting one is the same as sending its empty value (`[]`, `0`, `"available"`), so a caller that has never heard of declarations keeps working unchanged.

Field codes: `IS_ARRAY`, `ARRAY_MAX_SIZE`, `IS_IN` (each reported against `dietary.<index>` and so on), `IS_INT`, `MIN`, and **`MAX`** — which is new to the catalogue and needs a translation in `MenuEditor.fieldErrors` and `Auth.fieldErrors`.

## PATCH /menus/:menuId/sections/:sectionId/items/:itemId

Request gains the same five fields, and each counts toward the "at least one change" rule.

| body | effect |
|---|---|
| key absent | untouched |
| `"dietary": []` | cleared — a real change |
| `"dietary": null` | **400** `VALIDATION_FAILED`, code `IS_ARRAY` |
| `"spiceLevel": null` | **400**, code `IS_INT` |
| `"availability": null` | **400**, code `IS_IN` |
| `"dietary": ["vegan","vegan"]` | accepted, stored as `["vegan"]` |
| `"dietary": ["spicy"]` | **400**, code `IS_IN` on `dietary.0` |

A set clears with `[]`, not with `null` — the difference from `description` is the column: a description is nullable, a declaration is not. There is no such thing as "no dietary information", only "none declared".

## PATCH /menus/:menuId (correction)

`visualVariant: null` now answers `400 VALIDATION_FAILED` with code `IS_IN`. It previously reached the UPDATE and returned `500`; the column is NOT NULL with a default, so there was never a null to accept.

## POST …/items/:itemId/duplicate

The copy carries all five fields verbatim, including `availability` — a hidden dish duplicates hidden, because the copy is a draft of the same thing. This is unlike `image`, which a copy still never inherits.

## GET /public/menus/:slug

Each item gains `dietary`, `allergens`, `spiceLevel` and `warnings` with the same shapes, plus `availability` **narrowed to `available | limited | soldOut`**.

```jsonc
{ "name": "Soup", "description": null, "priceCzk": 89, "image": null,
  "dietary": ["vegetarian"], "allergens": [3, 7], "spiceLevel": 2,
  "warnings": ["rawOrUndercooked"], "availability": "soldOut" }
```

**A dish whose `availability` is `hidden` is absent from this payload entirely.** `limited` and `soldOut` still travel, because a guest needs to read them — telling someone what is gone is the point of saying it.

**A section whose dishes are all hidden still appears, with `items: []`.** It is indistinguishable from a section that has nothing in it, which is correct: one visible outcome, one payload shape. Hiding is an item-level fact, and inferring that the owner also wanted the heading gone would be the server guessing.
