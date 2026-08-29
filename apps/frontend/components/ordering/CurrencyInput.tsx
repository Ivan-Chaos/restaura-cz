"use client";

import { useId } from "react";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CurrencyCode } from "@/lib/design-system/types";

/**
 * The symbol part of a locale-formatted currency, e.g. "Kč" or "€" — reused
 * from `Intl.NumberFormat` (the same primitive `formatMoney` builds on)
 * rather than a hard-coded symbol table, so a Czech guest sees "Kč" and a
 * German-reading guest sees the currency exactly as `Price` renders it
 * elsewhere.
 */
function currencySymbol(locale: string, currency: CurrencyCode): string {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

/**
 * Not shipped yet: nothing today lets a guest name their own amount (a tip, a
 * custom order total). Reserved for a future ordering flow.
 *
 * A native `type="number"` input rather than a text input we parse
 * ourselves — the browser already withholds a non-numeric keystroke from
 * `value` (so `onChange` never sees "12,ab"), which is exactly the
 * validation a currency field needs and it comes for free. An emptied field
 * reports `0` rather than `NaN`: every consumer of this number (a running
 * total, `formatMoney`) assumes a real number, and `0` is the honest reading
 * of "the guest cleared it", not an error state.
 */
export interface CurrencyInputProps {
  value?: number;
  currency: CurrencyCode;
  onChange: (next: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function CurrencyInput({
  value,
  currency,
  onChange,
  label,
  disabled,
  className,
}: CurrencyInputProps) {
  const locale = useLocale();
  const id = useId();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const next = raw === "" ? 0 : Number(raw);
    onChange(Number.isNaN(next) ? 0 : next);
  };

  return (
    <div
      data-slot="currency-input"
      data-ordering=""
      className={cn("flex flex-col gap-1.5", className)}
    >
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={value ?? ""}
          disabled={disabled}
          onChange={handleChange}
          className="pr-12"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
          {currencySymbol(locale, currency)}
        </span>
      </div>
    </div>
  );
}
