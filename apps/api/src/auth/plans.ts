/**
 * The plan an account is on.
 *
 * This list is the contract with the frontend: `apps/frontend/lib/landing/plans.ts`
 * already sells exactly these three under exactly these ids, and
 * `apps/frontend/tests/unit/plans.test.ts` pins the same literal so a change on
 * one side fails a test on the other. Documented in
 * `specs/007-pdf-menu-stickers/contracts/http-api-delta.md`.
 *
 * Nothing in the API writes this yet — billing is a later feature. It exists
 * because entitlements have to be decided from a fact the server owns, not from
 * what a request asks for: today that is whether the "Powered by restaura.cz"
 * line may be left off a downloaded document.
 */
export const PLAN_IDS = ['free', 'pro', 'proPlus'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/** What every account starts on, and what the column defaults to. */
export const DEFAULT_PLAN: PlanId = 'free';

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}
