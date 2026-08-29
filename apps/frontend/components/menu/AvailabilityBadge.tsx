import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import type { Availability } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

/** `available` gets no colour of its own — it's the default, unmarked state —
 * `limited` reads as a caution and `soldOut` as neutral fact, never colour
 * alone: the word itself ("Only a few left", "Sold out") always ships too. */
const TONE_CLASSES: Record<Availability, string> = {
  available: "bg-success text-success-foreground",
  limited: "bg-warning text-warning-foreground",
  soldOut: "bg-muted text-muted-foreground",
};

export interface AvailabilityBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  status: Availability;
  /** `available` is the common case and would clutter every dish card if shown by default. */
  showAvailable?: boolean;
}

export function AvailabilityBadge({
  status,
  showAvailable = false,
  className,
  ...props
}: AvailabilityBadgeProps) {
  const t = useTranslations("Availability");

  if (status === "available" && !showAvailable) return null;

  return (
    <Badge
      data-slot="availability-badge"
      className={cn(TONE_CLASSES[status], className)}
      {...props}
    >
      {t(status)}
    </Badge>
  );
}
