import type { ThemeId } from "@/lib/design-system/themes";

/**
 * How a menu is *built*, as opposed to how it is *coloured*.
 *
 * Tokens (a theme) decide colour, type, radius and rhythm. They cannot decide
 * whether the header is a centred serif masthead or a full-bleed band, whether
 * dishes are glass cards or a ledger, or whether a section is introduced by a
 * roman numeral or a brass bar. That is structure, and structure is a
 * composition choice — so it lives here, as a recipe the menu compositions
 * read, and every axis is a variant a component already knows how to render.
 *
 * A theme without an entry gets `classic`, which is exactly what the menu
 * looked like before recipes existed. That keeps `slate` — the design system's
 * adversarial fixture — a pure re-colouring, which is its whole job.
 */
export type PresentationId = "classic" | "minimal" | "glass" | "board" | "editorial" | "fine";

export type HeaderLayout = "classic" | "minimal" | "glass" | "band" | "editorial" | "centered";
export type NavShape = "pills" | "underline" | "glass" | "squares" | "heavy" | "text";
export type SectionStyle = "classic" | "caps" | "glass" | "bar" | "numbered" | "roman";
export type DishLayout = "rows" | "ledger" | "glass" | "board" | "editorial" | "centered";
export type PriceTreatment = "leader" | "right" | "chip" | "bold" | "below";

export interface Presentation {
  id: PresentationId;
  header: HeaderLayout;
  nav: NavShape;
  section: SectionStyle;
  /** How dishes *without* photographs are laid out. */
  rows: DishLayout;
  /** How dishes *with* photographs are laid out (the sample menu has them). */
  cards: DishLayout;
  price: PriceTreatment;
  /** Whether a category's dishes sit inside a `MenuPanel`. */
  panel: boolean;
}

export const PRESENTATIONS: Record<PresentationId, Presentation> = {
  classic: {
    id: "classic",
    header: "classic",
    nav: "pills",
    section: "classic",
    rows: "rows",
    cards: "rows",
    price: "leader",
    panel: true,
  },
  /** Plain White: a ledger. No leaders, no cards, hairlines only. */
  minimal: {
    id: "minimal",
    header: "minimal",
    nav: "underline",
    section: "caps",
    rows: "ledger",
    cards: "ledger",
    price: "right",
    panel: false,
  },
  /** Liquid Glass: floating glass bars and translucent cards over the ambient. */
  glass: {
    id: "glass",
    header: "glass",
    nav: "glass",
    section: "glass",
    rows: "glass",
    cards: "glass",
    price: "chip",
    panel: true,
  },
  /** Green Bar: the pub board — band masthead, brass section bars, big prices. */
  board: {
    id: "board",
    header: "band",
    nav: "squares",
    section: "bar",
    rows: "board",
    cards: "board",
    price: "bold",
    panel: false,
  },
  /** Modern: editorial — oversized numbered sections, flat cards, bold prices. */
  editorial: {
    id: "editorial",
    header: "editorial",
    nav: "heavy",
    section: "numbered",
    rows: "editorial",
    cards: "editorial",
    price: "bold",
    panel: false,
  },
  /** Refined: fine dining — centred masthead, roman numerals, prices beneath. */
  fine: {
    id: "fine",
    header: "centered",
    nav: "text",
    section: "roman",
    rows: "centered",
    cards: "centered",
    price: "below",
    panel: false,
  },
};

const PRESENTATION_BY_THEME: Partial<Record<ThemeId, PresentationId>> = {
  "plain-white": "minimal",
  "liquid-glass": "glass",
  "green-bar": "board",
  modern: "editorial",
  refined: "fine",
};

export const PRESENTATION_IDS = Object.keys(PRESENTATIONS) as PresentationId[];

export function isPresentationId(value: unknown): value is PresentationId {
  return typeof value === "string" && value in PRESENTATIONS;
}

/** The recipe a theme is composed with. Unknown or fixture themes get `classic`. */
export function presentationForTheme(themeId: ThemeId): Presentation {
  return PRESENTATIONS[PRESENTATION_BY_THEME[themeId] ?? "classic"];
}

/** Photographed dishes render as cards in every recipe but the ledger ones. */
export function usesCards(layout: DishLayout): boolean {
  return layout === "glass" || layout === "editorial";
}
