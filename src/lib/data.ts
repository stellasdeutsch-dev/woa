import pagesRaw from '../data/pages.json';
import newsRaw from '../data/news.json';
import practicesRaw from '../data/practices.json';
import noasRaw from '../data/noas.json';
import redirectsRaw from '../data/redirects.json';
import leadershipRaw from '../data/leadership.json';

export type Page = { path: string; orig: string; title: string; section: string; date: string | null; bg: string | null; tabs: { label: string; href: string; selected: boolean }[]; body: string; side: string; downloads: { label: string; href: string }[]; related: string[]; desc: string };
export type Story = Page & { id?: number; slug?: string; img: string | null; excerpt: string };
export const pages = pagesRaw as Page[];
export const news = newsRaw as Story[];
export const practices = practicesRaw as Story[];
export const noas = noasRaw as any[];
export const redirects = redirectsRaw as { from: string; to: string }[];
export const leadership = leadershipRaw as { honorary: { name: string; role: string }[]; people: { name: string; meta: string; role: string; img: string; bio: string }[] };
export const page = (p: string) => pages.find(x => x.path === p)!;

const SECTIONS: Record<string, { label: string; href: string }> = {
  woa: { label: 'WOA', href: '/woa/about/' },
  olympians: { label: 'Olympians', href: '/olympians/oly/' },
  noas: { label: 'NOAs', href: '/noas/noa-guide/' },
  news: { label: 'News', href: '/news/' },
  'oly-house': { label: 'OLY House', href: '/oly-house/' },
  'best-practices': { label: 'Best Practices', href: '/best-practices/' },
  grants: { label: 'Grants', href: '/noas/grants/' },
};
export function crumbsFor(p: Page | Story): { label: string; href?: string }[] {
  const seg = p.path.split('/')[1];
  const c: { label: string; href?: string }[] = [];
  const s = SECTIONS[seg];
  if (s) c.push(s.href !== p.path ? s : { label: s.label });
  if (p.path.startsWith('/woa/about/') && p.path !== '/woa/about/') c.push({ label: 'About', href: '/woa/about/' });
  if (p.path.startsWith('/noas/noa-guide/')) c.push(p.path !== '/noas/noa-guide/' ? { label: 'NOA Guide', href: '/noas/noa-guide/' } : { label: 'NOA Guide' });
  if (p.path.startsWith('/olympians/wof/') && p.path !== '/olympians/wof/') c.push({ label: 'WOF', href: '/olympians/wof/' });
  if (/^\/oly-house\/.+\/(\d{4})\/$/.test(p.path)) { const y = p.path.match(/(\d{4})\/$/)![1]; c.push({ label: y, href: `/oly-house/${y}/` }); }
  c.push({ label: p.title });
  return c;
}
