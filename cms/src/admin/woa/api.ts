import { useEffect, useState, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

// Admin routes of the WOA plugin (src/plugins/woa/server): the fetch client adds the admin session
export function useWoa<T>(path: string, deps: unknown[] = []) {
  const { get } = useFetchClient();
  const [state, set] = useState<{ loading: boolean; error: unknown; data: T | null }>({ loading: true, error: null, data: null });
  const load = useCallback(async () => {
    set(s => ({ ...s, loading: true }));
    try { const { data } = await get(`/woa${path}`); set({ loading: false, error: null, data: data as T }); }
    catch (error) { set({ loading: false, error, data: null }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const ago = (s?: string | null) => {
  if (!s) return '';
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
};
export const LANG_NAME: Record<string, string> = { en: 'English', fr: 'Français', es: 'Español' };
