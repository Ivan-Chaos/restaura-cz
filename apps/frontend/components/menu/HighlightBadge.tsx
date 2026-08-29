import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import type { Highlight } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

export interface HighlightBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  kind: Highlight;
}

/**
 * A promotional call-out ("Chef's pick", "New") riding alongside a dish name.
 * Always the theme's `highlight` token, never a status colour, so it can
 * never be mistaken for availability.
 */
export function HighlightBadge({ kind, className, ...props }: HighlightBadgeProps) {
  const t = useTranslations("Menu");

  return (
    <Badge
      data-slot="highlight-badge"
      className={cn("bg-highlight text-highlight-foreground", className)}
      {...props}
    >
      {t(`highlights.${kind}`)}
    </Badge>
  );
}
