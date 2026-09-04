import type { FieldErrorCode } from "@/lib/api/types";

/**
 * What the browser checks before an upload leaves the device.
 *
 * The API is the authority — it decodes every upload and re-encodes it — but
 * checking here is what makes an invalid file cost nothing: the owner learns
 * their 40 MB screenshot is too large immediately, instead of after uploading
 * it. The codes are the same ones the API returns, so the message reads
 * identically wherever the problem was noticed.
 */

/** Matches `MAX_UPLOAD_BYTES` in the API. Both are 10 MiB. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_MEGABYTES = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

export type AcceptedImageType = "jpeg" | "png" | "webp";

export const ACCEPTED_IMAGE_TYPES: readonly AcceptedImageType[] = ["jpeg", "png", "webp"];

/** For the file input's `accept`. A hint to the picker, never a guarantee. */
export const ACCEPT_ATTRIBUTE = "image/jpeg,image/png,image/webp";

/** A crop rectangle in oriented source pixels — what the owner saw. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * What the field is about to do with the image on the next save.
 *
 * `keep` is the resting state: no upload, no removal, whatever is stored stays.
 * `replace` holds the chosen file in memory until the form is submitted, which
 * is what makes cancelling free — nothing has been uploaded, so there is
 * nothing to clean up.
 */
export type PendingImage =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "replace"; file: File; crop: CropRect; previewUrl: string };

/** How many bytes of a file are enough to recognise its type. */
const SNIFF_BYTES = 16;

/**
 * Identifies an image by its leading bytes.
 *
 * `File.type` is derived from the extension by the operating system, so a text
 * file renamed to `.png` arrives claiming to be an image. The magic numbers are
 * the actual evidence, and checking them is what lets the browser refuse such a
 * file without a round trip.
 */
export function sniffImageType(bytes: Uint8Array): AcceptedImageType | null {
  // JPEG: SOI marker followed by any segment.
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  // PNG: the 8-byte signature, including the CR/LF pair that detects
  // line-ending corruption.
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (PNG.every((byte, index) => bytes[index] === byte)) return "png";

  // WebP: "RIFF" .... "WEBP".
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  if (
    riff.every((byte, index) => bytes[index] === byte) &&
    webp.every((byte, index) => bytes[index + 8] === byte)
  ) {
    return "webp";
  }

  return null;
}

/**
 * Checks a chosen file, returning the code to show or `null` to proceed.
 *
 * Size first: reading the head of a 500 MB file to discover it is a valid JPEG
 * would be work spent on a file that is going to be refused anyway.
 */
export async function validateImageFile(file: File): Promise<FieldErrorCode | null> {
  if (file.size > MAX_IMAGE_BYTES) return "MAX_FILE_SIZE";
  if (file.size === 0) return "IS_IMAGE";

  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  return sniffImageType(head) === null ? "IS_IMAGE" : null;
}

/** Narrows an unknown value to a usable rectangle. */
export function isCropRect(value: unknown): value is CropRect {
  if (typeof value !== "object" || value === null) return false;
  const rect = value as Record<string, unknown>;
  return (
    Number.isInteger(rect.x) &&
    Number.isInteger(rect.y) &&
    Number.isInteger(rect.width) &&
    Number.isInteger(rect.height) &&
    (rect.x as number) >= 0 &&
    (rect.y as number) >= 0 &&
    (rect.width as number) > 0 &&
    (rect.height as number) > 0
  );
}

/**
 * Rounds a rectangle to whole pixels, or refuses it.
 *
 * The crop tool reports fractions because it works in CSS pixels scaled to the
 * source; the API insists on integers because it extracts a pixel region. The
 * rounding is inward, so a rectangle can never grow past the edge of the image
 * and turn a valid framing into `IS_CROP`.
 *
 * `null` for anything that does not describe a real region. That case is not
 * theoretical: a cropper that never managed to measure its image reports a
 * zero-sized area, and this function used to clamp that to a legal 1×1
 * rectangle — which the API accepted, extracted a single pixel from, and
 * upscaled into a flat grey square. A failed measurement has to stay a failure,
 * so the caller can refuse rather than store something the owner never chose.
 */
export function toWholePixels(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CropRect | null {
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return null;

  const cropped = {
    x: Math.max(0, Math.ceil(rect.x)),
    y: Math.max(0, Math.ceil(rect.y)),
    width: Math.floor(rect.width),
    height: Math.floor(rect.height),
  };

  return cropped.width > 0 && cropped.height > 0 ? cropped : null;
}
