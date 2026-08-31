"use server";

import { revalidatePath } from "next/cache";

import { apiRequest } from "../client";
import { IDLE, toFormState, type FormState } from "../form-state";
import { toLocale } from "../locale";
import type { PublishResponse, UnpublishResponse } from "../types";

/**
 * Publishing is the visibility gate: until it happens the menu has no public
 * address at all. Both actions revalidate the public route as well as the
 * workspace, so the change is visible on the very next request.
 */

function revalidateAll(locale: string, menuId: string, slug: string | null): void {
  revalidatePath(`/${locale}/workspace`);
  revalidatePath(`/${locale}/workspace/menus/${menuId}`);
  if (slug) revalidatePath(`/${locale}/m/${slug}`);
}

export async function publishAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  const { result } = await apiRequest<PublishResponse>(`/menus/${menuId}/publish`, {
    method: "POST",
  });

  if (!result.ok) return toFormState(result.error);

  revalidateAll(locale, menuId, result.data.publicSlug);
  return IDLE;
}

export async function unpublishAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  const { result } = await apiRequest<UnpublishResponse>(`/menus/${menuId}/unpublish`, {
    method: "POST",
  });

  if (!result.ok) return toFormState(result.error);

  revalidateAll(locale, menuId, result.data.publicSlug);
  return IDLE;
}
