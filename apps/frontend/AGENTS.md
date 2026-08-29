<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# i18n (next-intl)

- Locales: `cs` (default), `en`, `de` — defined in `i18n/routing.ts`. All routes live under `app/[locale]/`; URLs are always prefixed (`/cs/...`). `proxy.ts` redirects `/` using the `NEXT_LOCALE` cookie, then `Accept-Language`.
- Messages: `messages/{cs,en,de}.json`, one namespace per component/page. `en.json` is the type source (`global.d.ts`) — add keys to all three files.
- Use `useTranslations("Namespace")` in components (server or client), `getTranslations()` in `generateMetadata`/server utilities. Rich text via `t.rich(...)`.
- Import `Link`, `useRouter`, `usePathname`, `redirect` from `@/i18n/navigation`, not from `next/link` / `next/navigation`.
- In every page/layout under `[locale]`, validate with `hasLocale(routing.locales, locale)` and call `setRequestLocale(locale)` to keep static rendering.
