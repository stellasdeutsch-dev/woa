import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import {
  Box, Flex, Grid, Typography, Button, SingleSelect, SingleSelectOption, Tabs, Table, Thead, Tbody, Tr, Th, Td, Toggle, Field, NumberInput, Textarea,
  Tag, DatePicker, IconButton, Searchbar, Badge,
} from '@strapi/design-system';
import { Download, ArrowClockwise, Cross, Pencil, ExternalLink, Filter, Plus } from '@strapi/icons';
import { useWoa, LANG_NAME, ago } from '../api';
import { Bar, Muted, GlobalStyle } from '../ui';

type K = { visitors: number; newVisitors: number; pageviews: number; sessions: number; avgTime: number; pagesPerSession: number; bounce: number; scroll: number | null;
  downloads: number; outbound: number; videos: number; searches: number; notfound: number };
type Item = { name: string; count: number; visitors?: number };
type PageRow = { path: string; title: string; section: string; views: number; visitors: number; avgTime: number; scroll: number | null; entries: number; exits: number; bounce: number | null; edit: string | null };
type R = {
  from: string; to: string; days: number; filters: Record<string, string>; kpi: K; prev: K;
  perDay: { day: string; pageviews: number; visitors: number; prevPageviews: number; prevVisitors: number }[];
  pages: PageRow[]; entryPages: (Item & { title: string })[]; exitPages: (Item & { title: string })[]; sections: Item[];
  referrers: Item[]; campaigns: Item[]; internal: Item[]; countries: Item[]; languages: Item[]; devices: Item[]; browsers: Item[]; os: Item[]; screens: Item[];
  audience: { new: number; returning: number }; heat: number[][];
  downloads: Item[]; outboundHosts: Item[]; outboundLinks: Item[]; videos: (Item & { page?: string })[];
  searches: (Item & { results: number | null; zero: number })[]; searchZero: (Item & { results: number | null })[];
  notFound: { path: string; count: number; last: string; from: Item[]; redirect: boolean }[];
  vitals: { samples: number; lcp: number | null; inp: number | null; cls: number | null; devices: { name: string; samples: number; lcp: number | null; inp: number | null }[];
    pages: { path: string; title: string; samples: number; lcp: number | null; inp: number | null; cls: number | null }[] };
};
type Live = { active: number; perMinute: number[]; pages: { path: string; title: string; count: number }[]; countries: Item[];
  events: { kind: string; path: string; title: string; country: string; device: string; referrer: string; target: string; at: string }[] };

const SITE = 'https://stellasdeutsch-dev.github.io/woa';
const GOLD = '#b6a67f';
const secs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
const num = (n: number) => n.toLocaleString('en-GB');
const regions = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : '');
const country = (cc: string) => (cc === '—' ? 'Unknown' : `${flag(cc)} ${regions?.of(cc) || cc}`);
const cap = (s: string) => (s === '—' ? 'Unknown' : s[0].toUpperCase() + s.slice(1));
const FILTER_LABEL: Record<string, string> = { path: 'Page', source: 'Source', country: 'Country', lang: 'Language', device: 'Device', browser: 'Browser', os: 'System', screen: 'Screen', campaign: 'Campaign' };
const filterValue = (k: string, v: string) => (k === 'country' ? country(v) : k === 'lang' ? LANG_NAME[v] || v : k === 'source' && v === '—' ? 'Direct or unknown' : v);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Core Web Vitals thresholds (good / poor)
const VITAL = {
  lcp: { label: 'Largest contentful paint', short: 'LCP', good: 2500, poor: 4000, fmt: (v: number) => `${(v / 1000).toFixed(1)} s`, hint: 'How fast the main content appears' },
  inp: { label: 'Interaction to next paint', short: 'INP', good: 200, poor: 500, fmt: (v: number) => `${v} ms`, hint: 'How fast the page reacts to taps and clicks' },
  cls: { label: 'Cumulative layout shift', short: 'CLS', good: 100, poor: 250, fmt: (v: number) => (v / 1000).toFixed(2), hint: 'How much the layout jumps while loading' },
} as const;
const rate = (k: keyof typeof VITAL, v: number | null) => (v == null ? null : v <= VITAL[k].good ? 'good' : v <= VITAL[k].poor ? 'needs work' : 'poor');
const RATE_COLOR: Record<string, string> = { good: 'success600', 'needs work': 'warning600', poor: 'danger600' };

const Card = ({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Box background="neutral0" hasRadius shadow="tableShadow" padding={5} style={{ height: '100%', width: '100%' }}>
    {(title || action) && <Flex justifyContent="space-between" gap={3} paddingBottom={3} wrap="wrap"><Typography variant="delta" tag="h2">{title}</Typography>{action}</Flex>}
    {children}
  </Box>
);

function Tile({ label, value, now, before, invert, sub }: { label: string; value: string | number; now: number; before: number; invert?: boolean; sub?: string }) {
  const delta = before ? Math.round(((now - before) / before) * 100) : null;
  const good = delta === null ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={5} style={{ height: '100%', width: '100%' }}>
      <Muted>{label}</Muted>
      <Typography variant="alpha" tag="p" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="pi" textColor={good === null ? 'neutral500' : good ? 'success600' : 'danger600'}>
        {sub ?? (delta === null ? 'No earlier data' : `${delta > 0 ? '+' : ''}${delta}% vs previous period`)}
      </Typography>
    </Box>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null); const [w, setW] = useState(0);
  useEffect(() => { if (!ref.current) return; const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width))); ro.observe(ref.current); return () => ro.disconnect(); }, []);
  return [ref, w] as const;
}

function Chart({ data, metric }: { data: R['perDay']; metric: 'pageviews' | 'visitors' }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  return <div ref={ref} style={{ width: '100%' }}>{width > 0 && <ChartSvg data={data} metric={metric} W={width} />}</div>;
}

function ChartSvg({ data, metric, W }: { data: R['perDay']; metric: 'pageviews' | 'visitors'; W: number }) {
  const prevKey = metric === 'pageviews' ? 'prevPageviews' : 'prevVisitors';
  const max = Math.max(4, ...data.map(d => Math.max(d[metric], d[prevKey])));
  const step = Math.ceil(max / 4); const top = step * 4;
  const H = 240; const L = 40; const B = 24; const ch = H - B - 8;
  const bw = (W - L) / data.length;
  const y = (v: number) => H - B - (ch * v) / top;
  const line = data.map((d, i) => `${L + i * bw + bw / 2},${y(d[prevKey])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${metric === 'pageviews' ? 'Page views' : 'Visitors'} per day, with the previous period`} className="woa-bar">
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1={L} x2={W} y1={y(step * i)} y2={y(step * i)} stroke="rgba(128,128,140,.25)" /><text x={L - 6} y={y(step * i) + 4} fontSize="11" textAnchor="end" fill="#8e8ea9">{step * i}</text></g>)}
      {data.map((d, i) => {
        const h = (ch * d[metric]) / top; const x = L + i * bw;
        return (
          <g key={d.day}>
            <rect x={x + bw * 0.15} y={H - B - h} width={bw * 0.7} height={Math.max(h, 1)} rx={3} fill={GOLD}>
              <title>{`${d.day}: ${d.pageviews} page views, ${d.visitors} visitors (previous period: ${d.prevPageviews} / ${d.prevVisitors})`}</title>
            </rect>
            {(i % Math.max(1, Math.ceil(data.length / Math.floor(W / 56))) === 0) && <text x={x + bw / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="#8e8ea9">{d.day.slice(5)}</text>}
          </g>
        );
      })}
      <polyline points={line} fill="none" stroke="#8e8ea9" strokeWidth={1.5} strokeDasharray="4 4" pointerEvents="none" />
    </svg>
  );
}

function List({ title, items, fmt = (s: string) => s, onPick, limit = 10, empty = 'No data for this period', note }: {
  title: string; items: Item[]; fmt?: (s: string) => string; onPick?: (name: string) => void; limit?: number; empty?: string; note?: React.ReactNode;
}) {
  const [all, setAll] = useState(false);
  const max = Math.max(1, ...items.map(i => i.count));
  const shown = all ? items : items.slice(0, limit);
  return (
    <Card title={title} action={items.length > limit ? <Button variant="ghost" size="S" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${items.length}`}</Button> : undefined}>
      {note && <Box paddingBottom={2}><Muted>{note}</Muted></Box>}
      {!items.length && <Muted>{empty}</Muted>}
      {shown.map(i => {
        const inner = (
          <>
            <Flex justifyContent="space-between" gap={2}>
              <Typography ellipsis title={fmt(i.name)}>{fmt(i.name)}</Typography>
              <Typography fontWeight="semiBold" style={{ fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{num(i.count)}</Typography>
            </Flex>
            <Box paddingTop={1}><Bar value={i.count} max={max} /></Box>
          </>
        );
        return onPick
          ? <button key={i.name} type="button" className="woa-row-link woa-pick" onClick={() => onPick(i.name)} title={`Show only: ${fmt(i.name)}`}>{inner}</button>
          : <Box key={i.name} paddingTop={2} paddingBottom={1}>{inner}</Box>;
      })}
    </Card>
  );
}

function Heatmap({ heat }: { heat: number[][] }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(1, ...heat.flat());
  return (
    <Box style={{ overflowX: 'hidden' }}>
      <div className="woa-heat" role="img" aria-label="Page views by weekday and hour, visitor's local time">
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="woa-heat-h">{h % 3 === 0 ? h : ''}</span>)}
        {order.map((d, i) => (
          <div key={d} style={{ display: 'contents' }}>
            <span className="woa-heat-d">{DAYS[i]}</span>
            {heat[d].map((v, h) => <span key={h} className="woa-heat-c" style={{ background: v ? `rgba(182,166,127,${0.15 + 0.85 * (v / max)})` : 'rgba(128,128,140,.1)' }} title={`${DAYS[i]} ${h}:00–${h}:59: ${v} page views`} />)}
          </div>
        ))}
      </div>
      <Box paddingTop={2}><Muted>Visitor's local time. Darker cells mean more page views.</Muted></Box>
    </Box>
  );
}

function LiveStrip() {
  const { data, reload } = useWoa<Live>('/analytics/live');
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, [reload]);
  if (!data) return null;
  const max = Math.max(1, ...data.perMinute);
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={5}>
      <Grid.Root gap={5}>
        <Grid.Item col={3} s={12}>
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Flex gap={2} alignItems="center"><span className={`woa-live${data.active ? ' on' : ''}`} aria-hidden /><Muted>On the site now</Muted></Flex>
            <Typography variant="alpha" tag="p">{data.active}</Typography>
            <Muted>visitors in the last 5 minutes, updates every 30 s</Muted>
          </Flex>
        </Grid.Item>
        <Grid.Item col={4} s={12}>
          <Box style={{ width: '100%' }}>
            <Muted>Page views per minute, last 30 minutes</Muted>
            <svg viewBox="0 0 300 60" width="100%" height="60" preserveAspectRatio="none" role="img" aria-label="Page views per minute, last 30 minutes" className="woa-bar">
              {data.perMinute.map((v, i) => { const h = Math.max(1, (v / max) * 56); return <rect key={i} x={i * 10 + 1} y={60 - h} width={8} height={h} rx={2} fill={v ? GOLD : 'rgba(128,128,140,.25)'}><title>{`${29 - i} min ago: ${v}`}</title></rect>; })}
            </svg>
          </Box>
        </Grid.Item>
        <Grid.Item col={5} s={12}>
          <Box style={{ width: '100%' }}>
            <Muted>Pages open now</Muted>
            {!data.pages.length && <Box paddingTop={2}><Muted>Nobody is on the site at the moment</Muted></Box>}
            {data.pages.slice(0, 4).map(p => (
              <Flex key={p.path} justifyContent="space-between" gap={2} paddingTop={2}><Typography ellipsis>{p.title || p.path}</Typography><Typography fontWeight="semiBold">{p.count}</Typography></Flex>
            ))}
          </Box>
        </Grid.Item>
      </Grid.Root>
      {data.events.length > 0 && (
        <details className="woa-feed">
          <summary><Typography variant="pi" fontWeight="semiBold">Latest activity</Typography></summary>
          {data.events.slice(0, 15).map((e, i) => (
            <Flex key={i} gap={3} paddingTop={2} justifyContent="space-between">
              <Typography ellipsis>
                {flag(e.country)} {{ pageview: 'Viewed', download: 'Downloaded', outbound: 'Left to', video: 'Played video', search: 'Searched', notfound: 'Not found' }[e.kind] || e.kind}{' '}
                <b>{e.kind === 'pageview' || e.kind === 'notfound' ? (e.title || e.path) : e.target}</b>{e.kind !== 'pageview' && e.kind !== 'notfound' ? ` on ${e.path}` : ''}
              </Typography>
              <Muted>{ago(e.at)}</Muted>
            </Flex>
          ))}
        </details>
      )}
    </Box>
  );
}

function PagesTable({ rows, onFilter }: { rows: PageRow[]; onFilter: (p: string) => void }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const navigate = useNavigate();
  const list = rows.filter(p => !q || `${p.title} ${p.path}`.toLowerCase().includes(q.toLowerCase()));
  const shown = all ? list : list.slice(0, 25);
  return (
    <Card title="Pages" action={<Box style={{ width: 280 }}><Searchbar name="pages" value={q} onChange={(e: any) => setQ(e.target.value)} onClear={() => setQ('')} clearLabel="Clear" placeholder="Find a page">Find a page</Searchbar></Box>}>
      {!rows.length ? <Muted>No visits recorded for this period yet</Muted> : (
        <>
          <Table colCount={9} rowCount={shown.length + 1}>
            <Thead><Tr>
              {['Page', 'Views', 'Visitors', 'Avg. time', 'Scrolled', 'Entries', 'Bounce', 'Exits', ''].map(h => <Th key={h}><Typography variant="sigma">{h}</Typography></Th>)}
            </Tr></Thead>
            <Tbody>{shown.map(p => (
              <Tr key={p.path}>
                <Td style={{ maxWidth: 380 }}>
                  <button type="button" className="woa-row-link woa-cell-btn" onClick={() => onFilter(p.path)} title="Show only this page">
                    <Typography fontWeight="semiBold" ellipsis>{p.title || p.path}</Typography>
                    <Muted block>{p.section} · {p.path}</Muted>
                  </button>
                </Td>
                <Td><Typography>{num(p.views)}</Typography></Td>
                <Td><Typography>{num(p.visitors)}</Typography></Td>
                <Td><Typography>{secs(p.avgTime)}</Typography></Td>
                <Td><Typography>{p.scroll == null ? '—' : `${p.scroll}%`}</Typography></Td>
                <Td><Typography>{p.entries}</Typography></Td>
                <Td><Typography>{p.bounce == null ? '—' : `${p.bounce}%`}</Typography></Td>
                <Td><Typography>{p.exits}</Typography></Td>
                <Td>
                  <Flex gap={1}>
                    <IconButton label="Open on the site" variant="ghost" onClick={() => window.open(SITE + p.path, '_blank', 'noopener')}><ExternalLink /></IconButton>
                    {p.edit && <IconButton label="Edit in the CMS" variant="ghost" onClick={() => navigate(p.edit!)}><Pencil /></IconButton>}
                  </Flex>
                </Td>
              </Tr>
            ))}</Tbody>
          </Table>
          {list.length > 25 && <Box paddingTop={3}><Button variant="ghost" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${list.length} pages`}</Button></Box>}
        </>
      )}
    </Card>
  );
}

function VitalTile({ k, v }: { k: keyof typeof VITAL; v: number | null }) {
  const r = rate(k, v);
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={5} style={{ height: '100%', width: '100%' }}>
      <Muted>{VITAL[k].label} ({VITAL[k].short})</Muted>
      <Typography variant="alpha" tag="p">{v == null ? '—' : VITAL[k].fmt(v)}</Typography>
      <Typography variant="pi" textColor={r ? RATE_COLOR[r] : 'neutral500'}>{r ? `${cap(r)} · ` : ''}{VITAL[k].hint}</Typography>
      <Muted block>Good up to {VITAL[k].fmt(VITAL[k].good)}, poor above {VITAL[k].fmt(VITAL[k].poor)}</Muted>
    </Box>
  );
}

function Health({ data }: { data: R }) {
  const navigate = useNavigate();
  const v = data.vitals;
  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Card title="Addresses that were not found (404)">
        <Box paddingBottom={3}><Muted>Old links and typos lead here. Add a redirect in 07 · Redirects so visitors reach the right page.</Muted></Box>
        {!data.notFound.length ? <Muted>No broken addresses in this period</Muted> : (
          <Table colCount={5} rowCount={data.notFound.length + 1}>
            <Thead><Tr>{['Address', 'Hits', 'Came from', 'Last seen', 'Redirect'].map(h => <Th key={h}><Typography variant="sigma">{h}</Typography></Th>)}</Tr></Thead>
            <Tbody>{data.notFound.map(n => (
              <Tr key={n.path}>
                <Td style={{ maxWidth: 360 }}><Typography ellipsis fontWeight="semiBold" title={n.path}>{n.path}</Typography></Td>
                <Td><Typography>{n.count}</Typography></Td>
                <Td style={{ maxWidth: 280 }}><Typography ellipsis title={n.from.map(f => f.name).join(', ')}>{n.from.map(f => f.name).join(', ')}</Typography></Td>
                <Td><Muted>{ago(n.last)}</Muted></Td>
                <Td>{n.redirect ? <Badge active>Exists</Badge> : <Button size="S" variant="secondary" startIcon={<Plus />} onClick={() => { navigator.clipboard?.writeText(n.path).catch(() => {}); navigate('/content-manager/collection-types/api::redirect.redirect/create?plugins[i18n][locale]=en'); }}>Add redirect</Button>}</Td>
              </Tr>
            ))}</Tbody>
          </Table>
        )}
        {data.notFound.some(n => !n.redirect) && <Box paddingTop={2}><Muted>“Add redirect” copies the address, paste it into the “From” field.</Muted></Box>}
      </Card>
      <Box>
        <Flex justifyContent="space-between" paddingBottom={3}><Typography variant="delta" tag="h2">Loading speed of real visits</Typography><Muted>{v.samples ? `${num(v.samples)} measured page views, 75th percentile` : 'No measurements yet'}</Muted></Flex>
        <Grid.Root gap={4}>
          {(['lcp', 'inp', 'cls'] as const).map(k => <Grid.Item key={k} col={4} s={12}><VitalTile k={k} v={v[k]} /></Grid.Item>)}
        </Grid.Root>
      </Box>
      <Grid.Root gap={4}>
        <Grid.Item col={4} s={12}>
          <Card title="By device">
            {!v.devices.length && <Muted>No measurements yet</Muted>}
            {v.devices.map(d => (
              <Flex key={d.name} justifyContent="space-between" paddingTop={2} gap={2}>
                <Typography>{cap(d.name)}</Typography>
                <Typography textColor={RATE_COLOR[rate('lcp', d.lcp) || ''] || 'neutral800'}>{d.lcp == null ? '—' : VITAL.lcp.fmt(d.lcp)} LCP{d.inp != null ? ` · ${VITAL.inp.fmt(d.inp)} INP` : ''}</Typography>
              </Flex>
            ))}
          </Card>
        </Grid.Item>
        <Grid.Item col={8} s={12}>
          <Card title="Slowest pages">
            {!v.pages.length ? <Muted>No measurements yet</Muted> : (
              <Table colCount={4} rowCount={v.pages.length + 1}>
                <Thead><Tr>{['Page', 'LCP', 'INP', 'CLS'].map(h => <Th key={h}><Typography variant="sigma">{h}</Typography></Th>)}</Tr></Thead>
                <Tbody>{v.pages.map(p => (
                  <Tr key={p.path}>
                    <Td style={{ maxWidth: 360 }}><Typography ellipsis fontWeight="semiBold">{p.title || p.path}</Typography><Muted block>{p.samples} measurements</Muted></Td>
                    {(['lcp', 'inp', 'cls'] as const).map(k => <Td key={k}><Typography textColor={RATE_COLOR[rate(k, p[k]) || ''] || 'neutral800'}>{p[k] == null ? '—' : VITAL[k].fmt(p[k]!)}</Typography></Td>)}
                  </Tr>
                ))}</Tbody>
              </Table>
            )}
          </Card>
        </Grid.Item>
      </Grid.Root>
    </Flex>
  );
}

function Settings() {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [s, setS] = useState<{ enabled: boolean; weeklyDigest: boolean; retentionDays: number; excludePaths: string[] } | null>(null);
  useEffect(() => { get('/woa/analytics/settings').then(r => setS(r.data as any)); }, []);
  if (!s) return <Page.Loading />;
  const save = async () => { const r = await put('/woa/analytics/settings', s); setS(r.data as any); toggleNotification({ type: 'success', message: 'Settings saved' }); };
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Field.Root hint="Off: the site keeps sending visits, the CMS ignores them">
          <Field.Label>Collect visits</Field.Label>
          <Toggle checked={s.enabled} onLabel="On" offLabel="Off" onChange={(e: any) => setS({ ...s, enabled: e.target.checked })} />
          <Field.Hint />
        </Field.Root>
        <Field.Root hint="Every Monday morning: visitors, page views, the most visited page and broken addresses of the previous week, in Notifications">
          <Field.Label>Weekly summary</Field.Label>
          <Toggle checked={s.weeklyDigest} onLabel="On" offLabel="Off" onChange={(e: any) => setS({ ...s, weeklyDigest: e.target.checked })} />
          <Field.Hint />
        </Field.Root>
        <Field.Root hint="Older visits are deleted every night (30–1000 days)">
          <Field.Label>Keep visits for, days</Field.Label>
          <NumberInput value={s.retentionDays} onValueChange={(v: number | undefined) => setS({ ...s, retentionDays: v ?? 395 })} />
          <Field.Hint />
        </Field.Root>
        <Field.Root hint="One address start per line, for example /fr/news/">
          <Field.Label>Do not count these addresses</Field.Label>
          <Textarea value={s.excludePaths.join('\n')} onChange={(e: any) => setS({ ...s, excludePaths: e.target.value.split('\n').map((x: string) => x.trim()).filter(Boolean) })} />
          <Field.Hint />
        </Field.Root>
        <Muted>Privacy: no cookies and no IP addresses are stored. A visitor is a random id kept in the browser, the country comes from the browser time zone. Visitors with “Do Not Track” or “Global Privacy Control” are not counted.</Muted>
        <Box><Button onClick={save}>Save</Button></Box>
      </Flex>
    </Box>
  );
}

const TABS = ['overview', 'pages', 'audience', 'sources', 'engagement', 'health', 'settings'] as const;

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') || '') ? params.get('tab')! : 'overview';
  const [range, setRange] = useState('30');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [metric, setMetric] = useState<'pageviews' | 'visitors'>('pageviews');
  const filters = useMemo(() => Object.fromEntries(Object.keys(FILTER_LABEL).filter(k => params.get(k)).map(k => [k, params.get(k)!])), [params]);
  const query = useMemo(() => {
    const q = new URLSearchParams(filters);
    if (range === 'custom' && from && to) { q.set('from', iso(from)); q.set('to', iso(to)); } else q.set('days', range === 'custom' ? '30' : range);
    return q.toString();
  }, [filters, range, from, to]);
  const { get } = useFetchClient();
  const { loading, error, data, reload } = useWoa<R>(`/analytics?${query}`, [query]);

  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(params); if (v === null) p.delete(k); else p.set(k, v); setParams(p, { replace: true }); };
  const pick = (k: string) => (v: string) => setParam(k, v);
  const clearFilters = () => { const p = new URLSearchParams(); if (params.get('tab')) p.set('tab', params.get('tab')!); setParams(p, { replace: true }); };
  const exportCsv = async () => {
    const r = await get(`/woa/analytics/export?${query}`, { responseType: 'text' } as any);
    const blob = new Blob([typeof r.data === 'string' ? r.data : JSON.stringify(r.data)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `woa-analytics-${data?.from}-${data?.to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const k = data?.kpi; const pk = data?.prev;

  return (
    <Page.Main>
      <Page.Title>Analytics</Page.Title>
      <GlobalStyle />
      <style>{CSS}</style>
      <Layouts.Header title="Analytics" subtitle="Visitors, pages, sources, searches and the health of the public site"
        primaryAction={<Flex gap={2}><Button variant="tertiary" startIcon={<ArrowClockwise />} onClick={reload}>Refresh</Button><Button variant="secondary" startIcon={<Download />} onClick={exportCsv}>Export CSV</Button></Flex>} />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={5}>
          <LiveStrip />
          <Flex gap={4} alignItems="flex-end" wrap="wrap">
            <Box style={{ width: 200 }}>
              <Field.Root><Field.Label>Period</Field.Label>
                <SingleSelect value={range} onChange={(v: string | number) => setRange(String(v))}>
                  <SingleSelectOption value="1">Today</SingleSelectOption>
                  <SingleSelectOption value="7">Last 7 days</SingleSelectOption>
                  <SingleSelectOption value="30">Last 30 days</SingleSelectOption>
                  <SingleSelectOption value="90">Last 90 days</SingleSelectOption>
                  <SingleSelectOption value="365">Last 12 months</SingleSelectOption>
                  <SingleSelectOption value="custom">Choose dates</SingleSelectOption>
                </SingleSelect>
              </Field.Root>
            </Box>
            {range === 'custom' && (
              <>
                <Box style={{ width: 180 }}><Field.Root><Field.Label>From</Field.Label><DatePicker value={from} onChange={setFrom} maxDate={new Date()} locale="en-GB" clearLabel="Clear" /></Field.Root></Box>
                <Box style={{ width: 180 }}><Field.Root><Field.Label>To</Field.Label><DatePicker value={to} onChange={setTo} maxDate={new Date()} minDate={from} locale="en-GB" clearLabel="Clear" /></Field.Root></Box>
              </>
            )}
            {data && <Box paddingBottom={2}><Muted>{data.from} to {data.to}, compared with the {data.days} days before</Muted></Box>}
          </Flex>
          {Object.keys(filters).length > 0 && (
            <Flex gap={2} wrap="wrap" alignItems="center">
              <Filter aria-hidden width={16} height={16} />
              {Object.entries(filters).map(([key, v]) => (
                <Tag key={key} icon={<Cross aria-hidden />} onClick={() => setParam(key, null)} label={`Remove filter ${FILTER_LABEL[key]}`}>{FILTER_LABEL[key]}: {filterValue(key, v)}</Tag>
              ))}
              <Button variant="ghost" size="S" onClick={clearFilters}>Clear all</Button>
            </Flex>
          )}

          <Tabs.Root value={tab} onValueChange={(v: string) => setParam('tab', v === 'overview' ? null : v)}>
            <Tabs.List aria-label="Analytics">
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="pages">Pages</Tabs.Trigger>
              <Tabs.Trigger value="audience">Audience</Tabs.Trigger>
              <Tabs.Trigger value="sources">Sources</Tabs.Trigger>
              <Tabs.Trigger value="engagement">Engagement</Tabs.Trigger>
              <Tabs.Trigger value="health">Site health{data && data.notFound.some(n => !n.redirect) ? ` (${data.notFound.filter(n => !n.redirect).length})` : ''}</Tabs.Trigger>
              <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            </Tabs.List>
            {tab !== 'settings' && loading && !data && <Box paddingTop={5}><Page.Loading /></Box>}
            {tab !== 'settings' && !!error && <Box paddingTop={5}><Page.Error /></Box>}

            {data && k && pk && (
              <>
                <Tabs.Content value="overview">
                  <Flex direction="column" alignItems="stretch" gap={5} paddingTop={5}>
                    <Grid.Root gap={4}>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Unique visitors" value={num(k.visitors)} now={k.visitors} before={pk.visitors} /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Page views" value={num(k.pageviews)} now={k.pageviews} before={pk.pageviews} /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Sessions" value={num(k.sessions)} now={k.sessions} before={pk.sessions} /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="New visitors" value={k.visitors ? `${Math.round((k.newVisitors / k.visitors) * 100)}%` : '—'} now={k.newVisitors} before={pk.newVisitors} sub={`${num(k.newVisitors)} first visits`} /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Avg. time on site" value={secs(k.avgTime)} now={k.avgTime} before={pk.avgTime} /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Pages per session" value={k.pagesPerSession} now={k.pagesPerSession} before={pk.pagesPerSession} /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Bounce rate" value={`${k.bounce}%`} now={k.bounce} before={pk.bounce} invert /></Grid.Item>
                      <Grid.Item col={3} s={6} xs={12}><Tile label="Avg. scroll depth" value={k.scroll == null ? '—' : `${k.scroll}%`} now={k.scroll || 0} before={pk.scroll || 0} /></Grid.Item>
                    </Grid.Root>
                    <Card title={metric === 'pageviews' ? 'Page views per day' : 'Visitors per day'} action={
                      <Flex gap={4} alignItems="center">
                        <Muted>▮ this period · ┄ previous period</Muted>
                        <SingleSelect size="S" aria-label="Metric" value={metric} onChange={(v: string | number) => setMetric(v as any)}>
                          <SingleSelectOption value="pageviews">Page views</SingleSelectOption>
                          <SingleSelectOption value="visitors">Visitors</SingleSelectOption>
                        </SingleSelect>
                      </Flex>}>
                      <Chart data={data.perDay} metric={metric} />
                    </Card>
                    <Grid.Root gap={4}>
                      <Grid.Item col={4} s={12}><List title="Sections" items={data.sections} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Sources" items={data.referrers} fmt={s => (s === '—' ? 'Direct or unknown' : s)} onPick={pick('source')} limit={8} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Countries" items={data.countries} fmt={country} onPick={pick('country')} limit={8} /></Grid.Item>
                    </Grid.Root>
                    <Grid.Root gap={4}>
                      {[['Downloads', k.downloads, pk.downloads], ['External link clicks', k.outbound, pk.outbound], ['Video plays', k.videos, pk.videos], ['Site searches', k.searches, pk.searches]].map(([l, a, b]) => (
                        <Grid.Item key={l as string} col={3} s={6} xs={12}><Tile label={l as string} value={num(a as number)} now={a as number} before={b as number} /></Grid.Item>
                      ))}
                    </Grid.Root>
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="pages">
                  <Flex direction="column" alignItems="stretch" gap={5} paddingTop={5}>
                    <PagesTable rows={data.pages} onFilter={pick('path')} />
                    <Grid.Root gap={4}>
                      <Grid.Item col={4} s={12}><List title="Entry pages" note="Where visits start" items={data.entryPages} fmt={p => data.entryPages.find(x => x.name === p)?.title || p} onPick={pick('path')} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Exit pages" note="Where visits end" items={data.exitPages} fmt={p => data.exitPages.find(x => x.name === p)?.title || p} onPick={pick('path')} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Paths through the site" note="Previous page → next page" items={data.internal} /></Grid.Item>
                    </Grid.Root>
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="audience">
                  <Flex direction="column" alignItems="stretch" gap={5} paddingTop={5}>
                    <Grid.Root gap={4}>
                      <Grid.Item col={6} s={12}><List title="Countries" items={data.countries} fmt={country} onPick={pick('country')} limit={12} note="From the browser time zone" /></Grid.Item>
                      <Grid.Item col={6} s={12}>
                        <Card title="New and returning visitors">
                          {(() => { const t = data.audience.new + data.audience.returning; const n = t ? Math.round((data.audience.new / t) * 100) : 0; return (
                            <>
                              <div className="woa-split" role="img" aria-label={`${n}% new, ${100 - n}% returning`}><span style={{ width: `${n}%` }} /></div>
                              <Flex justifyContent="space-between" paddingTop={2}><Typography>New: <b>{num(data.audience.new)}</b> ({n}%)</Typography><Typography>Returning: <b>{num(data.audience.returning)}</b> ({t ? 100 - n : 0}%)</Typography></Flex>
                            </>); })()}
                          <Box paddingTop={6}><Typography variant="delta" tag="h3">When people visit</Typography><Box paddingTop={3}><Heatmap heat={data.heat} /></Box></Box>
                        </Card>
                      </Grid.Item>
                    </Grid.Root>
                    <Grid.Root gap={4}>
                      <Grid.Item col={4} s={12}><List title="Languages" items={data.languages} fmt={s => LANG_NAME[s] || s} onPick={pick('lang')} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Devices" items={data.devices} fmt={cap} onPick={pick('device')} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Screen sizes" items={data.screens} fmt={cap} onPick={pick('screen')} /></Grid.Item>
                      <Grid.Item col={6} s={12}><List title="Browsers" items={data.browsers} onPick={pick('browser')} /></Grid.Item>
                      <Grid.Item col={6} s={12}><List title="Operating systems" items={data.os} onPick={pick('os')} /></Grid.Item>
                    </Grid.Root>
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="sources">
                  <Flex direction="column" alignItems="stretch" gap={5} paddingTop={5}>
                    <Grid.Root gap={4}>
                      <Grid.Item col={6} s={12}><List title="Websites that send visitors" items={data.referrers} fmt={s => (s === '—' ? 'Direct or unknown' : s)} onPick={pick('source')} limit={15} /></Grid.Item>
                      <Grid.Item col={6} s={12}>
                        <List title="Campaigns" items={data.campaigns} onPick={(v) => { const c = v.split(' / ')[2]; if (c && c !== '—') setParam('campaign', c); }} limit={15}
                          empty="No tagged links yet" note={<>Source / medium / campaign from tagged links, for example <code>{SITE}/?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=games2026</code></>} />
                      </Grid.Item>
                    </Grid.Root>
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="engagement">
                  <Flex direction="column" alignItems="stretch" gap={5} paddingTop={5}>
                    <Grid.Root gap={4}>
                      <Grid.Item col={6} s={12}>
                        <Card title="Site search">
                          {!data.searches.length ? <Muted>Nobody has used the search in this period</Muted> : (
                            <Table colCount={3} rowCount={Math.min(15, data.searches.length) + 1}>
                              <Thead><Tr>{['Search term', 'Searches', 'Results'].map(h => <Th key={h}><Typography variant="sigma">{h}</Typography></Th>)}</Tr></Thead>
                              <Tbody>{data.searches.slice(0, 15).map(s => (
                                <Tr key={s.name}><Td><Typography fontWeight="semiBold">{s.name}</Typography></Td><Td><Typography>{s.count}</Typography></Td>
                                  <Td>{s.results === 0 ? <Badge>Nothing found</Badge> : <Typography>{s.results ?? '—'}</Typography>}</Td></Tr>
                              ))}</Tbody>
                            </Table>
                          )}
                        </Card>
                      </Grid.Item>
                      <Grid.Item col={6} s={12}><List title="Searches with no results" items={data.searchZero} empty="Every search found something" note="What visitors look for and cannot find: a hint for new content or wording" /></Grid.Item>
                    </Grid.Root>
                    <Grid.Root gap={4}>
                      <Grid.Item col={4} s={12}><List title="Downloads" items={data.downloads} fmt={s => decodeURIComponent(s.split('/').pop() || s)} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="External sites visitors go to" items={data.outboundHosts} /></Grid.Item>
                      <Grid.Item col={4} s={12}><List title="Video plays" items={data.videos.map(v => ({ ...v, name: v.name }))} fmt={id => { const v = data.videos.find(x => x.name === id); return v?.page ? `${v.page} (${id})` : id; }} empty="No video plays in this period" /></Grid.Item>
                    </Grid.Root>
                    <List title="External links clicked" items={data.outboundLinks} limit={15} />
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="health"><Box paddingTop={5}><Health data={data} /></Box></Tabs.Content>
              </>
            )}
            <Tabs.Content value="settings"><Box paddingTop={5}><Settings /></Box></Tabs.Content>
          </Tabs.Root>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}

const CSS = `
.woa-pick { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 8px 6px 6px; border-radius: 4px; cursor: pointer; }
.woa-pick:focus-visible, .woa-cell-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 1px; }
.woa-cell-btn { all: unset; box-sizing: border-box; display: block; max-width: 100%; padding: 4px 6px; border-radius: 4px; cursor: pointer; }
.woa-heat { display: grid; grid-template-columns: 36px repeat(24, minmax(0, 1fr)); gap: 3px; align-items: center; }
.woa-heat-h { font-size: 10px; color: #8e8ea9; text-align: center; }
.woa-heat-d { font-size: 11px; color: #8e8ea9; }
.woa-heat-c { display: block; aspect-ratio: 1; border-radius: 3px; min-height: 10px; }
.woa-heat-c:hover { outline: 2px solid #8c7c55; }
.woa-split { height: 14px; border-radius: 7px; background: rgba(128,128,140,.25); overflow: hidden; }
.woa-split span { display: block; height: 100%; background: ${GOLD}; }
.woa-live { width: 10px; height: 10px; border-radius: 50%; background: #a5a5ba; display: inline-block; }
.woa-live.on { background: #328048; animation: woa-pulse 2s ease-in-out infinite; }
@keyframes woa-pulse { 50% { opacity: .35; } }
.woa-feed { margin-top: 16px; border-top: 1px solid rgba(128,128,140,.22); padding-top: 12px; }
.woa-feed summary { cursor: pointer; border-radius: 4px; padding: 2px 4px; width: fit-content; }
.woa-feed summary:hover { background: rgba(128,128,140,.12); }
code { font-size: 12px; word-break: break-all; }
@media (prefers-reduced-motion: reduce) { .woa-live.on { animation: none; } }
`;
