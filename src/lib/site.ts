import * as cheerio from 'cheerio';
import { timelineVisual, agendaVisual } from './visual-extra';
import { visualize, foldLongRuns } from './visual';
import fs from 'node:fs';
import { type Lang, t as uiFor } from './i18n';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (p: string) => (/^(https?:|mailto:|tel:|#)/.test(p) ? p : BASE + (p.startsWith('/') ? p : '/' + p));
export const ORIGIN = 'https://olympians.org';

// Navigation: four sections; item labels as on olympians.org. Top items open the section landings.
export type NavItem = { label: string; href: string; icon?: string; children?: NavItem[] };
// menu, social links and contact email come from src/data/site.json (edited in the CMS)
import SITE from '../data/site.json';
import VIDEO_DATA from '../data/videos.json';
export const NAV: NavItem[] = SITE.nav;
export const SOCIAL: { label: string; href: string; icon: string }[] = SITE.social;
export const EMAIL: string = SITE.email;

export const b = (s: string | null | undefined) => (s ?? '').replaceAll('{{BASE}}', BASE);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// titles and covers of the videos come from 11 · Videos in the CMS (src/data/videos.json)
const VIDEOS = VIDEO_DATA as Record<string, { title: string | null; cover: string | null }>;
const attr = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function videoHtml(id: string, lang: Lang = 'en') {
  const v = VIDEOS[id];
  const cover = v?.cover ? b(v.cover) : fs.existsSync(`public/yt/${id}.jpg`) ? `${BASE}/yt/${id}.jpg` : '';
  const thumb = cover ? `<img src="${cover}" alt="" loading="lazy" onerror="this.remove()">` : '';
  const label = uiFor(lang).playVideo + (v?.title ? `: ${v.title}` : '');
  return `<div class="video"><button type="button" class="video-btn" data-yt="${id}" aria-label="${attr(label)}">${thumb}<span class="video-play"><svg class="icon"><use href="#i-play"/></svg></span></button></div>`;
}

export type Toc = { id: string; text: string }[];

// Forms from the original markup (label, control, <br>) -> fields in a compact grid: each label with its control,
// short personal fields (names, email, phone, dates) two in a row, checkboxes as one group. Text inside the form stays full width.
const HALF = /name|first|last|e-?mail|phone|tel|date/i;
const NOT_HALF = /position|organi[sz]|venue|title|project|company|user/i;
export function tidyFormHtml(html: string) { const $ = cheerio.load(`<div id="r">${html}</div>`, null, false); tidyForms($, $('#r')); return $('#r').html()!; }
function tidyForms($: cheerio.CheerioAPI, r: cheerio.Cheerio<any>) {
  r.find('form').each((_, f) => {
    const $f = $(f);
    $f.find('label').each((_, l) => {
      const $l = $(l);
      if ($l.find('input,select,textarea').length) { $l.addClass('field-check'); return; }
      let next = $l.next();
      while (next.is('br')) { const n = next.next(); next.remove(); next = n; }
      if (!next.is('input,select,textarea') && !(next.is('ul') && next.find('select').length && !next.find('label').length)) return;
      const key = `${next.attr('name') || ''} ${next.attr('autocomplete') || ''} ${$l.text()}`;
      const half = next.is('input') && /^(text|email|tel|date|)$/.test(next.attr('type') || '') && HALF.test(key) && !NOT_HALF.test(key);
      const field = $(`<div class="field${half ? ' field-half' : ''}"></div>`);
      $l.before(field); field.append($l, next);
    });
    $f.find('br').remove();
    // runs of fields, checkboxes and the button (directly in the form or in a fieldset) -> one grid
    $f.find('fieldset').add($f).each((_, box) => {
      const kids = $(box).children().toArray();
      let grid: any = null;
      for (const k of kids) {
        const $k = $(k);
        const inGrid = $k.is('.field, .field-check, button, input[type=submit]') || ($k.is('ul') && $k.find('.field').length > 0);
        if (!inGrid) { grid = null; continue; }
        if (!grid) { grid = $('<div class="form-grid"></div>'); $k.before(grid); }
        grid.append($k);
      }
    });
    // a short field without a short neighbour takes the whole row
    $f.find('.form-grid').each((_, g) => {
      const items = $(g).children().toArray();
      for (let i = 0; i < items.length; i++) {
        if (!$(items[i]).hasClass('field-half')) continue;
        if ($(items[i + 1]).hasClass('field-half')) { i++; continue; }
        $(items[i]).removeClass('field-half');
      }
    });
  });
}

// Post-process an extracted body: base paths, videos, tables, headings ids, lazy images.
export function prose(html: string, opts: { toc?: boolean; visual?: boolean; legal?: boolean; faq?: boolean; lang?: Lang; fold?: boolean } = {}): { html: string; toc: Toc } {
  const $ = cheerio.load(`<div id="r">${b(html)}</div>`, null, false);
  const r = $('#r');
  r.find('div.video[data-yt]').each((_, el) => { $(el).replaceWith(videoHtml($(el).attr('data-yt')!, opts.lang)); });
  r.find('div.video[data-fb]').each((_, el) => {
    const src = decodeURIComponent($(el).attr('data-fb')!);
    const href = (src.match(/href=([^&]+)/) || [])[1];
    $(el).replaceWith(`<p><a class="btn btn-outline" href="${href ? decodeURIComponent(href) : src}" target="_blank" rel="noopener"><svg class="icon"><use href="#i-facebook"/></svg>Facebook</a></p>`);
  });
  // paragraphs that only wrap a video -> unwrap
  r.find('p').each((_, p) => { const k = $(p).children(); if (k.length === 1 && k.is('.video') && !$(p).text().trim()) $(p).replaceWith(k); });
  // year-by-year text (History) -> timeline
  const yearPs = r.children('p').filter((_, p) => /^\d{4}$/.test($(p).text().trim()) && $(p).find('strong,b').length > 0);
  if (yearPs.length >= 4) {
    const ol = $('<ol class="timeline"></ol>');
    yearPs.first().before(ol);
    let li: any = null;
    ol.nextAll().each((_, el) => {
      const isYear = yearPs.toArray().includes(el as any);
      if (isYear) { li = $('<li><div class="tl-body"></div></li>'); ol.append(li); $(el).addClass('tl-year'); li.prepend(el); return; }
      if (li) li.children('.tl-body').append(el);
    });
  }
  r.find('a[href="#"]').each((_, a) => { $(a).replaceWith($(a).contents()); });
  // important information, made from the original's own markers ("Please note", "Important", ...): a quiet box with an icon
  r.find('p').each((_, el) => {
    const p = $(el); if (p.closest('td, th, li, .callout, summary, form').length) return;
    const t = p.text().replace(/\s+/g, ' ').trim();
    if (/^(please note|important|note:|attention|veuillez noter|attention :|remarque|tenga en cuenta|importante|nota:)/i.test(t)) p.wrap('<div class="callout"></div>');
  });
  r.find('img').attr('loading', 'lazy').attr('decoding', 'async');
  r.find('a[target="_blank"]').attr('rel', 'noopener');
  r.find('table').each((_, t) => {
    const T = $(t);
    // drop rows that are completely empty
    T.find('tr').each((_, tr) => { if (!$(tr).text().replace(/\u00a0/g, ' ').trim() && !$(tr).find('img,a').length) $(tr).remove(); });
    const rows = T.find('tr');
    // a single wide cell row = caption (e.g. a date in an agenda)
    rows.each((_, tr) => { const c = $(tr).children('td,th'); if (c.length === 1 && rows.length > 1 && (+(c.attr('colspan') || 1) > 1)) $(tr).addClass('caption-row'); });
    const cand = rows.filter((_, tr) => !$(tr).hasClass('caption-row')).first();
    const cells = cand.children('td,th');
    const looksHead = cand.parent().is('thead') || cand.find('th').length > 0 || (cells.length > 1 && cells.toArray().every(c => { const tx = $(c).text().trim(); return tx.length > 0 && tx.length < 30 && ($(c).find('strong,b').length > 0 || /^(time|activity|location|date|name|country|title)$/i.test(tx)); }));
    if (looksHead && rows.length > 1 && cells.length > 1) {
      const labels = cells.toArray().map(c => $(c).text().replace(/\s+/g, ' ').trim());
      cand.addClass('thead-row');
      rows.not(cand).not('.caption-row').each((_, tr) => { $(tr).children('td,th').each((i, td) => { if (labels[i]) $(td).attr('data-label', labels[i]); }); });
      T.addClass('has-head');
    }
    T.wrap('<div class="table"></div>');
  });
  tidyForms($, r);
  if (opts.visual) visualize($, r, { legal: opts.legal, faq: opts.faq });
  if (opts.visual && !opts.legal) { timelineVisual($, r); agendaVisual($, r); }
  if (opts.visual || opts.fold) { const ui = uiFor(opts.lang || 'en'); foldLongRuns($, r, { more: ui.readMore, less: ui.showLess }); }
  const toc: Toc = [];
  const used = new Set<string>();
  r.find('h2').not('.tab-title').each((_, h) => {
    const text = $(h).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length > 90) return;
    let id = slugify(text) || 'section'; let n = 2; while (used.has(id)) id = slugify(text) + '-' + n++;
    used.add(id); $(h).attr('id', id); toc.push({ id, text });
  });
  // no h2 in the text: lift every heading one level so the outline goes h1 -> h2 (the class keeps the old look)
  if (!r.find('h2').length && r.find('h3').length) {
    r.find('h3,h4,h5').each((_, h) => {
      const lvl = +(h as any).tagName.slice(1);
      (h as any).tagName = 'h' + (lvl - 1);
      $(h).addClass('lvl-' + lvl);
    });
  }
  // soft hyphens break Figma import & search; drop them
  return { html: r.html()!.replace(/­/g, ''), toc: opts.toc === false ? [] : toc };
}

export const textOf = (html: string) => cheerio.load(html).text().replace(/\s+/g, ' ').trim();

// Some files on olympians.org are missing (the server answers with an error page); skip those images.
export const imgOk = (src?: string | null) => {
  if (!src) return false;
  const p = src.replace('{{BASE}}', '').replace(BASE, '');
  if (/^https?:/.test(p)) return true;
  try { return fs.statSync('public' + decodeURI(p)).size > 0; } catch { return false; }
};

// srcset from the smaller WebP copies made by scripts/resize-images.mjs (falls back to the original only)
let imgWidths: Record<string, { w: number; c: string | null } | number> | null = null;
const imgInfo = (p: string) => { if (!imgWidths) { try { imgWidths = JSON.parse(fs.readFileSync('public/_img/manifest.json', 'utf8')); } catch { imgWidths = {}; } } const v = imgWidths![p]; return typeof v === 'number' ? { w: v, c: null } : v; };
// dominant colour of a photo, used as its background until it loads (slow connections see colour, not a white hole)
export const phColor = (src?: string | null) => { if (!src) return undefined; const p = decodeURI(src.replace('{{BASE}}', '').replace(BASE, '')); const c = imgInfo(p)?.c; return c ? `background-color:${c}` : undefined; };
export const srcset = (src?: string | null) => {
  if (!src) return undefined;
  const p = decodeURI(src.replace('{{BASE}}', '').replace(BASE, ''));
  if (/^https?:/.test(p)) return undefined;
  const w = imgInfo(p)?.w; if (!w) return undefined;
  const parts = [480, 960].filter(x => w > x * 1.15 && fs.existsSync(`public/_img/${x}${p}.webp`)).map(x => `${BASE}/_img/${x}${encodeURI(p)}.webp ${x}w`);
  return parts.length ? [...parts, `${b(src)} ${w}w`].join(', ') : undefined;
};
export const LOGO = `${BASE}/_img/logo-144.png`;
// name that pairs the same photo on two pages, so it can travel from one to the other (view transitions, global.css)
export const vt = (key: string) => { let h = 5381; for (const c of key) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return `--vt:vt-${h.toString(36)}`; };

// Split a sentence into word spans for the scroll "light up" effect (text stays one readable line for screen readers).
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// numbers written with a space between thousands ("100 000") stay one word
const glue = (s: string) => s.replace(/(\d)[ \u00a0\u202f](?=\d{3}(?!\d))/g, '$1\u00a0');
export const words = (s: string) => glue(s).split(/[ \t\n\r]+/).filter(Boolean).map(w => `<span class="w">${esc(w)}</span>`).join(' ');
// same, but words after the first sentence are marked as the quieter second tone
export const words2 = (s: string) => { const m = s.match(/^(.+?[.!?])\s+(.+)$/s); if (!m) return words(s); return words(m[1]) + ' ' + glue(m[2]).split(/[ \t\n\r]+/).filter(Boolean).map(w => `<span class="w w2">${esc(w)}</span>`).join(' '); };

// Menu in a given language: labels as on olympians.org, links with the language prefix
import { type Lang, L as Lp, navLabel as navL } from './i18n';
export const navFor = (lang: Lang): NavItem[] => NAV.map(n => ({ ...n, label: navL(n.href, n.label, lang), href: Lp(n.href, lang), children: n.children?.map(c => ({ ...c, label: navL(c.href, c.label, lang), href: Lp(c.href, lang) })) }));

// Real national flags in their own proportions (public/flags-real/<iso>.svg, from flagcdn.com;
// Chinese Taipei uses the flag it competes under in the Olympic Movement). Height is fixed, width follows the flag.
const flagRatio = new Map<string, number>();
export const realFlag = (code: string, h = 36) => {
  const c = code.toLowerCase(); const file = `public/flags-real/${c}.svg`;
  if (!flagRatio.has(c)) {
    let r = 1.5;
    try { const svg = fs.readFileSync(file, 'utf8'); const vb = svg.match(/viewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number); if (vb && vb[2] > 0 && vb[3] > 0) r = vb[2] / vb[3]; } catch { return null; }
    flagRatio.set(c, r);
  }
  return { src: `${BASE}/flags-real/${c}.svg`, w: Math.round(h * flagRatio.get(c)!), h };
};
