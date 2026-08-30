import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import {
  assetSrc,
  getAsset,
  isStreamed,
  LANDING_ASSETS,
  type DownloadedAsset,
  type MediaAssetId,
} from "@/lib/landing/assets";

/**
 * The manifest claims things nothing checks at runtime — dimensions
 * `next/image` reserves space from, budgets that keep the repository sane,
 * authors we credit. They are checked here instead. A re-crop that forgets to
 * update `width`/`height` shows up as layout shift in production; it shows up
 * as a failing test in a second.
 *
 * Streamed assets are deliberately checked less: the file is not ours to stat,
 * and reaching across the network would make this suite depend on a bucket
 * being up. What can be checked without leaving the machine is checked.
 */

const PUBLIC_DIR = join(process.cwd(), "public");
const CATALOGUES = { cs, en, de } as const;

const DOWNLOADED = LANDING_ASSETS.filter(
  (asset): asset is DownloadedAsset => asset.delivery === "download",
);
const STREAMED = LANDING_ASSETS.filter(isStreamed);

const pathOf = (asset: DownloadedAsset) => join(PUBLIC_DIR, asset.file);

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

  it("keeps every downloaded asset in the repository", () => {
    for (const asset of DOWNLOADED) {
      expect(existsSync(pathOf(asset)), `${asset.file} is missing`).toBe(true);
    }
  });

  it("stays inside its size budget", () => {
    for (const asset of DOWNLOADED) {
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
    for (const asset of DOWNLOADED.filter((a) => a.kind === "image")) {
      const dimensions = readDimensions(readFileSync(pathOf(asset)));
      expect(dimensions, `could not parse ${asset.file}`).not.toBeNull();
      expect({ file: asset.file, ...dimensions }).toEqual({
        file: asset.file,
        width: asset.width,
        height: asset.height,
      });
    }
  });

  it("resolves a local path for committed media and a URL for streamed media", () => {
    for (const asset of DOWNLOADED) {
      expect(assetSrc(asset)).toBe(`/${asset.file}`);
      expect(assetSrc(asset).startsWith("/landing/")).toBe(true);
    }
    for (const asset of STREAMED) {
      expect(assetSrc(asset)).toBe(asset.streamUrl);
    }
  });

  it("throws rather than rendering an unknown asset", () => {
    expect(() => getAsset("nope" as MediaAssetId)).toThrow(
      /Unknown landing asset/,
    );
  });
});

describe("streamed media", () => {
  it("streams only over https, from a host we control", () => {
    // Hot-linking someone else's CDN is the failure this rules out: a URL that
    // can rotate under us takes the hero with it.
    for (const asset of STREAMED) {
      const url = new URL(asset.streamUrl);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toMatch(/\.r2\.dev$/);
    }
  });

  it("declares a mime type, so the browser can skip what it cannot play", () => {
    for (const asset of STREAMED) {
      expect(asset.mimeType).toMatch(/^video\//);
    }
  });

  it("is the only way video is delivered", () => {
    // A video small enough to commit would be a different decision; today the
    // one clip we have is far past that line, and this records the expectation.
    for (const asset of LANDING_ASSETS.filter((a) => a.kind === "video")) {
      expect(isStreamed(asset), `${asset.id} should stream`).toBe(true);
    }
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
    // The hero clip is the one exception: it shows the same room the poster
    // does and is hidden from assistive technology, so describing it is noise.
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
    // next person finds and replaces an asset — streamed ones included, which
    // are the easiest to forget precisely because they are not in the tree.
    for (const asset of LANDING_ASSETS) {
      expect(attribution, `${asset.id}: author`).toContain(asset.author);
      expect(attribution, `${asset.id}: source`).toContain(asset.pageUrl);
    }
  });

  it("names the licence the media is used under", () => {
    expect(attribution).toContain("https://www.pexels.com/license/");
  });
});
