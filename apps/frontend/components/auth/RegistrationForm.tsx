"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { IDLE, type FormState } from "@/lib/api/form-state";

import { ProfileFields } from "./ProfileFields";

export interface RegistrationFormProps {
  /**
   * Injected rather than imported so the component can be rendered in
   * Storybook and tests without pulling a Server Action into the browser
   * bundle.
   */
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  locale: string;
  /** Where to go once registered. Passed through to the action. */
  next?: string;
}

/**
 * Registration: credentials and the restaurant's identity in one pass.
 *
 * Both halves are on one page rather than in a wizard — an owner who abandons
 * a two-step flow leaves an account that cannot reach anything, which is the
 * exact state this feature exists to remove.
 *
 * `noValidate` hands validation to us: the browser's own bubbles cannot be
 * translated or styled, and the Server Action re-checks everything anyway.
 */
export function RegistrationForm({ action, locale, next }: RegistrationFormProps) {
  const t = useTranslations("Registration");
  const tAuth = useTranslations("Auth");
  const tErrors = useTranslations("Auth.errors");
  const tAuthFields = useTranslations("Auth.fieldErrors");
  const [state, formAction, pending] = useActionState(action, IDLE);

  /**
   * Checked here as the owner types *and* again in the action. This copy is
   * the fast feedback; the action's copy is the one that actually gates
   * submission, so a visitor without client JavaScript is still protected.
   */
  const [mismatch, setMismatch] = useState(false);

  const fields = state.status === "error" ? state.fields : undefined;
  const emailError = fields?.email;
  const passwordError = fields?.password;
  const confirmError = fields?.confirmPassword;
  // A summary only when nothing is pinned to a specific input; otherwise the
  // same problem would be reported twice.
  const summary = state.status === "error" && !fields ? state.code : undefined;

  function checkMatch(form: HTMLFormElement | null) {
    if (!form) return;
    const password = new FormData(form).get("password");
    const confirm = new FormData(form).get("confirmPassword");
    setMismatch(confirm !== "" && password !== confirm);
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {summary ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {tErrors(summary)}
        </p>
      ) : null}

      <FieldGroup>
        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor="email">{tAuth("emailLabel")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError ? (
            <FieldError id="email-error">{tAuthFields(emailError)}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={passwordError ? true : undefined}>
          <FieldLabel htmlFor="password">{tAuth("passwordLabel")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            onBlur={(event) => checkMatch(event.currentTarget.form)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "password-error" : "password-hint"}
          />
          {passwordError ? (
            <FieldError id="password-error">{tAuthFields(passwordError)}</FieldError>
          ) : (
            <FieldDescription id="password-hint">{tAuth("passwordHint")}</FieldDescription>
          )}
        </Field>

        <Field data-invalid={mismatch || confirmError ? true : undefined}>
          <FieldLabel htmlFor="confirmPassword">{t("confirmPasswordLabel")}</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            onBlur={(event) => checkMatch(event.currentTarget.form)}
            aria-invalid={mismatch || confirmError ? true : undefined}
            aria-describedby={mismatch || confirmError ? "confirmPassword-error" : undefined}
          />
          {mismatch || confirmError ? (
            <FieldError id="confirmPassword-error">{t("passwordMismatch")}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-base font-medium">{t("restaurantHeading")}</h2>
          <p className="text-muted-foreground text-sm">{t("restaurantHint")}</p>
        </div>

        <ProfileFields fields={fields} />
      </FieldGroup>

      <Button type="submit" disabled={pending}>
        {pending ? tAuth("pending") : t("submit")}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {tAuth("haveAccount")}{" "}
        <Link href="/sign-in" className="text-foreground underline underline-offset-4">
          {tAuth("signInLink")}
        </Link>
      </p>
    </form>
  );
}
