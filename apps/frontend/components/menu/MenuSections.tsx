import { Grid } from "@/components/layout/Grid";
import type { MenuCategory } from "@/lib/design-system/types";
import { usesCards, type Presentation } from "@/lib/menu-display/presentation";
import { cn } from "@/lib/utils";

import { CategoryHeading } from "./CategoryHeading";
import { DishCard } from "./DishCard";
import { DishRow } from "./DishRow";
import { MenuPanel } from "./MenuPanel";

export interface MenuSectionsProps {
  categories: MenuCategory[];
  presentation: Presentation;
  /**
   * Paper. Keeps a dish whole and stops a section heading ending a page alone
   * (feature 007). The classes are inert on screen, so the guest page renders
   * exactly what it did before this prop existed.
   */
  avoidPageBreaks?: boolean;
}

/**
 * The body of a menu: every category, its heading, and its dishes.
 *
 * Extracted from `GuestMenu` so the printable document is the *same* markup
 * rather than a second copy that drifts. The two callers differ only in what
 * surrounds this — the guest page adds a nav, a language switcher and an
 * appearance toggle; the printed one adds a running header and a branding line
 * — and neither has an opinion about how a category is laid out.
 *
 * Rows or cards is decided **per category**, by whether anything in it has a
 * photograph (feature 006). A category of plain dishes stays a list, which is
 * what a long drinks section wants; one with pictures becomes cards, because a
 * photograph needs a card to sit in.
 *
 * A Server Component with no state.
 */
export function MenuSections({
  categories,
  presentation,
  avoidPageBreaks = false,
}: MenuSectionsProps) {
  return (
    <>
      {categories.map((category, index) => {
        const photographed = category.items.some((item) => item.image);
        const layout = photographed ? presentation.cards : presentation.rows;
        // Classic keeps its own rule — photographed food as cards, plain lists
        // as rows — because its two layouts are both "rows" and the difference
        // it cares about is the picture, not the recipe.
        const asCards = presentation.id === "classic" ? photographed : usesCards(layout);

        const body = asCards ? (
          <Grid cols={{ base: 1, md: 2 }} gap={4}>
            {category.items.map((item, itemIndex) => (
              <DishCard
                key={item.id}
                item={item}
                surface={
                  layout === "glass" ? "glass" : layout === "editorial" ? "flat" : "raised"
                }
                priceTreatment={presentation.id === "classic" ? undefined : presentation.price}
                // Only the first photograph is worth pre-loading; every other
                // one is below the fold on any supported viewport.
                priority={index === 0 && itemIndex === 0}
                className={cn(avoidPageBreaks && "print-avoid-break")}
              />
            ))}
          </Grid>
        ) : (
          <div>
            {category.items.map((item) => (
              <DishRow
                key={item.id}
                item={item}
                layout={layout}
                priceTreatment={presentation.price}
                className={cn(avoidPageBreaks && "print-avoid-break")}
              />
            ))}
          </div>
        );

        return (
          <section
            key={category.id}
            id={category.id}
            aria-labelledby={`${category.id}-heading`}
            className="scroll-mt-20 py-6"
          >
            <CategoryHeading
              id={`${category.id}-heading`}
              name={category.name}
              count={category.items.length}
              style={presentation.section}
              index={index}
              className={cn(avoidPageBreaks && "print-keep-with-next")}
            />
            {presentation.panel ? <MenuPanel>{body}</MenuPanel> : body}
          </section>
        );
      })}
    </>
  );
}
