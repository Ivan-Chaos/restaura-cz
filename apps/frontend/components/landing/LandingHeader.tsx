import { useLocale, useTranslations } from "next-intl";

import { CtaButton } from "@/components/landing/CtaButton";
import { Container } from "@/components/layout/Container";
import { LanguageSwitcher } from "@/components/menu/LanguageSwitcher";
import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import { Link } from "@/i18n/navigation";
import { resolveSignupHref } from "@/lib/landing/links";
import { cn } from "@/lib/utils";

/**
 * The page's only chrome, floating over the hero photograph.
 *
 * Restrained on purpose: a wordmark, the two controls a visitor might actually
 * need (language, appearance), and the same call to action as everywhere else.
 * There is no navigation because there is nowhere else to go — a marketing page
 * with a menu bar is a page that has given up on its own argument.
 *
 * Everything here sits on the hero's scrim, so it takes `overlay-foreground`
 * rather than the ordinary `foreground` that would flip with appearance and
 * disappear against the photograph in one of the two.
 */
export interface LandingHeaderProps {
  className?: string;
}

export function LandingHeader({ className }: LandingHeaderProps) {
  const t = useTranslations("Landing");
  const locale = useLocale();

  const signupHref = resolveSignupHref(locale);

  return (
    <header
      data-slot="landing-header"
      className={cn(
        "text-overlay-foreground absolute inset-x-0 top-0 z-10",
        className,
      )}
    >
      <Container
        size="xl"
        className="flex flex-wrap items-center justify-between gap-3 py-5"
      >
        <Link
          href="/"
          aria-label={t("brand.wordmarkLabel")}
          className="font-display rounded-sm text-xl tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
        >
          {t("brand.name")}
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {/* The shared controls are built for ordinary surfaces; on media they
              need the overlay foreground and a scrim-based hover instead of the
              default muted one, which is invisible over a photograph. */}
          <LanguageSwitcher className="[&_button]:text-overlay-foreground [&_button:hover]:bg-overlay/40 [&_button[aria-current]]:bg-overlay/50" />
          <AppearanceToggle className="text-overlay-foreground hover:bg-overlay/40 hover:text-overlay-foreground" />
          <CtaButton
            href={signupHref}
            variant="outline"
            size="lg"
            className="border-overlay-foreground/40 text-overlay-foreground hover:bg-overlay/40 hover:text-overlay-foreground ml-1 bg-transparent"
          >
            {t("hero.cta")}
          </CtaButton>
        </div>
      </Container>
    </header>
  );
}
