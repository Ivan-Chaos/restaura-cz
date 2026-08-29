"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import type { Availability } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface AvailabilitySwitchProps {
  value: Availability;
  onChange: (next: Availability) => void;
  className?: string;
}

type Refinement = Exclude<Availability, "available">;

/**
 * A dish is either available or it isn't — the `Switch` is the whole story
 * most of the time. The `Select` only exists to answer "unavailable *how*"
 * (temporarily low on stock vs. off the menu entirely), so it only renders
 * once the switch is off, keeping the common case a single control.
 *
 * Turning the switch back on always restores "available"; turning it off
 * restores whichever refinement (`limited`/`soldOut`) was last chosen rather
 * than defaulting to one, so flipping the switch off-on-off doesn't quietly
 * change a previously-set "limited" back to "sold out".
 */
export function AvailabilitySwitch({ value, onChange, className }: AvailabilitySwitchProps) {
  const t = useTranslations("Forms");
  const tAvailability = useTranslations("Availability");
  const tOrdering = useTranslations("Ordering");
  const switchId = useId();
  const selectId = useId();

  const [lastRefinement, setLastRefinement] = useState<Refinement>(
    value === "available" ? "soldOut" : value,
  );

  // Adjusted during render (React's documented pattern for deriving state
  // from a prop change) rather than in an effect, which would cause an
  // extra, avoidable render.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== "available") {
      setLastRefinement(value);
    }
  }

  const isAvailable = value === "available";

  return (
    <FieldSet data-slot="availability-switch" className={cn(className)}>
      <FieldLegend>{t("availability")}</FieldLegend>
      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={switchId}>{tAvailability("available")}</FieldLabel>
            <FieldDescription>{tAvailability(value)}</FieldDescription>
          </FieldContent>
          <Switch
            id={switchId}
            checked={isAvailable}
            onCheckedChange={(checked) => onChange(checked ? "available" : lastRefinement)}
          />
        </Field>

        {!isAvailable && (
          <Field>
            <FieldLabel htmlFor={selectId}>{tOrdering("unavailable")}</FieldLabel>
            <Select value={value} onValueChange={(next) => onChange(next as Refinement)}>
              <SelectTrigger id={selectId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="limited">{tAvailability("limited")}</SelectItem>
                <SelectItem value="soldOut">{tAvailability("soldOut")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </FieldGroup>
    </FieldSet>
  );
}
