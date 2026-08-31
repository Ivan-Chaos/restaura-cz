/**
 * The frontend's half of the cross-app contract.
 *
 * These mirror `specs/001-menu-creation-publishing/contracts/http-api.md`. The
 * API proves it serves these shapes; `tests/unit/api-contract.test.ts` proves we
 * expect them. Change one side and you must change the other in the same
 * change set.
 */

/** Every code the API can return, plus one the browser side can produce. */
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "INTERNAL"
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
  | "IS_IN"
  | "IS_EMPTY"
  /** class-validator names the `@Length` constraint `isLength`. */
  | "IS_LENGTH"
  | "MAX_LENGTH"
  | "MIN"
  | "AT_LEAST_ONE_DEFINED";

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
}

export interface AccountResponse {
  account: Account;
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
}

export interface PublicMenuSection {
  title: string;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  name: string;
  visualVariant: string;
  sections: PublicMenuSection[];
}

export interface PublicMenuResponse {
  menu: PublicMenu;
}
