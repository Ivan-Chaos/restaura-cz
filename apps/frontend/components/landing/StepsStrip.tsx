import { PencilLine, ScanLine, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal } from "@/components/landing/Reveal";
import { Container } from "@/components/layout/Container";
import type { Step, StepIconName } from "@/lib/landing/capabilities";
import { cn } from "@/lib/utils";

/**
 * Three beats answering the question every owner asks next: *how much work is
 * this?*
 *
 * An ordered list, not a row of cards — the order is the point, and a screen
 * reader should announce "1 of 3" without being told to. The numerals are
 * decorative twice over: the list already carries the sequence, and the words
 * repeat it.
 */

const ICONS: Record<StepIconName, typeof PencilLine> = {
  PencilLine,
  Sparkles,
  ScanLine,
};

export interface StepsStripProps {
  steps: readonly Step[];
  className?: string;
}

export function StepsStrip({ steps, className }: StepsStripProps) {
  const t = useTranslations("Landing");

  return (
    <section
      data-slot="steps"
      aria-labelledby="steps-heading"
      className={cn("bg-muted py-20 lg:py-24", className)}
    >
      <Container size="xl">
        <Reveal>
          <h2
            id="steps-heading"
            className="font-display mb-12 text-center text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
          >
            {t("steps.title")}
          </h2>
        </Reveal>

        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => {
            const Icon = ICONS[step.icon];
            return (
              <Reveal
                as="li"
                key={step.id}
                delay={index === 0 ? "none" : index === 1 ? "sm" : "md"}
                className="flex flex-col items-start gap-3"
              >
                <span
                  aria-hidden="true"
                  className="bg-background text-primary shadow-card flex size-11 items-center justify-center rounded-full"
                >
                  <Icon className="size-5" />
                </span>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
                >
                  {index + 1}
                </span>
                <h3 className="font-display text-xl leading-snug">
                  {t(`steps.${step.id}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                  {t(`steps.${step.id}.body`)}
                </p>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
