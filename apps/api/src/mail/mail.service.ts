import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { loadEnv } from '../config/env.js';
import type { EmailLocale } from './email-locale.js';
import { renderConfirmationCode } from './templates/confirmation-code.js';
import type { EmailMessage } from './templates/layout.js';
import { renderWelcome } from './templates/welcome.js';

// Re-exported so existing importers of the locale list keep one path.
export { EMAIL_LOCALES, type EmailLocale } from './email-locale.js';

/**
 * Outbound email.
 *
 * Wrapped in a service of our own rather than calling Resend from the auth
 * service, so that the one decision worth isolating — send or log — lives in a
 * single place, and so a provider change touches one file.
 *
 * Every message goes out as multipart text and HTML. The HTML is hand-written
 * tables in `./templates`, rendered by string concatenation: no template
 * engine, no build step, and nothing new in package.json. The text part is
 * kept as the fallback for text-only clients and as the honest signal spam
 * filters look for; the HTML carries no images, fonts or remote resources, so
 * there is nothing for a client to block.
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
    if (!this.resend) {
      // Written at log level, not debug: in local development this line *is*
      // the delivery mechanism, and a developer must be able to find it.
      this.logger.log(`Confirmation code for ${to}: ${code}`);
      return;
    }

    const message = renderConfirmationCode(
      { recipient: to, code, appUrl: this.env.appUrl },
      locale,
    );
    await this.deliver('confirmation', to, message);
  }

  /**
   * Sent once, after the address is confirmed. Throws on provider rejection
   * like the confirmation email; the caller decides whether that matters.
   */
  async sendWelcome(
    to: string,
    params: { restaurantName: string | null },
    locale: EmailLocale,
  ): Promise<void> {
    if (!this.resend) {
      // Logged so a developer walking the flow can see that the trigger fired.
      this.logger.log(`Welcome email for ${to} (${locale}) not sent: RESEND_API_KEY is unset`);
      return;
    }

    const message = renderWelcome(
      { recipient: to, restaurantName: params.restaurantName, appUrl: this.env.appUrl },
      locale,
    );
    await this.deliver('welcome', to, message);
  }

  private async deliver(
    kind: 'confirmation' | 'welcome',
    to: string,
    message: EmailMessage,
  ): Promise<void> {
    // Guarded by both callers; restated so this method is safe on its own.
    if (!this.resend) return;

    const { error } = await this.resend.emails.send({
      from: this.env.emailFrom,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    // The SDK reports failure as a value rather than throwing, so an
    // unchecked call looks successful while delivering nothing.
    if (error) {
      this.logger.error(`Resend rejected the ${kind} email: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
