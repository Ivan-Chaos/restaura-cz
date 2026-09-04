import { cookies } from "next/headers";

import { SESSION_COOKIE } from "./cookies";
import type { ApiError, ApiResult } from "./types";

export { SESSION_COOKIE, parseSessionCookie, type RelayedCookie } from "./cookies";

/**
 * The browser never talks to the API directly.
 *
 * Server Components read and Server Actions write, both through here, relaying
 * the session cookie server-side. That keeps the session first-party to this
 * origin, needs no CORS, and means no credential is ever handed to client
 * JavaScript.
 *
 * This module is server-only by construction: `next/headers` cannot be imported
 * into a client bundle, so an accidental client import fails the build. That is
 * the same guarantee the `server-only` package provides, without the dependency.
 */

function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error(
      "API_URL is not set. Add it to apps/frontend/.env.local (see apps/api/.env.example for the port).",
    );
  }
  return url.replace(/\/$/, "");
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * JSON by default. A `FormData` is relayed as multipart instead, which is how
   * image uploads reach the API (feature 006) — the file arrives at the Server
   * Action and is forwarded without ever being decoded here.
   */
  body?: unknown;
  /**
   * Publish state changes at any moment, so nothing served to a guest may be
   * cached. Reads opt in explicitly rather than inheriting a default.
   */
  cache?: RequestCache;
}

export interface ApiResponse<T> {
  result: ApiResult<T>;
  /** Raw Set-Cookie values, for the sign-in/sign-up/sign-out relay. */
  setCookie: string[];
}

/**
 * Performs the request and returns the outcome as a value. Expected failures
 * are not thrown: a form has to render "that email is taken" as readily as a
 * success.
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, cache = "no-store" }: ApiRequest = {},
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  /**
   * A `FormData` goes out untouched and **without** a Content-Type header:
   * fetch generates the multipart boundary itself, and setting the header by
   * hand omits that boundary, which makes the body unparseable at the other
   * end. Everything else is JSON, as before.
   */
  const isMultipart = body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method,
      cache,
      headers: {
        ...(body === undefined || isMultipart
          ? {}
          : { "Content-Type": "application/json" }),
        ...(session ? { Cookie: `${SESSION_COOKIE}=${session.value}` } : {}),
      },
      ...(body === undefined
        ? {}
        : { body: isMultipart ? (body as FormData) : JSON.stringify(body) }),
    });
  } catch {
    // Unreachable API, DNS failure, connection reset — never a user's fault,
    // and never something to render as a validation message.
    return {
      result: { ok: false, error: { code: "NETWORK", message: "The API could not be reached." } },
      setCookie: [],
    };
  }

  const setCookie = readSetCookie(response);

  if (response.status === 204) {
    return { result: { ok: true, data: undefined as T }, setCookie };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { result: { ok: false, error: toApiError(payload) }, setCookie };
  }

  return { result: { ok: true, data: payload as T }, setCookie };
}

/** Convenience for reads, where cookies never need relaying. */
export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const { result } = await apiRequest<T>(path);
  return result;
}

function readSetCookie(response: Response): string[] {
  // getSetCookie is the only way to see multiple Set-Cookie headers intact.
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

/**
 * Trusts the shape only after checking it. A proxy or gateway can return HTML
 * where the contract promises JSON, and that must not surface as a blank error.
 */
function toApiError(payload: unknown): ApiError {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "object" &&
    (payload as { error: unknown }).error !== null
  ) {
    const error = (payload as { error: Record<string, unknown> }).error;
    if (typeof error.code === "string" && typeof error.message === "string") {
      return {
        code: error.code as ApiError["code"],
        message: error.message,
        ...(Array.isArray(error.details) ? { details: error.details as ApiError["details"] } : {}),
      };
    }
  }

  return { code: "INTERNAL", message: "The API returned an unrecognised error." };
}
