import { useLocale, useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { formatMoney } from "@/lib/design-system/price";
import type { PriceVariant } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

export interface PriceListProps extends Omit<ComponentProps<"ul">, "children"> {
  variants: PriceVariant[];
  layout?: "inline" | "stacked";
}

/**
 * The label/amount pairs behind a `kind: "variants"` price — "0.3 l 32 Kč",
 * "0.5 l 45 Kč" — and equally usable on its own wherever a dish card wants to
 * show every size without going through `Price`. `inline` fits a single line
 * next to a dish name; `stacked` reads like a mini price list when there's
 * room for one.
 */
export function PriceList({
  variants,
  layout = "stacked",
  className,
  "aria-label": ariaLabel,
  ...props
}: PriceListProps) {
  const locale = useLocale();
  const t = useTranslations("Price");

  return (
    <ul
      data-slot="price-list"
      aria-label={ariaLabel ?? t("variants")}
      className={cn(
        "font-body",
        layout === "inline"
          ? "flex flex-wrap items-baseline gap-x-3 gap-y-1"
          : "flex flex-col gap-1",
        className,
      )}
      {...props}
    >
      {variants.map((variant) => (
        <li
          key={variant.label}
          className={cn(
            "flex items-baseline gap-1.5 text-sm",
            layout === "stacked" && "justify-between",
          )}
        >
          <span className="text-muted-foreground">{variant.label}</span>
          <span className="text-price tabular-nums">
            {formatMoney(locale, variant.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
