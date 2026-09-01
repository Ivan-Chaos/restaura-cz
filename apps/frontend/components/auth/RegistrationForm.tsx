"use client";

import { useTranslations } from "next-intl";
import { FormProvider } from "react-hook-form";

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
import { fieldCode, useActionForm, type ServerAction } from "@/hooks/use-action-form";
import { profileFieldPath, signUpFormData } from "@/lib/validation/form-values";
import { signUpFormSchema, type SignUpFormValues } from "@/lib/validation/schemas";

import { ProfileFields } from "./ProfileFields";

export interface RegistrationFormProps {
  /**
   * Injected rather than imported so the component can be rendered in
   * Storybook and tests without pulling a Server Action into the browser
   * bundle.
   */
  action: ServerAction;
  locale: string;
  /** Where to go once registered. Passed through to the action. */
  next?: string;
}

const EMPTY: SignUpFormValues = {
  email: "",
  password: "",
  confirmPassword: "",
  restaurantName: "",
  phones: [{ value: "" }],
  location: "",
};

/**
 * Registration: credentials and the restaurant's identity in one pass.
 *
 * Both halves are on one page rather than in a wizard — an owner who abandons
 * a two-step flow leaves an account that cannot reach anything, which is the
 * exact state this feature exists to remove.
 *
 * That is also why the form must never lose what was typed. It is the longest
 * form in the product, and a rejected email at the end of it used to take the
 * restaurant name, phones and address with it; `useActionForm` is what keeps
 * them. `noValidate` hands validation to us: the browser's own bubbles cannot
 * be translated or styled.
 */
export function RegistrationForm({ action, locale, next }: RegistrationFormProps) {
  const t = useTranslations("Registration");
  const tAuth = useTranslations("Auth");
  const tErrors = useTranslations("Auth.errors");
  const tAuthFields = useTranslations("Auth.fieldErrors");

  const { form, formAction, onSubmit, pending, summary } = useActionForm({
    action,
    schema: signUpFormSchema,
    defaultValues: EMPTY,
    toFormData: (values) => signUpFormData(values, { locale, next }),
    toFieldPath: profileFieldPath,
  });

  const { errors } = form.formState;
  const emailError = fieldCode(errors.email?.message);
  const passwordError = fieldCode(errors.password?.message);
  const confirmError = fieldCode(errors.confirmPassword?.message);

  return (
    <FormProvider {...form}>
      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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
              type="email"
              autoComplete="email"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              {...form.register("email")}
            />
            {emailError ? (
              <FieldError id="email-error">{tAuthFields(emailError)}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={passwordError ? true : undefined}>
            <FieldLabel htmlFor="password">{tAuth("passwordLabel")}</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "password-error" : "password-hint"}
              {...form.register("password")}
            />
            {passwordError ? (
              <FieldError id="password-error">{tAuthFields(passwordError)}</FieldError>
            ) : (
              <FieldDescription id="password-hint">{tAuth("passwordHint")}</FieldDescription>
            )}
          </Field>

          <Field data-invalid={confirmError ? true : undefined}>
            <FieldLabel htmlFor="confirmPassword">{t("confirmPasswordLabel")}</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? "confirmPassword-error" : undefined}
              {...form.register("confirmPassword")}
            />
            {confirmError ? (
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

          <ProfileFields />
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
    </FormProvider>
  );
}
