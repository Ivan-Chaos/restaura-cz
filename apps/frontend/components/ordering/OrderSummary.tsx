import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design-system/price";
import type { OrderSummaryModel } from "@/lib/design-system/ordering-types";
import { Separator } from "@/components/ui/separator";

import { LineItem } from "./LineItem";

/**
 * Not shipped yet: nothing today produces an order to summarize. Reserved
 * for a future ordering flow's review step.
 *
 * A Server Component, read-only — its `LineItem`s never get a quantity or
 * remove callback here, so they render as receipt rows. The total is set in
 * a visibly larger, heavier weight than every other number on the page: it's
 * the one figure a guest actually needs to read before confirming.
 */
export interface OrderSummaryProps {
  summary: OrderSummaryModel;
  className?: string;
}

export function OrderSummary({ summary, className }: OrderSummaryProps) {
  const t = useTranslations("Ordering");
  const locale = useLocale();

  return (
    <div data-slot="order-summary" data-ordering="" className={cn("flex flex-col gap-4", className)}>
      <ul className="flex flex-col gap-4">
        {summary.lines.map((line) => (
          <li key={line.id}>
            <LineItem line={line} />
          </li>
        ))}
      </ul>

      <Separator />

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{t("subtotal")}</span>
          <span>{formatMoney(locale, summary.subtotal)}</span>
        </div>
        {summary.adjustments?.map((adjustment, index) => (
          <div key={index} className="flex items-center justify-between text-muted-foreground">
            <span>{adjustment.label}</span>
            <span>{formatMoney(locale, adjustment.amount)}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-display text-lg">{t("total")}</span>
        <span className="text-price font-display text-2xl font-semibold">
          {formatMoney(locale, summary.total)}
        </span>
      </div>
    </div>
  );
}
