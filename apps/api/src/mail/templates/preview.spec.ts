import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { EMAIL_LOCALES } from '../email-locale.js';
import { renderConfirmationCode } from './confirmation-code.js';
import { renderWelcome } from './welcome.js';

/**
 * Not a test: a way to look at the emails. Skipped unless EMAIL_PREVIEW_DIR
 * is set, in which case every template in every locale is written there as
 * an .html file to open in a browser:
 *
 *   EMAIL_PREVIEW_DIR=/tmp/emails pnpm --filter api exec vitest run src/mail/templates/preview.spec.ts
 */
const previewDir = process.env.EMAIL_PREVIEW_DIR;

describe('email previews', () => {
  it.skipIf(!previewDir)('writes every template in every locale', async () => {
    if (!previewDir) return;
    await mkdir(previewDir, { recursive: true });

    const recipient = 'owner@example.com';
    const appUrl = 'http://localhost:3000';

    for (const locale of EMAIL_LOCALES) {
      const confirmation = renderConfirmationCode({ recipient, code: '482913', appUrl }, locale);
      await writeFile(join(previewDir, `confirmation-${locale}.html`), confirmation.html);
      await writeFile(join(previewDir, `confirmation-${locale}.txt`), confirmation.text);

      const welcome = renderWelcome({ recipient, restaurantName: 'U Zlaté Lípy', appUrl }, locale);
      await writeFile(join(previewDir, `welcome-${locale}.html`), welcome.html);
      await writeFile(join(previewDir, `welcome-${locale}.txt`), welcome.text);
    }
  });
});
