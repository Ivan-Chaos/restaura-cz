import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import type { SpiceLevel as SpiceLevelValue } from "@/lib/design-system/types";

/**
 * How hot a dish is, 1–3.
 *
 * Repeated flames are the convention Czech menus use and guests read at a
 * glance. The icons are decorative: the whole control carries one accessible
 * name that states the level in words, so a screen-reader user hears
 * "Pálivost 2 ze 3" rather than "flame flame".
 */
export interface SpiceLevelProps extends Omit<ComponentProps<"span">, "children"> {
  level: SpiceLevelValue;
  max?: 3;
}

export function SpiceLevel({ level, max = 3, className, ...props }: SpiceLevelProps) {
  const t = useTranslations("Menu");

  // Level 0 is "not spicy", which is the default for almost every dish — saying
  // so on each one would be noise.
  if (level === 0) return null;

  return (
    <span
      data-slot="spice-level"
      role="img"
      aria-label={t("spiceLevel", { level })}
      className={cn("text-warning inline-flex items-center gap-0.5", className)}
      {...props}
    >
      {Array.from({ length: max }, (_, index) => (
        <Flame
          key={index}
          aria-hidden="true"
          className={cn("size-3.5", index >= level && "opacity-25")}
        />
      ))}
    </span>
  );
}
