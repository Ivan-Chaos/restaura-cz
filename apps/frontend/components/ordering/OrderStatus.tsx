import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { OrderStatusModel } from "@/lib/design-system/ordering-types";

/**
 * Every status maps to one of four tones — there are more statuses than
 * tones on purpose. `ready` and `served` are both "this went well", just at
 * different points in the flow, so they share `success`; the text (not the
 * colour) is what tells them apart, which is also what keeps this readable
 * without colour vision.
 */
const STATUS_TONE: Record<OrderStatusModel, string> = {
  received: "bg-info text-info-foreground",
  preparing: "bg-warning text-warning-foreground",
  ready: "bg-success text-success-foreground",
  served: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

/**
 * Not shipped yet: a guest today has no order to have a status. Reserved for
 * a future ordering flow's order-tracking display.
 *
 * A Server Component — it only renders whichever of the five fixed statuses
 * it's given.
 */
export interface OrderStatusProps {
  status: OrderStatusModel;
  className?: string;
}

export function OrderStatus({ status, className }: OrderStatusProps) {
  const t = useTranslations("Ordering");

  return (
    <span
      data-slot="order-status"
      data-ordering=""
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_TONE[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
