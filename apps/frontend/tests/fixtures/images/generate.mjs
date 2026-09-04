/**
 * Builds the image fixtures the upload tests need (feature 006).
 *
 * The small ones are committed so a checkout can run the suite immediately.
 * The two large ones are not: an 11 MiB file and a 12-megapixel photo have no
 * business in git when a script can produce them deterministically in a second.
 * The suites that need them call this in a `beforeAll`.
 *
 *   node tests/fixtures/images/generate.mjs           # only the large ones
 *   node tests/fixtures/images/generate.mjs --all     # every fixture
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));

/** A photo-like source: smooth gradients compress the way a real photo does. */
function photo(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      // Noise rather than a flat fill: a flat colour compresses to almost
      // nothing, which would make "too big" impossible to reach.
      noise: { type: "gaussian", mean: 128, sigma: 60 },
    },
  });
}

/**
 * The committed fixtures.
 *
 * `dish-4x3.jpg` is stored **portrait with orientation 6**, so a viewer that
 * ignores EXIF shows it sideways. That is the whole point: it proves the crop
 * dialog and the stored rendition both come out upright.
 */
const COMMITTED = {
  "dish-4x3.jpg": () =>
    photo(1200, 1600)
      .withMetadata({ orientation: 6 })
      .jpeg({ quality: 90 })
      .toBuffer(),

  "logo-alpha.png": async () => {
    const mark = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
         <circle cx="300" cy="200" r="150" fill="#2f6f4e"/>
         <rect x="250" y="150" width="100" height="100" fill="#e8c56a"/>
       </svg>`,
    );
    // No flatten: the area outside the circle stays transparent, which is what
    // the "transparency survives" assertion reads.
    return sharp(mark).png().toBuffer();
  },

  "tiny.webp": () => photo(200, 150).webp({ quality: 80 }).toBuffer(),

  "not-an-image.png": async () =>
    Buffer.from(
      "This is not an image. The extension says PNG; the bytes say otherwise.\n" +
        "Acceptance is decided by content, never by the filename (FR-010).\n",
      "utf8",
    ),
};

/** Generated on demand, never committed. */
const GENERATED = {
  /**
   * Just over the 10 MiB cap, to prove the size check fires before any upload.
   * Deliberately only just over: the test uploads nothing, so every extra
   * megabyte is wasted disk and a slower `setInputFiles`.
   */
  "too-big.jpg": async () => {
    for (const width of [2400, 2800, 3400, 4200]) {
      const buffer = await photo(width, Math.round((width * 3) / 4))
        .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
        .toBuffer();
      if (buffer.byteLength > 10 * 1024 * 1024) return buffer;
    }
    throw new Error("Could not generate a fixture over 10 MiB");
  },

  /** A phone-camera-sized photo, for the "adjust step is interactive" budget. */
  "big-12mp.jpg": () =>
    photo(4000, 3000).jpeg({ quality: 92 }).toBuffer(),
};

async function write(name, make) {
  const buffer = await make();
  await writeFile(join(HERE, name), buffer);
  return `${name} (${(buffer.byteLength / 1024).toFixed(0)} KB)`;
}

async function main() {
  await mkdir(HERE, { recursive: true });

  const wanted = process.argv.includes("--all")
    ? { ...COMMITTED, ...GENERATED }
    : GENERATED;

  for (const [name, make] of Object.entries(wanted)) {
    console.log(`wrote ${await write(name, make)}`);
  }
}

await main();
