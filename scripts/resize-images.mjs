// Makes smaller WebP copies of large photos for srcset: public/_img/<width>/<original path>.webp
// Runs before `astro build` (see package.json). Existing copies newer than the source are skipped.
// The logo gets a 144px-high PNG (same artwork, only scaled; never recoloured or cropped).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'public';
const OUT = path.join(ROOT, '_img');
const WIDTHS = [480, 960];
const SKIP = /^public\/(_img|crm|flags)\//;
const RASTER = /\.(jpe?g|png|webp)$/i;

const files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) { if (!SKIP.test(p + '/')) walk(p); } else if (RASTER.test(f) && st.size > 60 * 1024) files.push(p); } };
walk(ROOT);

let made = 0, skipped = 0, failed = 0;
const widths = {};
const jobs = files.map(src => async () => {
  let meta;
  try { meta = await sharp(src).metadata(); } catch { failed++; return; }
  widths['/' + path.relative(ROOT, src)] = meta.width;
  for (const w of WIDTHS) {
    if (!meta.width || meta.width <= w * 1.15) continue;
    const dst = path.join(OUT, String(w), path.relative(ROOT, src)) + '.webp';
    if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) { skipped++; continue; }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    try { await sharp(src).resize({ width: w }).webp({ quality: 72 }).toFile(dst); made++; } catch { failed++; }
  }
});
// small worker pool
const pool = Array.from({ length: 6 }, async () => { while (jobs.length) await jobs.shift()(); });
await Promise.all(pool);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(widths));

const logo = path.join(ROOT, 'images/world-olympians-association-logo-v2.png');
const logoSmall = path.join(OUT, 'logo-144.png');
if (fs.existsSync(logo) && !fs.existsSync(logoSmall)) { fs.mkdirSync(OUT, { recursive: true }); await sharp(logo).resize({ height: 144 }).png({ compressionLevel: 9 }).toFile(logoSmall); made++; }

console.log(`images: ${files.length} sources, ${made} copies made, ${skipped} up to date, ${failed} failed`);
