import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/workspace/SignOutButton";

export interface DashboardHeaderProps {
  /** Shown so an owner can confirm which account they are working in. */
  email: string;
  locale: string;
  signOutAction: (formData: FormData) => Promise<void>;
}

/**
 * The bar across the top of every signed-in page.
 *
 * Carries the three things that must be reachable from anywhere in the
 * dashboard: what this product is, who you are signed in as, and the way out.
 * The sidebar trigger lives here too, because on a narrow screen it is the only
 * route back to navigation.
 *
 * A Server Component — nothing here is interactive except the trigger and the
 * sign-out form, and both are their own leaves.
 */
export function DashboardHeader({ email, locale, signOutAction }: DashboardHeaderProps) {
  const t = useTranslations("Dashboard");

  return (
    <header className="bg-background/95 border-border sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <Link href="/workspace" className="font-heading text-base font-semibold tracking-tight">
        {t("brand")}
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {t("signedInAs", { email })}
        </span>
        <SignOutButton locale={locale} action={signOutAction} />
      </div>
    </header>
  );
}
