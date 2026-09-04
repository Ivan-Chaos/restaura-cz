# Specification Quality Checklist: Logo & Dish Image Uploads

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation run 1 (2026-09-03): all items pass.
- The only named technology is Cloudflare R2, which the product owner specified as a fixed storage decision. It is recorded once under Assumptions as a planning dependency and does not appear in any requirement or success criterion.
- Informed defaults were chosen rather than raising clarifications, because none would materially change scope: logo lives on the restaurant profile (square), one 4:3 photo per dish, both adjusted with one shared reposition-and-zoom tool, JPEG/PNG/WebP up to 10 MB, alt text derived from restaurant and dish names. Each is recorded under Assumptions so `/speckit-clarify` can revisit any of them.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.

## Implementation outcome (2026-09-03)

Built and verified. Every gate in both apps passes:

| Gate | Result |
|---|---|
| API lint, build | clean |
| API unit | 149 passed, 1 skipped |
| API integration (real Postgres) | 162 passed |
| Frontend lint (eslint, design tokens, message catalogue) | clean |
| Frontend typecheck, production build | clean |
| Frontend unit | 364 passed |
| Frontend stories (two passes, axe) | 410 passed |
| Frontend end-to-end (production build) | 230 passed, twice in a row |

Two decisions were changed during implementation, both because a test caught something the plan had assumed:

- **Next 16 blocks optimising images from a private address.** The local-disk store serves from localhost, so `images.dangerouslyAllowLocalIP` is now derived from the configured image host — on for a local host, off by itself for a real bucket.
- **`GuestMenu` now picks rows or cards per category**, by whether anything in it has a photograph. Before this it always chose `rows`, so an uploaded photograph never appeared. The presentation recipe already carried both layouts for exactly this.

Not done, and deliberately so:

- **T075's manual walkthrough in Czech and German** has not been performed; it needs a person at a browser. Its automated equivalents all pass, including the guest page at 360px and the accessibility and byte budgets, but the human pass over the quickstart remains outstanding.
