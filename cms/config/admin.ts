import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  // "Open preview" in the Content Manager shows the entry on the public site (the published version:
  // the site is static and is rebuilt after publishing)
  preview: {
    enabled: true,
    config: {
      allowedOrigins: [new URL(env('SITE_URL', 'https://stellasdeutsch-dev.github.io/woa/')).origin],
      async handler(uid: string, { documentId, locale }: { documentId: string; locale?: string }) {
        const site = env('SITE_URL', 'https://stellasdeutsch-dev.github.io/woa/').replace(/\/$/, '');
        const lang = locale && locale !== 'en' ? `/${locale}` : '';
        const doc: any = await strapi.documents(uid as any).findOne({ documentId, locale });
        if (!doc) return null;
        if (['api::page.page', 'api::news-item.news-item', 'api::practice.practice'].includes(uid)) return site + doc.path;
        if (uid === 'api::noa.noa') return `${site}${lang}/noas/noa-directory/#noa-${String(doc.code).toLowerCase()}`;
        if (uid === 'api::leader.leader' || uid === 'api::honorary-member.honorary-member') return `${site}${lang}/woa/leadership/`;
        return null;
      },
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', false),
    promoteEE: env.bool('FLAG_PROMOTE_EE', false),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
});

export default config;
