// Internal link check over dist/: every /woa/... href or src must resolve to a file.
import fs from 'node:fs'; import path from 'node:path';
const BASE = '/woa';
const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } }; walk('dist');
const bad = new Map(); let checked = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/woa\/[^"#?]*)/g)) {
    const u = decodeURI(m[1]).slice(BASE.length); checked++;
    let t = path.join('dist', u); if (u.endsWith('/')) t = path.join(t, 'index.html');
    if (!fs.existsSync(t)) { if (!bad.has(u)) bad.set(u, []); bad.get(u).push(f.replace('dist', '')); }
  }
}
console.log(`pages: ${files.length}, links checked: ${checked}, missing targets: ${bad.size}`);
for (const [u, from] of [...bad].slice(0, 30)) console.log(' ', u, '<-', from.length, 'pages, e.g.', from[0]);
fs.writeFileSync('data/broken-links.json', JSON.stringify(Object.fromEntries(bad), null, 1));
