import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SampleMenu } from "@/components/menu/SampleMenu";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { getSampleMenu } from "@/lib/design-system/fixtures/sample-menu";
import { DEFAULT_THEME, THEME_IDS, isThemeId } from "@/lib/design-system/themes";
import { routing } from "@/i18n/routing";

/**
 * The sample menu — a complete guest experience assembled only from the design
 * system, and the surface the end-to-end tests and performance budgets measure.
 *
 * **Why the theme is a route segment, not a search param.** Next 16 treats
 * `searchParams` as a request-time API: touching it opts the whole page into
 * dynamic rendering, which would break the static-rendering requirement this
 * page exists to demonstrate. As an optional catch-all segment every
 * theme variant is prerendered at build time instead, and Playwright still gets
 * a real URL per theme.
 *
 *   /cs/sample-menu          → default (warm)
 *   /cs/sample-menu/slate    → scoped slate
 */

/** Reject any theme we did not prerender rather than rendering it unstyled. */
export const dynamicParams = false;

export function generateStaticParams() {
  // The parent `[locale]` segment supplies the locale; this fans out per theme.
  return [{ theme: [] as string[] }, ...THEME_IDS.map((id) => ({ theme: [id] }))];
}

function resolveTheme(segments: string[] | undefined) {
  const [first] = segments ?? [];
  if (first === undefined) return DEFAULT_THEME.id;
  return isThemeId(first) ? first : undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sample-menu/[[...theme]]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "SampleMenu" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SampleMenuPage({
  params,
}: PageProps<"/[locale]/sample-menu/[[...theme]]">) {
  const { locale, theme } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Keeps the page statically rendered for this locale.
  setRequestLocale(locale);

  const themeId = resolveTheme(theme);
  if (themeId === undefined) notFound();

  const t = await getTranslations({ locale, namespace: "SampleMenu" });
  const menu = getSampleMenu(t);

  return (
    <ThemeScope theme={themeId}>
      <SampleMenu menu={menu} />
    </ThemeScope>
  );
}
