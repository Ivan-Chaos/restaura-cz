import { localValidationError, type FormState } from "../api/form-state";
import {
  inlineTextSchema,
  menuItemSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
  verifyCodeSchema,
  visualVariantSchema,
  type InlineTextField,
} from "./schemas";
import { isCropRect, validateImageFile, type CropRect } from "./image";
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

/** The visual style an owner picked. Only catalogue ids get as far as the API. */
export function readVisualVariant(formData: FormData) {
  return parsed(
    visualVariantSchema.safeParse({ visualVariant: text(formData, "visualVariant") }),
  );
}

/**
 * What a submitted form says to do with its image (feature 006).
 *
 * Three outcomes, because "leave it alone" and "remove it" are different
 * instructions and neither is an upload. The file is validated here — size, and
 * type by its leading bytes — so a Server Action never spends a request
 * relaying something the API is certain to refuse, and so the no-JavaScript
 * path gets the same check the browser would have done.
 */
export type ImageUpload =
  | { kind: "none" }
  | { kind: "remove" }
  | { kind: "replace"; file: File; crop?: CropRect };

function cropFrom(formData: FormData): Parsed<CropRect | undefined> {
  const names = ["cropX", "cropY", "cropWidth", "cropHeight"] as const;
  const raw = names.map((name) => formData.get(name)).filter((value) => value !== null);

  // All four or none. Three coordinates describe nothing, and quietly ignoring
  // them would store a centre-crop while the owner believed they had chosen a
  // framing.
  if (raw.length === 0) return { ok: true, values: undefined };
  if (raw.length !== names.length) {
    return { ok: false, state: localValidationError({ image: "IS_CROP" }) };
  }

  const [x, y, width, height] = names.map((name) => Number(text(formData, name)));
  const rect = { x: x!, y: y!, width: width!, height: height! };

  return isCropRect(rect)
    ? { ok: true, values: rect }
    : { ok: false, state: localValidationError({ image: "IS_CROP" }) };
}

export async function readImageUpload(formData: FormData): Promise<Parsed<ImageUpload>> {
  const file = formData.get("image");

  // A file wins over a removal flag: an owner who picked a new image after
  // pressing Remove means the new image.
  if (file instanceof File && file.size > 0) {
    const problem = await validateImageFile(file);
    if (problem) return { ok: false, state: localValidationError({ image: problem }) };

    const crop = cropFrom(formData);
    if (!crop.ok) return crop;

    return { ok: true, values: { kind: "replace", file, crop: crop.values } };
  }

  if (text(formData, "removeImage") === "1") {
    return { ok: true, values: { kind: "remove" } };
  }

  return { ok: true, values: { kind: "none" } };
}
