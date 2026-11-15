'use strict';
// Site analytics: the beacon in src/layouts/Base.astro posts to /api/woa/track; the admin page reads report(), live() and csv().
// No cookies and no IP addresses: a visitor is a random id from the browser, the country comes from the browser time zone.
const TZ = require('./tz-country.json');

const EVENT = 'plugin::woa.event';
const DAY = 86400000;
const dayOf = (d) => new Date(d).toISOString().slice(0, 10);
const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
const int = (v, lo, hi) => { if (v === undefined || v === '') return null; const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch|facebookexternalhit|embedly|quora|whatsapp|telegram/i;
const deviceOf = (ua = '') => (/ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop');
const browserOf = (ua = '') => (/edg\//i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /samsungbrowser/i.test(ua) ? 'Samsung Internet'
  : /yabrowser/i.test(ua) ? 'Yandex' : /firefox|fxios/i.test(ua) ? 'Firefox' : /crios|chrome|chromium/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Other');
const osOf = (ua = '') => (/windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
  : /cros/i.test(ua) ? 'ChromeOS' : /mac os x|macintosh/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other');
const screenOf = (w) => (w == null ? '' : w < 600 ? 'Phone, under 600 px' : w < 1024 ? 'Tablet, 600–1023 px' : w < 1440 ? 'Laptop, 1024–1439 px' : 'Large, 1440 px and wider');

const hits = new Map();
function limited(ip) {
  const now = Date.now(); const h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > 60000) { h.n = 0; h.t = now; }
  h.n++; hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > 120;
}

const KINDS = ['pageview', 'download', 'outbound', 'video', 'search', 'notfound'];
async function track(strapi, ctx, settings) {
  // form-encoded beacon: k kind, p path, t title, l lang, r referrer host, f previous internal page, v visitor, s session, e event id,
  // z time zone, w screen width, hr/wd local hour and weekday, n first visit, us/um/uc UTM, h target, c search results,
  // and for k=time: d duration ms, sd scroll %, lcp/inp ms, cls ×1000
  ctx.status = 204;
  const ua = ctx.get('user-agent');
  if (!ua || BOT.test(ua) || limited(ctx.ip)) return;
  const b = ctx.request.body || {};
  const st = await settings();
  if (!st.enabled) return;
  const p = clip(b.p, 300);
  if (!p.startsWith('/') || st.excludePaths.some(x => p.startsWith(x))) return;
  const session = clip(b.s, 40); const eid = clip(b.e, 40);
  if (b.k === 'time') {
    if (!eid) return;
    const data = { duration: int(b.d, 0, 3600000) ?? 0 };
    const sd = int(b.sd, 0, 100); if (sd !== null) data.scroll = sd;
    const lcp = int(b.lcp, 0, 120000); if (lcp) data.lcp = lcp;
    const inp = int(b.inp, 0, 60000); if (inp) data.inp = inp;
    const cls = int(b.cls, 0, 100000); if (cls !== null && lcp) data.cls = cls;
    await strapi.db.query(EVENT).updateMany({ where: { eid, session, kind: 'pageview' }, data });
    return;
  }
  const kind = KINDS.includes(b.k) ? b.k : 'pageview';
  const w = int(b.w, 0, 10000);
  await strapi.db.query(EVENT).create({ data: {
    kind, path: p, title: clip(b.t, 200), lang: clip(b.l, 5), referrer: clip(b.r, 120).replace(/^www\./, ''), from_path: clip(b.f, 300),
    visitor: clip(b.v, 40), session, eid, duration: 0, device: deviceOf(ua), browser: browserOf(ua), os: osOf(ua),
    country: TZ[clip(b.z, 60)] || '', screen: screenOf(w), hour: int(b.hr, 0, 23), weekday: int(b.wd, 0, 6), first_visit: b.n === '1',
    utm_source: clip(b.us, 80), utm_medium: clip(b.um, 80), utm_campaign: clip(b.uc, 120),
    target: clip(b.h, 300), results: kind === 'search' ? int(b.c, 0, 100000) : null, day: dayOf(Date.now()),
  } });
}

// ---------- reports ----------
const FILTERS = { path: 'path', source: 'referrer', country: 'country', lang: 'lang', device: 'device', browser: 'browser', os: 'os', screen: 'screen', campaign: 'utm_campaign' };
const SELECT = ['id', 'kind', 'path', 'title', 'lang', 'referrer', 'visitor', 'session', 'duration', 'device', 'target', 'day', 'createdAt', 'from_path', 'country',
  'browser', 'os', 'screen', 'utm_source', 'utm_medium', 'utm_campaign', 'first_visit', 'scroll', 'lcp', 'cls', 'inp', 'results', 'hour', 'weekday'];
const okDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
function period(q = {}) {
  let to = okDay(q.to) ? q.to : dayOf(Date.now());
  const days = Math.min(400, Math.max(1, Number(q.days) || 30));
  let from = okDay(q.from) ? q.from : dayOf(Date.parse(to) - (days - 1) * DAY);
  if (from > to) [from, to] = [to, from];
  if ((Date.parse(to) - Date.parse(from)) / DAY > 399) from = dayOf(Date.parse(to) - 399 * DAY);
  const n = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  return { from, to, days: n, prevFrom: dayOf(Date.parse(from) - n * DAY), prevTo: dayOf(Date.parse(from) - DAY) };
}
const load = (strapi, from, to) => strapi.db.query(EVENT).findMany({ where: { day: { $gte: from, $lte: to } }, select: SELECT, orderBy: { id: 'asc' }, limit: 2000000 });
function filters(q = {}) {
  const f = Object.entries(FILTERS).filter(([k]) => typeof q[k] === 'string' && q[k] !== '');
  return { active: Object.fromEntries(f.map(([k]) => [k, q[k]])), test: (e) => f.every(([k, field]) => (e[field] || '—') === q[k]) };
}

const LANG_PREFIX = /^\/(fr|es)(?=\/|$)/;
const SECTION = { '': 'Home', news: 'News', 'best-practices': 'Best Practices', noas: 'NOAs', woa: 'About WOA', olympians: 'Olympians', 'oly-house': 'OLY House' };
const sectionOf = (p = '/') => { const seg = (p.replace(LANG_PREFIX, '') || '/').split('/')[1] || ''; return SECTION[seg] || (seg.charAt(0).toUpperCase() + seg.slice(1)).replace(/-/g, ' '); };
const p75 = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))]; };
const hostOf = (u) => { if (/^mailto:/i.test(u)) return 'Email'; if (/^tel:/i.test(u)) return 'Phone'; try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } };

function group(list, key, limit = 50) {
  const m = new Map();
  for (const e of list) { const k = key(e) || '—'; const g = m.get(k) || { name: k, count: 0, v: new Set() }; g.count++; g.v.add(e.visitor); m.set(k, g); }
  return [...m.values()].sort((a, b) => b.count - a.count).slice(0, limit).map(g => ({ name: g.name, count: g.count, visitors: g.v.size }));
}

function kpi(all, page) {
  const inPage = page ? new Set(all.filter(e => e.kind === 'pageview' && e.path === page).map(e => e.session)) : null;
  const list = page ? all.filter(e => e.path === page) : all;
  const pv = list.filter(e => e.kind === 'pageview');
  const visits = page ? all.filter(e => e.kind === 'pageview' && inPage.has(e.session)) : pv;
  const sessions = new Map();
  for (const e of visits) { const s = sessions.get(e.session) || { n: 0, t: 0 }; s.n++; s.t += e.duration || 0; sessions.set(e.session, s); }
  const ns = sessions.size; const total = [...sessions.values()].reduce((a, s) => a + s.t, 0);
  const visitors = new Set(pv.map(e => e.visitor)); const fresh = new Set(pv.filter(e => e.first_visit).map(e => e.visitor));
  const scrolls = pv.filter(e => e.scroll != null).map(e => e.scroll);
  const count = (k) => list.filter(e => e.kind === k).length;
  return {
    visitors: visitors.size, newVisitors: fresh.size, pageviews: pv.length, sessions: ns, avgTime: ns ? Math.round(total / ns / 1000) : 0,
    pagesPerSession: ns ? +(visits.length / ns).toFixed(2) : 0, bounce: ns ? Math.round(([...sessions.values()].filter(s => s.n === 1).length / ns) * 100) : 0,
    scroll: scrolls.length ? Math.round(scrolls.reduce((a, b) => a + b, 0) / scrolls.length) : null,
    downloads: count('download'), outbound: count('outbound'), videos: count('video'), searches: count('search'), notfound: count('notfound'),
  };
}

let editCache = { at: 0, map: null };
async function editLinks(strapi) {
  if (editCache.map && Date.now() - editCache.at < 300000) return editCache.map;
  const map = new Map();
  for (const uid of ['api::page.page', 'api::news-item.news-item', 'api::practice.practice']) {
    const r = await strapi.db.query(uid).findMany({ select: ['documentId', 'locale', 'path'], where: { publishedAt: null }, limit: 100000 });
    for (const x of r) if (x.path) map.set(x.path, `/content-manager/collection-types/${uid}/${x.documentId}?plugins[i18n][locale]=${x.locale}`);
  }
  editCache = { at: Date.now(), map };
  return map;
}
async function redirectsFrom(strapi) {
  const r = await strapi.db.query('api::redirect.redirect').findMany({ select: ['from'], limit: 10000 });
  return new Set(r.map(x => x.from));
}

async function report(strapi, q = {}) {
  // a page filter selects the page's own views; visit figures (entries, exits, bounce, paths) use the whole visits that included the page
  const per = period(q); const f = filters(q); const page = f.active.path || null;
  const base = (await load(strapi, per.prevFrom, per.to)).filter(filters({ ...q, path: '' }).test);
  const curAll = base.filter(e => e.day >= per.from); const prevAll = base.filter(e => e.day < per.from);
  const cur = page ? curAll.filter(e => e.path === page) : curAll; const prev = page ? prevAll.filter(e => e.path === page) : prevAll;
  const pv = cur.filter(e => e.kind === 'pageview'); const ppv = prev.filter(e => e.kind === 'pageview');
  const inPage = page ? new Set(pv.map(e => e.session)) : null;
  const visitPv = page ? curAll.filter(e => e.kind === 'pageview' && inPage.has(e.session)) : pv;

  const perDay = [];
  const byDay = (list) => { const m = new Map(); for (const e of list) { const d = m.get(e.day) || { n: 0, v: new Set() }; d.n++; d.v.add(e.visitor); m.set(e.day, d); } return m; };
  const cd = byDay(pv); const pd = byDay(ppv);
  for (let i = 0; i < per.days; i++) {
    const day = dayOf(Date.parse(per.from) + i * DAY); const pday = dayOf(Date.parse(per.prevFrom) + i * DAY);
    perDay.push({ day, pageviews: cd.get(day)?.n || 0, visitors: cd.get(day)?.v.size || 0, prevPageviews: pd.get(pday)?.n || 0, prevVisitors: pd.get(pday)?.v.size || 0 });
  }

  // pages, entry and exit pages (events are in id order, so the first page view of a session is its entry)
  const pages = new Map(); const first = new Map(); const last = new Map(); const perSession = new Map();
  for (const e of visitPv) {
    const p = pages.get(e.path) || { path: e.path, title: e.title, views: 0, v: new Set(), time: 0, timed: 0, scroll: 0, scrolled: 0, entries: 0, exits: 0, bounces: 0 };
    p.views++; p.v.add(e.visitor); if (e.duration) { p.time += e.duration; p.timed++; } if (e.scroll != null) { p.scroll += e.scroll; p.scrolled++; } if (e.title) p.title = e.title;
    pages.set(e.path, p);
    if (!first.has(e.session)) first.set(e.session, e.path);
    last.set(e.session, e.path); perSession.set(e.session, (perSession.get(e.session) || 0) + 1);
  }
  for (const [s, path] of first) { const p = pages.get(path); p.entries++; if (perSession.get(s) === 1) p.bounces++; }
  for (const path of last.values()) pages.get(path).exits++;
  const edit = await editLinks(strapi);
  const pageRows = [...pages.values()].filter(p => !page || p.path === page).sort((a, b) => b.views - a.views).slice(0, 200).map(p => ({
    path: p.path, title: p.title, section: sectionOf(p.path), views: p.views, visitors: p.v.size, avgTime: p.timed ? Math.round(p.time / p.timed / 1000) : 0,
    scroll: p.scrolled ? Math.round(p.scroll / p.scrolled) : null, entries: p.entries, exits: p.exits, bounce: p.entries ? Math.round((p.bounces / p.entries) * 100) : null,
    edit: edit.get(p.path) || null,
  }));
  const rank = (key) => [...pages.values()].filter(p => p[key] && (!page || key !== 'views')).sort((a, b) => b[key] - a[key]).slice(0, 15).map(p => ({ name: p.path, title: p.title, count: p[key] }));

  // when people visit (local time of the visitor)
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of pv) if (e.weekday != null && e.hour != null) heat[e.weekday][e.hour]++;

  // site search
  const terms = new Map();
  for (const e of cur.filter(x => x.kind === 'search')) {
    const t = terms.get(e.target) || { name: e.target, count: 0, results: 0, zero: 0, v: new Set() };
    t.count++; t.results = e.results ?? t.results; if (e.results === 0) t.zero++; t.v.add(e.visitor); terms.set(e.target, t);
  }
  const searches = [...terms.values()].sort((a, b) => b.count - a.count).slice(0, 100).map(t => ({ name: t.name, count: t.count, visitors: t.v.size, results: t.results, zero: t.zero }));

  // broken addresses
  const has = await redirectsFrom(strapi);
  const nf = new Map();
  for (const e of cur.filter(x => x.kind === 'notfound')) {
    const n = nf.get(e.path) || { path: e.path, count: 0, from: new Map(), last: e.createdAt };
    n.count++; if (new Date(e.createdAt) > new Date(n.last)) n.last = e.createdAt; const src = e.from_path ? `this site: ${e.from_path}` : e.referrer || 'direct or unknown'; n.from.set(src, (n.from.get(src) || 0) + 1); nf.set(e.path, n);
  }
  const notFound = [...nf.values()].sort((a, b) => b.count - a.count).slice(0, 100).map(n => ({
    path: n.path, count: n.count, last: n.last, from: [...n.from].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
    redirect: has.has(n.path) || has.has(n.path.replace(/\/?$/, '/')),
  }));

  // loading speed (field data, 75th percentile like Core Web Vitals)
  const measured = pv.filter(e => e.lcp > 0);
  const vitalsPages = new Map();
  for (const e of measured) { const p = vitalsPages.get(e.path) || { path: e.path, title: e.title, lcp: [], inp: [], cls: [] }; p.lcp.push(e.lcp); if (e.inp) p.inp.push(e.inp); if (e.cls != null) p.cls.push(e.cls); vitalsPages.set(e.path, p); }
  const vitals = {
    samples: measured.length,
    lcp: p75(measured.map(e => e.lcp)), inp: p75(measured.filter(e => e.inp).map(e => e.inp)), cls: p75(measured.filter(e => e.cls != null).map(e => e.cls)),
    devices: ['mobile', 'tablet', 'desktop'].map(d => { const l = measured.filter(e => e.device === d); return { name: d, samples: l.length, lcp: p75(l.map(e => e.lcp)), inp: p75(l.filter(e => e.inp).map(e => e.inp)) }; }).filter(d => d.samples),
    pages: [...vitalsPages.values()].map(p => ({ path: p.path, title: p.title, samples: p.lcp.length, lcp: p75(p.lcp), inp: p75(p.inp), cls: p75(p.cls) })).sort((a, b) => b.lcp - a.lcp).slice(0, 15),
  };

  const utm = pv.filter(e => e.utm_source || e.utm_medium || e.utm_campaign);
  const visitors = new Set(pv.map(e => e.visitor)); const fresh = new Set(pv.filter(e => e.first_visit).map(e => e.visitor));
  const outbound = cur.filter(e => e.kind === 'outbound');
  const videoTitles = new Map(cur.filter(e => e.kind === 'video').map(e => [e.target, e.path]));
  return {
    ...per, filters: f.active, kpi: kpi(curAll, page), prev: kpi(prevAll, page), perDay, pages: pageRows,
    entryPages: rank('entries'), exitPages: rank('exits'),
    sections: group(pv, e => sectionOf(e.path), 20),
    referrers: group(pv, e => e.referrer, 30), campaigns: group(utm, e => [e.utm_source || '—', e.utm_medium || '—', e.utm_campaign || '—'].join(' / '), 30),
    internal: group(curAll.filter(e => e.kind === 'pageview' && e.from_path && (!page || e.path === page || e.from_path === page)), e => `${e.from_path} → ${e.path}`, 20),
    countries: group(pv, e => e.country, 60), languages: group(pv, e => e.lang), devices: group(pv, e => e.device), browsers: group(pv, e => e.browser), os: group(pv, e => e.os), screens: group(pv, e => e.screen),
    audience: { new: fresh.size, returning: Math.max(0, visitors.size - fresh.size) },
    heat,
    downloads: group(cur.filter(e => e.kind === 'download'), e => e.target, 50),
    outboundHosts: group(outbound, e => hostOf(e.target), 30), outboundLinks: group(outbound, e => e.target, 50),
    videos: group(cur.filter(e => e.kind === 'video'), e => e.target, 30).map(v => ({ ...v, page: videoTitles.get(v.name) })),
    searches, searchZero: searches.filter(s => s.results === 0),
    notFound, vitals,
  };
}

// people on the site right now: anyone with an event in the last 5 minutes
async function live(strapi) {
  const now = Date.now();
  const list = await strapi.db.query(EVENT).findMany({ where: { createdAt: { $gte: new Date(now - 30 * 60000) } }, select: ['kind', 'path', 'title', 'visitor', 'country', 'device', 'referrer', 'target', 'createdAt'], orderBy: { id: 'asc' }, limit: 50000 });
  const recent = list.filter(e => new Date(e.createdAt).getTime() >= now - 5 * 60000);
  const where = new Map(); for (const e of recent) if (e.kind === 'pageview') where.set(e.visitor, e);
  const pages = new Map(); for (const e of where.values()) { const p = pages.get(e.path) || { path: e.path, title: e.title, count: 0 }; p.count++; pages.set(e.path, p); }
  const perMinute = Array(30).fill(0);
  for (const e of list) if (e.kind === 'pageview') { const m = 29 - Math.floor((now - new Date(e.createdAt).getTime()) / 60000); if (m >= 0 && m < 30) perMinute[m]++; }
  return {
    active: new Set(recent.map(e => e.visitor)).size, pages: [...pages.values()].sort((a, b) => b.count - a.count).slice(0, 10), perMinute,
    countries: group([...where.values()], e => e.country, 10),
    events: list.slice(-25).reverse().map(e => ({ kind: e.kind, path: e.path, title: e.title, country: e.country, device: e.device, referrer: e.referrer, target: e.target, at: e.createdAt })),
  };
}

function csv(r) {
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const block = (title, head, rows) => [q(title), head.map(q).join(','), ...rows.map(x => x.map(q).join(',')), ''];
  return [
    ...block(`WOA site analytics ${r.from} to ${r.to}${Object.keys(r.filters).length ? ` (filters: ${Object.entries(r.filters).map(([k, v]) => `${k}=${v}`).join(', ')})` : ''}`, ['metric', 'value', 'previous period'],
      Object.keys(r.kpi).map(k => [k, r.kpi[k], r.prev[k]])),
    ...block('Per day', ['day', 'page views', 'visitors', 'page views, previous period', 'visitors, previous period'], r.perDay.map(d => [d.day, d.pageviews, d.visitors, d.prevPageviews, d.prevVisitors])),
    ...block('Pages', ['path', 'title', 'section', 'views', 'visitors', 'avg time s', 'scroll %', 'entries', 'exits', 'bounce %'], r.pages.map(p => [p.path, p.title, p.section, p.views, p.visitors, p.avgTime, p.scroll, p.entries, p.exits, p.bounce])),
    ...block('Sources', ['source', 'page views', 'visitors'], r.referrers.map(x => [x.name, x.count, x.visitors])),
    ...block('Campaigns (source / medium / campaign)', ['campaign', 'page views', 'visitors'], r.campaigns.map(x => [x.name, x.count, x.visitors])),
    ...block('Countries', ['country code', 'page views', 'visitors'], r.countries.map(x => [x.name, x.count, x.visitors])),
    ...block('Site search', ['term', 'searches', 'visitors', 'results'], r.searches.map(x => [x.name, x.count, x.visitors, x.results])),
    ...block('Downloads', ['file', 'clicks', 'visitors'], r.downloads.map(x => [x.name, x.count, x.visitors])),
    ...block('External links', ['link', 'clicks', 'visitors'], r.outboundLinks.map(x => [x.name, x.count, x.visitors])),
    ...block('Pages not found', ['address', 'hits', 'redirect exists'], r.notFound.map(x => [x.path, x.count, x.redirect ? 'yes' : 'no'])),
  ].join('\n');
}

// weekly summary in the notifications (Monday morning, previous 7 days)
async function digest(strapi, notify) {
  const to = dayOf(Date.now() - DAY);
  const r = await report(strapi, { to, days: 7 });
  if (!r.kpi.pageviews && !r.prev.pageviews) return;
  const pct = (a, b) => (b ? ` (${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%)` : '');
  const top = r.pages[0];
  const broken = r.notFound.filter(n => !n.redirect).length;
  await notify(strapi, `Week ${r.from} to ${r.to}: ${r.kpi.visitors} visitors${pct(r.kpi.visitors, r.prev.visitors)}, ${r.kpi.pageviews} page views${pct(r.kpi.pageviews, r.prev.pageviews)}`
    + `${top ? `; most visited: ${top.title || top.path}` : ''}${broken ? `; ${broken} broken addresses without a redirect` : ''}`, broken ? 'warning' : 'info', '/woa-analytics?tab=health');
}

module.exports = { track, report, live, csv, digest, period, dayOf };
