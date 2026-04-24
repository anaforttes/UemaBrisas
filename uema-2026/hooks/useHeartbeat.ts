import { useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const INTERVAL_MS = 25_000;

function getToken(): string {
  return (
    localStorage.getItem('reurb_access_token') ||
    localStorage.getItem('access_token') ||
    ''
  );
}

async function sendHeartbeat() {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_URL}/api/autenticacao/heartbeat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // token também no body — fallback caso o header seja bloqueado
      body: JSON.stringify({ token }),
    });
  } catch { /* falha silenciosa */ }
}

function sendOffline() {
  const token = getToken();
  if (!token) return;
  // sendBeacon NÃO suporta headers customizados —
  // por isso o token vai no body JSON
  const blob = new Blob(
    [JSON.stringify({ token })],
    { type: 'application/json' },
  );
  navigator.sendBeacon(
    `${API_URL}/api/autenticacao/logout-status/`,
    blob,
  );
}

export function useHeartbeat() {
  useEffect(() => {
    sendHeartbeat(); // ping imediato ao montar → Online instantâneo
    const interval = window.setInterval(sendHeartbeat, INTERVAL_MS);

    // Offline ao fechar aba/janela
    window.addEventListener('beforeunload', sendOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', sendOffline);
      sendOffline(); // Offline ao desmontar (logout programático)
    };
  }, []);
}
