"use client";

import { useState } from "react";
import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The countries a Czech restaurant plausibly publishes a number in, with the
 * home country first. Deliberately short: a list of every country on earth is a
 * scrolling exercise for a field that is nearly always +420.
 */
export const PHONE_COUNTRIES = ["CZ", "SK", "AT", "DE", "PL"] as const satisfies readonly CountryCode[];

export type PhoneCountry = (typeof PHONE_COUNTRIES)[number];

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = "CZ";

export interface PhoneInputProps {
  /** The stored value, e.g. `+420 601 234 567`. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Posted directly by the browser when client JavaScript never loads. */
  name?: string;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: true | undefined;
  "aria-describedby"?: string;
  className?: string;
}

/**
 * A phone number, formatted as it is typed.
 *
 * Two controls, one value: a country picker that owns the dialling code and a
 * text field that owns the rest. They are kept together rather than split into
 * two form fields because the stored value is one string — the number as it
 * will be printed on a menu — and splitting it would mean reassembling it in
 * every caller.
 *
 * Formatting uses libphonenumber's `AsYouType`, so the grouping matches the
 * selected country's own convention instead of a fixed mask that would be wrong
 * everywhere but Czechia. Digits are all the owner types; the spaces appear
 * under them.
 *
 * The value stays a formatted string rather than becoming E.164. Guests read
 * this number off a printed menu, and `+420601234567` is meaningfully harder to
 * read than `+420 601 234 567` — the API preserves the owner's grouping for the
 * same reason.
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  name,
  id,
  className,
  ...aria
}: PhoneInputProps) {
  const t = useTranslations("Registration");

  /**
   * The two controls are held here rather than re-derived from `value` on every
   * keystroke, because a half-typed number does not survive the round trip:
   * `+420 6` parses as nothing, and re-deriving would put the dial code into
   * the text field and grow it with every character.
   *
   * `lastEmitted` is how an incoming value that did *not* come from this
   * component — the stored profile arriving in settings, or a reset — is still
   * picked up.
   */
  const [state, setState] = useState(() => ({ ...split(value), lastEmitted: value }));

  if (value !== state.lastEmitted) {
    setState({ ...split(value), lastEmitted: value });
  }

  const { country, national } = state;

  function emit(nextCountry: PhoneCountry, nextNational: string) {
    const digits = nextNational.replace(/[^\d]/g, "");

    if (digits === "") {
      // An empty row is an unused input, not a number with a country code.
      setState({ country: nextCountry, national: "", lastEmitted: "" });
      onChange("");
      return;
    }

    // Formatted from the digits alone, so deleting a separator deletes the
    // digit beside it rather than being silently re-added.
    const formatted = new AsYouType(nextCountry).input(digits);
    const emitted = `+${getCountryCallingCode(nextCountry)} ${formatted}`.trim();

    setState({ country: nextCountry, national: formatted, lastEmitted: emitted });
    onChange(emitted);
  }

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Select
        value={country}
        onValueChange={(next) => emit(next as PhoneCountry, national)}
      >
        <SelectTrigger
          className="h-9 shrink-0"
          aria-label={t("phoneCountryLabel")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHONE_COUNTRIES.map((code) => (
            <SelectItem key={code} value={code}>
              {t(`phoneCountries.${code}` as "phoneCountries.CZ")} +
              {getCountryCallingCode(code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        onChange={(event) => emit(country, event.target.value)}
        onBlur={onBlur}
        placeholder={t("phonePlaceholder")}
        className="flex-1"
        {...aria}
      />
    </div>
  );
}

/**
 * Splits a stored number back into the two controls.
 *
 * Falls back to the default country and the raw text for anything unparseable,
 * so a value typed before this component existed — or pasted in an unexpected
 * shape — is still editable rather than silently dropped.
 */
function split(value: string): { country: PhoneCountry; national: string } {
  if (value.trim() === "") return { country: DEFAULT_PHONE_COUNTRY, national: "" };

  const parsed = parsePhoneNumberFromString(value, DEFAULT_PHONE_COUNTRY);
  const country = parsed?.country;

  if (parsed && country && (PHONE_COUNTRIES as readonly string[]).includes(country)) {
    return {
      country: country as PhoneCountry,
      national: new AsYouType(country as PhoneCountry).input(parsed.nationalNumber),
    };
  }

  return { country: DEFAULT_PHONE_COUNTRY, national: value };
}
