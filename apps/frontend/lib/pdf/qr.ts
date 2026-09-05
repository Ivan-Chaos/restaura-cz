import { create } from "qrcode";

/**
 * A QR code as geometry, not as a picture.
 *
 * The `qrcode` package can emit its own SVG, but that SVG carries hard-coded
 * colours — and a sticker has to be printed in the restaurant's chosen style,
 * where the only sanctioned way to say "dark" is a token. So we take the module
 * matrix and draw the path ourselves, filled with `currentColor`; the component
 * that renders it sets that colour from `--qr-foreground`.
 *
 * Drawing it as a path also keeps the code a vector in the PDF: it stays crisp
 * at any print size and costs a fraction of what a rasterised image would.
 */

/**
 * Error correction level Q recovers about a quarter of the code.
 *
 * A table sticker is a printed object living on a surface people eat at: it
 * gets wet, scratched, and partly covered by a napkin. The redundancy is what
 * keeps it scanning after that, and it costs only a slightly denser grid.
 */
const ERROR_CORRECTION_LEVEL = "Q";

/**
 * The mandatory margin of blank surface around a code. Four modules is what the
 * spec requires; without it, scanners struggle to find the code's edges.
 */
export const QUIET_ZONE_MODULES = 4;

export interface QrMatrix {
  /** Width of the code in modules, excluding the quiet zone. */
  size: number;
  /** SVG path data in module units, for a `viewBox` of `0 0 size size`. */
  path: string;
}

export function qrModules(value: string): QrMatrix {
  const { modules } = create(value, { errorCorrectionLevel: ERROR_CORRECTION_LEVEL });
  const { size, data } = modules;

  const parts: string[] = [];

  // One `h`-run per horizontal stretch of dark modules rather than one square
  // each: same picture, a fraction of the path data, which matters when 200
  // codes share a document.
  for (let row = 0; row < size; row += 1) {
    let runStart = -1;

    for (let col = 0; col <= size; col += 1) {
      const dark = col < size && data[row * size + col] === 1;

      if (dark && runStart === -1) {
        runStart = col;
      } else if (!dark && runStart !== -1) {
        parts.push(`M${runStart} ${row}h${col - runStart}v1h-${col - runStart}z`);
        runStart = -1;
      }
    }
  }

  return { size, path: parts.join("") };
}
