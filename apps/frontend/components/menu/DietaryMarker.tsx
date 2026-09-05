import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import {
  DIETARY_MARKERS,
  DISH_WARNINGS,
  type DietaryMarkerId,
  type DishWarningId,
} from "@/lib/design-system/dietary";
import { cn } from "@/lib/utils";

/**
 * Maps a marker's `tone` to a colour token. Exported so `DietaryLegend` can
 * colour its icons the same way without guessing at the mapping again.
 *
 * Colour is decoration only here — every marker also has a distinct icon
 * shape and a translated label, so a colour-blind guest or a screen reader
 * user reads the same information as everyone else.
 */
export const DIETARY_TONE_CLASSES: Record<"success" | "warning" | "neutral", string> = {
  success: "text-success",
  warning: "text-warning",
  neutral: "text-muted-foreground",
};

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "size-3.5",
  md: "size-4",
};

interface MarkerBaseProps extends Omit<ComponentProps<"span">, "children"> {
  showLabel?: boolean;
  size?: "sm" | "md";
}

/**
 * Two vocabularies, one component, because a guest reads them as one strip and
 * they must never differ in size, spacing or how the label is hidden. The
 * discriminant keeps the id and its catalogue from being mismatched.
 */
export type DietaryMarkerProps = MarkerBaseProps &
  ({ kind?: "dietary"; id: DietaryMarkerId } | { kind: "warning"; id: DishWarningId });

/**
 * One dietary claim — icon plus label. When `showLabel` is false the label
 * doesn't disappear, it moves to a visually-hidden span, so the icon still
 * has an accessible name rather than announcing as nothing.
 */
export function DietaryMarker({
  id,
  kind = "dietary",
  showLabel = true,
  size = "md",
  className,
  ...props
}: DietaryMarkerProps) {
  // Both namespaces are read unconditionally: `useTranslations` is a hook, so
  // choosing one inside a branch would change the hook order between renders.
  const tMarkers = useTranslations("DietaryMarkers");
  const tWarnings = useTranslations("DishWarnings");

  const marker =
    kind === "warning"
      ? DISH_WARNINGS[id as DishWarningId]
      : DIETARY_MARKERS[id as DietaryMarkerId];
  const Icon = marker.icon;
  const label =
    kind === "warning"
      ? tWarnings(marker.labelKey as DishWarningId)
      : tMarkers(marker.labelKey as DietaryMarkerId);

  return (
    <span
      data-slot="dietary-marker"
      data-kind={kind}
      className={cn(
        // `relative` is load-bearing: the label below falls back to `sr-only`,
        // which is `position: absolute`. Without a positioned ancestor its
        // containing block is the page, so inside a horizontally scrolling
        // region (the specials strip) it escapes the scroll container and drags
        // the whole document sideways. Caught by the 320px e2e check.
        "relative inline-flex items-center gap-1",
        DIETARY_TONE_CLASSES[marker.tone],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={SIZE_CLASSES[size]} />
      <span className={cn("text-sm", !showLabel && "sr-only")}>{label}</span>
    </span>
  );
}
