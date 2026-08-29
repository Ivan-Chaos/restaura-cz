#!/usr/bin/env node
/**
 * Translation-catalogue parity gate (constitution, Principle II).
 *
 * `messages/en.json` is the type source for next-intl, so TypeScript catches a
 * *missing* namespace — but it cannot catch a key that exists in `en` and was
 * never translated into `cs` or `de`. That failure is invisible in development
 * (English shows through) and only surfaces to a Czech guest in production.
 *
 * Run by `pnpm lint`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SOURCE_LOCALE = "en";
const TARGET_LOCALES = ["cs", "de"];

function load(locale) {
  const path = join(ROOT, "messages", `${locale}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`✗ Cannot read messages/${locale}.json: ${error.message}`);
    process.exit(1);
  }
}

/** Flatten to dotted leaf paths, e.g. `Menu.highlights.new`. */
function flatten(value, prefix = "", out = new Set()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
}

const source = flatten(load(SOURCE_LOCALE));
let failed = false;

for (const locale of TARGET_LOCALES) {
  const target = flatten(load(locale));

  const missing = [...source].filter((k) => !target.has(k)).sort();
  const extra = [...target].filter((k) => !source.has(k)).sort();

  if (missing.length) {
    failed = true;
    console.error(
      `\n✗ messages/${locale}.json is missing ${missing.length} key(s) present in ${SOURCE_LOCALE}.json:`,
    );
    for (const key of missing) console.error(`    ${key}`);
  }

  if (extra.length) {
    failed = true;
    console.error(
      `\n✗ messages/${locale}.json has ${extra.length} key(s) not in ${SOURCE_LOCALE}.json:`,
    );
    for (const key of extra) console.error(`    ${key}`);
  }
}

if (failed) {
  console.error(
    `\n  Every user-visible string must exist in all three locales. Add the key\n` +
      `  to messages/{cs,en,de}.json in the same change.\n`,
  );
  process.exit(1);
}

console.log(
  `✓ messages: ${source.size} keys present in ${[SOURCE_LOCALE, ...TARGET_LOCALES].join(", ")}`,
);
