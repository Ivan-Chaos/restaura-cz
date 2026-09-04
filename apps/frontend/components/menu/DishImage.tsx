import { UtensilsCrossed } from "lucide-react";

import { SafeImage } from "@/components/menu/SafeImage";
import type { ImageModel } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

export interface DishImageProps {
  image?: ImageModel;
  aspect?: "4/3" | "1/1" | "16/9";
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Tailwind ships `aspect-square` and `aspect-video` but no built-in 4:3
 * utility, and a one-off ratio isn't worth a palette/theme addition. "4/3"
 * therefore needs no forced box at all: it's the ratio the sample photography
 * already ships in, so the image's own `width`/`height` reserve the space —
 * the same mechanism `next/image` always relies on to avoid layout shift.
 * The no-image placeholder has no intrinsic size to fall back on, so it
 * always gets a real box; `aspect-square` is the closest built-in stand-in
 * for the 4:3 case.
 */
const PLACEHOLDER_BOX_CLASSES: Record<"4/3" | "1/1" | "16/9", string> = {
  "4/3": "aspect-square",
  "1/1": "aspect-square",
  "16/9": "aspect-video",
};

const FILLED_BOX_CLASSES: Record<"1/1" | "16/9", string> = {
  "1/1": "aspect-square",
  "16/9": "aspect-video",
};

/**
 * How wide a dish photo is actually drawn, so the optimiser is asked for that
 * size rather than for the full 1600px rendition.
 *
 * Three across on a wide screen, one across on a phone — which is what keeps a
 * photographed menu inside its delivered-bytes budget on a real connection
 * (feature 006, PR-002).
 */
const DEFAULT_SIZES = "(min-width: 768px) 33vw, 100vw";

/**
 * The warm placeholder every dish without a photo gets — never a blank gap,
 * since the grid still needs a stable shape. The icon is purely decorative
 * (there is nothing here for a screen reader to read), so it stays out of the
 * accessibility tree entirely.
 */
function Placeholder({ aspect, className }: { aspect: "4/3" | "1/1" | "16/9"; className?: string }) {
  return (
    <div
      data-slot="dish-image"
      className={cn(
        "flex w-full items-center justify-center rounded-lg bg-muted",
        PLACEHOLDER_BOX_CLASSES[aspect],
        className,
      )}
    >
      <UtensilsCrossed aria-hidden="true" className="size-8 text-muted-foreground" />
    </div>
  );
}

/**
 * A dish photo, or the placeholder.
 *
 * Photos now come from owner uploads (feature 006), which means a stored object
 * can go missing — so the image renders through `SafeImage` and falls back to
 * the very same placeholder a dish without a photo gets. A guest never sees a
 * broken image, and a menu with one missing file still looks deliberate.
 */
export function DishImage({ image, aspect = "4/3", priority, sizes, className }: DishImageProps) {
  if (!image) {
    return <Placeholder aspect={aspect} className={className} />;
  }

  const fallback = <Placeholder aspect={aspect} className={className} />;

  if (aspect === "4/3") {
    return (
      <SafeImage
        fallback={fallback}
        data-slot="dish-image"
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        sizes={sizes ?? DEFAULT_SIZES}
        className={cn("h-auto w-full rounded-lg object-cover", className)}
      />
    );
  }

  return (
    <div
      data-slot="dish-image"
      className={cn("relative w-full overflow-hidden rounded-lg bg-muted", FILLED_BOX_CLASSES[aspect], className)}
    >
      <SafeImage
        fallback={
          <span className="flex size-full items-center justify-center">
            <UtensilsCrossed aria-hidden="true" className="size-8 text-muted-foreground" />
          </span>
        }
        src={image.src}
        alt={image.alt}
        fill
        priority={priority}
        sizes={sizes ?? DEFAULT_SIZES}
        className="object-cover"
      />
    </div>
  );
}
