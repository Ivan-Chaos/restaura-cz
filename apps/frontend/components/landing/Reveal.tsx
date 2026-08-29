"use client";

import type { ElementType, ReactNode } from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Fades its children up as they scroll into view.
 *
 * The rule this component exists to obey: **content is never hidden by
 * default.** Only an element the browser has confirmed is off-screen is ever
 * made transparent, so there is no state in which a reader is looking at
 * nothing — not before hydration, not with a broken bundle, not with reduced
 * motion, and not in the frame between the two. See `useInView` for how the
 * three states rule that out.
 *
 * Hand-rolled rather than reaching for `motion`: this is a fade and a
 * four-pixel-per-rem translate, and the animation library would outweigh the
 * entire rest of this route's JavaScript. Durations come from the theme's
 * motion tokens, so a theme that wants a brisker page retunes every reveal.
 */
export interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  /** Staggers siblings. */
  delay?: "none" | "sm" | "md";
  className?: string;
}

const DELAY_CLASS = {
  none: "",
  sm: "motion-safe:delay-75",
  md: "motion-safe:delay-150",
} as const;

export function Reveal({
  children,
  as: Component = "div",
  delay = "none",
  className,
}: RevealProps) {
  const { ref, state } = useInView<HTMLDivElement>();

  return (
    <Component
      ref={ref}
      data-slot="reveal"
      data-reveal={state}
      className={cn(
        "motion-safe:transition-[opacity,translate] motion-safe:duration-(--motion-slow) motion-safe:ease-(--motion-ease)",
        state === "hidden"
          ? "translate-y-4 opacity-0"
          : "translate-y-0 opacity-100",
        DELAY_CLASS[delay],
        className,
      )}
    >
      {children}
    </Component>
  );
}
