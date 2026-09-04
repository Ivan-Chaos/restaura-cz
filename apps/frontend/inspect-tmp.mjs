import sharp from "sharp";

const url = process.argv[2];
const res = await fetch(url);
console.log("HTTP", res.status, res.headers.get("content-type"), res.headers.get("content-length"), "bytes");
if (!res.ok) process.exit(1);

const buf = Buffer.from(await res.arrayBuffer());
const img = sharp(buf);
const meta = await img.metadata();
console.log("format", meta.format, meta.width + "x" + meta.height, "alpha:", meta.hasAlpha);

// Is it a flat/near-flat image? stats gives per-channel min/max/stdev.
const stats = await img.stats();
stats.channels.forEach((c, i) => {
  console.log(`  ch${i}: min=${c.min} max=${c.max} mean=${c.mean.toFixed(1)} stdev=${c.stdev.toFixed(2)}`);
});
const flat = stats.channels.every((c) => c.stdev < 2);
console.log(flat ? ">>> FLAT (uniform colour) — this is the gray square" : ">>> has real detail");
