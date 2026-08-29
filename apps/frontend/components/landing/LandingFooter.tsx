import { useLocale, useTranslations } from "next-intl";

import { CtaButton } from "@/components/landing/CtaButton";
import { Container } from "@/components/layout/Container";
import { LanguageSwitcher } from "@/components/menu/LanguageSwitcher";
import { LANDING_CONTACT_EMAIL, resolveSignupHref } from "@/lib/landing/links";
import { cn } from "@/lib/utils";

/**
 * The last thing on the page, and the third place a convinced reader can act.
 *
 * The legal links point at a mailbox rather than at `#` or at routes that do
 * not exist: a placeholder that goes nowhere is worse than one that reaches a
 * human. They become real routes the day there are terms to link to.
 */
export interface LandingFooterProps {
  className?: string;
}

export function LandingFooter({ className }: LandingFooterProps) {
  const t = useTranslations("Landing");
  const locale = useLocale();

  const signupHref = resolveSignupHref(locale, t("cta.mailSubjectSignup"));
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
            <a href={contactHref} className="hover:text-foreground underline-offset-4 hover:underline">
              {t("footer.contact")}
            </a>
            <a href={contactHref} className="hover:text-foreground underline-offset-4 hover:underline">
              {t("footer.legal")}
            </a>
            <a href={contactHref} className="hover:text-foreground underline-offset-4 hover:underline">
              {t("footer.privacy")}
            </a>
          </nav>

          <p className="text-muted-foreground text-sm">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
