import { useId } from "react";

import { qrModules, QUIET_ZONE_MODULES } from "@/lib/pdf/qr";
import { cn } from "@/lib/utils";

export interface QrCodeProps {
  /** What the code encodes. */
  value: string;
  /** Describes the code to assistive technology; never rendered visually. */
  label: string;
  className?: string;
}

/**
 * A QR code, drawn as a vector and coloured by tokens.
 *
 * Two rules make a printed code actually scan, and both are expressed here:
 *
 * - **Dark on light, always.** `qr-foreground` on `qr-surface` are near-black
 *   on near-white in every theme and both appearances, because a camera reads
 *   contrast and many scanners refuse an inverted code outright. A style whose
 *   ground is dark — Green Bar's board — would otherwise print a code nobody
 *   can scan.
 * - **The quiet zone is part of the code.** Four blank modules on every side is
 *   what lets a scanner find the edges. It is padding on the tile rather than
 *   whitespace someone might crop away.
 *
 * The path is filled with `currentColor` so the colour comes from the token on
 * the tile, which is what keeps this component free of a literal value.
 *
 * A Server Component: the matrix is computed once, on the server, into markup.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
  const titleId = useId();
  const { size, path } = qrModules(value);

  // The viewBox is widened by the quiet zone and the code is drawn offset into
  // the middle of it, so the blank margin scales with the code instead of being
  // a padding value that has to be re-tuned per print size.
  const extent = size + QUIET_ZONE_MODULES * 2;

  return (
    <svg
      data-slot="qr-code"
      role="img"
      aria-labelledby={titleId}
      viewBox={`0 0 ${extent} ${extent}`}
      // Modules are whole pixels; anti-aliasing their edges is what turns a
      // crisp code into a blurry one at small print sizes.
      shapeRendering="crispEdges"
      className={cn("bg-qr-surface text-qr-foreground size-full rounded-md", className)}
    >
      <title id={titleId}>{label}</title>
      <g transform={`translate(${QUIET_ZONE_MODULES} ${QUIET_ZONE_MODULES})`}>
        <path d={path} fill="currentColor" />
      </g>
    </svg>
  );
}
