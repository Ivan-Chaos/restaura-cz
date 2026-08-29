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
 * Menu prices are whole units. Showing `189,00 Kč` on a menu is noise, and
 * fractional koruna prices do not exist. EUR menus do use cents, so decimals
 * are kept when the amount actually has them.
 */
function fractionDigits(amount: number): number {
  return Number.isInteger(amount) ? 0 : 2;
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
