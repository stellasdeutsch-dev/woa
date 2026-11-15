import { Widget } from '@strapi/strapi/admin';
import { Flex, Typography, Box } from '@strapi/design-system';
import { useWoa } from '../api';
import { Bar, Muted } from '../ui';

type T = { key: string; label: string; coverage: Record<string, number> };
export default function Translations() {
  const { loading, error, data } = useWoa<{ types: T[] }>('/overview');
  if (loading) return <Widget.Loading />;
  if (error || !data) return <Widget.Error />;
  const types = data.types.filter(t => ['pages', 'news', 'practices', 'noas', 'leaders', 'ui'].includes(t.key));
  return (
    <Box>
      <Muted>Share of English entries that have a French and a Spanish version</Muted>
      {types.map(t => (
        <Box key={t.key} paddingTop={3}>
          <Typography fontWeight="semiBold">{t.label}</Typography>
          {(['fr', 'es'] as const).map(l => (
            <Flex key={l} gap={3} paddingTop={1}>
              <Typography variant="pi" style={{ width: 22 }}>{l.toUpperCase()}</Typography>
              <Bar value={t.coverage[l]} max={100} color={l === 'fr' ? '#b6a67f' : '#262626'} />
              <Typography variant="pi" style={{ width: 40, textAlign: 'right' }}>{t.coverage[l]}%</Typography>
            </Flex>
          ))}
        </Box>
      ))}
    </Box>
  );
}
