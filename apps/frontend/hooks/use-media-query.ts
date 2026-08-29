"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a CSS media query as React state, and keeps reading it.
 *
 * Media queries are a genuine external store — the browser owns the value and
 * changes it whenever it likes (a visitor turning on reduced motion mid-visit,
 * a phone dropping onto a metered connection). `useSyncExternalStore` is the
 * API for exactly that, and unlike the `useState` + `useEffect` pattern it does
 * not schedule a second render on mount, which React now flags as a cascading
 * render.
 *
 * `serverValue` is what the query answers during SSR and the first client
 * render, where no browser has been asked yet. Choose it so the server-rendered
 * HTML is the *safe* state: the one that shows content and moves nothing.
 */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window.matchMedia !== "function") return serverValue;
    return window.matchMedia(query).matches;
  }, [query, serverValue]);

  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Whether the visitor has asked for less movement. Assumed `true` before the
 * browser can answer, so nothing ever starts animating on a preference we have
 * not actually read.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}

/**
 * Whether the visitor has asked for less data. Covers the standardised media
 * query and the older `navigator.connection.saveData` flag, because between
 * them they are what browsers actually implement.
 */
export function usePrefersReducedData(): boolean {
  const query = useMediaQuery("(prefers-reduced-data: reduce)", true);
  const saveData =
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData === true;
  return query || saveData;
}
