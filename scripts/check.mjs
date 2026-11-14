// Completeness check: every text block of the original page must appear on the new page.
// Usage: node scripts/check.mjs  (after npm run build)
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { mapPath } from './paths.mjs';

const index = JSON.parse(fs.readFileSync('data/crawl-index.json', 'utf8'));
const redirects = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8'));
const redir = new Map(redirects.map(r => [r.from, r.to]));
const RAW = 'data/raw';
const fileFor = (p) => path.join(RAW, (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[\/?=&]/g, '__')) + '.html');
const norm = (s) => s.replace(/­/g, '').replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').replace(/\s*([,.;:!?)])/g, '$1').trim().toLowerCase();

const SKIP_PATH = /^\/(news|best-practices)\/(\?StartRow=\d+)?$|^\/$|^\/%E2/;
const results = []; let total = 0, missing = 0, rearranged = 0;
const distText = new Map();
const textOfDist = (p) => {
  if (distText.has(p)) return distText.get(p);
  const f = path.join('dist', p, 'index.html');
  if (!fs.existsSync(f)) { distText.set(p, null); return null; }
  const $ = cheerio.load(fs.readFileSync(f, 'utf8'));
  $('script,style,svg,header.site-header,footer.site-footer,dialog.search-dialog').remove();
  $('br').replaceWith(' ');
  $('option').each((_, o) => { $(o).append(' '); });
  $('strong,em,b,i,small,a,span,dt,dd,p,li,h1,h2,h3,h4,label').after(' ');
  const t = norm($('body').text());
  distText.set(p, t); return t;
};

for (const { path: p, status } of index) {
  if (status !== 200 || SKIP_PATH.test(p)) continue;
  const f = fileFor(p); if (!fs.existsSync(f)) continue;
  const $ = cheerio.load(fs.readFileSync(f, 'utf8'));
  if (/Page not found/i.test($('.title h1').text())) continue;
  $('script,style,select,#ternav,.language-selector,#related,input[name="Rating"],.title h2,p.date').remove();
  $('label').filter((_, l) => /^\s*Rating\s*$/.test($(l).text())).remove();
  $('br').replaceWith(' ');
  $('strong,em,b,i,small,a,span').after(' ');
  $('.right_col h3, .right_col h4').filter((_, h) => /^(Related Stories|More Actions)$/.test($(h).text().trim())).remove();
  let root = $('#content').first(); if (!root.length) root = $('#page').first();
  const blocks = new Set();
  root.find('p,li,h1,h2,h3,h4,h5,h6,td,th,label,legend,blockquote,em,strong').each((_, el) => {
    if ($(el).find('p,li,h1,h2,h3,h4,h5,h6,td').length) return;
    const t = norm($(el).text());
    if (t.length >= 3 && !/^(related stories|more actions)$/.test(t)) blocks.add(t.replace(/\s*[→>]$/, ''));
  });
  const [pp, qq] = p.split('?');
  let target = mapPath(pp, qq ? '?' + qq : '');
  target = redir.get(target) || target;
  const page = textOfDist(target);
  const miss = [];
  for (const blk of blocks) {
    total++;
    if (page && !page.includes(blk)) {
      // visual pages may split one paragraph (quote, year cards, do/don't pairs): accept when every fragment is present
      const frags = blk.split(/[.;:!?“”"()]|\brather than\b|\bnot,/).map(s => s.trim()).filter(s => s.length >= 12);
      if (frags.length && frags.every(f => page.includes(f))) { rearranged++; continue; }
    }
    if (!page || !page.includes(blk)) { miss.push(blk); missing++; }
  }
  if (miss.length || !page) results.push({ original: p, target, exists: !!page, missing: miss });
}
fs.writeFileSync('data/completeness.json', JSON.stringify(results, null, 1));
console.log(`blocks checked: ${total}, missing: ${missing}, split across blocks: ${rearranged}, pages with gaps: ${results.length}`);
if (process.env.FULL) for (const r of results) for (const m of r.missing) console.log('  ', r.target, '|', m.slice(0, 160));
for (const r of results.slice(0, 40)) console.log(`- ${r.original} -> ${r.target}${r.exists ? '' : ' (PAGE MISSING)'}: ${r.missing.length} missing` + (r.missing[0] ? ` e.g. "${r.missing[0].slice(0, 90)}"` : ''));
