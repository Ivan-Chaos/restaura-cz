import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";

import { documentFilename } from "@/lib/pdf/filename";
import { renderPdf } from "@/lib/pdf/render";
import {
  errorResponse,
  hasPrintableContent,
  loadPrintContext,
  pdfResponse,
  runRender,
} from "@/lib/pdf/request";
import { resolveBranding } from "@/lib/plans/entitlements";
import { parseMenuOptions } from "@/lib/validation/print";

/**
 * The menu as a downloadable PDF.
 *
 * The browser calls this — our own origin, our own session cookie — and this
 * calls the renderer, which loads the print route as the owner. That keeps the
 * rule the rest of the app follows: the browser never talks to the API, and
 * nothing about a document is decided on the client.
 *
 * The whole file is built before a byte is sent, so a failure is an error the
 * dialog can retry rather than a truncated PDF in someone's downloads.
 */

/** Generous: a large photographed menu is a lot of layout and a lot of images. */
const TIMEOUT_MS = 25_000;

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/print/menu/[menuId]">,
) {
  const { menuId } = await params;

  const options = parseMenuOptions(request.nextUrl.searchParams);
  if (!options.ok) return errorResponse("VALIDATION_FAILED");

  const context = await loadPrintContext(menuId);
  if (!context.ok) return errorResponse(context.code);

  const { menu, plan, session } = context.value;
  if (!hasPrintableContent(menu)) return errorResponse("EMPTY_MENU");

  const showBranding = resolveBranding(plan, options.value.branding);

  const rendered = await runRender(() =>
    renderPdf(
      {
        path: `/${options.value.locale}/print/menu/${menuId}`,
        search: new URLSearchParams({ branding: showBranding ? "1" : "0" }),
        timeoutMs: TIMEOUT_MS,
      },
      session,
    ),
  );

  if (!rendered.ok) return errorResponse(rendered.code);

  const t = await getTranslations({ locale: options.value.locale, namespace: "Print" });
  return pdfResponse(rendered.value, documentFilename(menu.name, t("fileSuffix.menu")));
}
