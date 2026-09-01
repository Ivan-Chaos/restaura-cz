"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldCode, useActionForm, type ServerAction } from "@/hooks/use-action-form";
import { signInFormData } from "@/lib/validation/form-values";
import { signInFormSchema } from "@/lib/validation/schemas";

export interface AuthFormProps {
  /**
   * Injected rather than imported so the component can be rendered in
   * Storybook and tests without pulling a Server Action into the browser
   * bundle.
   */
  action: ServerAction;
  locale: string;
  /** Where to go once signed in. Passed through to the action. */
  next?: string;
}

/**
 * Signing in: email and password, nothing else.
 *
 * Registration used to share this component, and stopped when it grew a
 * restaurant profile — see `RegistrationForm`. Two forms that no longer collect
 * the same things are better apart than behind a mode flag.
 *
 * Validation here is shape only. Nothing in the browser may comment on whether
 * a password is *right*, and nothing may claim a minimum length: an account
 * older than the current rule must still be able to sign in.
 */
export function AuthForm({ action, locale, next }: AuthFormProps) {
  const t = useTranslations("Auth");
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("Auth.fieldErrors");

  const { form, formAction, onSubmit, pending, summary } = useActionForm({
    action,
    schema: signInFormSchema,
    defaultValues: { email: "", password: "" },
    toFormData: (values) => signInFormData(values, { locale, next }),
  });

  const { errors } = form.formState;
  const emailError = fieldCode(errors.email?.message);
  const passwordError = fieldCode(errors.password?.message);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("signInTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("signInSubtitle")}</p>
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
          <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : undefined}
            {...form.register("email")}
          />
          {emailError ? (
            <FieldError id="email-error">{tFields(emailError)}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={passwordError ? true : undefined}>
          <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "password-error" : undefined}
            {...form.register("password")}
          />
          {passwordError ? (
            <FieldError id="password-error">{tFields(passwordError)}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={pending}>
        {pending ? t("pending") : t("signInSubmit")}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="text-foreground underline underline-offset-4">
          {t("signUpLink")}
        </Link>
      </p>
    </form>
  );
}
