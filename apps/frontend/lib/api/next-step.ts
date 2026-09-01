import type { Account, RestaurantProfile } from "./types";

/** An href for next-intl's `redirect`: an object, so a query survives localisation. */
export type StepHref = string | { pathname: string; query: { next: string } };

/**
 * Which step a signed-in owner still owes, in the order the gates apply.
 *
 * Stated once because four callers need the same answer — the sign-in action,
 * and the sign-up/sign-in pages that bounce an already-signed-in visitor — and
 * an ordering that disagreed between them would produce a redirect loop.
 *
 * Confirmation outranks the profile: an unconfirmed account is refused by the
 * API however complete its profile is, so collecting restaurant details first
 * would be asking for work that cannot yet be used.
 */
export function nextStep(
  account: Pick<Account, "emailVerified">,
  profile: RestaurantProfile | null,
  destination: string,
): StepHref {
  if (!account.emailVerified) {
    return { pathname: "/verify-email", query: { next: destination } };
  }
  if (!profile) {
    return { pathname: "/complete-profile", query: { next: destination } };
  }
  return destination;
}
