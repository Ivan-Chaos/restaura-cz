"use client";

import { useMemo, useState } from "react";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { useLocale, useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { composePhone, detectCountry, formatNational, splitPhone } from "@/lib/phone/country";
import { countryOptions, regionFlag, type CountryOption } from "@/lib/phone/countries";
import { cn } from "@/lib/utils";

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
 * every caller. Visually they are one control, because that is what they are.
 *
 * **Typing a dialling code moves the picker.** Paste `+49 30 123456` into a
 * field that says Czechia and it becomes a German number: the code is taken off
 * the front and the picker follows. That is the one thing people reliably try,
 * and it used to produce `+420 49 301 234 56` — a number that exists nowhere.
 * `lib/phone/country.ts` is where that reading lives, and where its odd cases
 * are pinned.
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
  const locale = useLocale();

  const { pinned, rest } = useMemo(() => countryOptions(locale), [locale]);

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
  const [state, setState] = useState(() => ({ ...splitPhone(value), lastEmitted: value }));

  if (value !== state.lastEmitted) {
    setState({ ...splitPhone(value), lastEmitted: value });
  }

  const { country, national } = state;

  function emit(nextCountry: CountryCode, typed: string) {
    const detected = detectCountry(typed, nextCountry);

    if (detected.kind === "partial") {
      // A `+` with nothing conclusive after it. Showing exactly what was typed
      // is the only honest thing to do: guessing a country from `+4` would move
      // the picker under the owner's hands and reformat mid-word.
      setState({ country: nextCountry, national: detected.raw, lastEmitted: detected.raw });
      onChange(detected.raw);
      return;
    }

    const resolved = detected.kind === "international" ? detected.country : nextCountry;
    write(resolved, detected.digits);
  }

  /**
   * The picker, used directly.
   *
   * A choice made here wins outright, which the typing path cannot guarantee:
   * with a half-typed code still in the field, re-reading the text would answer
   * `+1` with the United States however the owner had just answered it. The
   * stray prefix goes, because the picker is now the thing saying `+1`.
   */
  function chooseCountry(nextCountry: CountryCode) {
    const detected = detectCountry(national, country);
    write(nextCountry, detected.kind === "partial" ? "" : detected.digits);
  }

  /** Both paths end here: one country, one set of digits, one stored string. */
  function write(nextCountry: CountryCode, digits: string) {
    const emitted = composePhone(nextCountry, digits);

    setState({
      country: nextCountry,
      national: formatNational(nextCountry, digits),
      lastEmitted: emitted,
    });
    onChange(emitted);
  }

  const option = (entry: CountryOption) => (
    <SelectItem key={entry.code} value={entry.code} label={entry.name}>
      <span aria-hidden="true">{regionFlag(entry.code)}</span>
      <span className="flex-1">{entry.name}</span>
      <span className="text-muted-foreground">+{entry.callingCode}</span>
    </SelectItem>
  );

  return (
    <div
      className={cn(
        // One bordered control holding both halves, so the dialling code reads
        // as part of the number rather than as a separate question.
        "border-input focus-within:border-ring focus-within:ring-ring/50 flex items-stretch rounded-lg border transition-colors focus-within:ring-3",
        className,
      )}
    >
      <Select
        value={country}
        onValueChange={(next) => chooseCountry(next as CountryCode)}
      >
        <SelectTrigger
          className="border-input h-auto shrink-0 rounded-none rounded-l-lg border-0 border-r focus-visible:ring-0"
          aria-label={t("phoneCountryLabel")}
        >
          {/*
            The flag and the code only. The country's name is left to the popup:
            it comes from ICU, whose data can differ between the server and the
            browser, and a name rendered here would be a hydration mismatch
            waiting for a version bump.
          */}
          <SelectValue>
            {(selected) => (
              <>
                <span aria-hidden="true">{regionFlag(selected as CountryCode)}</span>
                <span>+{getCountryCallingCode(selected as CountryCode)}</span>
              </>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("phoneCountriesNearby")}</SelectLabel>
            {pinned.map(option)}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{t("phoneCountriesAll")}</SelectLabel>
            {rest.map(option)}
          </SelectGroup>
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
        className="flex-1 rounded-none rounded-r-lg border-0 shadow-none focus-visible:ring-0"
        {...aria}
      />
    </div>
  );
}
