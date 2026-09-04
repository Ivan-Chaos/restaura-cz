"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field";
import type { FieldErrorCode } from "@/lib/api/types";
import type { ImageModel } from "@/lib/design-system/types";
import {
  ACCEPT_ATTRIBUTE,
  validateImageFile,
  type CropRect,
  type PendingImage,
} from "@/lib/validation/image";
import { cn } from "@/lib/utils";

/**
 * The crop tool is the one heavy thing this feature adds, so it is fetched only
 * when an owner actually chooses a file — never as part of the editor's initial
 * load, and never on a guest route.
 */
const ImageCropDialog = dynamic(
  () => import("./ImageCropDialog").then((module) => module.ImageCropDialog),
  { ssr: false },
);

export interface ImageFieldProps {
  /** Sets the crop frame and the wording. */
  kind: "logo" | "dish";
  /** What is stored today, or null. */
  current: ImageModel | null;
  /** Reports what should happen to the image on the next save. */
  onChange: (next: PendingImage) => void;
  /**
   * The field's own label. Supplied by the host rather than looked up here,
   * because "Photo" belongs to the dish editor's vocabulary and "Logo" to the
   * settings page's, and this component belongs to neither.
   */
  label: string;
  /** Alt text for the preview: the dish name, or the restaurant name. */
  previewAlt: string;
  /** Unique on the page, so the label and error point at the right control. */
  idPrefix: string;
  /** A code the server rejected the image with, if any. */
  error?: FieldErrorCode | "INVALID";
  disabled?: boolean;
  /** Which translation namespace supplies the field-error wording. */
  errorNamespace?: "MenuEditor" | "Settings";
  /**
   * Replaces the built-in Remove button.
   *
   * The logo needs a confirmation before it is destroyed — removing it saves
   * immediately, so there is no later Save to reconsider at — while a dish
   * photo does not, because nothing happens until the dish is saved. Rather
   * than teach this component about dialogs, the host supplies the control it
   * wants and this one keeps its own out of the way.
   */
  removeSlot?: ReactNode;
  className?: string;
}

const ASPECT: Record<"logo" | "dish", number> = { logo: 1, dish: 4 / 3 };

/**
 * Choosing, framing, replacing and removing one image.
 *
 * Shared by the logo in settings and the photo on a dish, because the two are
 * the same interaction: pick a file, arrange it in a fixed frame, confirm. One
 * component means an owner learns it once, and means a fix lands in both
 * places.
 *
 * The file is checked here before anything else happens — size, and type by its
 * leading bytes rather than by its name. That is what makes an invalid file
 * cost nothing: no upload starts, and the owner is told immediately. The API
 * repeats the check, because a browser is never the authority on anything.
 *
 * Nothing is uploaded when the owner confirms a framing. The chosen file lives
 * in the parent's state until the form is saved, so abandoning the form leaves
 * no orphaned object in storage — the reason this feature needs no cleanup job
 * for the ordinary case.
 */
export function ImageField({
  kind,
  current,
  onChange,
  label,
  previewAlt,
  idPrefix,
  error,
  disabled,
  errorNamespace = "MenuEditor",
  removeSlot,
  className,
}: ImageFieldProps) {
  const t = useTranslations("ImageField");
  const tErrors = useTranslations(`${errorNamespace}.fieldErrors`);

  const inputRef = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<File | null>(null);
  const [pending, setPending] = useState<PendingImage>({ kind: "keep" });
  const [localError, setLocalError] = useState<FieldErrorCode | null>(null);

  /**
   * The preview URL this field currently owns.
   *
   * Held in a ref and released either when it is replaced or when the field
   * unmounts — deliberately *not* in an effect keyed on the URL itself. React
   * runs effects twice in development, so such an effect revokes the URL
   * immediately after it is created and the preview shows nothing at all. A ref
   * is read at teardown rather than captured at setup, so the double run is
   * harmless: at mount there is no URL yet, and by real unmount it holds
   * whatever is actually on screen.
   */
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const previewUrl = pending.kind === "replace" ? pending.previewUrl : null;

  const shownError = localError ?? error;
  const isLogo = kind === "logo";

  async function choose(file: File | undefined) {
    // Chosen and then cancelled in the OS picker: nothing to do.
    if (!file) return;

    const problem = await validateImageFile(file);
    if (problem) {
      // Refused before a single byte is uploaded, which is the whole point of
      // checking here as well as at the API.
      setLocalError(problem);
      setChosen(null);
      return;
    }

    setLocalError(null);
    setChosen(file);
  }

  function confirmCrop(crop: CropRect) {
    if (!chosen) return;

    // The one this replaces is released here rather than in an effect, so a
    // session of trying several images leaves at most one live URL behind.
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

    const previewUrl = URL.createObjectURL(chosen);
    previewUrlRef.current = previewUrl;

    const next: PendingImage = { kind: "replace", file: chosen, crop, previewUrl };
    setPending(next);
    setChosen(null);
    onChange(next);
  }

  function remove() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPending({ kind: "remove" });
    setLocalError(null);
    onChange({ kind: "remove" });
  }

  function openPicker() {
    // The input is hidden for styling, so the button is what the owner (and the
    // keyboard, and the screen reader) actually operates.
    inputRef.current?.click();
  }

  const showsImage = pending.kind === "replace" || (pending.kind !== "remove" && current !== null);
  const previewSrc = pending.kind === "replace" ? previewUrl : current?.src;

  return (
    <Field
      className={cn("gap-2", className)}
      data-slot="image-field"
      data-invalid={shownError ? true : undefined}
    >
      <FieldTitle id={`${idPrefix}-label`}>{label}</FieldTitle>

      <input
        ref={inputRef}
        type="file"
        name="image"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        className="sr-only"
        aria-labelledby={`${idPrefix}-label`}
        aria-describedby={shownError ? `${idPrefix}-error` : `${idPrefix}-hint`}
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          // Cleared so choosing the same file twice in a row still fires a
          // change event — otherwise a second attempt after an error is silent.
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        {showsImage && previewSrc ? (
          <span
            className={cn(
              "bg-muted relative block shrink-0 overflow-hidden rounded-lg",
              // 20:15 is 4:3 on the spacing scale, so the preview matches the
              // stored rendition's shape without an arbitrary value — and still
              // retunes with `--density` like every other box.
              isLogo ? "size-20" : "h-15 w-20",
            )}
          >
            {pending.kind === "replace" ? (
              // A blob URL has no dimensions the optimiser could use, and it is
              // local to this browser, so a plain img is the honest element.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt={t("newPhoto")}
                className="size-full object-cover"
                data-slot="image-field-preview"
              />
            ) : (
              <Image
                src={previewSrc}
                alt={previewAlt}
                fill
                sizes={isLogo ? "80px" : "86px"}
                className="object-cover"
                data-slot="image-field-preview"
              />
            )}
          </span>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={disabled}>
            {showsImage ? <RefreshCw aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
            {showsImage
              ? isLogo
                ? t("changeLogo")
                : t("changePhoto")
              : isLogo
                ? t("uploadLogo")
                : t("addPhoto")}
          </Button>

          {showsImage ? (
            (removeSlot ?? (
              <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={disabled}>
                <Trash2 aria-hidden="true" />
                {isLogo ? t("removeLogo") : t("removePhoto")}
              </Button>
            ))
          ) : null}
        </div>
      </div>

      {/*
        Announced rather than merely shown: confirming a framing changes nothing
        visible except a small preview, and an owner using a screen reader needs
        to know the choice registered.
      */}
      <p role="status" className="sr-only">
        {pending.kind === "replace"
          ? isLogo
            ? t("pendingLogo")
            : t("pendingPhoto")
          : pending.kind === "remove"
            ? t("removedPending")
            : ""}
      </p>

      {shownError ? (
        <FieldError id={`${idPrefix}-error`}>{tErrors(shownError)}</FieldError>
      ) : (
        <FieldDescription id={`${idPrefix}-hint`}>{t("hint")}</FieldDescription>
      )}

      {chosen ? (
        <ImageCropDialog
          // Keyed on the file, so choosing a different image gives the dialog
          // fresh state rather than the previous image's zoom and position.
          key={`${chosen.name}-${chosen.size}-${chosen.lastModified}`}
          open
          file={chosen}
          kind={kind}
          aspect={ASPECT[kind]}
          onConfirm={confirmCrop}
          onCancel={() => setChosen(null)}
        />
      ) : null}
    </Field>
  );
}
