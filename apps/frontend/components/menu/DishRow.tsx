import type { ComponentProps, ReactNode } from "react";

import type { MenuItem } from "@/lib/design-system/types";
import type { DishLayout, PriceTreatment } from "@/lib/menu-display/presentation";
import { cn } from "@/lib/utils";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { DietaryMarkerList } from "./DietaryMarkerList";
import { DishPrice } from "./DishPrice";
import { HighlightBadge } from "./HighlightBadge";
import { SpiceLevel } from "./SpiceLevel";

/**
 * A dish, as a compact row.
 *
 * The card is right for food a guest chooses with their eyes. Drinks are not
 * that: nobody needs a photograph of a lager, and a list of twenty beers as
 * cards is a scroll marathon. This is the same information at a density that
 * suits a long, image-free list.
 *
 * `layout` (feature 005) decides the *shape* of the row: the classic dotted
 * leader between name and price, a quiet ledger with the price right-aligned,
 * a pub board with a big brass figure, an editorial row with a heavy title, or
 * a centred fine-dining stack with the price beneath. The theme in scope still
 * owns every colour and face.
 */
export interface DishRowProps extends Omit<ComponentProps<"article">, "children"> {
  item: MenuItem;
  action?: ReactNode;
  layout?: DishLayout;
  priceTreatment?: PriceTreatment;
}

export function DishRow({
  item,
  action,
  layout = "rows",
  priceTreatment,
  className,
  ...props
}: DishRowProps) {
  const availability = item.availability ?? "available";
  const isSoldOut = availability === "soldOut";
  const centered = layout === "centered";
  const leader = layout === "rows" || layout === "board";

  const treatment: PriceTreatment =
    priceTreatment ??
    (layout === "ledger"
      ? "right"
      : layout === "glass"
        ? "chip"
        : layout === "board" || layout === "editorial"
          ? "bold"
          : centered
            ? "below"
            : "leader");

  const hasMeta = Boolean(
    item.highlights?.length ||
      item.spiceLevel ||
      item.dietary?.length ||
      item.allergens?.length ||
      item.warnings?.length ||
      availability !== "available",
  );

  return (
    <article
      data-slot="dish-row"
      data-layout={layout}
      data-sold-out={isSoldOut || undefined}
      className={cn(
        "flex flex-col gap-1",
        layout === "rows" && "border-border border-b py-3 last:border-b-0",
        layout === "ledger" && "border-border border-b py-3 last:border-b-0",
        layout === "glass" && "border-panel-border border-b py-3 last:border-b-0",
        layout === "board" && "border-border border-b border-dashed py-2.5 last:border-b-0",
        layout === "editorial" && "border-border border-b py-4 last:border-b-0",
        centered && "items-center py-5 text-center",
        // No opacity here: dimming a row multiplies through to its text and
        // drops muted copy below AA. The badge carries the meaning.
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-2",
          layout === "ledger" && "justify-between gap-x-4",
          layout === "editorial" && "justify-between gap-x-4",
          centered && "flex-col items-center gap-1",
        )}
      >
        {/* Two lines is enough for even the longest Czech dish name at 320px;
            the full text stays available on hover and to assistive tech. */}
        <h3
          className={cn(
            "font-display line-clamp-2 leading-snug",
            layout === "rows" && "text-base font-medium",
            layout === "ledger" && "text-base font-medium",
            layout === "glass" && "text-base font-semibold",
            layout === "board" && "text-lg tracking-wide uppercase",
            layout === "editorial" && "text-lg font-bold tracking-tight",
            centered && "text-xl",
          )}
          title={item.name}
        >
          {item.name}
        </h3>
        {leader ? (
          <span
            aria-hidden="true"
            className={cn(
              "border-border flex-1 border-b",
              layout === "board" ? "border-dashed" : "border-dotted",
            )}
          />
        ) : null}
        {/* Variant prices ("0,3 l 45 Kč · 0,5 l 59 Kč") are long; at large text
            sizes they must wrap under the name instead of widening the row. */}
        {!centered ? <DishPrice price={item.price} treatment={treatment} /> : null}
      </div>

      {item.description ? (
        <p
          className={cn(
            "text-muted-foreground line-clamp-2 leading-relaxed",
            layout === "board" ? "text-xs" : "text-sm",
            centered && "max-w-prose italic",
          )}
        >
          {item.description}
        </p>
      ) : null}

      {centered ? <DishPrice price={item.price} treatment={treatment} className="mt-1" /> : null}

      {hasMeta ? (
        <div
          className={cn("flex flex-wrap items-center gap-1.5", centered && "justify-center")}
        >
          {item.highlights?.slice(0, 2).map((kind) => (
            <HighlightBadge key={kind} kind={kind} />
          ))}
          {item.spiceLevel ? <SpiceLevel level={item.spiceLevel} /> : null}
          <AvailabilityBadge status={availability} />
          <DietaryMarkerList
            dietary={item.dietary}
            allergens={item.allergens}
            warnings={item.warnings}
          />
        </div>
      ) : null}

      {action ? <div className="mt-1">{action}</div> : null}
    </article>
  );
}
