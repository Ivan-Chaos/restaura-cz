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

- **Media is downloaded, never hot-linked.** `lib/landing/assets.ts` is the manifest; `pnpm assets:landing` fetches into `public/landing/` and regenerates `ATTRIBUTION.md`. `--check` validates budgets and dimensions without touching the network (CI path). An asset marked `optional: true` may be absent — the page is built to do without it, and `lib/landing/assets.server.ts#hasAssetFile` decides at build time. `public/landing/hero.mp4` is the current example: Pexels gates its video files, so it must be downloaded by hand.
- **Never use a stock photo carrying another company's branding.** Two of the QR candidates did; the page draws its own table tent (`components/landing/TableTent.tsx`) instead. Implying an endorsement is a Pexels licence violation, not a style preference.
- **`overlay` / `overlay-foreground` are the tokens for text on media** — `bg-overlay/60` for a scrim, `text-overlay-foreground` for what sits on it. They are the one pair that is identical in light and dark, and they are *not* safe on ordinary `background`/`card` surfaces.
- **CTA destinations are configuration**: `NEXT_PUBLIC_SIGNUP_URL` and `NEXT_PUBLIC_NOTIFY_URL` (both support `{locale}` and `{plan}` placeholders) with `mailto:` fallbacks. A call to action must never resolve to `#` — an e2e test enforces it. `NEXT_PUBLIC_SITE_URL` sets `metadataBase`, without which a relative Open Graph image is a build error.
- **No `motion` on this route.** Reveal-on-scroll is `hooks/use-in-view.ts` + `components/landing/Reveal.tsx`, about 1 KB. Its three states (`idle`/`hidden`/`shown`) exist so nothing is ever hidden that the reader can already see: only an element the browser has confirmed is off-screen is made transparent.
- **Link-buttons use `buttonVariants` on a real anchor**, not the `Button` primitive with `render`. Base UI's button expects a native `<button>`; given an anchor it either warns or replaces the link's semantics with button ones.
