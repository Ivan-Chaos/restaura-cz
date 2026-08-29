"use client";

import { useState } from "react";

import {
  usePrefersReducedData,
  usePrefersReducedMotion,
} from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The hero's optional moving picture.
 *
 * Two rules shape this component, and both are the reason it is a client leaf
 * rather than a `<video>` in the server-rendered hero:
 *
 * 1. **Nobody downloads it who did not want it.** A visitor who prefers reduced
 *    motion, or whose browser is asking for less data, never gets a `<video>`
 *    element at all — not a hidden one. Hiding it in CSS would still fetch it,
 *    which is exactly the cost a data-saving visitor was trying to avoid.
 * 2. **It is never load-bearing.** The poster underneath is the real hero image
 *    and is server-rendered; this fades in over it once the browser says it can
 *    play, and if that never happens the page is unchanged. The clip is
 *    decorative, so it is hidden from assistive technology and untabbable —
 *    there is nothing in it a caption would carry that the poster does not.
 */
export interface HeroVideoProps {
  src: string;
  poster: string;
  type?: string;
  className?: string;
}

export function HeroVideo({
  src,
  poster,
  type = "video/mp4",
  className,
}: HeroVideoProps) {
  const [ready, setReady] = useState(false);

  // Both preferences default to "yes, reduce" until the browser says otherwise,
  // so the clip is opt-in: it appears once we know it is wanted, and a visitor
  // who turns reduced motion on mid-visit sees it disappear.
  const reducedMotion = usePrefersReducedMotion();
  const reducedData = usePrefersReducedData();

  if (reducedMotion || reducedData) return null;

  return (
    <video
      data-slot="hero-video"
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-(--motion-slow)",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      // The poster is already painted; the clip may take its time.
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
    >
      <source src={src} type={type} />
    </video>
  );
}
