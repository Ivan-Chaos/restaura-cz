import { existsSync } from "node:fs";
import { join } from "node:path";

import type { MediaAsset } from "./assets";

/**
 * Whether an optional asset is actually on disk.
 *
 * The hero clip may or may not have been obtained (Pexels gates its video
 * files), and the page must be right either way. Checking here — in a
 * server-only module, during static generation — means the answer is baked into
 * the built HTML: no flag to remember to flip, no `<video>` element pointing at
 * a 404, and no `node:fs` anywhere near a client bundle.
 */
export function hasAssetFile(asset: MediaAsset): boolean {
  return existsSync(join(process.cwd(), "public", asset.file));
}
