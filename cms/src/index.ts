import type { Core } from '@strapi/strapi';

// Content types whose published entries the site build reads through the public REST API
const PUBLIC_READ = ['page', 'news-item', 'practice', 'noa', 'leader', 'honorary-member', 'redirect', 'nav-item', 'ui-string', 'site-setting', 'video', 'document', 'faq'];

// Columns of the Content Manager lists (like ISTC: title, address, review status, last change)
const LIST_COLUMNS: Record<string, string[]> = {
  'api::page.page': ['title', 'path', 'section', 'review_status', 'updatedAt'],
  'api::news-item.news-item': ['title', 'date', 'news_id', 'review_status', 'updatedAt'],
  'api::practice.practice': ['title', 'date', 'slug', 'review_status', 'updatedAt'],
  'api::noa.noa': ['country', 'name', 'code', 'olyCount', 'updatedAt'],
  'api::leader.leader': ['name', 'role', 'meta', 'order', 'updatedAt'],
  'api::honorary-member.honorary-member': ['name', 'role', 'order'],
  'api::redirect.redirect': ['from', 'to', 'order'],
  'api::nav-item.nav-item': ['label', 'href', 'icon', 'parent', 'order'],
  'api::ui-string.ui-string': ['key', 'value', 'order'],
  'api::video.video': ['title', 'youtube_id', 'thumbnail', 'updatedAt'],
  'api::document.document': ['title', 'category', 'language', 'file', 'updatedAt'],
  'api::faq.faq': ['question', 'page', 'order', 'updatedAt'],
  'api::event.event': ['title', 'edition', 'event_type', 'year', 'updatedAt'],
  'api::grant.grant': ['name', 'grant_status', 'deadline', 'page', 'updatedAt'],
  'api::partner.partner': ['name', 'website', 'logo', 'order'],
  'api::news-category.news-category': ['name', 'order'],
  'api::document-category.document-category': ['name', 'order'],
  'api::country.country': ['name', 'code'],
  'api::event-type.event-type': ['name', 'order'],
  'api::form.form': ['title', 'key', 'page', 'active', 'newsletter_optin'],
  'api::form-submission.form-submission': ['form', 'name', 'email', 'status', 'createdAt'],
  'api::subscriber.subscriber': ['email', 'name', 'lang', 'status', 'consent_at'],
  'plugin::woa.audit': ['createdAt', 'user_name', 'action', 'type_label', 'title', 'lang'],
  'plugin::woa.review-log': ['createdAt', 'user_name', 'type_label', 'title', 'from_status', 'to_status'],
  'plugin::woa.version': ['createdAt', 'user_name', 'action', 'type_label', 'title', 'lang'],
};
const MAIN_FIELD: Record<string, string> = {
  'api::site-setting.site-setting': 'email',
  'api::page.page': 'title', 'api::news-item.news-item': 'title', 'api::practice.practice': 'title', 'api::noa.noa': 'country',
  'api::leader.leader': 'name', 'api::honorary-member.honorary-member': 'name', 'api::redirect.redirect': 'from', 'api::nav-item.nav-item': 'label', 'api::ui-string.ui-string': 'key',
  'api::video.video': 'title', 'api::document.document': 'title', 'api::faq.faq': 'question', 'api::event.event': 'title', 'api::grant.grant': 'name', 'api::partner.partner': 'name',
  'api::news-category.news-category': 'name', 'api::document-category.document-category': 'name', 'api::country.country': 'name', 'api::event-type.event-type': 'name',
  'api::form.form': 'title', 'api::form-submission.form-submission': 'email', 'api::subscriber.subscriber': 'email',
  'plugin::woa.audit': 'title', 'plugin::woa.review-log': 'title', 'plugin::woa.version': 'title',
};
const SORT: Record<string, string> = { 'api::news-item.news-item': 'date', 'api::practice.practice': 'date', 'api::page.page': 'path', 'api::noa.noa': 'country', 'api::leader.leader': 'order', 'api::honorary-member.honorary-member': 'order', 'api::nav-item.nav-item': 'order', 'api::ui-string.ui-string': 'order', 'api::redirect.redirect': 'order',
  'api::video.video': 'title', 'api::document.document': 'title', 'api::faq.faq': 'order', 'api::event.event': 'year', 'api::grant.grant': 'order', 'api::partner.partner': 'order',
  'api::news-category.news-category': 'order', 'api::document-category.document-category': 'order', 'api::country.country': 'name', 'api::event-type.event-type': 'order',
  'api::form.form': 'title', 'api::form-submission.form-submission': 'createdAt', 'api::subscriber.subscriber': 'createdAt',
  'plugin::woa.audit': 'createdAt', 'plugin::woa.review-log': 'createdAt', 'plugin::woa.version': 'createdAt' };

async function ensureLocales(strapi: Core.Strapi) {
  const svc = strapi.plugin('i18n').service('locales');
  const have = (await svc.find()).map((l: any) => l.code);
  for (const [code, name] of [['fr', 'French (fr)'], ['es', 'Spanish (es)']]) if (!have.includes(code)) await svc.create({ code, name });
}

async function ensurePublicRead(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  if (!role) return;
  for (const name of PUBLIC_READ) {
    for (const action of ['find', 'findOne']) {
      const a = `api::${name}.${name}.${action}`;
      const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action: a, role: role.id } });
      if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action: a, role: role.id } });
    }
  }
}

async function seedAdmin(strapi: Core.Strapi) {
  const email = process.env.SEED_ADMIN_EMAIL; const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  const users = strapi.service('admin::user');
  if ((await strapi.db.query('admin::user').count()) > 0) return;
  const superAdmin = await strapi.service('admin::role').getSuperAdmin();
  await users.create({ email, firstname: 'WOA', lastname: 'Admin', password, isActive: true, registrationToken: null, roles: superAdmin ? [superAdmin.id] : [] });
  strapi.log.info(`[woa] first admin created: ${email}`);
}

// Edit view: what editors change most sits on top; technical fields (addresses, original file paths, order) at the bottom
type R = [string, number][];
const STORY_TAIL: R[] = [[['downloads', 12]], [['tabs', 12]], [['side', 12]], [['review_status', 6], ['review_note', 6]], [['path', 6], ['orig', 6]], [['bg', 6], ['position', 6]], [['related', 12]]];
const EDIT: Record<string, R[]> = {
  'api::page.page': [[['title', 12]], [['section', 6], ['date', 6]], [['hero', 6], ['desc', 6]], [['body', 12]], ...STORY_TAIL],
  'api::news-item.news-item': [[['title', 12]], [['date', 4], ['featured', 4], ['news_id', 4]], [['image', 6], ['excerpt', 6]], [['body', 12]], [['desc', 12]], [['hero', 6], ['img', 6]], [['section', 12]], ...STORY_TAIL],
  'api::practice.practice': [[['title', 12]], [['date', 6], ['slug', 6]], [['image', 6], ['excerpt', 6]], [['body', 12]], [['desc', 12]], [['hero', 6], ['img', 6]], [['section', 12]], ...STORY_TAIL],
  'api::noa.noa': [[['country', 6], ['name', 6]], [['olyCount', 4], ['code', 4], ['position', 4]], [['fields', 12]], [['review_status', 6], ['review_note', 6]], [['flag', 12]]],
  'api::leader.leader': [[['name', 6], ['role', 6]], [['meta', 6], ['photo', 6]], [['bio', 12]], [['order', 4], ['img', 8]], [['review_status', 6], ['review_note', 6]]],
};
const LABELS: Record<string, [string, string?]> = {
  title: ['Title'], section: ['Section'], date: ['Date'], desc: ['Short description', 'Shown in search results and link previews'],
  body: ['Text', 'HTML from the original site; new text can be written in Markdown'], side: ['Side column'],
  hero: ['Hero image', 'Upload to replace the picture; empty = the original file below'], image: ['Picture', 'Upload to replace the picture; empty = the original file below'],
  bg: ['Original hero file', 'Site path of the imported picture; used when no image is uploaded'], img: ['Original picture file', 'Site path of the imported picture; used when no picture is uploaded'],
  tabs: ['Tabs', 'Links shown as tabs above the text'], downloads: ['Documents', 'An uploaded file replaces the link'], related: ['Related pages', 'List of site addresses'],
  path: ['Site address', 'For French and Spanish it starts with /fr or /es'], orig: ['Address on olympians.org'], position: ['Order in the list'],
  review_status: ['Review status', 'needs_review puts the entry on the dashboard for approval'], review_note: ['Note for the reviewer'],
  excerpt: ['Teaser', 'Short text on news cards'], featured: ['Featured'], news_id: ['Article number', 'The number in the address: /news/<number>/…'], slug: ['Address part'],
  country: ['Country'], name: ['Name'], olyCount: ['Olympians registered for OLY'], code: ['Country code'], fields: ['Contacts'], flag: ['Original flag file'],
  role: ['Role'], meta: ['Sport | Country'], photo: ['Photo'], bio: ['Biography'], order: ['Order'],
  youtube_id: ['YouTube id', 'The part after watch?v= in the YouTube address'], thumbnail: ['Cover image', 'Shown before the video plays; empty = the YouTube picture'],
  used_on: ['Used on pages', 'Filled in automatically'], note: ['Note'], file: ['File', 'Upload a new file to replace it on every page'],
  site_path: ['Original file', 'Site path of the imported file'], language: ['Language'], category: ['Category'],
  question: ['Question'], answer: ['Answer'], page: ['Site page', 'Address of the page this belongs to'],
  edition: ['Games edition'], year: ['Year'], event_type: ['Type'], start_date: ['Starts'], end_date: ['Ends'], location: ['Place'], description: ['Description'],
  status: ['Status'], deadline: ['Deadline'], amount: ['Amount'], apply_url: ['Application link'], website: ['Website'], logo: ['Logo'],
  key: ['Key'], recipients: ['Recipients', 'Emails for alerts once an email service is connected'], success_message: ['Thank-you text', 'Shown after sending; empty = the standard text'],
  active: ['Accepting answers'], newsletter_optin: ['Has a newsletter consent box'], form: ['Form'], form_key: ['Form key'], email: ['Email'], lang: ['Language'], data: ['Answers'],
  consent_at: ['Consent given'], source: ['Signed up on'], categories: ['Categories'], country_ref: ['Country in the list'],
  action: ['Action'], type_label: ['Section'], uid: ['Content type'], entry_id: ['Entry id'], grant_status: ['Status'], user_name: ['Editor'], user_email: ['Editor email'],
  changed_fields: ['Changed fields'], from_status: ['From'], to_status: ['To'],
};

async function configureLists(strapi: Core.Strapi) {
  const cm = strapi.plugin('content-manager').service('content-types');
  for (const [uid, cols] of Object.entries({ ...LIST_COLUMNS, 'api::site-setting.site-setting': null as unknown as string[] })) {
    try {
      const ct = strapi.contentType(uid as any);
      if (!ct) continue;
      const conf = await cm.findConfiguration(ct);
      const next = {
        settings: { ...conf.settings, mainField: MAIN_FIELD[uid] ?? conf.settings.mainField, defaultSortBy: SORT[uid] ?? conf.settings.defaultSortBy, defaultSortOrder: SORT[uid] && /date|createdAt|year/.test(SORT[uid]) ? 'DESC' : 'ASC', pageSize: 20 },
        layouts: { ...conf.layouts, ...(cols ? { list: cols } : {}), ...(EDIT[uid] ? { edit: EDIT[uid].map(row => row.filter(([n]) => conf.metadatas[n]).map(([name, size]) => ({ name, size }))).filter(r => r.length) } : {}) },
        metadatas: Object.fromEntries(Object.entries(conf.metadatas).map(([k, m]: [string, any]) => [k, LABELS[k] ? { ...m, edit: { ...m.edit, label: LABELS[k][0], description: LABELS[k][1] ?? m.edit?.description ?? '' }, list: { ...m.list, label: LABELS[k][0] } } : m])),
      };
      await cm.updateConfiguration(ct, next);
    } catch (e: any) {
      strapi.log.warn(`[woa] list layout for ${uid}: ${e.message}`);
    }
  }
}

// Homepage: WOA widgets first, then Strapi's own (an admin who rearranges the page keeps their order)
const HOME = ['global::woa-site', 'global::woa-attention', 'global::woa-review', 'global::woa-notifications', 'global::woa-publishing', 'global::woa-visitors', 'global::woa-translations',
  'plugin::content-manager.last-edited-entries', 'plugin::content-manager.last-published-entries', 'global::profile-info', 'global::key-statistics'];
async function homeLayout(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'core', name: 'admin' });
  for (const u of await strapi.db.query('admin::user').findMany({ select: ['id'] })) {
    const key = `homepage-layout:${u.id}`;
    if (await store.get({ key })) continue;
    await store.set({ key, value: { version: 1, widgets: HOME.map(uid => ({ uid, width: 6 })), updatedAt: new Date().toISOString() } });
  }
}

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
    await ensurePublicRead(strapi);
    await seedAdmin(strapi);
    await configureLists(strapi);
    await homeLayout(strapi);
  },
};
