import path from 'node:path';
// Map original path+query to a static path (GitHub Pages cannot serve query variants).
export function mapPath(p, search = '') {
  if (!p.endsWith('/') && !path.extname(p)) p += '/';
  const q = new URLSearchParams(search);
  q.delete('langid');
  if (/^\/best-practices\//.test(p)) q.delete('id');
  if (/^\/(news|best-practices)\/$/.test(p) && q.has('StartRow')) { const n = Math.floor((+q.get('StartRow') - 1) / 19) + 1; return n > 1 ? `${p}page/${n}/` : p; }
  if (q.has('tab')) return p + q.get('tab') + '/';
  if (q.has('year')) return p + q.get('year') + '/';
  if (q.has('register')) return p + 'register/';
  if (q.has('gdpr')) return p + 'gdpr/';
  return p;
}
