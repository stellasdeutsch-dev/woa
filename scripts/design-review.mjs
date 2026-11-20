// Design review pass (web-design-reviewer): every English page of dist at 1440, 834 and 390.
// Checks: horizontal scroll, elements sticking out of the viewport, images without alt, small tap targets (390),
// headings in capitals, low text contrast, console errors.
// Usage: npx astro preview --port 4330 &  node scripts/design-review.mjs http://localhost:4330/woa [out.json]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://localhost:4330/woa').replace(/\/$/, '');
const out = process.argv[3] || 'design-review.json';
const WIDTHS = [1440, 834, 390];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name === 'index.html' ? [path.join(d, e.name)] : []);
let pages = walk('dist').map(f => '/' + path.relative('dist', path.dirname(f)).replace(/\\/g, '/') + '/').map(p => p.replace(/^\/\.\/$/, '/').replace('//', '/'))
  .filter(p => !/^\/(fr|es)\//.test(p) && !/\/page\/\d+\/|\/year\/\d+\//.test(p));
const articles = pages.filter(p => /^\/(news|best-practices)\/.+|^\/actions\//.test(p));
pages = pages.filter(p => !articles.includes(p)).concat(articles.filter((_, i) => i % 60 === 0));

function audit(width) {
  const vw = document.documentElement.clientWidth; const res = { overflowX: document.documentElement.scrollWidth > vw + 1, sticking: [], noAlt: [], small: [], caps: [], contrast: [] };
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden],dialog:not([open]),[aria-hidden="true"]'); };
  const clipped = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true; } return false; };
  const label = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || el.getAttribute('aria-label') || el.getAttribute('src') || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '"');
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !clipped(el) && res.sticking.length < 5) res.sticking.push(label(el) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
  }
  for (const img of document.querySelectorAll('main img')) if (!img.hasAttribute('alt') && visible(img)) res.noAlt.push(label(img));
  if (width <= 400) for (const el of document.querySelectorAll('a[href], button, summary, input, select')) {
    if (!visible(el) || el.closest('p, li p, td, .prose p, .prose li, .crumbs, figcaption')) continue;
    const r = el.getBoundingClientRect(); if ((r.height < 40 || r.width < 40) && res.small.length < 8) res.small.push(label(el) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  for (const h of document.querySelectorAll('h1,h2,h3,h4')) if (visible(h) && getComputedStyle(h).textTransform === 'uppercase') res.caps.push(label(h));
  const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = el => { for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.backgroundImage !== 'none') return null; const c = rgb(s.backgroundColor); if (c && c.a > 0.95) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const seen = new Set();
  for (const el of document.querySelectorAll('main p, main li, main a, main span, main h1, main h2, main h3, main h4, main button, main label, main td, footer a, footer p, header a')) {
    if (!visible(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el); const fg = rgb(s.color); const bg = bgOf(el); if (!fg || !bg || fg.a < 0.95) continue;
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700; const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const key = s.color + '|' + s.fontSize; if (ratio < need && !seen.has(key) && res.contrast.length < 6) { seen.add(key); res.contrast.push(label(el) + ` ${ratio.toFixed(2)}:1 (${s.color} on rgb(${bg.r},${bg.g},${bg.b}), ${size}px)`); }
  }
  return res;
}

const browser = await chromium.launch({ args: ['--mute-audio'] });
const report = [];
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  let errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  for (const p of pages) {
    errors = [];
    // a redirect page (meta refresh) left open can interrupt the next load: reset the tab and retry once
    try { await page.goto('about:blank'); } catch {}
    try { await page.goto(base + p, { waitUntil: 'load', timeout: 30000 }).catch(() => page.goto(base + p, { waitUntil: 'load', timeout: 30000 })); } catch (e) { report.push({ p, width, load: String(e).slice(0, 80) }); continue; }
    let r; try { r = await page.evaluate(audit, width); } catch { continue; } // redirect pages (meta refresh) navigate away
    const issues = Object.fromEntries(Object.entries(r).filter(([, v]) => v === true || (Array.isArray(v) && v.length)));
    const errs = errors.filter(e => !/favicon|404 \(Not Found\)/.test(e));
    if (errs.length) issues.console = errs.slice(0, 3);
    if (Object.keys(issues).length) report.push({ p, width, ...issues });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(report, null, 1));
const count = k => report.filter(r => r[k]).length;
console.log(`pages: ${pages.length} x ${WIDTHS.length} widths; with issues: ${report.length}`);
for (const k of ['load', 'overflowX', 'sticking', 'noAlt', 'small', 'caps', 'contrast', 'console']) console.log(`  ${k}: ${count(k)}`);
