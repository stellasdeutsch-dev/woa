// Swipe to close for the search, menu and leadership windows (touch only; the close button and Esc still work).
// While the finger is down the window follows it 1:1 (no easing) and resists past the open position (rubber band).
// On release it closes when pulled far enough OR flicked fast enough, leaving at the flick's speed;
// otherwise it springs back. A closing or returning window can be caught and dragged again.
// The dark backdrop fades with the distance pulled (one source of truth: the window's position).
type Axis = 'x' | 'y';
type Opts = { edge?: boolean };                 // edge = full-screen window (the menu); otherwise a floating one

const SHEET = 'cubic-bezier(.32,.72,0,1)';      // iOS sheet curve (Vaul), 500ms for edge-attached windows
const FLOAT = 'cubic-bezier(.165,.84,.44,1)';   // 200ms for small floating windows
const FLY = 'cubic-bezier(.3,.9,.4,1)';         // starts at ~3x the average speed: matches the flick
const FLICK = 0.4;                              // px/ms that closes regardless of distance
const DIST = 0.4;                               // share of the way that closes on a slow drag
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// past the open position the window moves less and less
const rubber = (d: number, size: number) => -(1 - 1 / ((Math.abs(d) * 0.55) / size + 1)) * size * 0.25;

// the nearest element that scrolls vertically, from the touched node up to the window
const scroller = (from: Element | null, dlg: HTMLElement) => {
  for (let el = from as HTMLElement | null; el; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
    if (el === dlg) break;
  }
  return null;
};

export function swipeToClose(dlg: HTMLDialogElement, axis: Axis, { edge = false }: Opts = {}) {
  let x0 = 0, y0 = 0, base = 0, size = 1, offset = 0, timer = 0;
  let state: 'idle' | 'wait' | 'drag' | 'off' = 'idle';
  let samples: { t: number; p: number }[] = [];
  let from: Element | null = null;

  const set = (px: number, ms = 0, ease = SHEET) => {
    dlg.style.transition = ms ? `translate ${ms}ms ${ease}, --swipe-bd ${ms}ms ${ease}` : 'none';
    dlg.style.translate = axis === 'x' ? `${px}px 0` : `0 ${px}px`;
    dlg.style.setProperty('--swipe-bd', String(Math.max(0, 1 - Math.max(px, 0) / size)));
  };
  const reset = () => { dlg.style.transition = ''; dlg.style.translate = ''; dlg.style.removeProperty('--swipe-bd'); };
  // distance to leave the screen
  const measure = () => { const r = dlg.getBoundingClientRect(); size = axis === 'x' ? r.width : innerHeight - r.top; };
  const later = (fn: () => void, ms: number) => { clearTimeout(timer); timer = window.setTimeout(() => { timer = 0; fn(); }, ms); };

  dlg.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { state = 'off'; return; }
    const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; from = e.target as Element; samples = [];
    if (timer) {
      // caught while closing or springing back: hold it where it is and keep dragging from there
      clearTimeout(timer); timer = 0;
      const [tx, ty] = getComputedStyle(dlg).translate.split(' ').map(parseFloat);
      base = (axis === 'x' ? tx : ty) || 0; offset = base; set(base); state = 'drag';
      return;
    }
    base = 0; state = 'wait';
  }, { passive: true });

  dlg.addEventListener('touchmove', (e) => {
    if (state === 'off' || state === 'idle') return;
    const t = e.touches[0]; const dx = t.clientX - x0, dy = t.clientY - y0;
    if (state === 'wait') {
      if (Math.hypot(dx, dy) < 8) return;
      const main = axis === 'x' ? dx : dy, cross = axis === 'x' ? dy : dx;
      // only a pull in the closing direction, mostly along the axis, and (for sheets) when the content is scrolled to the top
      const sc = axis === 'y' ? scroller(from, dlg) : null;
      if (main <= 0 || Math.abs(main) < Math.abs(cross) * 1.2 || (sc && sc.scrollTop > 0)) { state = 'off'; return; }
      state = 'drag'; measure();
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    e.preventDefault();
    const raw = base + (axis === 'x' ? dx : dy);
    offset = raw >= 0 ? raw : rubber(raw, size);
    const now = performance.now(); samples.push({ t: now, p: raw }); samples = samples.filter((s) => now - s.t < 100);
    set(offset);
  }, { passive: false });

  const back = () => {
    if (reduced()) { reset(); return; }
    const ms = edge ? 500 : 200;
    set(0, ms, edge ? SHEET : FLOAT); later(reset, ms + 20);
  };
  const end = () => {
    if (state !== 'drag') { state = 'idle'; return; }
    state = 'idle';
    const now = performance.now(); const a = samples[0], b = samples[samples.length - 1];
    // finger stopped before lifting: no flick
    const v = a && b && b.t > a.t && now - b.t < 60 ? (b.p - a.p) / (b.t - a.t) : 0;
    const close = offset > 0 && (v > FLICK || (offset > size * DIST && v > -0.1));
    if (!close) { back(); return; }
    const done = () => { dlg.style.transition = 'none'; dlg.close(); requestAnimationFrame(() => requestAnimationFrame(reset)); };
    if (reduced()) { done(); return; }
    const ms = Math.round(Math.min(340, Math.max(150, (3 * (size - offset)) / Math.max(v, 1))));
    set(size, ms, FLY); later(done, ms);
  };
  dlg.addEventListener('touchend', end);
  dlg.addEventListener('touchcancel', () => { if (state === 'drag') { state = 'idle'; back(); } else state = 'idle'; });
  // closed by its button or Esc: the next opening starts from the normal position
  dlg.addEventListener('close', () => { clearTimeout(timer); timer = 0; state = 'idle'; if (dlg.style.translate) requestAnimationFrame(() => requestAnimationFrame(reset)); });
}
