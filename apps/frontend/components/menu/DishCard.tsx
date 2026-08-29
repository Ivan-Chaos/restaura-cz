import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/design-system/types";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { DietaryMarkerList } from "./DietaryMarkerList";
import { DishImage } from "./DishImage";
import { HighlightBadge } from "./HighlightBadge";
import { Price } from "./Price";
import { SpiceLevel } from "./SpiceLevel";

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
}

export function DishCard({
  item,
  layout = "vertical",
  priority,
  action,
  className,
  ...props
}: DishCardProps) {
  const availability = item.availability ?? "available";
  const isSoldOut = availability === "soldOut";
  const horizontal = layout === "horizontal";

  return (
    <article
      data-slot="dish-card"
      data-sold-out={isSoldOut || undefined}
      className={cn(
        "bg-surface-raised text-surface-raised-foreground border-border shadow-card flex overflow-hidden rounded-lg border",
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
          <h3 className="font-display flex-1 text-base leading-snug font-medium">
            {item.name}
          </h3>
          <Price price={item.price} size="md" emphasis className="shrink-0" />
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
