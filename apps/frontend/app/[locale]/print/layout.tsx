import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

import "./print.css";

/**
 * The shell for documents meant to be printed.
 *
 * Deliberately bare: no navigation, no appearance toggle, nothing to press.
 * Everything rendered under here ends up on paper or in a PDF.
 *
 * It cannot escape the root layout, though, and the root layout renders the
 * cookie banner on every route. A `position: fixed` banner is repeated on every
 * printed page, so a four-page menu came out with four of them. That is dealt
 * with where it belongs — an `@media print` rule in `globals.css` — rather than
 * here, because no printed page from any route should carry it.
 *
 * **Why these routes exist at all.** A menu's style is CSS — theme tokens,
 * `next/font` faces, Tailwind utilities, a presentation recipe — so the honest
 * way to print one in its style is to let a browser lay it out. These pages are
 * what the headless renderer loads (`lib/pdf/render.ts`), and they are also
 * perfectly good to open by hand and print from the browser dialog.
 *
 * Dynamic for the same reason `/preview` is: one owner's private menu behind a
 * session, which is neither static nor cacheable.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } };
}

export default async function PrintLayout({ children, params }: LayoutProps<"/[locale]/print">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <>{children}</>;
}
