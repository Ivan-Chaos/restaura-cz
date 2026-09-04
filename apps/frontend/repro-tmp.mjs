/**
 * Feedback loop for the gray-square bug.
 *
 * Signs up a throwaway owner, uploads the same logo twice — once with no crop
 * rectangle (the centre-crop path) and once with a rectangle — then reads each
 * stored object back out of R2 and asks whether it is a flat colour.
 *
 * Red when a stored rendition has zero variance; green when both carry detail.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";

const API = "http://localhost:3001";
const SOURCE = "tests/fixtures/images/logo-alpha.png";

async function signUp() {
  const email = `repro-${Date.now()}@example.com`;
  const res = await fetch(`${API}/auth/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "correct horse battery",
      restaurantName: "Repro",
      phones: ["+420 601 234 567"],
      location: "Praha",
    }),
  });
  if (!res.ok) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("restaura_session="));
  return cookie.split(";")[0];
}

async function upload(cookie, crop) {
  const body = new FormData();
  body.set("file", new Blob([readFileSync(SOURCE)]), "logo.png");
  if (crop) {
    body.set("cropX", String(crop.x));
    body.set("cropY", String(crop.y));
    body.set("cropWidth", String(crop.width));
    body.set("cropHeight", String(crop.height));
  }

  const res = await fetch(`${API}/auth/profile/logo`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${text}`);
  return JSON.parse(text).profile.logo;
}

async function isFlat(url) {
  const res = await fetch(url);
  if (!res.ok) return `HTTP ${res.status}`;
  const buf = Buffer.from(await res.arrayBuffer());
  const stats = await sharp(buf).stats();
  const spread = stats.channels.map((c) => c.stdev.toFixed(2)).join(", ");
  const flat = stats.channels.every((c) => c.stdev < 2);
  return `${flat ? "FLAT" : "detail"} (stdev per channel: ${spread})`;
}

const source = await sharp(readFileSync(SOURCE)).metadata();
console.log(`source: ${source.width}x${source.height} ${source.format}\n`);

const cookie = await signUp();

const cases = [
  ["no crop (centre-crop path)", undefined],
  ["full-image crop", { x: 0, y: 0, width: source.width, height: source.height }],
  ["sensible centre crop", { x: 100, y: 0, width: 400, height: 400 }],
  ["tiny crop (what a broken measurement would send)", { x: 0, y: 0, width: 4, height: 4 }],
];

let red = false;
for (const [label, crop] of cases) {
  const logo = await upload(cookie, crop);
  // R2 is read-after-write consistent, but give the public edge a beat.
  await new Promise((r) => setTimeout(r, 400));
  const verdict = await isFlat(logo.url);
  if (verdict.startsWith("FLAT")) red = true;
  console.log(`${verdict.startsWith("FLAT") ? "✗" : "✓"} ${label}: ${verdict}`);
}

console.log(`\n${red ? "RED — a stored rendition is a flat colour" : "GREEN — every rendition carries detail"}`);
process.exit(red ? 1 : 0);
