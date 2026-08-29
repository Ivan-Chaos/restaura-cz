"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lets a guest read the menu in their own language.
 *
 * All three languages are shown at once rather than hidden behind a dropdown.
 * With only three, that is one tap instead of two for a guest holding a phone
 * at a table — and it keeps the guest menu free of the Select primitive, which
 * costs 27 KB gzipped in the shared bundle and would be loaded by every route
 * for a control most guests never touch. `LanguageSelect` is the compact
 * dropdown for dense admin screens, in its own module so only those screens pay
 * for it.
 *
 * Navigation goes through `@/i18n/navigation`, never `next/navigation`, so the
 * locale prefix is rewritten correctly and the guest stays on the same dish
 * rather than being sent back to the top of the menu.
 */
export interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div
      data-slot="language-switcher"
      // Wraps rather than overflowing: three language names at a 200% system
      // font size are wider than a 320px phone.
      className={cn("flex flex-wrap items-center gap-1", className)}
      role="group"
      aria-label={t("label")}
    >
      {routing.locales.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={value === locale ? "secondary" : "ghost"}
          // `aria-current` is what tells a screen-reader user which language is
          // active; the filled variant alone would not.
          aria-current={value === locale ? "true" : undefined}
          disabled={isPending}
          onClick={() => change(value)}
        >
          {localeNames[value]}
        </Button>
      ))}
    </div>
  );
}
