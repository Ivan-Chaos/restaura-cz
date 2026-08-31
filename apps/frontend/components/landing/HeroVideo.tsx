"use client";

import { useEffect, useState } from "react";

import {
  useMediaQuery,
  usePrefersReducedData,
  usePrefersReducedMotion,
} from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The hero's moving picture, and the gatekeeper in front of it.
 *
 * The clip is a 4K file well over a hundred megabytes, streamed from our
 * bucket. Played carelessly that is the whole performance budget spent on
 * decoration, so this component's real job is deciding *not* to play it:
 *
 *   - **Nothing is requested until the element mounts.** The `<video>` is not
 *     rendered at all until every check below has passed, which is stronger
 *     than `preload="none"` — an `autoPlay` element overrides that hint and
 *     starts fetching regardless.
 *   - **Never before the page has finished loading.** It waits for `load` and
 *     then for an idle callback, so it competes with nothing that matters. The
 *     poster underneath is the LCP element and is server-rendered.
 *   - **Never when the visitor has asked for less** — reduced motion, reduced
 *     data, Save-Data, or a connection reporting anything slower than 4G.
 *   - **Never on a small screen.** A 4096px-wide video scaled into a phone is
 *     roughly a hundred times the pixels anyone asked for, paid for out of a
 *     mobile data plan. Phones keep the poster, which is what they should have
 *     had anyway.
 *
 * Once it does play it is decorative: silent, looping, hidden from assistive
 * technology and untabbable. If it never loads, the poster simply stays.
 */
export interface HeroVideoProps {
  src: string;
  poster: string;
  type?: string;
  className?: string;
}

/** Below this the poster is the better answer, on both bandwidth and pixels. */
const MIN_WIDTH = "(min-width: 768px)";

/** Reads the Network Information API once, at the moment we decide. */
function connectionIsFastEnough(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;

  if (!connection) return true; // No signal is not a reason to assume the worst.
  if (connection.saveData) return false;
  if (!connection.effectiveType) return true;
  return connection.effectiveType === "4g";
}

export function HeroVideo({
  src,
  poster,
  type = "video/mp4",
  className,
}: HeroVideoProps) {
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);

  // All three default to "no" until the browser says otherwise, so the clip is
  // strictly opt-in and a visitor who turns reduced motion on mid-visit sees it
  // disappear.
  const reducedMotion = usePrefersReducedMotion();
  const reducedData = usePrefersReducedData();
  const wideEnough = useMediaQuery(MIN_WIDTH, false);

  const wanted = !reducedMotion && !reducedData && wideEnough;

  useEffect(() => {
    if (!wanted || started) return;

    let cancelled = false;
    let idle: number | undefined;

    const begin = () => {
      // Checked here rather than as reactive state: by the time the page has
      // finished loading, the connection estimate is worth more than it was.
      if (!cancelled && connectionIsFastEnough()) setStarted(true);
    };

    const schedule = () => {
      if (cancelled) return;
      if (typeof requestIdleCallback === "function") {
        idle = requestIdleCallback(begin, { timeout: 3000 });
      } else {
        idle = window.setTimeout(begin, 1200);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idle === undefined) return;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [wanted, started]);

  // Losing the preference after playback has begun should still take the clip
  // away, hence `wanted` rather than `started` alone.
  if (!wanted || !started) return null;

  return (
    <video
      data-slot="hero-video"
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-(--motion-slow)",
        // Held transparent until the browser says it can actually play, so the
        // poster is never replaced by a black rectangle.
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      // The deferral above is what protects the page; by the time this element
      // exists we have committed, and buffering ahead keeps the loop smooth.
      preload="auto"
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
    >
      <source src={src} type={type} />
    </video>
  );
}
