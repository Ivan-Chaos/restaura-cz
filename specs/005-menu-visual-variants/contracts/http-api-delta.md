# Contract Delta: HTTP API

Applies to `specs/001-menu-creation-publishing/contracts/http-api.md`. The canonical document is updated in the same change set; this file records what changes and why.

## PATCH /menus/:menuId

Request (all optional, at least one): `{ "name": "…", "visualVariant": "…" }`

- `visualVariant` allowlist becomes:

  ```json
  ["default", "plain-white", "liquid-glass", "green-bar", "modern", "refined"]
  ```

- Any other value → `400 VALIDATION_FAILED` with the field error on `visualVariant` (constraint `IS_IN`), unchanged shape.
- `200` → full menu detail, `visualVariant` echoing the stored value.
- Ownership: unchanged; a non-owner → `404` (draft and foreign menus are indistinguishable), no session → `401`.

Remove the sentence "allowlist for this feature: `["default"]` (FR-010 stub)".

## GET /menus/:menuId, GET /menus (owner)

Unchanged shape. `visualVariant` may now be any allowlisted id. `MenuSummary` (list) does **not** gain `visualVariant`; the list page has no use for it in this feature.

## GET /public/menus/:slug (guest)

Unchanged shape:

```json
{ "menu": { "name": "Lunch", "visualVariant": "green-bar", "sections": [ … ] } }
```

Consumers MUST treat an unrecognised `visualVariant` as `default` (FR-007). The API does not validate stored values on read.

## Compatibility

- No new endpoints, no new fields, no removed fields.
- A frontend built before this change keeps working: it ignores the value and renders Classic.
- An API built before this change rejects the five new ids with `400`; the frontend surfaces that as a validation error on the picker. Deploy the API first or together.

## Tests that pin this contract

- API: `apps/api/test/menus.e2e-spec.ts` — accepts each allowlisted id; rejects `elegant`.
- Frontend: `apps/frontend/tests/unit/variants.test.ts` — catalogue ids equal the same literal list; `tests/unit/api-contract.test.ts` payload types still satisfy `MenuDetailResponse` / `PublicMenuResponse` with a non-default variant.
