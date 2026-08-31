import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GuestMenu } from "@/components/menu/GuestMenu";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { routing } from "@/i18n/routing";
import { apiGet } from "@/lib/api/client";
import type { PublicMenuResponse } from "@/lib/api/types";
import { DEFAULT_THEME } from "@/lib/design-system/themes";
import { toDisplayMenu } from "@/lib/menu-display/adapter";

/**
 * A published menu, for a guest with no account.
 *
 * **Rendered dynamically on purpose.** Unpublishing must take effect on the
 * very next request, and a saved edit must be visible immediately, so this page
 * cannot be statically rendered or time-revalidated — either would serve a menu
 * the restaurant has already taken down. The cost is small: one bounded JSON
 * fetch and a Server Component tree with almost no client JavaScript. If load
 * ever demands caching, the upgrade is tag-based revalidation on
 * publish/unpublish/save, not a time window.
 */
export const dynamic = "force-dynamic";

async function fetchMenu(slug: string) {
  const result = await apiGet<PublicMenuResponse>(
    `/public/menus/${encodeURIComponent(slug)}`,
  );
  return result.ok ? result.data.menu : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/m/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const menu = await fetchMenu(slug);
  const t = await getTranslations({ locale, namespace: "PublicMenu" });

  if (!menu) {
    return { title: { absolute: t("notAvailableTitle") }, robots: { index: false } };
  }

  return {
    // Absolute: a restaurant's own menu is not ours to brand with "| Restaura".
    title: { absolute: menu.name },
    description: t("metaDescription", { name: menu.name }),
  };
}

export default async function PublicMenuPage({ params }: PageProps<"/[locale]/m/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const menu = await fetchMenu(slug);
  // A draft menu and an address that never existed are the same answer here, so
  // the page cannot be used to discover which menus exist.
  if (!menu) notFound();

  return (
    <ThemeScope theme={DEFAULT_THEME.id}>
      <GuestMenu menu={toDisplayMenu(menu)} />
    </ThemeScope>
  );
}
