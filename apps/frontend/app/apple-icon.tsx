import { ImageResponse } from "next/og";

/**
 * The home-screen icon for iOS, which does not accept the SVG in `icon.svg`.
 *
 * Rendered from the same geometry as the mark — a cloche on a plate — but built
 * out of boxes and border radii rather than paths, because this goes through
 * satori and plain CSS shapes are the part of it that never surprises anyone.
 *
 * Without this file iOS invents its own icon from a screenshot of the page,
 * which for a full-bleed photographic hero is an unreadable smudge.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * `--palette-terracotta-600` and `--palette-cream-50` from `styles/palette.css`,
 * resolved to hex. Literals are unavoidable here and the gate is told so: this
 * renders to a PNG at build time, outside the DOM, where no custom property
 * exists to read. Keep them in step with the palette by hand.
 */
// design-tokens-ignore-next-line -- rasterised outside any theme scope; see above
const TERRACOTTA = "#b54e21";
// design-tokens-ignore-next-line -- rasterised outside any theme scope; see above
const CREAM = "#fffdfa";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: TERRACOTTA,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 19,
            height: 19,
            borderRadius: 19,
            background: CREAM,
            marginBottom: -3,
          }}
        />
        {/* Dome: a rectangle rounded only along its top edge. */}
        <div
          style={{
            width: 112,
            height: 56,
            borderRadius: "112px 112px 0 0",
            background: CREAM,
          }}
        />
        {/* Plate */}
        <div
          style={{
            width: 140,
            height: 17,
            borderRadius: 9,
            background: CREAM,
            marginTop: 8,
          }}
        />
      </div>
    ),
    size,
  );
}
