import type { CSSProperties } from "react";

import type { Locale } from "@/i18n/routing";
import type { ImageModel } from "@/lib/design-system/types";
import { publicMenuUrl } from "@/lib/pdf/sticker-url";
import {
  stickerDensity,
  stickerLayout,
  stickerPageCount,
  type StickersPerPage,
} from "@/lib/validation/print";
import { cn } from "@/lib/utils";

import { Sticker } from "./Sticker";

export interface StickerSheetProps {
  /** How many stickers the owner asked for. Validated to 1–200 upstream. */
  count: number;
  /** How densely they sit on a sheet: 2, 4, 6, 9, 12 or 16. */
  perPage: StickersPerPage;
  locale: Locale;
  /** The published menu's public address component. */
  slug: string;
  restaurantName: string;
  logo?: ImageModel;
  /** Already-localized "Scan to see the menu". */
  prompt: string;
  /** Already-localized, per table: `(3) => "Table 3"`. */
  tableLabel: (tableNumber: number) => string;
  showBranding: boolean;
}

/** Inner margin per cell, tightening as the cells get smaller. */
const PADDING: Record<ReturnType<typeof stickerDensity>, string> = {
  roomy: "6mm",
  medium: "4mm",
  tight: "3mm",
};

/**
 * A printable sheet of numbered table stickers.
 *
 * The owner chooses the density, and the grid follows: 2 up gives half-page
 * stickers, 16 up gives a 4 × 4 of business-card-sized ones. The sheet is
 * printed edge to edge, so a cell is simply A4 divided by the grid, and the
 * dashed guides fall on the edges cells share — never on the paper's own edge,
 * which is already a cut.
 *
 * Every cell is the same fixed size whatever is in it, which is what makes one
 * set of cut lines correct across the whole sheet. A last page that is not full
 * leaves its remaining cells genuinely empty: no border, no placeholder,
 * nothing to cut around.
 *
 * A Server Component; the codes are computed into markup.
 */
export function StickerSheet({
  count,
  perPage,
  locale,
  slug,
  restaurantName,
  logo,
  prompt,
  tableLabel,
  showBranding,
}: StickerSheetProps) {
  const { columns, rows } = stickerLayout(perPage);
  const density = stickerDensity(perPage);
  const pages = stickerPageCount(count, perPage);

  const sheetStyle = {
    "--sticker-columns": columns,
    "--sticker-rows": rows,
    "--sticker-padding": PADDING[density],
  } as CSSProperties;

  return (
    <>
      {Array.from({ length: pages }, (_page, pageIndex) => (
        <section
          key={pageIndex}
          data-slot="sticker-page"
          data-per-page={perPage}
          style={sheetStyle}
          className="print-page bg-background text-foreground"
        >
          {Array.from({ length: perPage }, (_cell, cellIndex) => {
            const tableNumber = pageIndex * perPage + cellIndex + 1;
            const lastColumn = cellIndex % columns === columns - 1;
            const lastRow = Math.floor(cellIndex / columns) === rows - 1;

            if (tableNumber > count) {
              return <div key={cellIndex} className="print-cell print-cell-empty" />;
            }

            return (
              <div
                key={cellIndex}
                className={cn(
                  "print-cell",
                  !lastColumn && "print-cell-rule-right",
                  !lastRow && "print-cell-rule-bottom",
                )}
              >
                <Sticker
                  tableNumber={tableNumber}
                  tableLabel={tableLabel(tableNumber)}
                  url={publicMenuUrl(locale, slug, tableNumber)}
                  restaurantName={restaurantName}
                  logo={logo}
                  prompt={prompt}
                  showBranding={showBranding}
                  density={density}
                />
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
