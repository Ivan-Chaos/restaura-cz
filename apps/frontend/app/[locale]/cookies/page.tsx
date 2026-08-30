import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { routing } from "@/i18n/routing";
import { getLegalDocument } from "@/lib/legal/documents";

const DOCUMENT = getLegalDocument("cookies");

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cookies">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Legal.cookies.meta" });
  return {
    title: t("title"),
    description: t("description"),
    // Legal pages are for people who came looking; they add nothing to a
    // search result and should not compete with the pages that do.
    robots: { index: false, follow: true },
  };
}

export default async function CookiesPage({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <LegalDocument document={DOCUMENT} />;
}
