// Site structure: four top sections (WOA, Olympians, NOAs, News) and what each landing shows, in every language.
// Every sentence is taken verbatim from the original pages at build time; only the arrangement is new.
import * as cheerio from 'cheerio';
import { dataFor } from './data';
import { type Lang, L, navLabel, stripLang } from './i18n';

const T = (s: string) => s.replace(/\s+/g, ' ').trim();

export type Child = { label: string; href: string; icon: string };
export type Section = { key: string; title: string; href: string; img: string; lead: string; children: Child[] };

function build(lang: Lang) {
  const D = dataFor(lang);
  const load = (path: string) => cheerio.load(D.page(path).body);
  const all = (path: string, sel: string) => { const $ = load(path); return $(sel).map((_, e) => T($(e).text())).get().filter(Boolean); };
  const nav = (href: string, en: string) => navLabel(href, en, lang);
  const loc = (href: string) => L(href, lang);
  // label of an About tab ("Mission", "Historique", "Misión" …)
  const aboutTab = (enPath: string, en: string) => D.page('/woa/about/').tabs.find(t => stripLang(t.href.replace('{{BASE}}', '')) === enPath)?.label ?? en;

  const about = all('/woa/about/', 'h2, p');
  const ABOUT_LEAD = about[0];
  const MISSION = all('/woa/about/mission/', 'h2')[0];
  const VISION = all('/woa/about/vision/', 'h2')[0];

  const child = (en: string, href: string, icon: string): Child => ({ label: nav(href, en), href: loc(href), icon });
  const SECTIONS: Section[] = [
    { key: 'woa', title: 'WOA', href: loc('/woa/'), img: '{{BASE}}/backgrounds/28.webp', lead: MISSION, children: [
      child('About', '/woa/about/', 'about'), child('Olympism', '/woa/olympism/', 'olympism'), child('Leadership', '/woa/leadership/', 'leadership'), child('Contact Us', '/woa/contact-us/', 'contact'),
    ] },
    { key: 'olympians', title: nav('/olympians/', 'Olympians'), href: loc('/olympians/'), img: '{{BASE}}/backgrounds/88.webp', lead: about[3], children: [
      child('OLY', '/olympians/oly/', 'oly'), child('Olympian.org Email', '/olympians/olympian-org-email/', 'at'), child('Health', '/olympians/health/', 'health'),
      child('Olympians for Life', '/olympians/olympians-for-life/', 'life'), child('WOF', '/olympians/wof/', 'forum'), child('SkillsBuild', '/skillsbuild/', 'skills'), child('OLY House', '/oly-house/', 'house'),
    ] },
    { key: 'noas', title: nav('/noas/', 'NOAs'), href: loc('/noas/'), img: '{{BASE}}/backgrounds/45.webp', lead: about[1], children: [
      child('NOA Guide', '/noas/noa-guide/', 'guide'), child('NOA Directory', '/noas/noa-directory/', 'directory'), child('Grants', '/noas/grants/', 'grant'), child('Best Practices', '/best-practices/', 'practice'),
    ] },
  ];

  // History: a paragraph that is only a year, then the paragraph for it
  const history = (() => {
    const $ = load('/woa/about/history/'); const ps = $('p').toArray(); const out: { year: string; text: string }[] = [];
    ps.forEach((p, i) => { const y = T($(p).text()); if (/^\d{4}$/.test(y) && ps[i + 1]) out.push({ year: y, text: T($(ps[i + 1]).text()) }); });
    return out;
  })();
  const olympism = all('/woa/olympism/', 'p');
  const olyAll = all('/olympians/oly/', 'p').filter(t => t.length > 30);
  // English page starts with "Join thousands…"; French and Spanish start with the main sentence
  // French/Spanish: the shortest of the opening paragraphs goes big, the others follow in their order
  const oly = lang === 'en' ? [olyAll[1], olyAll[2], olyAll[0]] : (() => { const first = olyAll.slice(0, 3); const big = [...first].sort((a, b) => a.length - b.length)[0]; return [big, ...first.filter(x => x !== big)]; })();
  const email = all('/olympians/olympian-org-email/', 'h2, p');
  const health = all('/olympians/health/', 'p');
  const life = all('/olympians/olympians-for-life/', 'p');
  const skillsList = all('/skillsbuild/', 'h2, p');
  const skills = skillsList[skillsList.findIndex(t => /^Sign up for SkillsBuild$/.test(t)) + 1] ?? '';
  const guideP = all('/noas/noa-guide/', 'blockquote p')[0];
  const grants = (() => {
    const $ = load('/noas/grants/');
    // "NOA Development – $1,000USD grants per annum" / "Développement des ANO : subventions de 1 000 USD par an"
    const items = $('ul').first().find('li').map((_, li) => { const s = T($(li).text()); const m = s.match(/^(.*?)\s+[–:-]\s+(.*)$/) || s.match(/^(.*?):\s*(.*)$/); return m ? { label: m[1], amount: m[2] } : { label: '', amount: s }; }).get();
    // "Important Dates" table: the heading right before it and its rows (date, what happens)
    const table = $('table').first();
    const dates = { title: T(table.prevAll('h3').first().text()), items: table.find('tr').map((_, tr) => ({ when: T($(tr).find('td').eq(0).text()), what: T($(tr).find('td').eq(1).text()) })).get().filter(x => x.when && x.what) };
    return { aim: T($('p').first().text()), items, dates };
  })();
  // the three numbers written in the health study text (3000 Olympians, 131 countries, 57 sports)
  const HEALTH_RX: Record<Lang, RegExp> = {
    en: /more than (\d[\d\s,.]*) (retired Olympians) from (\d+) (countries), representing (\d+) (Olympic sports)/,
    fr: /Plus de (\d[\d\s ,.]*?) (Olympiens ayant pris leur retraite sportive), provenant de (\d+) (pays) et représentant (\d+) (sports Olympiques)/i,
    es: /más de (\d[\d\s,.]*?) (Atletas Olímpicos retirados) de (\d+) (países), representando (\d+) (deportes olímpicos)/i,
  };
  const hm = health.map(p => p.match(HEALTH_RX[lang])).find(Boolean);
  // OLY House: the first tile on its page ("Welcome to OLY House Milano Cortina 2026" + the line under it), in every language;
  // the page's meta description is English on all three sites
  const houseTile = (() => { const $ = load('/oly-house/'); const s = $('strong').filter((_, e) => $(e).next('em').length > 0).first(); return { head: T(s.text()), text: T(s.next('em').text()) }; })();
  const num = (s: string) => s.replace(/[^\d]/g, '');

  const WOA = {
    about: { title: nav('/woa/about/', 'About'), href: loc('/woa/about/'), text: ABOUT_LEAD, more: about[2], img: '{{BASE}}/backgrounds/28.webp' },
    mission: { title: aboutTab('/woa/about/mission/', 'Mission'), href: loc('/woa/about/mission/'), text: MISSION },
    vision: { title: aboutTab('/woa/about/vision/', 'Vision'), href: loc('/woa/about/vision/'), text: VISION },
    history: { title: aboutTab('/woa/about/history/', 'History'), href: loc('/woa/about/history/'), items: history.slice(0, 4), last: history[history.length - 1] },
    olympism: { title: nav('/woa/olympism/', 'Olympism'), href: loc('/woa/olympism/'), text: olympism[0], more: olympism[1], img: '{{BASE}}/backgrounds/17.webp' },
    leadership: { title: nav('/woa/leadership/', 'Leadership'), href: loc('/woa/leadership/'), people: D.leadership.people },
    contact: { title: nav('/woa/contact-us/', 'Contact Us'), href: loc('/woa/contact-us/'), img: '{{BASE}}/backgrounds/21.webp' },
  };
  const OLYMPIANS = {
    oly: { title: D.page('/olympians/oly/').title, href: loc('/olympians/oly/'), ps: oly },
    email: { title: 'Olympian.org Email', href: loc('/olympians/olympian-org-email/'), head: email[0], text: email[1], img: '{{BASE}}/backgrounds/24.webp' },
    health: { title: D.page('/olympians/health/').title, href: loc('/olympians/health/'), text: health[0], stats: hm ? [[num(hm[1]), hm[2]], [hm[3], hm[4]], [hm[5], hm[6]]] : [], img: '{{BASE}}/backgrounds/54.webp' },
    life: { title: D.page('/olympians/olympians-for-life/').title, href: loc('/olympians/olympians-for-life/'), text: life[0], img: '{{BASE}}/backgrounds/96.webp' },
    skills: { title: D.page('/skillsbuild/').title, href: loc('/skillsbuild/'), text: skills, img: '{{BASE}}/backgrounds/103.webp' },
    wof: { title: 'WOF', href: loc('/olympians/wof/'), text: D.page('/olympians/wof/').section, img: '{{BASE}}/backgrounds/104.webp' },
    house: { title: 'OLY House', href: loc('/oly-house/'), head: houseTile.head, text: houseTile.text || D.page('/oly-house/').desc, img: '{{BASE}}/backgrounds/63.webp' },
  };
  const NOAS = {
    guide: { title: nav('/noas/noa-guide/', 'NOA Guide'), href: loc('/noas/noa-guide/'), text: guideP, chapters: D.page('/noas/noa-guide/').tabs.slice(1).map((t, i) => ({ label: t.label, href: t.href.replace('{{BASE}}', ''), key: dataFor('en').page('/noas/noa-guide/').tabs[i + 1]?.label ?? '' })), img: '{{BASE}}/backgrounds/61.webp' },
    directory: { title: nav('/noas/noa-directory/', 'NOA Directory'), href: loc('/noas/noa-directory/'), flags: D.noas.filter(n => n.flag).map(n => ({ flag: n.flag as string, country: n.country as string, code: (n.code as string).toLowerCase() })) },
    grants: { title: nav('/noas/grants/', 'Grants'), href: loc('/noas/grants/'), text: grants.aim, items: grants.items, dates: grants.dates, img: '{{BASE}}/backgrounds/46.webp' },
    practices: { title: nav('/best-practices/', 'Best Practices'), href: loc('/best-practices/'), items: D.practices.slice(0, 3) },
  };
  // "There are over 100,000 living Olympians throughout the world." -> number + the words after it, up to the end of the sentence
  const statOf = (s: string | undefined) => { const m = s?.match(/(\d{1,3}(?:[ ,. ]\d{3})+|\d+)\s+([^.]*)/); return m ? { n: num(m[1]), text: m[2].trim() } : null; };
  const STATS = [statOf(ABOUT_LEAD), statOf(about[1])].filter(Boolean) as { n: string; text: string }[];
  return { SECTIONS, ABOUT_LEAD, MISSION, VISION, WOA, OLYMPIANS, NOAS, STATS };
}

const cache = new Map<Lang, ReturnType<typeof build>>();
export const sections = (lang: Lang) => { if (!cache.has(lang)) cache.set(lang, build(lang)); return cache.get(lang)!; };
export const sectionOf = (key: string, lang: Lang = 'en') => sections(lang).SECTIONS.find(s => s.key === key)!;
// English shortcuts used by older code
export const SECTIONS = sections('en').SECTIONS;
