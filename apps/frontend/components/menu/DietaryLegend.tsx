import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import {
  ALLERGENS,
  DIETARY_MARKER_LIST,
  DISH_WARNING_LIST,
  allergenByNumber,
  DIETARY_MARKERS,
  DISH_WARNINGS,
  type AllergenNumber,
  type DietaryMarkerId,
  type DishWarningId,
} from "@/lib/design-system/dietary";
import type { Menu } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

import { DIETARY_TONE_CLASSES } from "./DietaryMarker";

export interface DietaryLegendProps extends Omit<ComponentProps<"section">, "children"> {
  compact?: boolean;
  /**
   * Restricts the legend to what a particular menu actually declares.
   *
   * Omitted, every marker and all fourteen allergens are listed — which is
   * right for the design system's showcase and for a printed reference card,
   * and wrong for a real menu: a legend for allergens nobody declared tells
   * guests something untrue.
   */
  declares?: MenuDeclarations;
}

export interface MenuDeclarations {
  dietary: DietaryMarkerId[];
  allergens: AllergenNumber[];
  warnings: DishWarningId[];
}

/**
 * What a menu actually declares, gathered across every dish.
 *
 * Returned in catalogue order rather than first-seen order, so the legend reads
 * the same way whichever dish happened to be typed first, and so the allergen
 * numbers stay ascending as a guest expects to find them.
 */
export function declarationsOf(menu: Menu): MenuDeclarations {
  const dietary = new Set<DietaryMarkerId>();
  const allergens = new Set<AllergenNumber>();
  const warnings = new Set<DishWarningId>();

  for (const category of menu.categories) {
    for (const item of category.items) {
      item.dietary?.forEach((id) => dietary.add(id));
      item.allergens?.forEach((number) => allergens.add(number));
      item.warnings?.forEach((id) => warnings.add(id));
    }
  }

  return {
    dietary: DIETARY_MARKER_LIST.filter((marker) => dietary.has(marker.id)).map(
      (marker) => marker.id,
    ),
    allergens: ALLERGENS.filter((allergen) => allergens.has(allergen.number)).map(
      (allergen) => allergen.number,
    ),
    warnings: DISH_WARNING_LIST.filter((warning) => warnings.has(warning.id)).map(
      (warning) => warning.id,
    ),
  };
}

/** Whether there is anything at all to explain. */
export function hasDeclarations(declarations: MenuDeclarations): boolean {
  return (
    declarations.dietary.length > 0 ||
    declarations.allergens.length > 0 ||
    declarations.warnings.length > 0
  );
}

/**
 * The reference a guest checks when a marker or an allergen number on a dish
 * doesn't ring a bell — every dietary marker and all 14 EU allergen numbers,
 * spelled out, in one place. `compact` tightens the grid for a menu footer;
 * without it, the legend is meant to stand alone (its own page or dialog).
 */
export function DietaryLegend({
  compact = false,
  declares,
  className,
  ...props
}: DietaryLegendProps) {
  const tMenu = useTranslations("Menu");
  const tDietary = useTranslations("DietaryMarkers");
  const tWarnings = useTranslations("DishWarnings");
  const tAllergens = useTranslations("Allergens");

  const markers = declares
    ? declares.dietary.map((id) => DIETARY_MARKERS[id])
    : DIETARY_MARKER_LIST;
  const warnings = declares
    ? declares.warnings.map((id) => DISH_WARNINGS[id])
    : DISH_WARNING_LIST;
  const allergens = declares ? declares.allergens.map(allergenByNumber) : ALLERGENS;

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

      {markers.length > 0 ? (
      <ul className={gridClasses}>
        {markers.map((marker) => {
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
      ) : null}

      {warnings.length > 0 ? (
        <ul className={gridClasses}>
          {warnings.map((warning) => {
            const Icon = warning.icon;
            return (
              <li key={warning.id} className="flex min-w-0 items-center gap-1.5 text-sm">
                <Icon
                  aria-hidden="true"
                  className={cn("size-4", DIETARY_TONE_CLASSES[warning.tone])}
                />
                <span className="min-w-0 break-words">{tWarnings(warning.labelKey)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {allergens.length > 0 ? (
      <ul className={gridClasses}>
        {allergens.map((allergen) => (
          <li key={allergen.number} className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground tabular-nums">{allergen.number}</span>
            <span className="min-w-0 break-words">{tAllergens(allergen.labelKey)}</span>
          </li>
        ))}
      </ul>
      ) : null}
    </section>
  );
}
