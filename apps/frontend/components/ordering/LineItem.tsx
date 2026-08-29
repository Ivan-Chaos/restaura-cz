import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design-system/price";
import type { LineItemModel } from "@/lib/design-system/ordering-types";
import { Button } from "@/components/ui/button";

import { QuantityStepper } from "./QuantityStepper";

/**
 * Not shipped yet: nothing today produces a cart or an order line. Reserved
 * for a future ordering flow.
 *
 * A Server Component that composes the client `QuantityStepper` only when
 * `onQuantityChange` is supplied — omit both callbacks and the line renders
 * as a read-only receipt row with no buttons at all, which is what a kitchen
 * ticket or a past-order review needs.
 */
export interface LineItemProps {
  line: LineItemModel;
  onQuantityChange?: (next: number) => void;
  onRemove?: () => void;
  className?: string;
}

export function LineItem({ line, onQuantityChange, onRemove, className }: LineItemProps) {
  const t = useTranslations("Ordering");
  const locale = useLocale();

  return (
    <div
      data-slot="line-item"
      data-ordering=""
      className={cn("flex items-start justify-between gap-3", className)}
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">{line.item.name}</span>
        {line.selectedOptions?.length ? (
          <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {line.selectedOptions.map((option, index) => (
              <li key={index}>
                {option.optionName}
                {option.priceDelta ? ` (+ ${formatMoney(locale, option.priceDelta)})` : null}
              </li>
            ))}
          </ul>
        ) : null}
        {line.note ? <p className="text-sm text-muted-foreground italic">{line.note}</p> : null}
        <div className="flex items-center gap-2 pt-1">
          {onQuantityChange ? (
            <QuantityStepper value={line.quantity} onChange={onQuantityChange} label={t("quantity")} />
          ) : (
            <span className="text-sm text-muted-foreground">
              <span className="sr-only">{t("quantity")}: </span>
              {line.quantity}
            </span>
          )}
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("remove")}
              onClick={onRemove}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>
      <span className="text-price shrink-0 font-medium">{formatMoney(locale, line.linePrice)}</span>
    </div>
  );
}
