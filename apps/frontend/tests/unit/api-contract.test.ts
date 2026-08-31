import { describe, expect, expectTypeOf, it } from "vitest";

import { parseSessionCookie, SESSION_COOKIE } from "@/lib/api/cookies";
import { toFormState } from "@/lib/api/form-state";
import type {
  AccountResponse,
  ApiError,
  MenuDetailResponse,
  MenuListResponse,
  ProfileResponse,
  PublicMenuResponse,
  PublishResponse,
  UnpublishResponse,
} from "@/lib/api/types";

/**
 * The frontend's half of the cross-app contract test.
 *
 * The API's e2e suite proves it *serves* these shapes; this proves we *expect*
 * them. The fixtures below are copied from
 * `specs/001-menu-creation-publishing/contracts/http-api.md` and its amendment
 * `specs/002-signup-dashboard-revamp/contracts/http-api.md`, so if the contract
 * changes and only one app is updated, one of the two suites fails.
 */

describe("response shapes match the contract", () => {
  it("accepts the documented account response, profile and all", () => {
    const payload = {
      account: { id: "8d1c…", email: "owner@example.com" },
      profile: {
        restaurantName: "U Zlaté Lípy",
        phones: ["+420 601 234 567"],
        location: "Náměstí Míru 12, 120 00 Praha 2",
      },
    };
    expectTypeOf(payload).toExtend<AccountResponse>();
    expect(payload.account.email).toBe("owner@example.com");
    expect(payload.profile.phones).toHaveLength(1);
  });

  it("accepts a null profile, which is how an incomplete account is reported", () => {
    const payload = { account: { id: "8d1c…", email: "owner@example.com" }, profile: null };
    expectTypeOf(payload).toExtend<AccountResponse>();
    expect(payload.profile).toBeNull();
  });

  it("accepts the documented profile response", () => {
    const payload = {
      profile: {
        restaurantName: "U Zlaté Lípy",
        phones: ["+420 601 234 567", "222 333 444"],
        location: "Náměstí Míru 12, 120 00 Praha 2",
      },
    };
    expectTypeOf(payload).toExtend<ProfileResponse>();
    // Order is the owner's, so it must survive the round trip unchanged.
    expect(payload.profile.phones[0]).toBe("+420 601 234 567");
  });

  it("accepts the documented menu list response", () => {
    const payload = {
      menus: [
        {
          id: "8d1c…",
          name: "Lunch",
          status: "draft" as const,
          publicSlug: null,
          updatedAt: "2026-08-31T10:00:00.000Z",
        },
      ],
    };
    expectTypeOf(payload).toExtend<MenuListResponse>();
    expect(payload.menus[0]?.publicSlug).toBeNull();
  });

  it("accepts the documented menu detail response", () => {
    const payload = {
      menu: {
        id: "8d1c…",
        name: "Lunch",
        status: "draft" as const,
        publicSlug: null,
        visualVariant: "default",
        updatedAt: "2026-08-31T10:00:00.000Z",
        sections: [
          {
            id: "sec-1",
            title: "Starters",
            position: 0,
            items: [
              { id: "item-1", name: "Soup", description: null, priceCzk: 89, position: 0 },
            ],
          },
        ],
      },
    };
    expectTypeOf(payload).toExtend<MenuDetailResponse>();
    expect(payload.menu.sections[0]?.items[0]?.priceCzk).toBe(89);
  });

  it("accepts the documented publish and unpublish responses", () => {
    const published = {
      status: "published" as const,
      publicSlug: "u-modre-kachny-x7k2qf",
      publicPath: "/m/u-modre-kachny-x7k2qf",
    };
    const unpublished = { status: "draft" as const, publicSlug: "u-modre-kachny-x7k2qf" };

    expectTypeOf(published).toExtend<PublishResponse>();
    expectTypeOf(unpublished).toExtend<UnpublishResponse>();
    // The address survives unpublishing, so a printed QR code keeps working.
    expect(unpublished.publicSlug).toBe(published.publicSlug);
  });

  it("accepts the documented public menu response, which carries no ids", () => {
    const payload = {
      menu: {
        name: "Lunch",
        visualVariant: "default",
        sections: [
          { title: "Starters", items: [{ name: "Soup", description: null, priceCzk: 89 }] },
        ],
      },
    };
    expectTypeOf(payload).toExtend<PublicMenuResponse>();
    expect(JSON.stringify(payload)).not.toContain('"id"');
  });
});

describe("toFormState", () => {
  it("pins each documented field code to its input", () => {
    const error: ApiError = {
      code: "VALIDATION_FAILED",
      message: "Request body failed validation.",
      details: [
        { field: "email", code: "IS_EMAIL", message: "must be a valid email address" },
        { field: "password", code: "IS_LENGTH", message: "must be longer than 8 characters" },
      ],
    };

    expect(toFormState(error)).toEqual({
      status: "error",
      code: "VALIDATION_FAILED",
      fields: { email: "IS_EMAIL", password: "IS_LENGTH" },
    });
  });

  it("pins the profile field codes the sign-up contract documents", () => {
    const error: ApiError = {
      code: "VALIDATION_FAILED",
      message: "Request body failed validation.",
      details: [
        { field: "restaurantName", code: "IS_LENGTH", message: "wrong length" },
        { field: "phones", code: "IS_PHONE", message: "must be a phone number" },
        { field: "location", code: "IS_STRING", message: "must be a string" },
      ],
    };

    expect(toFormState(error)).toEqual({
      status: "error",
      code: "VALIDATION_FAILED",
      fields: {
        restaurantName: "IS_LENGTH",
        phones: "IS_PHONE",
        location: "IS_STRING",
      },
    });
  });

  /**
   * The API reports a bad entry against the list as a whole; the Server Action
   * applies the same rule per entry and pins `phones.<index>` itself, so the
   * form can mark the one input at fault.
   */
  it("carries a per-index phone key the Server Action produced", () => {
    const state = toFormState({
      code: "VALIDATION_FAILED",
      message: "x",
      details: [{ field: "phones.1", code: "IS_PHONE", message: "must be a phone number" }],
    });

    expect(state).toMatchObject({ fields: { "phones.1": "IS_PHONE" } });
  });

  it("keeps too-many-phones distinct from too-few, since the fixes differ", () => {
    const error: ApiError = {
      code: "VALIDATION_FAILED",
      message: "Request body failed validation.",
      details: [
        { field: "phones", code: "ARRAY_MAX_SIZE", message: "must contain no more than 3" },
      ],
    };

    expect(toFormState(error)).toMatchObject({ fields: { phones: "ARRAY_MAX_SIZE" } });
  });

  it("shows one reason per field, preferring the type problem", () => {
    const error: ApiError = {
      code: "VALIDATION_FAILED",
      message: "Request body failed validation.",
      details: [
        { field: "name", code: "IS_STRING", message: "must be a string" },
        { field: "name", code: "IS_LENGTH", message: "wrong length" },
      ],
    };

    expect(toFormState(error)).toMatchObject({ fields: { name: "IS_STRING" } });
  });

  it("prefers 'enter a whole number' over 'cannot be negative' for a word", () => {
    // A price of "free" trips both isInt and min. Telling the owner their word
    // is negative explains nothing; telling them to enter a number does.
    const error: ApiError = {
      code: "VALIDATION_FAILED",
      message: "Request body failed validation.",
      details: [
        { field: "priceCzk", code: "MIN", message: "must not be less than 0" },
        { field: "priceCzk", code: "IS_INT", message: "must be an integer" },
      ],
    };

    expect(toFormState(error)).toMatchObject({ fields: { priceCzk: "IS_INT" } });
  });

  it("degrades an unrecognised constraint to a generic message rather than dropping it", () => {
    const error: ApiError = {
      code: "VALIDATION_FAILED",
      message: "Request body failed validation.",
      details: [{ field: "name", code: "SOME_FUTURE_RULE", message: "nope" }],
    };

    expect(toFormState(error)).toMatchObject({ fields: { name: "INVALID" } });
  });

  it.each(["EMAIL_TAKEN", "INVALID_CREDENTIALS", "UNAUTHENTICATED", "NOT_FOUND", "INTERNAL", "NETWORK"] as const)(
    "reports %s as a form-level error with no field errors",
    (code) => {
      expect(toFormState({ code, message: "whatever" })).toEqual({ status: "error", code });
    },
  );

  it("treats a validation failure with no details as form-level", () => {
    expect(toFormState({ code: "VALIDATION_FAILED", message: "x", details: [] })).toEqual({
      status: "error",
      code: "VALIDATION_FAILED",
    });
  });
});

describe("parseSessionCookie", () => {
  it("extracts the token and expiry the API set", () => {
    const parsed = parseSessionCookie([
      `${SESSION_COOKIE}=abc123; Path=/; Expires=Wed, 30 Sep 2026 10:00:00 GMT; HttpOnly; SameSite=Lax`,
    ]);

    expect(parsed?.value).toBe("abc123");
    expect(parsed?.expires?.toISOString()).toBe("2026-09-30T10:00:00.000Z");
  });

  it("ignores other cookies in the same response", () => {
    const parsed = parseSessionCookie(["other=1; Path=/", `${SESSION_COOKIE}=abc123; Path=/`]);
    expect(parsed?.value).toBe("abc123");
  });

  it("returns null when no session cookie was set", () => {
    expect(parseSessionCookie(["other=1; Path=/"])).toBeNull();
    expect(parseSessionCookie([])).toBeNull();
  });

  it("returns null for a cleared cookie, so sign-out is not mistaken for a session", () => {
    expect(parseSessionCookie([`${SESSION_COOKIE}=; Path=/; Max-Age=0`])).toBeNull();
  });

  it("omits an unparseable expiry rather than producing an invalid date", () => {
    const parsed = parseSessionCookie([`${SESSION_COOKIE}=abc123; Expires=not-a-date`]);
    expect(parsed?.value).toBe("abc123");
    expect(parsed?.expires).toBeUndefined();
  });
});
