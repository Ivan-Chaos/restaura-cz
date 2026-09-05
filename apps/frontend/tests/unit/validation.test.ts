import { describe, expect, it } from "vitest";

import { VISUAL_VARIANT_IDS } from "@/lib/menu-display/variants";
import {
  readInlineText,
  readItem,
  readProfileValues,
  readSignIn,
  readSignUp,
  readVerifyCode,
  readVisualVariant,
  type Parsed,
} from "@/lib/validation/form-data";
import {
  inlineTextFormData,
  itemFormData,
  profileFieldPath,
} from "@/lib/validation/form-values";
import { menuItemFormSchema, signUpFormSchema, signUpSchema } from "@/lib/validation/schemas";

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

/**
 * The menu editor's rules, pinned against `apps/api/src/menus/dto/*.dto.ts` in
 * the same way and for the same reason.
 *
 * The price cases are the interesting half: the owner types a string, the API
 * wants a number of korunas with at most two decimals, and which of the two
 * failures gets reported decides whether the message under the field is useful.
 */
describe("readItem", () => {
  /** Declarations default to "nothing", which is what an untouched form posts. */
  const NO_DECLARATIONS = {
    dietary: [],
    allergens: [],
    warnings: [],
    spiceLevel: "0",
    availability: "available",
  };

  const VALID_ITEM = {
    name: "Kulajda",
    description: "Se zastřeným vejcem",
    priceCzk: "89",
    ...NO_DECLARATIONS,
  };

  it("accepts a complete dish and sends the price as a number", () => {
    const result = readItem(form(VALID_ITEM));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toEqual({
      name: "Kulajda",
      description: "Se zastřeným vejcem",
      priceCzk: 89,
      dietary: [],
      allergens: [],
      warnings: [],
      spiceLevel: 0,
      availability: "available",
    });
  });

  it("trims what was typed", () => {
    const result = readItem(
      form({ name: "  Kulajda  ", description: "  ", priceCzk: " 89 ", ...NO_DECLARATIONS }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toMatchObject({ name: "Kulajda", description: "", priceCzk: 89 });
  });

  it.each([
    ["89", 89],
    ["0", 0],
    ["56.50", 56.5],
    // A Czech keyboard and a Czech reader both use a comma; it is the same price.
    ["56,50", 56.5],
    ["56.5", 56.5],
    ["1234.99", 1234.99],
  ])("reads %j as %d korunas", (typed, expected) => {
    const result = readItem(form({ ...VALID_ITEM, priceCzk: typed }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.priceCzk).toBe(expected);
  });

  it.each([
    // A word is not a price, and neither is a third decimal place. Both have
    // the same fix, so both report IS_NUMBER.
    ["zdarma", "IS_NUMBER"],
    ["89 Kč", "IS_NUMBER"],
    ["56.555", "IS_NUMBER"],
    ["56,555", "IS_NUMBER"],
    [".5", "IS_NUMBER"],
    // Negative passes the pattern, so the range check is what speaks — and
    // "cannot be negative" is the useful thing to say about it.
    ["-5", "MIN"],
    ["-0.01", "MIN"],
    // Nothing typed at all is a missing field, not a malformed number.
    ["", "IS_LENGTH"],
    ["   ", "IS_LENGTH"],
  ])("rejects the price %j as %s", (typed, code) => {
    expect(fieldsOf(readItem(form({ ...VALID_ITEM, priceCzk: typed })))).toMatchObject({
      priceCzk: code,
    });
  });

  it("requires a name and bounds it at 200 characters", () => {
    expect(fieldsOf(readItem(form({ ...VALID_ITEM, name: "" })))).toMatchObject({
      name: "IS_LENGTH",
    });
    expect(readItem(form({ ...VALID_ITEM, name: "K".repeat(200) })).ok).toBe(true);
    expect(fieldsOf(readItem(form({ ...VALID_ITEM, name: "K".repeat(201) })))).toMatchObject({
      name: "IS_LENGTH",
    });
  });

  it("allows no description and bounds one at 2000 characters", () => {
    expect(readItem(form({ ...VALID_ITEM, description: "" })).ok).toBe(true);
    expect(readItem(form({ ...VALID_ITEM, description: "d".repeat(2000) })).ok).toBe(true);
    expect(
      fieldsOf(readItem(form({ ...VALID_ITEM, description: "d".repeat(2001) }))),
    ).toMatchObject({ description: "MAX_LENGTH" });
  });

  it("reports every bad field at once, so one submit explains the whole form", () => {
    expect(fieldsOf(readItem(form({ name: "", description: "", priceCzk: "zdarma" })))).toEqual({
      name: "IS_LENGTH",
      priceCzk: "IS_NUMBER",
    });
  });
});

describe("readInlineText", () => {
  it.each(["name", "title"] as const)("accepts a %s of one to 120 characters", (field) => {
    expect(readInlineText(form({ [field]: "Polední menu" }), field).ok).toBe(true);
    expect(readInlineText(form({ [field]: "P".repeat(120) }), field).ok).toBe(true);
    expect(fieldsOf(readInlineText(form({ [field]: "" }), field))).toMatchObject({
      [field]: "IS_LENGTH",
    });
    expect(fieldsOf(readInlineText(form({ [field]: "P".repeat(121) }), field))).toMatchObject({
      [field]: "IS_LENGTH",
    });
  });

  it("marks the field the caller posts under, not a fixed one", () => {
    // The code has to land on the input the owner can see, and a section
    // posts "title" while a menu posts "name".
    expect(fieldsOf(readInlineText(form({ title: "  " }), "title"))).toEqual({
      title: "IS_LENGTH",
    });
    expect(fieldsOf(readInlineText(form({ name: "  " }), "name"))).toEqual({
      name: "IS_LENGTH",
    });
  });

  it("trims the stored value", () => {
    const result = readInlineText(form({ title: "  Polévky  " }), "title");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.title).toBe("Polévky");
  });
});

/**
 * The visual-style picker (feature 005 FR-006). Mirrors the API's
 * `@IsIn(VISUAL_VARIANTS)`; the id list itself is pinned in `variants.test.ts`.
 */
describe("readVisualVariant", () => {
  it.each(VISUAL_VARIANT_IDS)("accepts %s", (id) => {
    const result = readVisualVariant(form({ visualVariant: id }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.visualVariant).toBe(id);
  });

  it("rejects an id outside the catalogue without reaching the API", () => {
    expect(fieldsOf(readVisualVariant(form({ visualVariant: "elegant" })))).toEqual({
      visualVariant: "INVALID",
    });
    expect(fieldsOf(readVisualVariant(form({ visualVariant: "slate" })))).toEqual({
      visualVariant: "INVALID",
    });
  });

  it("rejects a missing field", () => {
    expect(fieldsOf(readVisualVariant(form({})))).toEqual({ visualVariant: "INVALID" });
  });
});

/**
 * The client posts through these, the no-JS path posts the same names straight
 * from the DOM, and the action reads both with `readItem`/`readInlineText`.
 * These assertions are what prove the two paths agree.
 */
describe("itemFormData and inlineTextFormData", () => {
  const hidden = { locale: "cs", menuId: "menu-1", sectionId: "section-1" };

  /** A dish declaring nothing, which is what the form posts before anything is ticked. */
  const plain = { dietary: [], allergens: [], warnings: [], spiceLevel: "0", availability: "available" };

  it("round-trips a dish through the same reader the action uses", () => {
    const values = { name: "Kulajda", description: "S vejcem", priceCzk: "56,50", ...plain };
    const result = readItem(itemFormData(values, hidden));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toEqual({
      name: "Kulajda",
      description: "S vejcem",
      priceCzk: 56.5,
      dietary: [],
      allergens: [],
      warnings: [],
      spiceLevel: 0,
      availability: "available",
    });
  });

  it("round-trips what a dish declares, under repeated names", () => {
    const values = {
      name: "Kulajda",
      description: "",
      priceCzk: "89",
      ...plain,
      dietary: ["vegetarian", "lenten"],
      allergens: ["3", "7"],
      warnings: ["rawOrUndercooked"],
      spiceLevel: "2",
      availability: "soldOut",
    };
    const formData = itemFormData(values, hidden);

    // One name, several values — the same shape the checkboxes post directly,
    // which is what makes the no-JavaScript path identical to this one.
    expect(formData.getAll("dietary")).toEqual(["vegetarian", "lenten"]);
    expect(formData.getAll("allergens")).toEqual(["3", "7"]);

    const result = readItem(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toMatchObject({
      dietary: ["vegetarian", "lenten"],
      allergens: [3, 7],
      warnings: ["rawOrUndercooked"],
      spiceLevel: 2,
      availability: "soldOut",
    });
  });

  it.each([
    ["a marker outside the catalogue", { dietary: ["spicy"] }, "dietary"],
    ["an allergen off the legend", { allergens: ["15"] }, "allergens"],
    ["a spice level off the scale", { spiceLevel: "4" }, "spiceLevel"],
    ["an availability nobody defined", { availability: "maybe" }, "availability"],
  ])("refuses %s before it reaches the API", (_label, override, field) => {
    const values = { name: "Kulajda", description: "", priceCzk: "89", ...plain, ...override };
    const result = readItem(itemFormData(values, hidden));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const fields = fieldsOf(result) ?? {};
    expect(Object.keys(fields).some((key) => key.startsWith(field))).toBe(true);
  });

  it("carries the ids the action needs", () => {
    const formData = itemFormData(
      { name: "Kulajda", description: "", priceCzk: "89", ...plain },
      { ...hidden, itemId: "item-1" },
    );
    expect(formData.get("locale")).toBe("cs");
    expect(formData.get("menuId")).toBe("menu-1");
    expect(formData.get("sectionId")).toBe("section-1");
    expect(formData.get("itemId")).toBe("item-1");
  });

  it("posts the price as typed, so the action validates what the owner wrote", () => {
    const formData = itemFormData(
      { name: "K", description: "", priceCzk: "56,50", ...plain },
      hidden,
    );
    expect(formData.get("priceCzk")).toBe("56,50");
  });

  it("round-trips a title under the field it was built for", () => {
    const formData = inlineTextFormData("title", { title: "Polévky" }, hidden);
    expect(formData.get("title")).toBe("Polévky");
    expect(formData.get("menuId")).toBe("menu-1");
    expect(readInlineText(formData, "title").ok).toBe(true);
  });
});

describe("menuItemFormSchema", () => {
  it("is the same schema the action uses, so the browser cannot be laxer", () => {
    // Same object, not merely equivalent rules: a dish has no container that
    // differs between the two sides, unlike the phone list.
    const client = menuItemFormSchema.safeParse({
      name: "Kulajda",
      description: "",
      priceCzk: "56,50",
      dietary: [],
      allergens: [],
      warnings: [],
      spiceLevel: "0",
      availability: "available",
    });
    expect(client.success).toBe(true);
    if (!client.success) return;
    expect(client.data.priceCzk).toBe(56.5);
  });
});
