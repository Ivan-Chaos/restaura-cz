import { cookies } from "next/headers";

import { getMenu } from "@/lib/api/actions/menus";
import { SESSION_COOKIE } from "@/lib/api/cookies";
import { getSession } from "@/lib/api/session";
import type { MenuDetail } from "@/lib/api/types";
import { planOf } from "@/lib/plans/entitlements";
import type { PlanId } from "@/lib/landing/plans";

import type { PrintErrorCode } from "./errors";
import { contentDisposition } from "./filename";
import { RenderTargetError, RenderTimeoutError, type SessionCookie } from "./render";

export type { PrintErrorCode };

/**
 * The plumbing every print route handler shares: who is asking, what they are
 * asking for, and how a refusal is phrased.
 *
 * Handlers speak codes, never prose. The dialog renders them through the
 * `Print.errors` catalogue, the same way every other failure in this app
 * reaches a visitor in their own language.
 */

const STATUS: Record<PrintErrorCode, number> = {
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  NOT_PUBLISHED: 409,
  EMPTY_MENU: 409,
  RENDER_TIMEOUT: 504,
  RENDER_FAILED: 500,
};

/** Nothing produced here may be cached: it is one owner's private document. */
const PRIVATE = "private, no-store";

export function errorResponse(code: PrintErrorCode): Response {
  return Response.json(
    { error: { code } },
    { status: STATUS[code], headers: { "Cache-Control": PRIVATE } },
  );
}

export interface PrintContext {
  menu: MenuDetail;
  plan: PlanId;
  session: SessionCookie;
}

export type ContextResult =
  | { ok: true; value: PrintContext }
  | { ok: false; code: PrintErrorCode };

/**
 * Session, menu and plan for a print request.
 *
 * Ownership is not re-implemented here: `GET /menus/:menuId` already answers
 * 404 for a menu belonging to somebody else, so a stranger's menu and a menu
 * that never existed are the same answer — which is what stops these routes
 * being used to discover which menus exist.
 */
export async function loadPrintContext(menuId: string): Promise<ContextResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTHENTICATED" };

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return { ok: false, code: "UNAUTHENTICATED" };

  const result = await getMenu(menuId);
  if (!result.ok) return { ok: false, code: "NOT_FOUND" };

  return {
    ok: true,
    value: {
      menu: result.data.menu,
      plan: planOf(session.account),
      session: { name: SESSION_COOKIE, value: cookie.value },
    },
  };
}

/** A menu with no dishes has nothing to print. */
export function hasPrintableContent(menu: MenuDetail): boolean {
  return menu.sections.some((section) => section.items.length > 0);
}

export function pdfResponse(document: Buffer, filename: string): Response {
  // A complete buffer, never a stream: a failure half way through must surface
  // as an error the dialog can retry, not as a truncated file in the owner's
  // downloads folder.
  return new Response(new Uint8Array(document), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(document.byteLength),
      "Content-Disposition": contentDisposition(filename),
      "Cache-Control": PRIVATE,
    },
  });
}

export function jpegResponse(image: Buffer): Response {
  return new Response(new Uint8Array(image), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(image.byteLength),
      "Cache-Control": PRIVATE,
    },
  });
}

export type RenderResult =
  | { ok: true; value: Buffer }
  | { ok: false; code: PrintErrorCode };

/**
 * Runs a render and turns anything that goes wrong into a code.
 *
 * A timeout is reported as one, because "it is taking too long" is worth a
 * different message from "it broke". Everything else is logged with its cause —
 * a missing Chromium and an unreachable render origin are the two that will
 * actually happen — and reported as a generic failure, because the owner can do
 * nothing with the detail and it should not leak into a response.
 */
export async function runRender(produce: () => Promise<Buffer>): Promise<RenderResult> {
  try {
    return { ok: true, value: await produce() };
  } catch (error) {
    if (error instanceof RenderTimeoutError) {
      console.error("[print] render timed out", error);
      return { ok: false, code: "RENDER_TIMEOUT" };
    }

    if (error instanceof RenderTargetError) {
      console.error(`[print] the print route answered ${error.status}`, error);
      return { ok: false, code: error.status === 404 ? "NOT_FOUND" : "RENDER_FAILED" };
    }

    console.error("[print] render failed", error);
    return { ok: false, code: "RENDER_FAILED" };
  }
}
