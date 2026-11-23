// sitemap.xml for search engines, written into dist/ after the build.
// Lists every page that is its own main address: redirect stubs, noindex pages, 404 and pages whose canonical
// points elsewhere (best practices that are also in News) are left out. Each entry carries its language versions.
import fs from 'node:fs'; import path from 'node:path';
const SITE = 'https://stellasdeutsch-dev.github.io'; const BASE = '/woa';
const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/^(pagefind|_astro)$/.test(f)) walk(p); } else if (f === 'index.html') files.push(p); } }; walk('dist');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const out = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  if (/http-equiv="refresh"|name="robots" content="noindex"/.test(html)) continue;
  const own = SITE + BASE + '/' + path.relative('dist', path.dirname(f)).split(path.sep).filter(Boolean).map(encodeURIComponent).join('/') + (path.dirname(f) === 'dist' ? '' : '/');
  const can = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (can && decodeURI(can) !== decodeURI(own)) continue;
  const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m => `<xhtml:link rel="alternate" hreflang="${m[1]}" href="${esc(m[2])}"/>`).join('');
  out.push(`<url><loc>${esc(can || own)}</loc>${alts}</url>`);
}
fs.writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${out.join('\n')}\n</urlset>\n`);
console.log(`sitemap.xml: ${out.length} pages`);
