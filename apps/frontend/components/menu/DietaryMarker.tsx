import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { DIETARY_MARKERS, type DietaryMarkerId } from "@/lib/design-system/dietary";
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

export interface DietaryMarkerProps extends Omit<ComponentProps<"span">, "children"> {
  id: DietaryMarkerId;
  showLabel?: boolean;
  size?: "sm" | "md";
}

/**
 * One dietary claim — icon plus label. When `showLabel` is false the label
 * doesn't disappear, it moves to a visually-hidden span, so the icon still
 * has an accessible name rather than announcing as nothing.
 */
export function DietaryMarker({
  id,
  showLabel = true,
  size = "md",
  className,
  ...props
}: DietaryMarkerProps) {
  const t = useTranslations("DietaryMarkers");
  const marker = DIETARY_MARKERS[id];
  const Icon = marker.icon;
  const label = t(marker.labelKey);

  return (
    <span
      data-slot="dietary-marker"
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
