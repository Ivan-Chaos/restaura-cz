import { describe, expect, it } from "vitest";

import {
  composePhone,
  detectCountry,
  formatNational,
  mainCountryFor,
  splitPhone,
  DEFAULT_PHONE_COUNTRY,
  PINNED_PHONE_COUNTRIES,
} from "@/lib/phone/country";
import { countryOptions, regionFlag } from "@/lib/phone/countries";

/**
 * The phone field's reading of what has been typed.
 *
 * These are the cases a person hits once and remembers: pasting a foreign
 * number into a field that says Czechia, typing `00420` the way you would dial
 * it, and stopping halfway through a dialling code. Each one used to leave the
 * country picker saying something the number did not.
 */
describe("detectCountry", () => {
  it("reads plain digits as a number in the country on screen", () => {
    expect(detectCountry("601234567", "CZ")).toEqual({
      kind: "national",
      digits: "601234567",
    });
  });

  it("keeps only the digits of a number typed with spaces", () => {
    expect(detectCountry("601 234 567", "CZ")).toEqual({
      kind: "national",
      digits: "601234567",
    });
  });

  it("recognises the country on screen when its own code is typed out", () => {
    expect(detectCountry("+420 6", "CZ")).toEqual({
      kind: "international",
      country: "CZ",
      callingCode: "420",
      digits: "6",
    });
  });

  it("switches country when another one's code is typed", () => {
    expect(detectCountry("+49 30 123456", "CZ")).toEqual({
      kind: "international",
      country: "DE",
      callingCode: "49",
      digits: "30123456",
    });
  });

  it("switches back, so a correction is not a dead end", () => {
    expect(detectCountry("+420 601", "DE")).toMatchObject({
      country: "CZ",
      digits: "601",
    });
  });

  it("understands the international prefix, not just the plus", () => {
    // What somebody dialling from Czechia would write.
    expect(detectCountry("00420601", "CZ")).toEqual({
      kind: "international",
      country: "CZ",
      callingCode: "420",
      digits: "601",
    });
  });

  it("waits rather than guessing while the code is incomplete", () => {
    // +4 could still become +40, +41, +420 or +49. Picking one would move the
    // picker under the owner's hands mid-word.
    expect(detectCountry("+4", "CZ")).toEqual({ kind: "partial", raw: "+4" });
    expect(detectCountry("+", "CZ")).toEqual({ kind: "partial", raw: "+" });
  });

  it("picks the main country for a code several countries share", () => {
    // +1 is the United States long before it is Antigua, and libphonenumber
    // cannot tell which until enough digits arrive.
    expect(detectCountry("+1 212", "CZ")).toMatchObject({ country: "US", callingCode: "1" });
    expect(detectCountry("+44 20", "CZ")).toMatchObject({ country: "GB", callingCode: "44" });
  });

  it("keeps the digits intact whichever country a shared code resolves to", () => {
    // A Guernsey number, which shares +44 with the United Kingdom. The bundled
    // metadata is the compact set, so it reports the main country rather than
    // distinguishing the Crown dependencies — which costs nothing here, since
    // the dialling code and the digits are what get stored.
    expect(detectCountry("+44 1481 123456", "CZ")).toMatchObject({
      callingCode: "44",
      digits: "1481123456",
    });
  });

  it("treats an empty field as an unused one, not as a country", () => {
    expect(detectCountry("", "CZ")).toEqual({ kind: "national", digits: "" });
  });
});

describe("mainCountryFor", () => {
  it.each([
    ["1", "US"],
    ["44", "GB"],
    ["420", "CZ"],
    ["49", "DE"],
    ["7", "RU"],
  ])("reports +%s as %s", (code, expected) => {
    expect(mainCountryFor(code)).toBe(expected);
  });

  it("has no answer for a code nobody uses", () => {
    expect(mainCountryFor("999")).toBeUndefined();
  });
});

describe("composePhone", () => {
  it("stores the number the way a menu prints it", () => {
    // Pinned, because the e2e suites and the API's stored value both assume it.
    expect(composePhone("CZ", "601234567")).toBe("+420 601 234 567");
  });

  it("puts the right dialling code in front of any country's number", () => {
    // Grouping comes from libphonenumber's compact metadata, which carries
    // spacing rules for some countries and not others. The dialling code and
    // the digits are what matter; a German number simply arrives ungrouped.
    expect(composePhone("DE", "30123456")).toBe("+49 30123456");
    expect(composePhone("SK", "901123456")).toBe("+421 901123456");
    expect(composePhone("FR", "123456789")).toBe("+33 123456789");
  });

  it("stays empty for an unused input rather than becoming a bare code", () => {
    expect(composePhone("CZ", "")).toBe("");
  });
});

describe("splitPhone", () => {
  it.each([
    ["+420 601 234 567", "CZ", "601 234 567"],
    ["+49 30 123456", "DE", "30123456"],
    ["+33 1 23 45 67 89", "FR", "123456789"],
    ["+421 901 123 456", "SK", "901123456"],
  ])("splits %s into %s and its national part", (stored, country, national) => {
    expect(splitPhone(stored)).toEqual({ country, national });
  });

  it("round-trips whatever compose produced", () => {
    for (const country of PINNED_PHONE_COUNTRIES) {
      const digits = country === "CZ" ? "601234567" : "901123456";
      const stored = composePhone(country, digits);
      const parts = splitPhone(stored);
      expect(composePhone(parts.country, parts.national.replace(/\D/g, ""))).toBe(stored);
    }
  });

  it("splits a number too short for the strict parser", () => {
    expect(splitPhone("+49 30")).toEqual({ country: "DE", national: "30" });
  });

  it("keeps an unparseable value editable instead of dropping it", () => {
    // Something stored before this field existed. Showing it back is the only
    // way its owner can fix it.
    expect(splitPhone("zavolejte do baru")).toEqual({
      country: DEFAULT_PHONE_COUNTRY,
      national: "zavolejte do baru",
    });
  });

  it("treats blank as the default country and an empty field", () => {
    expect(splitPhone("")).toEqual({ country: "CZ", national: "" });
    expect(splitPhone("   ")).toEqual({ country: "CZ", national: "" });
  });
});

describe("formatNational", () => {
  it("groups digits as they are typed", () => {
    expect(formatNational("CZ", "601")).toBe("601");
    expect(formatNational("CZ", "601234")).toBe("601 234");
    expect(formatNational("CZ", "601234567")).toBe("601 234 567");
  });

  it("has nothing to group in an empty field", () => {
    expect(formatNational("CZ", "")).toBe("");
  });
});

describe("regionFlag", () => {
  it("is the pair of regional indicators for the code", () => {
    expect(regionFlag("CZ")).toBe("🇨🇿");
    expect(regionFlag("DE")).toBe("🇩🇪");
  });
});

describe("countryOptions", () => {
  it("puts the neighbours first, in the order they are pinned", () => {
    expect(countryOptions("cs").pinned.map((option) => option.code)).toEqual([
      ...PINNED_PHONE_COUNTRIES,
    ]);
  });

  it("lists every other country exactly once", () => {
    const { pinned, rest } = countryOptions("cs");
    const codes = [...pinned, ...rest].map((option) => option.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(rest.some((option) => option.code === "CZ")).toBe(false);
    expect(rest.length).toBeGreaterThan(200);
  });

  it("names them in the reader's language", () => {
    const german = countryOptions("cs").rest.find((option) => option.code === "FR");
    expect(german?.name).toBe("Francie");
    expect(countryOptions("en").rest.find((option) => option.code === "FR")?.name).toBe(
      "France",
    );
  });

  it("sorts the rest by the name actually on screen", () => {
    const { rest } = countryOptions("cs");
    const collator = new Intl.Collator("cs");
    const names = rest.map((option) => option.name);

    expect(names).toEqual([...names].sort((a, b) => collator.compare(a, b)));
  });

  it("carries the dialling code the trigger shows", () => {
    const czechia = countryOptions("cs").pinned.find((option) => option.code === "CZ");
    expect(czechia?.callingCode).toBe("420");
  });

  it("falls back to the code rather than failing on a nonsense locale", () => {
    expect(countryOptions("not-a-locale").pinned[0]?.name).toBeTruthy();
  });
});
