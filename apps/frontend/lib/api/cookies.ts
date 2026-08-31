/**
 * Cookie plumbing kept apart from the fetch client so it can be unit-tested:
 * the client imports `next/headers`, which only exists inside a request.
 */

export const SESSION_COOKIE = "restaura_session";

export interface RelayedCookie {
  value: string;
  expires?: Date;
}

/**
 * Pulls the session token out of the API's Set-Cookie header.
 *
 * Only the value and expiry are taken. The attributes are re-declared by the
 * caller rather than copied, so this origin's cookie policy lives in one place
 * instead of being inherited from another server's response.
 */
export function parseSessionCookie(setCookie: string[]): RelayedCookie | null {
  const header = setCookie.find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  if (!header) return null;

  const [pair, ...attributes] = header.split(";");
  const value = pair?.slice(SESSION_COOKIE.length + 1) ?? "";
  if (value === "") return null;

  const expiresAttribute = attributes
    .map((attribute) => attribute.trim())
    .find((attribute) => attribute.toLowerCase().startsWith("expires="));

  const expires = expiresAttribute
    ? new Date(expiresAttribute.slice("expires=".length))
    : undefined;

  return {
    value,
    ...(expires && !Number.isNaN(expires.getTime()) ? { expires } : {}),
  };
}
