"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field, FieldTitle } from "@/components/ui/field";
import type { SpiceLevel as SpiceLevelValue } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

const LEVELS: readonly SpiceLevelValue[] = [0, 1, 2, 3];

export interface SpiceLevelFieldProps {
  value: SpiceLevelValue;
  onChange: (next: SpiceLevelValue) => void;
  /** Unique within the page, so the radios form their own group. */
  idPrefix: string;
  disabled?: boolean;
  className?: string;
}

/**
 * How hot a dish is, on the 0–3 scale guests read as flames.
 *
 * Radios rather than a slider or a select: there are four options, they are
 * ordered, and an owner should be able to see all four at once and compare them
 * against the flames a guest will actually see. Native radios also post
 * themselves, so this works with no client JavaScript — which matters because
 * the Server Action re-reads the form as the authority, and a control that
 * posted nothing would silently reset every dish to "not spicy".
 *
 * The flames here are decorative; each option's accessible name is its own
 * translated text, so a screen-reader user hears "Spice level 2 of 3" rather
 * than counting icons.
 */
export function SpiceLevelField({
  value,
  onChange,
  idPrefix,
  disabled = false,
  className,
}: SpiceLevelFieldProps) {
  const t = useTranslations("MenuEditor");
  const tMenu = useTranslations("Menu");
  const groupId = `${idPrefix}-spice`;

  return (
    <Field className={cn(className)} data-slot="spice-level-field">
      <FieldTitle id={`${groupId}-label`}>
        {t("itemSpiciness")}
      </FieldTitle>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${groupId}-label`}>
        {LEVELS.map((level) => {
          const label = level === 0 ? t("spiceNotSpicy") : tMenu("spiceLevel", { level });
          return (
            <label
              key={level}
              className={cn(
                "border-input bg-background text-foreground inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-4xl border px-3 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary",
                "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
                "has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
              )}
            >
              <input
                id={`${groupId}-${level}`}
                type="radio"
                name="spiceLevel"
                value={String(level)}
                checked={value === level}
                disabled={disabled}
                onChange={() => onChange(level)}
                className="sr-only"
              />
              {level === 0 ? (
                label
              ) : (
                <>
                  <span aria-hidden="true" className="inline-flex items-center gap-0.5">
                    {Array.from({ length: level }, (_, index) => (
                      <Flame key={index} className="size-3.5" />
                    ))}
                  </span>
                  <span className="sr-only">{label}</span>
                </>
              )}
            </label>
          );
        })}
      </div>
    </Field>
  );
}
