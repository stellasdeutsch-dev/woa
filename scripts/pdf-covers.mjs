// First page of every linked PDF as a small WebP cover: public/covers/<pdf path>.webp
// Needs pdftoppm (poppler) locally; the covers are committed, so the build server does not need it.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
const set = new Set();
for (const c of ['pages', 'news', 'practices']) for (const l of ['', '.fr', '.es']) {
  const f = `src/data/${c}${l}.json`; if (!fs.existsSync(f)) continue;
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\{\{BASE\}\}(\/[^"\\]*?\.pdf)/gi)) set.add(decodeURI(m[1]));
}
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'covers-'));
let made = 0, skipped = 0, failed = 0;
for (const p of set) {
  const src = 'public' + p; const out = path.join('public/covers', p) + '.webp';
  if (!fs.existsSync(src)) continue;
  if (fs.existsSync(out)) { skipped++; continue; }
  try {
    execFileSync('pdftoppm', ['-png', '-r', '40', '-f', '1', '-l', '1', '-singlefile', src, path.join(tmp, 'p')], { stdio: 'ignore' });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(path.join(tmp, 'p.png')).resize({ width: 160 }).webp({ quality: 70 }).toFile(out); made++;
  } catch { failed++; }
}
console.log(`covers: ${set.size} pdf links, ${made} made, ${skipped} up to date, ${failed} failed`);
