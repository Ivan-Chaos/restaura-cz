import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * The dashboard has no home of its own yet, so its front door is the menus
 * section. Kept as a redirect rather than moved: `/workspace` is the address
 * every existing bookmark and every sign-in redirect already points at.
 */
export default async function WorkspacePage({ params }: PageProps<"/[locale]/workspace">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  redirect({ href: "/workspace/menus", locale });
}
