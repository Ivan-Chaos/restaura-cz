/**
 * The addresses Restaura writes from and asks to be written to. One place,
 * so a domain change or a rename touches one file rather than every template
 * and the environment defaults.
 */

/** The sender of every automated email. Nobody reads replies to it. */
export const NOREPLY_EMAIL = 'noreply@restaura.cz';

/** Where the footer of every email points an owner who needs a person. */
export const SUPPORT_EMAIL = 'hello@restaura.cz';

/**
 * The From header as Resend receives it, display name included. The domain
 * must be verified in Resend for delivery to succeed; EMAIL_FROM overrides
 * this in environments that send from somewhere else.
 */
export const DEFAULT_EMAIL_FROM = `Restaura <${NOREPLY_EMAIL}>`;
