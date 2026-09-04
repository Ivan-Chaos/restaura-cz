# Image fixtures (feature 006)

Files the upload suites pick with `setInputFiles`. Regenerate any of them with
`node tests/fixtures/images/generate.mjs --all` from `apps/frontend/`.

| File | What it is | What it proves |
|---|---|---|
| `dish-4x3.jpg` | 1200×1600 JPEG stored **portrait with EXIF orientation 6** | Orientation is honoured: the crop dialog shows it upright and the stored rendition is landscape (FR-011) |
| `logo-alpha.png` | 600×400 PNG with a transparent background | Transparency survives into the stored logo (FR-013) |
| `tiny.webp` | 200×150 WebP | WebP is accepted, and an image smaller than the target frame is scaled up rather than rejected |
| `not-an-image.png` | Plain text bytes under a `.png` name | Acceptance is decided by content, not by filename (FR-010) |

Two fixtures are **not committed** — they are large and fully reproducible, so
the suites that need them run `generate.mjs` in a `beforeAll`:

| File | What it is | What it proves |
|---|---|---|
| `too-big.jpg` | > 10 MiB JPEG | The size check refuses the file before any upload starts (SC-004) |
| `big-12mp.jpg` | 4000×3000 JPEG | The adjust step is interactive within 2 s on a phone-camera photo (PR-004) |
