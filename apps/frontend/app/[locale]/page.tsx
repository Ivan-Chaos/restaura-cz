import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Landing } from "@/components/landing/Landing";
import { routing } from "@/i18n/routing";
import { assetSrc, getAsset } from "@/lib/landing/assets";

/**
 * The marketing landing page — the site's front door, and for most restaurant
 * owners the only page they will read before deciding.
 *
 * Fully static: no `searchParams`, no `headers()`, nothing that would opt the
 * page into request-time rendering. The one filesystem read happens during
 * prerendering, not per request.
 */

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Landing" });
  const og = getAsset("og");

  return {
    // Absolute: this title already carries the brand, and "Restaura — your
    // menu, on every table | Restaura" is not a sentence anyone wrote.
    title: { absolute: t("meta.title") },
    description: t("meta.description"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
      // Next replaces `openGraph` wholesale rather than merging it, so the
      // layout's siteName has to be restated here or the link preview loses it.
      siteName: t("brand.name"),
      type: "website",
      locale,
      images: [
        {
          url: assetSrc(og),
          width: og.width,
          height: og.height,
          alt: t("assets.og.alt"),
        },
      ],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((value) => [value, `/${value}`]),
      ),
    },
  };
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Keeps the page statically rendered for this locale.
  setRequestLocale(locale);

  // The clip streams from our bucket, so it is always available to offer.
  // Whether a given visitor is offered it at all is `HeroVideo`'s decision,
  // and it is made in the browser, where the answer actually lives.
  return <Landing heroClip={getAsset("heroClip")} />;
}
