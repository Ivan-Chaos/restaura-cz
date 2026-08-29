import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * Responsive column grid.
 *
 * Column counts come from a literal lookup rather than string interpolation so
 * Tailwind's scanner can see every class it must generate.
 */
const COLS = {
  base: { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" },
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  },
} as const;

const GAPS = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
} as const;

export type ColumnCount = 1 | 2 | 3 | 4;

export interface GridProps extends ComponentProps<"div"> {
  /** Columns per breakpoint. Mobile-first: `base` is required. */
  cols?: { base: ColumnCount; sm?: ColumnCount; md?: ColumnCount; lg?: ColumnCount };
  gap?: keyof typeof GAPS;
  as?: ElementType;
}

export function Grid({
  className,
  cols = { base: 1, md: 2 },
  gap = 4,
  as: Component = "div",
  ...props
}: GridProps) {
  return (
    <Component
      data-slot="grid"
      className={cn(
        "grid",
        COLS.base[cols.base],
        cols.sm && COLS.sm[cols.sm],
        cols.md && COLS.md[cols.md],
        cols.lg && COLS.lg[cols.lg],
        GAPS[gap],
        className,
      )}
      {...props}
    />
  );
}
