/**
 * Rebuilds lib/pdf/assets/paid-stamp-watermark.png from paid-seal.png.
 * Run: node lib/pdf/build-paid-stamp-asset.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const root = path.join(process.cwd(), "lib", "pdf", "assets");
const src = path.join(root, "paid-seal.png");
const out = path.join(root, "paid-stamp-watermark.png");

if (!fs.existsSync(src)) {
  console.error("Missing", src);
  process.exit(1);
}

const BLEND = 0.28;
const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (max < 40 || (max > 200 && sat < 0.2)) {
    data[i + 3] = 0;
  } else {
    data[i + 3] = Math.round(a * BLEND);
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .trim()
  .resize(300, 300, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toFile(out);

console.log("Wrote", out);
