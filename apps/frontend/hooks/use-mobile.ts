"use client";

import { useMediaQuery } from "./use-media-query";

/** Tailwind's `md` breakpoint, which is where the sidebar switches to a sheet. */
const MOBILE_BREAKPOINT = 768;

/**
 * Whether the viewport is narrow enough that the sidebar should become an
 * overlay.
 *
 * The shadcn CLI generates this hook with its own `useState` + `useEffect`
 * matchMedia listener; it is rewritten here on top of `useMediaQuery` so there
 * is one media-query implementation in the app rather than two, and so it
 * inherits that hook's `useSyncExternalStore` behaviour instead of scheduling a
 * second render on mount. The exported name is unchanged, so the generated
 * `components/ui/sidebar.tsx` needs no edit.
 *
 * The server answers `false`: a desktop-width shell is the layout that renders
 * correctly either way, so a narrow visitor sees it collapse rather than a wide
 * visitor seeing an overlay flash.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`, false);
}
