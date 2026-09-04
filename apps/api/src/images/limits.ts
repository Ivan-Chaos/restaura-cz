/**
 * The upload cap, in bytes.
 *
 * 10 MiB covers what a design tool exports and what a phone camera produces,
 * while keeping a single request small enough that buffering it in memory is
 * unremarkable. The frontend checks the same number before sending, so an
 * oversized file normally never leaves the browser; the interceptor is the
 * authority for everything that skipped that check.
 *
 * Its own module, with no imports, so the error filter can state the limit in a
 * message without dragging the Express and multer stack into its import graph.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The same limit as the message the owner reads: "up to 10 MB". */
export const MAX_UPLOAD_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
