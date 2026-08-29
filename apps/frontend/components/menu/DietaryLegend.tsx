import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { ALLERGENS, DIETARY_MARKER_LIST } from "@/lib/design-system/dietary";
import { cn } from "@/lib/utils";

import { DIETARY_TONE_CLASSES } from "./DietaryMarker";

export interface DietaryLegendProps extends Omit<ComponentProps<"section">, "children"> {
  compact?: boolean;
}

/**
 * The reference a guest checks when a marker or an allergen number on a dish
 * doesn't ring a bell — every dietary marker and all 14 EU allergen numbers,
 * spelled out, in one place. `compact` tightens the grid for a menu footer;
 * without it, the legend is meant to stand alone (its own page or dialog).
 */
export function DietaryLegend({ compact = false, className, ...props }: DietaryLegendProps) {
  const tMenu = useTranslations("Menu");
  const tDietary = useTranslations("DietaryMarkers");
  const tAllergens = useTranslations("Allergens");

  const gridClasses = cn(
    "grid gap-x-4 gap-y-1.5",
    compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  );

  return (
    <section
      data-slot="dietary-legend"
      aria-labelledby="dietary-legend-heading"
      className={cn("flex flex-col", compact ? "gap-3" : "gap-4", className)}
      {...props}
    >
      <div>
        <h2
          id="dietary-legend-heading"
          className={cn("font-display", compact ? "text-base" : "text-lg")}
        >
          {tMenu("allergenLegend")}
        </h2>
        <p className="text-sm text-muted-foreground">{tAllergens("legendHint")}</p>
      </div>

      <ul className={gridClasses}>
        {DIETARY_MARKER_LIST.map((marker) => {
          const Icon = marker.icon;
          return (
            <li key={marker.id} className="flex min-w-0 items-center gap-1.5 text-sm">
              <Icon aria-hidden="true" className={cn("size-4", DIETARY_TONE_CLASSES[marker.tone])} />
              {/* Czech and German marker names are long single words; at a
                  200% system font size one of them is wider than a grid cell on
                  a 320px phone. Allowing a break keeps the page from scrolling
                  sideways, and costs nothing at normal sizes. */}
              <span className="min-w-0 break-words">{tDietary(marker.labelKey)}</span>
            </li>
          );
        })}
      </ul>

      <ul className={gridClasses}>
        {ALLERGENS.map((allergen) => (
          <li key={allergen.number} className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground tabular-nums">{allergen.number}</span>
            <span className="min-w-0 break-words">{tAllergens(allergen.labelKey)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
