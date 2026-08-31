import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/**
 * The path being rendered, published to Server Components.
 *
 * App Router hands a layout no way to learn its own URL, and the workspace gate
 * needs one: sending a signed-out visitor to sign-in is only half the job if
 * they cannot be returned to the page they asked for (spec FR-013).
 *
 * next-intl's middleware copies the incoming request's headers onto the request
 * it forwards, so a header set on the request *before* it runs reaches
 * `headers()` during render. It has to be a genuinely new request, though —
 * `NextRequest.headers` on the original does not accept a mutation that
 * survives, which fails silently rather than loudly.
 */
export const PATHNAME_HEADER = "x-restaura-pathname";

// Redirects "/" (and any un-prefixed path) to the best locale based on the
// NEXT_LOCALE cookie or the Accept-Language header, e.g. "/" -> "/cs".
const handleLocale = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return handleLocale(new NextRequest(request, { headers }));
}

export const config = {
  /**
   * Skip Next.js internals, API routes and files with an extension (assets).
   *
   * The backslash is doubled on purpose. In a JavaScript string `"\."` is just
   * `"."`, which turns the "has a file extension" clause into "has any
   * character at all" — and quietly excludes every path but `/`. That went
   * unnoticed while the middleware only redirected the root; it stops the
   * pathname header below from ever reaching a page.
   */
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
