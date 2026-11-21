// Render an exported SVG to PNG for a quick visual check (no Figma calls).
import { chromium } from 'playwright';
import fs from 'node:fs';
const [svg, png, scale = '0.5'] = process.argv.slice(2);
const src = fs.readFileSync(svg, 'utf8');
const W = +src.match(/width="(\d+)"/)[1], H = +src.match(/height="(\d+)"/)[1];
const b = await chromium.launch({ args: ['--mute-audio'] });
const p = await b.newPage({ viewport: { width: Math.round(W * +scale), height: Math.round(H * +scale) } });
const ff = st => `@font-face{font-family:Montserrat;font-weight:100 900;font-style:${st};src:url(data:font/woff2;base64,${fs.readFileSync(`node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-${st}.woff2`).toString('base64')})}`;
const css = ff('normal') + ff('italic');
await p.setContent(`<html><head><style>${css} body{margin:0} svg{width:${W * +scale}px;height:auto;display:block}</style></head><body>${src.replace(/^<svg /, '<svg ')}</body></html>`);
await p.waitForTimeout(800);
await p.screenshot({ path: png, fullPage: true });
await b.close();
