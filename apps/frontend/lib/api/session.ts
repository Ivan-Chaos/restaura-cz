import { cache } from "react";
import { headers } from "next/headers";

import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PATHNAME_HEADER } from "@/proxy";
import { apiGet } from "./client";
import { stripLocale } from "./next-path";
import type { Account, AccountResponse, RestaurantProfile } from "./types";

/**
 * Session reads for Server Components.
 *
 * Deliberately not a Server Action module: these are called during render, and
 * marking them "use server" would also publish them as callable endpoints for
 * no reason.
 */

export interface Session {
  account: Account;
  /**
   * Null for an account that has credentials but no restaurant profile — every
   * account created before this feature. That is the only "incomplete" state
   * there is, and it is what the dashboard gate keys off.
   */
  profile: RestaurantProfile | null;
}

/**
 * Null when nobody is signed in, so a page can branch instead of catching.
 *
 * Memoised for the render pass: the layout reads it to run the gate and the
 * page below reads it again for the owner's name, and that must cost one
 * request, not two.
 */
export const getSession = cache(async function getSession(): Promise<Session | null> {
  const result = await apiGet<AccountResponse>("/auth/me");
  return result.ok ? { account: result.data.account, profile: result.data.profile } : null;
});

/**
 * The path being rendered, without its locale prefix — the destination to
 * return to after signing in. Published by `proxy.ts`; absent in contexts that
 * never went through the middleware, in which case the caller falls back to the
 * workspace.
 */
async function currentDestination(): Promise<string | undefined> {
  const pathname = (await headers()).get(PATHNAME_HEADER);
  return pathname ? stripLocale(pathname) : undefined;
}

/**
 * An object href, not a string with a query glued on: next-intl's `redirect`
 * localises a string href as a pathname and drops anything after `?`.
 */
function withDestination(pathname: string, destination: string | undefined) {
  if (!destination || destination === "/") return pathname;
  return { pathname, query: { next: destination } };
}

/**
 * Requires a session and nothing else — the confirmation step itself, which an
 * owner reaches precisely because their address is unconfirmed.
 */
export async function requireSession(locale: Locale): Promise<Session> {
  const session = await getSession();
  if (session) return session;

  redirect({ href: withDestination("/sign-in", await currentDestination()), locale });
  // redirect throws; this line only satisfies control-flow analysis.
  throw new Error("unreachable");
}

/**
 * A session whose email is confirmed, but with no requirement of a profile —
 * the gate for the profile-completion step.
 *
 * Confirmation is checked before the profile everywhere, because an
 * unconfirmed account cannot use the dashboard however complete its profile is,
 * and filling in a restaurant's details is wasted effort until it can.
 */
export async function requireVerified(locale: Locale): Promise<Session> {
  const destination = await currentDestination();
  const session = await getSession();

  if (!session) {
    redirect({ href: withDestination("/sign-in", destination), locale });
    throw new Error("unreachable");
  }

  if (!session.account.emailVerified) {
    redirect({ href: withDestination("/verify-email", destination), locale });
    throw new Error("unreachable");
  }

  return session;
}

/**
 * The gate for every dashboard route.
 *
 * Applied once, in the workspace layout, rather than page by page: a gate that
 * has to be remembered is a gate that will eventually be forgotten on a new
 * page. An expired session sends the visitor to sign in; an unconfirmed address
 * sends them to enter their code; a signed-in owner who never completed their
 * restaurant profile is sent to finish it, because a dashboard is not much use
 * without one (spec FR-004, FR-005, FR-013).
 *
 * The API enforces the confirmation rule too (VerifiedGuard), so this redirect
 * is the courtesy, not the security: without it the dashboard would render and
 * then fail every request it made.
 */
export async function requireProfile(
  locale: Locale,
): Promise<Session & { profile: RestaurantProfile }> {
  const destination = await currentDestination();
  const session = await getSession();

  if (!session) {
    redirect({ href: withDestination("/sign-in", destination), locale });
    throw new Error("unreachable");
  }

  if (!session.account.emailVerified) {
    redirect({ href: withDestination("/verify-email", destination), locale });
    throw new Error("unreachable");
  }

  if (!session.profile) {
    redirect({ href: withDestination("/complete-profile", destination), locale });
    throw new Error("unreachable");
  }

  return { account: session.account, profile: session.profile };
}
