// Languages: English at /, French at /fr/, Spanish at /es/ (as on olympians.org, where the same pages exist in all three).
// Menu labels are copied from the original site in each language; the remaining words are service words (search, close…).
export type Lang = 'en' | 'fr' | 'es';
export const ALL_LANGS: Lang[] = ['en', 'fr', 'es'];
// languages that are built and shown in the switcher (French and Spanish data: scripts/crawl-lang*.mjs + LANG_SITE=fr|es extract + xlang)
export const LANGS: Lang[] = ['en', 'fr', 'es'];
export const LANG_NAME: Record<Lang, string> = { en: 'English', fr: 'Français', es: 'Español' };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const langOf = (pathname: string): Lang => {
  const p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const m = p.match(/^\/(fr|es)(\/|$)/);
  return (m ? m[1] : 'en') as Lang;
};
// strip the language prefix: "/fr/woa/about/" -> "/woa/about/"
export const stripLang = (p: string) => p.replace(/^\/(fr|es)(?=\/)/, '');
// add the language prefix to a site path ("/woa/about/" -> "/fr/woa/about/"); external links stay as they are
export const L = (href: string, lang: Lang) => (lang === 'en' || !href.startsWith('/') || /^\/(fr|es)\//.test(href) ? href : `/${lang}${href}`);

// Menu labels and service words live in src/data/site.json (edited in the CMS: 08 · Menu, 09 · Interface texts)
import SITE from '../data/site.json';
const NAV_LABEL: Record<Lang, Record<string, string>> = { en: {}, fr: SITE.navLabel.fr, es: SITE.navLabel.es };
export const navLabel = (href: string, en: string, lang: Lang) => NAV_LABEL[lang][href] ?? en;

const UI = SITE.ui as Record<Lang, typeof SITE.ui.en>;
export type UIKey = keyof typeof UI.en;
export const t = (lang: Lang) => UI[lang];

const LOCALE: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };
export const fmtDateL = (iso: string | null | undefined, lang: Lang) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
};
export const fmtNum = (n: number, lang: Lang) => n.toLocaleString(LOCALE[lang]);

// getStaticPaths helpers for pages under src/pages/[...lang]/
export const LANG_PARAMS = LANGS.map(l => ({ params: { lang: l === 'en' ? undefined : l }, props: { lang: l } }));
export const langParam = (l: Lang) => (l === 'en' ? undefined : l);
export const pageLang = (params: Record<string, string | undefined>): Lang => (params.lang === 'fr' || params.lang === 'es' ? params.lang : 'en');
