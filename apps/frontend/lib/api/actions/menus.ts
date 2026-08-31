"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "@/i18n/navigation";
import { apiGet, apiRequest } from "../client";
import { IDLE, toFormState, type FormState } from "../form-state";
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
 */

function revalidateEditor(locale: string, menuId: string): void {
  revalidatePath(`/${locale}/workspace/menus/${menuId}`);
  revalidatePath(`/${locale}/workspace`);
}

function priceFromForm(value: FormDataEntryValue | null): number | string {
  const raw = String(value ?? "").trim().replace(",", ".");
  const parsed = Number(raw);
  // Hand a non-number through untouched so the API's validator, not this
  // parser, decides what the message says.
  return raw !== "" && Number.isFinite(parsed) ? parsed : raw;
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
  const { result } = await apiRequest<MenuDetailResponse>("/menus", {
    method: "POST",
    body: { name: String(formData.get("name") ?? "") },
  });

  if (!result.ok) return toFormState(result.error);

  revalidatePath(`/${locale}/workspace`);
  redirect({ href: `/workspace/menus/${result.data.menu.id}`, locale });
  return IDLE;
}

export async function renameMenuAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");

  const { result } = await apiRequest<MenuDetailResponse>(`/menus/${menuId}`, {
    method: "PATCH",
    body: { name: String(formData.get("name") ?? "") },
  });

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return IDLE;
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

  const { result } = await apiRequest<SectionResponse>(`/menus/${menuId}/sections`, {
    method: "POST",
    body: { title: String(formData.get("title") ?? "") },
  });

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return IDLE;
}

export async function renameSectionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");

  const { result } = await apiRequest<SectionResponse>(
    `/menus/${menuId}/sections/${sectionId}`,
    { method: "PATCH", body: { title: String(formData.get("title") ?? "") } },
  );

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return IDLE;
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
  const description = String(formData.get("description") ?? "").trim();

  const { result } = await apiRequest<ItemResponse>(
    `/menus/${menuId}/sections/${sectionId}/items`,
    {
      method: "POST",
      body: {
        name: String(formData.get("name") ?? ""),
        priceCzk: priceFromForm(formData.get("priceCzk")),
        ...(description === "" ? {} : { description }),
      },
    },
  );

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return IDLE;
}

export async function updateItemAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = toLocale(formData.get("locale"));
  const menuId = String(formData.get("menuId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  const { result } = await apiRequest<ItemResponse>(
    `/menus/${menuId}/sections/${sectionId}/items/${itemId}`,
    {
      method: "PATCH",
      body: {
        name: String(formData.get("name") ?? ""),
        priceCzk: priceFromForm(formData.get("priceCzk")),
        // Explicit null clears it; the API distinguishes null from absent.
        description: description === "" ? null : description,
      },
    },
  );

  if (!result.ok) return toFormState(result.error);

  revalidateEditor(locale, menuId);
  return IDLE;
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
