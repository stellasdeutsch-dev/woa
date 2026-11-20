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
    for (const n of ['video', 'document', 'document-category', 'faq', 'event', 'event-type', 'grant', 'partner', 'country', 'news-category', 'form']) await app.db.query(`api::${n}.${n}`).deleteMany({});
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
  if (site) {
    // new keys in site.json are added to an existing CMS too; existing texts are left as edited
    const have = new Set((await app.db.query(UID.ui).findMany({ select: ['key'], where: { locale: 'en' }, limit: 1000 })).map(x => x.key));
    const keys = Object.keys(site.ui.en).filter(k => !have.has(k));
    for (const [j, k] of keys.entries()) {
      const i = have.size + j;
      const id = await createPublished(UID.ui, 'en', { key: k, value: site.ui.en[k], order: i });
      for (const l of LANGS) if (site.ui[l]?.[k] !== undefined) await addLocale(UID.ui, id, l, { value: site.ui[l][k] });
    }
    if (keys.length) log(`interface texts added: ${keys.join(', ')}`);
  }
  if (site && !(await app.db.query(UID.settings).count())) {
    const doc = await docs(UID.settings).create({ data: { email: site.email, social: site.social.map(s => ({ label: s.label, href: s.href, icon: s.icon })) } });
    await docs(UID.settings).publish({ documentId: doc.documentId });
    log('site settings');
  }

  // ---------- videos, documents, FAQ, events, grants, partners, lists, forms ----------
  {
    const cheerio = require('cheerio');
    const ALL = {};
    for (const f of ['pages', 'news', 'practices']) for (const l of ['en', ...LANGS]) ALL[`${f}.${l}`] = data(`${f}${l === 'en' ? '' : '.' + l}.json`) || [];
    const every = Object.values(ALL).flat();
    const pages = { en: ALL['pages.en'], fr: ALL['pages.fr'], es: ALL['pages.es'] };
    const langOf = (p) => (p.match(/^\/(fr|es)\//) || [])[1] || 'en';
    const create = async (uid, locale, d) => {
      const doc = await docs(uid).create({ ...(locale ? { locale } : {}), data: d });
      if (app.contentType(uid).options?.draftAndPublish) await docs(uid).publish({ documentId: doc.documentId, ...(locale ? { locale } : {}) });
      return doc.documentId;
    };
    const addTo = async (uid, documentId, locale, d) => {
      await docs(uid).update({ documentId, locale, data: d });
      if (app.contentType(uid).options?.draftAndPublish) await docs(uid).publish({ documentId, locale });
    };
    const empty = async (uid) => !(await app.db.query(uid).count());
    const navLabel = (p) => { const seg = stripLang(p).split('/')[1]; const top = (data('site.json')?.nav || []).find(n => n.href === `/${seg}/`); return top ? top.label : ({ 'best-practices': 'Best Practices', 'oly-house': 'OLY House', grants: 'Grants' }[seg] || (seg ? seg[0].toUpperCase() + seg.slice(1).replace(/-/g, ' ') : 'Home')); };

    // 72 · Countries (names as in the NOA directory) and the NOA link to them
    if (await empty('api::country.country')) {
      const en = data('noas.json'); const ids = new Map();
      for (const n of en) ids.set(n.code, await create('api::country.country', 'en', { name: n.country, code: n.code }));
      for (const l of LANGS) for (const n of data(`noas.${l}.json`) || []) if (ids.get(n.code)) await addTo('api::country.country', ids.get(n.code), l, { name: n.country });
      const noas = await app.db.query(UID.noa).findMany({ where: { locale: 'en', publishedAt: null }, select: ['documentId', 'code'], limit: 1000 });
      for (const n of noas) if (ids.get(n.code)) {
        await docs(UID.noa).update({ documentId: n.documentId, locale: 'en', data: { country_ref: ids.get(n.code) } });
        for (const l of ['en', ...LANGS]) { try { await docs(UID.noa).publish({ documentId: n.documentId, locale: l }); } catch {} }
      }
      log(`countries: ${ids.size}`);
    }

    // 11 · Videos (titles from YouTube oEmbed)
    if (await empty('api::video.video')) {
      const used = new Map();
      for (const x of every) for (const m of `${x.body || ''}${x.side || ''}`.matchAll(/data-yt="([\w-]+)"/g)) { if (!used.has(m[1])) used.set(m[1], new Set()); used.get(m[1]).add(x.path); }
      for (const [id, where] of used) {
        let title = null;
        try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`); if (r.ok) title = (await r.json()).title || null; } catch {}
        await create('api::video.video', null, { youtube_id: id, title, used_on: [...where] });
      }
      log(`videos: ${used.size}`);
    }

    // 71 · Document categories (site sections) and 12 · Documents
    if (await empty('api::document.document')) {
      const found = new Map();
      const add = (href, label, p) => { if (!href || !/\.(pdf|docx?|xlsx?|pptx?)(\?|$)/i.test(href)) return; const d = found.get(href) || { title: (label || '').replace(/\s+/g, ' ').trim(), where: new Set(), lang: langOf(p), section: navLabel(p) }; if (!d.title && label) d.title = label.trim(); d.where.add(p); found.set(href, d); };
      for (const x of every) {
        for (const d of x.downloads || []) add(d.href, d.label, x.path);
        const $ = cheerio.load(`${x.body || ''}${x.side || ''}`);
        $('a[href]').each((_, a) => add($(a).attr('href'), $(a).text(), x.path));
      }
      const cats = new Map(); let order = 0;
      for (const d of found.values()) if (!cats.has(d.section)) cats.set(d.section, await create('api::document-category.document-category', 'en', { name: d.section, order: order++ }));
      for (const [href, d] of found) {
        const title = d.title || decodeURIComponent(href.split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '));
        await create('api::document.document', null, { title: title.slice(0, 250), site_path: href, file: href.startsWith('{{BASE}}/') ? await media(href, 'Documents') : null, language: d.lang, category: cats.get(d.section), used_on: [...d.where] });
      }
      log(`documents: ${found.size} in ${cats.size} categories`);
    }

    // 13 · FAQ: the World Olympians Forum FAQ page, one entry per question (h3)
    if (await empty('api::faq.faq')) {
      const split = (body) => { const parts = []; const rx = /<h3([^>]*)>([\s\S]*?)<\/h3>/g; let m, last = 0, prefix = null;
        while ((m = rx.exec(body))) { if (!parts.length) prefix = body.slice(0, m.index); else parts[parts.length - 1].answer = body.slice(last, m.index); parts.push({ question: m[2], answer: '' }); last = rx.lastIndex; }
        if (parts.length) parts[parts.length - 1].answer = body.slice(last); return { prefix, parts }; };
      const en = pages.en.find(p => p.path === '/olympians/wof/faq/');
      const ids = [];
      if (en) for (const [i, q] of split(en.body).parts.entries()) ids.push(await create('api::faq.faq', 'en', { question: q.question, answer: q.answer, page: en.path, order: i }));
      for (const l of LANGS) { const p = pages[l].find(x => x.path === `/${l}/olympians/wof/faq/`); if (!p) continue; const { parts } = split(p.body);
        for (const [i, q] of parts.entries()) { const d = { question: q.question, answer: q.answer, page: p.path, order: i }; if (ids[i] && parts.length === ids.length) await addTo('api::faq.faq', ids[i], l, d); else await create('api::faq.faq', l, d); } }
      log(`FAQ: ${ids.length} questions`);
    }

    // 73 · Event types and 14 · Events: OLY House programme pages (/oly-house/<programme>/<year>/)
    if (await empty('api::event.event')) {
      const EDITION = { 2020: 'Tokyo 2020', 2022: 'Beijing 2022', 2024: 'Paris 2024' };
      const prog = (p) => stripLang(p).match(/^\/oly-house\/([^/]+)\/(20\d\d)\/$/);
      const enEv = pages.en.filter(p => prog(p.path));
      const bySlug = {}; for (const p of enEv) (bySlug[prog(p.path)[1]] ||= []).push(p);
      const clean = (t) => t.replace(/\.\s*OLY House$/i, '').trim();
      const types = new Map(); let order = 0;
      for (const [slug, list] of Object.entries(bySlug)) if (list.length > 1) {
        const id = await create('api::event-type.event-type', 'en', { name: clean(list[0].title), order: order++ });
        for (const l of LANGS) { const t = pages[l].find(x => x.path === `/${l}${list[0].path}`); if (t) await addTo('api::event-type.event-type', id, l, { name: clean(t.title) }); }
        types.set(slug, id);
      }
      for (const p of enEv) {
        const [, slug, year] = prog(p.path);
        const id = await create('api::event.event', 'en', { title: clean(p.title), edition: EDITION[year] || null, year: +year, event_type: types.get(slug) || null, page: p.path, image: await media(p.bg, 'Backgrounds') });
        for (const l of LANGS) { const t = pages[l].find(x => x.path === `/${l}${p.path}`); if (t) await addTo('api::event.event', id, l, { title: clean(t.title), edition: EDITION[year] || null, page: t.path }); }
      }
      log(`events: ${enEv.length}, event types: ${types.size}`);
    }

    // 15 · Grants and 16 · Partners: indexes of their pages (deadline, status, logo are for editors to fill)
    const fromPages = async (uid, list, extra) => {
      if (!(await empty(uid))) return 0;
      for (const [i, path0] of list.entries()) {
        const p = pages.en.find(x => x.path === path0); if (!p) continue;
        const key = uid === 'api::grant.grant' ? 'name' : 'name';
        const id = await create(uid, 'en', { [key]: p.title, page: p.path, order: i, ...extra(p) });
        for (const l of LANGS) { const t = pages[l].find(x => x.path === `/${l}${p.path}`); if (t) await addTo(uid, id, l, { [key]: t.title, page: t.path }); }
      }
      return list.length;
    };
    log(`grants: ${await fromPages('api::grant.grant', ['/grants/development-grants/', '/grants/service-to-society/', '/grants-battle/'], () => ({}))}`);
    log(`partners: ${await fromPages('api::partner.partner', ['/skillsbuild/', '/airbnb-festival/'], (p) => {
      const host = (p.body.match(/href="https?:\/\/([^/"]+)/g) || []).map(h => h.replace(/^href="https?:\/\//, '')).find(h => /skillsbuild|airbnb/.test(h));
      return { website: host ? 'https://' + host.split('.').slice(-2).join('.') : null };
    })}`);

    // 70 · News categories: an empty list for editors
    // 91 · Forms: every form on the site pages, with its fields
    if (await empty('api::form.form')) {
      const keyOf = (p, i) => (stripLang(p).replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home') + (i ? `-${i + 1}` : '');
      const parse = (p) => { const $ = cheerio.load(p.body || ''); return $('form').toArray().map((f) => {
        const fields = [];
        $(f).find('input[name],select[name],textarea[name]').each((_, el) => {
          const $e = $(el); const type = (el.tagName === 'input' ? ($e.attr('type') || 'text') : el.tagName).toLowerCase();
          if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return;
          const id = $e.attr('id'); const name = $e.attr('name');
          if (fields.some(x => x.name === name && (type === 'radio' || type === 'checkbox'))) return;
          const label = ((id && $(`label[for="${id}"]`).first().text()) || $e.closest('label').text() || $e.attr('placeholder') || $e.attr('aria-label') || name).replace(/\s+/g, ' ').replace(/\*$/, '').trim();
          fields.push({ name, type, label, required: $e.is('[required]') || /\*/.test((id && $(`label[for="${id}"]`).text()) || '') });
        });
        return fields; }); };
      let n = 0;
      for (const p of pages.en) for (const [i, fields] of parse(p).entries()) {
        const key = keyOf(p.path, i);
        const id = await create('api::form.form', 'en', { title: p.title + (i ? ` (${i + 1})` : ''), key, page: p.path, fields, active: true, newsletter_optin: fields.some(f => /newsletter|subscri/i.test(`${f.name} ${f.label}`)) });
        for (const l of LANGS) { const t = pages[l].find(x => x.path === `/${l}${p.path}`); if (t && parse(t)[i]) await addTo('api::form.form', id, l, { title: t.title + (i ? ` (${i + 1})` : ''), page: t.path }); }
        n++;
      }
      log(`forms: ${n}`);
    }
  }

  await app.documents('plugin::woa.notification').create({ data: { title: `Site content imported: pages, news, best practices, NOAs, leadership, menu, interface texts, videos, documents, FAQ, events, grants, partners, countries and forms in 3 languages (${uploaded} files uploaded)`, kind: 'success', read: false } });
  log(`done, ${uploaded} files uploaded`);
  await app.destroy();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
