"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Not shipped yet: a guest today has no order to attach a note to. Reserved
 * for a future ordering flow's "anything else?" field — allergies, "no ice",
 * table number, whatever a kitchen needs beyond the dish itself.
 *
 * The remaining-character count sits in a `polite` live region rather than
 * `assertive`: an assertive region would interrupt a screen-reader user
 * mid-sentence on every keystroke, which is worse than the count lagging
 * slightly behind. `maxLength` on the textarea itself is the actual limit;
 * the count is guidance, not a validator.
 */
export interface SpecialRequestFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** @default 200 */
  maxLength?: number;
  className?: string;
}

export function SpecialRequestField({
  value,
  onChange,
  maxLength = 200,
  className,
}: SpecialRequestFieldProps) {
  const t = useTranslations("Ordering");
  const id = useId();
  const countId = useId();
  const remaining = Math.max(0, maxLength - value.length);

  return (
    <div
      data-slot="special-request-field"
      data-ordering=""
      className={cn("flex flex-col gap-1.5", className)}
    >
      <Label htmlFor={id}>{t("note")}</Label>
      <Textarea
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={t("notePlaceholder")}
        aria-describedby={countId}
        onChange={(event) => onChange(event.target.value)}
      />
      <p
        id={countId}
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-muted-foreground"
      >
        {t("charactersLeft", { count: remaining })}
      </p>
    </div>
  );
}
