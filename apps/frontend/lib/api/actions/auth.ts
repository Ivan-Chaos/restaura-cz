"use server";

import { cookies } from "next/headers";

import { redirect } from "@/i18n/navigation";
import { apiRequest, parseSessionCookie, SESSION_COOKIE } from "../client";
import {
  IDLE,
  localValidationError,
  SAVED,
  toFormState,
  type FormState,
} from "../form-state";
import { toLocale } from "../locale";
import { toDestination } from "../next-path";
import { collectPhones, isValidPhone, MAX_PHONES, MIN_PHONES } from "../phone";
import type {
  AccountResponse,
  FieldErrorCode,
  ProfileResponse,
  RestaurantProfile,
} from "../types";

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

type ProfileRead =
  | { ok: true; profile: RestaurantProfile }
  | { ok: false; state: FormState };

/**
 * Reads the restaurant profile out of a submitted form.
 *
 * The API validates all of this again — it is the authority — but checking the
 * phone numbers here is what lets the form mark the *one* input at fault: the
 * API reports a bad entry against the list as a whole, because class-validator
 * has no per-index field path to give it.
 */
function readProfile(formData: FormData): ProfileRead {
  const phones = collectPhones(formData.getAll("phones").map((value) => String(value)));
  const fields: Record<string, FieldErrorCode | "INVALID"> = {};

  if (phones.length < MIN_PHONES) fields.phones = "ARRAY_MIN_SIZE";
  else if (phones.length > MAX_PHONES) fields.phones = "ARRAY_MAX_SIZE";
  else {
    phones.forEach((phone, index) => {
      if (!isValidPhone(phone)) fields[`phones.${index}`] = "IS_PHONE";
    });
  }

  if (Object.keys(fields).length > 0) return { ok: false, state: localValidationError(fields) };

  return {
    ok: true,
    profile: {
      restaurantName: String(formData.get("restaurantName") ?? "").trim(),
      phones,
      location: String(formData.get("location") ?? "").trim(),
    },
  };
}

export async function signUpAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const destination = toDestination(formData.get("next"));

  const password = String(formData.get("password") ?? "");
  // Never sent onward: confirming a typed password is this form's job, and the
  // API rejects the field outright rather than handle the secret twice.
  if (password !== String(formData.get("confirmPassword") ?? "")) {
    return localValidationError({ confirmPassword: "INVALID" });
  }

  const profile = readProfile(formData);
  if (!profile.ok) return profile.state;

  const { result, setCookie } = await apiRequest<AccountResponse>("/auth/sign-up", {
    method: "POST",
    body: {
      email: String(formData.get("email") ?? "").trim(),
      password,
      ...profile.profile,
    },
  });

  if (!result.ok) return toFormState(result.error);

  await relaySession(setCookie);
  // redirect throws, so it must sit outside any try/catch around the request.
  redirect({ href: destination, locale });
  return IDLE;
}

export async function signInAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const destination = toDestination(formData.get("next"));

  const { result, setCookie } = await apiRequest<AccountResponse>("/auth/sign-in", {
    method: "POST",
    body: {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    },
  });

  if (!result.ok) return toFormState(result.error);

  await relaySession(setCookie);

  // An account from before profiles existed goes straight to finishing one,
  // rather than bouncing off the dashboard gate a moment later. The object href
  // is deliberate: a string one is localised as a pathname and loses its query.
  redirect({
    href: result.data.profile
      ? destination
      : { pathname: "/complete-profile", query: { next: destination } },
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
  const profile = readProfile(formData);
  if (!profile.ok) return profile.state;

  const { result } = await apiRequest<ProfileResponse>("/auth/profile", {
    method: "PUT",
    body: profile.profile,
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
