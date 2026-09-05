import type { Locale } from "@/i18n/routing";

/**
 * What a table sticker's QR code encodes.
 *
 * The menu's ordinary public address, plus the table's number as a query
 * parameter. The guest page does not read `table` and does not change because
 * of it — an unknown search parameter is simply ignored, and the page is
 * dynamic, so it is not even a cache key. It is carried because the number is
 * genuinely known at the moment the sticker is printed and would be impossible
 * to recover later: a future ordering or table-service feature can read it
 * without anyone reprinting a single sticker.
 */

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function publicMenuUrl(locale: Locale, slug: string, table: number): string {
  return `${siteOrigin()}/${locale}/m/${encodeURIComponent(slug)}?table=${table}`;
}
