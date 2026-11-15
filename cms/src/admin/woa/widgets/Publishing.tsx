import { useState } from 'react';
import { Widget, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Flex, Typography, Box, Button } from '@strapi/design-system';
import { ArrowClockwise, Database, ExternalLink } from '@strapi/icons';
import { useWoa, ago } from '../api';
import { Row, Dot, Muted, GlobalStyle } from '../ui';

type Run = { id: number; title: string; event: string; status: string; conclusion: string | null; created: string; url: string; sha: string };
type D = { repo: string; site: string; canDispatch: boolean; autoDeploy: boolean; runs: Run[]; error?: string | null };
export default function Publishing() {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const deploy = useWoa<D>('/deploy');
  const backups = useWoa<{ items: { file: string; size: number }[] }>('/backups');
  const [busy, setBusy] = useState('');
  if (deploy.loading && !deploy.data) return <Widget.Loading />;
  if (!deploy.data) return <Widget.Error />;
  const d = deploy.data;
  const rebuild = async () => {
    setBusy('deploy');
    try { await post('/woa/deploy', { reason: 'manual rebuild from the dashboard' }); toggleNotification({ type: 'success', message: 'Site rebuild started. It takes about 4 minutes.' }); setTimeout(deploy.reload, 4000); }
    catch (e: any) { toggleNotification({ type: 'danger', message: e?.response?.data?.error || 'Could not start the rebuild' }); }
    finally { setBusy(''); }
  };
  const backup = async () => {
    setBusy('backup');
    try { await post('/woa/backups', {}); toggleNotification({ type: 'success', message: 'Backup saved' }); backups.reload(); }
    catch { toggleNotification({ type: 'danger', message: 'Backup failed' }); }
    finally { setBusy(''); }
  };
  const last = backups.data?.items[0];
  return (
    <Box>
      <GlobalStyle />
      <Row href={d.site}><Flex gap={2}><ExternalLink /><Typography fontWeight="semiBold">Public site</Typography></Flex><Muted>{d.site.replace(/^https?:\/\//, '')}</Muted></Row>
      {d.runs.slice(0, 4).map(r => (
        <Row key={r.id} href={r.url}>
          <Flex gap={3} style={{ minWidth: 0 }}>
            <Dot ok={r.status !== 'completed' ? null : r.conclusion === 'success'} />
            <Box style={{ minWidth: 0 }}><Typography ellipsis>{r.title}</Typography><Muted block>{r.status === 'completed' ? (r.conclusion === 'success' ? 'Published' : `Failed (${r.conclusion})`) : 'Building…'} · {r.event === 'repository_dispatch' ? 'from the CMS' : r.event} · {ago(r.created)}</Muted></Box>
          </Flex>
        </Row>
      ))}
      {d.error && <Muted>GitHub: {d.error}</Muted>}
      <Flex gap={2} paddingTop={3} wrap="wrap">
        <Button startIcon={<ArrowClockwise />} onClick={rebuild} loading={busy === 'deploy'} disabled={!d.canDispatch}>Rebuild site</Button>
        <Button variant="secondary" startIcon={<Database />} onClick={backup} loading={busy === 'backup'}>Back up now</Button>
      </Flex>
      <Box paddingTop={2}>
        <Muted>{d.canDispatch ? (d.autoDeploy ? 'Publishing an entry rebuilds the site automatically within 2 minutes.' : 'Automatic rebuild is off.') : 'Add GITHUB_TOKEN to the CMS settings to rebuild the site from here.'}</Muted><br />
        <Muted>{last ? `Last backup: ${last.file} (${(last.size / 1048576).toFixed(1)} MB). Nightly backup at 03:00.` : 'No backups yet. Nightly backup at 03:00.'}</Muted>
      </Box>
    </Box>
  );
}
