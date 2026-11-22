// NOA Guide chapters: visual layers built from each chapter's own text, in every language (no new words or numbers).
// Overview: the six topic areas as cards that open their chapter. Branding: the Olympic properties as icon tiles,
// the logo rules as do / don't. Project Delivery: the three grant categories as cards with one coin per grant.
// Leadership: the Executive Committee numbers as figures. Finance: running costs as cards, funding sources as tiles.
// Stakeholders: the three aims as cards, the two relationship lists as numbered stages with an arrow between them.
import type { CheerioAPI } from 'cheerio';

const icon = (id: string, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const plain = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CHAPTERS: [string, string, RegExp][] = [
  ['member-engagement', 'chat', /membre|miembro|member/i],
  ['branding-and-marketing', 'design', /brand|marque|asociación con la WOA/i],
  ['project-delivery', 'target', /project|projet|Servicio a/i],
  ['leadership-and-governance', 'leadership', /leadership|liderazgo/i],
  ['finance-management', 'grant', /financ/i],
  ['stakeholder-engagement', 'friendship', /stakeholder|parties prenantes|partes interesadas/i],
];

const NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8,
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
};
const ONE = new Set(['one', 'un', 'une', 'uno', 'una']);
const STOP = new Set(['of', 'the', 'and', 'with', 'that', 'to', 'should', 'du', 'de', 'des', 'et', 'dont', 'par', 'que', 'qui', 'les', 'del', 'la', 'y', 'con', 'por', 'una', 'un']);

type Tab = { href: string; label: string };

// take a block out of its two-column panel flow so it can use the full width: panels before and after it stay in columns
function fullWidth($: CheerioAPI, el: any) {
  const grid = el.parent('.vb-panels'); if (!grid.length) return;
  const after = el.nextAll();
  grid.after(el); el.addClass('gd-wide');
  if (after.length) { const g2 = $('<div></div>').attr('class', grid.attr('class') || 'vb-panels'); el.after(g2); g2.append(after); }
  if (!grid.children().length) grid.remove();
  [grid, el.next('.vb-panels')].forEach(g => { if (g.length && g.children().length === 1) g.addClass('one-col'); });
}

export function guideVisual($: CheerioAPI, slug: string, tabs: Tab[]) {
  const r = $.root();
  r.find('ul, ol').filter((_: number, u: any) => !$(u).children().length).remove();
  if (slug === '') overview($, r, tabs);
  if (slug === 'branding-and-marketing') branding($, r);
  if (slug === 'project-delivery') grants($, r);
  if (slug === 'leadership-and-governance') committee($, r);
  if (slug === 'finance-management') finance($, r);
  if (slug === 'stakeholder-engagement') stakeholders($, r);
}

function overview($: CheerioAPI, r: any, tabs: Tab[]) {
  const ol = r.find('ol').filter((_: number, o: any) => $(o).children('li').length === 6).first();
  if (!ol.length) return;
  const cards = ol.children('li').toArray().map((li: any, i: number) => {
    const $li = $(li); const text = plain($li.text());
    const a = $li.find('a').first(); const href = a.attr('href') || '';
    const ch = CHAPTERS.find(([s]) => href.includes(`/noa-guide/${s}/`)) || CHAPTERS.find(([, , rx]) => rx.test(text));
    if (!ch) return null;
    const tab = tabs.find(t => t.href.includes(`/noa-guide/${ch[0]}/`));
    const m = text.match(/^(.+?)\s*:\s*(.+)$/);
    const title = m ? m[1] : tab?.label || '';
    const desc = m ? m[2] : text;
    return `<li><a class="vb-card gd-topic" href="${esc(href || tab?.href || '#')}"><span class="gd-topic-top"><span class="vb-ico">${icon(ch[1])}</span><span class="gd-topic-n">${i + 1}</span></span><h3>${esc(title)}</h3><p>${esc(desc)}</p>${icon('arrow', 'icon gd-go')}</a></li>`;
  });
  if (cards.some(c => !c)) return;
  ol.replaceWith(`<ol class="vb-cards cols-3 gd-topics">${cards.join('')}</ol>`);
}

const PROP_ICON = ['rings', 'flag', 'quote', 'anthem', 'words', 'torch', 'list'];
const DONT = /^(DON.?T\b|NO\s|N(e|’|')\s?.*\bpas\b)/;

function branding($: CheerioAPI, r: any) {
  const props = r.find('ul').filter((_: number, u: any) => $(u).children('li').length === 7 && /ymbol|ímbolo/i.test($(u).children('li').first().text())).first();
  if (props.length) {
    const tiles = props.children('li').toArray().map((li: any, i: number) => `<li class="vb-card gd-prop"><span class="vb-ico">${icon(PROP_ICON[i])}</span><p>${esc(plain($(li).text()))}</p></li>`).join('');
    props.replaceWith(`<ul class="vb-cards gd-props">${tiles}</ul>`);
  }
  // the logo rules: the last list on the page, under a heading about the logo
  const rules = r.find('.vb-panel').filter((_: number, p: any) => /logo|hacer/i.test($(p).find('.vb-panel-head').text())).last().find('ul.vb-list').first();
  if (rules.length && rules.children('li').length >= 3) {
    rules.addClass('gd-dodont').removeClass('vb-list-grid');
    rules.children('li').each((_: number, li: any) => {
      const dont = DONT.test(plain($(li).text()));
      $(li).addClass(dont ? 'gd-dont' : 'gd-do');
      $(li).find('.vb-check').first().replaceWith(`<span class="gd-mark" aria-hidden="true">${icon(dont ? 'close' : 'check')}</span>`);
    });
  }
}

const AMT = /(\$\s?\d[\d,.]*(?:\s?USD)?|USD\s?\d[\d.,]*|\d[\d .,]*\d\s?USD)/;
const GRANT_ICON = ['directory', 'oly', 'solidarity'];

function grants($: CheerioAPI, r: any) {
  const ul = r.find('ul').filter((_: number, u: any) => { const lis = $(u).children('li'); return lis.length === 3 && lis.toArray().every((li: any) => $(li).find('strong').length > 0 && AMT.test(plain($(li).text()))); }).first();
  if (!ul.length) return;
  const cards = ul.children('li').toArray().map((li: any, i: number) => {
    const $li = $(li); $li.find('.vb-check').remove();
    const strongs = $li.find('strong').not('.fact').toArray().map((s: any) => plain($(s).text())).filter(Boolean);
    const text = plain($li.text());
    // the label is the bold words up to the dash or colon; everything after it is the value, kept as written
    const cut = text.search(/\s[-–]\s|\s?:\s|\s[-–](?=\S)|\s-(?=\s)/);
    const label = (cut > 0 ? text.slice(0, cut) : strongs.join(' ')).replace(/[\s:–-]+$/, '');
    const value = text.slice(label.length).replace(/^[\s:–-]+/, '');
    const n = parseInt(value.match(/^(\d+)\s*(?:x|×|subventions|subsidios|grants)\b/i)?.[1] || '1', 10);
    const v = esc(value).replace(AMT, '<strong class="gd-amt">$1</strong>');
    const coins = Array.from({ length: Math.min(n, 10) }, () => '<i></i>').join('');
    return `<li class="vb-card gd-grant"><span class="vb-ico">${icon(GRANT_ICON[i])}</span><h3>${esc(label)}</h3><p>${v}</p><span class="gd-coins" aria-hidden="true">${coins}</span></li>`;
  });
  ul.replaceWith(`<ul class="vb-cards cols-3 gd-grants">${cards.join('')}</ul>`);
}

function committee($: CheerioAPI, r: any) {
  const p = r.find('.vb-step').first().find('.vb-panel').first().find('p').first();
  if (!p.length) return;
  const W = Object.keys(NUM).join('|');
  const rx = new RegExp(`(?:\\b(at least|more than|au moins|plus de|al menos|no mayor a)\\s+)?\\b(${W})(?:\\s+(?:to|à|a)\\s+(${W}))?\\s+(?=((?:[\\p{L}’']+\\s*){1,4}))`, 'giu');
  const figs: { pre: string; n: string; what: string; src: string }[] = [];
  for (const m of plain(p.text()).matchAll(rx)) {
    const a = m[2].toLowerCase(), b = m[3]?.toLowerCase();
    if (ONE.has(a) && !m[1]) continue;
    const words: string[] = [];
    for (const w of m[4].trim().split(/\s+/)) { if (STOP.has(w.toLowerCase())) break; words.push(w); }
    if (!words.length) continue;
    figs.push({ pre: m[1] || '', n: b ? `${NUM[a]}–${NUM[b]}` : String(NUM[a]), what: words.join(' '), src: m[0].trim() });
  }
  if (figs.length < 3) return;
  // the same numbers stay highlighted in the sentence
  let html = p.html() || '';
  for (const f of figs) html = html.replace(new RegExp(`(^|[^>\\p{L}])(${f.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}<])`, 'u'), '$1<strong class="fact">$2</strong>');
  p.html(html);
  const cards = figs.map(f => `<li><div class="vb-tl-fig"><strong class="tl-fig-n">${f.pre ? `<small>${esc(f.pre)}</small> ` : ''}${f.n}</strong><span class="tl-fig-w">${esc(f.what)}</span></div></li>`).join('');
  // full width above the chapter's panels, so five figures fit in one row
  const grid = p.closest('.vb-panels');
  (grid.length ? grid : p).before(`<ul class="tl-figs gd-figs">${cards}</ul>`);
}

const COST_ICON = ['columns', 'house', 'target', 'social'];

function finance($: CheerioAPI, r: any) {
  const costs = r.find('ul').filter((_: number, u: any) => { const lis = $(u).children('li'); return lis.length === 4 && lis.toArray().every((li: any) => /:/.test($(li).text())) && /^admin/i.test(plain(lis.first().text())); }).first();
  if (costs.length) {
    const cards = costs.children('li').toArray().map((li: any, i: number) => {
      const t = plain($(li).text()); const k = t.indexOf(':');
      return `<li class="vb-card gd-cost"><span class="vb-ico">${icon(COST_ICON[i])}</span><h3>${esc(t.slice(0, k).trim())}</h3><p>${esc(t.slice(k + 1).trim())}</p></li>`;
    }).join('');
    const ul = $(`<ul class="vb-cards gd-costs">${cards}</ul>`);
    costs.replaceWith(ul);
    const panel = ul.closest('.vb-panel'); if (panel.length) fullWidth($, panel);
  }
  // where funds can come from: one tile per source, the NOC tile keeps its own list
  const src = r.find('ul').filter((_: number, u: any) => $(u).children('li').length >= 6 && $(u).children('li').children('ul').length === 1).first();
  if (src.length) {
    src.addClass('gd-sources');
    src.children('li').each((_: number, li: any) => { const sub = $(li).children('ul'); if (!sub.length) return; $(li).addClass('gd-src-wide'); sub.addClass('gd-src-sub').children('li').prepend('<span class="gd-dot" aria-hidden="true"></span>'); });
  }
}

const AIM_ICON = ['news', 'grant', 'target'];

function stakeholders($: CheerioAPI, r: any) {
  const aims = r.find('ul').filter((_: number, u: any) => $(u).children('li').length === 3).first();
  if (aims.length && !aims.find('a').length) {
    const cards = aims.children('li').toArray().map((li: any, i: number) => `<li class="vb-card gd-aim"><span class="vb-ico">${icon(AIM_ICON[i])}</span><p>${esc(plain($(li).text()))}</p></li>`).join('');
    aims.replaceWith(`<ul class="vb-cards cols-3 gd-aims">${cards}</ul>`);
  }
  // two relationship lists in a row (build a new one, strengthen an existing one) -> numbered stages
  const panels = r.find('.vb-panel').toArray();
  for (let i = 0; i < panels.length - 1; i++) {
    const a = $(panels[i]), b = $(panels[i + 1]);
    if (a.next()[0] !== panels[i + 1]) continue;
    const la = a.children('ul.vb-list'), lb = b.children('ul.vb-list');
    if (la.children('li').length < 4 || lb.children('li').length < 4) continue;
    const box = $('<div class="gd-stages"></div>');
    a.before(box);
    box.append(a, `<span class="gd-stage-arrow" aria-hidden="true">${icon('arrow')}</span>`, b);
    [la, lb].forEach(l => { l.addClass('gd-stage-list').removeClass('vb-list-grid'); l.children('li').each((k: number, li: any) => { $(li).find('.vb-check').first().replaceWith(`<span class="gd-n" aria-hidden="true">${k + 1}</span>`); }); });
    a.addClass('gd-stage'); b.addClass('gd-stage');
    fullWidth($, box);
    break;
  }
}

// Best Practices: the six groups get an index with counts and a heading with an icon; every practice becomes a card
// with its photo (or an icon for its kind), the country with its flag, the text, "Label: value" lines as figures,
// and its documents and links. All words stay as written.
export type FlagFor = (name: string) => { src: string; w: number; h: number } | null;
const SECTION_ICON = ['chat', 'design', 'target', 'leadership', 'grant', 'friendship'];
const KIND: [RegExp, string][] = [
  [/twitter/i, 'x'], [/facebook/i, 'facebook'], [/whats\s?app/i, 'chat'],
  [/newsletter|bulletin|hoja informativa/i, 'newsletter'], [/magazine|revista|newspaper|journal|diario/i, 'news'],
  [/website|site internet|sitio/i, 'website'], [/\bOLY\b/, 'oly'],
  [/olympic day|journée olympique|día olímpico/i, 'torch'],
  [/society|société|sociedad/i, 'heart'], [/service to olympians|aux olympiens|atletas olímpicos|initiatives|iniciativas/i, 'life'],
  [/network|réseautage|comunicaciones/i, 'forum'], [/regional|régionaux|regionales/i, 'globe'],
  [/terms of reference|termes de référence|términos de referencia/i, 'letter'], [/charity|caritatif|caridad/i, 'gift'],
  [/membership|cotisation|cuotas/i, 'directory'], [/donation|dons|donaciones/i, 'grant'],
  [/social enterprise|entreprise sociale|emprendimiento/i, 'skills'], [/corporate|entreprise|empresa/i, 'alliance'],
  [/\bAC\b|\bCA\b/, 'excellence'], [/shared resources|ressources|recursos/i, 'columns'],
  [/government|gouvernement|gobierno|ministry|ministère|ministerio/i, 'integrity'],
  [/NOC|CNO|CON/, 'friendship'],
];

export function bestPractices($: CheerioAPI, flagFor: FlagFor) {
  const r = $.root();
  const groups: { id: string; title: string; n: number; icon: string }[] = [];
  r.contents().toArray().forEach((node: any) => {
    if (node.type !== 'text') return;
    const title = plain(node.data || ''); if (!title) return;
    const ul = $(node).nextAll().first(); if (!ul.is('ul')) return;
    const i = groups.length; const id = `bp-${i + 1}`;
    const items = ul.children('li').toArray();
    groups.push({ id, title, n: items.length, icon: SECTION_ICON[i] || 'practice' });
    $(node).replaceWith(`<h2 class="bp-head" id="${id}"><span class="vb-ico">${icon(SECTION_ICON[i] || 'practice')}</span><span>${esc(title)}</span><span class="bp-count">${items.length}</span></h2>`);
    const cards = items.map((li: any) => card($, $(li), flagFor)).join('');
    ul.replaceWith(`<ul class="bp-grid">${cards}</ul>`);
  });
  if (groups.length >= 2) {
    const nav = `<nav class="bp-index" aria-label="${esc(groups.map(g => g.title).join(' · ')).slice(0, 120)}">${groups.map(g => `<a class="vb-bp-chip" href="#${g.id}"><span class="vb-ico">${icon(g.icon)}</span><span class="bp-chip-t">${esc(g.title)}</span><span class="bp-count">${g.n}</span></a>`).join('')}</nav>`;
    r.find('h2.bp-head').first().before(nav);
  }
}

function flagsOf(where: string, flagFor: FlagFor) {
  const parts = where.split(/\s*,\s*|\s+and\s+|\s+et\s+|\s+y\s+/).filter(Boolean);
  const found: { src: string; w: number; h: number }[] = [];
  for (const p of parts) {
    const f = flagFor(p);
    if (f) { found.push(f); continue; }
    // names written one after another without commas ("Japon Canada Nouvelle-Zélande")
    const words = p.split(/\s+/);
    for (let a = 0; a < words.length;) {
      let hit = 0;
      for (let b = words.length; b > a; b--) { const g = flagFor(words.slice(a, b).join(' ')); if (g) { found.push(g); hit = b - a; break; } }
      a += hit || 1;
    }
  }
  return found.slice(0, 4);
}

function card($: CheerioAPI, li: any, flagFor: FlagFor) {
  li.find('.vb-check').remove();
  const box = li.children('.vb-li').length ? li.children('.vb-li') : li;
  const img = box.find('img').first();
  const heads = box.find('h1,h2,h3,h4,h5,h6').toArray();
  const kind = heads[0] ? plain($(heads[0]).text()) : '';
  const where = heads[1] ? plain($(heads[1]).text()) : '';
  // a table that only repeats the paragraph above it is left out
  box.find('table').each((_: number, t: any) => { const tt = plain($(t).text()); if (box.find('p').toArray().some((p: any) => !$(p).closest('table').length && plain($(p).text()) === tt)) $(t).remove(); });
  const paras: string[] = []; const stats: [string, string][] = [];
  box.find('p').each((_: number, p: any) => {
    if ($(p).closest('table').length) return;
    const lines = ($(p).html() || '').split(/<br\s*\/?>/i).map(h => h.trim()).filter(h => plain($('<i>' + h + '</i>').text()));
    const keep: string[] = [];
    for (const h of lines) { const t = plain($('<i>' + h + '</i>').text()); const m = t.match(/^([^:]{2,28}):\s*(.+)$/); if (m && !/<a\b/.test(h)) stats.push([m[1], m[2]]); else keep.push(h); }
    if (keep.length) paras.push(keep.join('<br>'));
  });
  const extra = box.find('table').length ? $.html(box.find('table')) : '';
  const docs = box.find('a.doc').toArray().map((a: any) => `<li><a class="vb-bp-doc" href="${esc($(a).attr('href') || '')}" target="_blank" rel="noopener">${icon('doc', 'icon icon-sm')}<span>${esc(plain($(a).text()))}</span></a></li>`).join('');
  const links = box.find('a').not('.doc').toArray().filter((a: any) => !$(a).closest('p').length).map((a: any) => `<a class="vb-bp-link" href="${esc($(a).attr('href') || '')}"${$(a).attr('target') ? ' target="_blank" rel="noopener"' : ''}><span>${esc(plain($(a).text()))}</span>${icon('arrow', 'icon icon-sm')}</a>`).join('');
  const k = KIND.find(([rx]) => rx.test(kind))?.[1] || 'practice';
  const flags = where ? flagsOf(where, flagFor) : [];
  const media = img.length ? `<div class="bp-media"><img src="${esc(img.attr('src') || '')}" alt="" loading="lazy"></div>` : '';
  return `<li class="bp-card${media ? ' has-img' : ''}">${media}<div class="bp-body"><p class="bp-kind"><span class="bp-kind-ico">${icon(k)}</span><span>${esc(kind)}</span></p>`
    + (where ? `<p class="bp-where">${flags.map(f => `<img class="bp-flag" src="${f.src}" alt="" width="${f.w}" height="${f.h}" loading="lazy">`).join('')}<span>${esc(where)}</span></p>` : '')
    + paras.map(p => `<p class="bp-text">${p}</p>`).join('') + extra
    + (stats.length ? `<dl class="bp-stats">${stats.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : '')
    + (docs ? `<ul class="bp-docs">${docs}</ul>` : '') + (links ? `<p class="bp-links">${links}</p>` : '') + `</div></li>`;
}
