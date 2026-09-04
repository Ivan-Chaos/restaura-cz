import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GuestMenu } from "@/components/menu/GuestMenu";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { PreviewBar } from "@/components/workspace/PreviewBar";
import { routing } from "@/i18n/routing";
import { getMenu, setVisualVariantAction } from "@/lib/api/actions/menus";
import { requireProfile } from "@/lib/api/session";
import { toDisplayMenu } from "@/lib/menu-display/adapter";
import { presentationForTheme } from "@/lib/menu-display/presentation";
import { isVisualVariant, themeForVariant } from "@/lib/menu-display/variants";

/**
 * An owner's own menu, rendered in a style they have not (yet) chosen.
 *
 * **Why this is not under `/workspace`.** The dashboard layout wraps everything
 * in the shell and pins it to the light appearance. A preview has to be what a
 * guest would see: full-bleed, in the guest's own light or dark, with the
 * theme's ambient field spanning the page. So this route lives beside `/m` and
 * carries the profile gate itself — the one exception to "pages under
 * `/workspace` do not repeat the check", and it is here because the page is
 * not under `/workspace`.
 *
 * **Why it renders `GuestMenu`.** The preview reuses the guest composition and
 * the same adapter, so it cannot drift from what guests get. `MenuDetail`
 * carries everything the menu itself has; the restaurant's name and logo come
 * from the profile this page already loads, which is where the public endpoint
 * gets them too (feature 006).
 *
 * Dynamic for the same reason the editor is: one owner's draft behind a
 * session. `noindex`: it is nobody's page but the owner's.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/preview/[menuId]/[variant]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Preview" });
  return { title: { absolute: t("metaTitle") }, robots: { index: false, follow: false } };
}

export default async function PreviewPage({
  params,
}: PageProps<"/[locale]/preview/[menuId]/[variant]">) {
  const { locale, menuId, variant } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { profile } = await requireProfile(locale);

  // A style the catalogue does not know is an address that does not exist.
  if (!isVisualVariant(variant)) notFound();

  const result = await getMenu(menuId);
  if (!result.ok) notFound();
  const { menu } = result.data;

  const tVariants = await getTranslations({ locale, namespace: "VisualVariants" });
  const themeId = themeForVariant(variant);

  return (
    <ThemeScope
      theme={themeId}
      className="ambient bg-background text-foreground flex min-h-svh flex-1 flex-col"
    >
      <PreviewBar
        locale={locale}
        menuId={menu.id}
        variantId={variant}
        styleName={tVariants(`${variant}.name`)}
        isCurrent={menu.visualVariant === variant}
        action={setVisualVariantAction}
      />
      <GuestMenu
        menu={toDisplayMenu({
          ...menu,
          restaurantName: profile.restaurantName,
          logo: profile.logo,
        })}
        presentation={presentationForTheme(themeId)}
      />
    </ThemeScope>
  );
}
