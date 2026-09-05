"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { PrintErrorCode } from "@/lib/pdf/errors";
import { filenameFromDisposition } from "@/lib/pdf/filename";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "@/lib/pdf/paper";
import {
  DEFAULT_STICKER_COUNT,
  DEFAULT_STICKERS_PER_PAGE,
  STICKER_COUNT_MAX,
  STICKER_COUNT_MIN,
  STICKERS_PER_PAGE_OPTIONS,
  stickerCountSchema,
  stickerPageCount,
  type StickersPerPage,
} from "@/lib/validation/print";

export type PrintKind = "menu" | "stickers";

export interface PrintDownloadDialogProps {
  kind: PrintKind;
  locale: string;
  menuId: string;
  menuName: string;
  /** Whether the account's plan permits leaving the Restaura line off. */
  canRemoveBranding: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Injected so a story can answer without a server. */
  fetchDocument?: typeof fetch;
  /** Injected so a story can show the preview without rendering one. */
  previewSrcOverride?: string;
}

type PreviewState = "loading" | "ready" | "failed";

/** Long enough that typing a three-digit count is one render, not three. */
const PREVIEW_DEBOUNCE_MS = 400;

/**
 * The download options for one printable document.
 *
 * Three jobs, in the order the owner meets them: choose what the document
 * contains, see what it will look like, and get the file.
 *
 * **The preview is the real document.** It is the first page of the very PDF
 * the Download button produces, rendered by the same pipeline — so what the
 * owner approves is what they receive, pagination and style included.
 *
 * **The download goes through `fetch`, not a navigation.** That is what makes a
 * failure showable: a link would replace the page with whatever went wrong,
 * while here a refusal comes back as a code and becomes a message with a Retry
 * beside it. Without JavaScript the surrounding form still submits as a plain
 * GET, and the handler's `Content-Disposition` makes the browser download it —
 * so the feature degrades rather than disappearing.
 *
 * **Branding is not decided here.** The switch is an option only if the account
 * is entitled to it, and the server decides again from the plan when it
 * renders. This component cannot grant anything.
 */
export function PrintDownloadDialog({
  kind,
  locale,
  menuId,
  menuName,
  canRemoveBranding,
  open,
  onOpenChange,
  fetchDocument,
  previewSrcOverride,
}: PrintDownloadDialogProps) {
  const t = useTranslations("Print");
  const countId = useId();
  const perPageId = useId();
  const brandingId = useId();

  const [count, setCount] = useState(String(DEFAULT_STICKER_COUNT));
  const [perPage, setPerPage] = useState<StickersPerPage>(DEFAULT_STICKERS_PER_PAGE);
  // Off by default: an owner who is entitled to remove the line almost always
  // wants it gone, and the switch is there for the ones who do not mind it.
  const [showBranding, setShowBranding] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<PrintErrorCode | null>(null);

  const needsCount = kind === "stickers";
  const parsedCount = stickerCountSchema.safeParse(count);
  const countValid = !needsCount || parsedCount.success;

  const branding = canRemoveBranding ? showBranding : true;
  const basePath = `/api/print/${kind}/${menuId}`;

  const query = useMemo(() => {
    const params = new URLSearchParams({ locale, branding: branding ? "1" : "0" });
    if (needsCount && parsedCount.success) {
      params.set("count", String(parsedCount.data));
      params.set("perPage", String(perPage));
    }
    return params.toString();
  }, [locale, branding, needsCount, parsedCount.success, parsedCount.data, perPage]);

  const documentUrl = `${basePath}?${query}`;
  const previewUrl = `${basePath}/preview?${query}`;

  const [previewState, setPreviewState] = useState<PreviewState>("loading");
  const [previewSrc, setPreviewSrc] = useState<string | null>(previewSrcOverride ?? null);

  // Debounced: retyping a count should cost one render, not one per keystroke.
  // Nothing is requested while the dialog is closed or the count is invalid.
  useEffect(() => {
    if (previewSrcOverride) return;
    if (!open || !countValid) return;

    const timer = setTimeout(() => {
      setPreviewState("loading");
      setPreviewSrc(previewUrl);
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [open, countValid, previewUrl, previewSrcOverride]);

  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!countValid || pending) return;

    setPending(true);
    setErrorCode(null);

    try {
      const response = await (fetchDocument ?? fetch)(documentUrl);

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setErrorCode(readErrorCode(body));
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filenameFromDisposition(
        response.headers.get("content-disposition"),
        `${menuName}.pdf`,
      );
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success(t("downloaded"));
      onOpenChange(false);
    } catch {
      // A dropped connection is not the owner's fault and not a validation
      // problem; it reads the same as any other failure to produce the file.
      setErrorCode("RENDER_FAILED");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`dialogTitle.${kind}`)}</DialogTitle>
          <DialogDescription>{t(`dialogDescription.${kind}`)}</DialogDescription>
        </DialogHeader>

        <form id={`${countId}-form`} method="get" action={basePath} onSubmit={download}>
          {/* Carried as fields, not only in the action URL, so the plain GET
              submit a browser without JavaScript performs sends them too. */}
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="branding" value={branding ? "1" : "0"} />

          <div className="flex flex-col gap-4">
            {needsCount ? (
              <Field>
                <FieldLabel htmlFor={countId}>{t("countLabel")}</FieldLabel>
                <Input
                  id={countId}
                  name="count"
                  type="number"
                  inputMode="numeric"
                  min={STICKER_COUNT_MIN}
                  max={STICKER_COUNT_MAX}
                  step={1}
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  aria-invalid={!countValid}
                  aria-describedby={`${countId}-hint`}
                />
                {countValid ? (
                  <FieldDescription id={`${countId}-hint`}>{t("countHint")}</FieldDescription>
                ) : (
                  <FieldError id={`${countId}-hint`}>{t("countInvalid")}</FieldError>
                )}
              </Field>
            ) : null}

            {needsCount ? (
              <Field>
                <FieldLabel htmlFor={perPageId}>{t("perPageLabel")}</FieldLabel>
                <Select
                  value={String(perPage)}
                  onValueChange={(next) => setPerPage(Number(next) as StickersPerPage)}
                >
                  <SelectTrigger id={perPageId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STICKERS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {t("perPageOption", { count: option })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* The sheet count is the thing the owner is actually deciding:
                    fewer, larger stickers or more, smaller ones. */}
                <FieldDescription>
                  {parsedCount.success
                    ? t("perPageHint", { sheets: stickerPageCount(parsedCount.data, perPage) })
                    : t("perPageHintPlain")}
                </FieldDescription>
                {/* Carried for the no-JavaScript submit, like the others. */}
                <input type="hidden" name="perPage" value={String(perPage)} />
              </Field>
            ) : null}

            {canRemoveBranding ? (
              <Field orientation="horizontal">
                <Switch
                  id={brandingId}
                  checked={showBranding}
                  onCheckedChange={setShowBranding}
                />
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor={brandingId}>{t("brandingLabel")}</FieldLabel>
                  <FieldDescription>{t("brandingHint")}</FieldDescription>
                </div>
              </Field>
            ) : null}

            <PrintPreview
              alt={t("previewAlt")}
              loadingLabel={t("previewLoading")}
              unavailableLabel={t("previewUnavailable")}
              src={countValid ? previewSrc : null}
              state={previewState}
              onLoaded={() => setPreviewState("ready")}
              onFailed={() => setPreviewState("failed")}
            />

            {errorCode ? (
              <div role="alert" className="flex flex-col gap-2">
                <p className="text-destructive text-sm">{t(`errors.${errorCode}`)}</p>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={pending}
                >
                  {t("retry")}
                </Button>
              </div>
            ) : null}

            {/* Announced rather than only shown: producing a document takes
                seconds, and a screen-reader user gets no visual spinner. */}
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {pending ? t("preparing") : ""}
            </p>
          </div>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
          <Button type="submit" form={`${countId}-form`} disabled={pending || !countValid}>
            {t("download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PrintPreviewProps {
  src: string | null;
  state: PreviewState;
  alt: string;
  loadingLabel: string;
  unavailableLabel: string;
  onLoaded: () => void;
  onFailed: () => void;
}

/**
 * The first page, at A4 proportions.
 *
 * The intrinsic dimensions give the box its shape before any bytes arrive, so
 * the dialog does not jump when the image lands. A preview that cannot be
 * produced is a notice, never a blocker: the document itself may still be fine,
 * and refusing to let the owner try would be the worse failure.
 */
function PrintPreview({
  src,
  state,
  alt,
  loadingLabel,
  unavailableLabel,
  onLoaded,
  onFailed,
}: PrintPreviewProps) {
  if (state === "failed") {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        {unavailableLabel}
      </p>
    );
  }

  return (
    <div className="relative">
      {src ? (
        // Not `next/image`: this is a one-off, per-request render of the owner's
        // own document, so there is nothing for the optimiser to cache and no
        // second size to serve.
        // eslint-disable-next-line @next/next/no-img-element -- see above
        <img
          key={src}
          src={src}
          alt={alt}
          width={A4_WIDTH_PX}
          height={A4_HEIGHT_PX}
          draggable={false}
          onLoad={onLoaded}
          onError={onFailed}
          className="border-border h-auto w-full rounded-md border"
        />
      ) : null}

      {state === "loading" ? (
        <Skeleton
          aria-label={loadingLabel}
          className="absolute inset-0 size-full rounded-md"
        />
      ) : null}
    </div>
  );
}

/** The handlers answer `{ error: { code } }`; anything else is a generic failure. */
function readErrorCode(body: unknown): PrintErrorCode {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "object" &&
    (body as { error: unknown }).error !== null
  ) {
    const code = (body as { error: { code?: unknown } }).error.code;
    if (typeof code === "string") return code as PrintErrorCode;
  }
  return "RENDER_FAILED";
}
