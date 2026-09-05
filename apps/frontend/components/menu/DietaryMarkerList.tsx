import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  allergenByNumber,
  DIETARY_MARKERS,
  DISH_WARNINGS,
  type AllergenNumber,
  type DietaryMarkerId,
  type DishWarningId,
} from "@/lib/design-system/dietary";
import { cn } from "@/lib/utils";

import { DietaryMarker } from "./DietaryMarker";

export interface DietaryMarkerListProps extends Omit<ComponentProps<"div">, "children"> {
  dietary?: DietaryMarkerId[];
  allergens?: AllergenNumber[];
  /** Cautions. Shown ahead of the claims, and first to survive `max`. */
  warnings?: DishWarningId[];
  /** Total chips to show before the rest collapse into a "+N" chip. */
  max?: number;
}

/**
 * The at-a-glance strip on a dish card: dietary claims as small icons,
 * allergen numbers as chips — exactly how a Czech menu prints them, ready to
 * look up in `DietaryLegend`. Beyond `max` combined chips, the remainder
 * collapses into one "+N" chip; its Tooltip spells out what it's hiding
 * rather than making a guest count icons to find out.
 */
export function DietaryMarkerList({
  dietary = [],
  allergens = [],
  warnings = [],
  max,
  className,
  ...props
}: DietaryMarkerListProps) {
  const tDietary = useTranslations("DietaryMarkers");
  const tWarnings = useTranslations("DishWarnings");
  const tAllergens = useTranslations("Allergens");

  const entries = [
    // Warnings lead, and so are the last to be collapsed into "+N": a caution a
    // guest may need to act on outranks a claim they were only hoping for.
    ...warnings.map((id) => ({
      key: `warning-${id}`,
      label: tWarnings(DISH_WARNINGS[id].labelKey),
      node: (
        <DietaryMarker key={`warning-${id}`} kind="warning" id={id} showLabel={false} size="sm" />
      ),
    })),
    ...dietary.map((id) => ({
      key: `dietary-${id}`,
      label: tDietary(DIETARY_MARKERS[id].labelKey),
      node: <DietaryMarker key={`dietary-${id}`} id={id} showLabel={false} size="sm" />,
    })),
    ...allergens.map((number) => {
      const label = tAllergens(allergenByNumber(number).labelKey);
      return {
        key: `allergen-${number}`,
        label: `${number} – ${label}`,
        node: (
          <Badge key={`allergen-${number}`} variant="outline" aria-label={label} className="tabular-nums">
            {number}
          </Badge>
        ),
      };
    }),
  ];

  if (entries.length === 0) return null;

  const visible = typeof max === "number" ? entries.slice(0, max) : entries;
  const overflow = entries.slice(visible.length);

  return (
    <div
      data-slot="dietary-marker-list"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...props}
    >
      {visible.map((entry) => entry.node)}
      {overflow.length > 0 ? (
        // Its own provider rather than relying on one further up the tree —
        // a "+N" chip should never wait 600ms to reveal what it's hiding.
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant="outline"
                  aria-label={tDietary("more", { count: overflow.length })}
                />
              }
            >
              +{overflow.length}
            </TooltipTrigger>
            <TooltipContent>
              <span className="flex flex-col gap-0.5">
                {overflow.map((entry) => (
                  <span key={entry.key}>{entry.label}</span>
                ))}
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
