import pagesRaw from '../data/pages.json';
import newsRaw from '../data/news.json';
import practicesRaw from '../data/practices.json';
import noasRaw from '../data/noas.json';
import redirectsRaw from '../data/redirects.json';
import leadershipRaw from '../data/leadership.json';
// French / Spanish data is optional (made by LANG_SITE=fr|es scripts/extract.mjs, not kept in git); missing files fall back to English
const LANG_FILES = import.meta.glob('../data/*.{fr,es}.json', { eager: true, import: 'default' }) as Record<string, any>;
const XL_FILES = import.meta.glob('../data/xlang.json', { eager: true, import: 'default' }) as Record<string, any>;
const lf = (name: string, lang: 'fr' | 'es', fallback: any) => LANG_FILES[`../data/${name}.${lang}.json`] ?? fallback;
const pagesFr = lf('pages', 'fr', pagesRaw), newsFr = lf('news', 'fr', newsRaw), practicesFr = lf('practices', 'fr', practicesRaw), noasFr = lf('noas', 'fr', noasRaw), redirectsFr = lf('redirects', 'fr', redirectsRaw), leadershipFr = lf('leadership', 'fr', leadershipRaw);
const pagesEs = lf('pages', 'es', pagesRaw), newsEs = lf('news', 'es', newsRaw), practicesEs = lf('practices', 'es', practicesRaw), noasEs = lf('noas', 'es', noasRaw), redirectsEs = lf('redirects', 'es', redirectsRaw), leadershipEs = lf('leadership', 'es', leadershipRaw);
const xlangRaw = XL_FILES['../data/xlang.json'] ?? { fr: {}, es: {} };
import { type Lang, L, stripLang, navLabel } from './i18n';

export type Page = { path: string; orig: string; title: string; section: string; date: string | null; bg: string | null; tabs: { label: string; href: string; selected: boolean }[]; body: string; side: string; downloads: { label: string; href: string }[]; related: string[]; desc: string };
export type Story = Page & { id?: number; slug?: string; img: string | null; excerpt: string };
export const pages = pagesRaw as Page[];
export const news = newsRaw as Story[];
export const practices = practicesRaw as Story[];
export const noas = noasRaw as any[];
export const redirects = redirectsRaw as { from: string; to: string }[];
export const leadership = leadershipRaw as { honorary: { name: string; role: string }[]; people: { name: string; meta: string; role: string; img: string; bio: string }[] };
export const page = (p: string) => pages.find(x => x.path === p)!;

// ---- the same data in every language (French and Spanish paths start with /fr or /es) ----
type Leadership = typeof leadership;
export type LangData = { lang: Lang; pages: Page[]; news: Story[]; practices: Story[]; noas: any[]; redirects: { from: string; to: string }[]; leadership: Leadership; page: (enPath: string) => Page };
const mk = (lang: Lang, pg: any, nw: any, pr: any, no: any, rd: any, ld: any): LangData => {
  const P = pg as Page[]; const byPath = new Map(P.map(x => [x.path, x]));
  return { lang, pages: P, news: nw as Story[], practices: pr as Story[], noas: no as any[], redirects: rd as any, leadership: ld as Leadership,
    // a page missing in French/Spanish falls back to English (as links do)
    page: (enPath: string) => byPath.get(L(enPath, lang)) ?? page(enPath) };
};
const DATA: Record<Lang, LangData> = {
  en: mk('en', pagesRaw, newsRaw, practicesRaw, noasRaw, redirectsRaw, leadershipRaw),
  fr: mk('fr', pagesFr, newsFr, practicesFr, noasFr, redirectsFr, leadershipFr),
  es: mk('es', pagesEs, newsEs, practicesEs, noasEs, redirectsEs, leadershipEs),
};
export const dataFor = (lang: Lang) => DATA[lang];

// translated news / best practices <-> English article (see scripts/xlang.mjs)
const XL = xlangRaw as Record<'fr' | 'es', Record<string, string>>;
const EN_TO: Record<'fr' | 'es', Map<string, string>> = { fr: new Map(Object.entries(XL.fr).map(([k, v]) => [v, k])), es: new Map(Object.entries(XL.es).map(([k, v]) => [v, k])) };
// where the language switch goes from a given path (site paths, without base). Falls back to the section list.
export function altPath(path: string, from: Lang, to: Lang): string {
  if (from === to) return path;
  if (/^\/((fr|es)\/)?404/.test(path)) return L('/', to);
  let en = path;
  if (from !== 'en') {
    const story = XL[from][path];
    if (!story && /^\/(fr|es)\/news\/\d+\//.test(path)) return L('/news/', to);
    if (!story && /^\/(fr|es)\/best-practices\/(?!page\/|year\/|submissions\/)[^/]+\/$/.test(path)) return L('/best-practices/', to);
    en = story ?? stripLang(path);
  }
  if (to === 'en') return en;
  const story = EN_TO[to].get(en);
  if (story) return story;
  // an article that has no translation: go to the list of that language
  if (/^\/news\/\d+\//.test(en)) return L('/news/', to);
  if (/^\/best-practices\/(?!page\/|year\/|submissions\/)[^/]+\/$/.test(en)) return L('/best-practices/', to);
  return L(en, to);
}

const SECTIONS: Record<string, { label: string; href: string }[]> = {
  woa: [{ label: 'WOA', href: '/woa/' }],
  olympians: [{ label: 'Olympians', href: '/olympians/' }],
  noas: [{ label: 'NOAs', href: '/noas/' }],
  news: [{ label: 'News', href: '/news/' }],
  'oly-house': [{ label: 'Olympians', href: '/olympians/' }, { label: 'OLY House', href: '/oly-house/' }],
  skillsbuild: [{ label: 'Olympians', href: '/olympians/' }],
  'best-practices': [{ label: 'NOAs', href: '/noas/' }, { label: 'Best Practices', href: '/best-practices/' }],
  grants: [{ label: 'NOAs', href: '/noas/' }],
};
// breadcrumbs with labels and links in the page's language
export function crumbsFor(p: Page | Story, lang: Lang = 'en'): { label: string; href?: string }[] {
  const path = stripLang(p.path);
  const D = dataFor(lang);
  const lab = (href: string, en: string) => navLabel(href, en, lang);
  const c: { label: string; href?: string }[] = [];
  const add = (href: string, en: string) => c.push(href !== path ? { label: lab(href, en), href: L(href, lang) } : { label: lab(href, en) });
  for (const s of SECTIONS[path.split('/')[1]] ?? []) add(s.href, s.label);
  if (path.startsWith('/woa/about/') && path !== '/woa/about/') add('/woa/about/', 'About');
  if (path.startsWith('/noas/noa-guide/')) add('/noas/noa-guide/', 'NOA Guide');
  if (path.startsWith('/olympians/wof/') && path !== '/olympians/wof/') add('/olympians/wof/', 'WOF');
  if (/^\/oly-house\/.+\/(\d{4})\/$/.test(path)) { const y = path.match(/(\d{4})\/$/)![1]; c.push({ label: y, href: L(`/oly-house/${y}/`, lang) }); }
  if (c.length && c[c.length - 1].label === p.title && !c[c.length - 1].href) return c;
  c.push({ label: p.title });
  void D;
  return c;
}
