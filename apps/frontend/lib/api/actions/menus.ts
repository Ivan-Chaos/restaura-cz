"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "@/i18n/navigation";
import { readInlineText, readItem, readVisualVariant } from "@/lib/validation/form-data";
import { apiGet, apiRequest } from "../client";
import { SAVED, toFormState, type FormState } from "../form-state";
import { toLocale } from "../locale";
import type {
  ItemResponse,
  MenuDetailResponse,
  MenuListResponse,
  SectionResponse,
} from "../types";

/**
 * Server Actions for the workspace. Each returns a FormState the form renders,
 * and revalidates the editor so the next render shows what was just saved.
 *
 * Every action that carries typed input validates it through the same schema
 * the browser used, before spending a request on it. That is not a duplicate
 * check: with client JavaScript this is the second opinion, and without it this
 * is the only one, so the rules have to live somewhere both paths reach.
 */

function revalidateEditor(locale: string, menuId: string): void {
  revalidatePath(`/${locale}/workspace/menus/${menuId}`);
  revalidatePath(`/${locale}/workspace`);
}

// ----------------------------------------------------------------- menus

export async function listMenus() {
  return apiGet<MenuListResponse>("/menus");
}

export async function getMenu(menuId: string) {
  return apiGet<MenuDetailResponse>(`/menus/${menuId}`);
}

export async function createMenuAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));

  const parsed = readInlineText(formData, "name");
  if (!parsed.ok) return parsed.state;

  const { result } = await apiRequest<MenuDetailResponse>("/menus", {
    method: "POST",
    body: { name: parsed.values.name },
  });

  if (!result.ok) return toFormState(result.error);

  revalidatePath(`/${locale}/workspace`);
  redirect({ href: `/workspace/menus/${result.data.menu.id}`, locale });
  return SAVED;
}

export async function renameMenuAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  const parsed = readInlineText(formData, "name");
  if (!parsed.ok) return parsed.state;

  const { result } = await apiRequest<MenuDetailResponse>(`/menus/${menuId}`, {
    method: "PATCH",
    body: { name: parsed.values.name },
  });

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return SAVED;
}

/**
 * The visual style (feature 005). Validated against the catalogue first, so an
 * id the frontend does not know never costs a request; revalidates the public
 * address too, so a guest's next load carries the new look even if the page
 * ever stops being force-dynamic.
 */
export async function setVisualVariantAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  const parsed = readVisualVariant(formData);
  if (!parsed.ok) return parsed.state;

  const { result } = await apiRequest<MenuDetailResponse>(`/menus/${menuId}`, {
    method: "PATCH",
    body: { visualVariant: parsed.values.visualVariant },
  });

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  const slug = result.data.menu.publicSlug;
  if (slug) revalidatePath(`/${locale}/m/${slug}`);
  return SAVED;
}

export async function deleteMenuAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  await apiRequest<void>(`/menus/${menuId}`, { method: "DELETE" });

  revalidatePath(`/${locale}/workspace`);
  redirect({ href: "/workspace", locale });
}

// -------------------------------------------------------------- sections

export async function addSectionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  const parsed = readInlineText(formData, "title");
  if (!parsed.ok) return parsed.state;

  const { result } = await apiRequest<SectionResponse>(`/menus/${menuId}/sections`, {
    method: "POST",
    body: { title: parsed.values.title },
  });

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return SAVED;
}

export async function renameSectionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");

  const parsed = readInlineText(formData, "title");
  if (!parsed.ok) return parsed.state;

  const { result } = await apiRequest<SectionResponse>(
    `/menus/${menuId}/sections/${sectionId}`,
    { method: "PATCH", body: { title: parsed.values.title } },
  );

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return SAVED;
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const position = Number(formData.get("position") ?? 0);

  await apiRequest<SectionResponse>(`/menus/${menuId}/sections/${sectionId}`, {
    method: "PATCH",
    body: { position },
  });

  revalidateEditor(locale, menuId);
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");

  await apiRequest<void>(`/menus/${menuId}/sections/${sectionId}`, { method: "DELETE" });

  revalidateEditor(locale, menuId);
}

// ----------------------------------------------------------------- items

export async function addItemAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");

  const parsed = readItem(formData);
  if (!parsed.ok) return parsed.state;
  const { name, description, priceCzk } = parsed.values;

  const { result } = await apiRequest<ItemResponse>(
    `/menus/${menuId}/sections/${sectionId}/items`,
    {
      method: "POST",
      body: {
        name,
        priceCzk,
        // Absent rather than empty: a dish with no description does not have a
        // blank one.
        ...(description === "" ? {} : { description }),
      },
    },
  );

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return SAVED;
}

export async function updateItemAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  const parsed = readItem(formData);
  if (!parsed.ok) return parsed.state;
  const { name, description, priceCzk } = parsed.values;

  const { result } = await apiRequest<ItemResponse>(
    `/menus/${menuId}/sections/${sectionId}/items/${itemId}`,
    {
      method: "PATCH",
      body: {
        name,
        priceCzk,
        // Explicit null clears it; the API distinguishes null from absent.
        description: description === "" ? null : description,
      },
    },
  );

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return SAVED;
}

export async function duplicateItemAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  await apiRequest<ItemResponse>(
    `/menus/${menuId}/sections/${sectionId}/items/${itemId}/duplicate`,
    { method: "POST" },
  );

  revalidateEditor(locale, menuId);
}

export async function moveItemAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const position = Number(formData.get("position") ?? 0);

  await apiRequest<ItemResponse>(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`, {
    method: "PATCH",
    body: { position },
  });

  revalidateEditor(locale, menuId);
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  await apiRequest<void>(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`, {
    method: "DELETE",
  });

  revalidateEditor(locale, menuId);
}
