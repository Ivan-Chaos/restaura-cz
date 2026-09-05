# HTTP API Contract Delta: Account Plan

**Date**: 2026-09-04 | **Plan**: [../plan.md](../plan.md) | **Research**: R11

Amends `specs/001-menu-creation-publishing/contracts/http-api.md` (as already amended by features 002, 003, 006). Additive only. Mirror this section into the canonical contract in the same change.

## Plan ids

```
free | pro | proPlus
```

Pinned in `apps/api/src/auth/plans.ts` and in `apps/frontend/lib/landing/plans.ts` (`PlanId`). `tests/unit/plans.test.ts` (frontend) and `plans.spec.ts` (API) each pin the literal so a change to one side fails a test on the other.

## Account shape (all endpoints that return `account`)

```jsonc
{
  "account": {
    "id": "8d1c…",
    "email": "owner@example.com",
    "emailVerified": true,
    "plan": "free"          // NEW — one of the plan ids; never absent
  },
  "profile": { … }
}
```

Affected endpoints: `POST /auth/sign-up` (always `"free"`), `POST /auth/sign-in`, `GET /auth/me`.

## Semantics

- Every account has a plan; the database default is `free` and a CHECK constraint restricts the column to the three ids.
- No endpoint in this feature changes a plan. Billing and plan changes are a future feature.
- Consumers MUST treat a missing `plan` (from an older API) as `free`.
- Entitlement derived from the plan by the frontend for this feature: the "Powered by restaura.cz" line on PDF documents may be omitted only when `plan` is `pro` or `proPlus`.

## No new endpoints

PDF and preview generation are served by the frontend's own Route Handlers (see [print-ui.md](./print-ui.md)); they consume the existing `GET /menus/:menuId` and `GET /auth/me`.

## Contract test obligations

- API `test/auth.e2e-spec.ts`: `/auth/me`, sign-up and sign-in account bodies equal `{ id, email, emailVerified, plan: 'free' }` for a new account; after `setPlan(accountId, 'pro')`, `/auth/me` reports `plan: 'pro'`; an insert or update to an unknown plan is rejected by Postgres.
- Frontend `tests/unit/api-contract.test.ts`: account fixtures include `plan`, and the type accepts each of the three ids.
