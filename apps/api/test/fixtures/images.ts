import sharp from 'sharp';

/**
 * Image fixtures, built in-test rather than committed.
 *
 * Every one of these is a few lines of sharp, and generating them keeps the
 * repository free of binaries whose contents nobody can review in a diff. The
 * two hand-written byte arrays are the exception: they exist precisely because
 * sharp cannot produce them (a GIF) or because writing one out is clearer than
 * configuring an encoder (an SVG).
 */

/** Smooth noise, so the encoders behave the way they do on a real photograph. */
function canvas(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      noise: { type: 'gaussian', mean: 128, sigma: 60 },
    },
  });
}

export function jpeg(width = 1200, height = 900): Promise<Buffer> {
  return canvas(width, height).jpeg({ quality: 85 }).toBuffer();
}

/**
 * A JPEG stored **portrait** but tagged orientation 6, which means "rotate 90°
 * clockwise to display". A viewer that honours EXIF shows it landscape; one
 * that ignores EXIF shows it sideways. That difference is what the orientation
 * assertions read.
 */
export function jpegWithOrientation6(width = 1200, height = 1600): Promise<Buffer> {
  return canvas(width, height).withMetadata({ orientation: 6 }).jpeg({ quality: 85 }).toBuffer();
}

/**
 * A PNG whose corners are fully transparent. `flatten` is deliberately not
 * called, so the alpha channel survives into the fixture and the "transparency
 * is preserved" assertion has something to measure.
 */
export function pngWithAlpha(width = 600, height = 400): Promise<Buffer> {
  const mark = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="#2f6f4e"/>
     </svg>`,
  );
  return sharp(mark).png().toBuffer();
}

export function webp(width = 200, height = 150): Promise<Buffer> {
  return canvas(width, height).webp({ quality: 80 }).toBuffer();
}

/** A 1×1 transparent GIF. Decodable, and deliberately not on the accept list. */
export function gif(): Buffer {
  return Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
}

/** A well-formed SVG. Rejected because a hostile one can carry script. */
export function svg(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect width="100" height="100" fill="#c33"/></svg>',
    'utf8',
  );
}

/** Text under an image's name: acceptance is decided by content (FR-010). */
export function textBytes(): Buffer {
  return Buffer.from('This is not an image, whatever the filename claims.\n', 'utf8');
}

/** A JPEG header followed by rubbish — starts like an image, cannot decode. */
export function truncatedJpeg(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 0x41)]);
}

/**
 * A buffer larger than the 10 MiB upload cap. Incompressible bytes rather than
 * a real image: multer rejects on size before anything decodes it, so the
 * contents are irrelevant and generating a genuine 10 MB photo would only make
 * the suite slower.
 */
export function oversizedBytes(bytes = 11 * 1024 * 1024): Buffer {
  return Buffer.alloc(bytes, 0x5a);
}

/** Reads back what was stored, so assertions can talk about the rendition. */
export async function describe(buffer: Buffer): Promise<{
  format: string | undefined;
  width: number | undefined;
  height: number | undefined;
  hasAlpha: boolean | undefined;
  orientation: number | undefined;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
  };
}
