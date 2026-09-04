"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ImageField } from "@/components/workspace/ImageField";
import { FieldError } from "@/components/ui/field";
import { IDLE, type FormState } from "@/lib/api/form-state";
import type { ImageRef } from "@/lib/api/types";
import { toImageModel } from "@/lib/menu-display/adapter";
import { logoFormData } from "@/lib/validation/form-values";
import type { PendingImage } from "@/lib/validation/image";

import { ConfirmDialog } from "@/components/workspace/ConfirmDialog";

export interface LogoFieldProps {
  logo: ImageRef | null;
  restaurantName: string;
  uploadAction: (state: FormState, formData: FormData) => Promise<FormState>;
  removeAction: (formData: FormData) => Promise<void>;
  locale: string;
}

/**
 * The restaurant's logo, on the settings page.
 *
 * Unlike the details form beside it, this saves the moment a framing is
 * confirmed. That is deliberate: positioning a mark inside a square *is* the
 * decision, and asking an owner to then find a Save button elsewhere on the
 * page would be a second, invisible step. The details form keeps its Save
 * because typing a name is not finished until the typing stops.
 *
 * Removal goes through a confirmation, because it is the one action here that
 * destroys something: the stored image is gone, and only re-uploading brings a
 * logo back.
 */
export function LogoField({
  logo,
  restaurantName,
  uploadAction,
  removeAction,
  locale,
}: LogoFieldProps) {
  const t = useTranslations("Settings");
  const tErrors = useTranslations("Auth.errors");
  const tCommon = useTranslations("MenuEditor");

  const [state, submit, pending] = useActionState(uploadAction, IDLE);

  // Announced on the falling edge of `pending`, never on the identity of
  // `state`: two identical outcomes in a row are still two saves.
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    if (state.status === "success") toast.success(t("logoSaved"));
  }, [pending, state, t]);

  function onChange(next: PendingImage) {
    // A removal is handled by the confirmation dialog's own form, so nothing to
    // do here; `keep` is the resting state and equally uninteresting.
    if (next.kind !== "replace") return;

    startTransition(() => {
      submit(logoFormData(next.file, next.crop, { locale }));
    });
  }

  const fieldError = state.status === "error" ? state.fields?.image : undefined;
  const summary = state.status === "error" && !state.fields ? state.code : undefined;

  return (
    <section aria-labelledby="logo-heading" className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="logo-heading" className="text-base font-medium">
          {t("logoSection")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("logoDescription")}</p>
      </div>

      <ImageField
        /*
          Keyed on the stored logo, so a completed save hands the field fresh
          state. Without this it would go on showing the local preview of the
          file that was picked — correct pixels, but described as "the image you
          chose" rather than as the restaurant's logo, and never replaced by the
          optimised version now sitting in storage.

          A dish photo needs no such key: nothing is stored until the dish is
          saved, so its `current` does not move underneath it.
        */
        key={logo?.url ?? "no-logo"}
        kind="logo"
        current={toImageModel(logo, restaurantName) ?? null}
        label={t("logoSection")}
        previewAlt={restaurantName}
        idPrefix="settings-logo"
        errorNamespace="Settings"
        error={fieldError}
        disabled={pending}
        onChange={onChange}
        // Removing a logo saves at once, so there is no later Save at which to
        // reconsider — hence the question, in place of the field's own button.
        removeSlot={
          <ConfirmDialog
            triggerLabel={t("removeLogoConfirm")}
            title={t("removeLogoTitle")}
            description={t("removeLogoBody")}
            confirmLabel={t("removeLogoConfirm")}
            cancelLabel={tCommon("cancel")}
            action={removeAction}
            hidden={{ locale }}
          />
        }
      />

      {summary ? <FieldError>{tErrors(summary)}</FieldError> : null}

      {/* A quiet success is not a silent one, for anyone not watching the toast. */}
      <p role="status" className="sr-only">
        {pending ? t("saving") : state.status === "success" ? t("logoSaved") : ""}
      </p>
    </section>
  );
}
