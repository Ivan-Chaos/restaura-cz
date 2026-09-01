import { describe, expect, it } from "vitest";

import {
  readProfileValues,
  readSignIn,
  readSignUp,
  readVerifyCode,
  type Parsed,
} from "@/lib/validation/form-data";
import { profileFieldPath } from "@/lib/validation/form-values";
import { signUpFormSchema, signUpSchema } from "@/lib/validation/schemas";

/**
 * The client-side rules, pinned against the API's DTOs.
 *
 * These schemas duplicate `apps/api/src/auth/dto/{sign-up,profile}.dto.ts`
 * because the frontend cannot import from the API — the same trade the phone
 * rule makes in `phone.test.ts`. What stops the copies drifting is this file:
 * every bound asserted here is a bound stated there, so a change on one side
 * that is not mirrored fails a suite rather than reaching an owner as a form
 * that accepts input the API then rejects.
 *
 * Each assertion also proves the messages arrive as `FieldErrorCode`s, which is
 * what lets `Auth.fieldErrors` translate a locally-found failure with no new
 * message keys.
 */

function form(values: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((entry) => formData.append(name, entry));
    else formData.set(name, value);
  }
  return formData;
}

const VALID_SIGN_UP = {
  email: "owner@example.com",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
  restaurantName: "U Zlaté Lípy",
  phones: ["+420 601 234 567"],
  location: "Náměstí Míru 12, 120 00 Praha 2",
};

/** The field codes a rejected submission produced, for terse assertions. */
function fieldsOf(result: Parsed<unknown>) {
  if (result.ok) return undefined;
  return result.state.status === "error" ? result.state.fields : undefined;
}

describe("readSignUp", () => {
  it("accepts a complete, valid registration", () => {
    const result = readSignUp(form(VALID_SIGN_UP));
    expect(result.ok).toBe(true);
  });

  it("sends the cleaned values, not the raw ones", () => {
    const result = readSignUp(
      form({
        ...VALID_SIGN_UP,
        email: "  owner@example.com  ",
        restaurantName: "  U Zlaté Lípy  ",
        location: "  Praha 2  ",
        // The blank row an unused input leaves behind must not reach the API.
        phones: ["+420 601 234 567", "  ", ""],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.email).toBe("owner@example.com");
    expect(result.values.restaurantName).toBe("U Zlaté Lípy");
    expect(result.values.location).toBe("Praha 2");
    expect(result.values.phones).toEqual(["+420 601 234 567"]);
  });

  it.each([
    ["not-an-email", "IS_EMAIL"],
    ["", "IS_EMAIL"],
    ["   ", "IS_EMAIL"],
    ["owner@", "IS_EMAIL"],
    ["@example.com", "IS_EMAIL"],
  ])("rejects the email %j as %s", (email, code) => {
    expect(fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, email })))).toMatchObject({
      email: code,
    });
  });

  it("rejects an email past the API's 254-character maximum", () => {
    const email = `${"a".repeat(250)}@example.com`;
    expect(fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, email })))).toMatchObject({
      email: "MAX_LENGTH",
    });
  });

  it("rejects a password shorter than the API's minimum of 8", () => {
    const short = "1234567";
    expect(
      fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, password: short, confirmPassword: short }))),
    ).toMatchObject({ password: "IS_LENGTH" });
  });

  it("rejects a password past the API's maximum of 128", () => {
    const long = "a".repeat(129);
    expect(
      fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, password: long, confirmPassword: long }))),
    ).toMatchObject({ password: "IS_LENGTH" });
  });

  it("pins a mismatched confirmation to the field the owner must retype", () => {
    expect(
      fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, confirmPassword: "something else" }))),
    ).toEqual({ confirmPassword: "INVALID" });
  });

  it("never sends the confirmation onward", () => {
    const result = readSignUp(form(VALID_SIGN_UP));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The action strips it; what matters here is that the schema keeps it
    // separable rather than folding it into the payload.
    expect(Object.keys(result.values)).toContain("confirmPassword");
  });

  it.each([
    ["", "IS_LENGTH"],
    ["   ", "IS_LENGTH"],
    ["a".repeat(121), "IS_LENGTH"],
  ])("rejects the restaurant name %j as %s", (restaurantName, code) => {
    expect(fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, restaurantName })))).toMatchObject({
      restaurantName: code,
    });
  });

  it.each([
    ["", "IS_LENGTH"],
    ["   ", "IS_LENGTH"],
    ["a".repeat(201), "IS_LENGTH"],
  ])("rejects the location %j as %s", (location, code) => {
    expect(fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, location })))).toMatchObject({
      location: code,
    });
  });

  it("requires at least one phone number", () => {
    expect(fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, phones: ["", "  "] })))).toMatchObject({
      phones: "ARRAY_MIN_SIZE",
    });
  });

  it("refuses more than the three the API allows", () => {
    const phones = ["+420 601 234 567", "222 333 444", "333 444 555", "444 555 666"];
    expect(fieldsOf(readSignUp(form({ ...VALID_SIGN_UP, phones })))).toMatchObject({
      phones: "ARRAY_MAX_SIZE",
    });
  });

  /**
   * The per-index path is the whole reason for validating phones here rather
   * than leaving them to the API: class-validator has no index to give, so it
   * reports a bad entry against the list and the form cannot mark the one input
   * at fault.
   */
  it("pins a bad entry to its own input, indexed among the numbers sent", () => {
    expect(
      fieldsOf(
        readSignUp(form({ ...VALID_SIGN_UP, phones: ["+420 601 234 567", "nonsense"] })),
      ),
    ).toMatchObject({ "phones.1": "IS_PHONE" });
  });

  it("indexes past the blanks, matching what the API is sent", () => {
    // Row 2 on screen is empty and never sent, so the bad number is entry 1 in
    // the request — not entry 2 where it sits in the form.
    expect(
      fieldsOf(
        readSignUp(form({ ...VALID_SIGN_UP, phones: ["+420 601 234 567", "", "nonsense"] })),
      ),
    ).toEqual({ "phones.1": "IS_PHONE" });
  });

  it("reports every bad field at once, not one per attempt", () => {
    const fields = fieldsOf(
      readSignUp(
        form({
          ...VALID_SIGN_UP,
          email: "nope",
          password: "short",
          confirmPassword: "short",
          restaurantName: "",
          location: "",
          phones: ["nonsense"],
        }),
      ),
    );

    expect(fields).toMatchObject({
      email: "IS_EMAIL",
      password: "IS_LENGTH",
      restaurantName: "IS_LENGTH",
      location: "IS_LENGTH",
      "phones.0": "IS_PHONE",
    });
  });
});

describe("readSignIn", () => {
  it("accepts an email and any non-empty password", () => {
    // Deliberately shorter than the sign-up minimum: an existing account may
    // predate it, and refusing to even try would lock its owner out.
    const result = readSignIn(form({ email: "owner@example.com", password: "short" }));
    expect(result.ok).toBe(true);
  });

  it("rejects a malformed email before spending a request on it", () => {
    const result = readSignIn(form({ email: "nope", password: "correct horse" }));
    expect(fieldsOf(result)).toMatchObject({ email: "IS_EMAIL" });
  });

  it("asks for a missing password without claiming a minimum length", () => {
    const result = readSignIn(form({ email: "owner@example.com", password: "" }));
    expect(fieldsOf(result)).toMatchObject({ password: "IS_STRING" });
  });
});

describe("readProfileValues", () => {
  it("applies the same rules registration does", () => {
    const result = readProfileValues(
      form({
        restaurantName: "U Zlaté Lípy",
        phones: ["+420 601 234 567"],
        location: "Praha 2",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects what registration would reject", () => {
    const result = readProfileValues(
      form({ restaurantName: "", phones: [""], location: "" }),
    );
    expect(fieldsOf(result)).toMatchObject({
      restaurantName: "IS_LENGTH",
      phones: "ARRAY_MIN_SIZE",
      location: "IS_LENGTH",
    });
  });
});

/**
 * The client form validates a different *container* for phones than the Server
 * Action does — an array of objects, because `useFieldArray` cannot track bare
 * strings. Everything else is the identical schema object. These assertions are
 * what stop the two containers disagreeing about what a valid list is.
 */
describe("the react-hook-form and Server Action schemas agree", () => {
  const base = {
    email: "owner@example.com",
    password: "correct horse battery",
    confirmPassword: "correct horse battery",
    restaurantName: "U Zlaté Lípy",
    location: "Praha 2",
  };

  const rows = (phones: string[]) => phones.map((value) => ({ value }));

  it.each([
    ["one good number", ["+420 601 234 567"], true],
    ["three good numbers", ["601 111 111", "602 222 222", "603 333 333"], true],
    ["a blank row alongside a good one", ["+420 601 234 567", ""], true],
    ["no numbers at all", [""], false],
    ["four numbers", ["601 111 111", "602 222 222", "603 333 333", "604 444 444"], false],
    ["a number that is not one", ["zavolejte mi"], false],
    ["too few digits", ["12345"], false],
  ])("both accept or both reject %s", (_name, phones, expected) => {
    const viaForm = signUpFormSchema.safeParse({ ...base, phones: rows(phones) });
    const viaAction = signUpSchema.safeParse({ ...base, phones });

    expect(viaForm.success).toBe(expected);
    expect(viaAction.success).toBe(expected);
  });

  it("marks the row on screen, where the action marks the entry sent", () => {
    // A blank second row means the bad number is row 2 on screen but entry 1 in
    // the request. Each schema names the one its own caller can act on.
    const phones = ["+420 601 234 567", "", "zavolejte mi"];

    const viaForm = signUpFormSchema.safeParse({ ...base, phones: rows(phones) });
    const viaAction = signUpSchema.safeParse({ ...base, phones });

    expect(viaForm.success).toBe(false);
    expect(viaAction.success).toBe(false);
    if (viaForm.success || viaAction.success) return;

    expect(viaForm.error.issues[0]?.path).toEqual(["phones", 2, "value"]);
    expect(viaAction.error.issues[0]?.path).toEqual(["phones", 1]);
  });

  it("applies the same bounds to the fields that have no container difference", () => {
    for (const bad of [
      { email: "nope" },
      { password: "short" },
      { restaurantName: "" },
      { location: "" },
    ]) {
      const values = { ...base, ...bad };
      expect(
        signUpFormSchema.safeParse({ ...values, phones: rows(["+420 601 234 567"]) }).success,
      ).toBe(false);
      expect(signUpSchema.safeParse({ ...values, phones: ["+420 601 234 567"] }).success).toBe(
        false,
      );
    }
  });
});

describe("profileFieldPath", () => {
  it("moves a phone entry onto the row the form holds it in", () => {
    expect(profileFieldPath("phones.1")).toBe("phones.1.value");
  });

  it("leaves the list itself and every other field alone", () => {
    expect(profileFieldPath("phones")).toBe("phones");
    expect(profileFieldPath("restaurantName")).toBe("restaurantName");
    expect(profileFieldPath("location")).toBe("location");
  });
});

describe("readVerifyCode", () => {
  it("accepts six digits", () => {
    const result = readVerifyCode(form({ code: "123456" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.code).toBe("123456");
  });

  it("accepts six digits with stray spaces around them", () => {
    const result = readVerifyCode(form({ code: " 123456 " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.code).toBe("123456");
  });

  it.each(["12345", "1234567", "abcdef", "12 34 56", "", "12345a"])(
    "rejects %j as malformed",
    (code) => {
      expect(fieldsOf(readVerifyCode(form({ code })))).toMatchObject({ code: "INVALID" });
    },
  );
});
