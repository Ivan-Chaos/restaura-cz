import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Redirects "/" (and any un-prefixed path) to the best locale based on the
// NEXT_LOCALE cookie or the Accept-Language header, e.g. "/" -> "/cs".
export default createMiddleware(routing);

export const config = {
  // Skip Next.js internals, API routes and files with an extension (assets).
  matcher: "/((?!api|trpc|_next|_vercel|.*\..*).*)",
};
