// Smoke test of the built site: horizontal scroll, console errors, broken images. Usage: node scripts/smoke.mjs <baseUrl>
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:4321/woa';
const pages = JSON.parse(fs.readFileSync('src/data/pages.json', 'utf8')).map(p => p.path);
const news = JSON.parse(fs.readFileSync('src/data/news.json', 'utf8')).filter((_, i) => i % 35 === 0).map(n => n.path);
const bp = JSON.parse(fs.readFileSync('src/data/practices.json', 'utf8')).filter((_, i) => i % 20 === 0).map(n => n.path);
const urls = ['/', '/woa/', '/olympians/', '/noas/', '/news/', '/news/page/2/', '/news/year/2016/', '/best-practices/', ...pages, ...news, ...bp];
const browser = await chromium.launch({ args: ['--mute-audio'] });
const problems = [];
for (const w of (process.env.WIDTHS || "390,1440").split(",").map(Number)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  let errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  for (const u of urls) {
    errs = [];
    const r = await page.goto(base + u, { waitUntil: 'load' }).catch(e => null);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
    await page.waitForTimeout(150);
    const res = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && !i.closest('.video-btn')).map(i => i.getAttribute('src')).slice(0, 3), h1: document.querySelectorAll('h1').length }));
    const real = errs.filter(e => !/favicon|ERR_BLOCKED|compute-pressure/.test(e));
    if (!r || r.status() >= 400 || res.sw > res.cw || res.broken.length || real.length || res.h1 !== 1) problems.push({ w, u, status: r && r.status(), hscroll: res.sw > res.cw ? res.sw : 0, broken: res.broken, errs: real.slice(0, 2), h1: res.h1 });
  }
  await ctx.close();
}
await browser.close();
console.log(`checked ${urls.length} pages x 2 widths, problems: ${problems.length}`);
for (const p of problems.slice(0, 40)) console.log(JSON.stringify(p));
