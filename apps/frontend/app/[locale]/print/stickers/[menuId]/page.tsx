import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { StickerSheet } from "@/components/print/StickerSheet";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { routing } from "@/i18n/routing";
import { getMenu } from "@/lib/api/actions/menus";
import { requireProfile } from "@/lib/api/session";
import { toImageModel } from "@/lib/menu-display/adapter";
import { themeForVariant } from "@/lib/menu-display/variants";
import { planOf, resolveBranding } from "@/lib/plans/entitlements";
import { parseStickerOptions } from "@/lib/validation/print";

/**
 * A printable sheet of table QR stickers for one published menu.
 *
 * Published is the precondition, not a preference: a QR code has to lead
 * somewhere, and an unpublished menu has no public address to lead to. A draft
 * therefore answers 404 here, the same as a menu that does not exist.
 *
 * Styled like the menu it points at, so a table's sticker and the page it opens
 * are recognisably the same restaurant — with the one exception of the code
 * itself, which is always dark-on-light because a camera has no taste.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/print/stickers/[menuId]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Print" });
  return {
    title: { absolute: t("metaTitle.stickers") },
    robots: { index: false, follow: false },
  };
}

export default async function PrintStickersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/print/stickers/[menuId]">) {
  const { locale, menuId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { account, profile } = await requireProfile(locale);

  const result = await getMenu(menuId);
  if (!result.ok) notFound();
  const { menu } = result.data;

  if (menu.status !== "published" || !menu.publicSlug) notFound();

  const search = await searchParams;
  const options = parseStickerOptions(
    new URLSearchParams(
      Object.entries(search).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value] as [string, string]] : [],
      ),
    ),
  );
  if (!options.ok) notFound();

  const showBranding = resolveBranding(planOf(account), options.value.branding);
  const themeId = themeForVariant(menu.visualVariant);
  const t = await getTranslations({ locale, namespace: "Print" });

  return (
    <ThemeScope theme={themeId} className="bg-background text-foreground">
      <StickerSheet
        count={options.value.count}
        perPage={options.value.perPage}
        locale={options.value.locale}
        slug={menu.publicSlug}
        restaurantName={profile.restaurantName}
        logo={toImageModel(profile.logo, profile.restaurantName)}
        prompt={t("scanPrompt")}
        tableLabel={(tableNumber) => t("table", { number: tableNumber })}
        showBranding={showBranding}
      />
    </ThemeScope>
  );
}
