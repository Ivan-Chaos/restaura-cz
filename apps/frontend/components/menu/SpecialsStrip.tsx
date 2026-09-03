import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/design-system/types";
import type { PriceTreatment } from "@/lib/menu-display/presentation";

import { DishCard, type CardSurface } from "./DishCard";

/**
 * Today's specials, as a horizontally scrolling strip.
 *
 * A specials rail earns its space only when there is something in it — an empty
 * "Today's specials" heading tells a guest the restaurant forgot to update the
 * menu, so this renders nothing rather than an empty shell.
 *
 * Scroll snapping makes the strip feel deliberate on a phone; on wider screens
 * the cards simply sit in a row.
 */
export interface SpecialsStripProps extends Omit<ComponentProps<"section">, "title"> {
  title: string;
  items: MenuItem[];
  id?: string;
  /** Card surface and price placement, so the strip follows the page's recipe. */
  surface?: CardSurface;
  priceTreatment?: PriceTreatment;
}

export function SpecialsStrip({
  title,
  items,
  id,
  surface,
  priceTreatment,
  className,
  ...props
}: SpecialsStripProps) {
  if (items.length === 0) return null;

  const headingId = `${id ?? "specials"}-heading`;

  return (
    <section
      id={id}
      data-slot="specials-strip"
      aria-labelledby={headingId}
      className={cn("py-4", className)}
      {...props}
    >
      <h2 id={headingId} className="font-display mb-3 px-4 text-xl leading-tight">
        {title}
      </h2>

      {/*
        `tabIndex={0}` is not decoration: the strip scrolls horizontally but
        contains nothing focusable (a dish card is not a control in a menus-only
        product), so without it a keyboard user simply cannot reach the specials
        past the first one. Making the region itself focusable lets them scroll
        it with the arrow keys. It takes its accessible name from the section
        heading — but keeps its implicit `list` role: overriding it with
        `role="group"` orphans the `<li>` children, which axe rightly rejects.

        `relative` establishes a containing block so anything absolutely
        positioned inside — notably `sr-only` labels — stays inside the scroll
        container instead of widening the page.
      */}
      <ul
        tabIndex={0}
        aria-labelledby={headingId}
        className="focus-visible:ring-ring relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 outline-none focus-visible:ring-2"
      >
        {items.map((item) => (
          <li
            key={item.id}
            // A fixed-ish width keeps cards comparable while still letting the
            // next one peek in, which is what invites the guest to scroll.
            className="w-64 shrink-0 snap-start"
          >
            <DishCard
              item={item}
              surface={surface}
              priceTreatment={priceTreatment}
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
