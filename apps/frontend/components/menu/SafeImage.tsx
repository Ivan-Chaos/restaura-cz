"use client";

import { useState, type ReactNode } from "react";
import Image, { type ImageProps } from "next/image";

export interface SafeImageProps extends Omit<ImageProps, "onError"> {
  /** What to render instead when the image cannot be loaded. */
  fallback: ReactNode;
}

/**
 * An image that degrades to something sensible when its bytes cannot be
 * fetched.
 *
 * A stored object can go missing — a failed delete that half-succeeded, a
 * bucket lifecycle rule, a bad deploy — and the browser's answer to that is a
 * broken-image icon, which is the one outcome a restaurant's menu must never
 * show a guest. Here the dish falls back to its placeholder and the header
 * falls back to the restaurant's name in text, exactly as if no image had been
 * uploaded at all.
 *
 * This is the only client component the image feature adds to the guest page,
 * and it exists because `onError` is a function prop: React has to serialise it
 * to the browser, so a Server Component cannot react to a failed load. It is a
 * few hundred bytes, and it buys the difference between a menu that looks
 * complete and one that looks broken.
 */
export function SafeImage({ fallback, alt, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  // `alt` is named rather than left in the spread so it is visibly required:
  // every image this renders describes something the page already names, and
  // there is no case here for a decorative one.
  return <Image {...props} alt={alt} onError={() => setFailed(true)} />;
}
