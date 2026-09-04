"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toWholePixels, type CropRect } from "@/lib/validation/image";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.01;

export interface ImageCropDialogProps {
  open: boolean;
  /** The chosen file. Null while nothing is being adjusted. */
  file: File | null;
  /** 1 for a logo, 4/3 for a dish photo. */
  aspect: number;
  kind: "logo" | "dish";
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}

/**
 * Where an owner decides what part of their image is shown.
 *
 * The frame is fixed to the aspect the rendition will be stored at, so what the
 * owner arranges here is exactly what guests see — there is no second cropping
 * decision made later on their behalf.
 *
 * Nothing is uploaded from this dialog. It reports a rectangle in **source
 * pixels**, and the file plus those four numbers travel together when the form
 * is saved. That is what makes cancelling free: no bytes have left the device,
 * so there is nothing to clean up.
 *
 * The rectangle is in *oriented* pixels — the browser applies EXIF rotation
 * when it displays an image, so the coordinates below are already in the space
 * the API measures after calling `.rotate()`. The two agree by construction
 * rather than by conversion.
 */
export function ImageCropDialog({
  open,
  file,
  aspect,
  kind,
  onConfirm,
  onCancel,
}: ImageCropDialogProps) {
  const t = useTranslations("ImageCrop");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);

  /**
   * An object URL rather than a data URL: it costs no encoding pass and no copy
   * of a 10 MB file in a string.
   *
   * Created *and* revoked inside one effect, which is not a style preference.
   * React runs effects twice in development — mount, clean up, mount again — so
   * a URL created in `useMemo` and revoked in a cleanup is revoked on that first
   * teardown and never recreated, because the memo's dependencies have not
   * changed. The `<img>` is then pointing at a dead blob: it reports
   * `naturalWidth: 0`, the cropper cannot measure it, and no framing exists.
   * That is precisely the bug this shape prevents — each effect run owns the URL
   * it created and releases only that one.
   */
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL and its lifetime are one external resource; creating it in render would leak it, and revoking it anywhere else revokes one this effect does not own
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A new file starts from a clean framing rather than inheriting the last
  // one's zoom. That is handled by remounting rather than by resetting state in
  // an effect: `ImageField` keys this component on the chosen file, so React
  // discards the old state instead of the component having to undo it.

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  function confirm() {
    if (!area) return;

    // A rectangle the cropper could not measure is refused rather than rounded
    // into something uploadable. Leaving the dialog open is the honest outcome:
    // there is no framing to save, and storing one pixel stretched to fill the
    // frame would look like the feature working.
    const rect = toWholePixels(area);
    if (!rect) return;

    onConfirm(rect);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{kind === "logo" ? t("titleLogo") : t("titlePhoto")}</DialogTitle>
          <DialogDescription>{t("instructions")}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative h-72 w-full overflow-hidden rounded-lg">
          {imageUrl ? (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              // Keeps the image covering the frame at every position, so the
              // owner can never arrange a framing with empty space in it.
              restrictPosition
              zoomWithScroll
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              // The cropper's own container listens for arrow keys, which is
              // what makes the framing reachable without a pointer.
              keyboardStep={8}
            />
          ) : (
            <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {t("loading")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/*
            `aria-labelledby` rather than a `htmlFor` pairing: the slider's
            focusable element is an input Base UI renders inside its thumb, with
            an id this component never sees. The root forwards this id down to
            that input, which is the only way to give the control an accessible
            name without editing the generated primitive.
          */}
          <span id="image-crop-zoom-label" className="text-sm font-medium">
            {t("zoom")}
          </span>
          <Slider
            aria-labelledby="image-crop-zoom-label"
            className="flex-1"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            // An array of one, not a bare number: the primitive renders a thumb
            // per value and falls back to `[min, max]` — two thumbs — when it
            // is given something that is not an array.
            value={[zoom]}
            onValueChange={(next) => setZoom(Array.isArray(next) ? (next[0] ?? MIN_ZOOM) : next)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={confirm} disabled={!area || toWholePixels(area) === null}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCropDialog;
