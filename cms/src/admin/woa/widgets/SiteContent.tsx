import { Widget } from '@strapi/strapi/admin';
import { Flex, Typography, Box } from '@strapi/design-system';
import { useWoa } from '../api';
import { Row, Muted, GlobalStyle } from '../ui';

type T = { key: string; label: string; href: string; locales: Record<string, { total: number; published: number }> };
const MAIN = ['pages', 'news', 'practices', 'noas', 'leaders', 'nav', 'ui'];

export default function SiteContent() {
  const { loading, error, data } = useWoa<{ types: T[]; media: number }>('/overview');
  if (loading) return <Widget.Loading />;
  if (error || !data) return <Widget.Error />;
  const types = data.types.filter(t => MAIN.includes(t.key));
  return (
    <Box>
      <GlobalStyle />
      <Flex justifyContent="space-between" paddingBottom={1}><Muted>Published / total</Muted><Flex gap={6}><Muted>EN</Muted><Muted>FR</Muted><Muted>ES</Muted></Flex></Flex>
      {types.map(t => (
        <Row key={t.key} to={t.href}>
          <Typography fontWeight="semiBold">{t.label}</Typography>
          <Flex gap={4}>
            {['en', 'fr', 'es'].map(l => (
              <Typography key={l} variant="omega" style={{ minWidth: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                <b>{t.locales[l].published}</b><span style={{ color: '#8e8ea9' }}> / {t.locales[l].total}</span>
              </Typography>
            ))}
          </Flex>
        </Row>
      ))}
      <Row to="/plugins/upload"><Typography fontWeight="semiBold">Media Library</Typography><Typography variant="omega"><b>{data.media}</b> files</Typography></Row>
    </Box>
  );
}
