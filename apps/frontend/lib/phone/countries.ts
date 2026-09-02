import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

import { PINNED_PHONE_COUNTRIES } from "./country";

/**
 * The country picker's contents.
 *
 * Names come from `Intl.DisplayNames` rather than the message catalogues: there
 * are 245 of them, they are already translated in every browser and in Node,
 * and adding 735 keys to `messages/{cs,en,de}.json` to say what ICU already
 * says would be a maintenance burden with no reader.
 */

/**
 * The flag as a pair of regional indicator symbols — the standard way to write
 * one, and the only way that needs no image.
 *
 * Windows renders these as the two letters instead of a flag, which is a
 * perfectly good fallback: the letters are the ISO code. The dialling code sits
 * beside it either way, so nothing depends on the flag being drawn.
 */
export function regionFlag(code: CountryCode): string {
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

export interface CountryOption {
  code: CountryCode;
  /** Without the `+`, as libphonenumber reports it. */
  callingCode: string;
  name: string;
}

export interface CountryOptions {
  /** The neighbours, in the order they are pinned. */
  pinned: CountryOption[];
  /** Everyone else, by name in the reader's own collation. */
  rest: CountryOption[];
}

/** Region names, falling back to the ISO code where ICU has none. */
function nameLookup(locale: string): (code: CountryCode) => string {
  if (typeof Intl.DisplayNames !== "function") return (code) => code;

  try {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return (code) => names.of(code) ?? code;
  } catch {
    // An unknown locale tag, which is not worth failing a form over.
    return (code) => code;
  }
}

export function countryOptions(locale: string): CountryOptions {
  const nameOf = nameLookup(locale);
  const collator = new Intl.Collator(locale);

  const option = (code: CountryCode): CountryOption => ({
    code,
    callingCode: getCountryCallingCode(code),
    name: nameOf(code),
  });

  const pinnedCodes: readonly string[] = PINNED_PHONE_COUNTRIES;

  return {
    pinned: PINNED_PHONE_COUNTRIES.map(option),
    rest: getCountries()
      .filter((code) => !pinnedCodes.includes(code))
      .map(option)
      // Alphabetical by the name actually on screen, which is a different order
      // in each language — and the only order a reader can scan.
      .sort((first, second) => collator.compare(first.name, second.name)),
  };
}
