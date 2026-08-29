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
 * Media is downloaded and committed, never hot-linked: a marketing page that
 * silently loses its hero because a CDN URL rotated is worse than a slightly
 * larger repository. Alt text lives in the message catalogues, not here — a
 * description of a photograph is prose, and prose is translated.
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

export interface MediaAsset {
  id: MediaAssetId;
  kind: "image" | "video";
  /** Numeric id from the Pexels page URL. */
  pexelsId: number;
  pageUrl: string;
  author: string;
  authorUrl: string;
  /** Direct file URL the fetch script downloads from. */
  downloadUrl: string;
  /** Path under `public/`; also the runtime `src` with a leading slash. */
  file: `landing/${string}`;
  width: number;
  height: number;
  /**
   * Message key for the image description, or `null` for decorative media that
   * carries no information a screen-reader user would miss.
   */
  altKey: AssetAltKey | null;
  /** Budget the fetch script enforces, in bytes. */
  maxBytes: number;
  /**
   * An enhancement the page is designed to survive without. A missing optional
   * asset is a warning, not a build failure — the hero falls back to its poster
   * and picks the clip up automatically the day the file appears.
   */
  optional?: boolean;
}

const KB = 1024;
const MB = 1024 * KB;

export const LANDING_ASSETS: readonly MediaAsset[] = [
  {
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
    id: "heroClip",
    kind: "video",
    pexelsId: 3298832,
    pageUrl:
      "https://www.pexels.com/video/a-restaurant-s-interior-design-3298832/",
    author: "Rostislav Uzunov",
    authorUrl: "https://www.pexels.com/@rostislav/",
    downloadUrl:
      "https://videos.pexels.com/video-files/3298832/3298832-hd_1920_1080_25fps.mp4",
    file: "landing/hero.mp4",
    width: 1920,
    height: 1080,
    // Decorative: the poster already carries the same scene, and the clip is
    // hidden from assistive technology.
    altKey: null,
    maxBytes: 6 * MB,
    // Pexels serves its video files behind protections an unauthenticated
    // fetch cannot pass, so this one may have to be downloaded by hand from
    // `pageUrl` and dropped in as `public/landing/hero.mp4`. Until it is there,
    // the hero shows its poster and nothing else changes.
    optional: true,
  },
  {
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

/** The runtime `src` for an asset: `landing/hero.jpg` → `/landing/hero.jpg`. */
export function assetSrc(asset: MediaAsset): string {
  return `/${asset.file}`;
}
