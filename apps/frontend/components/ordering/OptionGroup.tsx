"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design-system/price";
import type { OptionGroupModel, OptionModel } from "@/lib/design-system/ordering-types";
import type { Money } from "@/lib/design-system/types";
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

/** `+ 20 Kč` — the sign is ours, `formatMoney` already localizes the amount. */
function formatDelta(locale: string, delta: Money) {
  const formatted = formatMoney(locale, delta);
  return delta.amount >= 0 ? `+ ${formatted}` : formatted;
}

/**
 * Not shipped yet: today a guest reads a dish's description, they never pick
 * "size" or "extras". Reserved for a future ordering flow so option pickers
 * share the menu's visual language (`Field`, prices via `formatMoney`) rather
 * than a bespoke form.
 *
 * `single` renders a `RadioGroup`, `multiple` a checkbox list — the model's
 * `selection` decides, the caller never chooses the widget directly. An
 * unavailable option stays visible (so the guest knows it exists) but cannot
 * be chosen, and says why via `Ordering.unavailable`.
 */
export interface OptionGroupProps {
  group: OptionGroupModel;
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  className?: string;
}

export function OptionGroup({ group, value, onChange, error, className }: OptionGroupProps) {
  const t = useTranslations("Ordering");
  const locale = useLocale();
  const errorId = useId();
  const isSingle = group.selection === "single";
  const invalid = Boolean(error);

  // `single` can only ever produce one choice, so it always reads as "choose
  // one" regardless of whether the group is required; `multiple` states its
  // actual min/max because both bounds matter ("choose between 1 and 3").
  const hint = isSingle
    ? t("chooseOne")
    : t("chooseBetween", { min: group.min, max: group.max });

  const toggleMultiple = (optionId: string, checked: boolean) => {
    if (checked) {
      // Silently ignoring a check past `max` (rather than replacing the
      // oldest pick) keeps this component free of an opinion about which
      // selection to drop — the disabled state on unchecked options already
      // tells the guest why nothing happened.
      if (group.max > 0 && value.length >= group.max) return;
      onChange([...value, optionId]);
    } else {
      onChange(value.filter((id) => id !== optionId));
    }
  };

  const renderOptionBody = (option: OptionModel, selected: boolean, disabled: boolean) => (
    <>
      <span className="flex-1">{option.name}</span>
      {option.priceDelta ? (
        <span className="text-price text-sm">{formatDelta(locale, option.priceDelta)}</span>
      ) : null}
      {disabled ? (
        <span className="text-xs text-muted-foreground">{t("unavailable")}</span>
      ) : null}
      {/* Selection is already conveyed by aria-checked; this reinforces it in
          text for anyone reading the label rather than the control state. */}
      {selected ? <span className="sr-only">{t("selected")}</span> : null}
    </>
  );

  return (
    <FieldSet
      data-slot="option-group"
      data-ordering=""
      className={className}
      aria-invalid={invalid}
      aria-describedby={invalid ? errorId : undefined}
    >
      <FieldLegend>
        {group.name}
        {group.min > 0 ? (
          <span className="ml-1 font-normal text-muted-foreground">({t("required")})</span>
        ) : null}
      </FieldLegend>
      <FieldDescription>{hint}</FieldDescription>

      {isSingle ? (
        <RadioGroup
          value={value[0] ?? ""}
          onValueChange={(id) => onChange([String(id)])}
          aria-label={group.name}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        >
          {group.options.map((option) => {
            const disabled = option.available === false;
            const selected = value.includes(option.id);
            return (
              <FieldLabel key={option.id} className={cn(disabled && "opacity-60")}>
                <RadioGroupItem value={option.id} disabled={disabled} />
                {renderOptionBody(option, selected, disabled)}
              </FieldLabel>
            );
          })}
        </RadioGroup>
      ) : (
        <div
          role="group"
          aria-label={group.name}
          aria-describedby={invalid ? errorId : undefined}
          data-slot="checkbox-group"
          className="flex flex-col gap-3"
        >
          {group.options.map((option) => {
            const disabled = option.available === false;
            const selected = value.includes(option.id);
            const atCap = !selected && group.max > 0 && value.length >= group.max;
            return (
              <FieldLabel key={option.id} className={cn((disabled || atCap) && "opacity-60")}>
                <Checkbox
                  checked={selected}
                  disabled={disabled || atCap}
                  onCheckedChange={(checked) => toggleMultiple(option.id, checked === true)}
                />
                {renderOptionBody(option, selected, disabled)}
              </FieldLabel>
            );
          })}
        </div>
      )}

      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </FieldSet>
  );
}
