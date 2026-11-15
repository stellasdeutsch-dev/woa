import { Widget } from '@strapi/strapi/admin';
import { Flex, Typography, Box } from '@strapi/design-system';
import { CheckCircle, ChevronRight } from '@strapi/icons';
import { useWoa } from '../api';
import { Row, Count, GlobalStyle } from '../ui';

type Item = { id: string; label: string; count: number; href: string };
export default function Attention() {
  const { loading, error, data } = useWoa<{ items: Item[] }>('/attention');
  if (loading) return <Widget.Loading />;
  if (error || !data) return <Widget.Error />;
  const items = [...data.items].sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0));
  return (
    <Box>
      <GlobalStyle />
      {items.map(i => (
        <Row key={i.id} to={i.href}>
          <Flex gap={3}>
            {i.count > 0 ? <Count n={i.count} tone="warning" /> : <CheckCircle fill="success600" width={20} height={20} />}
            <Typography textColor={i.count > 0 ? 'neutral800' : 'neutral600'}>{i.count > 0 ? i.label : `No ${i.label}`}</Typography>
          </Flex>
          <ChevronRight fill="neutral500" />
        </Row>
      ))}
    </Box>
  );
}
