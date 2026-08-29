#!/usr/bin/env node
/**
 * Renders `app/favicon.ico` from the same geometry as `app/icon.svg`.
 *
 * Why a hand-rolled rasteriser instead of a library: this repository ships no
 * image toolchain, and pulling one in to draw four shapes once would be a
 * dependency the constitution would rightly ask us to justify. The mark is a
 * rounded square, a half-disc, a small circle and a rounded bar — all of them
 * point-in-shape tests — so supersampling them by hand is about sixty lines and
 * no supply chain.
 *
 * Why an `.ico` at all, when `icon.svg` already exists: browsers request
 * `/favicon.ico` from the site root whether or not the HTML advertises one, and
 * a 404 there leaves whatever they had cached on screen — which, for anyone who
 * has ever opened another Next app on the same localhost port, is the Next.js
 * logo. The `.ico` is what actually evicts it.
 *
 *   node scripts/generate-favicon.mjs [--png]   # --png also writes a preview
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** The sizes a favicon is actually displayed at. */
const SIZES = [16, 32, 48];

/** Supersampling factor per axis; 4 means 16 samples a pixel. */
const SS = 4;

/** `--palette-terracotta-600` and `--palette-cream-50`, resolved to sRGB. */
const GROUND = [181, 78, 33];
const MARK = [255, 253, 250];

/* ------------------------------------------------------- the mark, in 64ths */

const inRoundedRect = (x, y, rx, ry, w, h, r) => {
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
};

const inCircle = (x, y, cx, cy, r) => {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
};

/** The rounded square the whole icon sits in. */
const isGround = (x, y) => inRoundedRect(x, y, 0, 0, 64, 64, 14);

/** Cloche dome, its handle, and the plate beneath — matching `icon.svg`. */
const isMark = (x, y) =>
  (inCircle(x, y, 32, 42, 20) && y <= 42) ||
  inCircle(x, y, 32, 19, 3.4) ||
  inRoundedRect(x, y, 7, 45, 50, 6, 3);

/* ------------------------------------------------------------- rasterising */

/** Returns straight (un-premultiplied) RGBA bytes for a size×size bitmap. */
function raster(size) {
  const out = Buffer.alloc(size * size * 4);
  const scale = 64 / size;
  const samples = SS * SS;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) * scale;
          const y = (py + (sy + 0.5) / SS) * scale;

          if (!isGround(x, y)) continue;
          const [cr, cg, cb] = isMark(x, y) ? MARK : GROUND;
          // Accumulate premultiplied, so partially covered edge pixels blend
          // against transparency instead of against black.
          r += cr;
          g += cg;
          b += cb;
          a += 255;
        }
      }

      const i = (py * size + px) * 4;
      if (a === 0) continue;
      const coverage = a / samples;
      // Un-premultiply: the colour is the average over *covered* samples only.
      const covered = a / 255;
      out[i] = Math.round(r / covered);
      out[i + 1] = Math.round(g / covered);
      out[i + 2] = Math.round(b / covered);
      out[i + 3] = Math.round(coverage);
    }
  }

  return out;
}

/* -------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // One filter byte (0 = None) in front of every scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------- ICO writer */

/**
 * ICO has carried PNG payloads since Windows Vista, and every browser in use
 * reads them — which spares us the BMP-with-upside-down-rows encoding.
 */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size; // 0 means 256
    entry[1] = size === 256 ? 0 : size;
    entry[2] = 0; // palette size
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([
    header,
    ...entries,
    ...images.map(({ png }) => png),
  ]);
}

/* ------------------------------------------------------------------- main */

const images = SIZES.map((size) => ({
  size,
  png: encodePng(size, raster(size)),
}));

const ico = encodeIco(images);
const target = join(process.cwd(), "app", "favicon.ico");
writeFileSync(target, ico);
console.log(
  `✓ app/favicon.ico — ${SIZES.join("/")}px, ${(ico.length / 1024).toFixed(1)} KB`,
);

if (process.argv.includes("--png")) {
  // A 128px preview, for eyeballing the mark without a browser.
  const preview = encodePng(128, raster(128));
  writeFileSync(join(process.cwd(), "favicon-preview.png"), preview);
  console.log("✓ favicon-preview.png (not committed — delete when done)");
}
