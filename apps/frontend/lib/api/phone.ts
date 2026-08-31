/**
 * The frontend's copy of the API's phone rule.
 *
 * The API is the authority — it validates every write — but a Server Action
 * that can reject an obviously bad number without a round trip gives faster,
 * clearer feedback. The two rules are asserted against the same matrix
 * (`tests/unit/phone.test.ts` here, `src/common/validators.spec.ts` there), so
 * they cannot drift apart silently.
 */

/** Characters an owner may reasonably type: digits, spacing and grouping. */
const PHONE_SHAPE = /^\+?[0-9 ()-]{5,24}$/;

/** E.164 allows at most 15 digits; below six nothing dialable exists. */
const MIN_DIGITS = 6;
const MAX_DIGITS = 15;

/** How many phone numbers a profile may hold. */
export const MIN_PHONES = 1;
export const MAX_PHONES = 3;

/**
 * Trims and collapses runs of whitespace. The owner's own grouping survives:
 * this number is printed on a menu, so `+420 601 234 567` must not become
 * `+420601234567`.
 */
export function normalizePhone(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidPhone(value: string): boolean {
  const trimmed = normalizePhone(value);
  if (!PHONE_SHAPE.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "").length;
  return digits >= MIN_DIGITS && digits <= MAX_DIGITS;
}

/**
 * Prepares what the owner typed for submission: normalised, with the blank
 * rows an unused input leaves behind dropped. An owner who added a third field
 * and left it empty meant two numbers, not an error.
 */
export function collectPhones(values: readonly string[]): string[] {
  return values.map(normalizePhone).filter((phone) => phone !== "");
}
