import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    /**
     * The sample menu's dish images are SVG placeholders we generate ourselves
     * (real food photography is out of scope for this feature). `next/image`
     * refuses SVG by default because a hostile SVG can carry script — so the
     * CSP below neuters exactly that: no scripts, sandboxed, same-origin only.
     * Revisit if user-supplied images are ever served through this pipeline.
     */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);
