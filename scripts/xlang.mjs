// Pair translated news / best practices with the English article (same date; same order of ids within a date).
// Writes src/data/xlang.json: { fr: { "<fr path>": "<en path>" }, es: {...} } and gives translated
// articles the English photo when their own copy is not downloaded (same photo, other file number).
import fs from 'node:fs';
const out = {};
let imgId = new Map();
const exists = (src) => src && (/^https?:/.test(src) || fs.existsSync('public' + decodeURI(src.replace('{{BASE}}', ''))));
for (const lang of ['fr', 'es']) {
  out[lang] = {};
  for (const coll of ['news', 'practices']) {
    const en = JSON.parse(fs.readFileSync(`src/data/${coll}.json`, 'utf8'));
    const tr = JSON.parse(fs.readFileSync(`src/data/${coll}.${lang}.json`, 'utf8'));
    const key = (x) => x.id ?? +(x.orig.match(/id=(\d+)/) || [0, 0])[1];
    const group = (arr) => { const g = {}; for (const x of arr) (g[x.date] ||= []).push(x); for (const k in g) g[k].sort((a, b) => key(a) - key(b)); return g; };
    const ge = group(en), gt = group(tr);
    let paired = 0, photos = 0;
    for (const d in gt) {
      const a = gt[d], b = ge[d] || [];
      a.forEach((x, i) => {
        const e = b.length === a.length ? b[i] : b.length === 1 ? b[0] : null;
        if (!e) return;
        out[lang][x.path] = e.path; paired++;
        if (!exists(x.img) && exists(e.img)) { x.img = e.img; photos++; }
        if (!exists(x.bg) && exists(e.bg)) x.bg = e.bg;
      });
    }
    fs.writeFileSync(`src/data/${coll}.${lang}.json`, JSON.stringify(tr));
    if (coll === 'news') for (const x of tr) { const e = out[lang][x.path]; const ei = e && en.find(z => z.path === e)?.id; if (ei) imgId.set(x.id, ei); }
    console.log(lang, coll, 'paired', paired, 'of', tr.length, 'photos from English', photos);
  }
}
fs.writeFileSync('src/data/xlang.json', JSON.stringify(out));
// translated pages that show news thumbnails point at /newsimages2/<translated id>.webp; use the English file (same photo)
for (const lang of ['fr', 'es']) {
  imgId = new Map();
  const en = JSON.parse(fs.readFileSync('src/data/news.json', 'utf8'));
  const tr = JSON.parse(fs.readFileSync(`src/data/news.${lang}.json`, 'utf8'));
  for (const x of tr) { const e = out[lang][x.path]; const ei = e && en.find(z => z.path === e)?.id; if (ei) imgId.set(x.id, ei); }
  for (const coll of ['pages', 'news', 'practices']) {
    const f = `src/data/${coll}.${lang}.json`; let txt = fs.readFileSync(f, 'utf8'); let n = 0;
    txt = txt.replace(/newsimages2\/(\d+)\.webp/g, (m, id) => { if (fs.existsSync(`public/newsimages2/${id}.webp`)) return m; const e = imgId.get(+id); if (e && fs.existsSync(`public/newsimages2/${e}.webp`)) { n++; return `newsimages2/${e}.webp`; } return m; });
    fs.writeFileSync(f, txt); if (n) console.log(lang, coll, 'thumbnails from English', n);
  }
}
