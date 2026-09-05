/**
 * Why a document could not be produced.
 *
 * A separate module from the handler plumbing so the dialog can name these
 * codes without importing anything that reads cookies or launches a browser.
 * The handlers answer with one of them; the dialog renders it through the
 * `Print.errors` catalogue, so the owner reads it in their own language and
 * never sees a developer's phrasing.
 */
export type PrintErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  /** Stickers for a menu with no public address yet. */
  | "NOT_PUBLISHED"
  /** A menu PDF with nothing to print. */
  | "EMPTY_MENU"
  | "RENDER_TIMEOUT"
  | "RENDER_FAILED";
