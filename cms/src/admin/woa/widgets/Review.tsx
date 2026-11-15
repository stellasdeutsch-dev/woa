import { Widget } from '@strapi/strapi/admin';
import { Flex, Typography, Box, Badge } from '@strapi/design-system';
import { useWoa, ago, LANG_NAME } from '../api';
import { Row, Muted, GlobalStyle } from '../ui';

type Item = { type: string; title: string; locale: string; status: string; note?: string; updatedAt: string; href: string };
export default function Review() {
  const { loading, error, data } = useWoa<{ items: Item[] }>('/review');
  if (loading) return <Widget.Loading />;
  if (error || !data) return <Widget.Error />;
  if (!data.items.length) return <Widget.NoData>Nothing is waiting for your approval. To ask for a review, set “Review status” to “needs_review” on an entry.</Widget.NoData>;
  return (
    <Box>
      <GlobalStyle />
      {data.items.slice(0, 8).map((i, k) => (
        <Row key={k} to={i.href}>
          <Box style={{ minWidth: 0 }}>
            <Typography fontWeight="semiBold" ellipsis>{i.title}</Typography>
            <Muted block>{i.type} · {LANG_NAME[i.locale] || i.locale} · {ago(i.updatedAt)}{i.note ? ` · ${i.note}` : ''}</Muted>
          </Box>
          <Badge active={i.status === 'needs_review'}>{i.status === 'needs_review' ? 'Needs review' : 'Changes requested'}</Badge>
        </Row>
      ))}
    </Box>
  );
}
