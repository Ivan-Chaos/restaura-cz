import { defineRouting } from "next-intl/routing";

export const locales = ["cs", "en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "cs";

export const localeNames: Record<Locale, string> = {
  cs: "Čeština",
  en: "English",
  de: "Deutsch",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries a locale prefix: /cs/..., /en/..., /de/...
  localePrefix: "always",
  // Remember the visitor's choice; used when redirecting from "/"
  localeCookie: { name: "NEXT_LOCALE" },
});
