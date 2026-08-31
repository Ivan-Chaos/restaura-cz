# Contract: new semantic tokens `overlay` / `overlay-foreground`

A foundations change (AGENTS.md: "Adding a token is a foundations change") — every file below
changes in the **same commit**, and `tests/unit/themes.test.ts` + `tests/unit/contrast.test.ts`
must pass.

| File | Change |
|------|--------|
| `lib/design-system/tokens.ts` | `MENU_COLOR_TOKENS` += `"overlay"`, `"overlay-foreground"`; `TOKEN_PURPOSE` entries; `CONTRAST_PAIRS` += `{ foreground: "overlay-foreground", background: "overlay", min: 4.5 }` |
| `styles/themes/warm.css` | `:root,[data-theme="warm"]` and `.dark` blocks: `--overlay: var(--palette-cocoa-950); --overlay-foreground: var(--palette-cream-50);` (same values in both appearances) |
| `styles/themes/slate.css` | light + dark blocks: `--overlay: var(--palette-graphite-950); --overlay-foreground: var(--palette-graphite-50);` |
| `app/globals.css` | `@theme inline` += `--color-overlay: var(--overlay); --color-overlay-foreground: var(--overlay-foreground);` under a `/* Media */` comment |
| `.storybook/docs/Foundations.mdx` | Tables are generated from `tokens.ts`; verify the new rows render; add one sentence on when to use `overlay`. |
| `specs/001-menu-design-system/contracts/theme-contract.md` | Append the two tokens to the required list (keeps the earlier contract truthful). |

## Purpose strings

- `overlay`: "Dark scrim laid over photography and video so text stays legible; also the hero
  background when media fails. Same in light and dark."
- `overlay-foreground`: "Text and icons on `overlay` or on media beneath it. Always light."

## Usage rules

- Use `bg-overlay/<opacity>` for scrims/gradients (`bg-linear-to-t from-overlay/70 to-overlay/20`);
  opacity modifiers on token utilities are allowed by the token gate.
- Use `text-overlay-foreground` only where the element sits on `overlay` or on scrimmed media.
- Never use `overlay-foreground` on `background`/`card` surfaces — it is not guaranteed to
  contrast there.
- Themes may pick any palette steps as long as the 4.5:1 pair holds; a theme whose brand wants a
  *light* scrim must still keep its `overlay-foreground` legible on it (the test decides).
