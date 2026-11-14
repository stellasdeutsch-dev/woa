// Crawl olympians.org (English) and save raw HTML for every internal page.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ORIGIN = 'https://olympians.org';
const OUT = path.resolve('data/raw');
fs.mkdirSync(OUT, { recursive: true });
const seen = new Set();
const queue = ['/'];
const assets = new Set();
const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|docx?|xlsx?|pptx?|zip|mp4|mp3|css|js|ico|webmanifest)$/i;

const norm = (href) => {
  try {
    const u = new URL(href, ORIGIN);
    if (u.origin !== ORIGIN) return null;
    if (u.searchParams.has('langid')) return null;
    if (SKIP.test(u.pathname)) { assets.add(u.pathname); return null; }
    let p = u.pathname;
    if (!p.endsWith('/') && !path.extname(p)) p += '/';
    return p + (u.search || '');
  } catch { return null; }
};
const fileFor = (p) => path.join(OUT, (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[\/?=&]/g, '__')) + '.html');

async function fetchPage(p) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(ORIGIN + p, { headers: { Cookie: 'LanguageID=1', 'User-Agent': 'Mozilla/5.0 site-archive' }, redirect: 'follow' });
      if (!r.ok) return { status: r.status, html: '' };
      return { status: r.status, html: await r.text(), url: r.url };
    } catch (e) { await new Promise(r => setTimeout(r, 1000)); }
  }
  return { status: 0, html: '' };
}

const index = [];
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    if (seen.has(p)) continue;
    seen.add(p);
    const { status, html, url } = await fetchPage(p);
    index.push({ path: p, status, final: url });
    if (!html) continue;
    fs.writeFileSync(fileFor(p), html);
    const $ = cheerio.load(html);
    $('a[href]').each((_, a) => { const n = norm($(a).attr('href')); if (n && !seen.has(n)) queue.push(n); });
    $('img[src], source[srcset]').each((_, im) => { const s = $(im).attr('src') || $(im).attr('srcset'); try { const u = new URL(s, ORIGIN); if (u.origin === ORIGIN) assets.add(u.pathname); } catch {} });
    if (seen.size % 50 === 0) console.log('pages', seen.size, 'queue', queue.length);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
// second pass for stragglers
while (queue.length) await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync('data/crawl-index.json', JSON.stringify(index, null, 1));
fs.writeFileSync('data/assets.json', JSON.stringify([...assets].sort(), null, 1));
console.log('done', index.length, 'pages,', assets.size, 'assets');
