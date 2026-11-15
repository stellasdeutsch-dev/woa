'use strict';
// WOA plugin (server only). The admin screens live in src/admin/app.tsx and call the admin routes below.
//   - dashboard data: content counts per language, items that need attention, review queue
//   - analytics: the public site sends page views and downloads to /api/woa/track (no cookies, no IP stored)
//   - notifications, nightly database backup, site rebuild through GitHub Actions
const fs = require('node:fs');
const path = require('node:path');

const LOCALES = ['en', 'fr', 'es'];
const TYPES = [
  { uid: 'api::page.page', key: 'pages', label: 'Pages', title: 'title', image: ['hero', 'bg'] },
  { uid: 'api::news-item.news-item', key: 'news', label: 'News', title: 'title', image: ['image', 'img'] },
  { uid: 'api::practice.practice', key: 'practices', label: 'Best Practices', title: 'title', image: ['image', 'img'] },
  { uid: 'api::noa.noa', key: 'noas', label: 'NOAs', title: 'country' },
  { uid: 'api::leader.leader', key: 'leaders', label: 'Executive Committee', title: 'name', image: ['photo', 'img'] },
  { uid: 'api::honorary-member.honorary-member', key: 'honorary', label: 'Honorary Members', title: 'name' },
  { uid: 'api::redirect.redirect', key: 'redirects', label: 'Redirects', title: 'from' },
  { uid: 'api::nav-item.nav-item', key: 'nav', label: 'Menu', title: 'label' },
  { uid: 'api::ui-string.ui-string', key: 'ui', label: 'Interface texts', title: 'key' },
];
const REVIEWABLE = TYPES.filter(t => ['pages', 'news', 'practices', 'noas', 'leaders'].includes(t.key));
const EVENT = 'plugin::woa.event';
const NOTE = 'plugin::woa.notification';
const editUrl = (uid, documentId, locale) => `/content-manager/collection-types/${uid}/${documentId}?plugins[i18n][locale]=${locale}`;
const listUrl = (uid, locale, extra = '') => `/content-manager/collection-types/${uid}?page=1&pageSize=20&plugins[i18n][locale]=${locale}${extra}`;
const dayOf = (d) => new Date(d).toISOString().slice(0, 10);
const env = (k, d) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);

// ---------- helpers ----------
async function rows(strapi, uid, fields) {
  // draft rows: every document has one per locale
  return strapi.db.query(uid).findMany({ select: ['documentId', 'locale', 'updatedAt', ...fields], where: { publishedAt: null }, limit: 100000 });
}
async function publishedIds(strapi, uid) {
  const r = await strapi.db.query(uid).findMany({ select: ['documentId', 'locale'], where: { publishedAt: { $notNull: true } }, limit: 100000 });
  return new Set(r.map(x => `${x.documentId}|${x.locale}`));
}
async function notify(strapi, title, kind = 'info', link = null) {
  try { await strapi.documents(NOTE).create({ data: { title, kind, link, read: false } }); } catch (e) { strapi.log.warn(`[woa] notification failed: ${e.message}`); }
}
const store = (strapi) => strapi.store({ type: 'plugin', name: 'woa' });
const DEFAULT_SETTINGS = { enabled: true, retentionDays: 395, excludePaths: [] };
async function getSettings(strapi) { return { ...DEFAULT_SETTINGS, ...((await store(strapi).get({ key: 'analytics' })) || {}) }; }

// ---------- backups ----------
async function backup(strapi) {
  const client = strapi.db.config.connection.client;
  const dir = path.resolve(strapi.dirs.app.root, env('BACKUP_DIR', 'backups'));
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const name = `woa-${stamp}`;
  if (client === 'sqlite' || client === 'better-sqlite3') {
    const file = path.join(dir, `${name}.db`);
    await strapi.db.connection.raw('VACUUM INTO ?', [file]);
    const keep = Number(env('BACKUP_KEEP', 14));
    const all = fs.readdirSync(dir).filter(f => /^woa-.*\.db$/.test(f)).sort();
    for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.unlinkSync(path.join(dir, old));
    const mb = (fs.statSync(file).size / 1048576).toFixed(1);
    await notify(strapi, `Backup ${name} completed (${mb} MB)`, 'success');
    return { file: path.basename(file), size: fs.statSync(file).size };
  }
  await notify(strapi, `Backup skipped: ${client} databases are backed up by the hosting provider (pg_dump / mysqldump)`, 'warning');
  return { skipped: client };
}

// ---------- site rebuild (GitHub Actions) ----------
const gh = () => ({ repo: env('GITHUB_REPO', 'stellasdeutsch-dev/woa'), token: env('GITHUB_TOKEN', ''), site: env('SITE_URL', 'https://stellasdeutsch-dev.github.io/woa/') });
let runsCache = { at: 0, data: null };
async function runs() {
  const { repo, token } = gh();
  if (Date.now() - runsCache.at < 60000 && runsCache.data) return runsCache.data;
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=6`, { headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const j = await res.json();
  const data = (j.workflow_runs || []).map(r => ({ id: r.id, title: r.display_title, event: r.event, status: r.status, conclusion: r.conclusion, created: r.created_at, updated: r.updated_at, url: r.html_url, sha: r.head_sha?.slice(0, 7) }));
  runsCache = { at: Date.now(), data };
  return data;
}
async function dispatch(strapi, reason) {
  const { repo, token } = gh();
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, { method: 'POST', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'cms-publish', client_payload: { reason } }) });
  if (res.status !== 204) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  runsCache.at = 0;
  await store(strapi).set({ key: 'lastDispatch', value: { at: new Date().toISOString(), reason } });
  await notify(strapi, `Site rebuild started: ${reason}`, 'info', `https://github.com/${repo}/actions`);
}
let deployTimer = null;
const pending = new Set();
function scheduleDeploy(strapi, what) {
  if (!env('GITHUB_TOKEN', '') || env('AUTO_DEPLOY', 'true') !== 'true') return;
  pending.add(what);
  clearTimeout(deployTimer);
  deployTimer = setTimeout(() => {
    const reason = [...pending].slice(0, 5).join(', ') + (pending.size > 5 ? ` +${pending.size - 5}` : '');
    pending.clear();
    dispatch(strapi, reason).catch(e => notify(strapi, `Site rebuild failed to start: ${e.message}`, 'error'));
  }, Number(env('DEPLOY_DEBOUNCE_SECONDS', 120)) * 1000);
}

// ---------- analytics ----------
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i;
const deviceOf = (ua = '') => (/ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop');
const hits = new Map();
function limited(ip) {
  const now = Date.now(); const h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > 60000) { h.n = 0; h.t = now; }
  h.n++; hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > 120;
}
const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
async function analytics(strapi, days) {
  const now = new Date(); const from = new Date(now.getTime() - (days - 1) * 86400000); const prevFrom = new Date(from.getTime() - days * 86400000);
  const all = await strapi.db.query(EVENT).findMany({ where: { day: { $gte: dayOf(prevFrom) } }, limit: 500000, select: ['kind', 'path', 'title', 'lang', 'referrer', 'visitor', 'session', 'duration', 'device', 'target', 'day'] });
  const cur = all.filter(e => e.day >= dayOf(from)); const prev = all.filter(e => e.day < dayOf(from));
  const kpi = (list) => {
    const pv = list.filter(e => e.kind === 'pageview');
    const sessions = new Map();
    for (const e of pv) { const s = sessions.get(e.session) || { n: 0, t: 0 }; s.n++; s.t += e.duration || 0; sessions.set(e.session, s); }
    const ns = sessions.size || 0; const total = [...sessions.values()].reduce((a, s) => a + s.t, 0);
    return { visitors: new Set(pv.map(e => e.visitor)).size, pageviews: pv.length, sessions: ns, avgTime: ns ? Math.round(total / ns / 1000) : 0,
      pagesPerSession: ns ? +(pv.length / ns).toFixed(2) : 0, bounce: ns ? Math.round(([...sessions.values()].filter(s => s.n === 1).length / ns) * 100) : 0,
      downloads: list.filter(e => e.kind === 'download').length };
  };
  const perDay = [];
  for (let i = 0; i < days; i++) {
    const d = dayOf(new Date(from.getTime() + i * 86400000)); const list = cur.filter(e => e.day === d && e.kind === 'pageview');
    perDay.push({ day: d, pageviews: list.length, visitors: new Set(list.map(e => e.visitor)).size });
  }
  const group = (list, key) => { const m = new Map(); for (const e of list) { const k = key(e) || '—'; m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })); };
  const pv = cur.filter(e => e.kind === 'pageview');
  const pages = new Map();
  for (const e of pv) { const p = pages.get(e.path) || { path: e.path, title: e.title, views: 0, visitors: new Set(), time: 0 }; p.views++; p.visitors.add(e.visitor); p.time += e.duration || 0; if (e.title) p.title = e.title; pages.set(e.path, p); }
  const topPages = [...pages.values()].sort((a, b) => b.views - a.views).slice(0, 50).map(p => ({ path: p.path, title: p.title, views: p.views, visitors: p.visitors.size, avgTime: Math.round(p.time / p.views / 1000) }));
  return { days, from: dayOf(from), to: dayOf(now), kpi: kpi(cur), prev: kpi(prev), perDay, topPages,
    referrers: group(pv, e => e.referrer).slice(0, 20), languages: group(pv, e => e.lang), devices: group(pv, e => e.device),
    downloads: group(cur.filter(e => e.kind === 'download'), e => e.target).slice(0, 30) };
}

// ---------- controllers ----------
const controllers = {
  dash: ({ strapi }) => ({
    async overview(ctx) {
      const out = [];
      for (const t of TYPES) {
        const r = await rows(strapi, t.uid, []); const pub = await publishedIds(strapi, t.uid);
        const per = {}; for (const l of LOCALES) { const list = r.filter(x => x.locale === l); per[l] = { total: list.length, published: list.filter(x => pub.has(`${x.documentId}|${l}`)).length }; }
        const en = new Set(r.filter(x => x.locale === 'en').map(x => x.documentId));
        const cover = {}; for (const l of ['fr', 'es']) cover[l] = en.size ? Math.round((r.filter(x => x.locale === l && en.has(x.documentId)).length / en.size) * 100) : 0;
        out.push({ key: t.key, label: t.label, uid: t.uid, locales: per, coverage: cover, href: listUrl(t.uid, 'en') });
      }
      const media = await strapi.db.query('plugin::upload.file').count();
      ctx.body = { types: out, media, locales: LOCALES };
    },
    async attention(ctx) {
      const items = [];
      for (const t of TYPES.filter(x => x.image)) {
        const [rel, str] = t.image;
        const r = await strapi.db.query(t.uid).findMany({ select: ['documentId', 'locale', str], where: { publishedAt: { $notNull: true } }, populate: { [rel]: { select: ['id'] } }, limit: 100000 });
        const miss = r.filter(x => !x[rel] && !x[str]);
        items.push({ id: `${t.key}-image`, label: `published ${t.label.toLowerCase()} without an image`, count: miss.length, href: listUrl(t.uid, 'en') });
      }
      for (const t of REVIEWABLE.filter(x => ['news', 'practices', 'pages'].includes(x.key))) {
        const r = await rows(strapi, t.uid, []); const en = r.filter(x => x.locale === 'en').map(x => x.documentId);
        for (const l of ['fr', 'es']) { const have = new Set(r.filter(x => x.locale === l).map(x => x.documentId)); const n = en.filter(id => !have.has(id)).length; items.push({ id: `${t.key}-${l}`, label: `${t.label.toLowerCase()} without a ${l === 'fr' ? 'French' : 'Spanish'} version`, count: n, href: listUrl(t.uid, l) }); }
      }
      for (const t of REVIEWABLE) {
        const r = await rows(strapi, t.uid, []); const pub = await publishedIds(strapi, t.uid);
        const drafts = r.filter(x => !pub.has(`${x.documentId}|${x.locale}`));
        if (drafts.length) items.push({ id: `${t.key}-draft`, label: `${t.label.toLowerCase()} never published (draft)`, count: drafts.length, href: listUrl(t.uid, 'en') });
      }
      const noas = await strapi.db.query('api::noa.noa').findMany({ where: { publishedAt: null, locale: 'en' }, populate: { fields: true }, limit: 1000 });
      items.push({ id: 'noa-email', label: 'NOAs without an email address', count: noas.filter(n => !(n.fields || []).some(f => /mail/i.test(f.label) && (f.value || '').trim())).length, href: listUrl('api::noa.noa', 'en') });
      ctx.body = { items };
    },
    async review(ctx) {
      const out = [];
      for (const t of REVIEWABLE) {
        const r = await strapi.db.query(t.uid).findMany({ select: ['documentId', 'locale', 'updatedAt', 'review_status', 'review_note', t.title], where: { publishedAt: null, review_status: { $in: ['needs_review', 'changes_requested'] } }, limit: 200, orderBy: { updatedAt: 'desc' } });
        for (const x of r) out.push({ type: t.label, title: x[t.title], locale: x.locale, status: x.review_status, note: x.review_note, updatedAt: x.updatedAt, href: editUrl(t.uid, x.documentId, x.locale) });
      }
      out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      ctx.body = { items: out };
    },
    async notifications(ctx) {
      const list = await strapi.db.query(NOTE).findMany({ orderBy: { createdAt: 'desc' }, limit: 50 });
      const unread = await strapi.db.query(NOTE).count({ where: { read: false } });
      ctx.body = { unread, items: list.map(n => ({ id: n.id, title: n.title, kind: n.kind, link: n.link, read: n.read, createdAt: n.createdAt })) };
    },
    async readNotifications(ctx) {
      const ids = ctx.request.body?.ids;
      await strapi.db.query(NOTE).updateMany({ where: ids?.length ? { id: { $in: ids } } : { read: false }, data: { read: true } });
      ctx.body = { ok: true };
    },
    async clearNotifications(ctx) { await strapi.db.query(NOTE).deleteMany({ where: { read: true } }); ctx.body = { ok: true }; },
    async deployStatus(ctx) {
      const { repo, token, site } = gh(); let list = []; let error = null;
      try { list = await runs(); } catch (e) { error = e.message; }
      ctx.body = { repo, site, canDispatch: !!token, autoDeploy: !!token && env('AUTO_DEPLOY', 'true') === 'true', runs: list, error, last: await store(strapi).get({ key: 'lastDispatch' }) };
    },
    async deploy(ctx) {
      try { await dispatch(strapi, ctx.request.body?.reason || 'manual rebuild from the dashboard'); ctx.body = { ok: true }; }
      catch (e) { ctx.status = 400; ctx.body = { ok: false, error: e.message }; }
    },
    async backupNow(ctx) {
      try { ctx.body = await backup(strapi); } catch (e) { await notify(strapi, `Backup failed: ${e.message}`, 'error'); ctx.status = 500; ctx.body = { error: e.message }; }
    },
    async backups(ctx) {
      const dir = path.resolve(strapi.dirs.app.root, env('BACKUP_DIR', 'backups'));
      const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^woa-.*\.db$/.test(f)).sort().reverse().map(f => ({ file: f, size: fs.statSync(path.join(dir, f)).size })) : [];
      ctx.body = { items: list };
    },
  }),
  stats: ({ strapi }) => ({
    async report(ctx) { const days = Math.min(400, Math.max(1, Number(ctx.query.days) || 30)); ctx.body = await analytics(strapi, days); },
    async csv(ctx) {
      const days = Math.min(400, Math.max(1, Number(ctx.query.days) || 30)); const r = await analytics(strapi, days);
      const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const lines = [['day', 'pageviews', 'visitors'].join(','), ...r.perDay.map(d => [d.day, d.pageviews, d.visitors].join(',')), '', ['path', 'title', 'views', 'visitors', 'avg_time_s'].join(','), ...r.topPages.map(p => [q(p.path), q(p.title), p.views, p.visitors, p.avgTime].join(','))];
      ctx.set('Content-Type', 'text/csv; charset=utf-8'); ctx.set('Content-Disposition', `attachment; filename="woa-analytics-${r.from}-${r.to}.csv"`);
      ctx.body = lines.join('\n');
    },
    async getSettings(ctx) { ctx.body = await getSettings(strapi); },
    async setSettings(ctx) {
      const b = ctx.request.body || {};
      const v = { enabled: b.enabled !== false, retentionDays: Math.min(1000, Math.max(30, Number(b.retentionDays) || 395)), excludePaths: Array.isArray(b.excludePaths) ? b.excludePaths.map(String).filter(Boolean).slice(0, 50) : [] };
      await store(strapi).set({ key: 'analytics', value: v }); ctx.body = v;
    },
    async track(ctx) {
      // the public site sends a form-encoded beacon: k=kind, p=path, t=title, l=lang, r=referrer host, v=visitor, s=session, e=event id, d=duration ms, h=download target
      ctx.status = 204;
      const ua = ctx.get('user-agent');
      if (BOT.test(ua) || limited(ctx.ip)) return;
      const b = ctx.request.body || {};
      const st = await getSettings(strapi);
      if (!st.enabled) return;
      const p = clip(b.p, 300);
      if (!p.startsWith('/') || st.excludePaths.some(x => p.startsWith(x))) return;
      if (b.k === 'time') {
        const d = Math.min(3600000, Math.max(0, Number(b.d) || 0)); const eid = clip(b.e, 40);
        if (eid) await strapi.db.query(EVENT).updateMany({ where: { eid, session: clip(b.s, 40) }, data: { duration: d } });
        return;
      }
      const kind = b.k === 'download' ? 'download' : 'pageview';
      await strapi.db.query(EVENT).create({ data: { kind, path: p, title: clip(b.t, 200), lang: clip(b.l, 5), referrer: clip(b.r, 120), visitor: clip(b.v, 40), session: clip(b.s, 40), eid: clip(b.e, 40), duration: 0, device: deviceOf(ua), target: clip(b.h, 300), day: dayOf(Date.now()) } });
    },
  }),
};

const admin = (method, p, handler) => ({ method, path: p, handler, config: { policies: ['admin::isAuthenticatedAdmin'] } });
const routes = {
  admin: { type: 'admin', routes: [
    admin('GET', '/overview', 'dash.overview'), admin('GET', '/attention', 'dash.attention'), admin('GET', '/review', 'dash.review'),
    admin('GET', '/notifications', 'dash.notifications'), admin('POST', '/notifications/read', 'dash.readNotifications'), admin('DELETE', '/notifications', 'dash.clearNotifications'),
    admin('GET', '/deploy', 'dash.deployStatus'), admin('POST', '/deploy', 'dash.deploy'),
    admin('GET', '/backups', 'dash.backups'), admin('POST', '/backups', 'dash.backupNow'),
    admin('GET', '/analytics', 'stats.report'), admin('GET', '/analytics/export', 'stats.csv'),
    admin('GET', '/analytics/settings', 'stats.getSettings'), admin('PUT', '/analytics/settings', 'stats.setSettings'),
  ] },
  'content-api': { type: 'content-api', routes: [
    { method: 'POST', path: '/track', handler: 'stats.track', config: { auth: false, policies: [] } },
  ] },
};

module.exports = {
  contentTypes: {
    event: { schema: require('./content-types/event/schema.json') },
    notification: { schema: require('./content-types/notification/schema.json') },
  },
  controllers,
  routes,
  register() {},
  async bootstrap({ strapi }) {
    // publishing content rebuilds the site (debounced); a request for review creates a notification
    strapi.documents.use(async (ctx, next) => {
      const result = await next();
      try {
        if (!ctx.uid.startsWith('api::')) return result;
        const label = TYPES.find(t => t.uid === ctx.uid)?.label || ctx.contentType?.info?.displayName;
        if (['publish', 'unpublish', 'delete'].includes(ctx.action)) scheduleDeploy(strapi, `${label}: ${ctx.action}`);
        if (['update', 'create'].includes(ctx.action) && ctx.params?.data?.review_status === 'needs_review') {
          const t = TYPES.find(x => x.uid === ctx.uid); const doc = result || {};
          await notify(strapi, `Waiting for review: ${doc[t?.title || 'title'] || label} (${ctx.params.locale || 'en'})`, 'warning', doc.documentId ? editUrl(ctx.uid, doc.documentId, ctx.params.locale || 'en') : null);
        }
      } catch (e) { strapi.log.warn(`[woa] document hook: ${e.message}`); }
      return result;
    });
    strapi.cron.add({
      woaBackup: { task: () => backup(strapi).catch(e => notify(strapi, `Backup failed: ${e.message}`, 'error')), options: { rule: env('BACKUP_CRON', '0 3 * * *') } },
      woaRetention: { task: async () => { const st = await getSettings(strapi); await strapi.db.query(EVENT).deleteMany({ where: { day: { $lt: dayOf(Date.now() - st.retentionDays * 86400000) } } }); }, options: { rule: '30 3 * * *' } },
    });
  },
};
