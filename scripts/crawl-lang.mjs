// Fetch the French (LanguageID=2) and Spanish (LanguageID=3) versions of every crawled page.
// olympians.org serves translations at the same URLs, chosen by the LanguageID cookie.
// Usage: node scripts/crawl-lang.mjs fr|es
import fs from 'node:fs';
import path from 'node:path';

const LANG = process.argv[2];
const ID = { fr: 2, es: 3 }[LANG];
if (!ID) throw new Error('usage: crawl-lang.mjs fr|es');
const ORIGIN = 'https://olympians.org';
const OUT = `data/raw-${LANG}`;
const NOA = `data/noa-${LANG}`;
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(NOA, { recursive: true });
const fileFor = (p) => path.join(OUT, (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[\/?=&]/g, '__')) + '.html');
const headers = { Cookie: `LanguageID=${ID}`, 'User-Agent': 'Mozilla/5.0 site-archive' };
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers }); return { status: r.status, html: r.ok ? await r.text() : '' }; }
    catch { await new Promise(r => setTimeout(r, 1500)); }
  }
  return { status: 0, html: '' };
}
const index = JSON.parse(fs.readFileSync('data/crawl-index.json', 'utf8')).filter(p => p.status === 200);
const jobs = index.map(p => async () => {
  const f = fileFor(p.path); if (fs.existsSync(f)) return;
  const { status, html } = await get(ORIGIN + p.path);
  if (html) fs.writeFileSync(f, html); else console.log('fail', status, p.path);
});
for (const l of fs.readFileSync('data/noa/list.txt', 'utf8').trim().split('\n')) {
  const code = l.split('|')[0];
  jobs.push(async () => { const f = `${NOA}/c_${code}.html`; if (fs.existsSync(f)) return; const { html } = await get(`${ORIGIN}/_noa_directory-v2.cfm?c=${code}`); if (html) fs.writeFileSync(f, html); });
}
let done = 0; const total = jobs.length;
await Promise.all(Array.from({ length: 5 }, async () => { while (jobs.length) { await jobs.shift()(); if (++done % 100 === 0) console.log(LANG, done, '/', total); } }));
console.log(LANG, 'done', total);
