"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The compact language control, for dense screens (staff tools, toolbars) where
 * a row of buttons costs more space than it is worth.
 *
 * Deliberately a separate module from `LanguageSwitcher`: the Select primitive
 * is 27 KB gzipped, and putting both variants in one file would pull it into
 * the shared bundle of every route — including the guest menu, which does not
 * use it. Splitting keeps that cost with the screens that ask for it.
 */
export interface LanguageSelectProps {
  className?: string;
}

export function LanguageSelect({ className }: LanguageSelectProps) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={locale}
      // `items` gives the trigger a label for the current value before the
      // popup has ever opened; without it the raw locale code shows first.
      items={routing.locales.map((value) => ({
        value,
        label: localeNames[value],
      }))}
      onValueChange={(value) => {
        const next = value as Locale;
        if (next === locale) return;
        startTransition(() => {
          router.replace(pathname, { locale: next });
        });
      }}
      disabled={isPending}
    >
      <SelectTrigger size="sm" aria-label={t("label")} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((value) => (
          <SelectItem key={value} value={value}>
            {localeNames[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
