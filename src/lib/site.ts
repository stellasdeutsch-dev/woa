import * as cheerio from 'cheerio';
import fs from 'node:fs';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (p: string) => (/^(https?:|mailto:|tel:|#)/.test(p) ? p : BASE + (p.startsWith('/') ? p : '/' + p));
export const ORIGIN = 'https://olympians.org';

// Navigation: labels and order exactly as on olympians.org
export type NavItem = { label: string; href: string; icon?: string; children?: NavItem[] };
export const NAV: NavItem[] = [
  { label: 'WOA', href: '/woa/about/', children: [
    { label: 'About', href: '/woa/about/', icon: 'about' },
    { label: 'Olympism', href: '/woa/olympism/', icon: 'olympism' },
    { label: 'Leadership', href: '/woa/leadership/', icon: 'leadership' },
    { label: 'Contact Us', href: '/woa/contact-us/', icon: 'contact' },
  ] },
  { label: 'Olympians', href: '/olympians/oly/', children: [
    { label: 'OLY', href: '/olympians/oly/', icon: 'oly' },
    { label: 'Olympian.org Email', href: '/olympians/olympian-org-email/', icon: 'at' },
    { label: 'Health', href: '/olympians/health/', icon: 'health' },
    { label: 'Olympians for Life', href: '/olympians/olympians-for-life/', icon: 'life' },
    { label: 'WOF', href: '/olympians/wof/', icon: 'forum' },
  ] },
  { label: 'NOAs', href: '/noas/noa-guide/', children: [
    { label: 'NOA Guide', href: '/noas/noa-guide/', icon: 'guide' },
    { label: 'NOA Directory', href: '/noas/noa-directory/', icon: 'directory' },
    { label: 'Grants', href: '/noas/grants/', icon: 'grant' },
  ] },
  { label: 'News', href: '/news/', icon: 'news' },
  { label: 'OLY House', href: '/oly-house/', icon: 'house' },
  { label: 'Best Practices', href: '/best-practices/', icon: 'practice' },
  { label: 'SkillsBuild', href: '/skillsbuild/', icon: 'skills' },
];

export const SOCIAL = [
  { label: 'X', href: 'https://twitter.com/worldolympians', icon: 'x' },
  { label: 'Facebook', href: 'https://www.facebook.com/WorldOlympiansAssociation', icon: 'facebook' },
];
export const EMAIL = 'info@thewoa.org';

export const b = (s: string | null | undefined) => (s ?? '').replaceAll('{{BASE}}', BASE);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export function videoHtml(id: string) {
  return `<div class="video"><button type="button" class="video-btn" data-yt="${id}" aria-label="Play video"><img src="${BASE}/yt/${id}.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="video-play"><svg class="icon"><use href="#i-play"/></svg></span></button></div>`;
}

export type Toc = { id: string; text: string }[];

// Post-process an extracted body: base paths, videos, tables, headings ids, lazy images.
export function prose(html: string, opts: { toc?: boolean } = {}): { html: string; toc: Toc } {
  const $ = cheerio.load(`<div id="r">${b(html)}</div>`, null, false);
  const r = $('#r');
  r.find('div.video[data-yt]').each((_, el) => { $(el).replaceWith(videoHtml($(el).attr('data-yt')!)); });
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
  const toc: Toc = [];
  const used = new Set<string>();
  r.find('h2').not('.tab-title').each((_, h) => {
    const text = $(h).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length > 90) return;
    let id = slugify(text) || 'section'; let n = 2; while (used.has(id)) id = slugify(text) + '-' + n++;
    used.add(id); $(h).attr('id', id); toc.push({ id, text });
  });
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
