import type { EmailLocale } from '../email-locale.js';
import {
  type EmailMessage,
  escapeHtml,
  FONT_DISPLAY,
  COLORS,
  footerText,
  renderBulletList,
  renderButton,
  renderHeadline,
  renderLayout,
  renderParagraph,
} from './layout.js';

export interface WelcomeParams {
  recipient: string;
  /** Null for an account created before profiles existed. */
  restaurantName: string | null;
  /** The frontend origin. No trailing slash. */
  appUrl: string;
}

interface Copy {
  subject: string;
  preheader: string;
  headline: string;
  /** `name` arrives already escaped for HTML, raw for text. */
  leadNamed: (name: string) => string;
  leadGeneric: string;
  cta: string;
  nextHeading: string;
  next: [string, string, string];
}

/** Formal register throughout (vy / Sie), matching `apps/frontend/messages`. */
const COPY: Record<EmailLocale, Copy> = {
  cs: {
    subject: 'Vítejte v Restaura – váš účet je připraven',
    preheader: 'E-mail je potvrzen. Můžete začít tvořit menu.',
    headline: 'Vítejte v Restaura',
    leadNamed: (name) =>
      `E-mail je potvrzen a účet pro ${name} je připraven. Nastavte svou restauraci a začněte tvořit její menu.`,
    leadGeneric:
      'E-mail je potvrzen a váš účet je připraven. Nastavte svou restauraci a začněte tvořit její menu.',
    cta: 'Vytvořit první menu',
    nextHeading: 'Co můžete udělat hned',
    next: [
      'Sestavte menu: přidejte sekce, položky a ceny.',
      'Zveřejněte ho na vlastní adrese a sdílejte odkaz s hosty.',
      'Upravte údaje o restauraci v nastavení – hosté je uvidí na menu.',
    ],
  },
  en: {
    subject: 'Welcome to Restaura – your account is ready',
    preheader: 'Your email is confirmed. You can start building your menu.',
    headline: 'Welcome to Restaura',
    leadNamed: (name) =>
      `Your email is confirmed and the account for ${name} is ready. Set up your restaurant and start building its menu.`,
    leadGeneric:
      'Your email is confirmed and your account is ready. Set up your restaurant and start building its menu.',
    cta: 'Create your first menu',
    nextHeading: 'What you can do next',
    next: [
      'Build your menu: add sections, items and prices.',
      'Publish it at its own address and share the link with guests.',
      'Update your restaurant details in Settings – guests see them on the menu.',
    ],
  },
  de: {
    subject: 'Willkommen bei Restaura – Ihr Konto ist bereit',
    preheader: 'Ihre E-Mail ist bestätigt. Sie können mit der Speisekarte beginnen.',
    headline: 'Willkommen bei Restaura',
    leadNamed: (name) =>
      `Ihre E-Mail ist bestätigt und das Konto für ${name} ist bereit. Richten Sie Ihr Restaurant ein und erstellen Sie seine Speisekarte.`,
    leadGeneric:
      'Ihre E-Mail ist bestätigt und Ihr Konto ist bereit. Richten Sie Ihr Restaurant ein und erstellen Sie seine Speisekarte.',
    cta: 'Erste Speisekarte erstellen',
    nextHeading: 'Was Sie jetzt tun können',
    next: [
      'Stellen Sie Ihre Speisekarte zusammen: Sektionen, Gerichte und Preise.',
      'Veröffentlichen Sie sie unter eigener Adresse und teilen Sie den Link mit Gästen.',
      'Ergänzen Sie die Restaurantangaben in den Einstellungen – Gäste sehen sie auf der Speisekarte.',
    ],
  },
};

/** The locale-prefixed menus route the frontend serves, where the button lands. */
export function workspaceUrl(appUrl: string, locale: EmailLocale): string {
  return `${appUrl}/${locale}/workspace/menus`;
}

export function renderWelcome(params: WelcomeParams, locale: EmailLocale): EmailMessage {
  const copy = COPY[locale];
  const { recipient, restaurantName, appUrl } = params;
  const href = workspaceUrl(appUrl, locale);

  const leadHtml = restaurantName
    ? copy.leadNamed(`<strong>${escapeHtml(restaurantName)}</strong>`)
    : copy.leadGeneric;
  const leadText = restaurantName ? copy.leadNamed(restaurantName) : copy.leadGeneric;

  const bodyHtml = [
    renderHeadline(copy.headline),
    renderParagraph(leadHtml),
    renderButton(href, copy.cta),
    `<h2 style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:18px;line-height:26px;font-weight:600;color:${COLORS.text};">${copy.nextHeading}</h2>`,
    renderBulletList(copy.next),
  ].join('');

  const text = [
    copy.headline,
    '',
    leadText,
    '',
    `${copy.cta}: ${href}`,
    '',
    copy.nextHeading,
    ...copy.next.map((item) => `- ${item}`),
    '',
    ...footerText(locale, recipient),
  ].join('\n');

  return {
    subject: copy.subject,
    text,
    html: renderLayout({
      locale,
      title: copy.headline,
      preheader: copy.preheader,
      bodyHtml,
      recipient,
      appUrl,
    }),
  };
}
