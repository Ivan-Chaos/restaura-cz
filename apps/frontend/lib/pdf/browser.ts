import { chromium, type Browser } from "playwright-core";

/**
 * The headless browser that turns the print routes into documents.
 *
 * **Why a browser at all.** A menu's look is CSS: custom properties under
 * `[data-theme]`, faces loaded by `next/font`, Tailwind utilities, and a
 * structural recipe rendered by React. "The PDF inherits the menu's style"
 * therefore means "something that understands that CSS lays the page out", and
 * the honest way to have that is to use the engine that already does it for
 * guests. The alternative is a second layout engine and six styles maintained
 * twice.
 *
 * **One per process.** Launching Chromium costs seconds; a page costs
 * milliseconds. So the browser is a singleton and every request gets its own
 * *context* — which is also what keeps one owner's session out of another's
 * render.
 *
 * **Server only.** `playwright-core` is listed in `serverExternalPackages`, so
 * it is required at runtime rather than bundled; nothing here may be reached
 * from a client component.
 */

/**
 * Held on `globalThis` so a dev-server hot reload reuses the running browser
 * instead of leaking one per edit.
 */
const BROWSER_KEY = Symbol.for("restaura.pdf.browser");

interface BrowserHolder {
  [BROWSER_KEY]?: Promise<Browser>;
}

const holder = globalThis as unknown as BrowserHolder;

export async function getBrowser(): Promise<Browser> {
  const existing = holder[BROWSER_KEY];
  if (existing) {
    const browser = await existing.catch(() => null);
    // A crashed or killed browser must not poison every later request; the next
    // caller relaunches.
    if (browser?.isConnected()) return browser;
  }

  const launched = chromium.launch({
    // Unset locally: `playwright-core` then uses the browser Playwright
    // installed for the end-to-end suite, which is what makes this work with no
    // extra setup. A deployment either installs that browser or points here at
    // a system Chromium.
    executablePath: process.env.PDF_CHROMIUM_PATH || undefined,
    // A real security boundary. It stays on unless a container makes it
    // impossible, which is why disabling it takes an explicit opt-in.
    chromiumSandbox: process.env.PDF_CHROMIUM_NO_SANDBOX !== "true",
  });

  holder[BROWSER_KEY] = launched;

  try {
    return await launched;
  } catch (error) {
    // Do not cache a failed launch: a missing binary is usually fixed by
    // installing one, and the next request should get to try.
    holder[BROWSER_KEY] = undefined;
    throw error;
  }
}

/**
 * Where the headless browser reaches this server.
 *
 * It loads our own pages over HTTP rather than being handed HTML, so that the
 * document is built by the same Next.js render, with the same compiled CSS,
 * fonts and optimised images, that a person would see opening the print route.
 */
export function renderOrigin(): string {
  const configured = process.env.PDF_RENDER_ORIGIN;
  const origin = configured?.trim()
    ? configured
    : `http://localhost:${process.env.PORT ?? 3000}`;
  return origin.replace(/\/+$/, "");
}
