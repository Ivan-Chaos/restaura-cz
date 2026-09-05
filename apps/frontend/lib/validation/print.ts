import { z } from "zod";

import { routing, type Locale } from "@/i18n/routing";

/**
 * What a print request may ask for.
 *
 * Both the route handlers and the print pages parse through here, so a value
 * the dialog would never produce — a hand-typed `count=0`, a locale that does
 * not exist — is refused in one place rather than in four (spec 007 FR-007).
 *
 * The same `stickerCountSchema` runs in the browser as the owner types, which
 * is what lets an invalid count be reported inline without spending a request.
 */

export const STICKER_COUNT_MIN = 1;

/**
 * Enough for a very large venue while keeping a sheet's render time bounded.
 * An owner who needs more downloads twice.
 */
export const STICKER_COUNT_MAX = 200;

/**
 * How densely stickers may be packed onto an A4 sheet, and the grid each
 * density uses.
 *
 * The sheet is printed edge to edge, so a cell is simply A4 divided by the
 * grid: 210 × 297 mm over 3 × 4 gives a 70 × 74 mm sticker. The list stops at
 * 16 because that is roughly where a QR code stops leaving room for the
 * restaurant's name and the table number beside it.
 */
export const STICKER_LAYOUTS = [
  { perPage: 2, columns: 1, rows: 2 },
  { perPage: 4, columns: 2, rows: 2 },
  { perPage: 6, columns: 2, rows: 3 },
  { perPage: 9, columns: 3, rows: 3 },
  { perPage: 12, columns: 3, rows: 4 },
  { perPage: 16, columns: 4, rows: 4 },
] as const satisfies readonly { perPage: number; columns: number; rows: number }[];

export type StickerLayout = (typeof STICKER_LAYOUTS)[number];
export type StickersPerPage = StickerLayout["perPage"];

export const STICKERS_PER_PAGE_OPTIONS = STICKER_LAYOUTS.map(
  (layout) => layout.perPage,
) as readonly StickersPerPage[];

/** A quarter of a sheet: big enough to read across a table, small enough to place. */
export const DEFAULT_STICKERS_PER_PAGE: StickersPerPage = 4;

export function isStickersPerPage(value: unknown): value is StickersPerPage {
  return (STICKERS_PER_PAGE_OPTIONS as readonly unknown[]).includes(Number(value));
}

export function stickerLayout(perPage: StickersPerPage): StickerLayout {
  const layout = STICKER_LAYOUTS.find((candidate) => candidate.perPage === perPage);
  if (!layout) throw new Error(`Unknown stickers-per-page value: ${perPage}`);
  return layout;
}

/**
 * How much smaller everything on a sticker has to get as the grid tightens.
 *
 * Three steps rather than a continuous scale: a cell either has room for the
 * comfortable treatment, or it does not, and two intermediate sizes cover the
 * span without turning every element into a calculation.
 */
export type StickerDensity = "roomy" | "medium" | "tight";

export function stickerDensity(perPage: StickersPerPage): StickerDensity {
  if (perPage <= 4) return "roomy";
  if (perPage <= 9) return "medium";
  return "tight";
}

export const DEFAULT_STICKER_COUNT = 12;

export const stickerCountSchema = z.coerce
  .number({ error: "IS_INT" })
  .int("IS_INT")
  .min(STICKER_COUNT_MIN, "MIN")
  .max(STICKER_COUNT_MAX, "MAX");

/**
 * `"1"` and `"0"` only. Anything else is `undefined` rather than an error: the
 * parameter is a preference, and an unreadable preference is simply absent.
 * What it finally means is decided by `resolveBranding`, from the account's
 * plan.
 */
export function parseBranding(value: string | null | undefined): boolean | undefined {
  if (value === "1") return true;
  if (value === "0") return false;
  return undefined;
}

function parseLocale(value: string | null | undefined): Locale | undefined {
  return routing.locales.includes(value as Locale) ? (value as Locale) : undefined;
}

export interface PrintOptions {
  locale: Locale;
  branding: boolean | undefined;
}

export interface StickerOptions extends PrintOptions {
  count: number;
  perPage: StickersPerPage;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false };

/** Options for the menu document. An absent locale defaults; a wrong one fails. */
export function parseMenuOptions(params: URLSearchParams): ParseResult<PrintOptions> {
  const rawLocale = params.get("locale");
  const locale = rawLocale === null ? routing.defaultLocale : parseLocale(rawLocale);
  if (!locale) return { ok: false };

  return { ok: true, value: { locale, branding: parseBranding(params.get("branding")) } };
}

/**
 * Options for the sticker sheet. `count` is required and must be in range;
 * `perPage` defaults to a quarter sheet when absent, and is rejected rather
 * than rounded when it is not one of the offered densities.
 */
export function parseStickerOptions(params: URLSearchParams): ParseResult<StickerOptions> {
  const base = parseMenuOptions(params);
  if (!base.ok) return { ok: false };

  const count = stickerCountSchema.safeParse(params.get("count"));
  if (!count.success) return { ok: false };

  const rawPerPage = params.get("perPage");
  if (rawPerPage !== null && !isStickersPerPage(rawPerPage)) return { ok: false };
  const perPage = rawPerPage === null
    ? DEFAULT_STICKERS_PER_PAGE
    : (Number(rawPerPage) as StickersPerPage);

  return { ok: true, value: { ...base.value, count: count.data, perPage } };
}

/** How many A4 sheets `count` stickers need at the chosen density. */
export function stickerPageCount(count: number, perPage: StickersPerPage): number {
  return Math.ceil(count / perPage);
}
