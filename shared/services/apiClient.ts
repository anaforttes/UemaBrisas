// Centraliza URL da API, gerenciamento de tokens e request HTTP autenticado.
// Todos os services e hooks devem importar daqui — nunca hardcodar URL ou ler
// localStorage diretamente.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('reurb_access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('reurb_refresh_token');
}

export function clearAuthStorage(): void {
  localStorage.removeItem('reurb_access_token');
  localStorage.removeItem('reurb_refresh_token');
  localStorage.removeItem('reurb_current_user');
  window.dispatchEvent(new Event('reurb:auth-expired'));
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuthStorage();
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/api/autenticacao/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      clearAuthStorage();
      return null;
    }
    const data = await res.json();
    localStorage.setItem('reurb_access_token', data.access);
    if (data.refresh) localStorage.setItem('reurb_refresh_token', data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

function buildHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── HTTP client com auto-refresh de token ────────────────────────────────────

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let token = getToken();
  let res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...buildHeaders(token), ...(init?.headers ?? {}) },
  });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { ...buildHeaders(token), ...(init?.headers ?? {}) },
      });
    }
  }

  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(
      (erro as Record<string, string>).erro ??
        (erro as Record<string, string>).detail ??
        (erro as Record<string, string>).message ??
        `Erro ${res.status}`
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
