/**
 * Everything this site stores on a visitor's device.
 *
 * This is not documentation that happens to sit near the code — it is the list
 * the cookie policy renders from, and `tests/unit/legal-cookies.test.ts` checks
 * every entry against the source that actually sets it. Add storage without
 * adding it here and the test fails; that is the point.
 *
 * The categories matter legally, not just editorially. Under the ePrivacy
 * Directive (Art. 5(3), as implemented in Czech law by Act No. 127/2005 Coll.
 * § 89(3)) storage may be read or written without consent only when it is
 * strictly necessary to provide a service the user explicitly asked for.
 * Everything else needs consent *before* it is set.
 */

export type ConsentCategory = "necessary" | "analytics";

export type StorageMechanism = "cookie" | "localStorage";

export interface StorageEntry {
  /** The literal key, as it appears in devtools. */
  name: string;
  mechanism: StorageMechanism;
  category: ConsentCategory;
  /** Human-readable lifetime; `session` where it dies with the tab. */
  duration: "session" | "persistent" | string;
  /**
   * Message-key segment under `Legal.cookies.entries`. A literal union, not a
   * string, so adding an entry without writing its explanation in all three
   * languages fails to compile rather than rendering a raw key at a visitor.
   */
  purposeKey: "locale" | "appearance" | "consent";
  /**
   * Where in this repository the key is defined. The test uses it to prove the
   * entry still describes something real.
   */
  definedIn: string;
  /** Whether a third party can read it. First-party only, so far. */
  thirdParty: boolean;
}

export const STORAGE_INVENTORY: readonly StorageEntry[] = [
  {
    name: "NEXT_LOCALE",
    mechanism: "cookie",
    category: "necessary",
    duration: "persistent",
    purposeKey: "locale",
    definedIn: "i18n/routing.ts",
    thirdParty: false,
  },
  {
    name: "restaura-appearance",
    mechanism: "localStorage",
    category: "necessary",
    duration: "persistent",
    purposeKey: "appearance",
    definedIn: "components/theme/AppearanceProvider.tsx",
    thirdParty: false,
  },
  {
    name: "restaura-consent",
    mechanism: "cookie",
    category: "necessary",
    duration: "persistent",
    purposeKey: "consent",
    definedIn: "lib/legal/consent.ts",
    thirdParty: false,
  },
];

/**
 * Whether anything here needs asking about.
 *
 * Today: nothing does. Every entry is either a preference the visitor set
 * themselves or the record of their own consent choice, and none of it can be
 * used to follow anyone anywhere. That is why the banner currently informs
 * rather than asks — and why it will start asking, without any further code
 * change, the moment a non-necessary entry is added to the list above.
 */
export const NON_ESSENTIAL_STORAGE = STORAGE_INVENTORY.filter(
  (entry) => entry.category !== "necessary",
);

export const REQUIRES_CONSENT = NON_ESSENTIAL_STORAGE.length > 0;
