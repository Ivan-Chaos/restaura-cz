/**
 * Paper constants, kept apart from the renderer on purpose.
 *
 * The download dialog needs A4's proportions to reserve the right box for a
 * preview, and the renderer needs them to size a viewport. Importing them from
 * `render.ts` would pull `playwright-core` — a Node-only package that launches
 * a browser — into a client bundle, so the two numbers live here where both
 * sides can have them for free.
 */

/** A4 at 96 CSS pixels per inch, which is the unit a viewport is measured in. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
