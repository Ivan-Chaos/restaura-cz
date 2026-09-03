import type { PriceModel } from "@/lib/design-system/types";
import type { PriceTreatment } from "@/lib/menu-display/presentation";
import { cn } from "@/lib/utils";

import { Price } from "./Price";

export interface DishPriceProps {
  price: PriceModel;
  treatment?: PriceTreatment;
  className?: string;
}

/**
 * A dish's price, set the way its presentation recipe asks.
 *
 * `Price` knows how to *format* a price; this knows how to *place* it — a
 * plain figure after a dotted leader (classic), quietly right-aligned
 * (ledger), a tinted chip (glass), a heavy figure that carries the row
 * (board, editorial), or a small line beneath the name (fine dining). All of
 * it is `Price` underneath, so the accessible label never changes.
 */
export function DishPrice({ price, treatment = "leader", className }: DishPriceProps) {
  switch (treatment) {
    case "right":
      return <Price price={price} size="sm" className={className} />;
    case "chip":
      return (
        <span
          data-slot="price-chip"
          className={cn(
            "bg-primary/10 inline-flex items-baseline rounded-full px-2.5 py-0.5",
            className,
          )}
        >
          <Price price={price} size="sm" emphasis />
        </span>
      );
    case "bold":
      return <Price price={price} size="lg" emphasis className={className} />;
    case "below":
      return <Price price={price} size="sm" className={cn("tracking-wide", className)} />;
    case "leader":
    default:
      return <Price price={price} size="sm" emphasis className={className} />;
  }
}
