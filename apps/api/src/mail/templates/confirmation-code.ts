import type { EmailLocale } from '../email-locale.js';
import {
  COLORS,
  type EmailMessage,
  escapeHtml,
  FONT_DISPLAY,
  footerText,
  renderHeadline,
  renderLayout,
  renderParagraph,
} from './layout.js';

export interface ConfirmationCodeParams {
  recipient: string;
  code: string;
  /** The frontend origin, for the footer link. */
  appUrl: string;
}

interface Copy {
  subject: (code: string) => string;
  headline: string;
  lead: string;
  expiry: string;
  ignore: string;
}

/** Formal register throughout (vy / Sie), matching `apps/frontend/messages`. */
const COPY: Record<EmailLocale, Copy> = {
  cs: {
    subject: (code) => `Váš potvrzovací kód Restaura: ${code}`,
    headline: 'Potvrďte svůj e-mail',
    lead: 'Zadejte tento kód v Restaura a dokončete nastavení účtu.',
    expiry: 'Kód platí 15 minut.',
    ignore: 'Pokud jste si účet Restaura nezakládali, tento e-mail můžete ignorovat.',
  },
  en: {
    subject: (code) => `Your Restaura confirmation code: ${code}`,
    headline: 'Confirm your email',
    lead: 'Enter this code in Restaura to finish setting up your account.',
    expiry: 'The code is valid for 15 minutes.',
    ignore: 'If you did not create a Restaura account, you can ignore this email.',
  },
  de: {
    subject: (code) => `Ihr Restaura-Bestätigungscode: ${code}`,
    headline: 'Bestätigen Sie Ihre E-Mail',
    lead: 'Geben Sie diesen Code in Restaura ein, um die Einrichtung Ihres Kontos abzuschließen.',
    expiry: 'Der Code ist 15 Minuten gültig.',
    ignore: 'Wenn Sie kein Restaura-Konto erstellt haben, können Sie diese E-Mail ignorieren.',
  },
};

/**
 * The code, large and letter-spaced in its own box. The left padding matches
 * the letter-spacing so the trailing gap after the last digit does not make
 * the code sit off-centre.
 */
function renderCodeBox(code: string): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 16px;">',
    '<tr>',
    `<td align="center" bgcolor="${COLORS.codeBox}" style="background-color:${COLORS.codeBox};border:1px solid ${COLORS.border};border-radius:12px;padding:20px 16px 20px 26px;font-family:${FONT_DISPLAY};font-size:40px;line-height:48px;letter-spacing:10px;font-weight:600;color:${COLORS.text};">${escapeHtml(code)}</td>`,
    '</tr>',
    '</table>',
  ].join('');
}

/**
 * No button: the owner already has the tab open that asked for the code, and
 * there is no code-carrying link to offer. The code is the whole message.
 */
export function renderConfirmationCode(
  params: ConfirmationCodeParams,
  locale: EmailLocale,
): EmailMessage {
  const copy = COPY[locale];
  const { recipient, code, appUrl } = params;

  const bodyHtml = [
    renderHeadline(copy.headline),
    renderParagraph(copy.lead),
    renderCodeBox(code),
    renderParagraph(copy.expiry, 'muted'),
    renderParagraph(copy.ignore, 'muted'),
  ].join('');

  const text = [
    copy.headline,
    '',
    copy.lead,
    '',
    code,
    '',
    copy.expiry,
    '',
    copy.ignore,
    '',
    ...footerText(locale, recipient),
  ].join('\n');

  return {
    subject: copy.subject(code),
    text,
    html: renderLayout({
      locale,
      title: copy.headline,
      preheader: copy.expiry,
      bodyHtml,
      recipient,
      appUrl,
    }),
  };
}
