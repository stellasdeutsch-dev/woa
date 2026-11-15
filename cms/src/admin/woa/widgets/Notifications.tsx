import { useState } from 'react';
import { Widget, useFetchClient } from '@strapi/strapi/admin';
import { Flex, Typography, Box, Button } from '@strapi/design-system';
import { useWoa, ago } from '../api';
import { Row, Count, Muted, GlobalStyle } from '../ui';

type N = { id: number; title: string; kind: 'info' | 'success' | 'warning' | 'error'; link?: string; read: boolean; createdAt: string };
const TONE = { info: 'neutral', success: 'success', warning: 'warning', error: 'danger' } as const;
export default function Notifications() {
  const { post, del } = useFetchClient();
  const { loading, error, data, reload } = useWoa<{ unread: number; items: N[] }>('/notifications');
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Widget.Loading />;
  if (error || !data) return <Widget.Error />;
  if (!data.items.length) return <Widget.NoData>No notifications yet</Widget.NoData>;
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await reload(); } finally { setBusy(false); } };
  return (
    <Box>
      <GlobalStyle />
      <Flex justifyContent="space-between" paddingBottom={2}>
        <Muted>{data.unread} unread</Muted>
        <Flex gap={2}>
          <Button size="S" variant="tertiary" disabled={busy || !data.unread} onClick={() => act(() => post('/woa/notifications/read', {}))}>Mark all as read</Button>
          <Button size="S" variant="tertiary" disabled={busy || data.items.every(n => !n.read)} onClick={() => act(() => del('/woa/notifications'))}>Clear read</Button>
        </Flex>
      </Flex>
      <Box style={{ maxHeight: 260, overflowY: 'auto' }}>
        {data.items.map(n => {
          const body = (
            <>
              <Flex gap={3} alignItems="flex-start" style={{ minWidth: 0 }}>
                {!n.read ? <Count n="New" tone={TONE[n.kind]} /> : <span style={{ width: 44, flex: 'none' }} />}
                <Box style={{ minWidth: 0 }}>
                  <Typography fontWeight={n.read ? 'regular' : 'semiBold'}>{n.title}</Typography>
                  <Muted block>{ago(n.createdAt)}</Muted>
                </Box>
              </Flex>
              {!n.read && <Button size="S" variant="ghost" style={{ whiteSpace: 'nowrap', flex: 'none' }} onClick={(e: any) => { e.preventDefault(); act(() => post('/woa/notifications/read', { ids: [n.id] })); }}>Mark as read</Button>}
            </>
          );
          if (n.link && /^https?:/.test(n.link)) return <Row key={n.id} href={n.link}>{body}</Row>;
          if (n.link) return <Row key={n.id} to={n.link}>{body}</Row>;
          return <Row key={n.id}>{body}</Row>;
        })}
      </Box>
    </Box>
  );
}
