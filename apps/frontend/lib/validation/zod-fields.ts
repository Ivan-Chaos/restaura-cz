import type { ZodError } from "zod";

import { toFieldCode } from "../api/form-state";
import type { FieldErrorCode } from "../api/types";

/**
 * Turns a zod failure into the field-code map a form already knows how to
 * render.
 *
 * The trick that keeps this small: every schema in `lib/validation` sets its
 * issue messages to `FieldErrorCode` strings rather than English prose. So
 * there is no second catalogue of messages and no mapping table to maintain —
 * a locally-caught failure arrives in exactly the shape the API would have
 * sent, and `Auth.fieldErrors` translates both.
 *
 * A message that is not a known code degrades to `INVALID`, matching how the
 * API's own unrecognised constraint names are handled.
 */
export function zodToFields(error: ZodError): Record<string, FieldErrorCode | "INVALID"> {
  const fields: Record<string, FieldErrorCode | "INVALID"> = {};

  for (const issue of error.issues) {
    // Dotted paths are what produce `phones.0`, the per-entry field name the
    // phone list marks its individual inputs with.
    const field = issue.path.join(".");
    if (field === "") continue;

    // First failure per field wins. Schemas are written most-important-first
    // for this reason, and zod reports in declaration order.
    fields[field] ??= toFieldCode(issue.message);
  }

  return fields;
}
