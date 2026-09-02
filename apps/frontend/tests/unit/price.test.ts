import { describe, expect, it } from "vitest";

import {
  formatMoney,
  formatPriceInput,
  formatPriceLabel,
  lowestAmount,
} from "@/lib/design-system/price";
import type { Money, PriceModel } from "@/lib/design-system/types";

const czk = (amount: number): Money => ({ amount, currency: "CZK" });
const eur = (amount: number): Money => ({ amount, currency: "EUR" });

/** Intl inserts non-breaking/narrow-nbsp; compare on the visible characters. */
const normalise = (value: string) => value.replace(/[  ]/g, " ");

describe("formatMoney", () => {
  it("follows Czech conventions for a Czech guest", () => {
    expect(normalise(formatMoney("cs", czk(189)))).toBe("189 Kč");
  });

  it("follows German conventions", () => {
    expect(normalise(formatMoney("de", czk(189)))).toBe("189 Kč");
  });

  it("puts the symbol where English expects it, but keeps the real currency", () => {
    // narrowSymbol on purpose: whatever language the interface is in, the guest
    // pays in koruna, so they should see "Kč" and not a converted-looking "CZK".
    expect(normalise(formatMoney("en", czk(189)))).toBe("Kč 189");
  });

  it("drops meaningless decimals on whole prices", () => {
    // A menu shows `189 Kč`, never `189,00 Kč`.
    expect(normalise(formatMoney("cs", czk(189)))).not.toContain(",00");
  });

  it("keeps decimals when the amount actually has them", () => {
    expect(normalise(formatMoney("de", eur(12.5)))).toBe("12,50 €");
  });

  it("renders a zero price rather than nothing", () => {
    // Free item ≠ missing price; the guest must still see a value.
    expect(normalise(formatMoney("cs", czk(0)))).toBe("0 Kč");
  });
});

describe("lowestAmount", () => {
  it("returns the amount for single and from prices", () => {
    expect(lowestAmount({ kind: "single", amount: czk(189) })).toEqual(czk(189));
    expect(lowestAmount({ kind: "from", amount: czk(320) })).toEqual(czk(320));
  });

  it("finds the cheapest variant regardless of order", () => {
    const price: PriceModel = {
      kind: "variants",
      variants: [
        { label: "0,5 l", amount: czk(59) },
        { label: "0,3 l", amount: czk(45) },
      ],
    };
    expect(lowestAmount(price)).toEqual(czk(45));
  });

  it("has no amount for a market price", () => {
    expect(lowestAmount({ kind: "market" })).toBeUndefined();
  });
});

describe("formatPriceLabel", () => {
  const t = {
    from: (price: string) => `od ${price}`,
    marketPrice: "Denní cena",
  };

  it("labels each price kind distinctly", () => {
    expect(normalise(formatPriceLabel("cs", { kind: "single", amount: czk(189) }, t))).toBe(
      "189 Kč",
    );
    expect(normalise(formatPriceLabel("cs", { kind: "from", amount: czk(320) }, t))).toBe(
      "od 320 Kč",
    );
    expect(formatPriceLabel("cs", { kind: "market" }, t)).toBe("Denní cena");
  });

  it("keeps variants in the order the restaurant listed them", () => {
    const label = normalise(
      formatPriceLabel(
        "cs",
        {
          kind: "variants",
          variants: [
            { label: "0,3 l", amount: czk(45) },
            { label: "0,5 l", amount: czk(59) },
          ],
        },
        t,
      ),
    );
    expect(label).toBe("0,3 l 45 Kč · 0,5 l 59 Kč");
  });
});

/**
 * What goes back into a price *field*, as opposed to onto a menu.
 *
 * The two differ in three ways and each one matters: no currency, no thousands
 * separator, and the decimals only when the price has them — because whatever
 * this produces has to be something the price rule would accept if the owner
 * retyped it by hand.
 */
describe("formatPriceInput", () => {
  it("uses the locale's decimal separator", () => {
    expect(formatPriceInput("cs", 56.5)).toBe("56,50");
    expect(formatPriceInput("de", 56.5)).toBe("56,50");
    expect(formatPriceInput("en", 56.5)).toBe("56.50");
  });

  it("leaves a whole price whole", () => {
    // `89,00` in a field the owner is about to edit is noise they have to read
    // past.
    expect(formatPriceInput("cs", 89)).toBe("89");
    expect(formatPriceInput("cs", 0)).toBe("0");
  });

  it("gives both decimals, so a trailing zero is not dropped", () => {
    expect(formatPriceInput("cs", 56.5)).not.toBe("56,5");
  });

  it("never groups thousands, which no price field accepts", () => {
    expect(formatPriceInput("cs", 1250)).toBe("1250");
    expect(formatPriceInput("en", 1250.5)).toBe("1250.50");
  });
});
