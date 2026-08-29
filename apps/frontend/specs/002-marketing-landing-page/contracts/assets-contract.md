# Contract: Landing media assets

## File layout

```
public/landing/
├── hero.jpg           # poster, 1920×1080 (16:9), ≤ 180 KB
├── hero.mp4           # silent loop, ≤ 15 s, 1920×1080 or 1280×720, H.264, no audio track, ≤ 6 MB
├── digital-menu.jpg   # 1280 w, 4:3 or 3:2, ≤ 400 KB
├── pdf.jpg            # 1280 w, ≤ 400 KB
├── qr.jpg             # 1280 w, ≤ 400 KB
├── og.jpg             # 1200×630, ≤ 300 KB (crop of hero or separate photo)
└── ATTRIBUTION.md     # GENERATED — do not hand-edit
```

## Manifest (`lib/landing/assets.ts`)

```ts
export interface MediaAsset {
  id: "hero" | "heroClip" | "digitalMenu" | "pdf" | "qr" | "og";
  kind: "image" | "video";
  pexelsId: number;
  pageUrl: string;       // https://www.pexels.com/photo/<slug>-<id>/ or /video/<slug>-<id>/
  author: string;
  authorUrl: string;     // https://www.pexels.com/@<handle>/
  downloadUrl: string;   // direct file URL (see below)
  file: `landing/${string}`;
  width: number;
  height: number;
  altKey: `Landing.assets.${string}.alt` | null;  // null only for decorative video
  maxBytes: number;
}
export const LANDING_ASSETS: readonly MediaAsset[];
export function getAsset(id: MediaAsset["id"]): MediaAsset;
```

`downloadUrl` forms that work without an API key:
- Image: `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=<width>`
- Video: the `https://videos.pexels.com/video-files/<id>/<file>.mp4` link shown on the video page for the chosen quality.

## Fetch script (`scripts/fetch-landing-assets.mjs`)

```
node scripts/fetch-landing-assets.mjs [--force] [--only <id>[,<id>]] [--check]
```

- Reads the manifest (via a small tsx-free JSON export or by importing the compiled module —
  implementer's choice; keep it dependency-free).
- Skips files that already exist unless `--force`.
- Downloads with built-in `fetch`, streams to disk, then validates: byte size ≤ `maxBytes`,
  image dimensions (parse JPEG SOF / PNG IHDR / WebP VP8X headers) equal `width`×`height`.
  Video dimensions are not parsed; size and existence only.
- If `PEXELS_API_KEY` is set, fetches `GET https://api.pexels.com/v1/photos/{id}` /
  `GET https://api.pexels.com/videos/videos/{id}` and warns when `photographer`/`user.name`
  differs from the manifest `author`.
- Regenerates `public/landing/ATTRIBUTION.md`:

  ```
  # Landing page media — attribution
  All media from Pexels under the Pexels licence (https://www.pexels.com/license/).
  | File | Author | Source |
  | landing/hero.jpg | <author> (<authorUrl>) | <pageUrl> |
  ```
- `--check` performs validation only (used by `tests/unit/landing-assets.test.ts` logic, not by
  CI network calls — CI never downloads).
- Exit code 1 on any budget or dimension failure with `file: reason` lines.

## Licence rules (Pexels)

- Free for commercial use; attribution not required but **recorded** in `ATTRIBUTION.md`.
- Do not sell or redistribute unaltered files; do not imply endorsement by identifiable people
  or brands; avoid photos with identifiable people as the focal point.
- Never hot-link `images.pexels.com` / `videos.pexels.com` from the app at runtime.

## Curation brief (implementation task)

Warm colour temperature, real restaurant settings, no clip-art, no visible third-party
branding. Hero: dining room or pass with depth, dim-warm light, room for centred text (calm
centre). Digital menu: hands holding a phone at a table. PDF: printed menu on linen/wood. QR:
table tent or card with a QR code being scanned. Clip: slow, steady, ≤ 15 s, loopable, no
people's faces in focus.

## Deferred

Where video is ultimately hosted (Git LFS / object storage / Blob). Until decided, `hero.mp4`
is committed under the 6 MB budget; `.gitattributes` is **not** changed.
