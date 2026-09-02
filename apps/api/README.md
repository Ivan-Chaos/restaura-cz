# Restaura API

NestJS + PostgreSQL backend for Restaura. Serves the owner-facing workspace (accounts,
menus, publishing) and the one public endpoint guests read a published menu from.

Governed by `.specify/memory/constitution.md` in this directory, and by the repository
root constitution above it.

## Setup

Requires Node 22+, pnpm, and Docker.

```bash
# From the repository root
pnpm install

# Postgres on host port 5433 — 5432 is commonly taken by a locally installed
# Postgres, which silently wins the bind and answers with the wrong database.
docker compose -f apps/api/docker-compose.yml up -d

cp apps/api/.env.example apps/api/.env    # then fill it in
pnpm --filter api db:migrate
pnpm --filter api start:dev               # http://localhost:3001
```

## Layout

```text
src/
├── config/env.ts        Typed environment access; fails at boot, not at first request
├── db/                  The single data-access layer — every query goes through it
│   ├── schema.ts        Drizzle tables; the source of truth for constraints
│   ├── client.ts        Pool + Drizzle instance behind the DRIZZLE token
│   ├── migrate.ts       Programmatic migrator, used by the CLI and the tests
│   └── migrations/      Generated SQL, committed, never edited after applying
├── common/              Error shape, session guard, shared validators
├── auth/                Sign-up, sign-in, sign-out, session lifecycle
├── mail/                Resend transport and the hand-written email templates
└── menus/               Owner CRUD, publishing, and the public read
```

## Conventions

- **ESM with `nodenext`**: relative imports carry a `.js` extension even in `.ts` files.
  TypeScript resolves them to the source; Node resolves them to the build output.
- **Constraints live in Postgres.** A DTO gives the caller a friendly message; the schema
  is what makes the rule true. Add both, never only the DTO.
- **Schema changes go through migrations**: edit `db/schema.ts` → `pnpm db:generate` →
  review the SQL → `pnpm db:migrate`. Never hand-edit an applied migration or the database.
- **One error shape.** Everything non-2xx leaves through `HttpErrorFilter` as
  `{ error: { code, message, details? } }`. `code` is a closed set in `common/app-error.ts`;
  the frontend renders a translated message per code and never shows `message`.
  Adding a code is a contract change — update the contract and both apps together.
- **A resource you do not own answers 404, not 403.** A 403 confirms the id is real.
- **Ownership is checked in the service, not the controller**, so no route can forget it.

## Tests

```bash
pnpm --filter api lint
pnpm --filter api test        # unit: pure logic
pnpm --filter api test:e2e    # integration against real Postgres
```

The e2e suite creates and migrates its own `restaura_test` database (derived from
`DATABASE_URL`, or set `TEST_DATABASE_URL`), so it never touches development data. It runs
one file at a time on purpose: the suites share a database and truncate between tests.
Migrating from empty on every run is also how "migrations apply cleanly" stays true.

Persistence is never covered by mocking the database — the constraints and cascades are
most of the behaviour worth testing.
