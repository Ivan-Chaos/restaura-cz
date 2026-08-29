# Contract: Menu Theme

A **theme** is a CSS file at `styles/themes/<id>.css` plus one entry in
`lib/design-system/themes.ts`. It is valid only if it satisfies every MUST
below; all of these are enforced automatically by `tests/unit/themes.test.ts`
and `tests/unit/contrast.test.ts`.

> **Implementation note (revised during build).** The default theme's values
> live in **one** rule with a combined selector list rather than being copied
> into a separate `tokens.css`. `:root` makes the default theme ambient (so every
> shadcn primitive is themed without a wrapper) and `[data-theme="warm"]` makes
> it scopable. Declaring both together removes the possibility of two copies
> drifting apart; `themes.test.ts` asserts the ambient and scoped values are
> identical.

## Structure

Non-default theme:

```css
/* styles/themes/<id>.css */
[data-theme="<id>"] {
  /* light appearance — every REQUIRED token */
}
.dark [data-theme="<id>"],
[data-theme="<id>"].dark {
  /* dark appearance — every REQUIRED token that differs */
}
```

Default theme (`warm`) only — additionally owns the ambient scope:

```css
:root,
[data-theme="warm"] { /* light */ }

.dark,
.dark [data-theme="warm"],
[data-theme="warm"].dark { /* dark */ }
```

- `<id>` MUST be lowercase kebab-case, unique, and equal to `Theme.id` in the registry.
- The file MUST be imported from `app/globals.css`.
- A non-default theme MUST NOT declare `:root` — it only ever applies inside a scope.
- The dark rule may declare only the tokens that change; the light rule is the base.

## Required tokens (MUST be resolvable in both appearances)

Colours: `--background --foreground --card --card-foreground --popover
--popover-foreground --primary --primary-foreground --secondary
--secondary-foreground --muted --muted-foreground --accent --accent-foreground
--destructive --destructive-foreground --border --input --ring --success
--success-foreground --warning --warning-foreground --info --info-foreground
--highlight --highlight-foreground --price --surface-raised
--surface-raised-foreground --overlay --overlay-foreground`

`--overlay` / `--overlay-foreground` were added by feature 002 (marketing landing
page): a scrim over photography plus the light text that sits on it. They are the
one pair that is deliberately the *same* value in light and dark — a photograph is
dark underneath either way.

Non-colour: `--radius` (rem) · `--density` (unitless, 0.8–1.2) · `--font-display`
· `--font-body` · `--shadow-card` · `--shadow-overlay`

The authoritative list is `REQUIRED_TOKENS` in `lib/design-system/tokens.ts`;
`TOKEN_PURPOSE` in the same file documents what each one is for and is rendered
into the Foundations page.

## Optional tokens (inherit from the default theme if omitted)

`--chart-1..5`, `--sidebar*`, `--motion-fast`, `--motion-base`, `--motion-slow`,
`--motion-ease`

## Accessibility guarantees (MUST, both appearances)

The machine-readable version is `CONTRAST_PAIRS` in
`lib/design-system/tokens.ts`; the test reports the measured ratio for any pair
that fails.

| Pair | Minimum | Basis |
|------|---------|-------|
| every `X-foreground` on its `X` | 4.5 : 1 | WCAG 1.4.3 |
| `--muted-foreground` on `--muted`, `--background`, `--card`, `--surface-raised` | 4.5 : 1 | WCAG 1.4.3 |
| `--price` on `--background`, `--card`, `--surface-raised` | 4.5 : 1 | WCAG 1.4.3 |
| `--overlay-foreground` on `--overlay` | 4.5 : 1 | WCAG 1.4.3 |
| `--ring` on `--background` and `--card` | 3 : 1 | WCAG 1.4.11 |
| `--input` on `--background` | 3 : 1 | WCAG 1.4.11 |
| `--primary` on `--background` | 3 : 1 | WCAG 1.4.11 |
| `--border` on `--background` and `--card` | 1.5 : 1 | see below |

**Why `--border` is held to a lower bar (revised during build).** The original
draft required 3:1. That is wrong: WCAG 1.4.11 covers the boundaries of
*interactive* controls, not decorative hairlines and separators. Requiring 3:1
would force a harsh line that fights the soft register a warm restaurant menu
wants — and no shipped design system, shadcn included, meets it for `--border`.
`--input`, which *is* a control boundary, keeps the full 3:1. 1.5:1 is a
perceptibility floor, not an accessibility claim.

## Behavioural guarantees

- Wrapping any component in `<ThemeScope theme="<id>">` MUST change its
  appearance with no change to the component (verified by the `slate` pass of
  the story test suite).
- A theme MUST NOT introduce a token name. New tokens are a foundations change:
  add to `tokens.ts` and to every theme in one commit (spec FR-026). Enforced by
  the "declares no token outside the documented catalogue" test.
- A theme MUST NOT reference a `--palette-*` step that does not exist. Enforced.
- `--font-display` / `--font-body` MUST reference a variable that
  `app/[locale]/layout.tsx` actually publishes via `next/font`. The map is
  `FONT_VARIABLES` in `lib/design-system/themes.ts`; enforced by the "only asks
  for font faces the layout actually loads" test. They MUST also carry a
  fallback stack.

## Registry entry

```ts
// lib/design-system/themes.ts
export const THEMES = [
  { id: "warm",  isDefault: true,  fonts: { display: "fraunces",   body: "nunitoSans" } },
  { id: "slate", isDefault: false, fonts: { display: "nunitoSans", body: "nunitoSans" } },
] as const satisfies readonly Theme[];
```

Display names live in `messages/{cs,en,de}.json` under `Themes`.

## Authoring checklist

Documented for theme authors in Storybook → **Documentation / Theming**.

1. Copy `styles/themes/warm.css` → `styles/themes/<id>.css`; change the selectors
   and drop `:root`.
2. Add any palette steps you need to `styles/palette.css`.
3. Set every required token for light and dark.
4. `@import` the file in `app/globals.css`.
5. Register in `themes.ts`; add `Themes.<id>` to all three message catalogues.
6. `pnpm test:unit` — failures name the token or the colour pair and the measured
   ratio.
7. Open Storybook, switch the theme toolbar, review **Examples / Sample Menu Page**
   in both appearances.
