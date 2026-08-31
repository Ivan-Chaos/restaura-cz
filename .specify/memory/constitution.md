<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all template placeholders replaced)
- Added sections:
  - Core Principles: I. Code Quality; II. Testing Standards;
    III. User Experience Consistency; IV. Performance Requirements
  - Constitution Hierarchy & Scope
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: none (template's fifth principle slot intentionally unused — the user
  scoped this constitution to four principle areas; per-app detail lives in app constitutions)
- Templates requiring updates: none checked in this run (dependent templates read the
  constitution at runtime and were intentionally not modified)
- Follow-up TODOs:
  - TODO(API_CONSTITUTION): apps/api has no constitution yet; ratify one at
    apps/api/.specify/memory/constitution.md to carry the backend-specific detail this
    document defers.
-->

# Restaura CZ Constitution

## Core Principles

### I. Code Quality

- TypeScript MUST be strict across all apps; `any` is forbidden except with an inline comment
  justifying it.
- Every app MUST define a lint command and a type-check command, and both MUST pass with zero
  errors before a change is considered complete. Lint rules MUST NOT be disabled per-line
  without a written reason.
- Reuse before creation: new components, modules, hooks, or utilities MUST NOT duplicate
  functionality that already exists in the same app; check first, then extend or compose.
- Framework APIs MUST be verified against the installed version's documentation before use;
  deprecated APIs MUST NOT be introduced.
- Dead code, commented-out code, and unexplained workarounds MUST NOT be merged.
- App-specific conventions (file layout, import rules, framework idioms) are defined in each
  app's own constitution and are binding within that app.

**Rationale**: Two apps evolving in one repository diverge quickly without shared floor rules;
strict typing, mandatory gates, and reuse-first keep both codebases navigable while leaving
framework-specific detail to the app that owns it.

### II. Testing Standards

- Every feature spec MUST define acceptance scenarios; every merged feature MUST ship with
  automated tests covering those scenarios in the app(s) it touches.
- Each app MUST maintain, at minimum: unit tests for pure logic, integration/component tests
  for its composition layer, and end-to-end tests for user-facing or externally-consumed flows.
- Tests MUST assert observable behavior (responses, rendered output, contracts), not
  implementation details (internal state, private structure, class names).
- Cross-app contracts (the API surface the frontend consumes) MUST be covered by tests on both
  sides: the API proves what it serves; the frontend proves what it expects. A contract change
  MUST update both in the same change set.
- A bug fix MUST include a regression test that fails before the fix and passes after.
- Tests MUST be deterministic; flaky tests are treated as failures and fixed or removed, never
  retried into passing.
- Which test runners, coverage layers, and locale/theme matrices apply is defined per app in
  its own constitution.

**Rationale**: Behavior-level tests at every layer are the only gate that survives framework
churn, and double-sided contract tests are the only defense two independently-deployed apps
have against drifting apart.

### III. User Experience Consistency

- All user-visible text — including API-originated error messages that reach users — MUST flow
  through the frontend's localization system; hard-coded user-facing strings are forbidden in
  both apps.
- Visual design MUST derive from the frontend's design-token system; raw color values,
  arbitrary spacing, and one-off styles are forbidden in feature code.
- Interaction patterns (loading, empty, error, and success states; form validation) MUST be
  consistent across all pages and flows. The API MUST return errors in a single, structured,
  machine-readable shape so the frontend can render them consistently.
- Accessibility is non-negotiable: WCAG 2.1 AA is the floor for everything user-facing.
- The full token catalogue, theme/appearance axes, locale set, and responsive ranges are
  specified in the frontend constitution; API error-shape detail belongs in the API
  constitution.

**Rationale**: Consistency is a property of the whole product, not one app. The frontend owns
how things look and read; the backend must hand it data shaped so that consistency is possible
without per-endpoint special-casing.

### IV. Performance Requirements

- Performance MUST be treated as a feature requirement: specs for user-facing or
  data-intensive features MUST state measurable targets (latency, payload size, or load-time
  budgets) and the implementation MUST be verified against them before merge.
- Frontend pages MUST NOT block first paint on non-essential resources; heavy media and
  scripts MUST be deferred, opt-in, or budgeted, and asset budgets MUST be enforced by
  automated checks.
- API endpoints consumed by user-facing flows MUST respond within the budget the consuming
  feature's spec defines; unbounded queries (no pagination, no limits) MUST NOT ship.
- A change that measurably regresses an established budget MUST NOT merge without an explicit,
  documented decision to change the budget.
- Concrete numeric budgets, measurement tooling, and enforcement scripts are defined per app
  in its own constitution.

**Rationale**: The product serves guests on real mobile connections in restaurants; a target
that is not written down and checked is a target that will be missed silently.

## Constitution Hierarchy & Scope

- This document is the root constitution for the `restaura-cz` monorepo and binds every app in
  `apps/`. It states cross-cutting, high-level principles only.
- Each app MUST maintain its own constitution with app-specific, enforceable detail:
  - Frontend: `apps/frontend/.specify/memory/constitution.md` (ratified).
  - API: `apps/api/.specify/memory/constitution.md` (TODO(API_CONSTITUTION): not yet ratified).
- For any question of detail — tooling, file layout, framework rules, numeric budgets — the
  app constitution is authoritative. An app constitution MAY be stricter than this document
  but MUST NOT contradict it; where a conflict exists, this root constitution prevails and the
  app constitution MUST be amended.
- Work that spans both apps (contracts, shared types, deployment coupling) is governed by this
  document directly.

## Development Workflow & Quality Gates

- Every change MUST pass, in the app(s) it touches: lint, type-check, and the full relevant
  test suite. These gates are blocking, not advisory.
- Features follow the spec-driven flow: specify → plan → tasks → implement. Specs MUST
  capture acceptance scenarios and performance targets before implementation begins.
- Code review MUST verify compliance with this constitution and the touched app's
  constitution; reviewers MUST reject undocumented complexity, duplicated functionality, and
  untested behavior.
- Cross-app changes MUST land as one reviewable unit (single PR or explicitly linked PRs) so
  the contract is never broken on the default branch.

## Governance

- This constitution supersedes all other practice documents in the repository; app
  constitutions govern app-local detail within its bounds.
- Amendments are made via pull request that updates this file, states the semantic version
  bump and its rationale in the Sync Impact Report, and is approved by a project maintainer.
- Versioning follows semantic rules: MAJOR for incompatible principle removals or
  redefinitions, MINOR for new or materially expanded principles/sections, PATCH for
  clarifications and wording.
- A change to this document that tightens a rule MUST include a migration note for any app
  currently out of compliance; compliance MUST be reviewed at least once per feature cycle
  (at `/speckit-plan` time via each app's constitution check).

**Version**: 1.0.0 | **Ratified**: 2026-08-31 | **Last Amended**: 2026-08-31
