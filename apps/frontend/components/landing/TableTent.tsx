import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * A drawn table tent: a folded card standing on a table, carrying a QR code.
 *
 * This is a drawing rather than a photograph because every stock photo of a
 * QR code we could find carried some other company's branding on the code or
 * the screen behind it — putting one on a commercial page would imply an
 * endorsement nobody gave. Drawing it also means showing *our* product instead
 * of somebody else's, and it costs no bytes and no licence.
 *
 * Colours come from `currentColor` and token utilities, so the illustration
 * re-themes with everything else instead of being a picture of one theme.
 */
export interface TableTentProps {
  className?: string;
}

/**
 * A fixed, decorative pattern — deliberately not a scannable code. A real QR
 * pointing at a real URL would rot; this only has to read as "a QR code".
 */
const CELLS = [
  0b1111111_0_1101111, 0b1000001_0_0100010, 0b1011101_0_1110101,
  0b1011101_0_0011010, 0b1011101_0_1100101, 0b1000001_0_0101110,
  0b1111111_0_1010101, 0b0000000_0_0000000, 0b1101011_0_1011011,
  0b0100100_0_1100110, 0b1110111_0_0101101, 0b0011010_0_1110010,
  0b1111111_0_1001011, 0b1000001_0_0110110, 0b1011101_0_1101001,
  0b1011101_0_0010111,
];
const GRID = 15;

export function TableTent({ className }: TableTentProps) {
  const t = useTranslations("Landing");

  return (
    <svg
      viewBox="0 0 320 260"
      role="img"
      aria-label={t("assets.qr.alt")}
      data-slot="table-tent"
      className={cn("text-foreground h-auto w-full", className)}
    >
      {/* Table surface */}
      <line
        x1="16"
        y1="228"
        x2="304"
        y2="228"
        className="stroke-border"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* The card's back panel, folded away from the reader */}
      <path
        d="M160 30 L262 52 L262 228 L160 214 Z"
        className="fill-muted stroke-border"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* The face the guest reads */}
      <path
        d="M160 30 L58 52 L58 228 L160 214 Z"
        className="fill-card stroke-border"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Everything on the face is drawn upright, then sheared onto it, so the
          QR grid below can be plain squares rather than a hand-built mesh. */}
      <g transform="translate(58 52) skewY(-8.5)">
        <rect
          x="24"
          y="18"
          width="54"
          height="54"
          rx="4"
          className="fill-surface-raised stroke-border"
          strokeWidth="1.5"
        />
        <g transform="translate(28 22)" className="fill-current">
          {CELLS.flatMap((row, y) =>
            Array.from({ length: GRID }, (_, x) =>
              (row >> (GRID - 1 - x)) & 1 ? (
                <rect
                  key={`${x}-${y}`}
                  x={x * 3}
                  y={y * 3}
                  width="3"
                  height="3"
                />
              ) : null,
            ),
          )}
        </g>

        {/* Two lines of copy on the card, drawn rather than typeset: real text
            here would need its own translation and would be unreadable at this
            size anyway. The accessible name carries the meaning. */}
        <rect
          x="20"
          y="88"
          width="62"
          height="6"
          rx="3"
          className="fill-muted-foreground/60"
        />
        <rect
          x="30"
          y="102"
          width="42"
          height="5"
          rx="2.5"
          className="fill-muted-foreground/35"
        />

        <circle cx="51" cy="132" r="14" className="fill-primary/15" />
        <rect
          x="45"
          y="124"
          width="12"
          height="18"
          rx="2"
          className="fill-primary"
        />
      </g>
    </svg>
  );
}
