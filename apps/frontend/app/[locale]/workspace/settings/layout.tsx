import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { routing } from "@/i18n/routing";

/**
 * Settings' own chrome: the heading and the tab bar, shared by every tab.
 *
 * The tabs are child routes, so this layout persists while they swap — which is
 * exactly the behaviour a tab strip should have, and it comes for free from the
 * router rather than from state.
 */
export default async function SettingsLayout({
  children,
  params,
}: LayoutProps<"/[locale]/workspace/settings">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Settings" });

  // A div, not a main: the shell's SidebarInset is already this page's main
  // landmark, and nesting a second one inside it is invalid.
  return (
    <div className="flex-1 py-8">
      <Container size="lg" className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </header>

        <SettingsTabs />

        {children}
      </Container>
    </div>
  );
}
