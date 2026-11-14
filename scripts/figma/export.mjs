// Decompose rendered pages into layers and write one SVG per page/width for Figma import.
// Usage: node scripts/figma/export.mjs <baseUrl> <outDir> <slug>=<path> [...]
// Text layers carry their style in the id ("T§w=600§s=17§..."); scripts/figma/fix-text.js
// (run inside Figma) applies it, merges lines into paragraphs and renames layers.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [base, outDir, ...specs] = process.argv.slice(2);
const WIDTHS = (process.env.WIDTHS || '1440,834,390').split(',').map(Number);
fs.mkdirSync(outDir, { recursive: true });

const FIGMA_CSS = `
  html { scroll-behavior: auto !important; }
  ::-webkit-scrollbar { display: none; }
  .skip, #cookie-bar { display: none !important; }
  .noa-list > li:nth-child(n+13) { display: none !important; }
  .prose .timeline > li:nth-child(n+9) { display: none !important; }
  .prose .table tr:nth-child(n+14) { display: none !important; }
  .prose .table + .table + .table { display: none !important; }
  main > section.section-tight .grid-3 > :nth-child(n+10) { display: none !important; }
  .pager { display: none !important; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
`;

function collect() {
  const SC = window.scrollY;
  const out = [];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const visible = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01; };
  const parseColor = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); const a = p.length > 3 ? p[3] : 1; if (a < 0.01) return null; const hex = '#' + p.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); return { hex, a }; };
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top + SC, w: r.width, h: r.height }; };
  const nameOf = (s, n = 48) => s.replace(/\s+/g, ' ').trim().slice(0, n);
  const fmt = (v) => Math.round(v * 100) / 100;
  let buf = [];
  const push = (s) => buf.push(s);

  const rectEl = (b, fill, opts = {}) => {
    const rx = opts.rx ? ` rx="${fmt(Math.min(opts.rx, b.w / 2, b.h / 2))}"` : '';
    const st = opts.stroke ? ` stroke="${opts.stroke.hex}" stroke-width="${opts.sw}"${opts.stroke.a < 1 ? ` stroke-opacity="${opts.stroke.a}"` : ''}` : '';
    const f = fill ? `fill="${fill.hex}"${fill.a < 1 ? ` fill-opacity="${fill.a}"` : ''}` : 'fill="none"';
    const half = opts.stroke ? opts.sw / 2 : 0;
    push(`<rect id="${esc(opts.name || 'Rectangle')}" x="${fmt(b.x + half)}" y="${fmt(b.y + half)}" width="${fmt(Math.max(0, b.w - 2 * half))}" height="${fmt(Math.max(0, b.h - 2 * half))}"${rx} ${f}${st}/>`);
  };

  const sprite = (id) => document.getElementById(id);
  const styleShape = (src, dst, color, sw) => {
    // copy geometry; write stroke/fill directly (Figma ignores CSS in SVG)
    const fillAttr = src.getAttribute('fill');
    if (fillAttr === 'currentColor') dst.setAttribute('fill', color); else if (!fillAttr) dst.setAttribute('fill', 'none');
    if (!src.getAttribute('stroke') && fillAttr !== 'currentColor') { dst.setAttribute('stroke', color); dst.setAttribute('stroke-width', sw); dst.setAttribute('stroke-linecap', 'round'); dst.setAttribute('stroke-linejoin', 'round'); }
    if (fillAttr === 'currentColor' && src.closest('symbol')?.id === 'i-play') dst.setAttribute('stroke', 'none');
  };
  const iconSvg = (svg, b) => {
    const use = svg.querySelector('use'); const id = (use.getAttribute('href') || '').slice(1);
    const sym = sprite(id); if (!sym) return;
    const cs = getComputedStyle(svg);
    const col = parseColor(cs.stroke && cs.stroke !== 'none' ? cs.stroke : cs.color) || parseColor(cs.color) || { hex: '#262626' };
    const sw = parseFloat(cs.strokeWidth) || 1.75;
    const vb = (sym.getAttribute('viewBox') || '0 0 24 24').split(/\s+/).map(Number);
    const s = b.w / vb[2];
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (const ch of sym.children) { const c = ch.cloneNode(true); styleShape(ch, c, col.hex, sw); c.removeAttribute('class'); g.appendChild(c); }
    const name = 'Icon / ' + id.replace(/^i-/, '');
    let rot = '';
    const tm = cs.transform && cs.transform.match(/matrix\(([^)]+)\)/);
    if (tm) { const [a, bb] = tm[1].split(',').map(Number); const ang = Math.round(Math.atan2(bb, a) * 180 / Math.PI); if (ang) rot = `rotate(${ang} ${fmt(b.x + b.w / 2)} ${fmt(b.y + b.h / 2)}) `; }
    push(`<g id="${esc(name)}" transform="${rot}translate(${fmt(b.x)} ${fmt(b.y)}) scale(${fmt(s * 1000) / 1000})">${g.innerHTML}</g>`);
  };
  const inlineSvg = (svg, b, name) => {
    const vbA = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : { x: 0, y: 0, width: b.w, height: b.h };
    const s = b.w / vbA.width;
    const parts = [];
    svg.querySelectorAll('path,circle,rect,ellipse,line,polyline,polygon,text').forEach(sh => {
      const cs = getComputedStyle(sh);
      if (cs.display === 'none') return;
      const c = sh.cloneNode(true);
      [...c.attributes].forEach(a => { if (/^(class|style|tabindex|data-)/.test(a.name)) c.removeAttribute(a.name); });
      c.querySelectorAll('title').forEach(t => t.remove());
      const fill = parseColor(cs.fill); const stroke = parseColor(cs.stroke);
      c.setAttribute('fill', fill ? fill.hex : 'none'); if (fill && fill.a < 1) c.setAttribute('fill-opacity', fill.a);
      if (stroke && parseFloat(cs.strokeWidth) > 0) { c.setAttribute('stroke', stroke.hex); c.setAttribute('stroke-width', parseFloat(cs.strokeWidth)); if (cs.strokeDasharray !== 'none') c.setAttribute('stroke-dasharray', cs.strokeDasharray.replace(/px/g, '')); if (cs.strokeDashoffset !== '0px') c.setAttribute('stroke-dashoffset', parseFloat(cs.strokeDashoffset)); }
      if (sh.tagName === 'text') { c.setAttribute('font-family', 'Montserrat'); c.setAttribute('font-weight', cs.fontWeight); c.setAttribute('font-size', parseFloat(cs.fontSize)); c.setAttribute('text-anchor', cs.textAnchor); }
      const title = sh.querySelector('title');
      if (title) c.setAttribute('id', title.textContent);
      parts.push(c.outerHTML);
    });
    push(`<g id="${esc(name)}" transform="translate(${fmt(b.x - vbA.x * s)} ${fmt(b.y - vbA.y * s)}) scale(${fmt(s * 10000) / 10000})">${parts.join('')}</g>`);
  };

  const images = [];
  const imageEl = (img, b) => {
    if (b.w < 2 || b.h < 2 || !img.complete || !img.naturalWidth) return;
    const cs = getComputedStyle(img);
    const fit = cs.objectFit;
    const scale = 1.5;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(b.w * scale)); cv.height = Math.max(1, Math.round(b.h * scale));
    const ctx = cv.getContext('2d');
    const isSvg = /\.svg(\?|$)/.test(img.currentSrc || img.src);
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (fit === 'cover' && !isSvg) { const r = Math.max(b.w / sw, b.h / sh); const cw = b.w / r, ch = b.h / r; sx = (sw - cw) / 2; sy = (sh - ch) / 2; sw = cw; sh = ch; }
    try {
      if (!isSvg) { ctx.fillStyle = '#ffffff'; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      const png = isSvg || /\.png(\?|$)/.test(img.currentSrc || img.src);
      const data = png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.8);
      const file = decodeURIComponent((img.currentSrc || img.src).split('/').pop().split('?')[0]).replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ');
      const alt = img.getAttribute('alt');
      const label = alt && alt.trim() ? alt.trim() : file;
      const kind = /logo|flags|signature/i.test(img.src) ? (/flags/.test(img.src) ? 'Flag' : /signature/.test(img.src) ? 'Signature' : 'Logo') : 'Photo';
      const rad = parseFloat(getComputedStyle(img).borderRadius) || parseFloat(getComputedStyle(img.parentElement).borderRadius) || 0;
      if (rad) {
        const cid = 'clip' + images.length;
        push(`<clipPath id="${cid}"><rect x="${fmt(b.x)}" y="${fmt(b.y)}" width="${fmt(b.w)}" height="${fmt(b.h)}" rx="${fmt(Math.min(rad, b.w / 2))}"/></clipPath>`);
        push(`<image id="${esc(kind + ' / ' + nameOf(label, 40))}" clip-path="url(#${cid})" x="${fmt(b.x)}" y="${fmt(b.y)}" width="${fmt(b.w)}" height="${fmt(b.h)}" preserveAspectRatio="none" href="${data}"/>`);
      } else push(`<image id="${esc(kind + ' / ' + nameOf(label, 40))}" x="${fmt(b.x)}" y="${fmt(b.y)}" width="${fmt(b.w)}" height="${fmt(b.h)}" preserveAspectRatio="none" href="${data}"/>`);
      images.push(1);
    } catch (e) { /* tainted */ }
  };

  const decorations = (el, b, cs) => {
    const bg = parseColor(cs.backgroundColor);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const bw = ['Top', 'Right', 'Bottom', 'Left'].map(s => parseFloat(cs['border' + s + 'Width']) || 0);
    const bc = ['Top', 'Right', 'Bottom', 'Left'].map(s => parseColor(cs['border' + s + 'Color']));
    const uniform = bw.every(v => v === bw[0]) && bw[0] > 0 && bc.every(c => c && bc[0] && c.hex === bc[0].hex);
    const isCircle = cs.borderTopLeftRadius.includes('%') && parseFloat(cs.borderTopLeftRadius) >= 50 && Math.abs(b.w - b.h) < 1;
    const label = el.matches('button, .btn, .pill, a.btn') ? 'Button' : el.matches('input, select, textarea') ? 'Field' : el.matches('.card, article, li') ? 'Card' : el.matches('section, header, footer, nav') ? 'Background' : 'Rectangle';
    const bgm = cs.backgroundImage && cs.backgroundImage.match(/url\("?([^")]+)"?\)/);
    let bgImg = bgm && window.__bg && window.__bg.get(bgm[1]);
    if (bgImg && (bgImg.naturalWidth < 40 || bgImg.naturalHeight < 40) && !/cover|contain/.test(cs.backgroundSize)) bgImg = null;
    if (bg && bgImg) { rectEl(b, bg, { name: 'Background', rx: radius }); }
    if (bgImg && b.w > 2 && b.h > 2) {
      const scale = 1.25; const cv = document.createElement('canvas'); cv.width = Math.round(b.w * scale); cv.height = Math.round(b.h * scale);
      const ctx = cv.getContext('2d'); const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
      const size = cs.backgroundSize; let dw, dh;
      if (size === 'cover' || size.includes('%') || size === 'auto' && false) { const r = Math.max(b.w / iw, b.h / ih); dw = iw * r; dh = ih * r; }
      else if (size === 'contain') { const r = Math.min(b.w / iw, b.h / ih); dw = iw * r; dh = ih * r; }
      else if (size === 'auto' || size === 'auto auto') { dw = iw; dh = ih; }
      else { const parts = size.split(' ').map(parseFloat); dw = parts[0] || iw; dh = parts[1] || (dw / iw * ih); }
      const pos = cs.backgroundPosition.split(' ');
      const px = (v, free) => v.endsWith('%') ? free * parseFloat(v) / 100 : parseFloat(v) || 0;
      const dx = px(pos[0] || '50%', b.w - dw), dy = px(pos[1] || '50%', b.h - dh);
      try { ctx.drawImage(bgImg, dx * scale, dy * scale, dw * scale, dh * scale); push(`<image id="Photo / ${esc(nameOf(decodeURIComponent(bgm[1].split('/').pop().split('?')[0]).replace(/\.[a-z]+$/i, ''), 40))}" x="${fmt(b.x)}" y="${fmt(b.y)}" width="${fmt(b.w)}" height="${fmt(b.h)}" preserveAspectRatio="none" href="${/\.(png|svg)(\?|$)/i.test(bgm[1]) ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.8)}"/>`); } catch (e) {}
    }
    if ((bg && !bgImg) || uniform) {
      if (isCircle) {
        push(`<ellipse id="${label === 'Rectangle' ? 'Circle' : label}" cx="${fmt(b.x + b.w / 2)}" cy="${fmt(b.y + b.h / 2)}" rx="${fmt(b.w / 2 - (uniform ? bw[0] / 2 : 0))}" ry="${fmt(b.h / 2 - (uniform ? bw[0] / 2 : 0))}" ${bg ? `fill="${bg.hex}"${bg.a < 1 ? ` fill-opacity="${bg.a}"` : ''}` : 'fill="none"'}${uniform ? ` stroke="${bc[0].hex}" stroke-width="${bw[0]}"` : ''}/>`);
      } else rectEl(b, bg, { rx: cs.borderTopLeftRadius.includes('%') ? Math.min(b.w, b.h) / 2 : radius, stroke: uniform ? bc[0] : null, sw: bw[0], name: label });
    }
    if (!uniform) {
      if (bw[0] && bc[0]) rectEl({ x: b.x, y: b.y, w: b.w, h: bw[0] }, bc[0], { name: 'Divider' });
      if (bw[2] && bc[2]) rectEl({ x: b.x, y: b.y + b.h - bw[2], w: b.w, h: bw[2] }, bc[2], { name: 'Divider' });
      if (bw[3] && bc[3]) rectEl({ x: b.x, y: b.y, w: bw[3], h: b.h }, bc[3], { name: 'Divider' });
      if (bw[1] && bc[1]) rectEl({ x: b.x + b.w - bw[1], y: b.y, w: bw[1], h: b.h }, bc[1], { name: 'Divider' });
    }
    // inset box-shadow used as highlight / current-page bar
    const m = cs.boxShadow && cs.boxShadow.match(/(rgba?\([^)]+\))\s+0px\s+(-?[\d.]+)px\s+0px\s+0px\s+inset|inset\s+0px\s+(-?[\d.]+)px\s+0px\s+(rgba?\([^)]+\))/);
    if (m) { const col = parseColor(m[1] || m[4]); const off = parseFloat(m[2] || m[3]);
      if (col && off < 0) { const rs = cs.display === 'inline' ? [...el.getClientRects()] : [el.getBoundingClientRect()]; rs.forEach(q => rectEl({ x: q.left, y: q.top + SC + q.height + off, w: q.width, h: -off }, col, { name: 'Highlight' })); } }
    pseudoLayer(el, b, '::before');
  };
  // ::before / ::after with a background (overlays, dots, lines)
  const pseudoLayer = (el, b, pseudo) => {
    {
      const ps = getComputedStyle(el, pseudo);
      if (!ps || ps.content === 'none' || ps.display === 'none') return;
      const pbg = parseColor(ps.backgroundColor);
      const pbw = parseFloat(ps.borderTopWidth) || 0; const pbc = parseColor(ps.borderTopColor);
      if (ps.webkitMaskImage && ps.webkitMaskImage !== 'none' && el.matches('a.doc')) {
        const sz = parseFloat(ps.width) || 20;
        const tb = el.getClientRects()[0] || el.getBoundingClientRect();
        iconFromSymbol('i-doc', { x: tb.left, y: tb.top + SC + (tb.height - sz) / 2, w: sz, h: sz }, pbg ? pbg.hex : '#b6a67f');
        return;
      }
      if (!pbg && !(pbw && pbc)) return;
      let pb;
      if (ps.position === 'absolute' && (ps.inset === '0px' || (ps.top === '0px' && ps.left === '0px' && ps.right === '0px' && ps.bottom === '0px'))) pb = b;
      else if (ps.position === 'absolute') { const w = parseFloat(ps.width), h = parseFloat(ps.height); pb = { x: b.x + (parseFloat(ps.left) || 0), y: b.y + (parseFloat(ps.top) || 0), w, h }; if (!w || !h) return; }
      else return;
      const circ = ps.borderTopLeftRadius.includes('%');
      if (circ) push(`<ellipse id="Dot" cx="${fmt(pb.x + pb.w / 2)}" cy="${fmt(pb.y + pb.h / 2)}" rx="${fmt(pb.w / 2 - pbw / 2)}" ry="${fmt(pb.h / 2 - pbw / 2)}" fill="${pbg ? pbg.hex : 'none'}"${pbw && pbc ? ` stroke="${pbc.hex}" stroke-width="${pbw}"` : ''}/>`);
      else rectEl(pb, pbg, { name: el.closest('.hero') ? 'Overlay' : 'Rectangle', stroke: pbw && pbc ? pbc : null, sw: pbw });
    }
  };
  const iconFromSymbol = (id, b, color) => {
    const sym = sprite(id); if (!sym) return;
    const s = b.w / 24; const parts = [];
    for (const ch of sym.children) { const c = ch.cloneNode(true); styleShape(ch, c, color, 1.75); parts.push(c.outerHTML); }
    push(`<g id="Icon / ${id.replace(/^i-/, '')}" transform="translate(${fmt(b.x)} ${fmt(b.y)}) scale(${fmt(s * 1000) / 1000})">${parts.join('')}</g>`);
  };

  const listMarker = (li, cs) => {
    const parent = li.parentElement; if (!parent) return;
    const pcs = getComputedStyle(parent);
    const lst = getComputedStyle(li).listStyleType;
    if (lst === 'none' || getComputedStyle(li).display !== 'list-item') return;
    const ms = getComputedStyle(li, '::marker');
    const col = parseColor(ms.color) || parseColor(cs.color);
    const first = document.createRange(); first.selectNodeContents(li);
    const rects = [...first.getClientRects()].filter(r => r.width > 0);
    const r0 = rects[0] || li.getBoundingClientRect();
    const fs = parseFloat(cs.fontSize);
    if (lst === 'disc' || lst === 'circle' || lst === 'square') {
      push(`<ellipse id="Bullet" cx="${fmt(li.getBoundingClientRect().left - fs * 0.75)}" cy="${fmt(r0.top + SC + r0.height / 2)}" rx="${fmt(fs * 0.17)}" ry="${fmt(fs * 0.17)}" fill="${col.hex}"/>`);
    } else if (lst === 'decimal') {
      const idx = [...parent.children].filter(c => c.tagName === 'LI').indexOf(li) + (parseInt(parent.getAttribute('start') || '1'));
      const bl = r0.top + SC + r0.height * (968 / 1219);
      push(`<text id="T§w=700§s=${fs}§al=r§n=${idx}." x="${fmt(li.getBoundingClientRect().left - 6)}" y="${fmt(bl)}" text-anchor="end" font-family="Montserrat" font-weight="700" font-size="${fs}" fill="${col.hex}">${idx}.</text>`);
    }
  };

  // text: one <text> per text node, one <tspan> per rendered line
  const textNode = (tn) => {
    const el = tn.parentElement; if (!el) return;
    const cs = getComputedStyle(el);
    const raw = tn.textContent; if (!raw.trim()) return;
    const col = parseColor(cs.color); if (!col) return;
    const fs = parseFloat(cs.fontSize);
    for (let a = el; a && a !== document.body; a = a.parentElement) { const ti = parseFloat(getComputedStyle(a).textIndent); if (ti < -500) return; }
    const tokens = [];
    const re = /\S+/g; let m;
    while ((m = re.exec(raw))) {
      const r = document.createRange(); r.setStart(tn, m.index); r.setEnd(tn, m.index + m[0].length);
      const rects = [...r.getClientRects()].filter(q => q.width > 0.5);
      if (!rects.length) continue;
      const spaceBefore = m.index > 0 && /\s/.test(raw[m.index - 1]);
      if (rects.length === 1) { tokens.push({ t: m[0], r: rects[0], sp: spaceBefore }); continue; }
      // word broken across lines (hyphenation) -> split by characters
      let cur = '', curR = null, first = true;
      for (let i = 0; i < m[0].length; i++) {
        const cr = document.createRange(); cr.setStart(tn, m.index + i); cr.setEnd(tn, m.index + i + 1);
        const q = [...cr.getClientRects()].filter(z => z.width > 0)[0]; if (!q) { cur += m[0][i]; continue; }
        if (curR && Math.abs(q.top - curR.top) > 2) { tokens.push({ t: cur + (/[-‐]$/.test(cur) ? '' : '-'), r: curR, sp: first ? spaceBefore : false }); first = false; cur = ''; curR = null; }
        if (!curR) curR = { left: q.left, top: q.top, right: q.right, bottom: q.bottom, height: q.height, width: q.width }; else curR.right = q.right;
        cur += m[0][i];
      }
      if (cur) tokens.push({ t: cur, r: curR, sp: first ? spaceBefore : false });
    }
    if (!tokens.length) return;
    // drop lines hidden by an overflow:hidden ancestor (line-clamp, cropped cards)
    let clip = null;
    for (let a = el; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflow; if (/hidden|clip/.test(o)) { const r = a.getBoundingClientRect(); clip = clip ? { top: Math.max(clip.top, r.top), bottom: Math.min(clip.bottom, r.bottom) } : { top: r.top, bottom: r.bottom }; } }
    const kept = clip ? tokens.filter(tk => tk.r.top >= clip.top - 1 && tk.r.top + tk.r.height * 0.5 <= clip.bottom + 1) : [...tokens];
    if (!kept.length) return;
    tokens.length = 0; tokens.push(...kept);
    const lines = [];
    for (const tk of tokens) {
      const L = lines[lines.length - 1];
      if (L && Math.abs(tk.r.top - L.top) < 2) { L.text += (tk.sp ? ' ' : '') + tk.t; L.right = tk.r.right; }
      else lines.push({ text: tk.t, left: tk.r.left, top: tk.r.top, right: tk.r.right ?? (tk.r.left + tk.r.width), h: tk.r.height });
    }
    let tt = cs.textTransform;
    const fixCase = (s) => tt === 'uppercase' ? s.toUpperCase() : s;
    const w = cs.fontWeight; const it = cs.fontStyle === 'italic' ? 1 : 0;
    const lh = cs.lineHeight === 'normal' ? fs * 1.22 : parseFloat(cs.lineHeight);
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const al = cs.textAlign === 'center' ? 'c' : (cs.textAlign === 'right' || cs.textAlign === 'end') ? 'r' : 'l';
    const blk = el.closest('p,li,h1,h2,h3,h4,h5,h6,dd,dt,figcaption,label,a,button,span,div,td,th') || el;
    const bb = blk.getBoundingClientRect();
    const full = lines.map(l => l.text).join(' ');
    const meta = `T§w=${w}§s=${fs}§lh=${fmt(lh)}§ls=${fmt(ls)}§al=${al}§it=${it}§bx=${fmt(bb.left)}§bw=${fmt(bb.width)}§n=${esc(nameOf(fixCase(full), 60))}`;
    const spans = lines.map(l => `<tspan x="${fmt(al === 'c' ? (l.left + l.right) / 2 : al === 'r' ? l.right : l.left)}" y="${fmt(l.top + SC + l.h * (968 / 1219))}">${esc(fixCase(l.text))}</tspan>`).join('');
    const anchor = al === 'c' ? ' text-anchor="middle"' : al === 'r' ? ' text-anchor="end"' : '';
    push(`<text id="${meta}" font-family="Montserrat" font-weight="${w}" font-size="${fs}"${it ? ' font-style="italic"' : ''} fill="${col.hex}"${col.a < 1 ? ` fill-opacity="${col.a}"` : ''}${anchor}>${spans}</text>`);
    // underline for prose links
    const dec = cs.textDecorationLine;
    if (dec && dec.includes('underline')) {
      const dcol = parseColor(cs.textDecorationColor) || col; const th = parseFloat(cs.textDecorationThickness) || 1; const off = parseFloat(cs.textUnderlineOffset) || 2;
      lines.forEach(l => rectEl({ x: l.left, y: l.top + SC + l.h * (968 / 1219) + off, w: l.right - l.left, h: th }, dcol, { name: 'Underline' }));
    }
  };

  const fieldText = (el, b, cs) => {
    let t = '', grey = false;
    if (el.tagName === 'SELECT') t = el.options[el.selectedIndex]?.text || '';
    else if (el.value) t = el.value; else if (el.placeholder) { t = el.placeholder; grey = true; }
    if (el.type === 'checkbox') return;
    if (!t) return;
    const fs = parseFloat(cs.fontSize); const pl = parseFloat(cs.paddingLeft);
    const col = grey ? '#808285' : (parseColor(cs.color)?.hex || '#262626');
    push(`<text id="T§w=${cs.fontWeight}§s=${fs}§al=l§n=${esc(t)}" x="${fmt(b.x + pl)}" y="${fmt(b.y + b.h / 2 + fs * 0.36)}" font-family="Montserrat" font-weight="${cs.fontWeight}" font-size="${fs}" fill="${col}">${esc(t)}</text>`);
    if (el.tagName === 'SELECT') iconFromSymbol('i-chevron', { x: b.x + b.w - 30, y: b.y + b.h / 2 - 9, w: 18, h: 18 }, '#262626');
  };

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'DIALOG', 'OPTION', 'TITLE']);
  const errors = [];
  const walk = (node) => { try { walk0(node); } catch (e) { errors.push(String(e).slice(0, 200) + ' @ ' + (node.nodeType === 1 ? node.tagName + '.' + node.className : 'text:' + node.textContent.slice(0, 30))); } };
  const walk0 = (node) => {
    if (node.nodeType === 3) { textNode(node); return; }
    if (node.nodeType !== 1) return;
    const el = node;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.tagName === 'svg' || el instanceof SVGElement) {
      if (el.tagName !== 'svg') return;
      if (!visible(el)) return;
      const b = box(el); if (b.w < 1 || b.h < 1) return;
      if (el.querySelector(':scope > use')) iconSvg(el, b); else inlineSvg(el, b, el.getAttribute('aria-label') || (el.classList.contains('donut') ? 'Chart / donut' : 'Map'));
      return;
    }
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    const b = box(el);
    if (el.classList.contains('sr-only')) return;
    if (b.w > 0 && b.h > 0) decorations(el, b, cs);
    if (el.tagName === 'LI') listMarker(el, cs);
    if (el.tagName === 'IMG') { imageEl(el, b); return; }
    if (el.tagName === 'DETAILS' && !el.open) { const sm = el.querySelector(':scope > summary'); if (sm) walk(sm); pseudoLayer(el, b, '::after'); return; }
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') { fieldText(el, b, cs); return; }
    for (const c of el.childNodes) walk(c);
    if (b.w > 0 && b.h > 0) pseudoLayer(el, b, '::after');
  };

  // blocks: header, main children, footer — each becomes a named group
  const blocks = [];
  const header = document.querySelector('header.site-header');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer.site-footer');
  const firstHeading = (el) => { const h = el.querySelector('h1,h2,h3'); return h ? nameOf(h.textContent, 40) : ''; };
  const blockName = (el, i) => {
    if (!main) { const id = el.id || ''; if (/header/i.test(id)) return 'Header'; if (/footer/i.test(id)) return 'Footer'; if (/cookie/i.test(id)) return 'Cookie bar'; if (/home|page|content/i.test(id)) return firstHeading(el) ? 'Section / ' + firstHeading(el) : 'Content'; return 'Section ' + (i + 1); }
    if (el === header) return 'Header';
    if (el === footer) return 'Footer';
    if (el.classList.contains('hero')) return 'Hero';
    if (el.classList.contains('tabs')) return 'Tabs';
    if (el.tagName === 'ARTICLE') return 'Article';
    const h = firstHeading(el);
    return h ? 'Section / ' + h : 'Section ' + (i + 1);
  };
  const tops = main ? [header, ...main.children, footer].filter(Boolean) : [...document.body.children];
  // body background
  const W = document.documentElement.clientWidth, H = document.documentElement.scrollHeight;
  let svgParts = [`<rect id="Background" x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`];
  tops.forEach((el, i) => {
    if (!visible(el)) return;
    buf = [];
    walk(el);
    if (buf.length) svgParts.push(`<g id="${esc(blockName(el, i))}">${buf.join('')}</g>`);
  });
  return { W, H, body: svgParts.join('\n'), errors };
}

const browser = await chromium.launch({ args: ['--mute-audio'] });
const manifest = [];
for (const spec of specs) {
  const [slug, p] = spec.split('=');
  for (const W of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: FIGMA_CSS });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } window.scrollTo(0, 0); });
    await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 5000); }))); await document.fonts.ready; });
    await page.waitForTimeout(200);
    await page.evaluate(async () => {
      const urls = new Set();
      for (const el of document.querySelectorAll('*')) { const bi = getComputedStyle(el).backgroundImage; for (const m of bi.matchAll(/url\("?([^")]+)"?\)/g)) if (!m[1].startsWith('data:')) urls.add(m[1]); }
      window.__bg = new Map();
      await Promise.all([...urls].map(u => new Promise(r => { const im = new Image(); im.onload = () => { window.__bg.set(u, im); r(); }; im.onerror = r; im.src = u; setTimeout(r, 6000); })));
    });
    const { W: w, H, body, errors } = await page.evaluate(collect);
    if (errors.length) console.log('ERRORS', errors.length, errors.slice(0, 5));
    const name = `${slug} — ${W}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" id="${name}">\n${body}\n</svg>`;
    const file = path.join(outDir, `${slug}-${W}.svg`);
    fs.writeFileSync(file, svg);
    manifest.push({ slug, width: W, height: H, file, bytes: svg.length, path: p });
    console.log(file, (svg.length / 1024 / 1024).toFixed(2) + 'MB', H + 'px');
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
