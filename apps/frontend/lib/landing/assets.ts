/**
 * The landing page's media manifest.
 *
 * Every photograph and clip on the marketing page is listed here once, and the
 * entry is the single source of truth for three separate consumers:
 *
 *   - `scripts/fetch-landing-assets.mjs` downloads the file and regenerates
 *     `public/landing/ATTRIBUTION.md` from it,
 *   - `tests/unit/landing-assets.test.ts` proves the file on disk matches the
 *     dimensions and budget claimed here,
 *   - the components read `width`/`height` so `next/image` can reserve space.
 *
 * Every asset is delivered one of two ways, and the `delivery` field says which:
 *
 *   `download` — fetched once and committed. Never hot-linked from someone
 *     else's CDN, because a marketing page that silently loses its hero when a
 *     URL rotates is worse than a slightly larger repository.
 *   `stream`   — served from our own object storage and range-requested as it
 *     plays. For video, where committing the file is not an option and
 *     downloading it in full would defeat the point.
 *
 * Alt text lives in the message catalogues, not here — a description of a
 * photograph is prose, and prose is translated.
 */

export type MediaAssetId = "hero" | "heroClip" | "digitalMenu" | "pdf" | "og";

/**
 * Message keys under the `Landing` namespace, spelled out so `t(asset.altKey)`
 * type-checks against the catalogue instead of accepting any old string.
 */
export type AssetAltKey =
  | "assets.hero.alt"
  | "assets.digitalMenu.alt"
  | "assets.pdf.alt"
  | "assets.og.alt";

interface BaseAsset {
  id: MediaAssetId;
  kind: "image" | "video";
  /** Numeric id from the Pexels page URL. */
  pexelsId: number;
  pageUrl: string;
  author: string;
  authorUrl: string;
  width: number;
  height: number;
  /**
   * Message key for the image description, or `null` for decorative media that
   * carries no information a screen-reader user would miss.
   */
  altKey: AssetAltKey | null;
}

/**
 * Fetched once, committed, and served from our own `public/`. This is the right
 * shape for anything small enough that the repository will not notice it.
 */
export interface DownloadedAsset extends BaseAsset {
  delivery: "download";
  /** Direct file URL the fetch script downloads from. */
  downloadUrl: string;
  /** Path under `public/`; also the runtime `src` with a leading slash. */
  file: `landing/${string}`;
  /** Budget the fetch script enforces, in bytes. */
  maxBytes: number;
}

/**
 * Served from our own object storage and pulled in pieces as it plays.
 *
 * This is not hot-linking: the file sits in a bucket we control, behind a URL
 * that will not rotate under us. It exists because some media is simply too
 * large to live in git, and because a video the browser can range-request is
 * one it never has to download in full.
 */
export interface StreamedAsset extends BaseAsset {
  delivery: "stream";
  /** Absolute URL. Must answer range requests, or this is a download in disguise. */
  streamUrl: string;
  /** MIME type for the `<source>` element. */
  mimeType: string;
  /** Rough size, for the record — nothing enforces it, the network does. */
  approxBytes: number;
}

export type MediaAsset = DownloadedAsset | StreamedAsset;

const KB = 1024;
const MB = 1024 * KB;

export const LANDING_ASSETS: readonly MediaAsset[] = [
  {
    delivery: "download",
    id: "hero",
    kind: "image",
    pexelsId: 67468,
    pageUrl: "https://www.pexels.com/photo/restaurant-interior-67468/",
    author: "Chan Walrus",
    authorUrl: "https://www.pexels.com/@chanwalrus/",
    downloadUrl:
      "https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    file: "landing/hero.jpg",
    width: 1920,
    height: 1080,
    altKey: "assets.hero.alt",
    // The committed file is the source `next/image` re-encodes from, not what a
    // visitor downloads — the served WebP is a fraction of this. The budget is
    // therefore about repository weight, not about LCP.
    maxBytes: 256 * KB,
  },
  {
    delivery: "stream",
    id: "heroClip",
    kind: "video",
    pexelsId: 6321912,
    pageUrl:
      "https://www.pexels.com/video/people-eating-healthy-foods-6321912/",
    author: "cottonbro studio",
    authorUrl: "https://www.pexels.com/@cottonbro/",
    streamUrl:
      "https://pub-1ab2f4df12124ef28ddfc89ae67880ea.r2.dev/public_assets/6321912-uhd_4096_2160_25fps.mp4",
    mimeType: "video/mp4",
    // 132 MB of UHD. Committing that would be absurd, and downloading it up
    // front would be worse — R2 answers range requests, so the browser pulls
    // only the part it is actually playing. `HeroVideo` decides whether to ask
    // for any of it at all.
    approxBytes: 138 * MB,
    width: 4096,
    height: 2160,
    // Decorative: it is the same room the poster shows, and it carries nothing
    // a screen-reader user would otherwise miss.
    altKey: null,
  },
  {
    delivery: "download",
    id: "digitalMenu",
    kind: "image",
    pexelsId: 4839756,
    pageUrl:
      "https://www.pexels.com/photo/close-up-of-a-woman-using-a-smartphone-4839756/",
    author: "Anna Tarazevich",
    authorUrl: "https://www.pexels.com/@anntarazevich/",
    downloadUrl:
      "https://images.pexels.com/photos/4839756/pexels-photo-4839756.jpeg?auto=compress&cs=tinysrgb&w=1280&h=960&fit=crop",
    file: "landing/digital-menu.jpg",
    width: 1280,
    height: 960,
    altKey: "assets.digitalMenu.alt",
    maxBytes: 400 * KB,
  },
  {
    delivery: "download",
    id: "pdf",
    kind: "image",
    pexelsId: 4921400,
    pageUrl: "https://www.pexels.com/photo/person-holding-a-menu-4921400/",
    author: "Rachel Claire",
    authorUrl: "https://www.pexels.com/@rachel-claire/",
    downloadUrl:
      "https://images.pexels.com/photos/4921400/pexels-photo-4921400.jpeg?auto=compress&cs=tinysrgb&w=1280&h=960&fit=crop",
    file: "landing/pdf.jpg",
    width: 1280,
    height: 960,
    altKey: "assets.pdf.alt",
    maxBytes: 400 * KB,
  },
  // No `qr` photograph on purpose. Every stock QR photo we reviewed carried a
  // real company's branding on the code or the screen behind it — using one on
  // a commercial page would imply an endorsement the Pexels licence forbids.
  // The QR capability draws its own table tent instead (`TableTent`), which is
  // also the more honest picture: it shows our product, not someone else's.
  {
    delivery: "download",
    id: "og",
    kind: "image",
    pexelsId: 67468,
    pageUrl: "https://www.pexels.com/photo/restaurant-interior-67468/",
    author: "Chan Walrus",
    authorUrl: "https://www.pexels.com/@chanwalrus/",
    downloadUrl:
      "https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop",
    file: "landing/og.jpg",
    width: 1200,
    height: 630,
    altKey: "assets.og.alt",
    maxBytes: 300 * KB,
  },
];

export function getAsset(id: MediaAssetId): MediaAsset {
  const asset = LANDING_ASSETS.find((candidate) => candidate.id === id);
  if (!asset) throw new Error(`Unknown landing asset: ${id}`);
  return asset;
}

/**
 * The runtime `src` for an asset — a local path for anything we committed,
 * the bucket URL for anything we stream.
 */
export function assetSrc(asset: MediaAsset): string {
  return asset.delivery === "stream" ? asset.streamUrl : `/${asset.file}`;
}

/** Narrowing helper, so callers can ask without repeating the discriminant. */
export function isStreamed(asset: MediaAsset): asset is StreamedAsset {
  return asset.delivery === "stream";
}
