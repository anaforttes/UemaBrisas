import { useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const INTERVAL_MS = 25_000;

function getToken(): string {
  return localStorage.getItem('reurb_access_token') || '';
}

async function sendHeartbeat() {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_URL}/api/autenticacao/heartbeat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token }),
    });
  } catch { /* falha silenciosa */ }
}

function sendOffline() {
  const token = getToken();
  if (!token) return;
  const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
  navigator.sendBeacon(`${API_URL}/api/autenticacao/logout-status/`, blob);
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
