# Forms, validation and menu-editor usability

## Context

Seven findings from using the app, all in `apps/frontend` (plus a small API change for two of them):

1. **Phone input** shows a country-name select + number box; no autodetect when a `+49…` number is typed/pasted.
2. **Two form architectures coexist.** Auth/profile forms use `hooks/use-action-form.ts` (react-hook-form + zod + `useActionState`). The menu editor (`ItemForm`, `InlineTextForm`) uses bare `useActionState` with uncontrolled inputs. Nothing documents which is the pattern.
3. **Failed submits wipe the form** in the editor: React resets an uncontrolled `<form action>` after the action completes and `FormState` carries codes, not values. The auth tier already solved this (that is why `useActionForm` exists); the editor never got it. `tests/e2e/menu-editor.spec.ts:71` is *named* "keeps what was typed" but never asserts it.
4. **56.50 is rejected** because the whole stack is integer korunas: `@IsInt()` DTO, `integer` column, contract line "whole CZK". Decision (user): **allow two decimals**.
5. **Forms and rows look identical**: five blocks share `border-border bg-card rounded-lg border p-4`; section titles are always-editable `<input>`s, so a section header looks like the "Add section" form; the add-dish form sits inside the section card behind a hairline.
6. **Edit exists** (`ItemRow` swaps to `ItemForm`) but is a ghost button among four identical ghost buttons. **Duplicate does not exist** anywhere (no API endpoint either).
7. **"Save" buttons are ambiguous.** Each save is its own request: menu "Save name" → `PATCH {name}` only; section "Save" → `PATCH {title}` only. There is no whole-menu save, and the impression "only the name saves" is literally correct for those buttons.

Decisions taken with the user: decimals allowed (haléře); phone picker lists **all countries** with CZ/SK/AT/DE/PL pinned first; section/menu titles become **headings with a Rename button**; duplicate is a **dedicated API endpoint**.

---

## Part A — One form pattern: `useActionForm` everywhere

### A1. Schemas and FormData bridges (pure, unit-tested)

`lib/validation/schemas.ts` — append a "menu editor" block (bounds mirror `apps/api/src/menus/dto/*.dto.ts`, pinned in `tests/unit/validation.test.ts`):

```ts
const title = z.string().trim().min(1, "IS_LENGTH").max(120, "IS_LENGTH");       // menu name, section title
const itemName = z.string().trim().min(1, "IS_LENGTH").max(200, "IS_LENGTH");
const itemDescription = z.string().trim().max(2000, "MAX_LENGTH");

// Type problem gates range problem (matches CODE_PRIORITY): "zdarma"/"56.555" → IS_NUMBER,
// "-5" → MIN, "" → IS_LENGTH, "56,50" and "56.50" → 56.5.
const PRICE_PATTERN = /^-?\d+(?:[.,]\d{1,2})?$/;
const priceCzk = z.string().trim().min(1, "IS_LENGTH").regex(PRICE_PATTERN, "IS_NUMBER")
  .transform((raw) => Number(raw.replace(",", ".")))
  .pipe(z.number().min(0, "MIN"));

export const menuItemSchema = z.object({ name: itemName, description: itemDescription, priceCzk });
export const menuItemFormSchema = menuItemSchema;            // no container differs → one schema
export type InlineTextField = "name" | "title";
export function inlineTextSchema(field: InlineTextField) { return z.object({ [field]: title }); }
export type MenuItemValues = z.output<typeof menuItemSchema>;      // priceCzk: number
export type MenuItemFormValues = z.input<typeof menuItemFormSchema>; // priceCzk: string
```

zod 4 note (verified): `.pipe()` aborts when the left side has issues, so the regex is what produces `IS_NUMBER`; `.min(0)` only ever sees a real number.

`lib/validation/form-data.ts` — add `readItem(formData)` and `readInlineText(formData, field)` using the existing `parsed()` helper.
`lib/validation/form-values.ts` — add `itemFormData(values, hidden)` and `inlineTextFormData(field, values, hidden)`; a `withHidden()` helper copies the `hidden` map (locale, menuId, sectionId, itemId) into the FormData.

### A2. `hooks/use-action-form.ts` — two additions, no behaviour change for existing callers

- `resolver: zodResolver(schema, undefined, { raw: true })` so `toFormData` receives the form's *input* values (priceCzk as string), which is what `TValues` already claims. No existing schema transforms, so auth forms are unaffected.
- `onSuccess?: (form, state) => void` run from an effect on the **pending edge** (true→false) when the settled state is `status: "success"`. Not on state identity: stubbed story actions return the same object twice. This replaces `ItemForm`'s hand-rolled `submitted` ref.

### A3. Server actions `lib/api/actions/menus.ts`

- Delete `priceFromForm`. Every `FormState` action validates first: `const item = readItem(formData); if (!item.ok) return item.state;` then builds the body from `item.values` (description `""` → omitted on create, `null` on update). Inline text actions use `readInlineText(formData, "name" | "title")`.
- Return `SAVED` (not `IDLE`) on success — `createMenuAction` keeps its redirect.
- New `duplicateItemAction(formData): Promise<void>` → `POST …/items/{itemId}/duplicate`, then `revalidateEditor`.

### A4. Components

`components/workspace/ItemForm.tsx` — rewrite on `useActionForm` (`schema: menuItemFormSchema`, `toFormData: (v) => itemFormData(v, hidden)`); `form.register("name")` etc.; errors via `fieldCode(errors.x?.message)` → `tFields(...)`, exactly as `AuthForm` does. `onSuccess`: `if (!hidden.itemId) form.reset()` (add form empties), then the `onSuccess` prop (edit row closes). Price input: `inputMode="decimal"`, keep `type="text"`, keep `Kč` span, add a `FieldDescription` hint ("e.g. 89 or 56,50"). Keep `<form action={formAction} onSubmit={onSubmit} noValidate>` so no-JS still posts.

`components/workspace/InlineTextForm.tsx` — same migration. `field` narrows to `InlineTextField`; RHF path must equal the DOM `name` (RHF reads `event.target.name`). **Keep `defaultValue={defaultValue}` on the `<Input>` next to `{...register(field)}`** — RHF sets `el.value` via ref, not the attribute. New props: `resetOnSuccess?: boolean` (add-section, create-menu), `onCancel?`, `onSuccess?`, `successMessage?: string` → `toast()` (the workspace layout mounts the `Toaster` — see C4b; there is no global one).

Remove the remount keys `key={\`add-${section.id}-${section.items.length}\`}` (`SectionEditor.tsx:137`) and `key={\`add-section-…\`}` (`[menuId]/page.tsx:135`) — `form.reset()` on success does that job without discarding typed values on unrelated re-renders.

### A5. Documentation of the decision

`AGENTS.md` — new top-level section **"Forms and validation"** after the API section:
- Every form with typed input is `useActionForm` + a zod schema in `lib/validation/schemas.ts` + a `readX`/`xFormData` pair; the Server Action calls `readX` first so JS and no-JS validate identically. Schema messages are `FieldErrorCode` strings, never prose.
- Plain `<form action>` is only for button-only posts (move, delete, duplicate, publish, sign-out) and `ConfirmDialog`.
- Why: values survive rejection (React resets uncontrolled forms), one error catalogue for browser and API, progressive enhancement.
- Gotchas: `raw: true`; `onSuccess` fires on the pending edge; keep `defaultValue` for attribute-based tests; actions return `SAVED`.
- `specs/002-signup-dashboard-revamp/research.md` — add **R7 "Form architecture"** recording the above, and amend **R5** (libphonenumber is now a dependency for formatting/detection only; validation/storage unchanged).

---

## Part B — Decimal prices (cross-app)

**As built** (simpler than first planned — see `specs/002-signup-dashboard-revamp/research.md` R13): the column becomes `numeric(10, 2)` read as a number, so prices stay korunas end to end and no hundredths conversion exists anywhere. The adapter and the design system's `Money` (major units, `formatMoney` already prints 2 decimals for fractional amounts) are unchanged.

- `apps/api/src/db/schema.ts` — `priceCzk: numeric('price_czk', { precision: 10, scale: 2, mode: 'number' }).notNull()`; the existing `>= 0` check is untouched. Migration `0003` is one `ALTER COLUMN … SET DATA TYPE numeric(10, 2)`: Postgres casts integer to numeric implicitly, so every stored price keeps its value and no data is rewritten.
- `apps/api/src/menus/dto/item.dto.ts` — `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0) priceCzk`. Constraint code becomes `IS_NUMBER`; `position` stays `@IsInt`.
- `apps/api/src/menus/menus.service.ts` — no conversion needed at all; the driver hands back a number.
- `apps/api/test/menus.e2e-spec.ts`, `publish.e2e-spec.ts` — update the `IS_INT` expectations to `IS_NUMBER`, add a `56.5` round-trip and a `56.555` rejection.
- `specs/001-menu-creation-publishing/contracts/http-api.md` — line 12 and the item request lines: "decimal CZK, at most two decimal places, ≥ 0".
- Frontend: add `IS_NUMBER` to `FieldErrorCode` in `lib/api/types.ts`, to `KNOWN_FIELD_CODES`/`CODE_PRIORITY` in `lib/api/form-state.ts` (beside `IS_INT`), and to `Auth.fieldErrors` + `MenuEditor.fieldErrors` in `messages/{cs,en,de}.json` (cs: "Zadejte cenu, například 89 nebo 56,50."). `tests/unit/api-contract.test.ts:244-255` gets an `IS_NUMBER > MIN` case.
- `components/workspace/ItemRow.tsx` — render the price with `formatMoney(locale, { amount: item.priceCzk, currency: "CZK" })` from `lib/design-system/price.ts` instead of `format.number` + suffix.
- `lib/menu-display/adapter.ts:40` — comment only.

---

## Part C — Editor layout: rows vs forms, edit, duplicate, save clarity

### C1. `components/workspace/EditableTitle.tsx` (new, client, with story)

A heading (`as: "h1" | "h3"`) showing the current value with a **Rename** button (Pencil icon). Clicking swaps in `InlineTextForm` (`onCancel`, `onSuccess` close it; `successMessage` toasts "Section renamed" / "Menu renamed"). Used for the menu h1 in `[menuId]/page.tsx` (the separate "Menu name" card is deleted) and the section h3 in `SectionEditor.tsx` (the `sr-only` h3 becomes the visible heading; `aria-labelledby` keeps working).

### C2. `SectionEditor.tsx`

- Header row: `EditableTitle` + actions cluster (Move up/down as icon buttons with `sr-only` labels, Delete section).
- Items `<ul>` stays; each `ItemRow` gets `rounded-md px-2 -mx-2 hover:bg-muted/40` and the edit state is boxed: `rounded-md border border-border bg-background p-4`.
- Add-dish form moves into a clearly distinct panel: `mt-4 rounded-md border border-dashed border-border bg-muted/40 p-4` with a `Plus` icon heading. Same treatment for the add-section panel in `page.tsx`. (Tokens only — `scripts/check-design-tokens.mjs` enforces.)

### C3. `ItemRow.tsx`

- **Edit** becomes `variant="outline" size="sm"` with a Pencil icon (first in the cluster). **Duplicate** (Copy icon) is a plain `<form action={duplicateAction}>` post with hidden ids. Move up/down become icon buttons with `sr-only` text; Delete unchanged. New prop `duplicateAction` threads through `SectionEditor` → `page.tsx`; stories pass a `noop`.
- Save toast: `ItemForm` gets `successMessage` ("Dish added" / "Dish saved").

### C4. API duplicate endpoint (`apps/api`)

- `menus.controller.ts`: `@Post(':menuId/sections/:sectionId/items/:itemId/duplicate')` → 201 `{ item }`.
- `menus.service.ts` `duplicateItem(accountId, menuId, sectionId, itemId)`: ownership checks as `updateItem`; read the source row; insert a copy (same name/description/price) at the end; `writeItemPositions(moveWithin(siblings, newId, source.position + 1))`; `touchMenu`. Respect `MAX_ITEMS_PER_MENU`.
- `test/menus.e2e-spec.ts`: copy lands directly after the original with identical fields; 404 for another owner's menu.
- `http-api.md`: document the route.

### C4b. The dashboard's Toaster

`app/[locale]/workspace/layout.tsx` mounts one `<Toaster />`. There is deliberately no global one (see the root layout), so a `toast()` from the editor would otherwise render nothing at all. An e2e test asserts a save actually announces itself.

### C5. Messages (`cs`, `en`, `de`)

New `MenuEditor` keys: `renameMenu`, `renameSectionButton` ("Rename"), `duplicateItem`, `itemAdded`, `itemSaved`, `sectionRenamed`, `menuRenamed`, `sectionAdded`, `priceHint`, `fieldErrors.IS_NUMBER`. Rename `renameSection`/`rename` to "Save" is fine to keep since the inline form now only appears after Rename and sits beside Cancel.

---

## Part D — Phone input

### D1. Pure helpers (new, node-testable)

`lib/phone/country.ts`: `DEFAULT_PHONE_COUNTRY = "CZ"`, `PINNED_PHONE_COUNTRIES = ["CZ","SK","AT","DE","PL"]`, `mainCountryFor(callingCode)` (reads `libphonenumber-js/metadata.min.json` `country_calling_codes[code][0]` so `+1` → US, `+44` → GB, not Antigua/Guernsey), `detectCountry(raw, current): national | partial | international` built on `AsYouType(current)` (`isInternational()`, `getCallingCode()`, `getCountry()`, national digits), `formatNational`, `composePhone` (`+420 601 234 567` — the stored shape the e2e suite relies on), `splitPhone(value)` for any country with the legacy raw-text fallback.

`lib/phone/countries.ts`: `regionFlag(code)` (regional-indicator emoji), `countryOptions(locale)` → `{ pinned, rest }` with names from `Intl.DisplayNames(locale, { type: "region" })` (fallback to the ISO code) sorted by `Intl.Collator`. No new i18n keys; the `Registration.phoneCountries.*` keys can be removed once unused.

`tests/unit/phone-country.test.ts`: the case table — `601234567` national; `+420 6` stays CZ; `+49 30 123456` → DE, national `30 123456`; `00420601` → CZ via IDD; `+4` partial; `+1 212` → US; current DE + `+420 6` → CZ; `splitPhone` round trips; `composePhone("CZ","601234567") === "+420 601 234 567"`.

### D2. `components/auth/PhoneInput.tsx`

- Import constants/helpers from `lib/phone/*`; country state is `CountryCode`.
- `emit(nextCountry, typed)`: run `detectCountry`; `partial` → show raw, emit raw; `international` → switch country, strip the dial code, reformat; `national` → as today.
- **Grouped control**: one bordered wrapper (`border-input rounded-lg border focus-within:ring-3 focus-within:ring-ring/50 flex`), Select trigger inside with `border-0 border-r`, Input with `border-0 focus-visible:ring-0 flex-1`. Trigger shows `🇨🇿 +420` via `SelectValue` render function (flag `aria-hidden`; keep `aria-label={t("phoneCountryLabel")}`). Localised names appear only in the popup (portaled on open), never SSR'd, to avoid ICU hydration mismatches.
- Popup: `SelectGroup` pinned → `SelectSeparator` → `SelectGroup` rest; `SelectItem value={code} label={name}` (Base UI uses `label` for typeahead) rendering flag · name · +code. Base UI `Select` handles ~240 rows; a searchable combobox is the upgrade path if wanted (`pnpm dlx shadcn@latest add combobox`).
- Keep `name`, `id`, `type="tel"`, `inputMode="tel"`, `autoComplete="tel-national"` on the input — no-JS posts national digits exactly as today.
- `PhoneListField.tsx` unchanged.

### D3. Stories

`PhoneInput.stories.tsx`: add play stories `AutodetectsFromPlusPrefix`, `AutodetectsFromDoubleZero`, `PastesInternationalNumber`, `PrefilledNonPinnedCountry` (+33 → FR). Existing `PhoneListField` stories and `tests/e2e/helpers/owner.ts` (`PROFILE.phone = "601234567"`, stored `+420 601 234 567`) need no change.

---

## Tests to update / add

- `tests/e2e/menu-editor.spec.ts` + `helpers/owner.ts`: section presence via `getByRole("heading", { name })` instead of `input[value=…]`; rename test clicks **Přejmenovat** first; "not a number" test expects the new `IS_NUMBER` text; **add the missing assertion** that name/price still hold their values after a rejected submit; add `56,50` round-trip showing `56,50 Kč`; add edit-item and duplicate-item tests.
- Stories: `ItemForm`, `InlineTextForm`, `SectionEditor` stubs return `{ status: "success" }`; add `ItemForm/RejectsPriceLocally` (value preserved) and `EditableTitle` stories; `SectionEditor`/`ItemRow` stories pass `duplicateAction`.
- Unit: `validation.test.ts` (item/title schemas, price cases), `api-contract.test.ts` (`IS_NUMBER`), `phone-country.test.ts`.
- API: `menus.e2e-spec.ts` decimals + duplicate.

## Implementation order

1. API: schema + migration, DTO, service conversions, duplicate endpoint, e2e, contract doc.
2. Frontend pure layer: `types.ts`/`form-state.ts` (`IS_NUMBER`), messages, `schemas.ts`, `form-data.ts`, `form-values.ts`, unit tests → `pnpm test:unit`.
3. `use-action-form.ts` (`raw`, `onSuccess`); run auth stories to confirm no regression.
4. `actions/menus.ts`, `ItemForm`, `InlineTextForm`, `EditableTitle`, `SectionEditor`, `ItemRow`, `[menuId]/page.tsx`, stories → `pnpm test:stories`.
5. e2e updates → `pnpm test:e2e` (API running with migrated DB).
6. `lib/phone/*` + unit tests, `PhoneInput` + stories, research.md R5 amendment.
7. `AGENTS.md` section + research.md R7.

## Verification

- `pnpm lint` (design-token check, messages check, ordering boundary), `pnpm test:unit`, `pnpm test:stories`, `pnpm test:e2e`; in `apps/api`: migration applies on the dev DB, `pnpm test:e2e` (run with `RESEND_API_KEY=` per memory note).
- Manual in the browser: add a dish with an empty name → error under name, price still filled; enter `56,50` → row shows `56,50 Kč`; click Rename on a section → inline form with Cancel; Duplicate → copy appears directly under the original; sign-up phone: type `+49 30 123456` → picker flips to 🇩🇪 +49, field shows `30 123456`; paste `00420 601 234 567` → CZ.

## Risks

- Dropping `defaultValue` from `InlineTextForm` during the RHF migration breaks any remaining attribute selector — keep it.
- `useEffectEvent` for `onSuccess` needs the repo's `eslint-plugin-react-hooks` to know it; fall back to a ref-held callback otherwise.
- Migration must preserve data (`price_czk * 100`); do not let drizzle-kit generate a drop/add.
- Flag emoji render as two letters on Windows — acceptable ISO fallback.
- `+1`/`+44` pick US/GB until enough digits identify the region; the trigger may flip mid-typing (matches libphonenumber behaviour).
