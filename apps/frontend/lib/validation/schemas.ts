import { z } from "zod";

import {
  ALLERGEN_IDS,
  API_DIETARY_IDS,
  AVAILABILITY_IDS,
  DISH_WARNING_IDS,
} from "@/lib/design-system/dietary";
import { VISUAL_VARIANT_IDS, type VisualVariantId } from "@/lib/menu-display/variants";

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

// ------------------------------------------------------------ menu editor
//
// Bounds duplicated from `apps/api/src/menus/dto/{menu,section,item}.dto.ts`
// for the same reason as the auth ones above, and pinned by the same test.

/** A menu name and a section title are one rule in the API: `@Length(1, 120)`. */
const title = z.string().trim().min(1, "IS_LENGTH").max(120, "IS_LENGTH");

const itemName = z.string().trim().min(1, "IS_LENGTH").max(200, "IS_LENGTH");

/** Optional to the owner; the action decides whether blank means absent or null. */
const itemDescription = z.string().trim().max(2000, "MAX_LENGTH");

/**
 * A price as it is typed: korunas, with hellers allowed but not required.
 *
 * A comma is accepted because a Czech keyboard and a Czech reader both use one;
 * it is normalised to a dot before the number is parsed, so `56,50` and `56.50`
 * are the same price rather than one of them being a mistake.
 *
 * The pattern is what rejects `zdarma` and `56,555`, and it runs before the
 * range check so the two never both speak: `CODE_PRIORITY` would keep IS_NUMBER
 * anyway, and this way there is nothing to prioritise. `-5` passes the pattern
 * and is caught by `.min(0)`, which is the only case where "cannot be negative"
 * is the useful thing to say.
 */
const PRICE_PATTERN = /^-?\d+(?:[.,]\d{1,2})?$/;

const priceCzk = z
  .string()
  .trim()
  .min(1, "IS_LENGTH")
  .regex(PRICE_PATTERN, "IS_NUMBER")
  .transform((raw) => Number(raw.replace(",", ".")))
  .pipe(z.number().min(0, "MIN"));

/**
 * A set of ids, as a form posts them.
 *
 * Repeated inputs under one name, read back with `getAll`, exactly like the
 * phone list — which is what lets the no-JavaScript path work: a checkbox posts
 * its value or nothing at all, so a group of them *is* the array.
 *
 * Unknown ids are `IS_IN`, matching the API's `@IsIn`, so a value the browser
 * refuses and the same value the API refuses render through one translation.
 */
function idSet<T extends string>(ids: readonly [T, ...T[]]) {
  return z.array(z.enum(ids, { message: "IS_IN" })).max(ids.length, "ARRAY_MAX_SIZE");
}

const dietary = idSet(API_DIETARY_IDS as unknown as [string, ...string[]]);
const warnings = idSet(DISH_WARNING_IDS as unknown as [string, ...string[]]);

/**
 * Allergen numbers, which arrive from a form as strings.
 *
 * `IS_INT` before the range check for the same reason the price puts
 * `IS_NUMBER` first: "12,5" and "" are type problems, and `CODE_PRIORITY`
 * prefers those over a range complaint that would only confuse.
 */
const allergens = z
  .array(
    z
      .string()
      .trim()
      .regex(/^\d+$/, "IS_INT")
      .transform((raw) => Number(raw))
      .pipe(z.number().int("IS_INT").min(1, "MIN").max(ALLERGEN_IDS.length, "MAX")),
  )
  .max(ALLERGEN_IDS.length, "ARRAY_MAX_SIZE");

/** 0–3, and 0 is what a dish is unless somebody says otherwise. */
const spiceLevel = z
  .string()
  .trim()
  .regex(/^\d+$/, "IS_INT")
  .transform((raw) => Number(raw))
  .pipe(z.number().int("IS_INT").min(0, "MIN").max(3, "MAX"));

const availability = z.enum(
  AVAILABILITY_IDS as unknown as [string, ...string[]],
  { message: "IS_IN" },
);

export const menuItemSchema = z.object({
  name: itemName,
  description: itemDescription,
  priceCzk,
  dietary,
  allergens,
  warnings,
  spiceLevel,
  availability,
});

/**
 * The client flavour is the very same schema: unlike the phone list, nothing
 * about a dish is shaped differently in the browser. The price is a string on
 * the way in and a number on the way out either way.
 */
export const menuItemFormSchema = menuItemSchema;

/** Which field a one-line form posts under: menus have a name, sections a title. */
export type InlineTextField = "name" | "title";

/**
 * A one-field form's schema, built for the field it is actually posting.
 *
 * Named by the caller rather than by a fixed internal key because
 * react-hook-form matches an input to its path by the DOM `name` attribute, and
 * the browser has to post the name the Server Action reads when JavaScript
 * never loads. One key, all three jobs.
 */
export function inlineTextSchema(
  field: InlineTextField,
): z.ZodType<Record<string, string>, Record<string, string>> {
  // The cast is the price of a computed key: zod infers `{ [x: string]: string }`
  // from `z.object({ [field]: … })` and cannot narrow it to the two literal
  // field names, so the declared return type is what callers see. The runtime
  // schema is exactly the one `title` describes, and
  // `tests/unit/validation.test.ts` checks it under both names.
  return z.object({ [field]: title }) as unknown as z.ZodType<
    Record<string, string>,
    Record<string, string>
  >;
}

/** What the form holds: the price is still the string that was typed. */
export type MenuItemFormValues = z.input<typeof menuItemFormSchema>;

/**
 * The visual-style picker (feature 005). The allowed ids are the catalogue in
 * `lib/menu-display/variants.ts`, which mirrors the API's `@IsIn` allowlist;
 * anything else is `INVALID` and never reaches the API.
 */
export const visualVariantSchema = z.object({
  visualVariant: z.enum(VISUAL_VARIANT_IDS as [VisualVariantId, ...VisualVariantId[]], {
    message: "INVALID",
  }),
});

export type VisualVariantValues = z.output<typeof visualVariantSchema>;
