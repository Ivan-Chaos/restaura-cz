#!/usr/bin/env node
/**
 * Minimal static file server, used to serve the built Storybook to Playwright.
 *
 * A four-dependency static-server package would be a fourth thing to keep
 * patched for something this small. Node's own http module is enough, and
 * keeping it here means the e2e setup has no hidden network install.
 *
 * Usage: node scripts/serve-static.mjs <dir> [port]
 */

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "storybook-static");
const port = Number(process.argv[3] ?? 6006);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";

  // Resolve inside the root and refuse anything that escapes it. This server is
  // local-only, but a path-traversal hole is never worth leaving open.
  const candidate = resolve(join(root, normalize(pathname)));
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let stat;
  try {
    stat = statSync(candidate);
  } catch {
    res.writeHead(404).end("Not found");
    return;
  }

  if (stat.isDirectory()) {
    res.writeHead(404).end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[extname(candidate)] ?? "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": "no-store",
  });
  createReadStream(candidate).pipe(res);
});

server.listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
