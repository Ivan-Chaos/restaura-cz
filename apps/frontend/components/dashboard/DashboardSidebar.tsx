"use client";

import { CreditCard, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Where the dashboard's sections live.
 *
 * A list rather than markup so a new section is one entry, and so the active
 * check is written once. `match` is a prefix: the menu editor at
 * `/workspace/menus/<id>` still belongs to Menus, and a settings tab still
 * belongs to Settings.
 */
const SECTIONS = [
  { key: "menus", href: "/workspace/menus", icon: UtensilsCrossed },
  { key: "settings", href: "/workspace/settings", icon: CreditCard },
] as const;

export interface DashboardSidebarProps {
  /** The restaurant, so an owner can see whose dashboard they are looking at. */
  restaurantName: string;
}

/**
 * The dashboard's navigation.
 *
 * A client component only because the active section depends on the current
 * URL; everything else about the shell renders on the server. `usePathname`
 * comes from `@/i18n/navigation`, so it reports the path *without* the locale
 * prefix and these hrefs need no locale of their own.
 */
export function DashboardSidebar({ restaurantName }: DashboardSidebarProps) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-muted-foreground text-xs">{t("signedInTo")}</span>
          <span className="font-heading truncate text-sm font-medium" title={restaurantName}>
            {restaurantName}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navLabel")}</SidebarGroupLabel>
          <SidebarMenu>
            {SECTIONS.map(({ key, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={active}
                    render={
                      <Link href={href} aria-current={active ? "page" : undefined} />
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>{t(key)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
