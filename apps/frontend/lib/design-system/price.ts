import type { Money, PriceModel } from "./types";

/**
 * Price formatting.
 *
 * Prices are the single most-read value on a menu, so they follow the guest's
 * locale conventions rather than one house style: a Czech guest expects
 * `189 Kč` with a non-breaking space, a German guest `189 Kč` with a comma
 * decimal, an English-speaking guest `CZK 189`. `Intl.NumberFormat` knows all
 * of that; this module only decides the policy around it.
 */

/**
 * Decimals appear only when the price has them. Most menu prices are whole —
 * printing `189,00 Kč` beside `245,00 Kč` is noise — but a price of 56,50 is a
 * real price an owner can enter, and rounding it on the menu would be wrong.
 */
function fractionDigits(amount: number): number {
  return Number.isInteger(amount) ? 0 : 2;
}

/**
 * A stored price, written the way this locale's owner would type it.
 *
 * For a text input, so no currency and no grouping — a thousands separator is
 * not something anyone types into a price field, and the field's own rule would
 * reject it. Whole prices stay whole (`89`); a price with hellers gets both
 * decimals and the locale's separator (`56,50` in Czech), so re-opening a dish
 * shows back what was entered rather than a dot and a dropped zero.
 */
export function formatPriceInput(locale: string, amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatMoney(locale: string, money: Money): string {
  const digits = fractionDigits(money.amount);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(money.amount);
}

/**
 * The lowest amount a price implies, for sorting or "from" display.
 * `market` has no amount by definition.
 */
export function lowestAmount(price: PriceModel): Money | undefined {
  switch (price.kind) {
    case "single":
    case "from":
      return price.amount;
    case "variants":
      return price.variants.reduce<Money | undefined>(
        (lowest, variant) =>
          lowest === undefined || variant.amount.amount < lowest.amount
            ? variant.amount
            : lowest,
        undefined,
      );
    case "market":
      return undefined;
  }
}

/**
 * A single-line, screen-reader-friendly rendering of any price.
 *
 * `Price` renders richer markup visually; this is what goes into an `aria-label`
 * or a plain-text context (a line item, a share preview) where the visual
 * treatment is unavailable.
 */
export function formatPriceLabel(
  locale: string,
  price: PriceModel,
  t: {
    from: (price: string) => string;
    marketPrice: string;
    variantSeparator?: string;
  },
): string {
  switch (price.kind) {
    case "single":
      return formatMoney(locale, price.amount);
    case "from":
      return t.from(formatMoney(locale, price.amount));
    case "market":
      return t.marketPrice;
    case "variants":
      return price.variants
        .map((v) => `${v.label} ${formatMoney(locale, v.amount)}`)
        .join(t.variantSeparator ?? " · ");
  }
}
