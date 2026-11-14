// Site structure: four top sections (WOA, Olympians, NOAs, News) and what each landing shows.
// Every sentence is taken verbatim from the original pages at build time; only the arrangement is new.
import * as cheerio from 'cheerio';
import { page, leadership, noas, practices } from './data';

const T = (s: string) => s.replace(/\s+/g, ' ').trim();
const load = (path: string) => cheerio.load(page(path).body);
const all = (path: string, sel: string) => { const $ = load(path); return $(sel).map((_, e) => T($(e).text())).get().filter(Boolean); };

const about = all('/woa/about/', 'h2, p');
export const ABOUT_LEAD = about[0]; // "There are over 100,000 living Olympians throughout the world. Our remit is …"
export const MISSION = all('/woa/about/mission/', 'h2')[0];
export const VISION = all('/woa/about/vision/', 'h2')[0];

export type Child = { label: string; href: string; icon: string };
export type Section = { key: string; title: string; href: string; img: string; lead: string; children: Child[] };

export const SECTIONS: Section[] = [
  {
    key: 'woa', title: 'WOA', href: '/woa/', img: '{{BASE}}/backgrounds/28.webp', lead: MISSION,
    children: [
      { label: 'About', href: '/woa/about/', icon: 'about' },
      { label: 'Olympism', href: '/woa/olympism/', icon: 'olympism' },
      { label: 'Leadership', href: '/woa/leadership/', icon: 'leadership' },
      { label: 'Contact Us', href: '/woa/contact-us/', icon: 'contact' },
    ],
  },
  {
    key: 'olympians', title: 'Olympians', href: '/olympians/', img: '{{BASE}}/backgrounds/88.webp', lead: about[3],
    children: [
      { label: 'OLY', href: '/olympians/oly/', icon: 'oly' },
      { label: 'Olympian.org Email', href: '/olympians/olympian-org-email/', icon: 'at' },
      { label: 'Health', href: '/olympians/health/', icon: 'health' },
      { label: 'Olympians for Life', href: '/olympians/olympians-for-life/', icon: 'life' },
      { label: 'WOF', href: '/olympians/wof/', icon: 'forum' },
      { label: 'SkillsBuild', href: '/skillsbuild/', icon: 'skills' },
      { label: 'OLY House', href: '/oly-house/', icon: 'house' },
    ],
  },
  {
    key: 'noas', title: 'NOAs', href: '/noas/', img: '{{BASE}}/backgrounds/45.webp', lead: about[1],
    children: [
      { label: 'NOA Guide', href: '/noas/noa-guide/', icon: 'guide' },
      { label: 'NOA Directory', href: '/noas/noa-directory/', icon: 'directory' },
      { label: 'Grants', href: '/noas/grants/', icon: 'grant' },
      { label: 'Best Practices', href: '/best-practices/', icon: 'practice' },
    ],
  },
];
export const sectionOf = (key: string) => SECTIONS.find(s => s.key === key)!;

// ---- material for the landings ----
const history = (() => {
  const $ = load('/woa/about/history/');
  const ps = $('p').toArray();
  const out: { year: string; text: string }[] = [];
  ps.forEach((p, i) => { const y = T($(p).text()); if (/^\d{4}$/.test(y) && ps[i + 1]) out.push({ year: y, text: T($(ps[i + 1]).text()) }); });
  return out;
})();

const olympism = all('/woa/olympism/', 'p');
const oly = all('/olympians/oly/', 'p').filter(t => t.length > 30);
const email = all('/olympians/olympian-org-email/', 'h2, p');
const health = all('/olympians/health/', 'p');
const life = all('/olympians/olympians-for-life/', 'p');
// the paragraph under "Sign up for SkillsBuild"
const skills = all('/skillsbuild/', 'p').find(t => /^Wherever you are on your career journey/.test(t)) ?? '';
const guideP = all('/noas/noa-guide/', 'blockquote p')[0];
const grants = (() => { const $ = load('/noas/grants/'); return { aim: T($('p').first().text()), items: $('ul').first().find('li').map((_, li) => T($(li).text())).get() }; })();

// numbers that are written in the health text: "more than 3000 retired Olympians from 131 countries, representing 57 Olympic sports"
const hm = health[1]?.match(/more than (\d+) (retired Olympians) from (\d+) (countries), representing (\d+) (Olympic sports)/);

export const WOA_LANDING = {
  about: { title: 'About', href: '/woa/about/', text: ABOUT_LEAD, more: about[2], img: '{{BASE}}/backgrounds/28.webp' },
  mission: { title: 'Mission', href: '/woa/about/mission/', text: MISSION },
  vision: { title: 'Vision', href: '/woa/about/vision/', text: VISION },
  history: { title: 'History', href: '/woa/about/history/', items: history.slice(0, 4), last: history[history.length - 1] },
  olympism: { title: 'Olympism', href: '/woa/olympism/', text: olympism[0], more: olympism[1], img: '{{BASE}}/backgrounds/17.webp' },
  leadership: { title: 'Leadership', href: '/woa/leadership/', people: leadership.people },
  contact: { title: 'Contact Us', href: '/woa/contact-us/', img: '{{BASE}}/backgrounds/21.webp' },
};

export const OLYMPIANS_LANDING = {
  oly: { title: 'Register for OLY', href: '/olympians/oly/', ps: oly.slice(0, 3) },
  email: { title: 'Olympian.org Email', href: '/olympians/olympian-org-email/', head: email[0], text: email[1], img: '{{BASE}}/backgrounds/24.webp' },
  health: { title: page('/olympians/health/').title, href: '/olympians/health/', text: health[0], stats: hm ? [[hm[1], hm[2]], [hm[3], hm[4]], [hm[5], hm[6]]] : [], img: '{{BASE}}/backgrounds/54.webp' },
  life: { title: 'Olympians for Life', href: '/olympians/olympians-for-life/', text: life[0], img: '{{BASE}}/backgrounds/96.webp' },
  skills: { title: 'SkillsBuild for Olympians', href: '/skillsbuild/', text: skills, img: '{{BASE}}/backgrounds/103.webp' },
  wof: { title: 'WOF', href: '/olympians/wof/', text: page('/olympians/wof/').section, img: '{{BASE}}/backgrounds/104.webp' },
  house: { title: 'OLY House', href: '/oly-house/', text: page('/oly-house/').desc, img: '{{BASE}}/backgrounds/63.webp' },
};

export const NOAS_LANDING = {
  guide: { title: 'NOA Guide', href: '/noas/noa-guide/', text: guideP, chapters: page('/noas/noa-guide/').tabs.slice(1).map(t => ({ label: t.label, href: t.href.replace('{{BASE}}', '') })), img: '{{BASE}}/backgrounds/61.webp' },
  directory: { title: 'NOA Directory', href: '/noas/noa-directory/', flags: noas.filter(n => n.flag).map(n => ({ flag: n.flag as string, country: n.country as string, code: (n.code as string).toLowerCase() })) },
  grants: { title: 'Grants', href: '/noas/grants/', text: grants.aim, items: grants.items, img: '{{BASE}}/backgrounds/46.webp' },
  practices: { title: 'Best Practices', href: '/best-practices/', items: practices.slice(0, 3) },
};
