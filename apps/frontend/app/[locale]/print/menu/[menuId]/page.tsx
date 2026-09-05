import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PrintMenu } from "@/components/print/PrintMenu";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { routing } from "@/i18n/routing";
import { getMenu } from "@/lib/api/actions/menus";
import { requireProfile } from "@/lib/api/session";
import { toDisplayMenu, visibleItemCount } from "@/lib/menu-display/adapter";
import { presentationForTheme } from "@/lib/menu-display/presentation";
import { themeForVariant } from "@/lib/menu-display/variants";
import { planOf, resolveBranding } from "@/lib/plans/entitlements";
import { parseBranding } from "@/lib/validation/print";

/**
 * An owner's menu, laid out for paper.
 *
 * **Why it is outside `/workspace`.** The dashboard shell pins everything to a
 * light chrome, adds a sidebar, and is not something to print. This page has to
 * be the document and nothing else, so it lives beside `/preview` and carries
 * the profile gate itself — the same exception, for the same reason.
 *
 * **Why it renders the guest composition.** `PrintMenu` builds from the same
 * parts, the same adapter and the same presentation recipe the public page
 * uses, so the printed lístek cannot drift from the one on a guest's phone.
 *
 * The renderer loads this page to produce the PDF; an owner may also open it
 * and print from the browser. Either way the branding decision is made here,
 * from the account's plan, so the query parameter is a request and never an
 * authority (spec 007 FR-017).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/print/menu/[menuId]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Print" });
  return { title: { absolute: t("metaTitle.menu") }, robots: { index: false, follow: false } };
}

export default async function PrintMenuPage({
  params,
  searchParams,
}: PageProps<"/[locale]/print/menu/[menuId]">) {
  const { locale, menuId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { account, profile } = await requireProfile(locale);

  const result = await getMenu(menuId);
  if (!result.ok) notFound();
  const { menu } = result.data;

  // Nothing to print is not an error page's job to explain — the editor
  // disables the download and says why. Here it is simply not a document.
  if (visibleItemCount(menu.sections) === 0) notFound();

  const { branding } = await searchParams;
  const showBranding = resolveBranding(
    planOf(account),
    parseBranding(typeof branding === "string" ? branding : undefined),
  );

  const themeId = themeForVariant(menu.visualVariant);

  return (
    <ThemeScope theme={themeId} className="bg-background text-foreground">
      <PrintMenu
        menu={toDisplayMenu({
          ...menu,
          restaurantName: profile.restaurantName,
          logo: profile.logo,
        })}
        presentation={presentationForTheme(themeId)}
        showBranding={showBranding}
        restaurantName={profile.restaurantName}
      />
    </ThemeScope>
  );
}
