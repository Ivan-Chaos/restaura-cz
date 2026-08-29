#!/usr/bin/env node
/**
 * Downloads the landing page's Pexels media into `public/landing/`.
 *
 * The page never hot-links Pexels: a marketing hero that disappears because a
 * CDN URL rotated is not a hero. So the media is fetched once, committed, and
 * described by `lib/landing/assets.ts` — this script is the bridge between that
 * manifest and the disk, and the generator of `ATTRIBUTION.md`.
 *
 *   node scripts/fetch-landing-assets.mjs            # fetch anything missing
 *   node scripts/fetch-landing-assets.mjs --force    # re-fetch everything
 *   node scripts/fetch-landing-assets.mjs --only hero,og
 *   node scripts/fetch-landing-assets.mjs --check    # validate, download nothing
 *
 * `--check` is what CI runs: the files are committed, so continuous integration
 * should never reach for the network.
 *
 * Set `PEXELS_API_KEY` (dev only, never committed) to additionally verify that
 * the author recorded in the manifest is the author Pexels reports.
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");
const MANIFEST = join(ROOT, "lib", "landing", "assets.ts");
const ATTRIBUTION = join(PUBLIC_DIR, "landing", "ATTRIBUTION.md");

/* ------------------------------------------------------------------ args -- */

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const CHECK_ONLY = argv.includes("--check");
const onlyIndex = argv.indexOf("--only");
const ONLY =
  onlyIndex === -1
    ? null
    : new Set((argv[onlyIndex + 1] ?? "").split(",").filter(Boolean));

/* -------------------------------------------------------------- manifest -- */

/**
 * Reads the manifest without a TypeScript toolchain.
 *
 * The alternative — compiling `assets.ts` just to list six files — would make a
 * dependency-free script depend on the build. The manifest is plain object
 * literals by construction, so the fields can be lifted out directly. If this
 * ever stops parsing, the manifest has grown something it should not have.
 */
function readManifest() {
  const source = readFileSync(MANIFEST, "utf8");
  const start = source.indexOf("LANDING_ASSETS: readonly MediaAsset[] = [");
  if (start === -1) throw new Error("Cannot find LANDING_ASSETS in the manifest");

  const body = source.slice(start);
  const entries = [];

  for (const block of body.split(/\n  \{\n/).slice(1)) {
    const chunk = block.split(/\n  \},?/)[0];
    const str = (key) =>
      chunk.match(new RegExp(`\\b${key}:\\s*\\n?\\s*"([^"]+)"`))?.[1];
    const num = (key) =>
      Number(chunk.match(new RegExp(`\\b${key}:\\s*(\\d+)`))?.[1]);
    const bytes = chunk.match(/maxBytes:\s*(\d+)\s*\*\s*(KB|MB)/);

    const id = str("id");
    if (!id) continue;

    entries.push({
      id,
      kind: str("kind"),
      pexelsId: num("pexelsId"),
      pageUrl: str("pageUrl"),
      author: str("author"),
      authorUrl: str("authorUrl"),
      downloadUrl: str("downloadUrl"),
      file: str("file"),
      width: num("width"),
      height: num("height"),
      maxBytes: bytes
        ? Number(bytes[1]) * (bytes[2] === "MB" ? 1024 * 1024 : 1024)
        : Number.POSITIVE_INFINITY,
      optional: /\boptional:\s*true/.test(chunk),
    });
  }

  if (entries.length === 0) throw new Error("Manifest parsed to zero assets");
  return entries;
}

/* ------------------------------------------------------------ dimensions -- */

/**
 * Intrinsic dimensions straight from the file header.
 *
 * `next/image` reserves space from the manifest's `width`/`height`; if the file
 * on disk disagrees, the page shifts as the image lands. Reading the header
 * costs nothing and catches a re-crop that forgot to update the manifest.
 * Returns `null` for formats we do not parse (video), which the caller skips.
 */
function readDimensions(buffer) {
  // PNG: IHDR is always the first chunk.
  if (buffer.length > 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG: walk the segment chain to the frame header.
  if (buffer.length > 4 && buffer.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF0..SOF15, excluding the non-frame markers DHT/JPG/DAC.
      const isFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isFrame) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
    return null;
  }

  // WebP: VP8X carries the canvas size; VP8/VP8L carry their own.
  if (
    buffer.length > 30 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const format = buffer.toString("ascii", 12, 16);
    if (format === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (format === "VP8 ") {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
  }

  return null;
}

/* ------------------------------------------------------------- reporting -- */

const problems = [];
const warnings = [];

/** Optional assets degrade to a warning: the page is built to do without them. */
const fail = (asset, reason) =>
  (asset.optional ? warnings : problems).push(`${asset.file}: ${reason}`);

function validate(asset) {
  const path = join(PUBLIC_DIR, asset.file);

  let size;
  try {
    size = statSync(path).size;
  } catch {
    fail(
      asset,
      asset.optional
        ? `not present — download it from ${asset.pageUrl} and save it as public/${asset.file}`
        : "missing — run `pnpm assets:landing`",
    );
    return;
  }

  if (size > asset.maxBytes) {
    fail(
      asset,
      `${(size / 1024).toFixed(0)} KB exceeds the ${(asset.maxBytes / 1024).toFixed(0)} KB budget`,
    );
  }

  if (asset.kind !== "image") return;

  const dimensions = readDimensions(readFileSync(path));
  if (!dimensions) {
    fail(asset, "could not read image dimensions");
    return;
  }
  if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
    fail(
      asset,
      `is ${dimensions.width}×${dimensions.height}, manifest says ${asset.width}×${asset.height}`,
    );
  }
}

/* -------------------------------------------------------------- download -- */

async function download(asset) {
  const path = join(PUBLIC_DIR, asset.file);
  mkdirSync(dirname(path), { recursive: true });

  const response = await fetch(asset.downloadUrl, {
    headers: { "user-agent": "restaura-landing-asset-fetcher" },
  });
  if (!response.ok) {
    // `validate` reports the missing file afterwards, with the manual-download
    // hint for optional assets; this line only says why the fetch itself failed.
    console.warn(`  ! ${asset.file}: HTTP ${response.status}`);
    return false;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(path, buffer);
  console.log(`  ↓ ${asset.file} (${(buffer.length / 1024).toFixed(0)} KB)`);
  return true;
}

/** Optional sanity check that we credit the right person. */
async function verifyAuthor(asset, key) {
  const url =
    asset.kind === "video"
      ? `https://api.pexels.com/videos/videos/${asset.pexelsId}`
      : `https://api.pexels.com/v1/photos/${asset.pexelsId}`;

  const response = await fetch(url, { headers: { Authorization: key } });
  if (!response.ok) {
    console.warn(`  ! ${asset.id}: Pexels API returned ${response.status}`);
    return;
  }

  const data = await response.json();
  const reported = data.photographer ?? data.user?.name;
  if (reported && reported !== asset.author) {
    console.warn(
      `  ! ${asset.id}: Pexels credits "${reported}", manifest says "${asset.author}"`,
    );
  }
}

/* ----------------------------------------------------------- attribution -- */

function writeAttribution(assets) {
  const rows = assets
    .map(
      (a) =>
        `| \`${a.file}\` | [${a.author}](${a.authorUrl}) | [Pexels #${a.pexelsId}](${a.pageUrl}) |`,
    )
    .join("\n");

  const content = `<!-- Generated by scripts/fetch-landing-assets.mjs. Do not edit by hand. -->

# Landing page media — attribution

Every file below comes from [Pexels](https://www.pexels.com) and is used under the
[Pexels licence](https://www.pexels.com/license/): free for commercial use, no
attribution required. We record it anyway — the people who made these photographs
deserve the credit, and knowing the source makes replacing an asset a two-minute job.

| File | Author | Source |
|------|--------|--------|
${rows}
`;

  mkdirSync(dirname(ATTRIBUTION), { recursive: true });
  writeFileSync(ATTRIBUTION, content, "utf8");
  console.log(`  ✎ ${"public/landing/ATTRIBUTION.md"}`);
}

/* ------------------------------------------------------------------ main -- */

const assets = readManifest().filter((a) => !ONLY || ONLY.has(a.id));
if (ONLY && assets.length === 0) {
  console.error(`✗ --only matched no assets: ${[...ONLY].join(", ")}`);
  process.exit(1);
}

console.log(
  CHECK_ONLY
    ? `Checking ${assets.length} landing asset(s)…`
    : `Fetching ${assets.length} landing asset(s)…`,
);

if (!CHECK_ONLY) {
  const key = process.env.PEXELS_API_KEY;

  for (const asset of assets) {
    const path = join(PUBLIC_DIR, asset.file);
    const exists = (() => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    })();

    if (exists && !FORCE) {
      console.log(`  = ${asset.file} (already present)`);
    } else {
      await download(asset);
    }

    if (key) await verifyAuthor(asset, key);
  }

  writeAttribution(readManifest());
}

for (const asset of assets) validate(asset);

if (warnings.length > 0) {
  console.warn(`\n! ${warnings.length} optional asset(s) unavailable:`);
  for (const warning of warnings) console.warn(`    ${warning}`);
}

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} asset problem(s):`);
  for (const problem of problems) console.error(`    ${problem}`);
  process.exit(1);
}

const required = assets.length - warnings.length;
console.log(`\n✓ ${required} required landing asset(s) present and within budget`);
