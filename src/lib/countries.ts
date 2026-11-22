// Countries a story names: NOA Directory country names (in the page's language) found in its title and summary.
import { dataFor } from './data';
import { realFlag } from './site';
import type { Lang } from './i18n';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cache = new Map<Lang, { code: string; name: string; rx: RegExp }[]>();
const list = (lang: Lang) => {
  if (!cache.has(lang)) cache.set(lang, (dataFor(lang).noas as any[]).map(n => {
    const name = String(n.country).split(',')[0].trim();
    return { code: n.code as string, name, rx: new RegExp(`(^|[^\\p{L}])${fold(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u') };
  }).filter(c => c.name.length > 3));
  return cache.get(lang)!;
};

export type StoryFlag = { src: string; w: number; h: number; name: string };
export function storyFlags(story: { title: string; excerpt?: string }, lang: Lang, max = 2): StoryFlag[] {
  const t = fold(`${story.title} ${story.excerpt || ''}`);
  const hits = list(lang).map(c => ({ c, at: t.search(c.rx) })).filter(h => h.at >= 0).sort((a, b) => a.at - b.at);
  const out: StoryFlag[] = [];
  for (const { c } of hits) { const f = realFlag(c.code, 16); if (f) out.push({ src: f.src, w: f.w, h: f.h, name: c.name }); if (out.length >= max) break; }
  return out;
}
