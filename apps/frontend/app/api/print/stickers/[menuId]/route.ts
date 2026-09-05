import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";

import { documentFilename } from "@/lib/pdf/filename";
import { renderPdf } from "@/lib/pdf/render";
import { errorResponse, loadPrintContext, pdfResponse, runRender } from "@/lib/pdf/request";
import { resolveBranding } from "@/lib/plans/entitlements";
import { parseStickerOptions } from "@/lib/validation/print";

/**
 * A sheet of numbered table QR stickers, as a downloadable PDF.
 *
 * Requires a published menu: the codes encode the menu's public address, and a
 * draft has none. That is reported as a distinct code so the dialog can say
 * "publish first" rather than "something went wrong".
 */

/** Stickers are cheap to lay out; 200 of them is still only 50 pages of boxes. */
const TIMEOUT_MS = 15_000;

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/print/stickers/[menuId]">,
) {
  const { menuId } = await params;

  const options = parseStickerOptions(request.nextUrl.searchParams);
  if (!options.ok) return errorResponse("VALIDATION_FAILED");

  const context = await loadPrintContext(menuId);
  if (!context.ok) return errorResponse(context.code);

  const { menu, plan, session } = context.value;
  if (menu.status !== "published" || !menu.publicSlug) {
    return errorResponse("NOT_PUBLISHED");
  }

  const showBranding = resolveBranding(plan, options.value.branding);

  const rendered = await runRender(() =>
    renderPdf(
      {
        path: `/${options.value.locale}/print/stickers/${menuId}`,
        search: new URLSearchParams({
          count: String(options.value.count),
          perPage: String(options.value.perPage),
          branding: showBranding ? "1" : "0",
        }),
        timeoutMs: TIMEOUT_MS,
      },
      session,
    ),
  );

  if (!rendered.ok) return errorResponse(rendered.code);

  const t = await getTranslations({ locale: options.value.locale, namespace: "Print" });
  return pdfResponse(rendered.value, documentFilename(menu.name, t("fileSuffix.stickers")));
}
