"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "@/i18n/navigation";
import {
  readImageUpload,
  readInlineText,
  readItem,
  readVisualVariant,
  type ImageUpload,
} from "@/lib/validation/form-data";
import { apiGet, apiRequest } from "../client";
import { localValidationError, SAVED, toFormState, type FormState } from "../form-state";
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

/**
 * Applies whatever the image field decided, after the dish itself is saved
 * (feature 006).
 *
 * Deliberately a second request rather than a field on the item body: folding a
 * file into the dish PATCH would make every price change a multipart upload and
 * would mix two failure domains in one call.
 *
 * A failure here is reported against the image field alone, because by this
 * point the dish exists and its text is stored. Telling the owner the whole
 * save failed would be untrue, and would invite them to type it all again.
 */
async function applyItemImage(
  upload: ImageUpload,
  path: string,
): Promise<FormState | null> {
  if (upload.kind === "none") return null;

  if (upload.kind === "remove") {
    const { result } = await apiRequest<ItemResponse>(path, { method: "DELETE" });
    return result.ok ? null : imageFailure(result.error);
  }

  const body = new FormData();
  body.set("file", upload.file);
  if (upload.crop) {
    body.set("cropX", String(upload.crop.x));
    body.set("cropY", String(upload.crop.y));
    body.set("cropWidth", String(upload.crop.width));
    body.set("cropHeight", String(upload.crop.height));
  }

  const { result } = await apiRequest<ItemResponse>(path, { method: "PUT", body });
  return result.ok ? null : imageFailure(result.error);
}

/** Puts an API rejection under the image field, whatever it was about. */
function imageFailure(error: Parameters<typeof toFormState>[0]): FormState {
  const state = toFormState(error);
  const code = state.status === "error" ? (state.fields?.file ?? state.fields?.crop) : undefined;
  return localValidationError({ image: code ?? "INVALID" });
}

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

  // Checked before the dish is created, so an unusable file costs no request
  // and never leaves a dish behind that the owner did not mean to keep.
  const image = await readImageUpload(formData);
  if (!image.ok) return image.state;

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

  const failed = await applyItemImage(
    image.values,
    `/menus/${menuId}/sections/${sectionId}/items/${result.data.item.id}/image`,
  );

  revalidateEditor(locale, menuId);
  // The dish is saved either way; only the photograph is in question.
  return failed ?? SAVED;
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

  const image = await readImageUpload(formData);
  if (!image.ok) return image.state;

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

  const failed = await applyItemImage(
    image.values,
    `/menus/${menuId}/sections/${sectionId}/items/${itemId}/image`,
  );
  if (failed) {
    revalidateEditor(locale, menuId);
    return failed;
  }

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
