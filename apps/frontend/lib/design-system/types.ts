import type { AllergenNumber, DietaryMarkerId, DishWarningId } from "./dietary";

/**
 * Display models.
 *
 * These describe what menu components *render*, not how a menu is stored. No
 * backend exists yet; when one does, an adapter maps its shape onto these. That
 * keeps the design system free of persistence concerns and lets Storybook and
 * the sample route drive components from plain fixtures.
 */

export interface ImageModel {
  src: string;
  /** Empty string marks the image as decorative; every dish photo should describe the dish. */
  alt: string;
  width: number;
  height: number;
}

export type CurrencyCode = "CZK" | "EUR";

export interface Money {
  /** Major units (189 = 189 Kč), not minor units. Menus are never priced in hundredths. */
  amount: number;
  currency: CurrencyCode;
}

/**
 * Every way a menu states a price.
 *
 * Modelled as a discriminated union rather than `price?: number` because "from
 * 189" and "market price" are not missing prices — they are different, and each
 * needs its own typography and its own translated wording.
 */
export type PriceModel =
  | { kind: "single"; amount: Money }
  | { kind: "from"; amount: Money }
  | { kind: "variants"; variants: PriceVariant[] }
  | { kind: "market" };

export interface PriceVariant {
  /** Translated label — "0.5 l", "Half", "Large portion". */
  label: string;
  amount: Money;
}

export type Availability = "available" | "limited" | "soldOut";

export type Highlight = "chefsPick" | "new" | "seasonal" | "popular";

/** 0 = not spicy. Rendered as repeated icons plus an accessible label. */
export type SpiceLevel = 0 | 1 | 2 | 3;

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  /** Absent is normal, not an error: the card collapses the image block. */
  image?: ImageModel;
  price: PriceModel;
  dietary?: DietaryMarkerId[];
  /** EU 1169/2011 numbers, as Czech menus print them. */
  allergens?: AllergenNumber[];
  /**
   * Cautions a guest may need to act on, as opposed to the claims above.
   * Rendered in the same strip, ahead of the markers.
   */
  warnings?: DishWarningId[];
  availability?: Availability;
  highlights?: Highlight[];
  spiceLevel?: SpiceLevel;
}

export interface MenuCategory {
  /** Slug; doubles as the scroll anchor id used by `CategoryNav`. */
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface OpeningHoursLine {
  /** "Mon–Fri" */
  label: string;
  /** "11:00 – 23:00" */
  hours: string;
}

export interface EstablishmentContact {
  address?: string;
  phone?: string;
  website?: string;
}

export interface Establishment {
  name: string;
  tagline?: string;
  welcome?: string;
  logo?: ImageModel;
  openingHours?: OpeningHoursLine[];
  contact?: EstablishmentContact;
  /** "Prices include VAT", "Allergen list 1–14 available" … */
  serviceNotes?: string[];
  /** The shareable link/QR target — the only way guests reach a menu. */
  shareUrl?: string;
}

export interface Menu {
  establishment: Establishment;
  categories: MenuCategory[];
  specials?: MenuItem[];
}
