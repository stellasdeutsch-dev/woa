// Transfer size of a page with all resources it loads at a given width. Usage: node scripts/page-weight.mjs <url> [width]
import { chromium } from 'playwright';
const [u, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--mute-audio'] });
const p = await b.newPage({ viewport: { width: +w, height: 900 } });
let bytes = 0; const byType = {};
p.on('response', async r => { try { const buf = await r.body(); bytes += buf.length; const t = r.request().resourceType(); byType[t] = (byType[t] || 0) + buf.length; } catch {} });
await p.goto(u, { waitUntil: 'networkidle' });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
await p.waitForTimeout(1500);
console.log(u, w, (bytes / 1048576).toFixed(2) + ' MB', Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024) + ' KB'])));
await b.close();
