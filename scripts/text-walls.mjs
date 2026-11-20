// "Walls of text": runs of visible sibling paragraphs with many words and no heading, image or block in between
// usage: node scripts/text-walls.mjs dist [articles]   (text behind "Read More", hidden="until-found", is not counted)
import fs from 'node:fs'; import path from 'node:path'; import * as cheerio from 'cheerio';
const root = process.argv[2]; const out = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name === 'index.html' ? [path.join(d, e.name)] : []);
for (const f of walk(root)) {
  const rel = '/' + path.relative(root, path.dirname(f)) + '/';
  const mode = process.argv[3] || 'pages'; const isArticle = /^\/(news|best-practices)\/[^/]+\/|^\/actions\//.test(rel) && !/\/(page|year)\//.test(rel); if (/^\/(fr|es)\/./.test(rel) || (mode === 'articles') !== isArticle) continue;
  const $ = cheerio.load(fs.readFileSync(f, 'utf8'));
  const words = s => s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  let worst = 0, runs = 0, total = words($('main').text());
  $('main p').each((_, p) => {
    if ($(p).prev().is('p') || $(p).closest('[hidden]').length) return;
    let n = 0, el = $(p);
    while (el.length && el.is('p')) { n += words(el.text()); el = el.next(); }
    if (n > 180) runs++; worst = Math.max(worst, n);
  });
  out.push({ page: rel, total, worstRun: worst, runsOver180: runs });
}
out.sort((a, b) => b.worstRun - a.worstRun);
console.table(out.slice(0, 30));
console.log('pages with a run over 180 words:', out.filter(o => o.runsOver180).length, 'of', out.length);
