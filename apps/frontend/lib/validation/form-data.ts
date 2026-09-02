import { localValidationError, type FormState } from "../api/form-state";
import {
  inlineTextSchema,
  menuItemSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
  verifyCodeSchema,
  type InlineTextField,
} from "./schemas";
import { zodToFields } from "./zod-fields";

/**
 * Reading a submitted form into the shape a schema validates.
 *
 * Deliberately not a `"use server"` module: the client component runs these on
 * submit for instant feedback and the Server Action runs them again as the
 * authority for the no-JS path. One module, two callers, no chance of the two
 * checking different things.
 */

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function rows(formData: FormData, name: string): string[] {
  // `getAll`, because the phone inputs all post under one name — that is what
  // lets a row be removed without renumbering the others.
  return formData.getAll(name).map((value) => String(value));
}

export type Parsed<T> = { ok: true; values: T } | { ok: false; state: FormState };

/**
 * `safeParse` rather than `parse`: a rejected field is an expected outcome a
 * form has to render, not an exception.
 */
function parsed<T>(result: {
  success: boolean;
  data?: T;
  error?: Parameters<typeof zodToFields>[0];
}): Parsed<T> {
  if (result.success && result.data !== undefined) {
    return { ok: true, values: result.data };
  }
  return {
    ok: false,
    state: localValidationError(result.error ? zodToFields(result.error) : {}),
  };
}

export function readSignUp(formData: FormData) {
  return parsed(
    signUpSchema.safeParse({
      email: text(formData, "email"),
      password: text(formData, "password"),
      confirmPassword: text(formData, "confirmPassword"),
      restaurantName: text(formData, "restaurantName"),
      phones: rows(formData, "phones"),
      location: text(formData, "location"),
    }),
  );
}

export function readSignIn(formData: FormData) {
  return parsed(
    signInSchema.safeParse({
      email: text(formData, "email"),
      password: text(formData, "password"),
    }),
  );
}

export function readProfileValues(formData: FormData) {
  return parsed(
    profileSchema.safeParse({
      restaurantName: text(formData, "restaurantName"),
      phones: rows(formData, "phones"),
      location: text(formData, "location"),
    }),
  );
}

export function readVerifyCode(formData: FormData) {
  return parsed(verifyCodeSchema.safeParse({ code: text(formData, "code") }));
}

/**
 * A dish. The price arrives as whatever was typed and leaves as a number, so
 * the action never has to parse it — and never has to decide what a
 * half-written price means.
 */
export function readItem(formData: FormData) {
  return parsed(
    menuItemSchema.safeParse({
      name: text(formData, "name"),
      description: text(formData, "description"),
      priceCzk: text(formData, "priceCzk"),
    }),
  );
}

/** A menu name or a section title, whichever the caller is posting. */
export function readInlineText(formData: FormData, field: InlineTextField) {
  return parsed(inlineTextSchema(field).safeParse({ [field]: text(formData, field) }));
}
