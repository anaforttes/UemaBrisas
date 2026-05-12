import { useEffect } from 'react';
import { API_BASE, getToken } from '../shared/services/apiClient';

const INTERVAL_MS = 25_000;

async function sendHeartbeat() {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/autenticacao/heartbeat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    // falha silenciosa — sessão continua ativa até o próximo ciclo
  }
}

function sendOffline() {
  const token = getToken();
  if (!token) return;
  const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
  navigator.sendBeacon(`${API_BASE}/api/autenticacao/logout-status/`, blob);
}

export function useHeartbeat(active = true) {
  useEffect(() => {
    if (!active) return;
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, INTERVAL_MS);
    window.addEventListener('beforeunload', sendOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', sendOffline);
      sendOffline();
    };
  }, [active]);
}
