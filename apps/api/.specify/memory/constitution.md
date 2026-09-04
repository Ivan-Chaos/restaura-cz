<!--
Sync Impact Report
- Version change: 1.0.0 → 1.0.1
- Clarified: Technology Constraints — object storage for binary blobs keyed from Postgres is
  not an "alternative datastore". A clarification of an existing rule rather than a change to
  it, hence PATCH; no app is out of compliance and no migration is needed.
- Modified principles: n/a (initial ratification — all placeholder principles replaced)
- Added sections:
  - Core Principles: I. Simplicity First, II. Readability Over Cleverness,
    III. Reliability by Design, IV. Test What Matters, V. Explicit Data Contracts
  - Technology Constraints
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: none (template placeholder sections filled, not removed)
- Follow-up TODOs: none
-->

# Restaura API Constitution

## Core Principles

### I. Simplicity First

Every feature MUST start with the simplest design that satisfies its specification. New
abstractions, layers, or dependencies MUST be justified by a concrete, current need — never by
speculation about future requirements (YAGNI). When two designs solve the same problem, the one
with fewer moving parts wins by default; deviating from that default requires written
justification in the plan.

Rationale: The backend is being built from scratch; unnecessary complexity added now compounds
for the lifetime of the project, while simple code can always be extended when a real need
appears.

### II. Readability Over Cleverness

Code MUST be written for the next reader, not the author. Names MUST describe intent; functions
MUST be small enough to understand without scrolling; clever one-liners, implicit magic, and
hidden control flow are prohibited when a plainer equivalent exists. Comments explain constraints
the code cannot express — they MUST NOT narrate what the code already says.

Rationale: Code is read far more often than it is written. A codebase optimized for reading keeps
review cheap, onboarding fast, and defects visible.

### III. Reliability by Design

Failures MUST be handled explicitly: no silently swallowed errors, no bare catch-and-continue.
Every external interaction (database, network, filesystem) MUST have a defined failure behavior —
propagate, retry, or degrade — chosen deliberately, not by accident. Operations that modify
multiple records MUST be transactional. The API MUST return accurate status codes and actionable
error messages without leaking internals.

Rationale: A backend is trusted infrastructure; predictable behavior under failure is a feature,
not an afterthought.

### IV. Test What Matters

Business logic and data-access behavior MUST be covered by automated tests before a feature is
considered done. Tests MUST assert observable behavior (inputs → outputs, state changes), not
implementation details. Integration tests against a real Postgres instance are REQUIRED for
query and migration correctness; mocks of the database MUST NOT be the only coverage for
persistence logic.

Rationale: Tests tied to behavior survive refactoring and catch real regressions; tests tied to
implementation create noise and false confidence.

### V. Explicit Data Contracts

All data entering the system MUST be validated at the boundary; all data leaving the system MUST
conform to a declared response shape. Database schema changes MUST be made through versioned,
repeatable migrations — never manual edits. The schema is the source of truth for data
integrity: constraints (NOT NULL, foreign keys, unique) MUST be enforced in Postgres, not only in
application code.

Rationale: Explicit contracts at every boundary make failures local and diagnosable, and let the
database guarantee invariants the application cannot.

## Technology Constraints

- PostgreSQL is the system of record. Alternative datastores MUST NOT be introduced without a
  constitution amendment. Object storage for binary blobs is **not** an alternative datastore
  for the purposes of this rule, provided every fact the system depends on — which object
  belongs to what, and its metadata — lives in Postgres and the store holds only bytes
  addressed by a key Postgres owns. Uploaded images are the case this clarifies (feature 006).
- Database access MUST go through a single, shared data-access layer; ad-hoc connections
  scattered through feature code are prohibited.
- Configuration (connection strings, secrets, ports) MUST come from the environment; secrets
  MUST NOT be committed to the repository.
- Dependencies MUST be pinned and each new dependency MUST be justified against Principle I.

## Development Workflow & Quality Gates

- Every feature flows through the Spec Kit lifecycle: specify → plan → tasks → implement.
- A feature is done only when: it satisfies its spec, its tests pass, migrations run cleanly
  from an empty database, and the code passes review against these principles.
- Code review MUST check compliance with the Core Principles; a reviewer MAY block a change
  solely on complexity or readability grounds.
- Bug fixes MUST include a test that fails without the fix.

## Governance

This constitution supersedes all other development practices for the API. Amendments are made by
editing this document via a reviewed pull request that states the change, its rationale, and the
resulting version bump. Versioning follows semantic rules: MAJOR for removing or redefining a
principle, MINOR for adding a principle or materially expanding guidance, PATCH for
clarifications and wording. Compliance is reviewed at every pull request; any deviation MUST be
either corrected or explicitly justified in the PR description before merge.

**Version**: 1.0.1 | **Ratified**: 2026-08-31 | **Last Amended**: 2026-09-03
