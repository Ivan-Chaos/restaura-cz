import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/design-system/types";
import type { PriceTreatment } from "@/lib/menu-display/presentation";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { DietaryMarkerList } from "./DietaryMarkerList";
import { DishImage } from "./DishImage";
import { DishPrice } from "./DishPrice";
import { HighlightBadge } from "./HighlightBadge";
import { SpiceLevel } from "./SpiceLevel";

/**
 * The card's surface (feature 005).
 *
 * - `raised`: the classic lifted card on `surface-raised`.
 * - `glass`: translucent over the ambient field, with the theme's specular
 *   edge from `--shadow-card`. No backdrop blur here on purpose — the blur is
 *   paid once by the `MenuPanel` behind the grid, never per card (PR-003).
 * - `flat`: an editorial tile, no border, no shadow, just a tinted block.
 */
export type CardSurface = "raised" | "glass" | "flat";

/**
 * A dish, as a card.
 *
 * This is the unit of the menu, so it has to survive real data rather than the
 * tidy example: no photo, no description, a 120-character Czech name, a price
 * that is a range or "market price", six allergens, sold out. Each of those is
 * a normal state here, not an error path — the layout adapts instead of
 * reserving empty space.
 *
 * Sold-out dishes stay on the menu and stay fully readable. Hiding them would
 * leave a guest wondering whether they misremembered; the "Sold out" badge
 * answers the question in words, which is what FR-016 requires — the visual
 * treatment is only a hint on top of it.
 */
export interface DishCardProps extends Omit<ComponentProps<"article">, "children"> {
  item: MenuItem;
  /** `vertical` stacks image over text; `horizontal` puts a thumbnail beside it. */
  layout?: "vertical" | "horizontal";
  /** Set on the first card above the fold so its image is not lazy-loaded. */
  priority?: boolean;
  /** Slot for an action (used by the future ordering variant). */
  action?: ReactNode;
  surface?: CardSurface;
  priceTreatment?: PriceTreatment;
}

export function DishCard({
  item,
  layout = "vertical",
  priority,
  action,
  surface = "raised",
  priceTreatment,
  className,
  ...props
}: DishCardProps) {
  const availability = item.availability ?? "available";
  const isSoldOut = availability === "soldOut";
  const horizontal = layout === "horizontal";
  const treatment: PriceTreatment =
    priceTreatment ?? (surface === "glass" ? "chip" : surface === "flat" ? "bold" : "leader");

  return (
    <article
      data-slot="dish-card"
      data-surface={surface}
      data-sold-out={isSoldOut || undefined}
      className={cn(
        "flex overflow-hidden",
        surface === "raised" &&
          "bg-surface-raised text-surface-raised-foreground border-border shadow-card rounded-lg border",
        surface === "glass" &&
          "bg-surface-raised/55 text-surface-raised-foreground border-panel-border shadow-card rounded-xl border",
        surface === "flat" && "bg-surface-raised text-surface-raised-foreground rounded-lg",
        horizontal ? "flex-row items-stretch" : "flex-col",
        // A sold-out dish recedes, but NOT by dimming the card: an opacity on
        // the whole card multiplies through to the text and dropped
        // `--muted-foreground` to 3.4:1, below AA. Caught by the axe pass in
        // `tests/e2e/sample-menu.spec.ts`. The badge carries the meaning; the
        // flatter surface is only a hint, and only the photo is dimmed.
        isSoldOut && "shadow-none",
        className,
      )}
      {...props}
    >
      {item.image ? (
        <DishImage
          image={item.image}
          priority={priority}
          aspect={horizontal ? "1/1" : "4/3"}
          sizes={
            horizontal
              ? "96px"
              : "(min-width: 1024px) 320px, (min-width: 768px) 50vw, 100vw"
          }
          className={cn(
            horizontal && "w-24 shrink-0",
            // Dimming the photo is safe — it carries no text.
            isSoldOut && "opacity-60 saturate-50",
          )}
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              "font-display flex-1 leading-snug",
              surface === "flat" ? "text-lg font-bold tracking-tight" : "text-base font-medium",
              surface === "glass" && "font-semibold",
            )}
          >
            {item.name}
          </h3>
          {treatment === "leader" ? (
            <DishPrice price={item.price} treatment="bold" className="shrink-0 text-base" />
          ) : (
            <DishPrice price={item.price} treatment={treatment} className="shrink-0" />
          )}
        </div>

        {item.description ? (
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {item.description}
          </p>
        ) : null}

        {(item.highlights?.length ||
          item.spiceLevel ||
          availability !== "available") && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Two badges is the limit before the card stops reading as a dish
                and starts reading as a label collection. */}
            {item.highlights?.slice(0, 2).map((kind) => (
              <HighlightBadge key={kind} kind={kind} />
            ))}
            {item.spiceLevel ? <SpiceLevel level={item.spiceLevel} /> : null}
            <AvailabilityBadge status={availability} />
          </div>
        )}

        {(item.dietary?.length || item.allergens?.length) && (
          <DietaryMarkerList
            dietary={item.dietary}
            allergens={item.allergens}
            className="mt-auto"
          />
        )}

        {action ? <div className="mt-2">{action}</div> : null}
      </div>

    </article>
  );
}
