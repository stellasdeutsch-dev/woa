// Runs inside Figma (use_figma). Replace __FRAMES__ with an array of frame ids.
// Applies text styles encoded in layer names (T§w=600§s=17§lh=28§ls=0§al=l§...§n=Name),
// merges per-line text nodes into one paragraph, renames layers by content.
const FRAMES = __FRAMES__;
const W2S = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const styleFor = (w, it) => { const b = W2S[Math.round(w / 100) * 100] || 'Regular'; return it ? (b === 'Regular' ? 'Italic' : b + ' Italic') : b; };
const need = new Set();
for (const w of [400, 500, 600, 700]) for (const it of [0, 1]) need.add(styleFor(w, it));
await Promise.all([...need].map(s => figma.loadFontAsync({ family: 'Montserrat', style: s })));
const report = [];
for (const fid of FRAMES) {
  const frame = await figma.getNodeByIdAsync(fid);
  if (!frame) { report.push({ fid, missing: true }); continue; }
  frame.clipsContent = true;
  const nodes = frame.findAll(n => n.name.startsWith('T§'));
  let merged = 0, fixed = 0;
  for (const n of nodes) {
    const meta = {};
    for (const part of n.name.split('§').slice(1)) { const i = part.indexOf('='); if (i > 0) meta[part.slice(0, i)] = part.slice(i + 1); }
    let texts = n.type === 'TEXT' ? [n] : n.findAll(c => c.type === 'TEXT');
    if (!texts.length) { n.name = meta.n || 'Text'; continue; }
    // a first line that starts mid-line (after bold text or a link) stays a separate layer
    if (texts.length > 1 && texts[0].x > Math.min(...texts.slice(1).map(t => t.x)) + 2) {
      const lead = texts[0]; const lfs = +meta.s || lead.fontSize; const llh = +meta.lh || Math.round(lfs * 1.22);
      const ltop = lead.y - (llh - lead.height) / 2;
      const p0 = n.parent; const solo = figma.createText(); p0.insertChild(p0.children.indexOf(n), solo);
      solo.fontName = { family: 'Montserrat', style: styleFor(+meta.w || 400, meta.it === '1') }; solo.characters = lead.characters;
      solo.fontSize = lfs; solo.lineHeight = { unit: 'PIXELS', value: llh }; solo.letterSpacing = { unit: 'PIXELS', value: +meta.ls || 0 }; solo.fills = lead.fills;
      solo.textAutoResize = 'WIDTH_AND_HEIGHT'; solo.x = lead.x; solo.y = ltop; solo.name = lead.characters.slice(0, 40);
      texts = texts.slice(1);
    }
    const first = texts[0];
    const fills = first.fills;
    const fs = +meta.s || first.fontSize;
    const lh = +meta.lh || Math.round(fs * 1.22);
    const ls = +meta.ls || 0;
    const style = styleFor(+meta.w || 400, meta.it === '1');
    const chars = texts.map(t => t.characters).join('\n');
    const minX = Math.min(...texts.map(t => t.x));
    const maxR = Math.max(...texts.map(t => t.x + t.width));
    const top = first.y - (lh - first.height) / 2;
    let t = n;
    if (n.type !== 'TEXT') {
      t = figma.createText();
      const parent = n.parent;
      parent.insertChild(parent.children.indexOf(n), t);
      merged++;
    }
    for (const f of ['Regular', style]) await figma.loadFontAsync({ family: 'Montserrat', style: f });
    t.fontName = { family: 'Montserrat', style };
    t.characters = chars;
    t.fontSize = fs;
    t.lineHeight = { unit: 'PIXELS', value: lh };
    t.letterSpacing = { unit: 'PIXELS', value: ls };
    t.fills = fills;
    if (meta.al === 'c' && meta.bw) {
      t.textAlignHorizontal = 'CENTER';
      t.textAutoResize = 'HEIGHT';
      t.resize(Math.max(+meta.bw, maxR - minX + 2), t.height);
      t.x = +meta.bx; t.y = top;
    } else if (meta.al === 'r') {
      t.textAlignHorizontal = 'RIGHT';
      t.textAutoResize = 'WIDTH_AND_HEIGHT';
      t.x = maxR - t.width; t.y = top;
    } else {
      t.textAutoResize = 'WIDTH_AND_HEIGHT';
      t.x = minX; t.y = top;
    }
    t.name = meta.n || chars.slice(0, 40);
    if (t !== n) n.remove();
    fixed++;
  }
  report.push({ fid, name: frame.name, texts: fixed, merged });
}
return report;
