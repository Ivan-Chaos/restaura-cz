import { cva, type VariantProps } from "class-variance-authority";
import { useLocale, useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { formatMoney, formatPriceLabel } from "@/lib/design-system/price";
import type { PriceModel } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

import { PriceList } from "./PriceList";

const priceVariants = cva("text-price font-body tabular-nums", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
    emphasis: {
      true: "font-semibold",
      false: "font-normal",
    },
  },
  defaultVariants: { size: "md", emphasis: false },
});

export interface PriceProps
  extends Omit<ComponentProps<"div">, "children">,
    VariantProps<typeof priceVariants> {
  price: PriceModel;
}

/**
 * Renders any of the four ways a menu states a price.
 *
 * Each kind gets its own visual treatment — a plain amount, a translated
 * "from …", "Market price", or a compact variant list — but a guest using a
 * screen reader needs to hear one coherent price, not fragments of markup
 * (spelled out for the "variants" case especially: a `<ul>` of label/amount
 * pairs reads naturally item by item, which is right when `PriceList` stands
 * alone on a dish card, but wrong here where it's one price). So the whole
 * thing is announced once, from `formatPriceLabel`, while the visible markup is
 * hidden from assistive tech.
 *
 * That is done with a visually-hidden span rather than `aria-label` on the
 * wrapper: `aria-label` is prohibited on a generic element with no role, so the
 * obvious version is invalid ARIA and axe rejects it. `role="img"` would be
 * valid but makes a screen reader announce a price as an image.
 */
export function Price({ price, size, emphasis, className, ...props }: PriceProps) {
  const locale = useLocale();
  const t = useTranslations("Price");

  const label = formatPriceLabel(locale, price, {
    from: (amount) => t("from", { price: amount }),
    marketPrice: t("marketPrice"),
  });

  // A plain switch, not nested ternaries, so TypeScript narrows the
  // discriminated union per branch.
  let visual;
  switch (price.kind) {
    case "single":
      visual = formatMoney(locale, price.amount);
      break;
    case "from":
      visual = t("from", { price: formatMoney(locale, price.amount) });
      break;
    case "market":
      visual = t("marketPrice");
      break;
    case "variants":
      visual = <PriceList variants={price.variants} layout="inline" />;
      break;
  }

  return (
    <div
      data-slot="price"
      className={cn(
        priceVariants({ size, emphasis }),
        // `relative` contains the visually-hidden span below, which is
        // absolutely positioned; without it the span escapes any horizontally
        // scrolling ancestor and widens the page.
        "relative inline-flex items-baseline",
        className,
      )}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="contents">
        {visual}
      </span>
    </div>
  );
}
