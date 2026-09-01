import { z } from "zod";

import {
  collectPhones,
  isValidPhone,
  MAX_PHONES,
  MIN_PHONES,
  normalizePhone,
} from "../api/phone";

/**
 * The sign-up and profile rules, mirroring the API's DTOs.
 *
 * Every message is a `FieldErrorCode`, not prose — see `zod-fields.ts` for why.
 * That constraint is what lets these schemas run in the browser *and* in a
 * Server Action while producing the one `FormState` shape every form already
 * renders, in three languages, with no new message keys.
 *
 * The API remains the authority. These exist so an owner learns their email is
 * malformed as they leave the field, rather than after a round trip, and so the
 * no-JS path still rejects bad input before spending a request on it.
 *
 * Bounds are duplicated from `apps/api/src/auth/dto/{sign-up,profile}.dto.ts`
 * deliberately, for the same reason `lib/api/phone.ts` duplicates the phone
 * rule: the frontend cannot import from the API. `tests/unit/validation.test.ts`
 * pins them so the copies cannot drift silently.
 */

const emailFormat = z.email();

/** class-validator reports `@Length` as `IS_LENGTH` and `@MaxLength` as `MAX_LENGTH`. */
const email = z
  .string()
  .trim()
  .min(1, "IS_EMAIL")
  .max(254, "MAX_LENGTH")
  // The format is checked last so the bounds get to speak first: a 300-character
  // string is reported as too long, which is actionable, rather than as
  // malformed, which is merely true.
  .refine((value) => emailFormat.safeParse(value).success, "IS_EMAIL");

const password = z.string().min(8, "IS_LENGTH").max(128, "IS_LENGTH");

const restaurantName = z.string().trim().min(1, "IS_LENGTH").max(120, "IS_LENGTH");

const location = z.string().trim().min(1, "IS_LENGTH").max(200, "IS_LENGTH");

/**
 * The raw rows as the form posts them, blanks included: an owner who added a
 * third input and left it empty meant two numbers, not an error, and
 * `collectPhones` is what decides that.
 */
const phones = z
  .array(z.string())
  .superRefine((rows, ctx) => {
    const collected = collectPhones(rows);

    // Paths here are *relative* to this field, which zod prefixes with
    // `phones` itself: `[]` marks the list, `[index]` marks one entry.
    if (collected.length < MIN_PHONES) {
      ctx.addIssue({ code: "custom", path: [], message: "ARRAY_MIN_SIZE" });
      return;
    }

    if (collected.length > MAX_PHONES) {
      ctx.addIssue({ code: "custom", path: [], message: "ARRAY_MAX_SIZE" });
      return;
    }

    // Indexed against the collected list, matching what the API reports and
    // what `PhoneListField` marks: the position among the numbers that were
    // actually sent, not among the inputs on screen.
    collected.forEach((phone, index) => {
      if (!isValidPhone(phone)) {
        ctx.addIssue({ code: "custom", path: [index], message: "IS_PHONE" });
      }
    });
  })
  // The parsed value is what gets sent, so it is the cleaned list — the blank
  // rows an unused input leaves behind have no business reaching the API.
  .transform((rows) => collectPhones(rows));

/**
 * The same phone rules over the shape react-hook-form's `useFieldArray`
 * requires — an array of objects, because it does not track arrays of bare
 * strings.
 *
 * The one deliberate difference from the flat version: a bad entry is marked at
 * the row the owner is looking at, not at its position among the numbers that
 * would be sent. On screen those are the same thing until a row in the middle
 * is left blank, and at that point the row they can see is the useful one.
 */
const phoneRows = z.array(z.object({ value: z.string() })).superRefine((rows, ctx) => {
  const collected = collectPhones(rows.map((row) => row.value));

  if (collected.length < MIN_PHONES) {
    ctx.addIssue({ code: "custom", path: [], message: "ARRAY_MIN_SIZE" });
    return;
  }

  if (collected.length > MAX_PHONES) {
    ctx.addIssue({ code: "custom", path: [], message: "ARRAY_MAX_SIZE" });
    return;
  }

  rows.forEach((row, index) => {
    const phone = normalizePhone(row.value);
    // A blank row is an unused input, not a mistake.
    if (phone !== "" && !isValidPhone(phone)) {
      ctx.addIssue({ code: "custom", path: [index, "value"], message: "IS_PHONE" });
    }
  });
});

/** Shared by registration, the completion step and the settings form. */
export const profileSchema = z.object({
  restaurantName,
  phones,
  location,
});

/**
 * `confirmPassword` is validated here and never sent onward: confirming a typed
 * password is the form's job, and the API rejects the field outright rather
 * than handling a second copy of the secret.
 */
export const signUpSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
    restaurantName,
    phones,
    location,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "INVALID",
  });

/**
 * No length rule on the password: an existing account may predate the current
 * minimum, and telling someone their correct password is too short would be
 * both wrong and a hint about what we store.
 */
export const signInSchema = z.object({
  email,
  // `IS_STRING` renders as "this field is required", which is all that can
  // honestly be said: `IS_LENGTH` would claim a minimum this form does not have.
  password: z.string().min(1, "IS_STRING"),
});

/** Shape only. Whether the code is *right* is the API's answer to give. */
export const verifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "INVALID"),
});

export type SignUpValues = z.output<typeof signUpSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

// ------------------------------------------------------- react-hook-form
//
// The same rules over the shape the client form holds. Only the phones
// *container* differs — every other field is the identical schema object — so
// the two flavours cannot disagree about what a valid name or address is.
// `tests/unit/validation.test.ts` asserts they agree about phones too.

export const profileFormSchema = z.object({
  restaurantName,
  phones: phoneRows,
  location,
});

export const signUpFormSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
    restaurantName,
    phones: phoneRows,
    location,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "INVALID",
  });

/** No phones, so the client and server flavours are the very same schema. */
export const signInFormSchema = signInSchema;

export const verifyCodeFormSchema = verifyCodeSchema;

export type SignUpFormValues = z.input<typeof signUpFormSchema>;
export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type SignInFormValues = z.input<typeof signInFormSchema>;
export type VerifyCodeFormValues = z.input<typeof verifyCodeFormSchema>;
