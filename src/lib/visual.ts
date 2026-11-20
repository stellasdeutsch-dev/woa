// Turns plain article markup (as it comes from olympians.org) into visual blocks.
// Text is never rewritten: elements are only regrouped, wrapped or given classes.
// Exception: headings typed in capitals get title case (only the letter case changes).
import type { CheerioAPI } from 'cheerio';

const ACRONYMS = new Set(['WOA', 'OLY', 'NOA', 'NOAS', 'NOC', 'NOCS', 'IOC', 'GDPR', 'WOF', 'E-WOF', 'FAQ', 'FAQS', 'USD', 'UK', 'EU', 'PDF', 'CV', 'AGM', 'DPO', 'ICO', 'OLY@8', 'TV', 'QR', 'IBM', 'USA', 'II', 'III']);
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'via']);

export function titleCase(t: string): string | null {
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return null;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  // words typed with Caps Lock on ("mILANO cORTINA") are flipped back
  if (/\b[a-z][A-Z]{2,}\b/.test(t)) return t.replace(/\b([a-z])([A-Z]{2,})\b/g, (_, a, b) => a.toUpperCase() + b.toLowerCase());
  if (upper / letters.length < 0.8) return null; // only headings that are (almost) all caps
  let first = true;
  return t.split(/(\s+)/).map(w => {
    if (/^\s+$/.test(w) || !w) return w;
    const core = w.replace(/^[^A-Za-z0-9@]+|[^A-Za-z0-9@]+$/g, '');
    const out = ACRONYMS.has(core.toUpperCase()) ? w.toUpperCase().replace(/NOAS\b/, 'NOAs').replace(/NOCS\b/, 'NOCs').replace(/FAQS\b/, 'FAQs')
      : (!first && SMALL.has(core.toLowerCase())) ? w.toLowerCase()
      : w.toLowerCase().replace(/[a-z]/, c => c.toUpperCase());
    first = false;
    return out;
  }).join('');
}

// heading meaning -> icon candidates (first unused one wins; each icon once per page)
const ICONS: [RegExp, string[]][] = [
  [/best practice|examples? of/i, ['practice', 'guide', 'tip']],
  [/ahead|future/i, ['vision']],
  [/service to olympians/i, ['oly', 'life']],
  [/service to society/i, ['solidarity', 'heart']],
  [/bank/i, ['columns']],
  [/financial year|schedule|time your|\byear\b|\btime\b/i, ['clock']],
  [/budgeting tool|tools?\b/i, ['skills', 'chart']],
  [/budget|cost|fund|financ|money|grant/i, ['grant', 'chart']],
  [/strategic|operational|plans?\b/i, ['goals', 'target', 'chart']],
  [/e-?mail/i, ['email']],
  [/brand/i, ['olympism', 'design']],
  [/logo/i, ['pen', 'tip', 'design']],
  [/website/i, ['website']],
  [/newsletter|magazine|newspaper/i, ['newsletter']],
  [/social|facebook|twitter|instagram|whatsapp|share/i, ['social', 'chat']],
  [/code of conduct|constitution/i, ['integrity', 'doc']],
  [/terms of reference/i, ['letter', 'doc']],
  [/structure/i, ['columns', 'alliance']],
  [/election/i, ['values']],
  [/meeting|workshop|agm\b/i, ['forum', 'skills']],
  [/event/i, ['torch', 'forum']],
  [/member/i, ['solidarity', 'friendship']],
  [/officer|leader|committee|succession/i, ['leadership', 'humanism', 'directory']],
  [/athlete/i, ['excellence', 'humanism']],
  [/new relationship|build a/i, ['friendship', 'target']],
  [/existing relationship|strengthen/i, ['alliance', 'solidarity']],
  [/stakeholder|partner|relationship|noc\b|collaborat/i, ['friendship', 'alliance']],
  [/important|keep in mind|remember|don.t forget|avoid/i, ['tip', 'bell']],
  [/profession|career/i, ['excellence', 'skills']],
  [/transport|travel|flight|airport/i, ['globe']],
  [/guide/i, ['guide']],
  [/letter|recognition/i, ['letter']],
  [/contact/i, ['contact']],
  [/get ready|ready for/i, ['target', 'torch']],
  [/olympian|\boly\b/i, ['oly', 'life', 'heart']],
  [/register|registration|party/i, ['house']],
  [/eligib|submission|apply|application/i, ['doc']],
  [/information|useful/i, ['about']],
  [/\?$/, ['chat']],
];

// icon whose meaning matches a heading; each icon is used once per page (returns null when nothing fits)
export const iconFor = (title: string, used: Set<string>) => { for (const [rx, ids] of ICONS) if (rx.test(title)) for (const id of ids) if (!used.has(id)) { used.add(id); return id; } return null; };

const DOC_RX = /\.(pdf|docx?|xlsx?|pptx?|zip)(\?|$)/i;
const ext = (h: string) => (h.match(/\.([a-z0-9]+)(\?|$)/i)?.[1] || '').toUpperCase();
const slug = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const icon = (id: string, cls = 'icon') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;

export interface VisualOpts { legal?: boolean; faq?: boolean }

export function visualize($: CheerioAPI, r: ReturnType<CheerioAPI>, opts: VisualOpts = {}) {
  const inForm = (el: any) => $(el).closest('form').length > 0;
  const usedIcons = new Set<string>();
  const pickIcon = (t: string) => iconFor(t, usedIcons);

  // 1. capitals in headings -> title case (letter case only)
  r.find('h1,h2,h3,h4,h5,h6').each((_, h) => {
    const $h = $(h);
    if ($h.children().length && $h.children().toArray().some(c => (c as any).tagName !== 'strong' && (c as any).tagName !== 'span' && (c as any).tagName !== 'br')) return;
    const fixed = titleCase($h.text().replace(/\s+/g, ' ').trim());
    if (fixed) $h.text(fixed);
  });
  if (opts.legal) return;

  // 2. small heading above the main heading (e.g. "OLY House Tokyo 2020" over the page title) -> a tag after it
  const first = r.children().first();
  if (first.is('h3') && first.next().is('h2') && first.text().trim().length < 40) {
    const tag = $(`<p class="vb-kicker">${icon('house')}<span></span></p>`);
    tag.find('span').text(first.text().trim());
    first.next().after(tag); first.remove();
  }

  // 2b. a paragraph that is only a short bold line works as a sub-heading -> real h4
  r.find('p').each((_, p) => {
    if (inForm(p)) return;
    const $p = $(p); const t = $p.text().replace(/\s+/g, ' ').trim(); const k = $p.children();
    if (!t || t.length > 90 || /\?$/.test(t) || /[.:]$/.test(t)) return;
    if (k.length !== 1 || !k.is('strong,b') || k.text().replace(/\s+/g, ' ').trim() !== t || k.find('a,img').length) return;
    if (!$p.next().is('p,ul,ol')) return;
    $p.replaceWith(`<h4>${k.html()}</h4>`);
  });

  // 2c. questions and answers -> accordions (FAQ pages: every h3 topic; elsewhere: runs of h4 questions)
  const toDetails = (h: any, until: string) => {
    const $h = $(h); const body = $h.nextUntil(until);
    const d = $(`<details class="vb-faq"><summary><span></span>${icon('chevron')}</summary><div class="vb-faq-body"></div></details>`);
    d.find('summary span').text($h.text().replace(/\s+/g, ' ').trim());
    $h.before(d); d.find('.vb-faq-body').append(body); $h.remove();
  };
  if (opts.faq) r.children('h3').each((_, h) => toDetails(h, 'h2,h3'));
  const qh4 = r.find('h4').filter((_, h) => /\?$/.test($(h).text().trim()));
  if (qh4.length >= 3) qh4.each((_, h) => toDetails(h, 'h1,h2,h3,h4'));

  // 3. "Updated on ..." -> date line with an icon
  r.find('p').each((_, p) => {
    const t = $(p).text().replace(/\s+/g, ' ').trim();
    if (/^Updated on \d/.test(t) && t.length < 40) $(p).replaceWith(`<p class="vb-updated">${icon('calendar')}${t}</p>`);
  });

  // 4. quotation paragraphs -> quote blocks
  r.find('p').each((_, p) => {
    if (inForm(p)) return;
    const $p = $(p); const t = $p.text().trim();
    const kids = $p.children();
    if (t.length >= 60 && /^[“"]/.test(t) && kids.length === 1 && kids.is('em,i') && kids.text().trim() === t) {
      $p.replaceWith(`<figure class="vb-quote">${icon('quote')}<blockquote>${kids.html()}</blockquote></figure>`);
    }
  });

  // 5. interview: bold question paragraphs + "Name: answer" paragraphs
  const qs = r.find('p').filter((_, p) => { const t = $(p).text().trim(); const k = $(p).children(); return /\?$/.test(t) && t.length < 160 && k.length === 1 && k.is('strong,b') && k.text().trim() === t; });
  const answers = r.find('p').filter((_, p) => /^\s*<(strong|b)>[^<]{2,60}:\s*<\/(strong|b)>\s*[“"]/.test($(p).html() || ''));
  if (qs.length >= 2) qs.each((_, p) => { $(p).replaceWith(`<h3 class="vb-question">${icon('chat')}<span>${$(p).text().trim()}</span></h3>`); });
  if (answers.length >= 1) {
    answers.each((_, p) => { const $p = $(p); const who = $p.children('strong,b').first(); const name = who.text().replace(/:\s*$/, '').trim(); who.remove(); $p.replaceWith(`<div class="vb-answer"><p class="vb-answer-name">${name}:</p><p>${$p.html()!.trim()}</p></div>`); });
  }

  // 6. numbered sections ("1. Strong Leadership") -> steps on a line
  const numbered = r.children('h2,h3').filter((_, h) => /^\d+\.\s+\S/.test($(h).text().trim()));
  const steps: { id: string; title: string }[] = [];
  if (numbered.length >= 2) {
    const ol = $('<ol class="vb-steps vb-steps-prose"></ol>');
    numbered.first().before(ol);
    numbered.each((i, h) => {
      const $h = $(h); const tag = (h as any).tagName;
      const title = $h.text().trim().replace(/^\d+\.\s+/, '');
      const num = $h.text().trim().match(/^(\d+)\./)![1];
      const id = 'step-' + slug(title);
      const body = $h.nextUntil(tag === 'h3' ? 'h3, h2' : 'h2');
      const li = $(`<li class="vb-step" id="${id}"><span class="vb-step-num">${num}</span><div class="vb-step-main"><div class="vb-step-head"><${tag} class="vb-step-title"></${tag}></div><div class="vb-step-body"></div></div></li>`);
      li.find('.vb-step-title').text(title);
      li.find('.vb-step-body').append(body);
      ol.append(li); $h.remove();
      steps.push({ id, title });
    });
    // a short list just before the steps that names them -> clickable index
    const prev = ol.prevAll('ul,ol').first();
    if (prev.length && ol.prevAll().index(prev) <= 1) {
      const items = prev.children('li');
      if (items.length === steps.length && items.toArray().every(li => $(li).text().trim().length < 90 && !$(li).find('a').length)) {
        const idx = $('<ol class="vb-index vb-index-steps"></ol>');
        items.each((i, li) => { idx.append(`<li><a class="vb-link" href="#${steps[i].id}"><span class="vb-num">${i + 1}</span><span>${$(li).text().trim()}</span>${icon('chevron')}</a></li>`); });
        prev.replaceWith(idx);
      }
    }
  }

  // 7. sub-sections (h4 + text) -> panels with an icon that matches the heading
  r.find('h4').each((_, h) => {
    const $h = $(h);
    if (inForm(h) || $h.closest('.vb-panel, .tab-panel, details, table, li:not(.vb-step), .vb-faq').length) return;
    const body = $h.nextUntil('h1,h2,h3,h4,.vb-steps,.timeline');
    if (body.filter('img,table,.table,.video,iframe,form,details,ul:has(img),p:has(img)').length || body.find('img,table,.video,iframe').length) return;
    if (!body.length) return;
    const title = $h.text().replace(/\s+/g, ' ').trim();
    const ic = pickIcon(title);
    const isBest = /^best practice$/i.test(title);
    const panel = $(`<div class="vb-panel${isBest ? ' vb-panel-dark' : ''}"><div class="vb-panel-head">${ic ? `<span class="vb-ico">${icon(ic)}</span>` : ''}</div></div>`);
    $h.before(panel);
    panel.find('.vb-panel-head').append($h);
    panel.append(body);
  });
  // consecutive panels -> grid
  r.find('.vb-panel').each((_, p) => {
    const $p = $(p);
    if ($p.parent().hasClass('vb-panels')) return;
    const run = [p as any]; let n = $p.next();
    while (n.hasClass('vb-panel')) { run.push(n[0]); n = n.next(); }
    const grid = $('<div class="vb-panels"></div>');
    $p.before(grid); grid.append(run);
    const long = run.some(x => $(x).text().length > 700 || $(x).find('ul li').length > 6);
    if (run.length === 1 || long) grid.addClass('one-col');
  });

  // 8. lists of documents -> document cards
  r.find('ul').each((_, u) => {
    const $u = $(u); if (inForm(u)) return;
    const lis = $u.children('li'); if (lis.length < 1) return;
    const ok = lis.toArray().every(li => { const a = $(li).find('a'); return a.length === 1 && (a.hasClass('doc') || DOC_RX.test(a.attr('href') || '')) && !$(li).find('img').length; });
    if (!ok) return;
    const out = $('<ul class="vb-docs"></ul>');
    lis.each((_, li) => { const a = $(li).find('a').first(); const href = a.attr('href')!; const name = $(li).text().replace(/\s+/g, ' ').trim(); out.append(`<li><a class="vb-doc" href="${href}"${a.attr('target') ? ' target="_blank" rel="noopener"' : ''}><span class="vb-ico">${icon('doc')}</span><span class="vb-doc-name">${name}<span class="vb-doc-type">${ext(href)}</span></span>${icon('download')}</a></li>`); });
    $u.replaceWith(out);
  });

  // 9. plain bullet lists -> check-mark lists (short items in two columns)
  r.find('ul,ol').each((_, u) => {
    const $u = $(u); if (inForm(u) || $u.attr('class')) return;
    if ($u.closest('nav, .tab-panel, table, .vb-index, li').length) return;
    const lis = $u.children('li');
    if (lis.length < 2 || $u.find('img, ul, ol').length) return;
    const texts = lis.toArray().map(li => $(li).text().replace(/\s+/g, ' ').trim());
    if (texts.some(t => !t)) return;
    $u.addClass((u as any).tagName === 'ol' ? 'vb-list vb-list-num' : 'vb-list');
    if (texts.every(t => t.length <= 60)) $u.addClass('vb-list-grid');
    const isOl = (u as any).tagName === 'ol';
    lis.each((_, li) => { $(li).contents().wrapAll('<span class="vb-li"></span>'); if (!isOl) $(li).prepend(`<span class="vb-check" aria-hidden="true">${icon('check')}</span>`); });
  });
  r.find('ul:empty, ol:empty').remove();

  // 10. money amounts -> highlighted figures
  const MONEY = /((?:\d+\s?x\s?)?\$\s?\d[\d,]*(?![\w])(?:\s?USD)?)/g;
  r.find('p, li, td').each((_, el) => {
    if ($(el).closest('a, h1, h2, h3, h4, .fact, form').length) return;
    $(el).contents().each((_, n) => {
      if (n.type !== 'text') return;
      const t = (n as any).data as string;
      if (!MONEY.test(t)) return; MONEY.lastIndex = 0;
      $(n).replaceWith(t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(MONEY, '<strong class="fact">$1</strong>'));
    });
  });
}

// 11. long runs of paragraphs -> the first ~100 words stay, the rest opens with "Read More" (text unchanged, found by Ctrl+F and search)
let moreId = 0;
const words = (s: string) => s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
export function foldLongRuns($: CheerioAPI, r: ReturnType<CheerioAPI>, labels: { more: string; less: string }, opts: { max?: number; keep?: number; minRest?: number } = {}) {
  const { max = 180, keep = 90, minRest = 50 } = opts;
  r.find('p').each((_, p) => {
    const $p = $(p);
    if ($p.prev().is('p') || $p.closest('form, table, details, .vb-faq, .vb-more, .timeline, .tab-panel, nav').length) return;
    const run: any[] = []; let el = $p;
    while (el.length && el.is('p')) { run.push(el[0]); el = el.next(); }
    if (run.length < 2) return;
    const n = run.map(x => words($(x).text()));
    if (n.reduce((a, b) => a + b, 0) <= max) return;
    let shown = 0, k = 0;
    while (k < run.length && (k === 0 || shown < keep)) shown += n[k++];
    const rest = n.slice(k).reduce((a, b) => a + b, 0);
    if (k >= run.length || rest < minRest) return;
    const id = `more-${++moreId}`;
    const box = $(`<div class="vb-more"><div class="vb-more-body" id="${id}" hidden="until-found"></div><button type="button" class="btn btn-outline vb-more-btn" aria-expanded="false" aria-controls="${id}" data-more="" data-less=""><span></span><svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg></button></div>`);
    box.find('button').attr('data-more', labels.more).attr('data-less', labels.less).find('span').text(labels.more);
    $(run[k - 1]).after(box);
    box.find('.vb-more-body').append(run.slice(k));
  });
}
