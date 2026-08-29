import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { CtaButton } from "@/components/landing/CtaButton";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { Container } from "@/components/layout/Container";
import { assetSrc, type MediaAsset } from "@/lib/landing/assets";
import { resolveSignupHref } from "@/lib/landing/links";
import { cn } from "@/lib/utils";

/**
 * The first screen: one photograph, one sentence, one thing to do.
 *
 * The layering is deliberate, bottom to top:
 *
 *   `bg-overlay`  — a solid scrim that is *always* painted, so the headline is
 *                   legible even if every byte of media fails to arrive,
 *   poster        — the LCP element, server-rendered and preloaded,
 *   clip          — optional, client-gated, purely decorative,
 *   gradient      — darkens the bottom two thirds where the words sit,
 *   content       — headline, one line of support, one button.
 *
 * That order is what makes the "readable before the media loads" requirement
 * true by construction rather than by luck: the text never depends on an image
 * having arrived, only on the scrim underneath it.
 */
export interface HeroProps {
  poster: MediaAsset;
  clip?: MediaAsset;
  className?: string;
}

export function Hero({ poster, clip, className }: HeroProps) {
  const t = useTranslations("Landing");
  const locale = useLocale();

  const signupHref = resolveSignupHref(locale, t("cta.mailSubjectSignup"));

  return (
    <section
      data-slot="hero"
      aria-labelledby="hero-heading"
      className={cn(
        // `min-h-svh`, not `min-h-screen`: on a phone the browser chrome is
        // part of the screen, and `100vh` would push the button out of reach.
        "bg-overlay text-overlay-foreground relative isolate flex min-h-svh flex-col justify-center overflow-hidden",
        className,
      )}
    >
      <Image
        src={assetSrc(poster)}
        alt={poster.altKey ? t(poster.altKey) : ""}
        fill
        // This is the LCP element on the site's most-visited page.
        preload
        sizes="100vw"
        className="object-cover"
      />

      {clip ? (
        <HeroVideo src={assetSrc(clip)} poster={assetSrc(poster)} />
      ) : null}

      {/* Darkest where the words are, thinning towards the edges so the
          photograph is still a photograph. */}
      <div
        aria-hidden="true"
        className="via-overlay/60 absolute inset-0 bg-linear-to-b from-transparent to-transparent"
      />

      {/* The vertical padding is what keeps the headline clear of the floating
          header on a short laptop viewport. */}
      <Container
        size="md"
        className="relative flex flex-col items-center gap-6 py-28 text-center"
      >
        <h1
          id="hero-heading"
          className="font-display text-4xl leading-tight tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          {t("hero.headline")}
        </h1>

        <p className="max-w-xl text-base leading-relaxed text-pretty opacity-90 sm:text-lg">
          {t("hero.subheadline")}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <CtaButton href={signupHref} size="lg" className="h-12 px-8 text-base">
            {t("hero.cta")}
          </CtaButton>
          <CtaButton
            href="#pricing"
            size="lg"
            variant="ghost"
            // On media, `ghost`'s foreground-based hover would be invisible.
            className="text-overlay-foreground hover:bg-overlay/40 hover:text-overlay-foreground h-12 px-6 text-base"
          >
            {t("hero.seePricing")}
          </CtaButton>
        </div>
      </Container>
    </section>
  );
}
