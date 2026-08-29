"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PlusIcon, XIcon } from "lucide-react";

import type { CurrencyCode, PriceModel, PriceVariant } from "@/lib/design-system/types";
import { formatMoney } from "@/lib/design-system/price";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface PriceInputProps {
  value: PriceModel;
  onChange: (next: PriceModel) => void;
  currency?: CurrencyCode;
  className?: string;
}

const KIND_IDS = ["single", "from", "variants", "market"] as const;
type Kind = (typeof KIND_IDS)[number];

function emptyVariant(currency: CurrencyCode): PriceVariant {
  return { label: "", amount: { amount: 0, currency } };
}

/**
 * Every `PriceModel` kind, editable in place.
 *
 * The tricky bit is what happens when staff flips the radio: a menu item
 * priced "189" that gets switched to "market price" and back should still say
 * "189", not "0". Rather than reset state on every kind change, the last
 * typed amount and the last typed variant rows are cached in local state and
 * only swapped back in when their kind is selected again — so a stray click
 * on the radio group can never silently erase what was typed. `onChange`
 * still only ever reports the currently selected kind's shape.
 */
export function PriceInput({ value, onChange, currency = "CZK", className }: PriceInputProps) {
  const locale = useLocale();
  const t = useTranslations("Forms");
  const tPrice = useTranslations("Price");
  const tOrdering = useTranslations("Ordering");
  const legendId = useId();

  const [amountCache, setAmountCache] = useState(() =>
    value.kind === "single" || value.kind === "from" ? value.amount.amount : 0,
  );
  const [variantsCache, setVariantsCache] = useState<PriceVariant[]>(() =>
    value.kind === "variants" && value.variants.length > 0 ? value.variants : [emptyVariant(currency)],
  );

  // Keep the caches honest when the parent hands in a new value from outside
  // (e.g. loading a different dish) without discarding what's cached for the
  // *other* kinds — see the file comment above. Adjusted during render
  // (React's documented pattern for deriving state from a prop change)
  // rather than in an effect, which would cause an extra, avoidable render.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value.kind === "single" || value.kind === "from") {
      setAmountCache(value.amount.amount);
    } else if (value.kind === "variants" && value.variants.length > 0) {
      setVariantsCache(value.variants);
    }
  }

  const kindLabels: Record<Kind, string> = {
    single: t("price"),
    // Reuses the "from {price}" template with a placeholder amount so the
    // radio option reads naturally ("from …") without a dedicated string.
    from: tPrice("from", { price: "…" }),
    variants: tPrice("variants"),
    market: tPrice("marketPrice"),
  };

  function handleKindChange(kind: Kind) {
    switch (kind) {
      case "single":
      case "from":
        onChange({ kind, amount: { amount: amountCache, currency } });
        return;
      case "variants":
        onChange({ kind: "variants", variants: variantsCache });
        return;
      case "market":
        onChange({ kind: "market" });
        return;
    }
  }

  function handleAmountChange(raw: string) {
    const amount = Number(raw) || 0;
    setAmountCache(amount);
    if (value.kind === "single" || value.kind === "from") {
      onChange({ kind: value.kind, amount: { amount, currency } });
    }
  }

  function updateVariant(index: number, patch: Partial<PriceVariant>) {
    if (value.kind !== "variants") return;
    const next = value.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant));
    setVariantsCache(next);
    onChange({ kind: "variants", variants: next });
  }

  function addVariant() {
    if (value.kind !== "variants") return;
    const next = [...value.variants, emptyVariant(currency)];
    setVariantsCache(next);
    onChange({ kind: "variants", variants: next });
  }

  function removeVariant(index: number) {
    if (value.kind !== "variants") return;
    const next = value.variants.filter((_, i) => i !== index);
    setVariantsCache(next);
    onChange({ kind: "variants", variants: next });
  }

  const amountFieldId = useId();

  return (
    <FieldSet data-slot="price-input" className={cn(className)}>
      <FieldLegend id={legendId}>{t("price")}</FieldLegend>
      <FieldGroup>
        <RadioGroup
          value={value.kind}
          onValueChange={(next) => handleKindChange(next as Kind)}
          aria-labelledby={legendId}
        >
          {KIND_IDS.map((kind) => {
            const id = `${legendId}-${kind}`;
            return (
              <FieldLabel key={kind} htmlFor={id} className="flex-row items-center gap-2 font-normal">
                <RadioGroupItem id={id} value={kind} />
                {kindLabels[kind]}
              </FieldLabel>
            );
          })}
        </RadioGroup>

        {(value.kind === "single" || value.kind === "from") && (
          <Field>
            <FieldLabel htmlFor={amountFieldId}>{t("price")}</FieldLabel>
            <Input
              id={amountFieldId}
              type="number"
              inputMode="decimal"
              value={value.amount.amount}
              onChange={(event) => handleAmountChange(event.target.value)}
            />
            <FieldDescription>{formatMoney(locale, value.amount)}</FieldDescription>
          </Field>
        )}

        {value.kind === "variants" && (
          <FieldSet>
            <FieldLegend variant="label">{tPrice("variants")}</FieldLegend>
            <FieldGroup>
              {value.variants.map((variant, index) => {
                const labelId = `${legendId}-variant-label-${index}`;
                const amountId = `${legendId}-variant-amount-${index}`;
                return (
                  <Field key={index} orientation="horizontal" className="items-end">
                    <FieldContent>
                      <FieldLabel htmlFor={labelId}>
                        {tPrice("variants")} {index + 1}
                      </FieldLabel>
                      <Input
                        id={labelId}
                        value={variant.label}
                        onChange={(event) => updateVariant(index, { label: event.target.value })}
                      />
                    </FieldContent>
                    <FieldContent>
                      <FieldLabel htmlFor={amountId}>
                        {t("price")} {index + 1}
                      </FieldLabel>
                      <Input
                        id={amountId}
                        type="number"
                        inputMode="decimal"
                        value={variant.amount.amount}
                        onChange={(event) =>
                          updateVariant(index, {
                            amount: { amount: Number(event.target.value) || 0, currency },
                          })
                        }
                      />
                    </FieldContent>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeVariant(index)}
                      aria-label={`${tOrdering("remove")} ${index + 1}`}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </Field>
                );
              })}
              <Button
                type="button"
                variant="outline"
                onClick={addVariant}
                aria-label={`${tOrdering("add")} ${tPrice("variants")}`}
              >
                <PlusIcon aria-hidden="true" />
                {tOrdering("add")}
              </Button>
            </FieldGroup>
          </FieldSet>
        )}
      </FieldGroup>
    </FieldSet>
  );
}
