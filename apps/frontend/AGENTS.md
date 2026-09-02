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
  problem: for a price of "free", "enter a price such as 89" is the useful half.
- **Forms take their action as a prop.** `AuthForm`, `InlineTextForm`, `ItemForm` and
  `ConfirmDialog` never import a Server Action. Pages inject the real one; stories inject a stub.
  Importing a `"use server"` module into the Storybook browser bundle does not work.
- **Prices are korunas with up to two decimal places.** `numeric(10, 2)` in the database, a
  plain number on the wire, and `formatMoney` decides how it reads. Never a float column: 56.50
  is not representable in binary, and a menu that prints 56,49 is a bug nobody can explain.
- **The workspace gate lives in one place: `app/[locale]/workspace/layout.tsx`.** It calls
  `requireProfile(locale)`, which sends a visitor with no session to sign-in and a signed-in
  owner with no restaurant profile to `/complete-profile`. Pages under `/workspace` therefore
  do **not** repeat the check — a gate each new page must remember is one a new page will
  forget. `requireSession(locale)` is the weaker gate for `/complete-profile` itself (session
  required, profile deliberately not), and `getSession()` is the non-throwing read for pages
  that merely branch. All three live in `lib/api/session.ts`, deliberately *not* a
  `"use server"` module: they are render reads, and marking them would publish them as
  endpoints for no reason. `getSession` is wrapped in React `cache()`, so a layout and the page
  inside it cost one `/auth/me`, not two.
- **`/auth/me` answers `{ account, profile }`, and `profile: null` is the whole gate signal** —
  it means an account created before restaurant profiles existed. Registration writes account
  and profile in one transaction, so no new account can be in that state.
- **The return destination travels as `?next=`, and it is never trusted.** `proxy.ts` publishes
  the current path in a request header (App Router gives a layout no other way to know its own
  URL); `lib/api/next-path.ts` strips the locale prefix and rejects anything that could leave
  this origin. Pass it to `redirect` as an **object** href — a string href is localised as a
  pathname and silently loses its query.
- **The dashboard is always light.** `components/dashboard/AppearanceScope.tsx` sets
  `data-appearance="light"`, which `styles/themes/warm.css` redeclares the light tokens
  against. It is CSS only — no JS, no flash, no effect on the visitor's stored appearance
  preference, and public pages keep their dark mode. The shell's `SidebarInset` is the page's
  one `<main>`, so pages under `/workspace` render a `<div>`, not a second one.
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
  system's `Menu`. Prices are korunas both sides (`{ kind: "single", … }`); category ids
  are slugified titles plus an index, because they double as element ids and two sections may
  share a title.
- **A draft menu and an address that never existed answer identically** (404 plus the
  not-available page). Anything else lets the public route enumerate which menus exist.

# Forms and validation

**Every form that takes typed input is `useActionForm`.** One hook
(`hooks/use-action-form.ts`), one schema per form in `lib/validation/schemas.ts`, and a
`readX`/`xFormData` pair in `lib/validation/{form-data,form-values}.ts`. There is no second
pattern — a bare `useActionState` over uncontrolled inputs is what the menu editor used to do,
and it is what this replaced.

Three things depend on it, which is why it is not a preference:

- **What was typed survives a rejection.** React empties an uncontrolled `<form action={…}>`
  once its action completes, and `FormState` carries codes, never values. With react-hook-form
  owning the values and `handleSubmit` preventing the default, a rejected price no longer takes
  the dish name with it.
- **One error catalogue, wherever the failure was noticed.** Schema messages are
  `FieldErrorCode` strings, not prose (`"IS_LENGTH"`, `"IS_NUMBER"`, `"MIN"`), so a rule the
  browser caught and the same rule the API caught render through the same translation, and
  adding a rule needs no new message key.
- **It still works with no client JavaScript.** The Server Action calls the same `readX` before
  it calls the API, so the browser's check is a courtesy and the action is the authority. That
  is also why `xFormData` posts the raw typed string — `priceCzk` as `"56,50"`, not as `56.5` —
  and why `zodResolver` is given `{ raw: true }`.

Rules and traps:

- **Plain `<form action={fn}>` is only for a button.** Move up, move down, duplicate, delete,
  publish, sign out: nothing typed, no state, works before hydration. `ConfirmDialog` is one of
  these.
- **Actions return `SAVED` on success, not `IDLE`.** `onSuccess` fires from an effect on the
  falling edge of `pending`, never on the identity of `state` — a story's stub can hand back the
  same object twice and it is still two submissions. Use it to `form.reset()`, close an editing
  row, or `toast` what was saved.
- **Keep `defaultValue` on an `<Input>` alongside `register`.** `register` sets the value through
  a ref and leaves the attribute alone, so without it the server-rendered markup shows an empty
  field until hydration.
- **Register under the name the action reads.** react-hook-form matches an input to its path by
  the DOM `name`, and the no-JS post uses that same name. `InlineTextForm` takes `field` for
  exactly this reason.
- **A title is a heading, not an open input.** `EditableTitle` shows the name and a Rename button
  that swaps in the form. Every save in the editor is its own request, and a permanently open
  field beside "Save" made a section that exists look like the form for adding one.

**Phone numbers**: `components/auth/PhoneInput.tsx` is the country picker and the number as one
control; all the reading of what was typed lives in `lib/phone/` and is unit-tested there.
Typing or pasting a dialling code moves the picker and strips the code from the number — `+49`,
`0049` and a paste all work. Half a code (`+4`) is left alone rather than guessed. Country names
come from `Intl.DisplayNames`, never from the message catalogues, and they appear only in the
popup: ICU data differs between Node and the browser, so a name in the server-rendered trigger
would be a hydration mismatch waiting for a version bump. libphonenumber decides *formatting*;
`lib/api/phone.ts` still decides what is *acceptable*, mirroring the API.

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
