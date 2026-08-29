# Restaura — frontend

Digital menus for restaurants. A restaurant publishes a menu; a guest opens it
from a link or a QR code at the table. Czech, English and German; light and dark;
and a theme per restaurant.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000 → redirects to /cs
```

The sample menu — a complete guest experience built only from the design system —
is at [`/cs/sample-menu`](http://localhost:3000/cs/sample-menu), with the
alternative theme at `/cs/sample-menu/slate`.

## Design system

The visual layer is token-driven: no component contains a colour, a font size or
a spacing value of its own, which is what lets one CSS file re-skin an entire
menu.

```bash
pnpm storybook    # http://localhost:6006 — the design system handbook
```

Start with **Documentation → Getting Started**, then **Foundations** (the token
catalogue, live in whichever theme you select) and **Theming** (how to author a
new restaurant theme).

Conventions and the rules CI enforces are in [`AGENTS.md`](./AGENTS.md).
The full specification lives in
[`specs/001-menu-design-system/`](./specs/001-menu-design-system/) — including
[`quickstart.md`](./specs/001-menu-design-system/quickstart.md), which lists the
validation scenarios and how to run each one.

## Checks

```bash
pnpm lint                 # eslint + design-token gate + translation-key parity
pnpm typecheck
pnpm test:unit            # theme contrast, token contract, price formatting
pnpm test:stories         # every story as a browser test, with axe
pnpm test:e2e             # the sample menu on a production build
pnpm test:e2e:storybook   # the built docs site and its toolbars
```

Two rules the tooling will fail you on, both deliberate:

- **No literal visual values** in `components/` or `app/` — no hex, no `oklch()`,
  no Tailwind arbitrary values like `p-[13px]`. A literal cannot respond to a
  theme, so it is treated as a defect.
- **No hard-coded user-visible text** — every string comes from `next-intl` and
  must exist in all three locales.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn (`base-nova`, on `@base-ui/react` — not Radix) · next-intl · next-themes ·
Storybook 10 · Vitest 4 · Playwright
