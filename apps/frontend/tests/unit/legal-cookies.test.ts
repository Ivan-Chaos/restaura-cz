import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import {
  NON_ESSENTIAL_STORAGE,
  REQUIRES_CONSENT,
  STORAGE_INVENTORY,
} from "@/lib/legal/cookies";
import {
  consentCookieValue,
  CONSENT_VERSION,
  hasConsent,
  makeConsentRecord,
  parseConsent,
  readConsentFrom,
  serializeConsent,
} from "@/lib/legal/consent";

/**
 * The cookie policy is a factual claim about the code, and this is what keeps
 * it one. Everything documented must still be set somewhere, and — more
 * importantly — anything the code starts storing must be documented before the
 * suite goes green again.
 */

const ROOT = process.cwd();
const CATALOGUES = { cs, en, de } as const;

function lookup(catalogue: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      catalogue,
    );
}

describe("storage inventory", () => {
  it("documents a unique key per entry", () => {
    const names = STORAGE_INVENTORY.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("points every entry at the code that actually sets it", () => {
    // A policy describing a cookie nobody sets any more is just as wrong as one
    // that misses a cookie somebody does.
    for (const entry of STORAGE_INVENTORY) {
      const source = readFileSync(join(ROOT, entry.definedIn), "utf8");
      expect(
        source,
        `${entry.name} is documented as living in ${entry.definedIn}, but the name does not appear there`,
      ).toContain(entry.name);
    }
  });

  it("documents every key the app writes", () => {
    // Scans the places storage is configured. If someone adds a tracker, this
    // is the test that notices the policy no longer tells the truth.
    const sources = [
      "i18n/routing.ts",
      "components/theme/AppearanceProvider.tsx",
      "lib/legal/consent.ts",
    ];

    const documented = new Set(STORAGE_INVENTORY.map((entry) => entry.name));
    const found = new Set<string>();

    for (const file of sources) {
      const source = readFileSync(join(ROOT, file), "utf8");
      for (const match of source.matchAll(/storageKey="([^"]+)"/g)) {
        found.add(match[1]);
      }
      for (const match of source.matchAll(/localeCookie:\s*\{\s*name:\s*"([^"]+)"/g)) {
        found.add(match[1]);
      }
      for (const match of source.matchAll(/CONSENT_COOKIE\s*=\s*"([^"]+)"/g)) {
        found.add(match[1]);
      }
    }

    expect(found.size, "the scan found no storage at all — has it drifted?").toBeGreaterThan(0);
    for (const name of found) {
      expect(
        documented.has(name),
        `"${name}" is stored on visitors' devices but is missing from STORAGE_INVENTORY, so the cookie policy does not mention it`,
      ).toBe(true);
    }
  });

  it("explains every entry in all three languages", () => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      for (const entry of STORAGE_INVENTORY) {
        const key = `Legal.cookies.entries.${entry.purposeKey}`;
        expect(lookup(catalogue, key), `${locale}: ${key}`).toEqual(
          expect.any(String),
        );
      }
    }
  });

  it("stores nothing that needs consent, and says so", () => {
    // Not a permanent truth — a record of today's. When it stops being true the
    // banner switches to asking, and this test is where that is noticed.
    expect(NON_ESSENTIAL_STORAGE).toEqual([]);
    expect(REQUIRES_CONSENT).toBe(false);
  });

  it("sets nothing that a third party can read", () => {
    for (const entry of STORAGE_INVENTORY) {
      expect(entry.thirdParty, `${entry.name}`).toBe(false);
    }
  });
});

describe("consent record", () => {
  it("treats no cookie as refusal", () => {
    // Silence is not consent (GDPR Art. 4(11)).
    expect(readConsentFrom("")).toBeNull();
    expect(hasConsent(null, "analytics")).toBe(false);
  });

  it("treats a malformed cookie as refusal", () => {
    expect(parseConsent("not json")).toBeNull();
    expect(parseConsent("%7B%22nope%22%3A1%7D")).toBeNull();
  });

  it("ignores a decision recorded against different categories", () => {
    const stale = encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION + 1, granted: ["analytics"], decidedAt: "2020-01-01" }),
    );
    expect(parseConsent(stale)).toBeNull();
  });

  it("round-trips a decision", () => {
    const record = makeConsentRecord(["analytics"], new Date("2026-08-29"));
    expect(record.decidedAt).toBe("2026-08-29");
    expect(readConsentFrom(`restaura-consent=${serializeConsent(record)}`)).toEqual(
      record,
    );
    expect(hasConsent(record, "analytics")).toBe(true);
  });

  it("records an explicit refusal as a real decision", () => {
    // "No" has to be storable, or the banner asks again forever.
    const record = makeConsentRecord([]);
    expect(record.granted).toEqual([]);
    expect(hasConsent(record, "analytics")).toBe(false);
    expect(readConsentFrom(`restaura-consent=${serializeConsent(record)}`)).not.toBeNull();
  });

  it("never lets `necessary` be refused", () => {
    expect(hasConsent(null, "necessary")).toBe(true);
    expect(makeConsentRecord(["necessary", "analytics"]).granted).toEqual([
      "analytics",
    ]);
  });

  it("writes a same-site, path-wide cookie", () => {
    vi.stubGlobal("location", { protocol: "https:" });
    const value = consentCookieValue(makeConsentRecord([]));
    expect(value).toContain("SameSite=Lax");
    expect(value).toContain("Path=/");
    expect(value).toContain("Secure");
    vi.unstubAllGlobals();
  });
});
