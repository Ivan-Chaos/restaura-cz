import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * A labelled page region.
 *
 * Renders a real `<section>` tied to its heading with `aria-labelledby`, so a
 * screen-reader user can jump between menu categories via the landmark/heading
 * list instead of scrolling through every dish.
 *
 * `scroll-mt-*` keeps the heading clear of the sticky category nav when
 * `CategoryNav` scrolls to an anchor.
 */
export interface SectionProps extends Omit<ComponentProps<"section">, "title"> {
  /** Anchor target used by `CategoryNav`. */
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

export function Section({
  id,
  title,
  description,
  children,
  className,
  ...props
}: SectionProps) {
  const generatedId = useId();
  const headingId = `${id ?? generatedId}-heading`;

  return (
    <section
      id={id}
      data-slot="section"
      aria-labelledby={title ? headingId : undefined}
      className={cn("scroll-mt-24 py-6", className)}
      {...props}
    >
      {title ? (
        <div className="mb-4 flex flex-col gap-1">
          <h2 id={headingId} className="font-display text-2xl leading-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
