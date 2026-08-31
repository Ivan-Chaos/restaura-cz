"use server";

import { cookies } from "next/headers";

import { redirect } from "@/i18n/navigation";
import { apiRequest, parseSessionCookie, SESSION_COOKIE } from "../client";
import { IDLE, toFormState, type FormState } from "../form-state";
import { toLocale } from "../locale";
import type { AccountResponse } from "../types";

/**
 * Cookie policy for this origin, declared once. The API sets its own cookie on
 * its own origin; we re-declare the attributes here rather than copying them,
 * so the browser-facing rules live in one place.
 */
function cookieOptions(expires: Date | undefined) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(expires ? { expires } : {}),
  };
}

async function relaySession(setCookie: string[]): Promise<void> {
  const session = parseSessionCookie(setCookie);
  if (!session) return;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.value, cookieOptions(session.expires));
}

export async function signUpAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const { result, setCookie } = await apiRequest<AccountResponse>("/auth/sign-up", {
    method: "POST",
    body: {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    },
  });

  if (!result.ok) return toFormState(result.error);

  await relaySession(setCookie);
  // redirect throws, so it must sit outside any try/catch around the request.
  redirect({ href: "/workspace", locale });
  return IDLE;
}

export async function signInAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const { result, setCookie } = await apiRequest<AccountResponse>("/auth/sign-in", {
    method: "POST",
    body: {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    },
  });

  if (!result.ok) return toFormState(result.error);

  await relaySession(setCookie);
  redirect({ href: "/workspace", locale });
  return IDLE;
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));

  // Best effort: even if the API call fails, the local cookie must go, or the
  // visitor is left looking signed in with a session they cannot use.
  await apiRequest<void>("/auth/sign-out", { method: "POST" });

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  redirect({ href: "/sign-in", locale });
}
