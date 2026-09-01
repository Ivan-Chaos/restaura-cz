"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { fieldCode, useActionForm, type ServerAction } from "@/hooks/use-action-form";
import { IDLE } from "@/lib/api/form-state";
import { verifyCodeFormData } from "@/lib/validation/form-values";
import { verifyCodeFormSchema } from "@/lib/validation/schemas";

/** Matches RESEND_COOLDOWN_MS in `apps/api/src/auth/email-confirmation.ts`. */
const RESEND_COOLDOWN_SECONDS = 60;

const CODE_LENGTH = 6;

export interface VerifyEmailFormProps {
  /**
   * Injected rather than imported so the component can be rendered in
   * Storybook and tests without pulling a Server Action into the browser
   * bundle.
   */
  action: ServerAction;
  /** Sends a fresh code. Stays on the page, so it gets its own form. */
  resendAction: ServerAction;
  /** Signs out, for an owner who typed the wrong address and needs to start over. */
  signOutAction: (formData: FormData) => Promise<void>;
  /** Shown so the owner can check the address before hunting for the email. */
  email: string;
  locale: string;
  /** Where to go once confirmed. Passed through to the action. */
  next?: string;
}

/**
 * The confirmation step: six digits from an email.
 *
 * Two forms, not one. Confirming navigates away and resending must not, so a
 * single form with two submit buttons would need the action to decide which
 * happened and would put a successful resend and a failed code in the same
 * piece of state. Separate submissions keep each outcome describable on its own.
 *
 * A wrong code is reported at form level rather than under the input: there is
 * only one field, so pinning it there would say the same thing twice.
 */
export function VerifyEmailForm({
  action,
  resendAction,
  signOutAction,
  email,
  locale,
  next,
}: VerifyEmailFormProps) {
  const t = useTranslations("VerifyEmail");
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("Auth.fieldErrors");

  const { form, formAction, onSubmit, pending, state, summary } = useActionForm({
    action,
    schema: verifyCodeFormSchema,
    defaultValues: { code: "" },
    toFormData: (values) => verifyCodeFormData(values, { locale, next }),
  });

  const [resendState, resendFormAction, resending] = useActionState(resendAction, IDLE);

  /**
   * Started on mount, because a code was just sent — by registering, or by the
   * resend that brought this state about. The countdown is a courtesy that
   * mirrors the API's rule; the API enforces it either way.
   */
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  /**
   * A fresh code restarts the wait, and a rejected code is cleared from the
   * field. Both are adjusted during render rather than in an effect — the value
   * derives from a change in something else, which React recommends deriving
   * over synchronising.
   *
   * Clearing matters more than it looks: the six slots are at their maxLength
   * when full, so leaving a rejected code in place means the owner's attempt to
   * type the right one goes nowhere and the form looks broken.
   */
  const [seen, setSeen] = useState({ attempt: state, resend: resendState });
  if (seen.attempt !== state || seen.resend !== resendState) {
    setSeen({ attempt: state, resend: resendState });
    if (state !== seen.attempt && state.status === "error") form.setValue("code", "");
    if (resendState !== seen.resend && resendState.status === "success") {
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  const codeError = fieldCode(form.formState.errors.code?.message);
  const resendError = resendState.status === "error" ? resendState.code : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle", { email })}</p>
      </div>

      {summary ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {tErrors(summary)}
        </p>
      ) : null}

      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field data-invalid={codeError ? true : undefined}>
          <FieldLabel htmlFor="code">{t("codeLabel")}</FieldLabel>
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <InputOTP
                id="code"
                name="code"
                maxLength={CODE_LENGTH}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                // Digits only: the code is numeric, and a keyboard that offers
                // letters invites a typo the form then has to reject.
                inputMode="numeric"
                pattern="[0-9]*"
                // Lets a phone offer the code straight from the email banner.
                autoComplete="one-time-code"
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? "code-error" : "code-hint"}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                {/* Grouped three and three: six undivided boxes are markedly
                    harder to check against an email than two triples. */}
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {codeError ? (
            <FieldError id="code-error">{tFields(codeError)}</FieldError>
          ) : (
            <FieldDescription id="code-hint">{t("hint")}</FieldDescription>
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? t("pending") : t("submit")}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <form action={resendFormAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={resending || cooldown > 0}
          >
            {cooldown > 0 ? t("resendCountdown", { seconds: cooldown }) : t("resend")}
          </Button>
        </form>

        {resendState.status === "success" ? (
          <p role="status" className="text-muted-foreground text-center text-sm">
            {t("resent")}
          </p>
        ) : null}
        {resendError ? (
          <p role="alert" className="text-destructive text-center text-sm">
            {tErrors(resendError)}
          </p>
        ) : null}
      </div>

      <form action={signOutAction} className="text-center">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          {t("wrongAddress")}
        </button>
      </form>
    </div>
  );
}
