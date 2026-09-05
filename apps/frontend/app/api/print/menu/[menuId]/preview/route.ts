import type { NextRequest } from "next/server";

import { renderPreview } from "@/lib/pdf/render";
import {
  errorResponse,
  hasPrintableContent,
  jpegResponse,
  loadPrintContext,
  runRender,
} from "@/lib/pdf/request";
import { resolveBranding } from "@/lib/plans/entitlements";
import { parseMenuOptions } from "@/lib/validation/print";

/**
 * The first page of the menu PDF, as an image.
 *
 * Produced by the same pipeline as the document itself, which is the point: the
 * owner is looking at a photograph of page one of the file they are about to
 * download, pagination and all — not at an approximation that could disagree
 * with it.
 */

/** Shorter than the download: a preview that is slow is worse than no preview. */
const TIMEOUT_MS = 10_000;

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/print/menu/[menuId]/preview">,
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
    renderPreview(
      {
        path: `/${options.value.locale}/print/menu/${menuId}`,
        search: new URLSearchParams({ branding: showBranding ? "1" : "0" }),
        timeoutMs: TIMEOUT_MS,
      },
      session,
    ),
  );

  if (!rendered.ok) return errorResponse(rendered.code);
  return jpegResponse(rendered.value);
}
