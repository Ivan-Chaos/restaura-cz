/**
 * The shape of the legal pages.
 *
 * Section order lives here rather than in a component so the documents can be
 * reordered, and a section retired, without touching markup — and so the
 * message keys are enumerable, which is what lets the catalogue gate prove all
 * three languages carry the same document rather than three different ones.
 *
 * Each id is a full message key under the `Legal` namespace; the renderer
 * appends `.title` and `.body`. Spelled out in full so TypeScript checks every
 * one against `messages/en.json` instead of trusting a template literal.
 */

export type LegalDocumentId = "privacy" | "terms" | "cookies";

export type LegalSectionKey =
  // Privacy policy
  | "privacy.sections.who"
  | "privacy.sections.whatWeCollect"
  | "privacy.sections.legalBasis"
  | "privacy.sections.storage"
  | "privacy.sections.processors"
  | "privacy.sections.transfers"
  | "privacy.sections.retention"
  | "privacy.sections.rights"
  | "privacy.sections.children"
  | "privacy.sections.changes"
  // Terms and conditions
  | "terms.sections.scope"
  | "terms.sections.service"
  | "terms.sections.eligibility"
  | "terms.sections.yourContent"
  | "terms.sections.acceptableUse"
  | "terms.sections.plans"
  | "terms.sections.availability"
  | "terms.sections.liability"
  | "terms.sections.termination"
  | "terms.sections.changes"
  | "terms.sections.law"
  // Cookie policy
  | "cookies.sections.what"
  | "cookies.sections.necessary"
  | "cookies.sections.analytics"
  | "cookies.sections.thirdParty"
  | "cookies.sections.managing";

export interface LegalDocument {
  id: LegalDocumentId;
  /** Route under `/[locale]`. */
  path: `/${string}`;
  /** ISO date the text last changed. Deliberately a constant: "today" is a lie. */
  updated: string;
  sections: readonly LegalSectionKey[];
  /** The cookie table is rendered inside this document, after this section. */
  tableAfter?: LegalSectionKey;
}

/** Bump when the wording materially changes, and tell existing users. */
const LAST_UPDATED = "2026-08-29";

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    id: "privacy",
    path: "/privacy",
    updated: LAST_UPDATED,
    sections: [
      "privacy.sections.who",
      "privacy.sections.whatWeCollect",
      "privacy.sections.legalBasis",
      "privacy.sections.storage",
      "privacy.sections.processors",
      "privacy.sections.transfers",
      "privacy.sections.retention",
      "privacy.sections.rights",
      "privacy.sections.children",
      "privacy.sections.changes",
    ],
  },
  {
    id: "terms",
    path: "/terms",
    updated: LAST_UPDATED,
    sections: [
      "terms.sections.scope",
      "terms.sections.service",
      "terms.sections.eligibility",
      "terms.sections.yourContent",
      "terms.sections.acceptableUse",
      "terms.sections.plans",
      "terms.sections.availability",
      "terms.sections.liability",
      "terms.sections.termination",
      "terms.sections.changes",
      "terms.sections.law",
    ],
  },
  {
    id: "cookies",
    path: "/cookies",
    updated: LAST_UPDATED,
    sections: [
      "cookies.sections.what",
      "cookies.sections.necessary",
      "cookies.sections.analytics",
      "cookies.sections.thirdParty",
      "cookies.sections.managing",
    ],
    tableAfter: "cookies.sections.necessary",
  },
];

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  const document = LEGAL_DOCUMENTS.find((candidate) => candidate.id === id);
  if (!document) throw new Error(`Unknown legal document: ${id}`);
  return document;
}
