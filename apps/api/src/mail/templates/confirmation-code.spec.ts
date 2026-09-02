import { describe, expect, it } from 'vitest';
import { EMAIL_LOCALES, type EmailLocale } from '../email-locale.js';
import { renderConfirmationCode } from './confirmation-code.js';

const CODE = '482913';

const HEADLINE: Record<EmailLocale, string> = {
  cs: 'Potvrďte svůj e-mail',
  en: 'Confirm your email',
  de: 'Bestätigen Sie Ihre E-Mail',
};

describe('renderConfirmationCode', () => {
  it.each(EMAIL_LOCALES)('puts the code in every part of the %s message', (locale) => {
    const message = renderConfirmationCode(
      { recipient: 'owner@example.com', code: CODE, appUrl: 'http://localhost:3000' },
      locale,
    );

    expect(message.subject).toContain(CODE);
    expect(message.text).toContain(CODE);
    expect(message.html).toContain(CODE);
    expect(message.html).toContain(`<html lang="${locale}">`);
    expect(message.html).toContain(HEADLINE[locale]);
    expect(message.text).toContain(HEADLINE[locale]);
  });

  it('keeps the subject the frontend copy was written against', () => {
    const message = renderConfirmationCode(
      { recipient: 'owner@example.com', code: CODE, appUrl: 'http://localhost:3000' },
      'cs',
    );
    expect(message.subject).toBe(`Váš potvrzovací kód Restaura: ${CODE}`);
  });

  it('offers no button: the code is the whole message', () => {
    const message = renderConfirmationCode(
      { recipient: 'owner@example.com', code: CODE, appUrl: 'http://localhost:3000' },
      'en',
    );
    expect(message.html).not.toContain('/workspace/menus');
  });
});
