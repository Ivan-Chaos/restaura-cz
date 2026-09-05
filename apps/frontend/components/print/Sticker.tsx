import { SafeImage } from "@/components/menu/SafeImage";
import type { ImageModel } from "@/lib/design-system/types";
import type { StickerDensity } from "@/lib/validation/print";
import { cn } from "@/lib/utils";

import { PoweredBy } from "./PoweredBy";
import { QrCode } from "./QrCode";

export interface StickerProps {
  /** Which table this sticker is for. Printed large; also encoded in the code. */
  tableNumber: number;
  /** Already-localized "Table 3". */
  tableLabel: string;
  /** What the QR code encodes: the public menu address plus the table number. */
  url: string;
  restaurantName: string;
  logo?: ImageModel;
  /** Already-localized "Scan to see the menu". */
  prompt: string;
  showBranding: boolean;
  /** How much room the chosen grid leaves. */
  density?: StickerDensity;
  className?: string;
}

/**
 * How each part scales as the grid tightens.
 *
 * The code takes a *larger* share of a small sticker, not a smaller one: it is
 * the only element that stops working if it shrinks past a point, whereas type
 * merely gets harder to read. At 16 up the code is most of the sticker, which
 * is the right trade — a guest scans it, they do not read it.
 */
const SIZES = {
  roomy: {
    logo: "size-12",
    name: "text-sm",
    prompt: "text-xs",
    qr: "w-3/5",
    table: "text-4xl",
    gap: "gap-2",
  },
  medium: {
    logo: "size-9",
    name: "text-xs",
    prompt: "text-xs",
    qr: "w-2/3",
    table: "text-2xl",
    gap: "gap-1.5",
  },
  tight: {
    logo: "size-7",
    name: "text-xs",
    prompt: "text-xs",
    qr: "w-4/5",
    table: "text-lg",
    gap: "gap-1",
  },
} as const;

/**
 * One table sticker: what a guest sitting down actually looks at.
 *
 * Ordered by what the guest needs in the order they need it — whose table this
 * is, what to do, the code to do it with, and which table they are at for when
 * they tell someone. The number stays the largest text on the sticker because
 * it is also read by staff, standing, from a step away.
 *
 * Everything but the code is themed: a Refined restaurant's stickers are set in
 * its serif, a Green Bar's on its board. The code is the one element that
 * cannot follow the theme, and `QrCode` is where that is enforced.
 */
export function Sticker({
  tableLabel,
  url,
  restaurantName,
  logo,
  prompt,
  showBranding,
  density = "roomy",
  className,
}: StickerProps) {
  const size = SIZES[density];

  return (
    <div
      data-slot="sticker"
      data-density={density}
      className={cn(
        "flex h-full flex-col items-center justify-between text-center",
        size.gap,
        className,
      )}
    >
      <div className={cn("flex min-h-0 flex-col items-center", size.gap)}>
        {logo ? (
          <SafeImage
            // A missing logo leaves the name standing alone, which is exactly
            // what a restaurant without a logo gets.
            fallback={
              <span className={cn("font-display leading-tight break-words", size.name)}>
                {restaurantName}
              </span>
            }
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            sizes="48px"
            className={cn("rounded-md object-cover", size.logo)}
          />
        ) : (
          <span className={cn("font-display leading-tight break-words", size.name)}>
            {restaurantName}
          </span>
        )}
        <span className={cn("text-muted-foreground leading-tight", size.prompt)}>
          {prompt}
        </span>
      </div>

      {/* The code is the sticker's reason to exist, so it takes the room. */}
      <div className={cn("max-w-full", size.qr)}>
        <QrCode value={url} label={`${restaurantName} — ${tableLabel}`} />
      </div>

      <div className="flex flex-col items-center">
        <span className={cn("font-display leading-none tabular-nums", size.table)}>
          {tableLabel}
        </span>
        {showBranding ? <PoweredBy /> : null}
      </div>
    </div>
  );
}
