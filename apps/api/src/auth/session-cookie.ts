import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'restaura_session';

/** A signed-in session lasts 30 days from the moment it was created. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * httpOnly keeps the token out of reach of scripts; SameSite=Lax still sends it
 * when a guest follows a shared menu link into an owner page.
 */
export function sessionCookieOptions(secure: boolean, expiresAt: Date): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

export function clearedCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}
