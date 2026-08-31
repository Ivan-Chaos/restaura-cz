import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workspace/settings/subscription">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: t("subscriptionMetaTitle"), robots: { index: false, follow: false } };
}

/**
 * The subscription tab, read-only by design.
 *
 * Every account is on the same early-access plan, so there is nothing yet to
 * fetch and nothing to change — inventing an endpoint or a table to serve one
 * constant would be building for a feature that has not been specified. What
 * the tab does deliver now is the place billing will live, so owners learn
 * where to look before there is anything to look at.
 */
export default async function SubscriptionSettingsPage({
  params,
}: PageProps<"/[locale]/workspace/settings/subscription">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Settings.subscriptionTab" });

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("planName")}</CardTitle>
          <Badge variant="secondary">{t("statusActive")}</Badge>
        </div>
        <CardDescription>{t("planDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
      </CardContent>
    </Card>
  );
}
