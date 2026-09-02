import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import metadata from "libphonenumber-js/metadata.min.json";

/**
 * Reading a phone number as it is typed, and working out which country it is in.
 *
 * Pure, and deliberately free of React: the interesting cases here are the ones
 * a person only hits once — pasting a German number into a Czech field, typing
 * `00420` out of habit, getting halfway through a dialling code — and they are
 * worth pinning in a unit test rather than discovering in a browser.
 *
 * The formatting engine is libphonenumber. Whether a number is *acceptable* is
 * still decided by `lib/api/phone.ts`, which mirrors the API's rule: this module
 * has an opinion about grouping and country, never about validity.
 */

export const DEFAULT_PHONE_COUNTRY: CountryCode = "CZ";

/**
 * The countries a Czech restaurant plausibly publishes a number in, kept at the
 * top of the list so the common case is one glance rather than a scroll. Every
 * other country is still there, just below them.
 */
export const PINNED_PHONE_COUNTRIES = [
  "CZ",
  "SK",
  "AT",
  "DE",
  "PL",
] as const satisfies readonly CountryCode[];

/**
 * The country a shared dialling code belongs to first.
 *
 * `+1` is the United States before Antigua and `+44` is the United Kingdom
 * before Guernsey, which is not what iterating the country list alphabetically
 * would tell you. libphonenumber's own metadata records the main country first,
 * so this reads that rather than guessing — and it is the same metadata the
 * library already loaded, so it costs nothing.
 */
export function mainCountryFor(callingCode: string): CountryCode | undefined {
  const countries = (metadata.country_calling_codes as Record<string, string[]>)[callingCode];
  const first = countries?.[0];
  return first !== undefined && isSupportedCountry(first) ? first : undefined;
}

export type Detection =
  /** No dialling code in sight: the digits belong to the country on screen. */
  | { kind: "national"; digits: string }
  /**
   * A `+` or an international prefix, but not yet enough to name a country —
   * `+4` could still become +40, +41, +420 or +49.
   */
  | { kind: "partial"; raw: string }
  /** A dialling code was typed; `digits` is what remains once it is removed. */
  | { kind: "international"; country: CountryCode; callingCode: string; digits: string };

/**
 * What the owner has typed so far, and where it says the number is.
 *
 * `current` is the country the picker is showing. It matters twice: it supplies
 * the international prefix, so `00420…` is recognised the way someone dialling
 * from Czechia would write it, and it is what a plain national number is read
 * against.
 */
export function detectCountry(raw: string, current: CountryCode): Detection {
  const input = raw.trim();

  const formatter = new AsYouType(current);
  formatter.input(input);

  if (!formatter.isInternational()) {
    return { kind: "national", digits: input.replace(/\D/g, "") };
  }

  const callingCode = formatter.getCallingCode();
  if (callingCode === undefined) return { kind: "partial", raw: input };

  // `getCountry` is undefined until the digits distinguish one country sharing
  // this code from another, so a `+1` number is American until it says
  // otherwise. Falling back to `current` covers the case where the metadata has
  // no main country at all.
  const country = formatter.getCountry() ?? mainCountryFor(callingCode) ?? current;

  return {
    kind: "international",
    country,
    callingCode,
    digits: formatter.getNationalNumber(),
  };
}

/** The national part, grouped the way the country itself groups it. */
export function formatNational(country: CountryCode, digits: string): string {
  return digits === "" ? "" : new AsYouType(country).input(digits);
}

/**
 * The stored number: dialling code, a space, then the national part.
 *
 * Not E.164. A guest reads this off a printed menu, where
 * `+420 601 234 567` is meaningfully easier than `+420601234567` — and the API
 * preserves the owner's grouping for that same reason.
 */
export function composePhone(country: CountryCode, digits: string): string {
  return digits === "" ? "" : `+${getCountryCallingCode(country)} ${formatNational(country, digits)}`.trim();
}

export interface PhoneParts {
  country: CountryCode;
  national: string;
}

/**
 * Splits a stored number back into the two controls, for any country.
 *
 * Three tiers, because a stored value can be complete, partial, or older than
 * this field: the strict parser first, then the as-you-type reading for a
 * number too short to parse, and finally the raw text under the default
 * country — so a value typed before this component existed stays editable
 * rather than being silently dropped.
 */
export function splitPhone(value: string): PhoneParts {
  if (value.trim() === "") return { country: DEFAULT_PHONE_COUNTRY, national: "" };

  const parsed = parsePhoneNumberFromString(value, DEFAULT_PHONE_COUNTRY);
  if (parsed) {
    const country =
      parsed.country ??
      mainCountryFor(parsed.countryCallingCode) ??
      DEFAULT_PHONE_COUNTRY;
    return { country, national: formatNational(country, parsed.nationalNumber) };
  }

  const detected = detectCountry(value, DEFAULT_PHONE_COUNTRY);
  if (detected.kind === "international") {
    return {
      country: detected.country,
      national: formatNational(detected.country, detected.digits),
    };
  }

  return { country: DEFAULT_PHONE_COUNTRY, national: value };
}
