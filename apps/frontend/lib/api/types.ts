import type { PlanId } from "@/lib/landing/plans";

/**
 * The frontend's half of the cross-app contract.
 *
 * These mirror `specs/001-menu-creation-publishing/contracts/http-api.md`, as
 * amended by `specs/002-signup-dashboard-revamp/contracts/http-api.md` and
 * `specs/003-email-verification/contracts/http-api.md`. The API proves it
 * serves these shapes; `tests/unit/api-contract.test.ts` proves we expect them.
 * Change one side and you must change the other in the same change set.
 */

/** Every code the API can return, plus one the browser side can produce. */
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "INTERNAL"
  /** A well-formed confirmation code that is simply wrong. */
  | "CODE_INVALID"
  /** The confirmation code has lapsed, or none was ever issued. */
  | "CODE_EXPIRED"
  /** Too many wrong codes, or a resend asked for before the cooldown elapsed. */
  | "TOO_MANY_ATTEMPTS"
  /** A valid session whose account has not confirmed its email address. */
  | "EMAIL_UNVERIFIED"
  /** Not from the API: the request never completed. */
  | "NETWORK";

/**
 * Constraint names the API attaches to a failed field. Anything outside this
 * list still renders, as a generic "not valid" message.
 */
export type FieldErrorCode =
  | "IS_EMAIL"
  | "IS_STRING"
  | "IS_INT"
  /** A price that is not a number, or carries more than two decimal places. */
  | "IS_NUMBER"
  | "IS_IN"
  | "IS_EMPTY"
  /** class-validator names the `@Length` constraint `isLength`. */
  | "IS_LENGTH"
  | "MAX_LENGTH"
  | "MIN"
  | "AT_LEAST_ONE_DEFINED"
  /** A phone number the API could not read as one. */
  | "IS_PHONE"
  | "IS_ARRAY"
  /** Fewer phone numbers than the minimum of one. */
  | "ARRAY_MIN_SIZE"
  /** More phone numbers than the maximum of three. */
  | "ARRAY_MAX_SIZE"
  /** An upload over the 10 MB limit. Noticed by the browser or by the API. */
  | "MAX_FILE_SIZE"
  /** Bytes that are not a JPEG, PNG or WebP, whatever the filename claimed. */
  | "IS_IMAGE"
  /** A crop rectangle that is incomplete, or does not fit inside the image. */
  | "IS_CROP";

export interface ApiFieldError {
  field: string;
  code: string;
  /** Developer-facing. Never shown to a user — the UI translates `code`. */
  message: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: ApiFieldError[];
}

/**
 * Expected failures (a taken email, a rejected field) are values, not
 * exceptions: forms have to render them.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// ------------------------------------------------------------------ auth

export interface Account {
  id: string;
  email: string;
  /**
   * False until the owner enters the 6-digit code emailed to them. The
   * dashboard gate keys off this before it looks at the profile, and the API
   * refuses menu writes without it, so an unverified session can see the
   * confirmation screen and nothing else.
   */
  emailVerified: boolean;
  /**
   * Which plan the account is on (feature 007). Always sent by the current API
   * and defaulted to `free` in the database; an older API that omits it is read
   * as `free` by `planOf`, never as "no plan".
   *
   * The one entitlement it currently decides: whether a downloaded PDF may
   * leave off the Restaura line.
   */
  plan: PlanId;
}

/**
 * A stored image, ready to display (feature 006).
 *
 * The dimensions are the rendition's own, so `next/image` can reserve the right
 * box before the bytes arrive and the page never shifts. Storage keys are never
 * exposed — only the URL a browser fetches.
 */
export interface ImageRef {
  url: string;
  width: number;
  height: number;
}

/**
 * The business identity behind an account. Its absence — `profile: null` on
 * `/auth/me` — is what marks an account as incomplete and sends its owner to
 * the profile-completion step instead of the dashboard.
 */
export interface RestaurantProfile {
  restaurantName: string;
  /** One to three, in the order the owner entered them. */
  phones: string[];
  /** Free-form address text. */
  location: string;
  /**
   * The restaurant's logo, or `null` — which is the normal state, and means
   * guests see the name in text. Set through its own endpoints, never as part
   * of a profile save.
   */
  logo: ImageRef | null;
}

export interface AccountResponse {
  account: Account;
  profile: RestaurantProfile | null;
}

/**
 * `POST /auth/verify-email`. The locale is optional on the wire and defaults
 * to `cs`; it chooses the language of the welcome email the API sends on
 * success.
 */
export interface VerifyEmailRequest {
  code: string;
  locale?: "cs" | "en" | "de";
}

export interface ProfileResponse {
  profile: RestaurantProfile;
}

// ----------------------------------------------------------------- menus

export type MenuStatus = "draft" | "published";

export interface MenuSummary {
  id: string;
  name: string;
  status: MenuStatus;
  publicSlug: string | null;
  updatedAt: string;
}

export interface MenuItemView {
  id: string;
  name: string;
  description: string | null;
  /** Whole korunas. */
  priceCzk: number;
  position: number;
  /**
   * The dish's photograph, or `null`. Absent is the normal state and renders
   * exactly as a dish did before photos existed. Duplicating a dish leaves the
   * copy without one.
   */
  image: ImageRef | null;
}

export interface MenuSectionView {
  id: string;
  title: string;
  position: number;
  items: MenuItemView[];
}

export interface MenuDetail extends MenuSummary {
  visualVariant: string;
  sections: MenuSectionView[];
}

export interface MenuListResponse {
  menus: MenuSummary[];
}

export interface MenuDetailResponse {
  menu: MenuDetail;
}

export interface SectionResponse {
  section: MenuSectionView;
}

export interface ItemResponse {
  item: MenuItemView;
}

export interface PublishResponse {
  status: MenuStatus;
  publicSlug: string;
  /** Locale-less, e.g. `/m/poledni-menu-x7k2qf`. */
  publicPath: string;
}

export interface UnpublishResponse {
  status: MenuStatus;
  publicSlug: string | null;
}

// -------------------------------------------------------------- public

/** Display fields only — no ids, no account data, no timestamps. */
export interface PublicMenuItem {
  name: string;
  description: string | null;
  priceCzk: number;
  image: ImageRef | null;
}

export interface PublicMenuSection {
  title: string;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  name: string;
  /**
   * The restaurant behind the menu. Carried so the logo has a text alternative
   * that names the restaurant rather than the menu — a menu called "Lunch" is
   * not what a logo depicts.
   */
  restaurantName: string;
  visualVariant: string;
  logo: ImageRef | null;
  sections: PublicMenuSection[];
}

export interface PublicMenuResponse {
  menu: PublicMenu;
}
