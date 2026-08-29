import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/design-system/types";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { DietaryMarkerList } from "./DietaryMarkerList";
import { HighlightBadge } from "./HighlightBadge";
import { Price } from "./Price";
import { SpiceLevel } from "./SpiceLevel";

/**
 * A dish, as a compact row.
 *
 * The card is right for food a guest chooses with their eyes. Drinks are not
 * that: nobody needs a photograph of a lager, and a list of twenty beers as
 * cards is a scroll marathon. This is the same information at a density that
 * suits a long, image-free list — dotted leader between name and price, the way
 * a printed menu sets it.
 */
export interface DishRowProps extends Omit<ComponentProps<"article">, "children"> {
  item: MenuItem;
  action?: ReactNode;
}

export function DishRow({ item, action, className, ...props }: DishRowProps) {
  const availability = item.availability ?? "available";
  const isSoldOut = availability === "soldOut";


  return (
    <article
      data-slot="dish-row"
      data-sold-out={isSoldOut || undefined}
      className={cn(
        "border-border flex flex-col gap-1 border-b py-3 last:border-b-0",
        // No opacity here either: dimming a row multiplies through to its text
        // and drops muted copy below AA. The badge carries the meaning.
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        {/* Two lines is enough for even the longest Czech dish name at 320px;
            the full text stays available on hover and to assistive tech. */}
        <h3
          className="font-display line-clamp-2 text-base leading-snug font-medium"
          title={item.name}
        >
          {item.name}
        </h3>
        <span aria-hidden="true" className="border-border flex-1 border-b border-dotted" />
        {/* Variant prices ("0,3 l 45 Kč · 0,5 l 59 Kč") are long; at large text
            sizes they must wrap under the name instead of widening the row. */}
        <Price price={item.price} size="sm" emphasis />
      </div>

      {item.description ? (
        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
          {item.description}
        </p>
      ) : null}

      {(item.highlights?.length ||
        item.spiceLevel ||
        item.dietary?.length ||
        item.allergens?.length ||
        availability !== "available") && (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.highlights?.slice(0, 2).map((kind) => (
            <HighlightBadge key={kind} kind={kind} />
          ))}
          {item.spiceLevel ? <SpiceLevel level={item.spiceLevel} /> : null}
          <AvailabilityBadge status={availability} />
          <DietaryMarkerList dietary={item.dietary} allergens={item.allergens} />
        </div>
      )}

      {action ? <div className="mt-1">{action}</div> : null}
    </article>
  );
}
