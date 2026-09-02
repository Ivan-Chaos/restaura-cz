import { describe, expect, it } from 'vitest';
import { escapeHtml, renderLayout } from './layout.js';

describe('escapeHtml', () => {
  it('neutralises every character that can open markup or an attribute', () => {
    expect(escapeHtml(`<b class="x" data-y='z'>&</b>`)).toBe(
      '&lt;b class=&quot;x&quot; data-y=&#39;z&#39;&gt;&amp;&lt;/b&gt;',
    );
  });

  it('leaves accented text alone', () => {
    expect(escapeHtml('U Zlaté Lípy')).toBe('U Zlaté Lípy');
  });
});

describe('renderLayout', () => {
  const html = renderLayout({
    locale: 'de',
    title: 'Titel',
    preheader: 'Vorschau',
    bodyHtml: '<p>Inhalt</p>',
    recipient: 'owner+<tag>@example.com',
    appUrl: 'http://localhost:3000',
  });

  it('declares the language, the title and the preheader', () => {
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<title>Titel</title>');
    expect(html).toContain('Vorschau');
    expect(html).toContain('<p>Inhalt</p>');
  });

  it('asks clients to keep the light palette', () => {
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain('<meta name="supported-color-schemes" content="light">');
  });

  it('uses presentational tables and links back to the app', () => {
    expect(html).toContain('role="presentation"');
    expect(html).toContain('href="http://localhost:3000"');
    expect(html).toContain('href="mailto:hello@restaura.cz"');
  });

  it('escapes the recipient shown in the footer', () => {
    expect(html).toContain('owner+&lt;tag&gt;@example.com');
    expect(html).not.toContain('owner+<tag>@example.com');
  });

  it('carries nothing a client could block or fail to render', () => {
    expect(html).not.toMatch(/<img|<link|<style|<script|@import|@media|oklch\(/);
  });

  it('writes the footer in the requested language', () => {
    expect(html).toContain('Brauchen Sie Hilfe?');
  });
});
