import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { loadEnv } from '../config/env.js';

/**
 * The locales the frontend can ask for, as a value so DTOs can validate
 * against the same list the templates implement. Must stay in step with
 * `apps/frontend/i18n/routing.ts`.
 */
export const EMAIL_LOCALES = ['cs', 'en', 'de'] as const;

export type EmailLocale = (typeof EMAIL_LOCALES)[number];

/**
 * Outbound email.
 *
 * Wrapped in a service of our own rather than calling Resend from the auth
 * service, so that the one decision worth isolating — send or log — lives in a
 * single place, and so a provider change touches one file.
 *
 * Without RESEND_API_KEY the code is written to the log instead of sent. That
 * is not a silent degradation: local development has no verified sending
 * domain, and requiring one would mean nobody could exercise registration
 * without a third-party account.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly env = loadEnv();
  private readonly resend = this.env.resendApiKey
    ? new Resend(this.env.resendApiKey)
    : undefined;

  /**
   * Throws if the provider rejects the send, so a caller who needs to report
   * failure to the owner can. Sign-up deliberately swallows that; the resend
   * endpoint deliberately does not.
   */
  async sendConfirmationCode(to: string, code: string, locale: EmailLocale): Promise<void> {
    const { subject, body } = confirmationMessage(code, locale);

    if (!this.resend) {
      // Written at log level, not debug: in local development this line *is*
      // the delivery mechanism, and a developer must be able to find it.
      this.logger.log(`Confirmation code for ${to}: ${code}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.env.emailFrom,
      to,
      subject,
      text: body,
    });

    // The SDK reports failure as a value rather than throwing, so an
    // unchecked call looks successful while delivering nothing.
    if (error) {
      this.logger.error(`Resend rejected the confirmation email: ${error.message}`);
      throw new Error(error.message);
    }
  }
}

/**
 * Plain text, not HTML. The entire message is one code and one deadline; an
 * HTML template would add a rendering dependency and a spam-filter liability
 * to something with nothing to lay out.
 */
function confirmationMessage(
  code: string,
  locale: EmailLocale,
): { subject: string; body: string } {
  switch (locale) {
    case 'en':
      return {
        subject: `Your Restaura confirmation code: ${code}`,
        body: [
          `Your confirmation code is ${code}.`,
          '',
          'Enter it in Restaura to finish setting up your account. The code expires in 15 minutes.',
          '',
          'If you did not create a Restaura account, you can ignore this email.',
        ].join('\n'),
      };
    case 'de':
      return {
        subject: `Ihr Restaura-Bestätigungscode: ${code}`,
        body: [
          `Ihr Bestätigungscode lautet ${code}.`,
          '',
          'Geben Sie ihn in Restaura ein, um die Einrichtung Ihres Kontos abzuschließen. Der Code läuft in 15 Minuten ab.',
          '',
          'Wenn Sie kein Restaura-Konto erstellt haben, können Sie diese E-Mail ignorieren.',
        ].join('\n'),
      };
    case 'cs':
    default:
      return {
        subject: `Váš potvrzovací kód Restaura: ${code}`,
        body: [
          `Váš potvrzovací kód je ${code}.`,
          '',
          'Zadejte jej v Restaura a dokončete nastavení účtu. Kód platí 15 minut.',
          '',
          'Pokud jste si účet Restaura nezakládali, tento e-mail můžete ignorovat.',
        ].join('\n'),
      };
  }
}
