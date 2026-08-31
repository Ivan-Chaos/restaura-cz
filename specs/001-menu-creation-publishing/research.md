# Research: Base Menu Creation & Publishing

**Date**: 2026-08-31 | **Plan**: [plan.md](./plan.md)

All Technical Context unknowns are resolved below. No NEEDS CLARIFICATION items remain.

## R1 — Database access layer: Drizzle ORM + node-postgres

**Decision**: Use Drizzle ORM over `pg` (node-postgres Pool) as the single data-access layer, with `drizzle-kit` generating versioned SQL migrations committed to `apps/api/src/db/migrations/`.

**Rationale**: The API constitution demands a single shared data-access layer, constraints enforced *in Postgres*, versioned repeatable migrations, and simplicity-first. Drizzle is schema-as-TypeScript that compiles to plain SQL: no runtime code generation, no query engine binary, no decorator magic, and the generated migrations are readable SQL files that run cleanly from an empty database. Its query surface stays close to SQL, which satisfies "readability over cleverness" and makes integration tests against real Postgres straightforward.

**Alternatives considered**:
- **Prisma** — heavier (query engine, generated client, its own schema DSL); migration state handling adds moving parts; rejected on Simplicity First.
- **TypeORM** — decorator-driven implicit behavior (lazy relations, cascades in app code) conflicts with "constraints enforced in Postgres, not only application code" and Readability; rejected.
- **Plain `pg` + hand-written SQL** — simplest runtime, but hand-rolled migration tooling and no type-safety between schema and queries; more code to review for the same guarantees; rejected as false economy.

## R2 — Authentication: opaque session tokens in Postgres, httpOnly cookie, Argon2id hashing

**Decision**: Email + password sign-up. Passwords hashed with Argon2id (`@node-rs/argon2`). On sign-in, generate a 256-bit random token (`node:crypto`), store its SHA-256 hash in a `session` table with a 30-day rolling expiry, and set the raw token as an `httpOnly; Secure; SameSite=Lax; Path=/` cookie. A NestJS guard resolves cookie → session row → account on every owner request. Sign-out deletes the row and clears the cookie.

**Rationale**: The spec needs sign-up/sign-in/sign-out and per-owner access control — nothing more. DB-backed opaque sessions give instant revocation (sign-out, future account deletion), need no signing secrets or refresh-token choreography, and Postgres is already the system of record (no Redis; session reads join the hot path queries anyway at MVP scale). Argon2id is the current OWASP first-choice password hash; `@node-rs/argon2` is a maintained prebuilt native binding, avoiding node-gyp builds on Windows dev machines.

**Alternatives considered**:
- **JWT access/refresh tokens** — stateless reads but no revocation without a denylist (which is… a session table); more failure modes; rejected (YAGNI).
- **Passport.js local strategy** — an abstraction layer over one strategy we can express in ~40 lines of guard + service; rejected on Simplicity First.
- **bcrypt** — acceptable but Argon2id is the stronger current default at equal integration cost; not chosen.
- **Third-party auth (Clerk/Auth0/Supabase)** — external service dependency and vendor coupling for a feature the constitution wants owned and tested locally; rejected.

## R3 — API boundary validation: class-validator DTOs + global ValidationPipe

**Decision**: `class-validator` + `class-transformer` DTO classes on every mutating endpoint, enforced by a global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`). Validation failures return the uniform error shape with `code: "VALIDATION_FAILED"` and per-field `details`.

**Rationale**: It is the NestJS-native path — zero glue code, first-class pipe integration, and declarative rules readable at the DTO. Satisfies API constitution V ("all data entering the system MUST be validated at the boundary").

**Alternatives considered**:
- **zod (+ nestjs-zod)** — attractive for schema sharing with the frontend, but sharing would require a new workspace package and an adapter layer inside Nest; the cross-app contract is instead pinned by `contracts/http-api.md` plus two-sided tests (root constitution II). Rejected for now; revisit if contract drift becomes a real problem.

## R4 — Frontend ↔ API integration: server-side only, cookie relay

**Decision**: The browser never calls the NestJS API directly. Server Components fetch reads and Server Actions perform mutations against `API_URL` (env). A `server-only` client (`lib/api/client.ts`) forwards the incoming session cookie via `cookies()` on every request and, for sign-up/sign-in/sign-out responses, re-emits the API's `Set-Cookie` value onto the Next response using `cookies().set()/.delete()`.

**Rationale**: No CORS configuration, no client-held credentials, the session cookie stays first-party on the frontend origin, and every data path is testable server-side. Matches the frontend constitution's server-first mandate (`"use client"` pushed to leaves; leaves handle interactivity, not data transport).

**Alternatives considered**:
- **Browser → API directly with CORS + credentialed cookies** — cross-site cookie rules (SameSite, third-party cookie phase-out) make this fragile across deploy topologies; rejected.
- **Next `rewrites()` proxy of `/api/*` to the API** — workable, but hides the network boundary and makes cookie/session behavior depend on proxy semantics; the explicit server client is simpler to reason about and test; rejected.

## R5 — Public menu address: `/{locale}/m/{slug}` with server-generated stable slug

**Decision**: On first publish the API generates a URL-safe slug: a slugified menu name plus a 6-character random suffix from `node:crypto` (e.g. `u-modre-kachny-x7k2qf`), stored in `menu.public_slug` (UNIQUE). The slug survives unpublish/republish (stable address per spec assumption). Public page route: `app/[locale]/m/[slug]`. Draft or unknown slugs both return the same 404 experience (no existence leak).

**Rationale**: Human-readable enough to share verbally, collision-proof via suffix, no extra dependency (no nanoid — `crypto.randomBytes` suffices), and stable so printed QR codes never break.

**Alternatives considered**: pure random ID (hostile to share verbally); owner-chosen vanity slug (out of scope per spec assumptions; uniqueness UX not worth MVP cost).

## R6 — Remaining new API dependencies

**Decision & justification** (API constitution I: each new dependency justified):
- `pg` — the canonical Postgres driver; required by Drizzle. No alternative already in the tree.
- `drizzle-kit` (dev) — generates/runs the versioned migrations R1 requires.
- `@node-rs/argon2` — R2; no crypto-hashing capability exists in current deps and hand-rolling password hashing is disqualified.
- `class-validator`, `class-transformer` — R3; NestJS's own validation integration expects them.
- `cookie-parser` (+ `@types/cookie-parser`) — R2; Express cookie parsing, ~zero-cost standard middleware. Hand-parsing the header was considered and rejected as reinventing a vetted wheel.

**Frontend**: no new runtime dependencies. Forms use native form handling + Server Actions (FE constitution V); UI composes existing shadcn primitives (any missing primitive added via the shadcn CLI, which is convention, not a dependency decision).

## R7 — Price representation: integer CZK major units

**Decision**: `menu_item.price_czk INTEGER NOT NULL CHECK (price_czk >= 0)` — whole korunas. The public payload carries `priceCzk: number`; the display adapter maps it to the design system's `Money` (`{ amount, currency: "CZK" }`, already documented as major units: "menus are never priced in hundredths").

**Rationale**: Matches the existing design-system convention exactly, avoids floating point, and satisfies FR-009 (non-negative) in the database, not just the app. Multi-currency is explicitly out of scope (spec assumption).

**Alternatives considered**: minor units/decimal (`NUMERIC`) — precision the domain doesn't use; rejected.

## R8 — Ordering of sections and items: integer `position` columns

**Decision**: `position INTEGER NOT NULL` on `menu_section` and `menu_item`; reads order by `(position, id)`. Reorder endpoint sets a target position and the service renumbers siblings inside one transaction (constitution III: multi-record modifications are transactional). No UNIQUE constraint on position (swap operations would need deferrable constraints — complexity without payoff; the transaction guarantees consistency).

**Alternatives considered**: fractional/lexicographic ranks (LexoRank) — clever, harder to read, solves a contention problem MVP doesn't have; rejected.

## R9 — Public menu page rendering: dynamic (no static caching)

**Decision**: `app/[locale]/m/[slug]/page.tsx` renders dynamically on every request (`fetch` with `cache: "no-store"` to the public API endpoint).

**Rationale (documented reason required by FE constitution IV)**: The spec requires unpublish to take effect for *new requests immediately* (US3/AS3, FR-016) and saved edits to appear on subsequent requests (FR-020). Static or time-revalidated rendering would serve stale publish state. The page stays within Core Web Vitals budgets because the payload is one bounded JSON fetch and the page is a Server Component with near-zero client JS. If load ever demands it, tag-based revalidation (`revalidateTag` on publish/unpublish/save) is the upgrade path — noted, not built (YAGNI).

## R10 — Test infrastructure against real Postgres

**Decision**: A `docker-compose.yml` at `apps/api/` provides Postgres for local dev and integration tests; tests get `DATABASE_URL` from env, run all migrations from empty, and truncate between suites. API integration tests use Nest's testing module + supertest (already a devDependency) over the real HTTP layer. Frontend e2e (Playwright) runs against `next build` + a seeded API, covering `cs` plus `en` (FE constitution II).

**Rationale**: API constitution IV requires integration tests against a real Postgres and migrations that run cleanly from an empty database — compose gives both with one file and no new npm dependency.

**Alternatives considered**: Testcontainers — nicer isolation, but a new dependency and slower startup for the same guarantee at this scale; rejected for now.

## R11 — Visual-variant stub storage

**Decision**: `menu.visual_variant TEXT NOT NULL DEFAULT 'default'` with an API-side allowlist containing only `'default'` for this feature. The editor renders a variant switcher showing the default variant selected and future variants as disabled "coming soon" tiles (translated). The value flows through the public payload so the display layer can branch on it later.

**Rationale**: FR-010 requires the selection stored from day one so future variants need no data migration; a TEXT column + application allowlist means adding a variant later is an allowlist entry + theme work, no schema change. The existing `ThemeScope`/`data-theme` system is the natural rendering target when real variants ship.
