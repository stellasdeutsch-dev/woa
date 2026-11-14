// Turn crawled olympians.org HTML into clean JSON content for the Astro site.
// Text is kept verbatim; only markup is cleaned.
// LANG_SITE=fr|es node scripts/extract.mjs reads data/raw-<lang>/ and writes src/data/<name>.<lang>.json;
// page links in that language get the /<lang> prefix (pages missing in it point to English).
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { mapPath } from './paths.mjs';

const LANG = process.env.LANG_SITE || '';
const SUF = LANG ? '.' + LANG : '';
const PFX = LANG ? '/' + LANG : '';
const RAW = LANG ? `data/raw-${LANG}` : 'data/raw';
const NOA_DIR = LANG ? `data/noa-${LANG}` : 'data/noa';
const OUT = 'src/data';
fs.mkdirSync(OUT, { recursive: true });
const index = JSON.parse(fs.readFileSync(LANG ? `data/crawl-index.${LANG}.json` : 'data/crawl-index.json', 'utf8'));
const fileFor = (p) => path.join(RAW, (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/[\/?=&]/g, '__')) + '.html');
const DOC = /\.(pdf|docx?|xlsx?|pptx?|zip)$/i;
const neededAssets = new Set();
const externalImgs = new Set();

const ALLOWED = {
  p: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], ul: [], ol: [], li: [], a: ['href', 'target'],
  strong: [], b: [], em: [], i: [], small: [], br: [], img: ['src', 'alt'], table: [], thead: [], tbody: [], tr: [],
  td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], blockquote: [], figure: [], figcaption: [], sup: [], sub: [], hr: [],
  form: [], fieldset: [], legend: [], label: ['for'], input: ['type', 'name', 'placeholder', 'required', 'value', 'id', 'autocomplete', 'maxlength'],
  section: ['id', 'class'], select: ['name', 'required', 'multiple', 'id'], option: ['value', 'selected', 'disabled'], textarea: ['name', 'required', 'rows', 'placeholder'], button: ['type', 'data-tab'], u: [], span: [],
};

function ytId(src) { const m = String(src).match(/(?:embed\/|v=|youtu\.be\/)([\w-]{6,})/); return m ? m[1] : null; }

function rewriteUrl(u) {
  if (!u) return u;
  u = u.trim();
  if (/^(mailto:|tel:|#)/i.test(u)) return u;
  try {
    const url = new URL(u, 'https://olympians.org/');
    if (url.hostname === 'olympians.org' || url.hostname === 'www.olympians.org') {
      let p = decodeURI(url.pathname);
      if (DOC.test(p) || /\.(jpe?g|png|gif|webp|svg)$/i.test(p)) { neededAssets.add(p); return '{{BASE}}' + encodeURI(p); }
      return '{{BASE}}' + PFX + mapPath(p, url.search) + url.hash;
    }
    return url.href;
  } catch { return u; }
}

// Clean an HTML fragment, demoting headings by `shift` levels.
function clean($, root, shift = 1) {
  const $r = $(root);
  $r.find('script,style,noscript,link,meta').remove();
  // JS tabs (ul.menu a[data-tab] + div#id.content) -> static tabset with a heading per panel
  $r.find('ul.menu').each((_, ul) => {
    const tabs = $(ul).find('a[data-tab]').map((_, a) => ({ id: $(a).attr('data-tab'), label: $(a).text().trim() })).get();
    if (!tabs.length) return;
    const panels = tabs.map(t => { const d = $r.find('#' + t.id).first(); const inner = d.html() || ''; d.remove(); return `<section class="tab-panel" id="${t.id}"><h1 class="tab-title">${t.label}</h1>${inner}</section>`; });
    $(ul).replaceWith(`<div class="tabset"><div class="tabset-nav">${tabs.map(t => `<button type="button" data-tab="${t.id}">${t.label}</button>`).join('')}</div>${panels.join('')}</div>`);
  });
  // spam-trap field (hidden on the original) and language switch that has no target here
  $r.find('input[name="Rating"]').each((_, el) => { const l = $(el).prevAll('label').first(); if (/^\s*Rating\s*$/.test(l.text())) l.remove(); $(el).remove(); });
  $r.find('.language-selector').remove();
  // photos given as CSS backgrounds (WOF speakers/attendees) -> real images, stored locally
  $r.find('[style*="background-image"]').each((_, el) => {
    const m = ($(el).attr('style') || '').match(/url\(['"]?([^'")]+)/); if (!m) return;
    let src = m[1];
    const u = new URL(src, 'https://olympians.org/');
    if (u.hostname === 'crm.thewoa.org') { externalImgs.add(u.href); src = '/crm' + u.pathname; }
    $(el).replaceWith(`<img src="${src}" alt="">`);
  });
  // stray "?" characters left between list items on the original
  $r.find('li').each((_, li) => { $(li).contents().each((_, c) => { if (c.type === 'text' && c.data.trim() === '?') $(c).remove(); }); });
  $r.find('iframe').each((_, el) => {
    const src = $(el).attr('src') || '';
    const id = ytId(src);
    if (id) $(el).replaceWith(`<div class="video" data-yt="${id}"></div>`);
    else if (/facebook\.com/.test(src)) $(el).replaceWith(`<div class="video" data-fb="${encodeURIComponent(src)}"></div>`);
    else $(el).replaceWith(`<p><a href="${src}" target="_blank">${src}</a></p>`);
  });
  // headings: demote
  const walk = (el) => {
    $(el).contents().each((_, c) => {
      if (c.type === 'comment') { $(c).remove(); return; }
      if (c.type !== 'tag') return;
      walk(c);
      let name = c.name.toLowerCase();
      if (/^h[1-6]$/.test(name)) { const n = Math.min(6, +name[1] + shift); c.name = 'h' + n; name = c.name; }
      if (name === 'div' && ($(c).hasClass('video') || $(c).hasClass('tabset') || $(c).hasClass('tabset-nav'))) { const k = $(c).attr('class'); for (const a of Object.keys(c.attribs || {})) if (!/^(class|data-yt|data-fb)$/.test(a)) $(c).removeAttr(a); return; }
      if (!ALLOWED[name]) { $(c).replaceWith($(c).contents()); return; }
      const keep = ALLOWED[name];
      const cls = $(c).attr('class') || '';
      for (const a of Object.keys(c.attribs || {})) if (!keep.includes(a)) $(c).removeAttr(a);
      if (/^h[1-6]$/.test(name) && /tab-title/.test(cls)) $(c).attr('class', 'tab-title');
      if (name === 'a') {
        const href = $(c).attr('href') || '';
        if (/^javascript:/i.test(href)) $(c).removeAttr('href');
        else $(c).attr('href', rewriteUrl(href));
        if (DOC.test(href.split('?')[0]) || /download/.test(cls)) $(c).attr('class', 'doc');
      }
      if (name === 'img') $(c).attr('src', rewriteUrl($(c).attr('src')));
      if (name === 'input' && /^(submit|button|image)$/i.test($(c).attr('type') || '')) $(c).replaceWith(`<button type="submit">${$(c).attr('value') || 'Submit'}</button>`);
      if (name === 'input' && /hidden/i.test($(c).attr('type') || '')) $(c).remove();
    });
  };
  walk(root);
  // remove empty paragraphs
  $r.find('p').each((_, p) => { if (!$(p).text().replace(/ /g, ' ').trim() && !$(p).find('img,.video,input,select,textarea,button').length) $(p).remove(); });
  let html = $r.html() || '';
  html = html.replace(/&nbsp;/g, ' ').replace(/\s+\n/g, '\n').trim();
  return html;
}

const text = ($, el) => $(el).text().replace(/\s+/g, ' ').trim();
const parseDate = (s) => { const m = String(s).match(/(\d{1,2})\s*\|\s*(\d{1,2})\s*\|\s*(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };

function bgOf(html) { const m = html.match(/id="background"[^>]*url\('?([^')?]+)/); if (m) { neededAssets.add(m[1]); return '{{BASE}}' + m[1]; } return null; }

const pages = [], news = [], practices = [];
const listMeta = {}; // id -> {excerpt,date,img} from listing pages

for (const { path: p, status } of index) {
  if (status !== 200) continue;
  const f = fileFor(p);
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8');
  const $ = cheerio.load(raw);
  // listing pages: harvest meta only
  if (/^\/(news|best-practices)\/(\?StartRow=\d+)?$/.test(p) || p === '/news/' || p === '/best-practices/') {
    $('#home li').each((_, li) => {
      const a = $(li).find('a').first(); const href = a.attr('href') || '';
      const id = (href.match(/\/news\/(\d+)\//) || href.match(/[?&]id=(\d+)/) || [])[1];
      if (!id) return;
      const img = $(li).find('img').attr('src') || ($(li).attr('style') || '').match(/url\('?([^')]+)/)?.[1];
      listMeta[id] = { date: parseDate(text($, $(li).find('.date'))), img };
    });
    continue;
  }
  if (p === '/') continue; // home built from news data
  const title = text($, $('.title h1').first()) || text($, $('title')).replace(/\s*\|.*$/, '');
  const section = text($, $('.title h2').first());
  const tabs = $('#ternav a').map((_, a) => ({ label: text($, a), href: rewriteUrl($(a).attr('href')), selected: $(a).hasClass('selected') })).get();
  const bg = bgOf(raw);
  const date = parseDate(text($, $('p.date').first()));
  $('.title').remove(); $('p.date').remove(); $('#ternav').remove();
  let main = $('.left_col').first();
  if (!main.length) main = $('.whole_col').first();
  if (!main.length) main = $('#content').first();
  if (!main.length) main = $('#page').first();
  if (!main.length) main = $('body');
  const side = $('.right_col').first();
  const relatedLinks = side.find('#related a').map((_, a) => rewriteUrl($(a).attr('href'))).get();
  side.find('#related').remove();
  const downloads = side.find('a').map((_, a) => ({ label: text($, a), href: rewriteUrl($(a).attr('href')) })).get().filter(d => d.label);
  const sideHtml = side.length ? clean($, side.clone().get(0), 1) : '';
  const body = clean($, main.get(0), 1);
  const desc = $('meta[name="Description"]').attr('content') || '';
  const newsM = p.match(/^\/news\/(\d+)\//);
  const bpM = p.match(/^\/best-practices\/([^/?]+)\/?/);
  if (/Page not found/i.test(title)) continue;
  const [pp, qq] = p.split('?');
  const rec = { path: PFX + mapPath(pp, qq ? '?' + qq : ''), orig: p, title, section, date, bg, tabs, body, side: sideHtml, downloads, related: relatedLinks, desc };
  if (newsM) news.push({ ...rec, id: +newsM[1] });
  else if (bpM && bpM[1] !== 'submissions') practices.push({ ...rec, slug: bpM[1] });
  else pages.push(rec);
}

// NOA directory
const noas = fs.readFileSync('data/noa/list.txt', 'utf8').trim().split('\n').map(l => {
  const [code, country] = l.split('|');
  const $ = cheerio.load(fs.readFileSync(fs.existsSync(`${NOA_DIR}/c_${code}.html`) ? `${NOA_DIR}/c_${code}.html` : `data/noa/c_${code}.html`, 'utf8'));
  const flag = $('.flag img').attr('src'); if (flag) neededAssets.add(flag);
  const h1 = $('h1').first(); const name = text($, h1.find('strong'));
  const fields = $('h3').map((_, h) => { const label = text($, $(h).find('strong').first()); $(h).find('strong').first().remove(); $(h).find('br').first().remove();
    $(h).find('br').replaceWith('\n');
    const links = $(h).find('a').map((_, a) => ({ text: text($, a), href: $(a).attr('href') })).get();
    return { label, value: $(h).text().split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean), links }; }).get();
  const olyField = fields.find(f => /registered for OLY/i.test(f.label));
  return { code, country: country.trim(), name, flag: flag ? '{{BASE}}' + flag : null, fields, olyCount: olyField ? +olyField.value.join('').replace(/\D/g, '') : null };
});

// Leadership
{
  const $ = cheerio.load(fs.readFileSync(fileFor('/woa/leadership/'), 'utf8'));
  const honorary = $('.right_col > h2').filter((_, h) => $(h).find('strong').length).map((_, h) => {
    const name = text($, $(h).find('strong')); $(h).find('strong').remove(); return { name, role: text($, h) }; }).get();
  const people = $('#leadership-v2 > li').map((_, li) => {
    const img = $(li).find('img').attr('src'); neededAssets.add(img);
    const h = $(li).find('h1').first();
    const role = text($, h.find('strong')); const meta = text($, h.find('small').eq(1));
    h.find('strong').remove(); h.find('small').eq(1).remove();
    const name = text($, h);
    $(li).find('img').remove(); h.remove();
    return { name, meta, role, img: '{{BASE}}' + img, bio: clean($, li, 1) };
  }).get();
  fs.writeFileSync(`${OUT}/leadership${SUF}.json`, JSON.stringify({ honorary, people }, null, 1));
}

const excerpt = (html) => { const $ = cheerio.load(html); const t = $('p').map((_, p) => text($, p)).get().find(s => s.length > 40) || ''; return t; };
for (const n of news) { const m = listMeta[n.id] || {}; n.date = n.date || m.date; n.img = m.img ? rewriteUrl(m.img) : (fs.existsSync(`public/newsimages2/${n.id}.webp`) ? `{{BASE}}/newsimages2/${n.id}.webp` : n.bg); n.excerpt = excerpt(n.body); }
for (const n of practices) { const id = (n.path.match(/id=(\d+)/) || [])[1]; const m = (id && listMeta[id]) || {}; n.date = n.date || m.date; n.img = m.img ? rewriteUrl(m.img) : n.bg; n.excerpt = excerpt(n.body); }
news.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
practices.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

let redirects = [];
if (!LANG) {
// de-duplicate alias pages (same body) -> redirects
const NAV_ORDER = ['/woa/about/', '/noas/noa-guide/', '/noas/noa-directory/', '/noas/grants/', '/olympians/oly/', '/olympians/olympians-for-life/', '/olympians/olympian-org-email/register/'];
const byBody = new Map();
const ordered = [...pages].sort((a, b) => { const ia = NAV_ORDER.indexOf(a.path), ib = NAV_ORDER.indexOf(b.path); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
const unique = [];
for (const pg of ordered) { const k = pg.title + '|' + pg.body; if (pg.body.length > 200 && byBody.has(k)) { redirects.push({ from: pg.path, to: byBody.get(k) }); continue; } byBody.set(k, pg.path); unique.push(pg); }
pages.length = 0; pages.push(...unique.filter(p => p.path !== '/olympians/noa-directory/'));
redirects.push({ from: '/olympians/noa-directory/', to: '/noas/noa-directory/' });
// links on the original that point to a page without its year / with a typo
redirects.push({ from: '/oly-house/leave-your-mark/', to: '/oly-house/leave-your-mark/2020/' }, { from: '/oly-house/oly-day/', to: '/oly-house/oly-day/2020/' }, { from: '/olympians/oly-art/', to: '/olympians/oly-arts/' });
} else {
  // same alias pages as in English
  redirects = JSON.parse(fs.readFileSync(`${OUT}/redirects.json`, 'utf8')).map(r => ({ from: PFX + r.from, to: PFX + r.to }));
  const gone = new Set(redirects.map(r => r.from));
  const keep = pages.filter(p => !gone.has(p.path)); pages.length = 0; pages.push(...keep);
}
fs.writeFileSync(`${OUT}/redirects${SUF}.json`, JSON.stringify(redirects, null, 1));
// point links straight at canonical pages; in FR/ES a page that has no translation links to English
const redirMap = new Map(redirects.map(r => ['{{BASE}}' + r.from, '{{BASE}}' + r.to]));
const have = new Set([...pages, ...news, ...practices].map(r => r.path));
const listing = /^\/(fr|es)\/(news|best-practices)\/(page\/\d+\/|\d{4}\/)?$/;
const toEn = (p0) => { if (!LANG || !p0.startsWith('{{BASE}}' + PFX + '/')) return p0; const p = p0.slice(8); if (have.has(p) || listing.test(p) || p === PFX + '/' || redirMap.has(p0)) return p0; return '{{BASE}}' + p.slice(PFX.length); };
const fixLinks = (str) => str.replace(/\{\{BASE\}\}[^"'\s)]+/g, (m) => { const [p0, h] = m.split('#'); return toEn(redirMap.get(p0) || p0) + (h ? '#' + h : ''); });
for (const coll of [pages, news, practices]) for (const r of coll) { r.body = fixLinks(r.body); r.side = fixLinks(r.side); r.tabs.forEach(t => t.href = fixLinks(t.href)); r.related = r.related.map(fixLinks); r.downloads.forEach(d => d.href = fixLinks(d.href)); }
fs.writeFileSync(`${OUT}/pages${SUF}.json`, JSON.stringify(pages, null, 1));
fs.writeFileSync(`${OUT}/news${SUF}.json`, JSON.stringify(news));
fs.writeFileSync(`${OUT}/practices${SUF}.json`, JSON.stringify(practices));
fs.writeFileSync(`${OUT}/noas${SUF}.json`, JSON.stringify(noas, null, 1));
fs.writeFileSync(`data/external-images${SUF}.json`, JSON.stringify([...externalImgs].sort(), null, 1));
fs.writeFileSync(`data/needed-assets${SUF}.json`, JSON.stringify([...neededAssets].sort(), null, 1));
console.log({ lang: LANG || 'en', pages: pages.length, news: news.length, practices: practices.length, noas: noas.length, assets: neededAssets.size });
