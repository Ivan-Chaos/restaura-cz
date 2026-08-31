import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * Centred measure with responsive gutters.
 *
 * The gutter uses ordinary spacing utilities on purpose: `--spacing` is
 * multiplied by the active theme's `--density`, so a denser theme tightens the
 * page margins without this component knowing a theme exists.
 */
const containerVariants = cva("mx-auto w-full px-4 sm:px-6", {
  variants: {
    size: {
      /** Reading measure — a single column of dishes. */
      sm: "max-w-2xl",
      /** Default menu width — two columns of dish cards at md. */
      md: "max-w-4xl",
      /** Wide layouts — three columns, admin tables. */
      lg: "max-w-6xl",
      /** Marketing sections — full-bleed photography needs room to breathe. */
      xl: "max-w-7xl",
      /** Edge-to-edge; still applies gutters. */
      full: "max-w-none",
    },
  },
  defaultVariants: { size: "md" },
});

export interface ContainerProps
  extends ComponentProps<"div">,
    VariantProps<typeof containerVariants> {
  as?: ElementType;
}

export function Container({
  className,
  size,
  as: Component = "div",
  ...props
}: ContainerProps) {
  return (
    <Component
      data-slot="container"
      className={cn(containerVariants({ size }), className)}
      {...props}
    />
  );
}

export { containerVariants };
