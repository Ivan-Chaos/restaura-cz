<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all template placeholders replaced)
- Added sections:
  - Core Principles: I. Code Quality & Conventions; II. Testing Standards;
    III. User Experience Consistency; IV. Performance Requirements;
    V. Simplicity & Justified Complexity
  - Technology & Platform Constraints
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: none
- Templates requiring updates: none checked in this run (dependent templates read the
  constitution at runtime and were intentionally not modified)
- Follow-up TODOs: none
-->

# Restaura CZ Frontend Constitution

## Core Principles

### I. Code Quality & Conventions

- TypeScript MUST be strict; `any` is forbidden except with an inline comment justifying it.
- `pnpm lint` (ESLint, `eslint-config-next`) and `tsc --noEmit` MUST pass with zero errors
  before a change is considered complete. Lint rules MUST NOT be disabled per-line without a
  written reason.
- Framework APIs MUST be verified against the installed Next.js docs in
  `node_modules/next/dist/docs/` before use; deprecated APIs MUST NOT be introduced.
- Navigation primitives (`Link`, `useRouter`, `usePathname`, `redirect`) MUST be imported from
  `@/i18n/navigation`, never from `next/link` or `next/navigation`.
- Reuse before creation: a new component, hook, or utility MUST NOT duplicate one that already
  exists under `components/`, `hooks/`, or `lib/`. Shared UI primitives live in `components/ui`
  (shadcn); feature components compose them.
- Every page/layout under `app/[locale]/` MUST validate the locale with
  `hasLocale(routing.locales, locale)` and call `setRequestLocale(locale)`.
- Dead code, commented-out code, and unexplained workarounds MUST NOT be merged.

**Rationale**: The project targets a fast-moving Next.js release with breaking changes; strict
typing, verified APIs, and a single source for shared code keep the codebase navigable and
prevent divergence as it grows.

### II. Testing Standards

- Every feature spec MUST define acceptance scenarios; every merged feature MUST ship with
  automated tests covering those scenarios.
- Required coverage by layer:
  - Unit tests for pure logic in `lib/` and `hooks/` (formatting, routing helpers, state).
  - Component tests for interactive components (render, user interaction, accessibility roles).
  - End-to-end tests for each user-facing flow, run against at least the default locale (`cs`)
    and one additional locale.
- Tests MUST assert behavior visible to users (text, roles, navigation), not implementation
  details (class names, internal state).
- Message catalogs MUST be verified in CI: every key in `messages/en.json` MUST exist in
  `messages/cs.json` and `messages/de.json`, and `pnpm build` MUST type-check translation keys.
- A bug fix MUST include a regression test that fails before the fix and passes after.
- Tests MUST be deterministic; flaky tests are treated as failures and fixed or removed, never
  retried into passing.

**Rationale**: A multilingual public-facing site breaks silently (missing keys, wrong locale
routing, broken layouts). Behavior-level tests across locales catch what type-checking cannot.

### III. User Experience Consistency

- All user-visible text MUST come from `next-intl` messages (`useTranslations` /
  `getTranslations`), organized one namespace per component/page; hard-coded strings are
  forbidden. New keys MUST be added to `cs`, `en`, and `de` in the same change.
- Visual design MUST use the shadcn/Tailwind design tokens defined in `app/globals.css`
  (CSS variables). Raw hex/rgb colors, arbitrary spacing, and one-off font sizes in components
  are forbidden.
- Both light and dark themes (`next-themes`) MUST be supported by every component; a change
  MUST be visually verified in both.
- Layouts MUST be responsive from 320px to 1920px with no horizontal page scroll.
- Accessibility is non-negotiable: semantic HTML, keyboard operability, visible focus states,
  `lang` set per locale, images with meaningful `alt`, and WCAG 2.1 AA color contrast.
- Interaction patterns (loading, empty, error, and success states; form validation; motion via
  `motion`) MUST be consistent across pages; reduced-motion preferences MUST be honored.

**Rationale**: Consistency across three locales, two themes, and all viewports is the product.
A single design-token source and a single translation source make consistency enforceable.

### IV. Performance Requirements

- Pages MUST be statically rendered wherever possible (`setRequestLocale` + static params);
  dynamic rendering requires a documented reason in the plan.
- Core Web Vitals budgets on a mid-tier mobile device over 4G, measured on production builds:
  LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Client JavaScript: default to Server Components; `"use client"` MUST be pushed to the
  smallest leaf that needs interactivity. Initial route JS MUST stay under 200 KB gzipped;
  any dependency adding more than 20 KB to a route MUST be justified in the plan.
- Images MUST use `next/image` with explicit dimensions; fonts MUST be loaded via `next/font`.
- Only the active locale's messages MAY be shipped to the client.
- Performance regressions detected by Lighthouse/CI budgets block merge until resolved or
  explicitly waived in review.

**Rationale**: A restaurant site is visited on phones, often on poor connections. Budgets and
server-first rendering keep the experience fast by default rather than by later rescue.

### V. Simplicity & Justified Complexity

- Start with the simplest solution that satisfies the spec (YAGNI). New abstractions, state
  libraries, or infrastructure MUST be justified in `plan.md` with the concrete problem solved.
- New runtime dependencies MUST be justified against an existing dependency that could serve
  the purpose.
- Prefer platform and framework primitives (Server Components, Server Actions, native form
  handling, CSS) over custom equivalents.

**Rationale**: Every unnecessary layer is a future migration cost on a framework that changes
quickly.

## Technology & Platform Constraints

- Stack: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn (base-nova
  style, `@base-ui/react`), `next-intl` 4, `next-themes`, `lucide-react`, `motion`.
- Package manager: `pnpm` only; lockfile MUST be committed and up to date.
- Locales: `cs` (default), `en`, `de`, defined in `i18n/routing.ts`. All routes live under
  `app/[locale]/` with always-prefixed URLs; `proxy.ts` handles root redirection.
- Path aliases per `components.json`: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`.
- Icons MUST come from `lucide-react`; UI primitives MUST be added via the shadcn CLI, not
  hand-copied.
- Secrets and environment-specific values MUST be read from environment variables, never
  committed.

## Development Workflow & Quality Gates

- Work flows through Spec Kit: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. Plans MUST include a Constitution Check that addresses each principle.
- Branches are named `feature/frontend/<slug>`; work merges to `main` via pull request.
- Merge gates (all MUST pass): `pnpm lint`, type-check, `pnpm build`, the full test suite,
  translation-key completeness, and performance budgets.
- Every PR MUST be reviewed for: duplicated components/utilities, design-token violations,
  hard-coded strings, unjustified `"use client"`, and unjustified complexity.
- Commit messages follow `<type>: <summary>` (e.g. `feat:`, `fix:`, `docs:`, `chore:`).
- Agent guidance lives in `AGENTS.md` (loaded via `CLAUDE.md`); changes to conventions MUST be
  reflected there in the same change.

## Governance

- This constitution supersedes all other development practices for the frontend app. Where
  `AGENTS.md` or other guidance conflicts, the constitution wins and the guidance is updated.
- Amendments MUST be made via pull request that updates this file, records the change in the
  Sync Impact Report, and bumps the version:
  - MAJOR: removal or incompatible redefinition of a principle or gate.
  - MINOR: new principle/section or materially expanded guidance.
  - PATCH: clarifications and wording that do not change obligations.
- Every `plan.md` MUST pass the Constitution Check gate; violations MUST be listed in the plan's
  Complexity Tracking table with a justification and a rejected simpler alternative.
- Compliance is reviewed at every PR; reviewers MUST reject changes that violate a MUST
  without a documented, approved waiver.
- The constitution is reviewed at least quarterly, or whenever the stack changes major
  versions.

**Version**: 1.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
