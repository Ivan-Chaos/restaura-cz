import type { ApiError, ApiErrorCode, FieldErrorCode } from "./types";

/**
 * What a form knows after an attempt. Kept free of translated text: the API
 * speaks in codes and the component turns codes into the visitor's language,
 * so no user-facing string is ever built on the server.
 */
export type FormState =
  | { status: "idle" }
  | { status: "error"; code: ApiErrorCode; fields?: Record<string, FieldErrorCode | "INVALID"> };

export const IDLE: FormState = { status: "idle" };

const KNOWN_FIELD_CODES: readonly FieldErrorCode[] = [
  "IS_EMAIL",
  "IS_STRING",
  "IS_INT",
  "IS_IN",
  "IS_EMPTY",
  "IS_LENGTH",
  "MAX_LENGTH",
  "MIN",
  "AT_LEAST_ONE_DEFINED",
];

function toFieldCode(code: string): FieldErrorCode | "INVALID" {
  return (KNOWN_FIELD_CODES as readonly string[]).includes(code)
    ? (code as FieldErrorCode)
    : "INVALID";
}

/**
 * Which failure to show when one field breaks several rules at once.
 *
 * A price of "free" fails both `isInt` and `min`, and "enter a whole number" is
 * the useful half of that: telling someone their word is negative explains
 * nothing. Type problems therefore outrank range problems.
 */
const CODE_PRIORITY: readonly (FieldErrorCode | "INVALID")[] = [
  "IS_STRING",
  "IS_INT",
  "IS_EMAIL",
  "IS_IN",
  "IS_LENGTH",
  "MAX_LENGTH",
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
