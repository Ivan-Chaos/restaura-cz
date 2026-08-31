"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Tabs as routes, not as state.
 *
 * They look like the `Tabs` primitive and behave like navigation, which is the
 * combination the feature needs: a tab has its own address, so an owner can
 * link to Subscription, reload on it, or reach it from an email — none of which
 * survives tab state held in memory. That also lets each tab be a Server
 * Component fetching only what it shows.
 */
const TABS = [
  { key: "profile", href: "/workspace/settings/profile" },
  { key: "subscription", href: "/workspace/settings/subscription" },
] as const;

export function SettingsTabs() {
  const t = useTranslations("Settings");
  const pathname = usePathname();

  return (
    <nav aria-label={t("tabsLabel")}>
      <ul className="border-border flex gap-1 border-b">
        {TABS.map(({ key, href }) => {
          const active = pathname === href;

          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:text-foreground focus-visible:ring-ring inline-block rounded-t-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-primary text-foreground border-b-2"
                    : "text-muted-foreground border-b-2 border-transparent",
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
