import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Box, Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { ArrowClockwise } from '@strapi/icons';
import { ago } from '../api';

type V = { id: number; action: string; user_name: string; createdAt: string };
const ACTION: Record<string, string> = { update: 'Before an edit', delete: 'Before deleting', discardDraft: 'Before discarding the draft' };

function HistoryList({ model, documentId }: { model: string; documentId: string }) {
  const [params] = useSearchParams();
  const locale = params.get('plugins[i18n][locale]') || '';
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [items, setItems] = useState<V[] | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    get(`/woa/versions?uid=${encodeURIComponent(model)}&documentId=${documentId}&locale=${locale}`).then(r => setItems((r.data as any).items)).catch(() => setItems([]));
  }, [model, documentId, locale]);
  const restore = async (v: V) => {
    try {
      const r = await post(`/woa/versions/${v.id}/restore`, {});
      toggleNotification({ type: 'success', message: (r.data as any).draft ? 'Version restored as a draft. Check it and publish.' : 'Version restored' });
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error || 'Could not restore this version' });
    }
  };
  if (!items) return <Typography variant="pi" textColor="neutral600">Loading…</Typography>;
  if (!items.length) return <Typography variant="pi" textColor="neutral600">No earlier versions yet. A copy is saved before every edit.</Typography>;
  const shown = all ? items : items.slice(0, 5);
  return (
    <Flex direction="column" alignItems="stretch" gap={2} width="100%">
      {shown.map(v => (
        <Flex key={v.id} justifyContent="space-between" alignItems="center" gap={2} className="woa-version">
          <Box>
            <Typography variant="omega" fontWeight="semiBold" tag="p">{ago(v.createdAt)}</Typography>
            <Typography variant="pi" textColor="neutral600">{ACTION[v.action] || v.action} · {v.user_name}</Typography>
          </Box>
          <Dialog.Root>
            <Dialog.Trigger><Button size="S" variant="tertiary" startIcon={<ArrowClockwise />}>Restore</Button></Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Header>Restore this version?</Dialog.Header>
              <Dialog.Body>The entry goes back to how it was {ago(v.createdAt)}. The current text is saved as a version first, so this can be undone.</Dialog.Body>
              <Dialog.Footer>
                <Dialog.Cancel><Button variant="tertiary">Cancel</Button></Dialog.Cancel>
                <Dialog.Action><Button onClick={() => restore(v)}>Restore</Button></Dialog.Action>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      ))}
      {items.length > 5 && <Button variant="ghost" size="S" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${items.length}`}</Button>}
      <style>{'.woa-version { padding: 6px; border-radius: 4px; } .woa-version:hover { background: rgba(128,128,140,.12); }'}</style>
    </Flex>
  );
}

// Side panel in the edit view of every entry: earlier versions with a restore button
const HistoryPanel = ({ model, documentId }: { model: string; documentId?: string }) => {
  if (!documentId || !model.startsWith('api::')) return null;
  return { title: 'History', content: <HistoryList model={model} documentId={documentId} /> };
};
export default HistoryPanel;
