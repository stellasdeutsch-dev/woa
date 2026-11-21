// Runs inside Figma (use_figma) on the Screens page.
// Replace __PAIRS__ with [[oldFrameId, newFrameId], ...] and __ARCHIVE_SECTION__ with a section name.
// For every pair: the new frame takes the old one's place, name and prototype links
// (links are copied by matching text: same text in the new frame gets the same destination),
// the old frame moves to the «Архив» page into the named section. Flow starting points follow.
const PAIRS = __PAIRS__;
const ARCHIVE_SECTION = __ARCHIVE_SECTION__;
const page = figma.root.children.find(p => p.id === '0:1');
await figma.setCurrentPageAsync(page);
const oldToNew = new Map(PAIRS);
const txt = n => ('characters' in n ? n.characters : n.name).replace(/\s+/g, ' ').trim();
// 1. harvest links from old frames: text -> destination (old id)
const linkMaps = new Map();
for (const [oldId] of PAIRS) {
  const o = await figma.getNodeByIdAsync(oldId); if (!o) continue;
  const m = new Map();
  for (const n of o.findAll(n => n.reactions && n.reactions.length)) {
    const a = n.reactions[0].actions?.[0] || n.reactions[0].action;
    if (a && a.type === 'NODE' && a.destinationId) { const k = txt(n); if (k && !m.has(k)) m.set(k, a.destinationId); }
  }
  linkMaps.set(oldId, m);
}
// 2. swap places and names
const report = [];
const parents = new Set();
for (const [oldId, newId] of PAIRS) {
  const o = await figma.getNodeByIdAsync(oldId), n = await figma.getNodeByIdAsync(newId);
  if (!o || !n) { report.push({ oldId, newId, missing: true }); continue; }
  const parent = o.parent, x = o.x, y = o.y;
  parent.appendChild(n); n.x = x; n.y = y; n.name = o.name;
  parents.add(parent);
}
// sections grow with their frames; sections lower on the page move down by the same amount
for (const s of parents) {
  if (s.type !== 'SECTION') continue;
  let mb = 0; for (const c of s.children) if (!PAIRS.some(p => p[0] === c.id)) mb = Math.max(mb, c.y + c.height);
  const grow = mb + 120 - s.height;
  if (grow > 0) { const y0 = s.y; s.resizeWithoutConstraints(s.width, s.height + grow); for (const other of page.children) if (other !== s && other.y > y0) other.y += grow; }
}
// 3. links on the new frames
let links = 0;
for (const [oldId, newId] of PAIRS) {
  const n = await figma.getNodeByIdAsync(newId); const m = linkMaps.get(oldId); if (!n || !m) continue;
  const done = new Set();
  for (const t of n.findAll(t => t.type === 'TEXT')) {
    const k = txt(t); const dest = m.get(k); if (!dest) continue;
    const to = oldToNew.get(dest) || dest;
    await t.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: to, navigation: 'NAVIGATE', transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.2 }, resetScrollPosition: true }] }]);
    links++; done.add(k);
  }
  report.push({ name: n.name, links: done.size });
}
// 3b. links in every other frame of the page that lead to an old frame now lead to its new frame.
// This must happen before the old frames leave the page: Figma drops links whose destination is on another page.
let redirected = 0;
const oldIds = new Set(PAIRS.map(p => p[0]));
for (const n of page.findAll(n => n.reactions && n.reactions.length)) {
  let changed = false;
  const rs = n.reactions.map(r => {
    const acts = (r.actions || (r.action ? [r.action] : [])).map(a => {
      if (a && a.type === 'NODE' && oldIds.has(a.destinationId)) { changed = true; return { ...a, destinationId: oldToNew.get(a.destinationId) }; }
      return a;
    });
    const { action, ...rest } = r; return { ...rest, actions: acts };
  });
  if (changed) { await n.setReactionsAsync(rs); redirected++; }
}
// 4. flows (one starting point per frame: Figma refuses duplicates)
const seen = new Set();
page.flowStartingPoints = page.flowStartingPoints.map(f => ({ nodeId: oldToNew.get(f.nodeId) || f.nodeId, name: f.name })).filter(f => !seen.has(f.nodeId) && seen.add(f.nodeId));
// 5. archive old frames
const arch = figma.root.children.find(p => p.name === 'Архив');
await figma.setCurrentPageAsync(arch);
let sec = arch.children.find(s => s.type === 'SECTION' && s.name === ARCHIVE_SECTION);
if (!sec) { sec = figma.createSection(); sec.name = ARCHIVE_SECTION; arch.appendChild(sec); let maxY = 0; for (const c of arch.children) if (c !== sec) maxY = Math.max(maxY, c.y + c.height); sec.x = 0; sec.y = maxY + 400; }
let cx = 80;
for (const [oldId] of PAIRS) {
  const o = await figma.getNodeByIdAsync(oldId); if (!o) continue;
  sec.appendChild(o); o.x = cx; o.y = 80; cx += o.width + 80;
}
let mb = 0; for (const c of sec.children) mb = Math.max(mb, c.y + c.height);
sec.resizeWithoutConstraints(cx, mb + 80);
return { links, redirected, report };
