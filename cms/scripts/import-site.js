'use strict';
// Loads the whole site (src/data/*.json of the Astro project, English, French and Spanish) into Strapi.
// Usage (Strapi stopped):  npm run import            add what is missing
//                          npm run import -- --reset  delete site content first, then import
// French and Spanish versions become locales of the English document (pages by address, news and best
// practices through src/data/xlang.json, NOAs by country code, people by position). Photos and documents
// go to the Media Library in folders; each file keeps its site path in the caption so the export can tell
// an original file from one an editor uploaded later.
const fs = require('node:fs');
const path = require('node:path');
const { createStrapi } = require('@strapi/strapi');

const APP = path.resolve(__dirname, '..');
const SITE = path.resolve(APP, '..');
const RESET = process.argv.includes('--reset');
const data = (name) => { const f = path.join(SITE, 'src/data', name); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const LANGS = ['fr', 'es'];
const stripLang = (p) => p.replace(/^\/(fr|es)(?=\/)/, '');
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', doc: 'application/msword' };

const UID = {
  page: 'api::page.page', news: 'api::news-item.news-item', practice: 'api::practice.practice', noa: 'api::noa.noa', leader: 'api::leader.leader',
  honorary: 'api::honorary-member.honorary-member', redirect: 'api::redirect.redirect', nav: 'api::nav-item.nav-item', ui: 'api::ui-string.ui-string', settings: 'api::site-setting.site-setting',
};

(async () => {
  const app = await createStrapi({ appDir: APP, distDir: path.join(APP, 'dist') }).load();
  app.log.level = 'warn';
  const t0 = Date.now();
  const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

  if (RESET) {
    for (const uid of Object.values(UID)) await app.db.query(uid).deleteMany({});
    for (const c of ['shared.link', 'shared.download', 'shared.social', 'noa.field']) await app.db.query(c).deleteMany({});
    log('site content deleted');
  }

  // ---------- Media Library ----------
  const upload = app.plugin('upload').service('upload');
  await upload.setSettings({ sizeOptimization: false, responsiveDimensions: false, autoOrientation: false });
  const folderSvc = app.plugin('upload').service('folder');
  const folders = {};
  function folder(name) {
    // one promise per folder: parallel uploads must not create it twice
    if (!folders[name]) folders[name] = (async () => {
      const found = await app.db.query('plugin::upload.folder').findOne({ where: { name, parent: null } });
      return found ? found.id : (await folderSvc.create({ name, parent: null })).id;
    })();
    return folders[name];
  }
  const cache = new Map();
  let uploaded = 0;
  async function media(sitePath, folderName) {
    if (!sitePath || !sitePath.startsWith('{{BASE}}/')) return null;
    if (cache.has(sitePath)) return cache.get(sitePath);
    const abs = path.join(SITE, 'public', sitePath.slice('{{BASE}}'.length));
    const ext = path.extname(abs).slice(1).toLowerCase();
    if (!fs.existsSync(abs) || !MIME[ext]) { cache.set(sitePath, null); return null; }
    let f = await app.db.query('plugin::upload.file').findOne({ where: { caption: sitePath } });
    if (!f) {
      const st = fs.statSync(abs);
      const res = await upload.upload({
        data: { fileInfo: { name: path.basename(abs), caption: sitePath, alternativeText: '', folder: await folder(folderName) } },
        files: { filepath: abs, originalFilename: path.basename(abs), mimetype: MIME[ext], size: st.size },
      });
      f = Array.isArray(res) ? res[0] : res;
      uploaded++;
      if (uploaded % 100 === 0) log(`${uploaded} files uploaded`);
    }
    cache.set(sitePath, f.id);
    return f.id;
  }

  // ---------- helpers ----------
  const docs = (uid) => app.documents(uid);
  async function createPublished(uid, locale, d) {
    const doc = await docs(uid).create({ locale, data: d });
    await docs(uid).publish({ documentId: doc.documentId, locale });
    return doc.documentId;
  }
  async function addLocale(uid, documentId, locale, d) {
    await docs(uid).update({ documentId, locale, data: d });
    await docs(uid).publish({ documentId, locale });
  }
  const downloads = async (list) => { const out = []; for (const d of list || []) out.push({ label: d.label, href: d.href, file: /\.(pdf|docx?|xlsx|pptx)$/i.test(d.href) ? await media(d.href, 'Documents') : null }); return out; };
  const story = async (x, i, kind) => {
    const folderName = { page: 'Backgrounds', news: 'News', practice: 'Best Practices' }[kind];
    const d = {
      title: x.title, path: x.path, orig: x.orig, section: x.section, date: x.date, desc: x.desc, bg: x.bg,
      hero: await media(x.bg, kind === 'page' ? 'Backgrounds' : folderName),
      body: x.body, side: x.side, tabs: (x.tabs || []).map(t => ({ label: t.label, href: t.href, selected: !!t.selected })),
      downloads: await downloads(x.downloads), related: x.related, position: i, review_status: 'none',
    };
    if (kind === 'news') Object.assign(d, { news_id: x.id, img: x.img, image: await media(x.img, 'News'), excerpt: x.excerpt });
    if (kind === 'practice') Object.assign(d, { slug: x.slug, img: x.img, image: await media(x.img, 'Best Practices'), excerpt: x.excerpt });
    return d;
  };
  const existing = async (uid, locale, field) => new Map((await app.db.query(uid).findMany({ where: { locale, publishedAt: null }, select: ['documentId', field], limit: 100000 })).map(r => [r[field], r.documentId]));

  // ---------- pages, news, best practices ----------
  const xlang = data('xlang.json') || { fr: {}, es: {} };
  for (const [kind, file, uid] of [['page', 'pages', UID.page], ['news', 'news', UID.news], ['practice', 'practices', UID.practice]]) {
    const en = data(`${file}.json`);
    const have = await existing(uid, 'en', 'path');
    const byPath = new Map();
    for (const [i, x] of en.entries()) byPath.set(x.path, have.get(x.path) || await createPublished(uid, 'en', await story(x, i, kind)));
    log(`${file}: ${en.length} English`);
    for (const l of LANGS) {
      const list = data(`${file}.${l}.json`) || [];
      const haveL = await existing(uid, l, 'path');
      let paired = 0, alone = 0;
      for (const [i, x] of list.entries()) {
        if (haveL.has(x.path)) continue;
        const enPath = kind === 'page' ? stripLang(x.path) : xlang[l][x.path];
        const docId = enPath && byPath.get(enPath);
        if (docId) { await addLocale(uid, docId, l, await story(x, i, kind)); paired++; }
        else { await createPublished(uid, l, await story(x, i, kind)); alone++; }
      }
      log(`${file}.${l}: ${paired} linked to English, ${alone} only in ${l}`);
    }
  }

  // ---------- NOAs ----------
  {
    const field = (f) => ({ label: f.label, value: (f.value || []).join('\n'), links: f.links || [] });
    const en = data('noas.json'); const have = await existing(UID.noa, 'en', 'code'); const ids = new Map();
    for (const [i, n] of en.entries()) ids.set(n.code, have.get(n.code) || await createPublished(UID.noa, 'en', { code: n.code, country: n.country, name: n.name, flag: n.flag, olyCount: n.olyCount, fields: n.fields.map(field), position: i, review_status: 'none' }));
    for (const l of LANGS) {
      const haveL = await existing(UID.noa, l, 'code');
      for (const [i, n] of (data(`noas.${l}.json`) || []).entries()) {
        if (haveL.has(n.code)) continue;
        const d = { country: n.country, name: n.name, fields: n.fields.map(field), position: i, review_status: 'none' };
        if (ids.get(n.code)) await addLocale(UID.noa, ids.get(n.code), l, d); else await createPublished(UID.noa, l, { code: n.code, flag: n.flag, olyCount: n.olyCount, ...d });
      }
    }
    log(`NOAs: ${en.length}`);
  }

  // ---------- leadership ----------
  {
    const en = data('leadership.json');
    if (!(await app.db.query(UID.leader).count())) {
      for (const [i, p] of en.people.entries()) {
        const id = await createPublished(UID.leader, 'en', { name: p.name, meta: p.meta, role: p.role, img: p.img, photo: await media(p.img, 'Leadership'), bio: p.bio, order: i, review_status: 'none' });
        for (const l of LANGS) { const q = data(`leadership.${l}.json`)?.people[i]; if (q) await addLocale(UID.leader, id, l, { name: q.name, meta: q.meta, role: q.role, bio: q.bio, review_status: 'none' }); }
      }
      for (const [i, h] of en.honorary.entries()) {
        const id = await createPublished(UID.honorary, 'en', { name: h.name, role: h.role, order: i });
        for (const l of LANGS) { const q = data(`leadership.${l}.json`)?.honorary[i]; if (q) await addLocale(UID.honorary, id, l, { name: q.name, role: q.role }); }
      }
    }
    log(`leadership: ${en.people.length} members, ${en.honorary.length} honorary`);
  }

  // ---------- redirects ----------
  if (!(await app.db.query(UID.redirect).count())) {
    const en = data('redirects.json');
    for (const [i, r] of en.entries()) {
      const id = await createPublished(UID.redirect, 'en', { from: r.from, to: r.to, order: i });
      for (const l of LANGS) { const q = (data(`redirects.${l}.json`) || [])[i]; if (q) await addLocale(UID.redirect, id, l, { from: q.from, to: q.to }); }
    }
    log(`redirects: ${en.length}`);
  }

  // ---------- menu, interface texts, settings ----------
  const site = data('site.json');
  if (site && !(await app.db.query(UID.nav).count())) {
    let order = 0;
    async function item(n, parent) {
      const id = await createPublished(UID.nav, 'en', { label: n.label, href: n.href, icon: n.icon || null, order: order++, ...(parent ? { parent } : {}) });
      for (const l of LANGS) if (site.navLabel[l]?.[n.href] !== undefined) await addLocale(UID.nav, id, l, { label: site.navLabel[l][n.href] });
      for (const c of n.children || []) await item(c, id);
    }
    for (const n of site.nav) await item(n, null);
    log(`menu: ${order} items`);
  }
  if (site && !(await app.db.query(UID.ui).count())) {
    const keys = Object.keys(site.ui.en);
    for (const [i, k] of keys.entries()) {
      const id = await createPublished(UID.ui, 'en', { key: k, value: site.ui.en[k], order: i });
      for (const l of LANGS) if (site.ui[l]?.[k] !== undefined) await addLocale(UID.ui, id, l, { value: site.ui[l][k] });
    }
    log(`interface texts: ${keys.length}`);
  }
  if (site && !(await app.db.query(UID.settings).count())) {
    const doc = await docs(UID.settings).create({ data: { email: site.email, social: site.social.map(s => ({ label: s.label, href: s.href, icon: s.icon })) } });
    await docs(UID.settings).publish({ documentId: doc.documentId });
    log('site settings');
  }

  await app.documents('plugin::woa.notification').create({ data: { title: `Site content imported: pages, news, best practices, NOAs, leadership, menu and interface texts in 3 languages (${uploaded} files uploaded)`, kind: 'success', read: false } });
  log(`done, ${uploaded} files uploaded`);
  await app.destroy();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
