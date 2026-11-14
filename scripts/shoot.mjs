// Full-page screenshots at 1440/834/390. Usage: node scripts/shoot.mjs <outDir> <url> [url...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, ...urls] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio'] });
for (const w of [1440, 834, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  for (const u of urls) {
    await page.goto(u, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => errors.push('goto ' + e.message));
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 4000); }))); });
    await page.waitForTimeout(400);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const name = (new URL(u).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home') + `-${w}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: true });
    console.log(name, 'scrollWidth', sw, sw > w ? 'H-SCROLL!' : 'ok');
  }
  if (errors.length) console.log('ERRORS@' + w, errors.slice(0, 10));
  await ctx.close();
}
await browser.close();
