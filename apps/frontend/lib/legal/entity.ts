/**
 * Who is legally responsible for this service.
 *
 * A privacy policy that does not name a controller is not a privacy policy —
 * GDPR Art. 13(1)(a) requires the identity and contact details of whoever
 * decides why and how personal data is processed. That is a fact about a real
 * company, not something code can invent, so it comes from the environment.
 *
 * Until it is filled in, `isLegalEntityConfigured()` is false and the legal
 * pages say plainly that they are drafts. That is deliberate: shipping a
 * confident-looking policy naming nobody is worse than shipping one that
 * admits it is unfinished.
 */

export interface LegalEntity {
  /** Registered company name, e.g. "Restaura s.r.o." */
  name: string;
  /** Czech company number (IČO), or the local equivalent. */
  companyId: string;
  /** Registered address, one line. */
  address: string;
  /** Where data-protection requests should go. */
  email: string;
}

const PLACEHOLDER = "—";

export const LEGAL_ENTITY: LegalEntity = {
  name: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME ?? PLACEHOLDER,
  companyId: process.env.NEXT_PUBLIC_LEGAL_ENTITY_ID ?? PLACEHOLDER,
  address: process.env.NEXT_PUBLIC_LEGAL_ENTITY_ADDRESS ?? PLACEHOLDER,
  email: process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? "hello@restaura.cz",
};

/**
 * Whether the operator's details are real. False in development and in any
 * deployment that has not set the variables, which is exactly when the pages
 * should be labelled as drafts rather than presented as binding.
 */
export function isLegalEntityConfigured(): boolean {
  return (
    LEGAL_ENTITY.name !== PLACEHOLDER &&
    LEGAL_ENTITY.companyId !== PLACEHOLDER &&
    LEGAL_ENTITY.address !== PLACEHOLDER
  );
}

/**
 * The supervisory authority a Czech visitor may complain to (GDPR Art. 77).
 * Naming it is required; guessing at it is not, so it is a constant.
 */
export const SUPERVISORY_AUTHORITY = {
  name: "Úřad pro ochranu osobních údajů",
  url: "https://uoou.gov.cz",
} as const;
