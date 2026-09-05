import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CtaButton } from "@/components/landing/CtaButton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/design-system/price";
import { resolveNotifyHref, resolveSignupHref } from "@/lib/landing/links";
import type { Plan } from "@/lib/landing/plans";
import { cn } from "@/lib/utils";

/**
 * One pricing tier.
 *
 * Two rules worth stating out loud, because getting either wrong would be a lie
 * told to a visitor:
 *
 * - **"Coming soon" is text, never a colour.** A dimmer card means nothing to a
 *   screen reader and nothing to anyone who cannot separate the grey from the
 *   beige. The badge says the words; `data-availability` lets a test insist.
 * - **A tier that has not launched cannot be bought.** The button's destination
 *   comes from the plan's own `cta` field, so there is no path through this
 *   component that puts a coming-soon plan in front of a payment flow.
 */
export interface PlanCardProps {
  plan: Plan;
  className?: string;
}

export function PlanCard({ plan, className }: PlanCardProps) {
  const t = useTranslations("Landing");
  const locale = useLocale();

  const headingId = `plan-${plan.id}-heading`;
  const comingSoon = plan.availability === "comingSoon";
  const planName = t(`plans.${plan.id}.name`);

  const href =
    plan.cta === "signup"
      ? resolveSignupHref(locale)
      : resolveNotifyHref(
          locale,
          plan.id,
          t("cta.mailSubjectNotify", { plan: planName }),
        );

  // Three shapes of price line through one slot: a real amount, "free", or —
  // for the tier whose price is not decided — the same words as the badge.
  const priceLine = plan.price
    ? t("pricing.perMonth", { price: formatMoney(locale, plan.price) })
    : plan.id === "free"
      ? t("pricing.free")
      : t("pricing.noPriceYet");

  return (
    <Card
      // A self-contained thing a screen-reader user can move between. `Card`
      // renders a div, so the role carries the semantics the tag cannot.
      role="article"
      data-plan={plan.id}
      data-availability={plan.availability}
      aria-labelledby={headingId}
      className={cn(
        "flex h-full flex-col",
        plan.recommended && "ring-ring shadow-card ring-2",
        className,
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={headingId} className="font-display text-2xl leading-none">
            {planName}
          </h3>
          {plan.recommended ? (
            <Badge variant="default">{t("pricing.recommended")}</Badge>
          ) : null}
          {comingSoon ? (
            <Badge variant="outline">{t("pricing.comingSoon")}</Badge>
          ) : null}
        </div>

        <p
          className={cn(
            "font-display text-3xl leading-tight",
            // With no number to show, the line is a status, not a price.
            plan.price ? "text-price" : "text-muted-foreground",
          )}
        >
          {priceLine}
        </p>

        <p className="text-muted-foreground text-sm text-pretty">
          {t(`plans.${plan.id}.tagline`)}
        </p>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm">
              <Check
                aria-hidden="true"
                className="text-success mt-0.5 size-4 shrink-0"
              />
              <span className="text-pretty">{t(feature)}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-2 pb-(--card-spacing)">
        <CtaButton
          href={href}
          size="lg"
          variant={plan.cta === "signup" ? "default" : "outline"}
          className="w-full"
        >
          {plan.cta === "signup"
            ? t("pricing.ctaSignup")
            : t("pricing.ctaNotify")}
        </CtaButton>
      </CardFooter>
    </Card>
  );
}
