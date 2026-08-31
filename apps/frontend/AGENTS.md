<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# i18n (next-intl)

- Locales: `cs` (default), `en`, `de` — defined in `i18n/routing.ts`. All routes live under `app/[locale]/`; URLs are always prefixed (`/cs/...`). `proxy.ts` redirects `/` using the `NEXT_LOCALE` cookie, then `Accept-Language`.
- Messages: `messages/{cs,en,de}.json`, one namespace per component/page. `en.json` is the type source (`global.d.ts`) — add keys to all three files.
- Use `useTranslations("Namespace")` in components (server or client), `getTranslations()` in `generateMetadata`/server utilities. Rich text via `t.rich(...)`.
- Import `Link`, `useRouter`, `usePathname`, `redirect` from `@/i18n/navigation`, not from `next/link` / `next/navigation`.
- In every page/layout under `[locale]`, validate with `hasLocale(routing.locales, locale)` and call `setRequestLocale(locale)` to keep static rendering.

# Design system & theming

The visual layer is token-driven so a restaurant's menu can be re-skinned without touching components. Full docs: `pnpm storybook` → **Documentation**. Spec: `specs/001-menu-design-system/`.

## Three layers

- `styles/palette.css` — raw oklch ramps (`--palette-terracotta-600`). **The only place a literal colour may appear.** Components never reference these.
- `styles/themes/<id>.css` — semantic tokens named by purpose (`--price`, `--surface-raised`, `--success`). `warm.css` is the default and owns `:root`/`.dark` *and* `[data-theme="warm"]` in one rule, so there is no second copy to drift. Non-default themes only declare `[data-theme="<id>"]`.
- `app/globals.css` — exposes every token as a Tailwind utility via `@theme inline`. `inline` is load-bearing: it inlines the value into the utility, so `bg-card` resolves against whatever `[data-theme]` scope it renders in.

`lib/design-system/tokens.ts` is the authoritative catalogue (`REQUIRED_TOKENS`, `TOKEN_PURPOSE`, `CONTRAST_PAIRS`) and drives both the docs tables and the tests.

## Two independent axes

- **Theme** (the restaurant's look): `<ThemeScope theme="slate">` sets `data-theme` on a subtree. Server Component, no JS, nests.
- **Appearance** (light/dark): `next-themes` class strategy, `.dark` on `<html>`, via `AppearanceProvider`.

Any theme × any appearance is valid. Never couple them.

## Rules (all enforced by `pnpm lint` / `pnpm test`)

- **No literal visual values in `components/` or `app/`** — no hex, no `rgb()/oklch()`, no Tailwind arbitrary values (`p-[13px]`, `bg-[#fff]`). `scripts/check-design-tokens.mjs` fails the build with file:line. Escape hatch: `// design-tokens-ignore-next-line -- <reason>`.
- Ordinary spacing utilities already scale with the theme: `--spacing` is multiplied by `--density`.
- **No hard-coded user-visible text** — everything through `next-intl`. `scripts/check-messages.mjs` fails if a key is missing from any of `cs`/`en`/`de`.
- **Adding a token is a foundations change**: add it to `tokens.ts` *and* every theme in the same commit (`tests/unit/themes.test.ts` enforces).
- **shadcn primitives come from the CLI only** (`pnpm dlx shadcn@latest add <name>`); never hand-edit `components/ui/`. Style is `base-nova` on `@base-ui/react`, **not Radix** — read the generated source before use; composition uses a `render` prop, not `asChild`.
- **Ordering components are documentation-only** in this phase. An ESLint rule blocks `app/**` from importing `@/components/ordering/*`, an e2e test asserts the guest menu renders zero `[data-ordering]` elements, and `tests/unit/ordering-boundary.test.ts` proves the rule still fires. Delete all three when ordering ships.

## Stories are the tests

Every component has a colocated `*.stories.tsx`. The Vitest browser project runs each story **twice** — `warm/light/cs` and `slate/dark/de` — with axe assertions that fail on violation. The second pass is the one that catches hard-coded colours and English-length assumptions.

```
pnpm storybook            # workbench
pnpm test:unit            # contrast + token contract + price formatting
pnpm test:stories         # every story as a browser test
pnpm test:e2e             # sample menu on a production build
pnpm test:e2e:storybook   # built docs site + toolbars
```

# Landing page & marketing assets

The public landing page is `app/[locale]/page.tsx` → `components/landing/`. Content lives as typed data in `lib/landing/` (`plans.ts`, `capabilities.ts`, `assets.ts`, `links.ts`) so pricing and copy change without touching components, and so `tests/unit/landing-*.test.ts` can assert the spec's numbers directly. Spec: `specs/002-marketing-landing-page/`.

- **Media is never hot-linked, and every asset declares how it is delivered.** `lib/landing/assets.ts` is the manifest, and each entry is `delivery: "download"` or `delivery: "stream"`. Downloads are fetched by `pnpm assets:landing` into `public/landing/` and committed; `--check` validates budgets and dimensions without touching the network (the CI path). Streams live in our own R2 bucket and are range-requested as they play — used for the hero clip, which is ~130 MB of UHD and has no business in git.
- **The hero clip is opt-in, and `HeroVideo` is where that is decided.** Nothing is requested until the `load` event has fired *and* an idle callback runs, and never at all under reduced motion, reduced data, Save-Data, a sub-4G connection, or a viewport under 768px. The `<video>` is not rendered until every check passes — `preload="none"` is not enough on its own, because `autoPlay` overrides it. The poster underneath is always server-rendered and is the LCP element, so the clip can never delay first paint.
- **Never use a stock photo carrying another company's branding.** Two of the QR candidates did; the page draws its own table tent (`components/landing/TableTent.tsx`) instead. Implying an endorsement is a Pexels licence violation, not a style preference.
- **`overlay` / `overlay-foreground` are the tokens for text on media** — `bg-overlay/60` for a scrim, `text-overlay-foreground` for what sits on it. They are the one pair that is identical in light and dark, and they are *not* safe on ordinary `background`/`card` surfaces.
- **CTA destinations are configuration**: `NEXT_PUBLIC_SIGNUP_URL` and `NEXT_PUBLIC_NOTIFY_URL` (both support `{locale}` and `{plan}` placeholders) with `mailto:` fallbacks. A call to action must never resolve to `#` — an e2e test enforces it. `NEXT_PUBLIC_SITE_URL` sets `metadataBase`, without which a relative Open Graph image is a build error.
- **No `motion` on this route.** Reveal-on-scroll is `hooks/use-in-view.ts` + `components/landing/Reveal.tsx`, about 1 KB. Its three states (`idle`/`hidden`/`shown`) exist so nothing is ever hidden that the reader can already see: only an element the browser has confirmed is off-screen is made transparent.
- **Link-buttons use `buttonVariants` on a real anchor**, not the `Button` primitive with `render`. Base UI's button expects a native `<button>`; given an anchor it either warns or replaces the link's semantics with button ones.

# Talking to the API, accounts, and the guest menu

The NestJS API in `apps/api` is the system of record. Spec: `specs/001-menu-creation-publishing/`
at the repository root, with the cross-app contract in its `contracts/http-api.md`.

- **The browser never calls the API.** Server Components read and Server Actions write, both
  through `lib/api/client.ts`, which forwards the session cookie server-side. That means no
  CORS, no token in client JavaScript, and one place where the request shape lives. The module
  imports `next/headers`, so importing it from a client component fails the build — that is the
  guard, and it is why there is no `server-only` dependency.
- **Expected failures are values, not exceptions.** `apiRequest` returns
  `{ ok: false, error }` for a taken email or a rejected field, because a form has to render
  those as readily as a success. Only unreachable-API cases produce the synthetic `NETWORK` code.
- **The API speaks codes; the UI speaks the visitor's language.** Never render `error.message` —
  it is developer-facing. `lib/api/form-state.ts` turns an error into a `FormState` of codes,
  and the component translates them (`Auth.errors`, `Auth.fieldErrors`, `MenuEditor.fieldErrors`).
  Field codes are class-validator constraint names uppercased, so `@Length` arrives as
  `IS_LENGTH`, not `LENGTH`. An unrecognised code degrades to `INVALID` rather than vanishing.
  When one field breaks several rules, `CODE_PRIORITY` prefers the type problem over the range
  problem: for a price of "free", "enter a whole number" is the useful half.
- **Forms take their action as a prop.** `AuthForm`, `InlineTextForm`, `ItemForm` and
  `ConfirmDialog` never import a Server Action. Pages inject the real one; stories inject a stub.
  Importing a `"use server"` module into the Storybook browser bundle does not work.
- **`requireAccount(locale)` gates every workspace route**, and `getAccount()` is the
  non-throwing read for pages that merely branch (sign-in redirects an already-signed-in visitor).
  Both live in `lib/api/session.ts`, deliberately *not* a `"use server"` module: they are render
  reads, and marking them would publish them as endpoints for no reason.
- **The guest menu is `force-dynamic`, and that is load-bearing.** Unpublishing has to take
  effect on the very next request and a saved edit has to be visible immediately, so the page
  cannot be static or time-revalidated. Both would serve a menu the restaurant has taken down.
  The upgrade path, if load ever demands it, is tag-based revalidation on publish/unpublish/save.
- **`GuestMenu` is not `SampleMenu`.** `SampleMenu` is the design system's showcase and always
  renders the specials strip and the full allergen legend, because its fixture always has that
  data. A menu built in the editor has none of it, and printing a legend for allergens nobody
  declared tells guests something untrue. When the editor starts collecting photos, markers and
  allergens, grow `GuestMenu` to match — the components already exist.
- **`lib/menu-display/adapter.ts` is the only seam** between the API's shape and the design
  system's `Menu`. Prices are whole korunas both sides (`{ kind: "single", … }`); category ids
  are slugified titles plus an index, because they double as element ids and two sections may
  share a title.
- **A draft menu and an address that never existed answer identically** (404 plus the
  not-available page). Anything else lets the public route enumerate which menus exist.

# Legal pages and cookie consent

`/[locale]/privacy`, `/terms` and `/cookies` render from `lib/legal/documents.ts` through one
`components/legal/LegalDocument.tsx`; the prose lives in the `Legal` message namespace so the
catalogue gate proves all three languages describe the same document. All three are `noindex`.

- **`lib/legal/cookies.ts` is the source of truth for everything stored on a visitor's device**,
  and `tests/unit/legal-cookies.test.ts` checks it against the code that actually sets it — in
  both directions. Add storage without adding it to `STORAGE_INVENTORY` and the suite fails,
  because at that moment the cookie policy has started lying.
- **The banner has two modes, derived not chosen.** Today nothing stored needs consent
  (a language choice, an appearance preference, and the record of the choice itself are all
  exempt under ePrivacy Art. 5(3)), so it informs and offers one dismissal. Add a non-necessary
  entry to the inventory and `REQUIRES_CONSENT` flips it to a real accept/reject choice with no
  further code change.
- **Gate anything non-essential on `allows("analytics")`** from `hooks/use-cookie-consent.ts`.
  It returns false until someone actively says yes — absence is refusal, and a stored decision
  made against a different set of categories is discarded, not honoured.
- **Never prefetch from the banner.** It renders on every route including the guest menu, where
  three speculative RSC requests to a policy nobody opens is a real cost on a real connection.
- **The operator's identity comes from `NEXT_PUBLIC_LEGAL_*`.** Unset, the pages say they are
  drafts. Do not hard-code a company name to make that notice go away.
