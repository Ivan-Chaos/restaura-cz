import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { routing } from "@/i18n/routing";
import { saveProfileAction } from "@/lib/api/actions/auth";
import { requireProfile } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workspace/settings/profile">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: t("profileMetaTitle"), robots: { index: false, follow: false } };
}

export default async function ProfileSettingsPage({
  params,
}: PageProps<"/[locale]/workspace/settings/profile">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The shell's gate has already run; this reads the same memoised session for
  // the values to prefill, at no extra request.
  const { profile } = await requireProfile(locale);

  return <ProfileSettingsForm profile={profile} action={saveProfileAction} locale={locale} />;
}
