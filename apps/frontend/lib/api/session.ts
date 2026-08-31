import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiGet } from "./client";
import type { Account, AccountResponse } from "./types";

/**
 * Session reads for Server Components.
 *
 * Deliberately not a Server Action module: these are called during render, and
 * marking them "use server" would also publish them as callable endpoints for
 * no reason.
 */

/** Null when nobody is signed in, so a page can branch instead of catching. */
export async function getAccount(): Promise<Account | null> {
  const result = await apiGet<AccountResponse>("/auth/me");
  return result.ok ? result.data.account : null;
}

/**
 * Gate for every workspace route. An expired or missing session sends the
 * visitor to sign in rather than rendering an empty shell.
 */
export async function requireAccount(locale: Locale): Promise<Account> {
  const account = await getAccount();
  if (account) return account;

  redirect({ href: "/sign-in", locale });
  // redirect throws; this line only satisfies control-flow analysis.
  throw new Error("unreachable");
}
