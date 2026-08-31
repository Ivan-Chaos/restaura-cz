import { describe, expect, it } from "vitest";

import { collectPhones, isValidPhone, normalizePhone } from "@/lib/api/phone";

/**
 * The same accept/reject matrix as the API's `src/common/validators.spec.ts`.
 * If one side loosens or tightens its rule, the other's suite is where it shows
 * up — which is the point of keeping both.
 */
describe("isValidPhone", () => {
  it.each([
    ["international with spaces", "+420 601 234 567"],
    ["international without spaces", "+420601234567"],
    ["national with spaces", "601 234 567"],
    ["grouped with dashes", "601-234-567"],
    ["grouped with parentheses", "(02) 1234 5678"],
    ["surrounding whitespace is trimmed", "  +420 601 234 567  "],
    ["shortest accepted", "123456"],
    ["longest accepted", "+123456789012345"],
  ])("accepts %s", (_label, value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["letters", "call me"],
    ["letters mixed in", "+420 601 ABC 567"],
    ["too few digits", "12345"],
    ["too many digits", "+1234567890123456"],
    ["a plus in the middle", "601+234567"],
    ["an email address", "owner@example.com"],
  ])("rejects %s", (_label, value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("trims the ends without regrouping the digits", () => {
    expect(normalizePhone("  +420 601 234 567 ")).toBe("+420 601 234 567");
  });

  it("collapses runs of whitespace to a single space", () => {
    expect(normalizePhone("+420   601\t234  567")).toBe("+420 601 234 567");
  });
});

describe("collectPhones", () => {
  it("drops the blank rows an unused input leaves behind", () => {
    expect(collectPhones([" 601 234 567 ", "", "   "])).toEqual(["601 234 567"]);
  });

  it("keeps the owner's order", () => {
    expect(collectPhones(["601 111 222", "601 333 444"])).toEqual([
      "601 111 222",
      "601 333 444",
    ]);
  });

  it("returns nothing when every row is blank", () => {
    expect(collectPhones(["", "  "])).toEqual([]);
  });
});
