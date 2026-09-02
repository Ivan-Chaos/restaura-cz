import type { ApiError, ApiErrorCode, FieldErrorCode } from "./types";

/**
 * What a form knows after an attempt. Kept free of translated text: the API
 * speaks in codes and the component turns codes into the visitor's language,
 * so no user-facing string is ever built on the server.
 */
export type FormState =
  | { status: "idle" }
  /** The write went through and the form stays put — settings, not sign-up. */
  | { status: "success" }
  | { status: "error"; code: ApiErrorCode; fields?: Record<string, FieldErrorCode | "INVALID"> };

export const IDLE: FormState = { status: "idle" };
export const SAVED: FormState = { status: "success" };

/**
 * A failure the frontend found for itself — a password confirmation that does
 * not match, a phone number that cannot be one. Shaped exactly like the API's
 * so a form renders both the same way and never has to ask where the problem
 * was noticed.
 */
export function localValidationError(
  fields: Record<string, FieldErrorCode | "INVALID">,
): FormState {
  return { status: "error", code: "VALIDATION_FAILED", fields };
}

const KNOWN_FIELD_CODES: readonly FieldErrorCode[] = [
  "IS_EMAIL",
  "IS_STRING",
  "IS_INT",
  "IS_NUMBER",
  "IS_IN",
  "IS_EMPTY",
  "IS_LENGTH",
  "MAX_LENGTH",
  "MIN",
  "AT_LEAST_ONE_DEFINED",
  "IS_PHONE",
  "IS_ARRAY",
  "ARRAY_MIN_SIZE",
  "ARRAY_MAX_SIZE",
];

/**
 * Exported because the zod schemas in `lib/validation` label their issues with
 * these same codes, so a locally-found failure and an API one are narrowed by
 * one function rather than two that could disagree.
 */
export function toFieldCode(code: string): FieldErrorCode | "INVALID" {
  return (KNOWN_FIELD_CODES as readonly string[]).includes(code)
    ? (code as FieldErrorCode)
    : "INVALID";
}

/**
 * Which failure to show when one field breaks several rules at once.
 *
 * A price of "free" fails both `isNumber` and `min`, and "enter a price such as
 * 89" is the useful half of that: telling someone their word is negative
 * explains nothing. Type problems therefore outrank range problems.
 */
const CODE_PRIORITY: readonly (FieldErrorCode | "INVALID")[] = [
  "IS_STRING",
  "IS_ARRAY",
  "IS_INT",
  "IS_NUMBER",
  "IS_EMAIL",
  "IS_PHONE",
  "IS_IN",
  "IS_LENGTH",
  "MAX_LENGTH",
  "ARRAY_MIN_SIZE",
  "ARRAY_MAX_SIZE",
  "MIN",
  "IS_EMPTY",
  "AT_LEAST_ONE_DEFINED",
  "INVALID",
];

function isMoreImportant(candidate: FieldErrorCode | "INVALID", current: FieldErrorCode | "INVALID"): boolean {
  return CODE_PRIORITY.indexOf(candidate) < CODE_PRIORITY.indexOf(current);
}

/**
 * Keeps one failure per field. Showing a single clear reason under an input
 * beats stacking every constraint that happened to fail.
 */
export function toFormState(error: ApiError): FormState {
  if (error.code !== "VALIDATION_FAILED" || !error.details?.length) {
    return { status: "error", code: error.code };
  }

  const fields: Record<string, FieldErrorCode | "INVALID"> = {};
  for (const detail of error.details) {
    const code = toFieldCode(detail.code);
    const current = fields[detail.field];
    if (current === undefined || isMoreImportant(code, current)) {
      fields[detail.field] = code;
    }
  }

  return { status: "error", code: error.code, fields };
}
