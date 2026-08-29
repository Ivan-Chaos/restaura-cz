"use client";

import { useTranslations } from "next-intl";

import { DishCard } from "@/components/menu/DishCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/design-system/types";

import { QuantityStepper } from "./QuantityStepper";

/**
 * A dish card that can be chosen — the bridge between browsing and ordering.
 *
 * **Not shipped.** The product today is menus only; this exists so a later
 * revision adds ordering as an extension of the menu rather than a second
 * visual language. `app/**` is forbidden from importing it (ESLint) and the
 * guest menu is asserted to render zero `[data-ordering]` elements.
 *
 * It *wraps* `DishCard` rather than reimplementing it. That is the whole point
 * of FR-014c: a dish must look identical whether it is being browsed or
 * selected, and the only way to guarantee that is to have one implementation.
 * The action lives in `DishCard`'s `action` slot, which is reserved for exactly
 * this.
 */
export interface SelectableDishCardProps {
  item: MenuItem;
  selected?: boolean;
  quantity?: number;
  onSelect?: () => void;
  onQuantityChange?: (next: number) => void;
  layout?: "vertical" | "horizontal";
  className?: string;
}

export function SelectableDishCard({
  item,
  selected = false,
  quantity = 1,
  onSelect,
  onQuantityChange,
  layout,
  className,
}: SelectableDishCardProps) {
  const t = useTranslations("Ordering");
  const soldOut = item.availability === "soldOut";

  return (
    <DishCard
      item={item}
      layout={layout}
      data-ordering=""
      data-selected={selected || undefined}
      className={cn(
        // A selected card is outlined rather than tinted: a tint would fight
        // whatever surface the active theme gives the card.
        selected && "ring-ring ring-2",
        className,
      )}
      action={
        // The slot always renders, even when empty, so selecting a dish does
        // not change the card's height and reflow the grid under the guest's
        // finger (FR-014c: layout identical to the browse-only card).
        <div className="flex min-h-8 items-center justify-end">
          {soldOut ? null : selected && onQuantityChange ? (
            <QuantityStepper
              value={quantity}
              onChange={onQuantityChange}
              label={`${t("quantity")}: ${item.name}`}
            />
          ) : (
            <Button
              type="button"
              size="sm"
              variant={selected ? "secondary" : "default"}
              onClick={onSelect}
              // The dish name is in the accessible name because a screen-reader
              // user tabbing through a grid hears a list of identical "Add"
              // buttons otherwise.
              aria-label={`${t("add")}: ${item.name}`}
            >
              {selected ? t("selected") : t("add")}
            </Button>
          )}
        </div>
      }
    />
  );
}
