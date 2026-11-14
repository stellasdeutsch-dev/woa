// After the build: document cards (a.vb-doc) that link to a PDF with a cover show the cover instead of the generic icon.
import fs from 'node:fs'; import path from 'node:path';
const BASE = '/woa';
const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } }; walk('dist');
let cards = 0, pages = 0;
const rx = /<a class="vb-doc" href="([^"]+\.pdf)"([^>]*)><span class="vb-ico"([^>]*)>(<svg[\s\S]*?<\/svg>)<\/span>/gi;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8'); if (!html.includes('vb-doc')) continue;
  let n = 0;
  const out = html.replace(rx, (m, href, rest, spanAttrs, svg) => {
    let p; try { p = decodeURI(href.replace(BASE, '')); } catch { return m; }
    const cover = path.join('public/covers', p) + '.webp';
    if (!fs.existsSync(cover)) return m;
    n++;
    return `<a class="vb-doc has-cover" href="${href}"${rest}><span class="vb-ico vb-cover"${spanAttrs}><img src="${BASE}/covers${encodeURI(p)}.webp" alt="" loading="lazy" width="48" height="68"></span>`;
  });
  if (n) { fs.writeFileSync(f, out); cards += n; pages++; }
}
console.log(`document covers: ${cards} cards on ${pages} pages`);
