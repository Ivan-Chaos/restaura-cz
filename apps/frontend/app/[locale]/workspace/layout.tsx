import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { AppearanceScope } from "@/components/dashboard/AppearanceScope";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { routing } from "@/i18n/routing";
import { signOutAction } from "@/lib/api/actions/auth";
import { requireProfile } from "@/lib/api/session";

/**
 * The dashboard shell, and the gate in front of it.
 *
 * Both live here rather than on each page for the same reason: a rule that
 * every new page has to remember is a rule a new page will eventually forget.
 * Everything under `/workspace` therefore gets the same header, the same
 * navigation, the same light-toned surface, and the same guarantee that the
 * owner behind it is signed in with a complete restaurant profile.
 *
 * Renders per owner, so nothing below this can be static.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: LayoutProps<"/[locale]/workspace">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { account, profile } = await requireProfile(locale);

  // The sidebar writes its own cookie; reading it here means an owner who
  // collapsed the navigation gets it collapsed in the first paint, rather than
  // watching it close after hydration.
  const collapsed = (await cookies()).get("sidebar_state")?.value === "false";

  return (
    <AppearanceScope className="flex min-h-svh flex-col">
      <SidebarProvider defaultOpen={!collapsed}>
        <DashboardSidebar restaurantName={profile.restaurantName} />
        <SidebarInset>
          <DashboardHeader
            email={account.email}
            locale={locale}
            signOutAction={signOutAction}
          />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AppearanceScope>
  );
}
