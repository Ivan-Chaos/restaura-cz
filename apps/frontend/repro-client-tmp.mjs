/**
 * Client half of the gray-square loop.
 *
 * Drives the **dev server** (React StrictMode on, unlike the production build
 * the e2e suite uses), goes through the real logo flow, and reports the crop
 * rectangle the browser actually sends plus whether the cropper ever showed an
 * image.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const FIXTURE = "tests/fixtures/images/logo-alpha.png";

const browser = await chromium.launch();
const page = await browser.newPage();

const sent = [];
page.on("request", (req) => {
  const body = req.postData();
  if (body && body.includes('name="cropWidth"')) {
    const read = (field) =>
      new RegExp(`name="${field}"\\r?\\n\\r?\\n([^\\r\\n]*)`).exec(body)?.[1] ?? "?";
    sent.push({
      x: read("cropX"),
      y: read("cropY"),
      width: read("cropWidth"),
      height: read("cropHeight"),
    });
  }
});

const email = `client-${Date.now()}@example.com`;
await page.goto(`${BASE}/cs/sign-up`);
// The cookie notice is fixed to the bottom and intercepts clicks.
await page.getByRole("region", { name: /cookies/i }).getByRole("button").first().click().catch(() => {});
await page.getByLabel(/e-?mail/i).fill(email);
await page.getByLabel(/^heslo$/i).fill("correct horse battery");
await page.getByLabel(/potvrzení hesla/i).fill("correct horse battery");
await page.getByLabel(/název restaurace/i).fill("Repro");
await page.getByLabel(/telefonní číslo 1/i).fill("601234567");
await page.getByLabel(/^adresa$/i).fill("Praha");
await page.getByRole("button", { name: /vytvořit účet/i }).click();
await page.waitForURL("**/verify-email**");

// Confirm straight in the database, as the e2e helpers do.
const { execSync } = await import("node:child_process");
const { createHash } = await import("node:crypto");
const row = execSync(
  `docker exec restaura-postgres psql -U restaura -d restaura -t -A -c "select id from owner_account where email='${email}'"`,
).toString().trim();
const hash = createHash("sha256").update(`${row}.123456`).digest("hex");
execSync(
  `docker exec restaura-postgres psql -U restaura -d restaura -c "update email_confirmation set code_hash='${hash}', attempts=0 where account_id='${row}'"`,
);
await page.getByLabel(/potvrzovací kód/i).fill("123456");
await page.getByRole("button", { name: /potvrdit e-mail/i }).click();
await page.waitForURL("**/workspace/menus**");

await page.goto(`${BASE}/cs/workspace/settings/profile`);
await page.locator('input[type="file"]').first().setInputFiles(FIXTURE);

const dialog = page.getByRole("dialog");
await dialog.waitFor({ timeout: 15_000 });

// Did the cropper actually get an image to measure?
const img = dialog.locator("img").first();
const measured = await img
  .evaluate((el) => ({
    src: el.getAttribute("src")?.slice(0, 24),
    naturalWidth: el.naturalWidth,
    naturalHeight: el.naturalHeight,
    complete: el.complete,
  }))
  .catch(() => null);
console.log("cropper image:", JSON.stringify(measured) ?? "NO <img> IN DIALOG");

const confirm = dialog.getByRole("button", { name: /použít toto umístění/i });
console.log("confirm enabled:", await confirm.isEnabled());
await confirm.click({ timeout: 10_000 }).catch((e) => console.log("confirm click failed:", e.message));

await page.waitForTimeout(3000);
console.log("crop rectangles sent:", JSON.stringify(sent));

await browser.close();

const bad = sent.length === 0 || sent.some((c) => Number(c.width) < 32 || Number(c.height) < 32);
console.log(bad ? "\nRED — degenerate or missing crop" : "\nGREEN — sane crop sent");
process.exit(bad ? 1 : 0);
