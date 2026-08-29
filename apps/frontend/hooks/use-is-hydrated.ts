"use client";

import { useSyncExternalStore } from "react";

/** No external store to watch — the value is constant per environment. */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during SSR and the first client render, `true` afterwards.
 *
 * Some controls can only know their state on the client — the appearance
 * preference lives in `localStorage`, so the server has no idea whether to draw
 * a sun or a moon. Rendering a neutral state until hydration avoids both a
 * hydration mismatch and a flash of the wrong icon.
 *
 * Implemented with `useSyncExternalStore` rather than the usual
 * `useState(false)` + `useEffect(() => setMounted(true))`: that pattern triggers
 * a cascading re-render and is rejected by React's `set-state-in-effect` rule.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
