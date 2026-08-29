"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Not shipped yet: the guest menu today has nothing to count. This exists so a
 * future ordering flow can reuse the menu's visual language for "how many of
 * this dish" instead of inventing a second one. Purely presentational — the
 * parent owns `value` and decides what a change means (cart line, draft
 * order, …).
 *
 * Exposed as a single `spinbutton` (the value itself) rather than two plain
 * buttons plus a number, so assistive tech gets one control with a current
 * value and bounds, matching how a native `<input type="number">` reads.
 */
export interface QuantityStepperProps {
  value: number;
  /** @default 1 */
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  /** Accessible name for the control. Falls back to the generic "Quantity". */
  label?: string;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  className,
}: QuantityStepperProps) {
  const t = useTranslations("Ordering");

  // Clamp so a caller passing an out-of-range `value` (or a fast double
  // click) never produces a value the buttons themselves couldn't reach.
  const commit = (next: number) => {
    const clamped = Math.max(min, max === undefined ? next : Math.min(max, next));
    if (clamped !== value) onChange(clamped);
  };

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commit(value + 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      commit(value - 1);
    }
  };

  return (
    <div
      data-slot="quantity-stepper"
      data-ordering=""
      className={cn("inline-flex items-center gap-1", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t("decrease")}
        disabled={atMin}
        onClick={() => commit(value - 1)}
      >
        <Minus />
      </Button>
      <span
        role="spinbutton"
        tabIndex={0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label ?? t("quantity")}
        onKeyDown={handleKeyDown}
        className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-transparent px-2 text-sm font-medium tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t("increase")}
        disabled={atMax}
        onClick={() => commit(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
