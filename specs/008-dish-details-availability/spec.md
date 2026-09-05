# Feature Specification: Dish Declarations and Availability

**Feature Branch**: `feature/be-fe/mvp-menu-creation` (current; spec dir `008-dish-details-availability`)
**Date**: 2026-09-05
**Status**: Implemented

## Summary

A dish could carry a name, a description, a price and a photograph. That is not enough to publish a menu in the Czech Republic: EU Regulation 1169/2011 requires the fourteen allergens to be declared, and guests increasingly decide by diet or observance before they decide by price. Owners also had no way to take a dish off the menu for an evening without deleting it and retyping it the next day.

This feature adds five things a dish declares — dietary markers, allergen numbers, spiciness, warnings, and availability — and one structural consequence: a dish marked **hidden** disappears from the guest page and from the printed menu while staying in the editor, intact and reversible.

### What was already built

Almost everything guest-facing. `apps/frontend`'s design system shipped `DietaryMarker`, `DietaryMarkerList`, `DietaryLegend`, `SpiceLevel` and `AvailabilityBadge` with full cs/en/de translations and story tests, and `DishRow`/`DishCard` already rendered them. None of it was reachable, for three reasons:

1. The API had no notion of any of it — a scan of `apps/api` found zero occurrences of `allergen|dietary|vegan|spicy|halal|kosher`.
2. `lib/menu-display/adapter.ts#toItem` mapped only `id/name/description/image/price`.
3. The only editor mounting `DietaryPicker` was `EditDishFormMock.tsx`, a Storybook mock.

Two live requirements were passing vacuously as a result: `specs/005-menu-visual-variants` FR-009 (every style must render dietary markers and availability) and `specs/007-pdf-menu-stickers` FR-002 (the PDF's content set must equal the guest page's). Both are now real.

## User Scenarios

### US1 — Declaring what is in a dish (P1)

An owner edits a dish and ticks what it contains and what it suits. Guests see the markers, the allergen numbers and any warnings on the dish, and a legend at the foot of the menu explaining them.

1. **Given** a dish being edited, **When** the owner ticks "vegetarian", allergens 3 and 7, and "raw or undercooked", **Then** the saved dish shows those in the editor row and on the published page.
2. **Given** a menu whose dishes declare nothing, **When** a guest opens it, **Then** **no** legend appears — a legend for allergens nobody declared tells guests something untrue.
3. **Given** a menu declaring two allergens, **When** a guest opens it, **Then** the legend lists those two and not the other twelve.

### US2 — Taking a dish off the menu tonight (P1)

1. **Given** a dish the kitchen has run out of, **When** the owner marks it **sold out**, **Then** guests still see it, with a badge saying so.
2. **Given** a dish the kitchen is not serving at all, **When** the owner marks it **hidden**, **Then** guests do not see it on the page or on the PDF, while the owner still sees it in the editor with its price, photograph and place in the section.
3. **Given** a section whose dishes are all hidden, **When** a guest opens the menu, **Then** the section heading remains with nothing under it — indistinguishable from a section that is simply empty.
4. **Given** a menu whose every dish is hidden, **When** the owner opens the print dialog, **Then** it reports that there is nothing to print rather than producing a blank document.

### US3 — Spiciness (P2)

1. **Given** a dish set to spiciness 2, **When** a guest opens the menu, **Then** two of three flames are filled, with an accessible label stating the level in words.

## Requirements

- **FR-001**: A dish MUST carry a set of dietary markers from a fixed vocabulary, a set of EU allergen numbers 1–14, a spiciness of 0–3, a set of warnings from a fixed vocabulary, and exactly one availability state.
- **FR-002**: Every one of those MUST default to its empty value, so a dish created before this feature reads identically afterwards.
- **FR-003**: The vocabularies MUST be enforced by the database, not only by the application (API constitution V).
- **FR-004**: Sets MUST be stored deduplicated and in catalogue order, so two dishes carrying the same claims read identically.
- **FR-005**: Warnings and markers MUST be ids, not free text, so a guest reads them in their own language. A dish's name and description are only ever in the language the owner typed.
- **FR-006**: A dish marked `hidden` MUST NOT appear in the public payload, on the guest page, in the preview, or on the PDF. `limited` and `soldOut` MUST still appear, with their badge.
- **FR-007**: The owner MUST keep seeing hidden dishes in the editor, marked as hidden.
- **FR-008**: The allergen legend on the guest page MUST list only what the menu actually declares, and MUST NOT render at all when the menu declares nothing.
- **FR-009**: Duplicating a dish MUST copy all five fields, availability included.
- **FR-010**: The editor's controls MUST work with no client JavaScript, because the Server Action re-reads the form as the authority. A control that posted nothing would silently reset a saved dish.
- **FR-011**: Nothing MUST be communicated by colour alone: every marker carries an icon *and* a translated label (design-system FR-016).

## Decisions

| Question | Decision | Why |
|---|---|---|
| What "hide" means | A fourth availability state, not a separate flag | "Sold out" and "hidden" are answers to one question — is this on the menu? — and one field with four values cannot contradict itself the way two booleans can. |
| Warnings as ids or free text | Ids | A guest reads them in their own language. Free text would only ever be in the owner's. |
| Ingredients | **Deferred** | Not in this change set. |
| "Fast friendly" | `lenten` — Christian fasting, beside Halal and Kosher | Named for what it actually promises, rather than a vague "fasting-friendly" that means different things in different traditions. |
| `spicy` as a marker | Dropped from the wire vocabulary | Heat is a degree, and it travels as `spiceLevel`. Two spellings of "this dish is spicy" would eventually disagree — and would draw two flames on one dish. |
| Sets as array columns or join tables | Array columns | The same three reasons already recorded for `restaurant_profile.phones`: capped, no per-entry metadata, always read and written whole. |

## Out of scope

Ingredients. Per-dish translations of any free text. Filtering or searching a menu by marker. Allergen data as anything other than the owner's own declaration — the system records what the restaurant says, and does not verify it.
