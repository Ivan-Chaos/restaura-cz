import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import {
  assetSrc,
  getAsset,
  LANDING_ASSETS,
  type MediaAsset,
  type MediaAssetId,
} from "@/lib/landing/assets";

/**
 * The manifest claims things about files on disk — dimensions `next/image` will
 * reserve space from, budgets that keep the repository sane, authors we credit.
 * Nothing checks those claims at runtime, so they are checked here. A re-crop
 * that forgets to update `width`/`height` shows up as layout shift in
 * production; it shows up as a failing test in a second.
 */

const PUBLIC_DIR = join(process.cwd(), "public");
const CATALOGUES = { cs, en, de } as const;

const pathOf = (asset: MediaAsset) => join(PUBLIC_DIR, asset.file);
const present = (asset: MediaAsset) => existsSync(pathOf(asset));

/** Required assets must exist; optional ones (the hero clip) may not yet. */
const REQUIRED = LANDING_ASSETS.filter((asset) => !asset.optional);

/** Minimal JPEG/PNG header parse — the same check the fetch script performs. */
function readDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  if (buffer.length > 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length > 4 && buffer.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
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
  }

  return null;
}

function lookup(catalogue: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      catalogue,
    );
}

describe("landing asset manifest", () => {
  it("has a unique id per asset", () => {
    const ids = LANDING_ASSETS.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the required media in the repository", () => {
    for (const asset of REQUIRED) {
      expect(present(asset), `${asset.file} is missing`).toBe(true);
    }
  });

  it("never hot-links: every src is a local path", () => {
    for (const asset of LANDING_ASSETS) {
      expect(assetSrc(asset)).toBe(`/${asset.file}`);
      expect(assetSrc(asset).startsWith("/landing/")).toBe(true);
    }
  });

  it("stays inside its size budget", () => {
    for (const asset of LANDING_ASSETS.filter(present)) {
      const size = statSync(pathOf(asset)).size;
      expect(
        size,
        `${asset.file} is ${(size / 1024).toFixed(0)} KB, budget ${(asset.maxBytes / 1024).toFixed(0)} KB`,
      ).toBeLessThanOrEqual(asset.maxBytes);
    }
  });

  it("declares the dimensions the file actually has", () => {
    // `next/image` reserves space from these numbers; if they lie, the page
    // shifts under the visitor as the photograph arrives.
    for (const asset of LANDING_ASSETS.filter(
      (a) => a.kind === "image" && present(a),
    )) {
      const dimensions = readDimensions(readFileSync(pathOf(asset)));
      expect(dimensions, `could not parse ${asset.file}`).not.toBeNull();
      expect({ file: asset.file, ...dimensions }).toEqual({
        file: asset.file,
        width: asset.width,
        height: asset.height,
      });
    }
  });

  it("throws rather than rendering an unknown asset", () => {
    expect(() => getAsset("nope" as MediaAssetId)).toThrow(/Unknown landing asset/);
  });
});

describe("landing asset descriptions", () => {
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    it(`describes every informative asset in ${locale}`, () => {
      for (const asset of LANDING_ASSETS) {
        if (asset.altKey === null) continue;
        const key = `Landing.${asset.altKey}`;
        const value = lookup(catalogue, key);
        expect(value, `${key} is missing`).toEqual(expect.any(String));
        expect((value as string).length, `${key} is empty`).toBeGreaterThan(0);
      }
    });
  }

  it("leaves only decorative media without a description", () => {
    // The hero clip is the one exception: it repeats the poster's scene and is
    // hidden from assistive technology, so describing it would be noise.
    const undescribed = LANDING_ASSETS.filter((a) => a.altKey === null);
    expect(undescribed.map((a) => a.id)).toEqual(["heroClip"]);
  });
});

describe("attribution", () => {
  const attribution = readFileSync(
    join(PUBLIC_DIR, "landing", "ATTRIBUTION.md"),
    "utf8",
  );

  it("credits every photographer and links every source", () => {
    // Pexels does not require this. We do it because the file is also how the
    // next person finds and replaces an asset.
    for (const asset of LANDING_ASSETS) {
      expect(attribution, `${asset.id}: author`).toContain(asset.author);
      expect(attribution, `${asset.id}: source`).toContain(asset.pageUrl);
      expect(attribution, `${asset.id}: file`).toContain(asset.file);
    }
  });

  it("names the licence the media is used under", () => {
    expect(attribution).toContain("https://www.pexels.com/license/");
  });
});
