"use server";

import { cookies } from "next/headers";

import { redirect } from "@/i18n/navigation";
import {
  readProfileValues,
  readSignIn,
  readSignUp,
  readVerifyCode,
} from "@/lib/validation/form-data";
import { apiRequest, parseSessionCookie, SESSION_COOKIE } from "../client";
import { IDLE, SAVED, toFormState, type FormState } from "../form-state";
import { toLocale } from "../locale";
import { toDestination } from "../next-path";
import { nextStep } from "../next-step";
import type { AccountResponse, ProfileResponse, VerifyEmailRequest } from "../types";

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
  const destination = toDestination(formData.get("next"));

  // The same schema the form ran on submit. Repeated here rather than trusted,
  // because a form posted without client JavaScript never ran it, and because
  // an action is reachable directly.
  const submitted = readSignUp(formData);
  if (!submitted.ok) return submitted.state;

  // Listed rather than spread, so what leaves this process is visible: no
  // `confirmPassword`, because confirming a typed password is the form's job
  // and the API rejects a second copy of the secret outright.
  const { email, password, restaurantName, phones, location } = submitted.values;

  const { result, setCookie } = await apiRequest<AccountResponse>("/auth/sign-up", {
    method: "POST",
    // `locale` steers the language of the confirmation email.
    body: { email, password, restaurantName, phones, location, locale },
  });

  if (!result.ok) return toFormState(result.error);

  await relaySession(setCookie);
  // Signed in but unconfirmed: the owner goes to the code screen, and the
  // dashboard they were headed for waits in `?next=` until they get there.
  // redirect throws, so it must sit outside any try/catch around the request.
  redirect({
    href: { pathname: "/verify-email", query: { next: destination } },
    locale,
  });
  return IDLE;
}

/**
 * Confirms the address with the emailed code.
 *
 * A wrong or expired code comes back as a form-level error rather than a field
 * one: there is only one input, so pinning the message under it would say the
 * same thing twice.
 */
export async function verifyEmailAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const destination = toDestination(formData.get("next"));

  const submitted = readVerifyCode(formData);
  if (!submitted.ok) return submitted.state;

  const { result } = await apiRequest<AccountResponse>("/auth/verify-email", {
    method: "POST",
    // `locale` steers the language of the welcome email sent on success.
    body: { code: submitted.values.code, locale } satisfies VerifyEmailRequest,
  });

  if (!result.ok) return toFormState(result.error);

  redirect({ href: destination, locale });
  return IDLE;
}

/**
 * Sends a fresh code. Stays on the page and reports success, because the owner
 * is still waiting for the email that success refers to.
 */
export async function resendCodeAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));

  const { result } = await apiRequest<void>("/auth/verify-email/resend", {
    method: "POST",
    body: { locale },
  });

  return result.ok ? SAVED : toFormState(result.error);
}

export async function signInAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const destination = toDestination(formData.get("next"));

  const submitted = readSignIn(formData);
  if (!submitted.ok) return submitted.state;

  const { result, setCookie } = await apiRequest<AccountResponse>("/auth/sign-in", {
    method: "POST",
    body: submitted.values,
  });

  if (!result.ok) return toFormState(result.error);

  await relaySession(setCookie);

  // Routed straight to whichever step is outstanding, rather than bouncing off
  // a gate a moment later.
  redirect({
    href: nextStep(result.data.account, result.data.profile, destination),
    locale,
  });
  return IDLE;
}

/**
 * Finishing a profile that was never filled in. Succeeds by leaving the page,
 * which is the whole point: the owner was held here until they did.
 */
export async function completeProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const destination = toDestination(formData.get("next"));

  const state = await writeProfile(formData);
  if (state.status === "error") return state;

  redirect({ href: destination, locale });
  return IDLE;
}

/**
 * Editing a profile that already exists. Stays on the page and reports success,
 * because the owner is in settings to make several changes, not to be sent
 * somewhere else after the first.
 */
export async function saveProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return writeProfile(formData);
}

async function writeProfile(formData: FormData): Promise<FormState> {
  const submitted = readProfileValues(formData);
  if (!submitted.ok) return submitted.state;

  const { result } = await apiRequest<ProfileResponse>("/auth/profile", {
    method: "PUT",
    body: submitted.values,
  });

  return result.ok ? SAVED : toFormState(result.error);
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
