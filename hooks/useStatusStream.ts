import { useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type StatusUpdate = { id: number | string; status: 'Online' | 'Offline' };
type UserUpdated  = Record<string, unknown> & { id: number | string };

interface Options {
  onStatusUpdate: (update: StatusUpdate) => void;
  onSnapshot:     (updates: StatusUpdate[]) => void;
  onUserUpdated?: (user: UserUpdated) => void;
  onUserRemoved?: (data: { id: number | string }) => void;
}

export function useStatusStream({ onStatusUpdate, onSnapshot, onUserUpdated, onUserRemoved }: Options) {
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const token = localStorage.getItem('reurb_access_token') || '';
      const url = token
        ? `${API_URL}/api/autenticacao/status-stream/?token=${token}`
        : `${API_URL}/api/autenticacao/status-stream/`;

      es = new EventSource(url);

      es.addEventListener('snapshot', (e: MessageEvent) => {
        try { onSnapshot(JSON.parse(e.data)); } catch { /* */ }
      });

      es.addEventListener('status_update', (e: MessageEvent) => {
        try { onStatusUpdate(JSON.parse(e.data)); } catch { /* */ }
      });

      es.addEventListener('user_updated', (e: MessageEvent) => {
        try { if (onUserUpdated) onUserUpdated(JSON.parse(e.data)); } catch { /* */ }
      });

      es.addEventListener('user_removed', (e: MessageEvent) => {
        try { if (onUserRemoved) onUserRemoved(JSON.parse(e.data)); } catch { /* */ }
      });

      es.onerror = () => {
        es?.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, []);
}
