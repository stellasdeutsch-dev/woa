import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, w, ...urls] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--mute-audio'] });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
for (const u of urls) {
  await p.goto(u, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'); for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); }); await p.waitForLoadState('networkidle');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  const name = new URL(u).pathname.replace(/^\/woa\/|\/$/g, '').replace(/\//g, '_') + '-' + w + '.png';
  await p.screenshot({ path: out + '/' + name, fullPage: true });
  console.log(name, sw > +w ? 'H-SCROLL ' + sw : 'ok');
}
if (errs.length) console.log(errs);
await b.close();
