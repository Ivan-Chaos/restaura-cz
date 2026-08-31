import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Settings has no content of its own — it is a set of tabs, and the first one
 * is the profile. A redirect rather than a duplicate page keeps one address per
 * tab, which is what makes them linkable.
 */
export default async function SettingsPage({
  params,
}: PageProps<"/[locale]/workspace/settings">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  redirect({ href: "/workspace/settings/profile", locale });
}
