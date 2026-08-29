"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";

/**
 * Tracks whether an element has been scrolled into view, for reveal-on-scroll.
 *
 * The three states exist to solve one specific bug. The obvious design — start
 * hidden, reveal on intersection — cannot start hidden during SSR without
 * hiding content from anyone whose JavaScript never arrives. Gating it on
 * hydration instead makes the element go *visible → hidden → visible*, and the
 * middle step can reach the screen as a flicker.
 *
 * So nothing is hidden until the browser has confirmed it is off-screen:
 *
 *   `idle`   — nothing known yet. Rendered visible. This is what the server
 *              sends, what a no-JS reader keeps, and what a reader who prefers
 *              reduced motion keeps forever.
 *   `hidden` — the observer's first callback said the element is outside the
 *              viewport. Hiding something already off-screen is invisible.
 *   `shown`  — it has been seen. Terminal: content that fades back out as the
 *              reader scrolls past is a distraction, not a flourish.
 */
export type RevealState = "idle" | "hidden" | "shown";

export function useInView<T extends Element>(options?: {
  threshold?: number;
  rootMargin?: string;
}): { ref: React.RefObject<T | null>; state: RevealState } {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>("idle");

  const reducedMotion = usePrefersReducedMotion();
  const threshold = options?.threshold ?? 0.15;
  const rootMargin = options?.rootMargin ?? "0px";

  useEffect(() => {
    if (reducedMotion || typeof IntersectionObserver === "undefined") return;
    if (state === "shown") return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.some((entry) => entry.isIntersecting);
        // setState from an observer callback is a subscription, not a
        // cascading render — this is the external system telling us something.
        if (intersecting) {
          setState("shown");
          observer.disconnect();
        } else {
          setState("hidden");
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion, state, threshold, rootMargin]);

  return { ref, state };
}
