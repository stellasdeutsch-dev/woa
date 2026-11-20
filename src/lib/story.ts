// Scroll stories: one mechanism for every scroll-driven block on the site.
// A block marked data-story="<technique>" gets the same behaviour everywhere:
//   - pinned blocks (default) stay on screen while the page scrolls past them (sticky stage inside a tall section);
//   - scroll progress is written to CSS as --p (0..1) and the current step as data-step, steps get .is-on / .is-past / .is-next
//     and --d (how many steps back they are), so each technique is drawn by CSS from the same few values;
//   - the same progress line and step dots are added to every pinned block;
//   - nothing runs for reduced motion or automated browsers (Figma export, tests): the block then shows its plain layout.
// Techniques: steps (pinned photo, text steps), spotlight (one item per screen), stack (cards pile up), words (words light up),
// count (numbers count), window (photo opens from a window), track (horizontal ribbon), timeline (line fills, not pinned).

type Story = {
  el: HTMLElement; stage: HTMLElement; kind: string; pin: boolean;
  steps: HTMLElement[]; words: HTMLElement[]; nums: HTMLElement[];
  dots: HTMLElement[]; step: number; dist: number;
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const locale = (l?: string) => ({ fr: 'fr-FR', es: 'es-ES' } as Record<string, string>)[l || ''] || 'en-GB';

export function initStories() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-story]')];
  if (!els.length) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver || document.documentElement.classList.contains('lite');
  if (still) return;

  const stories: Story[] = els.map((el) => {
    const stage = el.querySelector<HTMLElement>('.story-stage') || el;
    const kind = el.dataset.story!;
    const pin = el.dataset.storyPin !== 'false';
    const steps = [...el.querySelectorAll<HTMLElement>('[data-step]')];
    const words = [...el.querySelectorAll<HTMLElement>('.w')];
    words.forEach((w, i) => w.style.setProperty('--i', String(i)));
    const nums = [...el.querySelectorAll<HTMLElement>('[data-count]')];
    el.style.setProperty('--n', String(Math.max(1, steps.length)));
    if (words.length) el.style.setProperty('--words', String(words.length));
    let dots: HTMLElement[] = [];
    if (pin) {
      const bar = document.createElement('div'); bar.className = 'story-bar'; bar.setAttribute('aria-hidden', 'true');
      stage.appendChild(bar);
      if (steps.length >= 3) {
        const rail = document.createElement('div'); rail.className = 'story-rail'; rail.setAttribute('aria-hidden', 'true');
        rail.innerHTML = steps.map(() => '<i></i>').join('');
        stage.appendChild(rail); dots = [...rail.children] as HTMLElement[];
      }
    }
    el.classList.add('story-on');
    return { el, stage, kind, pin, steps, words, nums, dots, step: -1, dist: 0 };
  });

  // a horizontal ribbon is as tall as it is wide: its scroll length equals the distance it travels
  const measure = () => {
    for (const s of stories) {
      if (s.kind !== 'track') continue;
      const row = s.el.querySelector<HTMLElement>('.story-row'); if (!row) continue;
      // keep the same margin after the last card as before the first one
      const box = row.parentElement!; const left = box.getBoundingClientRect().left - s.stage.getBoundingClientRect().left + parseFloat(getComputedStyle(box).paddingLeft);
      s.dist = Math.max(0, row.scrollWidth + 2 * left - s.stage.clientWidth);
      s.el.style.setProperty('--dist', `${s.dist}px`);
    }
  };

  const setStep = (s: Story, k: number) => {
    if (k === s.step) return;
    s.step = k; s.el.dataset.step = String(k);
    s.steps.forEach((st, i) => {
      st.classList.toggle('is-on', i === k); st.classList.toggle('is-past', i < k); st.classList.toggle('is-next', i > k);
      st.style.setProperty('--d', String(Math.max(0, k - i)));
    });
    s.dots.forEach((d, i) => d.classList.toggle('on', i === k));
  };

  const update = () => {
    const vh = innerHeight;
    for (const s of stories) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      let p: number;
      if (s.pin) {
        const run = r.height - s.stage.offsetHeight;
        p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
      } else {
        p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      }
      s.el.style.setProperty('--p', p.toFixed(4));
      if (s.words.length) s.el.style.setProperty('--lit', (ease(p / 0.8) * s.words.length).toFixed(2));
      if (s.nums.length) {
        const k = ease(p / 0.7);
        for (const n of s.nums) { const end = +n.dataset.count!; n.textContent = Math.round(end * k).toLocaleString(locale(n.dataset.locale)) + (k >= 1 ? n.dataset.suffix || '' : ''); }
      }
      if (s.steps.length) {
        let k: number;
        if (s.pin) k = Math.min(s.steps.length - 1, Math.floor(p * s.steps.length * 0.999));
        else { k = -1; s.steps.forEach((st, i) => { if (st.getBoundingClientRect().top < vh * 0.6) k = i; }); k = Math.max(0, k); }
        setStep(s, k);
      }
    }
  };

  let queued = false;
  const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; update(); }); };
  measure(); update();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); update(); });
  addEventListener('load', () => { measure(); update(); });
}
