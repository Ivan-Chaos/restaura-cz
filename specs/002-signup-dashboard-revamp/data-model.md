# Data Model: Sign-Up Expansion & Dashboard Revamp

**Date**: 2026-08-31 | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/http-api.md](./contracts/http-api.md)

Only one entity is added; existing tables (`owner_account`, `session`, `menu`, `menu_section`, `menu_item`) are unchanged. Per the API constitution, every domain rule below is a Postgres constraint, not only a DTO rule — the DTO gives the owner a friendly message, the constraint makes the rule true.

## New entity: `restaurant_profile`

The business identity attached to an owner account. Exactly zero or one per account; its absence is the signal that drives the profile-completion gate (spec FR-005).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `account_id` | `uuid` | **PK**, FK → `owner_account.id` `ON DELETE CASCADE` | PK-as-FK enforces the 1:1 relationship structurally — no separate id, no unique index needed |
| `restaurant_name` | `text` | `NOT NULL`, `CHECK (char_length BETWEEN 1 AND 120)` | Same length ceiling as `menu.name` for consistency |
| `phones` | `text[]` | `NOT NULL`, `CHECK (cardinality(phones) BETWEEN 1 AND 3)` | Array order = owner's entry order. Per-element format (see validation) is a DTO/boundary rule; the DB owns the cardinality invariant |
| `location` | `text` | `NOT NULL`, `CHECK (char_length BETWEEN 1 AND 200)` | Free-form address text (spec assumption — no geocoding) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Set by the upsert on every write |

**Migration**: one new Drizzle migration; runs cleanly from an empty database; no backfill (legacy accounts legitimately have no row — that is the incomplete state).

## Relationships

```text
owner_account 1 ──── 0..1 restaurant_profile   (new; profile presence = "complete account")
owner_account 1 ──── *    session               (unchanged)
owner_account 1 ──── *    menu                  (unchanged)
```

## Derived state: account completeness

| State | Definition | Effect |
|---|---|---|
| **Complete** | `restaurant_profile` row exists | Dashboard accessible |
| **Incomplete** | no row (accounts created before this feature, or a future partial-signup failure — impossible under the transactional sign-up, but the gate still covers it) | Signed-in but routed to profile completion; dashboard blocked (FR-004/FR-005) |

There are no other states and no state machine: the profile is created whole (sign-up transaction or completion upsert) and edited whole (settings upsert). Partial profiles cannot exist by construction.

## Validation rules (boundary — API DTO, mirrored by frontend)

| Field | Rule | Spec |
|---|---|---|
| `email` | valid email, ≤ 254 chars (unchanged) | FR-002 |
| `password` | 8–128 chars (unchanged) | FR-002 |
| `confirmPassword` | equals `password` — **frontend Server Action only**, never sent to the API (research R4); the API rejects the field outright, since it whitelists request bodies | FR-002 |
| `restaurantName` | required string, 1–120 chars after trim | FR-002, FR-007 |
| `phones` | array, 1–3 entries; each: trimmed, matches `^\+?[0-9 ()-]{5,24}$` **and** contains 6–15 digits (research R5) | FR-002, FR-003, FR-007 |
| `location` | required string, 1–200 chars after trim | FR-002, FR-007 |

Validation failures use the existing structured error shape with `details[].field` of `restaurantName`, `phones`, or `location`. The phone list is validated as a unit — a bad entry is reported against `phones`, and the form identifies *which* entry with its own copy of the rule. New field-error codes `IS_PHONE`, `IS_ARRAY`, `ARRAY_MIN_SIZE`, `ARRAY_MAX_SIZE` join the frontend's `FieldErrorCode` union.

## Frontend contract types (delta to `lib/api/types.ts`)

```ts
export interface RestaurantProfile {
  restaurantName: string;
  phones: string[];   // 1–3, owner's order
  location: string;
}

// The one shape sign-up, sign-in and /auth/me all answer with.
// profile: null = incomplete account (the gate signal)
export interface AccountResponse {
  account: Account;
  profile: RestaurantProfile | null;
}

export interface ProfileResponse {
  profile: RestaurantProfile;
}
```

`FieldErrorCode` union: add `"IS_PHONE"`, `"IS_ARRAY"`, `"ARRAY_MIN_SIZE"`, `"ARRAY_MAX_SIZE"`.

## Subscription

Deliberately **not** an entity in this feature (research R9): the Subscription tab renders a static localized placeholder. No table, no type, no endpoint.
