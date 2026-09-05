import { PLANS, type PlanId } from "@/lib/landing/plans";

/**
 * What an account's plan permits.
 *
 * The pricing page already sells three plans under three ids; the API now
 * stores one of them on every account and reports it on `/auth/me`. This module
 * is the single place that turns that fact into a decision, so the route
 * handler that produces a document and the page that renders it cannot disagree
 * about what an owner is entitled to (spec 007 FR-015 – FR-017).
 *
 * Deliberately pure and dependency-free: it is imported by a Server Component,
 * by a route handler, and by a client component that only needs the boolean.
 */

const PLAN_IDS: readonly string[] = PLANS.map((plan) => plan.id);

/**
 * The plan an account is on, narrowed.
 *
 * Anything unrecognised — a field an older API never sent, a value from a
 * hand-edited row — reads as `free`. Falling back to the *least* privileged
 * plan is the only safe direction: the failure mode of guessing wrong is
 * handing out a paid entitlement.
 */
export function planOf(account: { plan?: unknown } | null | undefined): PlanId {
  const plan = account?.plan;
  return typeof plan === "string" && PLAN_IDS.includes(plan) ? (plan as PlanId) : "free";
}

/** Paid plans may leave the Restaura line off a document; the free plan may not. */
export function canRemoveBranding(plan: PlanId): boolean {
  return plan !== "free";
}

/**
 * Whether a produced document shows "Powered by restaura.cz".
 *
 * `requested` is what the caller asked for, and it is only ever a *request*:
 * for a free account the answer is yes whatever the query string says, which is
 * what makes the entitlement impossible to bypass by editing a URL. For a paid
 * account the default is off — the point of paying is not to have to ask.
 */
export function resolveBranding(plan: PlanId, requested: boolean | undefined): boolean {
  if (!canRemoveBranding(plan)) return true;
  return requested ?? false;
}
