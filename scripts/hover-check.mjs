// Every visible link and button must react to hover (design rule). Hovers each one and compares computed styles
// of the element and its children before and after.
// Usage: node scripts/hover-check.mjs http://localhost:4330/woa / /woa/ /olympians/ ...
import { chromium } from 'playwright';

const [base, ...paths] = process.argv.slice(2);
const PROPS = ['color', 'background-color', 'border-color', 'transform', 'text-decoration-line', 'opacity', 'box-shadow', 'outline-style', 'fill', 'stroke', 'translate', 'scale', 'filter'];
const browser = await chromium.launch({ args: ['--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const missing = new Map();
for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'load' });
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  const n = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a[href], button, summary')].filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && !el.closest('[hidden],dialog:not([open]),.skip'); });
    els.forEach((el, i) => el.setAttribute('data-hv', i));
    return els.length;
  });
  for (let i = 0; i < n; i++) {
    const sel = `[data-hv="${i}"]`;
    const snap = () => page.evaluate(({ sel, PROPS }) => { const el = document.querySelector(sel); if (!el) return null; return [el, ...el.querySelectorAll('*'), ...(el.parentElement ? [el.parentElement] : [])].map(x => { const s = getComputedStyle(x); return PROPS.map(k => s.getPropertyValue(k)).join('|'); }).join('#'); }, { sel, PROPS });
    await page.mouse.move(0, 0);
    const before = await snap(); if (before === null) continue;
    try { await page.hover(sel, { timeout: 1500, force: true }); } catch { continue; }
    const after = await snap();
    if (before === after) {
      const d = await page.evaluate(sel => { const el = document.querySelector(sel); return `${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/).slice(0, 2).join('.')} "${(el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30)}" in ${el.parentElement?.className || el.parentElement?.tagName}`; }, sel);
      const key = d.replace(/"[^"]*"/, '""');
      if (!missing.has(key)) missing.set(key, { example: d, page: p, count: 0 });
      missing.get(key).count++;
    }
  }
}
await browser.close();
console.log(`no hover reaction: ${missing.size} kinds`);
for (const [, v] of missing) console.log(`  ${v.count}x ${v.example}  (${v.page})`);
