'use strict';
// Audit log, review log and content versions, written by a Document Service middleware.
// Only changes made by a signed-in admin are recorded (imports and scripts are not).
const AUDIT = 'plugin::woa.audit';
const REVIEW = 'plugin::woa.review-log';
const VERSION = 'plugin::woa.version';
const KEEP = 30;
const SKIP_FIELDS = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations']);
const TITLE_KEYS = ['title', 'name', 'question', 'country', 'label', 'key', 'from', 'email', 'youtube_id', 'form_key'];

const userOf = (strapi) => {
  const u = strapi.requestContext.get()?.state?.user;
  return u && u.email ? { name: [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email, email: u.email } : null;
};
const labelOf = (strapi, uid) => (strapi.contentType(uid)?.info?.displayName || uid).replace(/^\d+ · /, '');
const titleOf = (doc) => { if (!doc) return ''; for (const k of TITLE_KEYS) if (doc[k]) return String(doc[k]).slice(0, 200); return doc.documentId || ''; };
const hasDP = (strapi, uid) => !!strapi.contentType(uid)?.options?.draftAndPublish;

// populate media, components (with their media) and relations, so a snapshot can be written back
function populateFor(strapi, attributes, depth = 0) {
  const p = {};
  for (const [k, a] of Object.entries(attributes)) {
    if (SKIP_FIELDS.has(k)) continue;
    if (a.type === 'media') p[k] = true;
    else if (a.type === 'component' && depth < 3) { const inner = populateFor(strapi, strapi.components[a.component].attributes, depth + 1); p[k] = Object.keys(inner).length ? { populate: inner } : true; }
    else if (a.type === 'relation' && !a.mappedBy && depth === 0) p[k] = { fields: ['documentId'] };
  }
  return p;
}
async function snapshot(strapi, uid, documentId, locale) {
  const ct = strapi.contentType(uid);
  return strapi.documents(uid).findOne({ documentId, ...(locale ? { locale } : {}), ...(hasDP(strapi, uid) ? { status: 'draft' } : {}), populate: populateFor(strapi, ct.attributes) });
}
// snapshot -> data for documents().update(): media as ids, components without ids, relations as documentIds
function toData(strapi, attributes, src) {
  const out = {};
  for (const [k, a] of Object.entries(attributes)) {
    if (SKIP_FIELDS.has(k) || !(k in src)) continue;
    const v = src[k];
    if (a.type === 'media') out[k] = Array.isArray(v) ? v.map(m => m.id) : v ? v.id : null;
    else if (a.type === 'component') { const ca = strapi.components[a.component].attributes; out[k] = Array.isArray(v) ? v.map(c => toData(strapi, ca, c)) : v ? toData(strapi, ca, v) : null; }
    else if (a.type === 'relation') { if (a.mappedBy) continue; out[k] = Array.isArray(v) ? v.map(r => r.documentId) : v ? v.documentId : null; }
    else if (a.type === 'dynamiczone') continue;
    else out[k] = v;
  }
  return out;
}
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function saveVersion(strapi, uid, doc, action, user) {
  await strapi.db.query(VERSION).create({ data: { uid, type_label: labelOf(strapi, uid), entry_id: doc.documentId, lang: doc.locale || null, title: titleOf(doc), action, user_name: user.name, data: doc } });
  const old = await strapi.db.query(VERSION).findMany({ where: { uid, entry_id: doc.documentId, lang: doc.locale || null }, orderBy: { id: 'desc' }, offset: KEEP, select: ['id'], limit: 1000 });
  if (old.length) await strapi.db.query(VERSION).deleteMany({ where: { id: { $in: old.map(o => o.id) } } });
}

function register(strapi) {
  strapi.documents.use(async (ctx, next) => {
    const { uid, action, params = {} } = ctx;
    const tracked = uid.startsWith('api::') && ['create', 'update', 'delete', 'publish', 'unpublish', 'discardDraft'].includes(action);
    const user = tracked ? userOf(strapi) : null;
    if (!user) return next();
    let before = null;
    try { if (params.documentId && ['update', 'delete', 'discardDraft'].includes(action)) before = await snapshot(strapi, uid, params.documentId, params.locale); } catch (e) { strapi.log.warn(`[woa] snapshot: ${e.message}`); }
    const result = await next();
    try {
      // publish and unpublish return { documentId, entries }: take the title from the entry itself
      let doc = result?.entries?.[0] || (result && result.documentId ? result : null) || before || {};
      if (!TITLE_KEYS.some(k => doc[k]) && params.documentId && action !== 'delete') doc = (await strapi.documents(uid).findOne({ documentId: params.documentId, ...(params.locale ? { locale: params.locale } : {}) })) || doc;
      const changed = action === 'update' && before ? Object.keys(params.data || {}).filter(k => !SKIP_FIELDS.has(k) && !same(toData(strapi, strapi.contentType(uid).attributes, { [k]: before[k] })[k], params.data[k])) : [];
      if (action === 'update' && before && !changed.length) return result;
      if (before && ['update', 'delete', 'discardDraft'].includes(action)) await saveVersion(strapi, uid, before, action, user);
      await strapi.db.query(AUDIT).create({ data: { action, type_label: labelOf(strapi, uid), uid, entry_id: doc.documentId || params.documentId || null, lang: params.locale || doc.locale || null, title: titleOf(doc) || titleOf(before), user_name: user.name, user_email: user.email, changed_fields: changed } });
      if (action === 'update' && changed.includes('review_status')) {
        await strapi.db.query(REVIEW).create({ data: { type_label: labelOf(strapi, uid), uid, entry_id: params.documentId, lang: params.locale || null, title: titleOf(doc), from_status: before?.review_status || 'none', to_status: params.data.review_status, note: 'review_note' in params.data ? params.data.review_note : before?.review_note ?? null, user_name: user.name } });
      }
    } catch (e) { strapi.log.warn(`[woa] history: ${e.message}`); }
    return result;
  });
}

const controllers = ({ strapi }) => ({
  async list(ctx) {
    const { uid, documentId, locale } = ctx.query;
    if (!uid || !documentId) { ctx.body = { items: [] }; return; }
    const where = { uid, entry_id: documentId, ...(locale ? { lang: locale } : {}) };
    const items = await strapi.db.query(VERSION).findMany({ where, orderBy: { id: 'desc' }, limit: KEEP, select: ['id', 'action', 'user_name', 'createdAt', 'title', 'lang'] });
    ctx.body = { items };
  },
  async restore(ctx) {
    const v = await strapi.db.query(VERSION).findOne({ where: { id: Number(ctx.params.id) } });
    if (!v) { ctx.status = 404; ctx.body = { error: 'Version not found' }; return; }
    const ct = strapi.contentType(v.uid);
    if (!ct) { ctx.status = 400; ctx.body = { error: 'This content type no longer exists' }; return; }
    try {
      const data = toData(strapi, ct.attributes, v.data || {});
      const exists = await strapi.documents(v.uid).findOne({ documentId: v.entry_id, ...(v.lang ? { locale: v.lang } : {}) });
      if (exists) await strapi.documents(v.uid).update({ documentId: v.entry_id, ...(v.lang ? { locale: v.lang } : {}), data });
      else await strapi.documents(v.uid).create({ ...(v.lang ? { locale: v.lang } : {}), data });
      ctx.body = { ok: true, draft: hasDP(strapi, v.uid) };
    } catch (e) { ctx.status = 400; ctx.body = { error: e.message }; }
  },
});

module.exports = { register, controllers };
