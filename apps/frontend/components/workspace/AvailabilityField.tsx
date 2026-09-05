"use client";

import { EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field, FieldDescription, FieldTitle } from "@/components/ui/field";
import { AVAILABILITY_IDS, type AvailabilityId } from "@/lib/design-system/dietary";
import { cn } from "@/lib/utils";

export interface AvailabilityFieldProps {
  value: AvailabilityId;
  onChange: (next: AvailabilityId) => void;
  /** Unique within the page, so the radios form their own group. */
  idPrefix: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Whether a dish is on the menu tonight, and if not, how.
 *
 * Four states rather than a switch: "only a few left" and "sold out" are things
 * a guest needs to *read*, while "hidden" removes the dish from the guest page
 * and from the PDF entirely. Only the last is a structural decision, and it is
 * the one an owner reaches for when a supplier let them down — the dish keeps
 * its price, its photograph and its place in the list, ready to come back.
 *
 * **Why not `components/menu/forms/AvailabilitySwitch`.** That control is the
 * design system's showcase for the same idea and reads better — a switch, with
 * a select appearing only to answer "unavailable how". But a `Switch` and a
 * `Select` are buttons: neither posts anything, and this form has to work with
 * no client JavaScript, because the Server Action re-reads it as the authority.
 * A control that posted nothing would quietly mark every saved dish available
 * again. Native radios post themselves, so they are what the editor uses.
 */
export function AvailabilityField({
  value,
  onChange,
  idPrefix,
  disabled = false,
  className,
}: AvailabilityFieldProps) {
  const t = useTranslations("MenuEditor");
  const tForms = useTranslations("Forms");
  const tAvailability = useTranslations("Availability");
  const groupId = `${idPrefix}-availability`;

  return (
    <Field className={cn(className)} data-slot="availability-field">
      <FieldTitle id={`${groupId}-label`}>
        {tForms("availability")}
      </FieldTitle>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        aria-describedby={`${groupId}-hint`}
      >
        {AVAILABILITY_IDS.map((id) => (
          <label
            key={id}
            className={cn(
              "border-input bg-background text-foreground inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-4xl border px-3 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary",
              "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
              "has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
              "[&>svg]:size-3.5",
            )}
          >
            <input
              id={`${groupId}-${id}`}
              type="radio"
              name="availability"
              value={id}
              checked={value === id}
              disabled={disabled}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            {id === "hidden" ? <EyeOff aria-hidden="true" /> : null}
            {tAvailability(id)}
          </label>
        ))}
      </div>
      {/* Shown always, not only once "hidden" is picked: what the word does is
          the thing an owner needs to know *before* choosing it. */}
      <FieldDescription id={`${groupId}-hint`}>{t("itemAvailabilityHint")}</FieldDescription>
    </Field>
  );
}
