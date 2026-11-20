'use strict';
// Public endpoint for the site forms: POST /api/woa/forms/:key (form-encoded or JSON).
// Stores the answers in 92 · Form submissions; a newsletter consent adds the person to 93 · Newsletter subscribers.
const FORM = 'api::form.form';
const SUBMISSION = 'api::form-submission.form-submission';
const SUBSCRIBER = 'api::subscriber.subscriber';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hits = new Map();
function limited(ip) {
  const now = Date.now(); const h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > 600000) { h.n = 0; h.t = now; }
  h.n++; hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > 10;
}

const controllers = ({ strapi }, notify) => ({
  async submit(ctx) {
    const body = ctx.request.body || {};
    // the hidden field "_hp" is filled only by bots
    if (body._hp) { ctx.body = { ok: true }; return; }
    if (limited(ctx.ip)) { ctx.status = 429; ctx.body = { ok: false, error: 'Too many submissions, try again later' }; return; }
    const key = String(ctx.params.key || '').slice(0, 120);
    const lang = ['en', 'fr', 'es'].includes(body._lang) ? body._lang : 'en';
    const forms = await strapi.db.query(FORM).findMany({ where: { key }, limit: 10 });
    const form = forms.find(f => f.locale === lang) || forms.find(f => f.locale === 'en') || forms[0];
    if (!form || form.active === false) { ctx.status = 404; ctx.body = { ok: false, error: 'This form is closed' }; return; }
    const data = {};
    for (const [k, v] of Object.entries(body).slice(0, 60)) {
      if (k.startsWith('_')) continue;
      data[k.slice(0, 80)] = Array.isArray(v) ? v.map(x => String(x).slice(0, 2000)) : String(v).slice(0, 5000);
    }
    const values = Object.entries(data);
    const email = (values.find(([k, v]) => /mail/i.test(k) && EMAIL.test(String(v))) || values.find(([, v]) => EMAIL.test(String(v))) || [])[1] || null;
    const name = values.filter(([k]) => /name|nom|nombre/i.test(k) && !/user|company|organi/i.test(k)).map(([, v]) => v).join(' ').trim().slice(0, 200) || null;
    const sub = await strapi.documents(SUBMISSION).create({ data: { form: form.documentId, form_key: key, name, email, page: String(body._page || form.page || '').slice(0, 300), lang, data, status: 'new' } });
    if (form.newsletter_optin && email && values.some(([k, v]) => /newsletter|subscribe|consent|optin/i.test(k) && v && !/^(no|false|0)$/i.test(String(v)))) {
      const found = await strapi.db.query(SUBSCRIBER).findOne({ where: { email: email.toLowerCase() } });
      if (!found) await strapi.documents(SUBSCRIBER).create({ data: { email: email.toLowerCase(), name, lang, status: 'subscribed', source: form.page, consent_at: new Date().toISOString() } });
      else if (found.status !== 'subscribed') await strapi.db.query(SUBSCRIBER).update({ where: { id: found.id }, data: { status: 'subscribed', consent_at: new Date() } });
    }
    await notify(strapi, `New form submission: ${form.title}${name ? ` from ${name}` : ''}`, 'info', `/content-manager/collection-types/${SUBMISSION}/${sub.documentId}`);
    ctx.body = { ok: true, message: form.success_message || '' };
  },
});

module.exports = { controllers };
