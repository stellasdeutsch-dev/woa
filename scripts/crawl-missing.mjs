// Fetch pages linked as http:// or www.olympians.org that the first crawl skipped; follow their links too.
import fs from 'node:fs'; import path from 'node:path'; import * as cheerio from 'cheerio';
const ORIGIN = 'https://olympians.org';
const index = JSON.parse(fs.readFileSync('data/crawl-index.json', 'utf8'));
const have = new Set(index.map(p => p.path));
const fileFor = (p) => path.join('data/raw', (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[\/?=&]/g, '__')) + '.html');
const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|docx?|xlsx?|pptx?|zip|mp4|mp3|css|js|ico)$/i;
const norm = (href) => { try { const u = new URL(href, ORIGIN); if (!/^(www\.)?olympians\.org$/.test(u.hostname)) return null; if (u.searchParams.has('langid')) return null; if (SKIP.test(u.pathname)) return null; let p = u.pathname; if (!p.endsWith('/') && !path.extname(p)) p += '/'; return p + (u.search || ''); } catch { return null; } };
const queue = [];
for (const f of fs.readdirSync('data/raw')) { const $ = cheerio.load(fs.readFileSync('data/raw/' + f, 'utf8')); $('a[href]').each((_, a) => { const n = norm($(a).attr('href')); if (n && !have.has(n)) queue.push(n); }); }
const seen = new Set(); let added = 0;
while (queue.length) {
  const p = queue.shift(); if (seen.has(p) || have.has(p)) continue; seen.add(p);
  const r = await fetch(ORIGIN + p, { headers: { Cookie: 'LanguageID=1', 'User-Agent': 'Mozilla/5.0 site-archive' } }).catch(() => null);
  if (!r || !r.ok) { index.push({ path: p, status: r ? r.status : 0 }); continue; }
  const html = await r.text(); fs.writeFileSync(fileFor(p), html); index.push({ path: p, status: 200, final: r.url }); added++;
  const $ = cheerio.load(html); $('a[href]').each((_, a) => { const n = norm($(a).attr('href')); if (n && !have.has(n) && !seen.has(n)) queue.push(n); });
}
fs.writeFileSync('data/crawl-index.json', JSON.stringify(index, null, 1));
console.log('fetched', added, 'checked', seen.size, [...seen].slice(0, 40).join(' '));
