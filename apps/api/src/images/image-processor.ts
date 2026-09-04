import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';

/**
 * Turns whatever an owner uploaded into the one rendition we store.
 *
 * This is the only place that decides whether a file is an image. The
 * filename and the browser's declared `Content-Type` are both attacker- and
 * accident-controlled, so acceptance is decided by decoding the bytes: if
 * libvips can read it and reports a format we serve, it is an image, and
 * otherwise it is not — regardless of what it claims to be.
 *
 * The original never survives this function. Uploads are re-encoded to a fixed
 * size and a fixed format, with metadata stripped, so what lands in storage
 * carries no EXIF, no GPS coordinates from the owner's phone, and no colour
 * profile surprises.
 */

/** Formats we accept, by what the decoder reports — never by extension. */
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

/**
 * Decompression-bomb guard. A 12-megapixel phone photo is the realistic
 * ceiling; 40 MP leaves generous room above it while refusing the pathological
 * cases (a 60000×60000 PNG is a few hundred kilobytes on the wire and tens of
 * gigabytes decoded).
 */
const MAX_INPUT_PIXELS = 40_000_000;

export type ImageKind = 'logo' | 'dish';

export interface Rendition {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  contentType: string;
}

/**
 * One rendition per kind, and only one.
 *
 * A logo is square and PNG so transparency survives — a mark with a
 * transparent background has to sit on both a light and a dark menu. A dish
 * photo is 4:3 JPEG, the shape the guest menu and every visual style already
 * expect, at a size that still looks sharp on a high-density phone after the
 * image optimiser has had its way with it.
 */
export const RENDITIONS: Record<ImageKind, Rendition> = {
  logo: { width: 512, height: 512, format: 'png', contentType: 'image/png' },
  dish: { width: 1600, height: 1200, format: 'jpeg', contentType: 'image/jpeg' },
};

/** A crop rectangle in **oriented** source pixels — what the owner saw. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

/**
 * A rejection the owner can act on, as opposed to a bug.
 *
 * Carries the field and the constraint code the HTTP layer turns into the
 * contract's `VALIDATION_FAILED` shape, so the form can mark the right control
 * and the message can be translated rather than shown raw.
 */
export class ImageRejected extends Error {
  constructor(
    readonly code: 'IS_IMAGE' | 'IS_CROP',
    readonly field: 'file' | 'crop',
    message: string,
  ) {
    super(message);
    this.name = 'ImageRejected';
  }

  static notAnImage(detail: string): ImageRejected {
    return new ImageRejected('IS_IMAGE', 'file', `Not an accepted image: ${detail}.`);
  }

  static badCrop(detail: string): ImageRejected {
    return new ImageRejected('IS_CROP', 'crop', `Crop rectangle is unusable: ${detail}.`);
  }
}

function isWholePositive(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Checks the rectangle against the image as the owner saw it.
 *
 * Both sides agree on coordinates by construction: browsers apply EXIF
 * orientation when displaying, and `.rotate()` with no argument bakes that same
 * rotation in before anything is measured here. So the numbers the crop tool
 * reported and the dimensions below are in the same space.
 */
function assertFits(crop: CropRect, width: number, height: number): void {
  if (
    !Number.isInteger(crop.x) ||
    !Number.isInteger(crop.y) ||
    crop.x < 0 ||
    crop.y < 0 ||
    !isWholePositive(crop.width) ||
    !isWholePositive(crop.height)
  ) {
    throw ImageRejected.badCrop('coordinates must be whole numbers inside the image');
  }

  if (crop.x + crop.width > width || crop.y + crop.height > height) {
    throw ImageRejected.badCrop(
      `${crop.width}×${crop.height} at (${crop.x}, ${crop.y}) does not fit inside ${width}×${height}`,
    );
  }
}

/**
 * Decodes, orients, crops, resizes and re-encodes an upload.
 *
 * Without a crop rectangle the image is centre-cropped to the target aspect.
 * That is the no-JavaScript path: a plain form post carries a file and no
 * coordinates, and the owner still gets a sensible result rather than an error.
 */
export async function processImage(
  input: Buffer,
  kind: ImageKind,
  crop?: CropRect,
): Promise<ProcessedImage> {
  const rendition = RENDITIONS[kind];

  // `animated` is deliberately left at its default: an animated WebP decodes to
  // its first frame, which is exactly the "only a single still frame is kept"
  // behaviour the spec asks for.
  //
  // Construction is inside the try as well: sharp rejects some inputs — an
  // empty buffer, most obviously — before any async work begins, and an owner
  // who managed to submit one deserves the same message as any other
  // unreadable file rather than a 500.
  let pipeline: Sharp;
  let metadata: Metadata;
  try {
    pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' }).rotate();
    metadata = await pipeline.metadata();
  } catch (cause) {
    // Corrupt bytes, a truncated file, or something that was never an image.
    // All the same answer to the owner: use a JPEG, PNG or WebP.
    throw ImageRejected.notAnImage(cause instanceof Error ? cause.message : 'could not be read');
  }

  if (metadata.format === undefined || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw ImageRejected.notAnImage(`format "${metadata.format ?? 'unknown'}" is not supported`);
  }

  // After `.rotate()` these are the dimensions the owner sees, which is the
  // space the crop rectangle is expressed in.
  const width = metadata.autoOrient?.width ?? metadata.width;
  const height = metadata.autoOrient?.height ?? metadata.height;
  if (width === undefined || height === undefined) {
    throw ImageRejected.notAnImage('dimensions are missing');
  }

  if (crop) {
    assertFits(crop, width, height);
    pipeline = pipeline.extract({
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height,
    });
  }

  // `cover` with a centred position is what makes a missing rectangle behave:
  // the middle of the image fills the frame, and an image smaller than the
  // frame is scaled up rather than refused.
  pipeline = pipeline.resize(rendition.width, rendition.height, {
    fit: 'cover',
    position: 'centre',
  });

  // No `withMetadata()` anywhere in this chain: sharp drops EXIF by default,
  // and that is the behaviour we want. An owner uploading a photo from their
  // phone should not be publishing the GPS coordinates of their kitchen.
  const buffer =
    rendition.format === 'png'
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : await pipeline
          .jpeg({ quality: 82, progressive: true, mozjpeg: true })
          .toBuffer();

  return {
    buffer,
    contentType: rendition.contentType,
    width: rendition.width,
    height: rendition.height,
  };
}
