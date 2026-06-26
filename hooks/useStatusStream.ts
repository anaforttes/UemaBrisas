import { useEffect, useRef } from 'react';
import { API_BASE, getToken } from '../shared/services/apiClient';

type StatusUpdate = { id: number | string; status: 'Online' | 'Offline' };
type UserUpdated = Record<string, unknown> & { id: number | string };

interface Options {
  onStatusUpdate: (update: StatusUpdate) => void;
  onSnapshot: (updates: StatusUpdate[]) => void;
  onUserUpdated?: (user: UserUpdated) => void;
  onUserRemoved?: (data: { id: number | string }) => void;
}

export function useStatusStream({
  onStatusUpdate,
  onSnapshot,
  onUserUpdated,
  onUserRemoved,
}: Options) {
  // Mantém sempre os callbacks mais recentes sem recriar a conexão SSE a cada render.
  const handlers = useRef({ onStatusUpdate, onSnapshot, onUserUpdated, onUserRemoved });
  handlers.current = { onStatusUpdate, onSnapshot, onUserUpdated, onUserRemoved };

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const token = getToken() ?? '';
      const url = token
        ? `${API_BASE}/api/autenticacao/status-stream/?token=${token}`
        : `${API_BASE}/api/autenticacao/status-stream/`;

      es = new EventSource(url);

      es.addEventListener('snapshot', (e: MessageEvent) => {
        try {
          handlers.current.onSnapshot(JSON.parse(e.data));
        } catch {
          /* */
        }
      });

      es.addEventListener('status_update', (e: MessageEvent) => {
        try {
          handlers.current.onStatusUpdate(JSON.parse(e.data));
        } catch {
          /* */
        }
      });

      es.addEventListener('user_updated', (e: MessageEvent) => {
        try {
          handlers.current.onUserUpdated?.(JSON.parse(e.data));
        } catch {
          /* */
        }
      });

      es.addEventListener('user_removed', (e: MessageEvent) => {
        try {
          handlers.current.onUserRemoved?.(JSON.parse(e.data));
        } catch {
          /* */
        }
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
