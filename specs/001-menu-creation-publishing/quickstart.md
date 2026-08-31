# Quickstart: Base Menu Creation & Publishing

**Date**: 2026-08-31 | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/http-api.md](./contracts/http-api.md)

Runnable validation guide — how to stand the feature up locally and prove each user story end-to-end. Implementation detail lives in `tasks.md` and the code, not here.

## Prerequisites

- Node.js ≥ 22, pnpm 11 (`corepack enable`)
- Docker Desktop (Postgres for dev + integration tests)

## Setup

```powershell
# from repo root
pnpm install

# 1. Start Postgres. It is published on host port 5433, not 5432: a locally
#    installed Postgres commonly owns 5432 and silently wins the bind, which
#    sends every connection to the wrong server.
docker compose -f apps/api/docker-compose.yml up -d

# 2. API environment — copy apps/api/.env.example to apps/api/.env (never committed)
#    DATABASE_URL=postgres://restaura:restaura@localhost:5433/restaura
#    PORT=3001
#    COOKIE_SECURE=false          # dev only; true everywhere else

# 3. Run migrations (must apply cleanly from an empty database)
pnpm --filter api db:migrate

# 4. Frontend environment (apps/frontend/.env.local)
#    API_URL=http://localhost:3001

# 5. Start both apps
pnpm --filter api start:dev        # http://localhost:3001
pnpm --filter frontend dev         # http://localhost:3000
```

**Schema changes**: edit `apps/api/src/db/schema.ts`, then `pnpm --filter api db:generate`
to write a migration into `src/db/migrations/`, then `db:migrate` to apply it. Never edit
an applied migration or the database by hand.

## Manual validation walkthrough (maps to spec user stories)

### US1 — Sign-up & sign-in

1. Open `http://localhost:3000/cs/sign-up`, register `owner@example.com` / 8+ char password → lands in the empty workspace.
2. Sign out, sign back in at `/cs/sign-in` → workspace restored. Wrong password → generic error, no email-existence hint.
3. Re-registering the same email (any casing) → "account exists" guidance.

### US2 — Menu creation & filling

1. In the workspace, create menu "Polední menu" → appears with a **draft** badge.
2. Open it; add section "Polévky", add item "Kulajda" / description / `89` → renders in the editor.
3. Verify the visual-variant switcher shows the default variant selected and other tiles disabled ("coming soon").
4. Invalid item (empty name, negative or non-numeric price) → inline validation, nothing saved.
5. Sign out, sign back in → all content intact (persistence).

### US3 — Publishing

1. Before publishing, note the menu has no public address; `GET http://localhost:3001/public/menus/anything` → 404.
2. Press **Publish** → status flips, the shareable address is shown (e.g. `/cs/m/poledni-menu-x7k2qf`).
3. Open that address in a private/incognito window (no session) → menu visible.
4. Edit an item price, save, refresh the public page → new price shown.
5. Press **Unpublish**, refresh the public page → friendly "menu not available".
6. Re-publish → same slug as before (stable address).

### US4 — Public display

1. With the menu published, open the public address in a mobile-sized viewport (≤ 375 px): menu name, sections in order, items with name/description/price — no sign-in prompt, no horizontal scroll.
2. Confirm light and dark appearance both render correctly.

## Automated validation

```powershell
# API — lint, types, unit + integration/e2e against real Postgres (compose must be up).
# The e2e suite creates and migrates its own `restaura_test` database, so it never
# touches development data.
pnpm --filter api lint
pnpm --filter api build
pnpm --filter api test
pnpm --filter api test:e2e     # contract-side proof: every endpoint, error code, auth rule

# Frontend — lint (incl. design-token + message-catalogue gates), types, tests.
# The e2e suite starts the API itself, so Postgres must be running first.
pnpm --filter frontend lint
pnpm --filter frontend typecheck
pnpm --filter frontend test:unit      # adapter mapping, cookie relay, form error mapping (contract side)
pnpm --filter frontend test:stories   # every story in a real browser, with axe
pnpm --filter frontend test:e2e       # sign-up → create → fill → publish → public view, cs + en
pnpm --filter frontend test           # all of the above, plus the slate/dark/de story pass
```

**Everything above must pass** — these are the merge gates from the root and app constitutions.

## Expected outcomes checklist

- [x] Migrations apply cleanly on an empty database; re-running is a no-op — the API e2e
      harness re-proves this on every run by migrating `restaura_test` from empty
- [x] Zero content loss across sign-out/sign-in (SC-002) — `tests/e2e/menu-editor.spec.ts`
- [x] Draft slug → 404; published slug → 200; unpublished again → 404 on next request
      (SC-003) — `apps/api/test/publish.e2e-spec.ts` and `tests/e2e/publish.spec.ts`
- [x] No horizontal scroll at 375 px on the public page (SC-005) —
      `tests/e2e/public-menu.spec.ts` measures `scrollWidth` against `clientWidth`
- [x] Guest menu passes axe with no WCAG 2.1 AA violations
- [x] All new UI strings present in `cs`, `en`, `de` (`scripts/check-messages.mjs` passes)
- [x] No raw colours/spacing in new components (`scripts/check-design-tokens.mjs` passes)
- [ ] Full journey (arrive → published menu with 2 sections / 5 items) in < 10 min (SC-001)
      — needs an unassisted human; the automated journey completes in seconds

### Measured performance

Taken against a production build, with a menu of 6 sections × 8 dishes:

| Measure | Result | Budget |
|---|---|---|
| `GET /public/menus/:slug` p50 | 5.4 ms | — |
| `GET /public/menus/:slug` p95 | 7.2 ms | ≤ 200 ms ✅ |
| Guest page HTML, gzipped | 21.3 KB | — |
| Guest page JS, gzipped | 247.4 KB | ≤ 200 KB ⚠️ |

**On the JS budget.** The guest menu is at parity with the design system's own
`/cs/sample-menu` page (246.6 KB measured identically), so this feature adds ~0.8 KB
rather than causing the overage. The landing page measures 212.1 KB by the same method,
and roughly 155 KB of the total is the framework chunks every route shares. The budget is
therefore already exceeded repo-wide and predates this work — it is flagged here rather
than quietly absorbed, and reducing the shared framework payload is its own piece of work.

**Not yet measured**: LCP/INP/CLS on a throttled 4G mid-tier mobile profile (SC-004)
needs a Lighthouse run against a deployed build.
