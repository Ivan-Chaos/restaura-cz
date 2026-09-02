import type {
  InlineTextField,
  MenuItemFormValues,
  ProfileFormValues,
  SignInFormValues,
  SignUpFormValues,
  VerifyCodeFormValues,
} from "./schemas";

/**
 * Turning validated form values back into the `FormData` the Server Actions
 * read.
 *
 * The actions keep taking `FormData` rather than a typed object because that is
 * what the browser posts when client JavaScript never loads. One input shape
 * for both paths means the action cannot accidentally validate something
 * different from what the no-JS visitor sends.
 */

/** Carried on every form so the action knows the locale and where to go next. */
function withContext(formData: FormData, context: FormContext): FormData {
  formData.set("locale", context.locale);
  if (context.next) formData.set("next", context.next);
  return formData;
}

export interface FormContext {
  locale: string;
  next?: string;
}

function appendPhones(formData: FormData, phones: { value: string }[]): void {
  // Appended under one repeated name, matching what the phone inputs post
  // directly: the action reads them with `getAll("phones")` either way.
  for (const phone of phones) formData.append("phones", phone.value);
}

export function signUpFormData(values: SignUpFormValues, context: FormContext): FormData {
  const formData = new FormData();
  formData.set("email", values.email);
  formData.set("password", values.password);
  formData.set("confirmPassword", values.confirmPassword);
  formData.set("restaurantName", values.restaurantName);
  formData.set("location", values.location);
  appendPhones(formData, values.phones);
  return withContext(formData, context);
}

export function profileFormData(values: ProfileFormValues, context: FormContext): FormData {
  const formData = new FormData();
  formData.set("restaurantName", values.restaurantName);
  formData.set("location", values.location);
  appendPhones(formData, values.phones);
  return withContext(formData, context);
}

export function signInFormData(values: SignInFormValues, context: FormContext): FormData {
  const formData = new FormData();
  formData.set("email", values.email);
  formData.set("password", values.password);
  return withContext(formData, context);
}

export function verifyCodeFormData(
  values: VerifyCodeFormValues,
  context: FormContext,
): FormData {
  const formData = new FormData();
  formData.set("code", values.code);
  return withContext(formData, context);
}

/**
 * The ids a workspace action needs — locale, menuId, sectionId, itemId — which
 * the editor's forms already carry as hidden inputs for the no-JS path. Copied
 * from that same map so the two paths cannot post different ids.
 */
function withHidden(formData: FormData, hidden: Record<string, string>): FormData {
  for (const [name, value] of Object.entries(hidden)) formData.set(name, value);
  return formData;
}

export function itemFormData(
  values: MenuItemFormValues,
  hidden: Record<string, string>,
): FormData {
  const formData = new FormData();
  formData.set("name", values.name);
  formData.set("description", values.description);
  // The price goes as typed, not as parsed: the action re-reads it through the
  // same schema, and sending a number here would mean the two paths validated
  // different things.
  formData.set("priceCzk", values.priceCzk);
  return withHidden(formData, hidden);
}

export function inlineTextFormData(
  field: InlineTextField,
  values: Record<string, string>,
  hidden: Record<string, string>,
): FormData {
  const formData = new FormData();
  formData.set(field, values[field] ?? "");
  return withHidden(formData, hidden);
}

/**
 * Where an API field path lives on a profile form.
 *
 * Only the phone list moves: the API says `phones.1`, the form holds
 * `phones.1.value`, because `useFieldArray` tracks objects rather than bare
 * strings.
 *
 * The index is passed through unchanged. It can point at the wrong row when a
 * blank row sits between two filled ones — the API counts the numbers it was
 * sent, the form counts rows on screen — but the browser validates the same
 * rules first, so a per-entry phone error from the API means the two have
 * already disagreed about something, and marking a neighbouring row is a better
 * failure than marking none.
 */
export function profileFieldPath(apiField: string): string {
  const entry = /^phones\.(\d+)$/.exec(apiField);
  return entry ? `phones.${entry[1]}.value` : apiField;
}
