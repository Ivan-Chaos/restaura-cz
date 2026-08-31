import { useTranslations } from "next-intl";

import { PlanCard } from "@/components/landing/PlanCard";
import { Reveal } from "@/components/landing/Reveal";
import { Container } from "@/components/layout/Container";
import type { Plan } from "@/lib/landing/plans";
import { cn } from "@/lib/utils";

/**
 * The page's last argument: what this costs.
 *
 * Order is a conversion decision, not a layout one — Free first, and first on a
 * phone too, because the whole page has been building to "you can start today
 * for nothing". The two roadmap tiers follow to show the product is going
 * somewhere, and both say plainly that they are not for sale yet.
 */
export interface PricingProps {
  plans: readonly Plan[];
  className?: string;
}

export function Pricing({ plans, className }: PricingProps) {
  const t = useTranslations("Landing");

  return (
    <section
      id="pricing"
      data-slot="pricing"
      aria-labelledby="pricing-heading"
      className={cn("scroll-mt-8 py-20 lg:py-28", className)}
    >
      <Container size="xl">
        <Reveal className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
          <h2
            id="pricing-heading"
            className="font-display text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
          >
            {t("pricing.title")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed text-pretty">
            {t("pricing.subtitle")}
          </p>
        </Reveal>

        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal
              key={plan.id}
              delay={index === 0 ? "none" : index === 1 ? "sm" : "md"}
              className="h-full"
            >
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
