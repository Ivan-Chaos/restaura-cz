import { SUPPORT_EMAIL } from '../addresses.js';
import type { EmailLocale } from '../email-locale.js';

/**
 * The shared frame around every email: preheader, wordmark, card, footer.
 *
 * Email HTML is written the way it was in 2005, on purpose. The rules, each
 * one a client that would otherwise break the message:
 *
 * - Tables with `role="presentation"`, not divs: Outlook lays out nothing else.
 * - Every style inline; no `<style>`, classes or `@media`: Gmail strips them.
 * - Colours as hex, never `oklch()`: no client renders it.
 * - Coloured cells carry `bgcolor` as well as `background-color`, so a client
 *   that drops one attribute keeps a legible text-on-ground pairing.
 * - No images, fonts or external CSS. There is nothing to block, nothing to
 *   show a broken-image placeholder for, and nothing for a spam filter to
 *   weigh against the message. The brand mark is a coloured cell with a letter.
 * - A fixed 600px column, the width every client agrees to show unscaled.
 *
 * Colours are the frontend palette resolved to hex, the same way
 * `apps/frontend/app/apple-icon.tsx` does for its build-time PNG: no custom
 * property exists to read here. Keep them in step with
 * `apps/frontend/styles/palette.css` by hand.
 */
export const COLORS = {
  /** parchment-100 — the page ground. */
  page: '#fbf6ee',
  /** cream-50 — the card, button label and mark glyph. */
  card: '#fffdfa',
  /** cocoa-900 — headings and body text. */
  text: '#2d211a',
  /** cocoa-700 — footer and supporting text. */
  muted: '#705f54',
  /** linen-200 — the code box ground. */
  codeBox: '#f3e9df',
  /** linen-500 — borders. */
  border: '#ccbaa7',
  /** terracotta-600 — the mark, the button, the bullets. */
  primary: '#b54e21',
} as const;

/**
 * The fallback stacks from `apps/frontend/styles/themes/warm.css`. The web
 * fonts themselves (Fraunces, Nunito Sans) cannot be loaded here.
 */
export const FONT_DISPLAY = "'Iowan Old Style', Georgia, serif";
export const FONT_BODY = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** The 12px corner every card and button shares — `--radius` (0.75rem) in the theme. */
const RADIUS = '12px';

export interface EmailMessage {
  subject: string;
  /** The plain-text alternative. Also what a text-only client and a spam filter read. */
  text: string;
  html: string;
}

/**
 * The only defence between an owner-typed restaurant name and the markup.
 * Applied to every interpolated value; never to copy from a template file.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface LayoutOptions {
  locale: EmailLocale;
  /** The `<title>`. Templates use the same string for the headline. */
  title: string;
  /** The line inbox list views show after the subject. Hidden in the body. */
  preheader: string;
  /** The card's contents, already rendered. Values inside must be escaped by the caller. */
  bodyHtml: string;
  /** Shown in the footer so the reader knows why the email reached them. */
  recipient: string;
  /** The frontend origin, for the footer link. No trailing slash. */
  appUrl: string;
}

const FOOTER: Record<EmailLocale, { help: string; sentTo: (email: string) => string }> = {
  cs: {
    help: `Potřebujete poradit? Napište nám na ${SUPPORT_EMAIL}.`,
    sentTo: (email) =>
      `Tento e-mail jsme poslali na ${email}, protože byl použit k registraci v Restaura.`,
  },
  en: {
    help: `Need help? Write to us at ${SUPPORT_EMAIL}.`,
    sentTo: (email) =>
      `This email was sent to ${email} because it was used to register with Restaura.`,
  },
  de: {
    help: `Brauchen Sie Hilfe? Schreiben Sie uns an ${SUPPORT_EMAIL}.`,
    sentTo: (email) =>
      `Diese E-Mail wurde an ${email} gesendet, weil damit ein Restaura-Konto registriert wurde.`,
  },
};

/** The footer sentences as plain text, for the `text` part of every message. */
export function footerText(locale: EmailLocale, recipient: string): string[] {
  const footer = FOOTER[locale];
  return [footer.help, footer.sentTo(recipient), 'Restaura · restaura.cz'];
}

export function renderHeadline(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:${FONT_DISPLAY};font-size:28px;line-height:36px;font-weight:600;color:${COLORS.text};">${text}</h1>`;
}

export function renderParagraph(html: string, tone: 'body' | 'muted' = 'body'): string {
  const color = tone === 'muted' ? COLORS.muted : COLORS.text;
  const size = tone === 'muted' ? 'font-size:14px;line-height:22px;' : 'font-size:16px;line-height:24px;';
  return `<p style="margin:0 0 16px;font-family:${FONT_BODY};${size}color:${color};">${html}</p>`;
}

/**
 * A button that is a padded, coloured table cell around a link. The whole
 * cell is the target in every client that honours padding; in old Outlook
 * only the label is, which is tolerable for an onboarding nudge.
 */
export function renderButton(href: string, label: string): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">',
    '<tr>',
    `<td bgcolor="${COLORS.primary}" style="background-color:${COLORS.primary};border-radius:${RADIUS};">`,
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT_BODY};font-size:16px;line-height:20px;font-weight:700;color:${COLORS.card};text-decoration:none;border-radius:${RADIUS};">${label}</a>`,
    '</td>',
    '</tr>',
    '</table>',
  ].join('');
}

/**
 * A `<ul>` indents differently in every client, so each item is a row with
 * a narrow bullet cell.
 */
export function renderBulletList(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        '<tr>' +
        `<td width="20" valign="top" style="width:20px;padding:0 0 10px;font-family:${FONT_BODY};font-size:16px;line-height:24px;color:${COLORS.primary};">&bull;</td>` +
        `<td valign="top" style="padding:0 0 10px;font-family:${FONT_BODY};font-size:16px;line-height:24px;color:${COLORS.text};">${item}</td>` +
        '</tr>',
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;">${rows}</table>`;
}

function renderHeader(): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0">',
    '<tr>',
    `<td width="28" height="28" align="center" valign="middle" bgcolor="${COLORS.primary}" style="width:28px;height:28px;background-color:${COLORS.primary};border-radius:8px;font-family:${FONT_DISPLAY};font-size:16px;line-height:28px;font-weight:700;color:${COLORS.card};">R</td>`,
    `<td style="padding-left:10px;font-family:${FONT_DISPLAY};font-size:22px;line-height:28px;font-weight:600;color:${COLORS.text};">Restaura</td>`,
    '</tr>',
    '</table>',
  ].join('');
}

function renderFooter(locale: EmailLocale, recipient: string, appUrl: string): string {
  const footer = FOOTER[locale];
  const small = `font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${COLORS.muted};`;
  const help = footer.help.replace(
    SUPPORT_EMAIL,
    `<a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.primary};text-decoration:underline;">${SUPPORT_EMAIL}</a>`,
  );
  return [
    `<p style="margin:0 0 8px;${small}">${help}</p>`,
    `<p style="margin:0 0 8px;${small}">${footer.sentTo(escapeHtml(recipient))}</p>`,
    `<p style="margin:0;${small}"><a href="${escapeHtml(appUrl)}" style="color:${COLORS.muted};text-decoration:none;">Restaura &middot; restaura.cz</a></p>`,
  ].join('');
}

export function renderLayout(options: LayoutOptions): string {
  const { locale, title, preheader, bodyHtml, recipient, appUrl } = options;
  return [
    '<!DOCTYPE html>',
    `<html lang="${locale}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    // The owner dashboard is light-only, and so is its mail: asking clients
    // not to invert keeps the terracotta-on-cream pairing intact.
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    `<title>${title}</title>`,
    '</head>',
    `<body style="margin:0;padding:0;background-color:${COLORS.page};" bgcolor="${COLORS.page}">`,
    `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:${COLORS.page};">${preheader}</div>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${COLORS.page}" style="background-color:${COLORS.page};">`,
    '<tr>',
    '<td align="center" style="padding:32px 16px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">',
    `<tr><td style="padding:0 8px 20px;">${renderHeader()}</td></tr>`,
    `<tr><td bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:${RADIUS};padding:40px 40px 32px;">${bodyHtml}</td></tr>`,
    `<tr><td style="padding:24px 8px 0;">${renderFooter(locale, recipient, appUrl)}</td></tr>`,
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
}
