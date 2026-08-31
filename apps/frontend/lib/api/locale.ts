import { hasLocale } from "next-intl";

import { routing, type Locale } from "@/i18n/routing";

/**
 * Server Actions receive the locale through a hidden form field, which arrives
 * as untyped form data. Anything unrecognised falls back to the default rather
 * than redirecting the visitor to a URL that does not exist.
 */
export function toLocale(value: FormDataEntryValue | null | undefined): Locale {
  const candidate = typeof value === "string" ? value : "";
  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}
