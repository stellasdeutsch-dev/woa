// Reads the published content from Strapi and writes src/data/*.json in the exact shape the site uses.
// Usage:  CMS_URL=https://cms.example.org node scripts/cms-pull.mjs            write the files
//         CMS_URL=http://localhost:1337 node scripts/cms-pull.mjs --check   only compare with the files in git
// CMS_TOKEN (optional) is a read-only API token; without it the public REST API is used.
// A file uploaded by an editor (not one imported from the site) is downloaded to public/cms-media/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CMS = (process.env.CMS_URL || 'http://localhost:1337').replace(/\/$/, '');
const TOKEN = process.env.CMS_TOKEN || '';
const CHECK = process.argv.includes('--check');
const OUT = 'src/data';
const LANGS = ['en', 'fr', 'es'];
const SUF = { en: '', fr: '.fr', es: '.es' };

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {} });
    if (res.ok) return res.json();
    if (i === 3) throw new Error(`${res.status} ${url}\n${await res.text()}`);
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
}
async function all(plural, locale, populate = '') {
  const out = [];
  for (let page = 1; ; page++) {
    const j = await get(`${CMS}/api/${plural}?locale=${locale}&pagination[page]=${page}&pagination[pageSize]=100${populate}`);
    out.push(...j.data);
    if (page >= j.meta.pagination.pageCount) break;
  }
  return out;
}

// media: an imported file keeps its site path in the caption; anything else was uploaded in the CMS
const downloaded = [];
async function fileRef(m, fallback) {
  if (!m) return fallback ?? null;
  if (m.caption && m.caption.startsWith('{{BASE}}/')) return m.caption;
  const ext = path.extname(m.url || m.name || '').toLowerCase() || '.bin';
  const name = `${crypto.createHash('sha1').update(String(m.hash || m.url)).digest('hex').slice(0, 12)}${ext}`;
  const file = path.join('public/cms-media', name);
  if (!CHECK && !fs.existsSync(file)) {
    const src = /^https?:/.test(m.url) ? m.url : CMS + m.url;
    const res = await fetch(src); if (!res.ok) throw new Error(`media ${res.status} ${src}`);
    fs.mkdirSync('public/cms-media', { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    downloaded.push(file);
  }
  return `{{BASE}}/cms-media/${name}`;
}

// bodies are stored as HTML; text written in Markdown in the CMS becomes HTML here
let md = null;
try { md = (await import('micromark')).micromark; } catch {}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (s) => {
  if (s == null) return s;
  if (!s.trim() || /<[a-z!][^>]*>/i.test(s)) return s;
  // plain text without Markdown marks stays as it is (short captions like "in alphabetical order")
  if (!/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>)/m.test(s) && !/\*\*|__|\[[^\]]+\]\([^)]+\)|\n\s*\n/.test(s)) return s;
  return md ? md(s) : s.split(/\n{2,}/).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('\n');
};

const POP_STORY = '&populate[hero]=true&populate[tabs]=true&populate[downloads][populate][file]=true';
async function story(x, kind) {
  const o = {
    path: x.path, orig: x.orig, title: x.title, section: x.section, date: x.date, bg: await fileRef(x.hero, x.bg),
    tabs: (x.tabs || []).map(t => ({ label: t.label, href: t.href, selected: !!t.selected })),
    body: html(x.body), side: html(x.side),
    downloads: await Promise.all((x.downloads || []).map(async d => ({ label: d.label, href: d.file ? await fileRef(d.file, d.href) : d.href }))),
    related: x.related || [], desc: x.desc,
  };
  if (kind === 'news') Object.assign(o, { id: x.news_id, img: await fileRef(x.image, x.img), excerpt: x.excerpt });
  if (kind === 'practice') Object.assign(o, { slug: x.slug, img: await fileRef(x.image, x.img), excerpt: x.excerpt });
  return o;
}
const byPosition = (nullsFirst) => (a, b) => (a.position ?? (nullsFirst ? -1 : 1e9)) - (b.position ?? (nullsFirst ? -1 : 1e9));
const newsOrder = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || byPosition(true)(a, b);

const files = {};
const raw = {};
for (const [kind, plural, file] of [['page', 'pages', 'pages'], ['news', 'news-items', 'news'], ['practice', 'practices', 'practices']]) {
  for (const l of LANGS) {
    const list = await all(plural, l, POP_STORY + (kind === 'page' ? '' : '&populate[image]=true'));
    raw[`${file}.${l}`] = list;
    list.sort(kind === 'news' ? newsOrder : byPosition(kind === 'practice'));
    files[`${file}${SUF[l]}.json`] = await Promise.all(list.map(x => story(x, kind)));
  }
}
// translated news and best practices <-> English article
const xlang = { fr: {}, es: {} };
for (const file of ['news', 'practices']) {
  const en = new Map(raw[`${file}.en`].map(x => [x.documentId, x.path]));
  for (const l of ['fr', 'es']) for (const x of raw[`${file}.${l}`]) if (en.has(x.documentId)) xlang[l][x.path] = en.get(x.documentId);
}
files['xlang.json'] = xlang;

for (const l of LANGS) {
  const noas = (await all('noas', l, '&populate[fields]=true')).sort(byPosition(false));
  files[`noas${SUF[l]}.json`] = noas.map(n => ({ code: n.code, country: n.country, name: n.name, flag: n.flag,
    fields: (n.fields || []).map(f => ({ label: f.label, value: (f.value || '').split('\n').map(s => s.trim()).filter(Boolean), links: f.links || [] })), olyCount: n.olyCount }));
  const people = (await all('leaders', l, '&populate[photo]=true')).sort((a, b) => a.order - b.order);
  const honorary = (await all('honorary-members', l)).sort((a, b) => a.order - b.order);
  files[`leadership${SUF[l]}.json`] = { honorary: honorary.map(h => ({ name: h.name, role: h.role })),
    people: await Promise.all(people.map(async p => ({ name: p.name, meta: p.meta, role: p.role, img: await fileRef(p.photo, p.img), bio: html(p.bio) }))) };
  files[`redirects${SUF[l]}.json`] = (await all('redirects', l)).sort((a, b) => a.order - b.order).map(r => ({ from: r.from, to: r.to }));
}

// menu, interface texts, contact email and social links
{
  const navEn = (await all('nav-items', 'en', '&populate[parent]=true')).sort((a, b) => a.order - b.order);
  const node = (n) => { const kids = navEn.filter(c => c.parent?.documentId === n.documentId); const o = { label: n.label, href: n.href }; if (n.icon) o.icon = n.icon; if (kids.length) o.children = kids.map(node); return o; };
  const nav = navEn.filter(n => !n.parent).map(node);
  const order = navEn.map(n => n.href);
  const navLabel = { fr: {}, es: {} };
  for (const l of ['fr', 'es']) for (const n of (await all('nav-items', l)).sort((a, b) => order.indexOf(a.href) - order.indexOf(b.href))) navLabel[l][n.href] = n.label;
  const ui = {};
  for (const l of LANGS) { ui[l] = {}; for (const u of (await all('ui-strings', l)).sort((a, b) => a.order - b.order)) ui[l][u.key] = u.value; }
  const settings = (await get(`${CMS}/api/site-setting?populate[social]=true`)).data;
  files['site.json'] = { nav, navLabel, social: (settings.social || []).map(s => ({ label: s.label, href: s.href, icon: s.icon })), email: settings.email, ui };
}

// 13 · FAQ: the FAQ page text is built from its questions (one <h3> question, then the answer)
{
  const byPage = new Map();
  for (const l of LANGS) for (const q of await all('faqs', l)) { if (!q.page) continue; (byPage.get(q.page) || byPage.set(q.page, []).get(q.page)).push(q); }
  for (const [pagePath, list] of byPage) {
    const file = `pages${SUF[(pagePath.match(/^\/(fr|es)\//) || [])[1] || 'en']}.json`;
    const page = files[file]?.find(p => p.path === pagePath);
    if (page) page.body = list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(q => `${q.question ? `<h3>${q.question}</h3>` : ''}${html(q.answer) || ''}`).join('');
  }
}

// 11 · Videos: titles and covers (a cover uploaded in the CMS replaces the YouTube picture)
{
  const videos = {};
  for (const v of (await all('videos', 'en', '&populate[thumbnail]=true')).sort((a, b) => a.youtube_id.localeCompare(b.youtube_id))) {
    videos[v.youtube_id] = { title: v.title || null, cover: v.thumbnail ? await fileRef(v.thumbnail) : null };
  }
  files['videos.json'] = videos;
}

// 12 · Documents: a file uploaded in the library replaces the original file on every page that links to it
{
  const swap = [];
  for (const d of await all('documents', 'en', '&populate[file]=true')) {
    if (!d.site_path || !d.file || (d.file.caption && d.file.caption.startsWith('{{BASE}}/'))) continue;
    swap.push([d.site_path, await fileRef(d.file)]);
  }
  if (swap.length) for (const name of Object.keys(files).filter(n => /^(pages|news|practices)(\.(fr|es))?\.json$/.test(n))) {
    let text = JSON.stringify(files[name]);
    for (const [from, to] of swap) text = text.split(JSON.stringify(from).slice(1, -1)).join(JSON.stringify(to).slice(1, -1));
    files[name] = JSON.parse(text);
  }
}

// compare (objects ignore key order, arrays keep it) and write
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
let changed = 0;
for (const [name, value] of Object.entries(files)) {
  const file = path.join(OUT, name);
  const before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const same = before && JSON.stringify(canon(before)) === JSON.stringify(canon(value));
  if (same) continue;
  changed++;
  if (CHECK) {
    const b = Array.isArray(before) ? before : [], a = Array.isArray(value) ? value : [];
    let first = -1; for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(canon(a[i])) !== JSON.stringify(canon(b[i]))) { first = i; break; }
    console.log(`DIFF ${name}: ${Array.isArray(value) ? `${b.length} -> ${a.length} items, first difference at #${first}` : 'object differs'}`);
    if (first >= 0) { const x = canon(b[first]) || {}, y = canon(a[first]) || {}; for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) console.log(`  ${k}: ${JSON.stringify(x[k])?.slice(0, 120)}  ->  ${JSON.stringify(y[k])?.slice(0, 120)}`); }
  } else fs.writeFileSync(file, JSON.stringify(value, null, 1) + '\n');
}
console.log(`${CHECK ? 'checked' : 'written'}: ${Object.keys(files).length} files, ${changed} ${CHECK ? 'differ' : 'changed'}${downloaded.length ? `, ${downloaded.length} new media files` : ''}`);
if (CHECK && changed) process.exitCode = 1;
