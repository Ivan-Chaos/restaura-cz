import { useTranslations } from "next-intl";

import { STORAGE_INVENTORY } from "@/lib/legal/cookies";

/**
 * Every key this site writes to a visitor's device, from the one list that also
 * drives the tests.
 *
 * Names and lifetimes are technical values and stay untranslated — a cookie is
 * called `NEXT_LOCALE` in every language. Purposes are prose, so they come from
 * the catalogues.
 */
export function CookieTable() {
  const t = useTranslations("Legal.cookies");

  return (
    // Tables are the one place a narrow screen genuinely needs to scroll, so it
    // scrolls inside its own box rather than making the whole page slide.
    //
    // A scrollable box is useless to someone who cannot reach it: without a tab
    // stop, a keyboard-only reader can never see the columns that are off the
    // edge (WCAG 2.1.1). `tabIndex={0}` gives it one, and the label is what
    // makes that stop mean something when it is announced.
    <div
      role="region"
      aria-label={t("table.caption")}
      tabIndex={0}
      className="border-border focus-visible:ring-ring overflow-x-auto rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
    >
      <table className="w-full min-w-xl border-collapse text-sm">
        <caption className="sr-only">{t("table.caption")}</caption>
        <thead>
          <tr className="bg-muted text-left">
            <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
              {t("table.name")}
            </th>
            <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
              {t("table.purpose")}
            </th>
            <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
              {t("table.type")}
            </th>
            <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
              {t("table.duration")}
            </th>
            <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
              {t("table.category")}
            </th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_INVENTORY.map((entry) => (
            <tr key={entry.name} className="border-border border-t">
              <th scope="row" className="px-4 py-3 text-left font-mono font-normal whitespace-nowrap">
                {entry.name}
              </th>
              <td className="text-muted-foreground min-w-64 px-4 py-3 leading-relaxed">
                {t(`entries.${entry.purposeKey}`)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {entry.mechanism === "cookie" ? "Cookie" : "localStorage"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {entry.duration === "session"
                  ? t("durations.session")
                  : t("durations.persistent")}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{t(`categories.${entry.category}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
