import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * One-dimensional flex layout.
 *
 * Gap values are a fixed scale rather than an arbitrary number so spacing stays
 * on the rhythm — and because `--spacing` carries the theme's `--density`, the
 * same `gap={4}` is tighter in a dense theme with no change here.
 *
 * Class names are written out in full: Tailwind scans source text, so a
 * computed `` `gap-${n}` `` would produce no CSS.
 */
const stackVariants = cva("flex", {
  variants: {
    direction: {
      row: "flex-row",
      column: "flex-col",
    },
    gap: {
      0: "gap-0",
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      5: "gap-5",
      6: "gap-6",
      8: "gap-8",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: 4,
    align: "stretch",
    justify: "start",
    wrap: false,
  },
});

export interface StackProps
  extends Omit<ComponentProps<"div">, "wrap">,
    VariantProps<typeof stackVariants> {
  as?: ElementType;
}

export function Stack({
  className,
  direction,
  gap,
  align,
  justify,
  wrap,
  as: Component = "div",
  ...props
}: StackProps) {
  return (
    <Component
      data-slot="stack"
      className={cn(
        stackVariants({ direction, gap, align, justify, wrap }),
        className,
      )}
      {...props}
    />
  );
}

export { stackVariants };
