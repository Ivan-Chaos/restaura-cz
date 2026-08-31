import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";

/**
 * Where to send someone once they have finished signing in or completing their
 * profile.
 *
 * The value reaches us from a URL a visitor can edit and from a form field
 * anyone can post, so it is treated as hostile input: only a plain internal
 * path survives, and it is always stored **without** its locale prefix, because
 * that is what `redirect({ href, locale })` expects.
 */

/** Where an owner lands when there is no particular destination to return to. */
export const DEFAULT_DESTINATION = "/workspace";

/** Drops a leading locale segment: `/cs/workspace` becomes `/workspace`. */
export function stripLocale(pathname: string): string {
  const [, first = "", ...rest] = pathname.split("/");
  if (!hasLocale(routing.locales, first)) return pathname;
  return `/${rest.join("/")}`;
}

/**
 * Returns a safe internal path, or null.
 *
 * Rejects anything that could leave this origin: an absolute URL, a
 * protocol-relative `//evil.example`, or a backslash the browser may normalise
 * into one.
 */
export function sanitizeDestination(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;

  return stripLocale(value);
}

/** The sanitized destination, falling back to the workspace. */
export function toDestination(value: unknown): string {
  return sanitizeDestination(value) ?? DEFAULT_DESTINATION;
}
