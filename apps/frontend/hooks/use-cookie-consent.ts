"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { ConsentCategory } from "@/lib/legal/cookies";
import {
  consentCookieValue,
  hasConsent,
  makeConsentRecord,
  readConsentFrom,
  type ConsentRecord,
} from "@/lib/legal/consent";

/**
 * The visitor's cookie decision, as React state.
 *
 * `document.cookie` is an external store that nothing notifies us about, so
 * writes bump a local version counter to force the re-read. The server snapshot
 * is `null` — no decision — which is the safe default: a page rendered before
 * we know anything must assume refusal.
 */

let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cached: { at: number; record: ConsentRecord | null } | null = null;

function getSnapshot(): ConsentRecord | null {
  // `useSyncExternalStore` demands a stable reference between renders, so the
  // parsed record is cached until something actually changes it.
  if (!cached || cached.at !== version) {
    cached = { at: version, record: readConsentFrom(document.cookie) };
  }
  return cached.record;
}

const getServerSnapshot = (): ConsentRecord | null => null;

export interface CookieConsent {
  /** `null` until the visitor has decided. */
  record: ConsentRecord | null;
  decided: boolean;
  allows: (category: ConsentCategory) => boolean;
  /** Record a decision. Passing `[]` is a valid, complete answer: "no". */
  decide: (granted: readonly ConsentCategory[]) => void;
  /** Forget the decision, so the banner asks again. */
  reset: () => void;
}

export function useCookieConsent(): CookieConsent {
  const record = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const decide = useCallback((granted: readonly ConsentCategory[]) => {
    document.cookie = consentCookieValue(makeConsentRecord(granted));
    emit();
  }, []);

  const reset = useCallback(() => {
    document.cookie = `restaura-consent=; Max-Age=0; Path=/; SameSite=Lax`;
    emit();
  }, []);

  const allows = useCallback(
    (category: ConsentCategory) => hasConsent(record, category),
    [record],
  );

  return { record, decided: record !== null, allows, decide, reset };
}
