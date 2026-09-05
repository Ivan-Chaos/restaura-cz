import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Where uploaded logos and dish photos are served from (feature 006). Read at
 * build time, so a change needs a rebuild — that is inherent to
 * `remotePatterns`, which is baked into the build. Must match the API's own
 * `IMAGE_PUBLIC_URL`; unset, it points at the API's local-disk route, which is
 * what lets `next/image` optimise uploads with no bucket configured.
 */
const IMAGE_PUBLIC_URL = (
  process.env.IMAGE_PUBLIC_URL ?? "http://localhost:3001/dev-images"
).replace(/\/+$/, "");

/**
 * Next 16 refuses to optimise an image whose host resolves to a private
 * address, because in a deployment that is how a server-side request forgery
 * reaches something it should not. Locally the image host genuinely *is* the
 * API on localhost, so the check has to be lifted — and only there.
 *
 * Derived from the configured host rather than from `NODE_ENV`, so pointing a
 * production build at a real bucket turns the protection back on by itself
 * instead of relying on someone remembering to.
 */
const IMAGE_HOST_IS_LOCAL = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(
  new URL(IMAGE_PUBLIC_URL).hostname,
);

const nextConfig: NextConfig = {
  images: {
    /**
     * The only host `next/image` will fetch from: our own image store. Anything
     * else answers 400, so the optimiser can never be pointed at a third party.
     */
    remotePatterns: [new URL(`${IMAGE_PUBLIC_URL}/**`)],
    /**
     * Only ever true when the image host is localhost — see above. With a real
     * bucket hostname this is false and the SSRF protection stands.
     */
    dangerouslyAllowLocalIP: IMAGE_HOST_IS_LOCAL,
    /**
     * The sample menu's dish images are SVG placeholders we generate ourselves.
     * `next/image` refuses SVG by default because a hostile SVG can carry
     * script — so the CSP below neuters exactly that: no scripts, sandboxed,
     * same-origin only.
     *
     * Owner uploads are never SVG: the API decodes every upload and accepts
     * only JPEG, PNG and WebP by content (feature 006, FR-010), re-encoding to
     * PNG or JPEG before anything is stored. Combined with `remotePatterns`
     * above, the only SVGs this pipeline can ever see are the ones in our own
     * repository.
     */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  /**
   * `playwright-core` launches a real Chromium to turn the print routes into
   * PDFs (feature 007). It is Node-only — native binaries, `child_process`,
   * a browser it spawns — so it must be `require`d at runtime rather than
   * traced and bundled into the server build.
   *
   * See `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`.
   */
  serverExternalPackages: ["playwright-core"],
  experimental: {
    serverActions: {
      /**
       * Uploads are capped at 10 MiB (feature 006). The limit here covers the
       * raw HTTP body including multipart boundaries, part headers and the crop
       * fields, so it leaves room above the file itself.
       */
      bodySizeLimit: "12mb",
    },
  },
};

export default withNextIntl(nextConfig);
