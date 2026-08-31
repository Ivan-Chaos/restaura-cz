/**
 * Layer 2 — the semantic token catalogue.
 *
 * This module is the single source of truth for *which* tokens exist. It drives:
 *   - `tests/unit/tokens.test.ts`   (every theme declares every required token)
 *   - `tests/unit/contrast.test.ts` (every theme meets the contrast contract)
 *   - the Foundations page in Storybook (the swatch/spec tables are generated)
 *
 * Adding a token here is a foundations-level change: it MUST be added to
 * `styles/tokens.css` and to every file in `styles/themes/` in the same commit
 * (spec FR-026).
 */

/** shadcn's core token set — consumed by everything in `components/ui`. */
export const CORE_COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
] as const;

/** Menu-domain additions. No shadcn token carries these meanings. */
export const MENU_COLOR_TOKENS = [
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "info",
  "info-foreground",
  "highlight",
  "highlight-foreground",
  "price",
  "surface-raised",
  "surface-raised-foreground",
  "overlay",
  "overlay-foreground",
] as const;

/** Non-colour tokens every theme must set. */
export const SHAPE_TOKENS = ["radius", "density"] as const;
export const TYPOGRAPHY_TOKENS = ["font-display", "font-body"] as const;
export const SHADOW_TOKENS = ["shadow-card", "shadow-overlay"] as const;

/** Optional — inherited from the default theme when a theme omits them. */
export const OPTIONAL_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "motion-fast",
  "motion-base",
  "motion-slow",
  "motion-ease",
] as const;

/** Every colour token, in catalogue order. */
export const COLOR_TOKENS = [
  ...CORE_COLOR_TOKENS,
  ...MENU_COLOR_TOKENS,
] as const;

/** Tokens a theme MUST declare, for both light and dark appearance. */
export const REQUIRED_TOKENS = [
  ...COLOR_TOKENS,
  ...SHAPE_TOKENS,
  ...TYPOGRAPHY_TOKENS,
  ...SHADOW_TOKENS,
] as const;

/** Every token this design system knows about. */
export const SEMANTIC_TOKENS = [
  ...REQUIRED_TOKENS,
  ...OPTIONAL_TOKENS,
] as const;

export type CoreColorToken = (typeof CORE_COLOR_TOKENS)[number];
export type MenuColorToken = (typeof MENU_COLOR_TOKENS)[number];
export type ColorToken = (typeof COLOR_TOKENS)[number];
export type RequiredToken = (typeof REQUIRED_TOKENS)[number];
export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];

/**
 * Human-readable purpose of each token. Rendered by the Foundations docs so a
 * theme author knows what they are assigning rather than guessing from a name.
 */
export const TOKEN_PURPOSE: Record<RequiredToken, string> = {
  background: "The page itself. The warm ground a menu sits on.",
  foreground: "Default body text on `background`.",
  card: "Generic panel surface: popovers, panels, sheets.",
  "card-foreground": "Text on `card`.",
  popover: "Floating overlay surface (tooltip, dropdown, select).",
  "popover-foreground": "Text on `popover`.",
  primary: "The one high-emphasis action colour. Calls to action, active nav.",
  "primary-foreground": "Text/icons on `primary`.",
  secondary: "Lower-emphasis filled controls and chips.",
  "secondary-foreground": "Text on `secondary`.",
  muted: "Recessed surface: legends, meta blocks, skeletons.",
  "muted-foreground": "Secondary text — dish descriptions, captions, hints.",
  accent: "Hover/active wash for interactive surfaces. Not a brand colour.",
  "accent-foreground": "Text on `accent`.",
  destructive: "Errors and destructive actions only.",
  "destructive-foreground": "Text on `destructive`.",
  border: "Hairlines and separators. Decorative, not an interactive boundary.",
  input: "Form-control boundary. Must be discernible (3:1).",
  ring: "Focus indicator. Must be discernible (3:1).",
  success: "Available, vegetarian/vegan, confirmed.",
  "success-foreground": "Text on `success`.",
  warning: "Limited availability, allergen emphasis.",
  "warning-foreground": "Text on `warning`.",
  info: "Neutral notices — service notes, market price.",
  "info-foreground": "Text on `info`.",
  highlight: "Chef's pick, new, seasonal. The 'look at this' badge.",
  "highlight-foreground": "Text on `highlight`.",
  price: "Price text. Emphasised without shouting.",
  "surface-raised": "Dish cards lifted off `background`.",
  "surface-raised-foreground": "Text on `surface-raised`.",
  overlay:
    "Dark scrim laid over photography and video so text stays legible; also the background a hero falls back to when its media fails. Deliberately the same in light and dark — a scrim is dark either way.",
  "overlay-foreground":
    "Text and icons on `overlay`, or on media covered by it. Always light, in both appearances.",
  radius: "Base corner radius; the sm/md/lg/xl scale derives from it.",
  density: "Unitless spacing multiplier (0.8–1.2). 1 = default rhythm.",
  "font-display": "Headings, establishment name, dish names.",
  "font-body": "Body copy, prices, UI.",
  "shadow-card": "Resting elevation for dish cards.",
  "shadow-overlay": "Elevation for sheets, dialogs, popovers.",
};

/**
 * The accessibility contract, checked by `tests/unit/contrast.test.ts` for every
 * theme in both appearances.
 *
 * Thresholds follow WCAG 2.1 AA:
 *   - 4.5:1 for text (1.4.3)
 *   - 3:1 for the boundary of interactive controls and focus indicators
 *     (1.4.11 Non-text Contrast)
 *
 * `border` is deliberately held to a lower bar: hairlines and separators are
 * decorative and are NOT required by 1.4.11 to reach 3:1. Requiring it would
 * force a harsh line that fights the warm, soft register of the menu. 1.5:1
 * keeps it perceptible.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  // Body and surface text.
  { foreground: "foreground", background: "background", min: 4.5 },
  { foreground: "card-foreground", background: "card", min: 4.5 },
  { foreground: "popover-foreground", background: "popover", min: 4.5 },
  {
    foreground: "surface-raised-foreground",
    background: "surface-raised",
    min: 4.5,
  },
  // Secondary text must survive on every surface it can land on.
  { foreground: "muted-foreground", background: "muted", min: 4.5 },
  { foreground: "muted-foreground", background: "background", min: 4.5 },
  { foreground: "muted-foreground", background: "card", min: 4.5 },
  { foreground: "muted-foreground", background: "surface-raised", min: 4.5 },
  // Filled controls and status chips.
  { foreground: "primary-foreground", background: "primary", min: 4.5 },
  { foreground: "secondary-foreground", background: "secondary", min: 4.5 },
  { foreground: "accent-foreground", background: "accent", min: 4.5 },
  {
    foreground: "destructive-foreground",
    background: "destructive",
    min: 4.5,
  },
  { foreground: "success-foreground", background: "success", min: 4.5 },
  { foreground: "warning-foreground", background: "warning", min: 4.5 },
  { foreground: "info-foreground", background: "info", min: 4.5 },
  { foreground: "highlight-foreground", background: "highlight", min: 4.5 },
  // Price is the single most-read value on a menu.
  { foreground: "price", background: "background", min: 4.5 },
  { foreground: "price", background: "card", min: 4.5 },
  { foreground: "price", background: "surface-raised", min: 4.5 },
  // Text over photography. The scrim is what makes a hero headline legible on
  // top of an image we do not control, so the pair is held to the text bar.
  { foreground: "overlay-foreground", background: "overlay", min: 4.5 },
  // Non-text contrast (WCAG 1.4.11).
  { foreground: "ring", background: "background", min: 3 },
  { foreground: "ring", background: "card", min: 3 },
  { foreground: "input", background: "background", min: 3 },
  { foreground: "primary", background: "background", min: 3 },
  // Perceptibility floor for decorative hairlines (see doc comment above).
  { foreground: "border", background: "background", min: 1.5 },
  { foreground: "border", background: "card", min: 1.5 },
];

export interface ContrastPair {
  /** Token painted on top. */
  foreground: ColorToken;
  /** Token painted underneath. */
  background: ColorToken;
  /** Minimum WCAG contrast ratio. */
  min: number;
}

export const APPEARANCES = ["light", "dark"] as const;
export type Appearance = (typeof APPEARANCES)[number];
