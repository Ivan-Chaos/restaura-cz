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
import { getSession } from "@/lib/api/session";
import { planOf } from "@/lib/plans/entitlements";

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
 * It now names the account's actual plan rather than a constant: the API
 * carries one on every account (feature 007), and an owner whose downloads have
 * stopped carrying the Restaura line should be able to see why. Changing a plan
 * is still not possible here — billing is not built — so this remains the place
 * billing will live, with the one fact that already exists shown honestly.
 */
export default async function SubscriptionSettingsPage({
  params,
}: PageProps<"/[locale]/workspace/settings/subscription">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Settings.subscriptionTab" });
  const tPlans = await getTranslations({ locale, namespace: "Landing.plans" });

  const session = await getSession();
  const plan = planOf(session?.account);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{tPlans(`${plan}.name`)}</CardTitle>
          <Badge variant="secondary">{t("statusActive")}</Badge>
        </div>
        <CardDescription>{tPlans(`${plan}.tagline`)}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
      </CardContent>
    </Card>
  );
}
