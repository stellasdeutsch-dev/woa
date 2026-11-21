// Visual layers built only from what a page already says: no new words, no new numbers.
// timelineVisual: a year-by-year timeline gets an icon per milestone, an axis of years to jump along,
//   and the counts the text itself names ("25 founding members", "112 nations") as a row of figures.
// agendaVisual: a day-by-day programme table becomes a schedule: a strip of the day's hours with each
//   session as a block, then the sessions as a list with time and place.
import type { CheerioAPI } from 'cheerio';

const icon = (id: string, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

// one icon per kind of milestone, matched on the milestone's own words (first match wins)
const MILESTONE: [RegExp, string][] = [
  [/founded|ratified|birth certificate|created|concept/i, 'about'],
  [/reunion centre|oly house/i, 'house'],
  [/general assembly|forum|congress/i, 'forum'],
  [/president|patron|honorary/i, 'leadership'],
  [/\boly\b|post-nominal/i, 'oly'],
  [/offices?|continents?|officer/i, 'globe'],
  [/sponsor|grant|funding|usd|\$/i, 'grant'],
  [/membership|national olympians associations|noas?\b/i, 'directory'],
];
const COUNT = /\b((?:over|more than|almost|nearly)\s+)?(\d{1,3}(?:,\d{3})+|\d{2,3})\s+(founding members|Olympians|countries|NOAs|National Olympians Associations|nations|members|associations|participants|delegates)\b/gi;

export function timelineVisual($: CheerioAPI, r: ReturnType<CheerioAPI>) {
  r.find('ol.timeline').each((_, ol) => {
    const $ol = $(ol); const items = $ol.children('li');
    const years = items.map((_, li) => parseInt($(li).find('.tl-year').first().text(), 10)).get() as number[];
    if (years.length < 4 || years.some(y => !y)) return;
    const counts: { pre: string; n: string; what: string; y: number }[] = [];
    items.each((i, li) => {
      const $li = $(li); const text = plain($li.find('.tl-body').text());
      $li.attr('id', `y${years[i]}`).addClass('tl-rich');
      const id = MILESTONE.find(([rx]) => rx.test(text))?.[1] ?? 'history';
      $li.prepend(`<span class="tl-ico">${icon(id)}</span>`);
      for (const m of text.matchAll(COUNT)) counts.push({ pre: m[1] ? m[1].trim() : '', n: m[2], what: m[3], y: years[i] });
    });
    const y0 = years[0], y1 = years[years.length - 1], span = Math.max(1, y1 - y0);
    const ticks: number[] = []; for (let t = Math.ceil(y0 / 10) * 10; t < y1; t += 10) ticks.push(t);
    const axis = `<nav class="tl-axis" aria-label="${y0}–${y1}"><div class="tl-axis-line">`
      + ticks.map(t => `<span class="tl-tick" style="--p:${((t - y0) / span).toFixed(4)}" aria-hidden="true">${t}</span>`).join('')
      + `<span class="tl-end tl-start" aria-hidden="true">${y0}</span><span class="tl-end tl-last" aria-hidden="true">${y1}</span>`
      + `<ol>${years.map(y => `<li style="--p:${((y - y0) / span).toFixed(4)}"><a class="vb-tl-dot" href="#y${y}"><span>${y}</span></a></li>`).join('')}</ol></div></nav>`;
    const figs = counts.length >= 3 ? `<ul class="tl-figs">${counts.slice(0, 8).map(c => `<li><a class="vb-tl-fig" href="#y${c.y}"><span class="tl-fig-y">${c.y}</span><strong class="tl-fig-n">${c.pre ? `<small>${esc(c.pre)}</small> ` : ''}${c.n}</strong><span class="tl-fig-w">${esc(c.what)}</span></a></li>`).join('')}</ul>` : '';
    $ol.before(figs + axis);
  });
}

const HM = (s: string) => { const m = s.match(/(\d{1,2})[:.h](\d{2})/); return m ? +m[1] + +m[2] / 60 : NaN; };

export function agendaVisual($: CheerioAPI, r: ReturnType<CheerioAPI>) {
  const days: { id: string; title: string; el: any }[] = [];
  r.find('div.table').each((_, box) => {
    const $box = $(box); const t = $box.children('table');
    const head = t.find('tr.caption-row').first(); const title = plain(head.text());
    const labels = t.find('tr.thead-row').first().children().map((_, c) => plain($(c).text()).toLowerCase()).get();
    const iT = labels.findIndex(l => /^(time|heure|hora)$/.test(l)), iA = labels.findIndex(l => /^(activity|activité|actividad)$/.test(l)), iL = labels.findIndex(l => /^(location|lieu|lugar)$/.test(l));
    if (!title || iT < 0 || iA < 0) return;
    const rows = t.find('tbody tr').toArray().map(tr => { const c = $(tr).children('td'); return { time: plain(c.eq(iT).text()), what: (c.eq(iA).html() || '').trim(), key: c.eq(iA).find('strong,b').length > 0, where: iL >= 0 ? plain(c.eq(iL).text()) : '' }; }).filter(x => x.time || x.what);
    if (!rows.length) return;
    const id = `day-${days.length + 1}`;
    const timed = rows.map(x => { const [a, b] = x.time.split(/\s*[-–]\s*/); const s = HM(a || ''), e = HM(b || ''); return { ...x, s, e: Number.isFinite(e) ? e : s + 0.5 }; }).filter(x => Number.isFinite(x.s));
    const lo = Math.floor(Math.min(...timed.map(x => x.s), 8)), hi = Math.ceil(Math.max(...timed.map(x => x.e), 20)), span = hi - lo;
    const hours: number[] = []; for (let h = lo; h <= hi; h += 2) hours.push(h);
    const strip = timed.length ? `<div class="ag-strip" aria-hidden="true"><div class="ag-hours">${hours.map(h => `<span style="--p:${((h - lo) / span).toFixed(4)}">${String(h).padStart(2, '0')}:00</span>`).join('')}</div><div class="ag-track">${timed.map((x, i) => `<span class="ag-block${x.key ? ' ag-key' : ''}" style="--a:${((x.s - lo) / span).toFixed(4)};--b:${((Math.min(x.e, hi) - lo) / span).toFixed(4)};--i:${i}" title="${esc(x.time)} · ${esc(plain($('<div>' + x.what + '</div>').text()))}"></span>`).join('')}</div></div>` : '';
    const list = `<ol class="ag-list">${rows.map(x => `<li${x.key ? ' class="ag-key"' : ''}><span class="ag-time">${icon('clock', 'icon icon-sm')}${esc(x.time)}</span><div class="ag-what">${x.what}</div>${x.where ? `<span class="ag-where">${icon('pin', 'icon icon-sm')}${esc(x.where)}</span>` : ''}</li>`).join('')}</ol>`;
    const day = $(`<section class="ag-day" id="${id}"><h3 class="ag-head">${icon('calendar')}<span>${esc(title)}</span></h3>${strip}${list}</section>`);
    $box.replaceWith(day);
    days.push({ id, title, el: day });
  });
  if (days.length >= 2) days[0].el.before(`<nav class="ag-days" aria-label="${esc(days.map(d => d.title).join(' · ')).slice(0, 120)}">${days.map(d => `<a class="pill vb-day" href="#${d.id}">${icon('calendar', 'icon icon-sm')}${esc(d.title)}</a>`).join('')}</nav>`);
}
