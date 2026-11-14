// News and Best Practices in French/Spanish are separate articles with their own ids and slugs.
// Walk the translated listings page by page, save them and every article they link to,
// and write data/crawl-index.<lang>.json (other pages keep the English paths).
// Usage: node scripts/crawl-lang-news.mjs fr|es
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const LANG = process.argv[2];
const ID = { fr: 2, es: 3 }[LANG];
if (!ID) throw new Error('usage: crawl-lang-news.mjs fr|es');
const ORIGIN = 'https://olympians.org';
const OUT = `data/raw-${LANG}`;
const fileFor = (p) => path.join(OUT, (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[\/?=&]/g, '__')) + '.html');
const headers = { Cookie: `LanguageID=${ID}`, 'User-Agent': 'Mozilla/5.0 site-archive' };
async function get(p) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(ORIGIN + p, { headers }); return r.ok ? await r.text() : ''; }
    catch { await new Promise(r => setTimeout(r, 1500)); }
  }
  return '';
}
const articles = new Set();
const listings = [];
for (const base of ['/news/', '/best-practices/']) {
  for (let start = 1; ; start += 19) {
    const p = start === 1 ? base : `${base}?StartRow=${start}`;
    const f = fileFor(p);
    const html = fs.existsSync(f) && start !== 1 ? fs.readFileSync(f, 'utf8') : await get(p);
    if (!html) break;
    const $ = cheerio.load(html);
    const links = $('#home li a').map((_, a) => $(a).attr('href')).get().filter(h => /^\/(news\/\d+\/|best-practices\/[^?]+\/\?id=\d+)/.test(h || ''));
    if (!links.length) break;
    fs.writeFileSync(f, html); listings.push(p);
    const before = articles.size; links.forEach(h => articles.add(h));
    if (articles.size === before) break;
  }
}
console.log(LANG, 'listing pages', listings.length, 'articles', articles.size);
const list = [...articles];
let done = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (list.length) {
    const p = list.shift(); const f = fileFor(p);
    if (!fs.existsSync(f)) { const html = await get(p); if (html) fs.writeFileSync(f, html); }
    if (++done % 100 === 0) console.log(LANG, done);
  }
}));
const en = JSON.parse(fs.readFileSync('data/crawl-index.json', 'utf8'));
const index = [
  ...en.filter(p => p.status === 200 && !/^\/(news|best-practices)\//.test(p.path)),
  ...en.filter(p => p.status === 200 && /^\/best-practices\/submissions\//.test(p.path)),
  ...listings.map(p => ({ path: p, status: 200 })),
  ...[...articles].map(p => ({ path: p, status: 200 })),
];
fs.writeFileSync(`data/crawl-index.${LANG}.json`, JSON.stringify(index, null, 1));
console.log(LANG, 'index', index.length);
