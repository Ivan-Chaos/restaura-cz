import { useLocale, useTranslations } from "next-intl";

import { CtaButton } from "@/components/landing/CtaButton";
import { Container } from "@/components/layout/Container";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/menu/LanguageSwitcher";
import { LANDING_CONTACT_EMAIL, resolveSignupHref } from "@/lib/landing/links";
import { cn } from "@/lib/utils";

/**
 * The last thing on the page, and the third place a convinced reader can act.
 *
 * The legal links are also the only navigation to those documents, which is why
 * they live in a labelled `<nav>` rather than loose in the markup — a visitor
 * looking for the privacy policy is usually looking for it deliberately.
 */
const LEGAL_LINKS = [
  { href: "/terms", labelKey: "footer.legal" },
  { href: "/privacy", labelKey: "footer.privacy" },
  { href: "/cookies", labelKey: "footer.cookies" },
] as const;
export interface LandingFooterProps {
  className?: string;
}

export function LandingFooter({ className }: LandingFooterProps) {
  const t = useTranslations("Landing");
  const locale = useLocale();

  const signupHref = resolveSignupHref(locale);
  const contactHref = `mailto:${LANDING_CONTACT_EMAIL}`;

  return (
    <footer
      data-slot="landing-footer"
      className={cn("border-border border-t py-12", className)}
    >
      <Container size="xl" className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-display text-xl tracking-tight">
              {t("brand.name")}
            </span>
            <span className="text-muted-foreground text-sm">
              {t("footer.tagline")}
            </span>
          </div>

          <CtaButton href={signupHref} variant="outline" size="lg">
            {t("hero.cta")}
          </CtaButton>
        </div>

        <div className="border-border flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <LanguageSwitcher />

          <nav
            aria-label={t("footer.legal")}
            className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm"
          >
            <a
              href={contactHref}
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              {t("footer.contact")}
            </a>
            {LEGAL_LINKS.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-foreground rounded-sm underline-offset-4 hover:underline"
              >
                {t(labelKey)}
              </Link>
            ))}
          </nav>

          <p className="text-muted-foreground text-sm">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
