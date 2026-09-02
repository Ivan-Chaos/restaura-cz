/**
 * The locales the frontend can ask for, as a value so DTOs can validate
 * against the same list the templates implement. Must stay in step with
 * `apps/frontend/i18n/routing.ts`.
 *
 * Lives apart from MailService so the templates can import it without the
 * templates and the service importing each other.
 */
export const EMAIL_LOCALES = ['cs', 'en', 'de'] as const;

export type EmailLocale = (typeof EMAIL_LOCALES)[number];
