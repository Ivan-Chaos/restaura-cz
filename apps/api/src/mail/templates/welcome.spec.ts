import { describe, expect, it } from 'vitest';
import { EMAIL_LOCALES } from '../email-locale.js';
import { renderWelcome, workspaceUrl } from './welcome.js';

const APP_URL = 'http://localhost:3000';

describe('workspaceUrl', () => {
  it('prefixes the menus route with the locale, as the frontend router expects', () => {
    expect(workspaceUrl(APP_URL, 'de')).toBe('http://localhost:3000/de/workspace/menus');
  });
});

describe('renderWelcome', () => {
  it.each(EMAIL_LOCALES)('links the %s message to the workspace in that language', (locale) => {
    const message = renderWelcome(
      { recipient: 'owner@example.com', restaurantName: 'U Zlaté Lípy', appUrl: APP_URL },
      locale,
    );
    const href = `${APP_URL}/${locale}/workspace/menus`;

    expect(message.html).toContain(`href="${href}"`);
    expect(message.text).toContain(href);
    expect(message.html).toContain(`<html lang="${locale}">`);
    expect(message.html).toContain('U Zlaté Lípy');
    expect(message.text).toContain('U Zlaté Lípy');
  });

  it('escapes a restaurant name that tries to be markup', () => {
    const message = renderWelcome(
      {
        recipient: 'owner@example.com',
        restaurantName: '<script>alert(1)</script>',
        appUrl: APP_URL,
      },
      'en',
    );

    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).not.toContain('<script>');
  });

  it('falls back to a generic greeting for an account with no profile', () => {
    const message = renderWelcome(
      { recipient: 'owner@example.com', restaurantName: null, appUrl: APP_URL },
      'cs',
    );

    expect(message.html).toContain('váš účet je připraven');
    expect(message.text).toContain('váš účet je připraven');
    expect(message.html).not.toContain('null');
    expect(message.text).not.toContain('null');
  });
});
