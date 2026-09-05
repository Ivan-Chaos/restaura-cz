import type { NextRequest } from "next/server";

import { renderPreview } from "@/lib/pdf/render";
import { errorResponse, jpegResponse, loadPrintContext, runRender } from "@/lib/pdf/request";
import { resolveBranding } from "@/lib/plans/entitlements";
import { parseStickerOptions } from "@/lib/validation/print";

/**
 * The first sheet of the sticker document, as an image.
 *
 * Always four stickers, numbered 1 to 4, whatever the total is — which is the
 * useful thing to show: the owner is checking the layout, the style and the
 * numbering, and page one answers all three.
 */

const TIMEOUT_MS = 10_000;

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/print/stickers/[menuId]/preview">,
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
    renderPreview(
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
  return jpegResponse(rendered.value);
}
