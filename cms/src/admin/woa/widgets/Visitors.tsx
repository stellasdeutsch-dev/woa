import { Widget } from '@strapi/strapi/admin';
import { Flex, Typography, Box } from '@strapi/design-system';
import { useWoa } from '../api';
import { Muted } from '../ui';

type R = { kpi: { visitors: number; pageviews: number; avgTime: number }; perDay: { day: string; pageviews: number }[] };
export default function Visitors() {
  const { loading, error, data } = useWoa<R>('/analytics?days=14');
  if (loading) return <Widget.Loading />;
  if (error || !data) return <Widget.Error />;
  const max = Math.max(1, ...data.perDay.map(d => d.pageviews));
  return (
    <Box>
      <Flex gap={6} paddingBottom={3}>
        {[['Visitors', data.kpi.visitors], ['Page views', data.kpi.pageviews], ['Avg. time', `${Math.floor(data.kpi.avgTime / 60)} min ${data.kpi.avgTime % 60} s`]].map(([k, v]) => (
          <Box key={k as string}><Muted>{k}</Muted><Typography variant="beta" tag="p">{v}</Typography></Box>
        ))}
      </Flex>
      <svg viewBox={`0 0 ${data.perDay.length * 20} 64`} width="100%" height="64" preserveAspectRatio="none" role="img" aria-label="Page views per day, last 14 days" className="woa-bar">
        {data.perDay.map((d, i) => { const h = Math.max(2, (d.pageviews / max) * 60); return <rect key={d.day} x={i * 20 + 3} y={64 - h} width={14} height={h} rx={3} fill="#b6a67f"><title>{d.day}: {d.pageviews}</title></rect>; })}
      </svg>
      <Muted>Last 14 days. The site sends visits once the CMS address is set in the site build (PUBLIC_CMS_URL).</Muted>
    </Box>
  );
}
