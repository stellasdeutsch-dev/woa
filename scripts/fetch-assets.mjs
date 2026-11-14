// Download every same-origin asset referenced by the crawled site into public/ (same paths).
import fs from 'node:fs'; import path from 'node:path';
const list = [...JSON.parse(fs.readFileSync('data/assets.json', 'utf8')), ...(fs.existsSync('data/needed-assets.json') ? JSON.parse(fs.readFileSync('data/needed-assets.json', 'utf8')) : [])];
const extra = ['/images/world-olympians-association-logo-v2.png','/images/og-image-logo.jpg','/apple-touch-icon.png','/favicon-32x32.png','/favicon-16x16.png','/images/icon-download.png','/images/olympic-day-banner.png'];
// flags
for (const f of fs.readdirSync('data/noa').filter(f => f.startsWith('c_'))) {
  const m = fs.readFileSync('data/noa/' + f, 'utf8').match(/src="(\/flags-v2\/[^"]+)"/); if (m) extra.push(m[1]);
}
const all = [...new Set([...list, ...extra])];
let i = 0, fail = [];
async function w() { while (i < all.length) { const p = all[i++]; const out = path.join('public', decodeURIComponent(p));
  if (fs.existsSync(out)) continue; fs.mkdirSync(path.dirname(out), { recursive: true });
  try { const r = await fetch('https://olympians.org' + encodeURI(decodeURI(p))); if (!r.ok) { fail.push(p + ' ' + r.status); continue; }
    if (/text\/html/.test(r.headers.get('content-type') || '')) { fail.push(p + ' html (missing on original)'); continue; }
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); } catch (e) { fail.push(p + ' ' + e.message); } } }
await Promise.all(Array.from({ length: 8 }, w));
fs.writeFileSync('data/asset-failures.json', JSON.stringify(fail, null, 1));
console.log('assets', all.length, 'failed', fail.length);
