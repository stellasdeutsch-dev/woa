import { useEffect, useState } from 'react';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Box, Flex, Grid, Typography, Button, SingleSelect, SingleSelectOption, Tabs, Table, Thead, Tbody, Tr, Th, Td, Toggle, Field, NumberInput, Textarea } from '@strapi/design-system';
import { Download, ArrowClockwise } from '@strapi/icons';
import { useWoa, LANG_NAME } from '../api';
import { Bar, Muted, GlobalStyle } from '../ui';

type K = { visitors: number; pageviews: number; sessions: number; avgTime: number; pagesPerSession: number; bounce: number; downloads: number };
type R = { days: number; from: string; to: string; kpi: K; prev: K; perDay: { day: string; pageviews: number; visitors: number }[];
  topPages: { path: string; title: string; views: number; visitors: number; avgTime: number }[];
  referrers: { name: string; count: number }[]; languages: { name: string; count: number }[]; devices: { name: string; count: number }[]; downloads: { name: string; count: number }[] };
const secs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

function Tile({ label, value, now, before, hint, invert }: { label: string; value: string | number; now: number; before: number; hint?: string; invert?: boolean }) {
  const delta = before ? Math.round(((now - before) / before) * 100) : null;
  const good = delta === null ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={5} style={{ height: '100%' }}>
      <Muted>{label}</Muted>
      <Typography variant="alpha" tag="p" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="pi" textColor={good === null ? 'neutral500' : good ? 'success600' : 'danger600'}>{delta === null ? (hint || 'No earlier data') : `${delta > 0 ? '+' : ''}${delta}% vs previous period`}</Typography>
    </Box>
  );
}

function Chart({ data }: { data: R['perDay'] }) {
  const max = Math.max(4, ...data.map(d => d.pageviews));
  const step = Math.ceil(max / 4); const top = step * 4;
  const W = Math.max(600, data.length * 22); const H = 220; const L = 36; const B = 24;
  const bw = (W - L) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Page views and visitors per day" className="woa-bar">
      {[0, 1, 2, 3, 4].map(i => { const y = H - B - ((H - B - 8) * i) / 4; return <g key={i}><line x1={L} x2={W} y1={y} y2={y} stroke="rgba(128,128,140,.25)" /><text x={L - 6} y={y + 4} fontSize="11" textAnchor="end" fill="#8e8ea9">{step * i}</text></g>; })}
      {data.map((d, i) => {
        const h = ((H - B - 8) * d.pageviews) / top; const hv = ((H - B - 8) * d.visitors) / top; const x = L + i * bw;
        return (
          <g key={d.day}>
            <rect x={x + bw * 0.15} y={H - B - h} width={bw * 0.7} height={Math.max(h, 1)} rx={3} fill="#b6a67f"><title>{d.day}: {d.pageviews} page views, {d.visitors} visitors</title></rect>
            {d.visitors > 0 && <circle cx={x + bw / 2} cy={H - B - hv} r={3} fill="#4945ff" stroke="#fff" strokeWidth={1} />}
            {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && <text x={x + bw / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="#8e8ea9">{d.day.slice(5)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function List({ title, items, fmt = (s: string) => s }: { title: string; items: { name: string; count: number }[]; fmt?: (s: string) => string }) {
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={5} style={{ height: '100%' }}>
      <Typography variant="delta" tag="h2">{title}</Typography>
      {!items.length && <Box paddingTop={3}><Muted>No data for this period</Muted></Box>}
      {items.slice(0, 10).map(i => (
        <Box key={i.name} paddingTop={3}>
          <Flex justifyContent="space-between" gap={2}><Typography ellipsis>{fmt(i.name)}</Typography><Typography fontWeight="semiBold">{i.count}</Typography></Flex>
          <Box paddingTop={1}><Bar value={i.count} max={max} /></Box>
        </Box>
      ))}
    </Box>
  );
}

function Settings() {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [s, setS] = useState<{ enabled: boolean; retentionDays: number; excludePaths: string[] } | null>(null);
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
        <Field.Root hint="Older visits are deleted every night (30–1000 days)">
          <Field.Label>Keep visits for, days</Field.Label>
          <NumberInput value={s.retentionDays} onValueChange={(v: number | undefined) => setS({ ...s, retentionDays: v ?? 395 })} />
          <Field.Hint />
        </Field.Root>
        <Field.Root hint="One address start per line, for example /404/">
          <Field.Label>Do not count these addresses</Field.Label>
          <Textarea value={s.excludePaths.join('\n')} onChange={(e: any) => setS({ ...s, excludePaths: e.target.value.split('\n').map((x: string) => x.trim()).filter(Boolean) })} />
          <Field.Hint />
        </Field.Root>
        <Muted>Privacy: no cookies and no IP addresses are stored. A visitor is a random id kept in the browser; visitors with “Do Not Track” or “Global Privacy Control” are not counted.</Muted>
        <Box><Button onClick={save}>Save</Button></Box>
      </Flex>
    </Box>
  );
}

export default function Analytics() {
  const [days, setDays] = useState('30');
  const { get } = useFetchClient();
  const { loading, error, data, reload } = useWoa<R>(`/analytics?days=${days}`, [days]);
  const exportCsv = async () => {
    const r = await get(`/woa/analytics/export?days=${days}`, { responseType: 'text' } as any);
    const blob = new Blob([typeof r.data === 'string' ? r.data : JSON.stringify(r.data)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `woa-analytics-${days}d.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <Page.Main>
      <Page.Title>Analytics</Page.Title>
      <GlobalStyle />
      <Layouts.Header title="Analytics" subtitle="Visitors, pages, sources and downloads of the public site"
        primaryAction={<Flex gap={2}><Button variant="tertiary" startIcon={<ArrowClockwise />} onClick={reload}>Refresh</Button><Button variant="secondary" startIcon={<Download />} onClick={exportCsv}>Export CSV</Button></Flex>} />
      <Layouts.Content>
        <Tabs.Root defaultValue="reports">
          <Tabs.List aria-label="Analytics">
            <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="reports">
            <Box paddingTop={5}>
              <Flex gap={4} alignItems="flex-end" paddingBottom={5}>
                <Box style={{ width: 220 }}>
                  <Field.Root><Field.Label>Period</Field.Label>
                    <SingleSelect value={days} onChange={(v: string | number) => setDays(String(v))}>
                      <SingleSelectOption value="7">Last 7 days</SingleSelectOption>
                      <SingleSelectOption value="30">Last 30 days</SingleSelectOption>
                      <SingleSelectOption value="90">Last 90 days</SingleSelectOption>
                      <SingleSelectOption value="365">Last 12 months</SingleSelectOption>
                    </SingleSelect>
                  </Field.Root>
                </Box>
                {data && <Muted>{data.from} to {data.to} (UTC days)</Muted>}
              </Flex>
              {loading && !data && <Page.Loading />}
              {error && <Page.Error />}
              {data && (
                <Flex direction="column" alignItems="stretch" gap={5}>
                  <Grid.Root gap={4}>
                    <Grid.Item col={3} s={6} xs={12}><Tile label="Unique visitors" value={data.kpi.visitors} now={data.kpi.visitors} before={data.prev.visitors} /></Grid.Item>
                    <Grid.Item col={3} s={6} xs={12}><Tile label="Page views" value={data.kpi.pageviews} now={data.kpi.pageviews} before={data.prev.pageviews} /></Grid.Item>
                    <Grid.Item col={2} s={4} xs={12}><Tile label="Sessions" value={data.kpi.sessions} now={data.kpi.sessions} before={data.prev.sessions} /></Grid.Item>
                    <Grid.Item col={2} s={4} xs={12}><Tile label="Avg. time on site" value={secs(data.kpi.avgTime)} now={data.kpi.avgTime} before={data.prev.avgTime} /></Grid.Item>
                    <Grid.Item col={2} s={4} xs={12}><Tile label="Bounce rate" value={`${data.kpi.bounce}%`} now={data.kpi.bounce} before={data.prev.bounce} invert /></Grid.Item>
                  </Grid.Root>
                  <Box background="neutral0" hasRadius shadow="tableShadow" padding={5}>
                    <Flex justifyContent="space-between"><Typography variant="delta" tag="h2">Visits per day</Typography><Flex gap={4}><Muted>▮ page views</Muted><Muted>● visitors</Muted></Flex></Flex>
                    <Box paddingTop={3}><Chart data={data.perDay} /></Box>
                  </Box>
                  <Box background="neutral0" hasRadius shadow="tableShadow" padding={5}>
                    <Typography variant="delta" tag="h2">Most visited pages</Typography>
                    <Box paddingTop={3}>
                      {!data.topPages.length ? <Muted>No visits recorded for this period yet</Muted> : (
                        <Table colCount={4} rowCount={data.topPages.length + 1}>
                          <Thead><Tr><Th><Typography variant="sigma">Page</Typography></Th><Th><Typography variant="sigma">Views</Typography></Th><Th><Typography variant="sigma">Visitors</Typography></Th><Th><Typography variant="sigma">Avg. time on page</Typography></Th></Tr></Thead>
                          <Tbody>{data.topPages.slice(0, 20).map(p => (
                            <Tr key={p.path}><Td><Box><Typography fontWeight="semiBold">{p.title || p.path}</Typography><br /><Muted>{p.path}</Muted></Box></Td><Td><Typography>{p.views}</Typography></Td><Td><Typography>{p.visitors}</Typography></Td><Td><Typography>{secs(p.avgTime)}</Typography></Td></Tr>
                          ))}</Tbody>
                        </Table>
                      )}
                    </Box>
                  </Box>
                  <Grid.Root gap={4}>
                    <Grid.Item col={3} s={6} xs={12}><List title="Sources" items={data.referrers} fmt={(s) => (s === '—' ? 'Direct or unknown' : s)} /></Grid.Item>
                    <Grid.Item col={3} s={6} xs={12}><List title="Languages" items={data.languages} fmt={(s) => LANG_NAME[s] || s} /></Grid.Item>
                    <Grid.Item col={3} s={6} xs={12}><List title="Devices" items={data.devices} fmt={(s) => s[0].toUpperCase() + s.slice(1)} /></Grid.Item>
                    <Grid.Item col={3} s={6} xs={12}><List title="Downloads" items={data.downloads} fmt={(s) => decodeURIComponent(s.split('/').pop() || s)} /></Grid.Item>
                  </Grid.Root>
                </Flex>
              )}
            </Box>
          </Tabs.Content>
          <Tabs.Content value="settings"><Box paddingTop={5}><Settings /></Box></Tabs.Content>
        </Tabs.Root>
      </Layouts.Content>
    </Page.Main>
  );
}
