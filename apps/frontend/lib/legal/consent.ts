import type { ConsentCategory } from "./cookies";

/**
 * The visitor's cookie decision, and the gate anything non-essential must pass.
 *
 * Two rules are baked in rather than left to whoever adds the next script:
 *
 *   1. **Absence is refusal.** `hasConsent` returns false until someone has
 *      actively said yes. Under GDPR Art. 4(11) consent is an affirmative act;
 *      silence, a pre-ticked box and "by continuing to browse you agree" are
 *      all nothing at all.
 *   2. **Withdrawal is as easy as granting.** Art. 7(3). The banner writes the
 *      same record either way and the cookie page can reopen it at any time.
 *
 * Stored in a first-party cookie rather than `localStorage` so that a future
 * server render can read the decision before deciding what to send.
 */

export const CONSENT_COOKIE = "restaura-consent";

/**
 * Six months. Long enough not to nag, short enough that a decision made about
 * one version of the site is not treated as binding forever — roughly the
 * upper bound European regulators have converged on.
 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

/** Bumped when the categories change, which invalidates older decisions. */
export const CONSENT_VERSION = 1;

export interface ConsentRecord {
  version: number;
  /** Categories the visitor actively allowed. `necessary` is never listed. */
  granted: readonly ConsentCategory[];
  /** ISO date, for the audit trail a regulator would ask for. */
  decidedAt: string;
}

export function serializeConsent(record: ConsentRecord): string {
  return encodeURIComponent(JSON.stringify(record));
}

export function parseConsent(value: string | undefined): ConsentRecord | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as Partial<ConsentRecord>;
    // A decision recorded against a different set of categories is not a
    // decision about the current ones, so it is treated as no decision.
    if (record.version !== CONSENT_VERSION) return null;
    if (!Array.isArray(record.granted)) return null;
    if (typeof record.decidedAt !== "string") return null;

    return {
      version: CONSENT_VERSION,
      granted: record.granted.filter(
        (c): c is ConsentCategory => c === "analytics",
      ),
      decidedAt: record.decidedAt,
    };
  } catch {
    // A malformed cookie is not consent.
    return null;
  }
}

/** Reads the record from a raw `document.cookie`-style string. */
export function readConsentFrom(cookieString: string): ConsentRecord | null {
  const match = cookieString
    .split("; ")
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}

/**
 * The only question anything non-essential should ever ask before running.
 * `necessary` is always true — it is the category for things the visitor
 * cannot meaningfully refuse without breaking what they asked for.
 */
export function hasConsent(
  record: ConsentRecord | null,
  category: ConsentCategory,
): boolean {
  if (category === "necessary") return true;
  return record?.granted.includes(category) ?? false;
}

export function makeConsentRecord(
  granted: readonly ConsentCategory[],
  now: Date = new Date(),
): ConsentRecord {
  return {
    version: CONSENT_VERSION,
    granted: granted.filter((c) => c !== "necessary"),
    decidedAt: now.toISOString().slice(0, 10),
  };
}

/** The `document.cookie` assignment for a decision. Browser-only. */
export function consentCookieValue(record: ConsentRecord): string {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  return (
    `${CONSENT_COOKIE}=${serializeConsent(record)}` +
    `; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
  );
}
