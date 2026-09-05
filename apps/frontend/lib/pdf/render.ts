import type { BrowserContext, Page } from "playwright-core";

import { getBrowser, renderOrigin } from "./browser";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "./paper";
import { renderSemaphore } from "./semaphore";

export { A4_HEIGHT_PX, A4_WIDTH_PX };

/**
 * Turning a print route into a document.
 *
 * Both outputs come from the *same* loaded page: the PDF from `page.pdf()`, the
 * preview from a screenshot of its first sheet. That is deliberate — a preview
 * produced by any other means would be a picture of something the owner is not
 * about to download, and would drift the moment pagination changed.
 */

export interface PrintTarget {
  /** Locale-prefixed path of the print route, e.g. `/cs/print/menu/<id>`. */
  path: string;
  search: URLSearchParams;
  timeoutMs: number;
}

export interface SessionCookie {
  name: string;
  value: string;
}

/** The render did not finish in time; the caller answers 504 rather than hanging. */
export class RenderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Rendering did not finish within ${timeoutMs}ms.`);
    this.name = "RenderTimeoutError";
  }
}

/** The print route itself refused — a menu that vanished, a session that expired. */
export class RenderTargetError extends Error {
  constructor(readonly status: number) {
    super(`The print route answered ${status}.`);
    this.name = "RenderTargetError";
  }
}

export function renderPdf(target: PrintTarget, session: SessionCookie): Promise<Buffer> {
  return withPage(target, session, (page) =>
    page.pdf({
      format: "A4",
      // Without this a themed document prints as black text on white paper,
      // which is the one thing "inherits the menu's style" cannot mean.
      printBackground: true,
      // `@page` in print.css is the single source of paper size and margins, so
      // the browser's own print dialog and this renderer cannot disagree.
      preferCSSPageSize: true,
      // Structure survives into the file: headings stay headings, so the
      // document is navigable by a screen reader and its text is selectable.
      tagged: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    }),
  );
}

export function renderPreview(target: PrintTarget, session: SessionCookie): Promise<Buffer> {
  return withPage(target, session, (page) =>
    page.screenshot({
      type: "jpeg",
      quality: 80,
      clip: { x: 0, y: 0, width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
    }),
  );
}

async function withPage(
  target: PrintTarget,
  session: SessionCookie,
  produce: (page: Page) => Promise<Buffer>,
): Promise<Buffer> {
  const release = await renderSemaphore.acquire();
  const origin = renderOrigin();
  let context: BrowserContext | undefined;

  try {
    const browser = await getBrowser();

    context = await browser.newContext({
      // Paper has no dark mode. A fresh context also carries no stored
      // appearance preference, so `next-themes` resolves "system" to light and
      // every theme renders its light tokens — no CSS change needed.
      colorScheme: "light",
      viewport: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });

    // The print route is session-gated, so the renderer has to act as the
    // owner. The cookie never leaves this machine: handler and browser are the
    // same process's neighbours, and the context is discarded below.
    await context.addCookies([
      {
        name: session.name,
        value: session.value,
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const page = await context.newPage();
    await page.emulateMedia({
      media: "print",
      colorScheme: "light",
      reducedMotion: "reduce",
    });

    const url = `${origin}${target.path}?${target.search.toString()}`;

    const work = (async () => {
      const response = await page.goto(url, {
        // Photographs and the logo are fetched through the image optimiser, so
        // "the document finished loading" means the network went quiet, not
        // that the HTML arrived.
        waitUntil: "networkidle",
        timeout: target.timeoutMs,
      });

      if (response && !response.ok()) throw new RenderTargetError(response.status());

      // The non-default styles load their faces with `preload: false`, so a
      // face is fetched only once text uses it. Snapshotting before that
      // settles would print a fallback font.
      await page.evaluate(() => document.fonts.ready);

      return produce(page);
    })();

    return await withTimeout(work, target.timeoutMs);
  } finally {
    // Close first, release second: the slot is only genuinely free once the
    // context's memory is back.
    await context?.close().catch(() => undefined);
    release();
  }
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new RenderTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
