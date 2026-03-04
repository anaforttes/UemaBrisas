
import { User, REURBProcess, REURBDocument, ProcessStatus } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Token helpers ────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('reurb_token');
}
function getRefreshToken(): string | null {
  return localStorage.getItem('reurb_refresh_token');
}
function setTokens(access: string, refresh?: string) {
  localStorage.setItem('reurb_token', access);
  if (refresh) localStorage.setItem('reurb_refresh_token', refresh);
}
function clearTokens() {
  localStorage.removeItem('reurb_token');
  localStorage.removeItem('reurb_refresh_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ─── Renovar access token automaticamente ao receber 401 ─────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function tryRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    setTokens(data.token, data.refreshToken);
    return data.token;
  } catch {
    clearTokens();
    return null;
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const makeRequest = (token?: string) =>
    fetch(`${API_URL}${path}`, {
      headers: token
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        : authHeaders(),
      ...options,
    });

  let res = await makeRequest();

  // Se expirou, tenta renovar uma vez
  if (res.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;
      refreshQueue.forEach((cb) => newToken && cb(newToken));
      refreshQueue = [];
      if (newToken) {
        res = await makeRequest(newToken);
      } else {
        // Limpa sessão e força reload
        clearTokens();
        window.dispatchEvent(new Event('reurb:session-expired'));
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    } else {
      // Aguarda o refresh em andamento
      const newToken = await new Promise<string>((resolve) => {
        refreshQueue.push(resolve);
      });
      res = await makeRequest(newToken);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ──────────────────────────────────────────────
// Interface compatível com o frontend existente
// ──────────────────────────────────────────────
class APIDatabase {

  users = {
    selectAll: async (): Promise<User[]> => {
      return api<User[]>('/users');
    },

    insert: async (user: any): Promise<any> => {
      return api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    },

    findByEmail: async (email: string): Promise<User | null> => {
      return api<User | null>(`/users/by-email?email=${encodeURIComponent(email)}`);
    },

    updateActivity: async (userId: string): Promise<void> => {
      const result = await api<User>(`/users/${userId}/activity`, { method: 'PATCH' });
      const currentUser = localStorage.getItem('reurb_current_user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed.id === userId) {
          localStorage.setItem('reurb_current_user', JSON.stringify({ ...parsed, ...result }));
        }
      }
    },

    updateQuota: async (userId: string, tokensUsed: number): Promise<any> => {
      const result = await api(`/users/${userId}/quota`, {
        method: 'PATCH',
        body: JSON.stringify({ tokensUsed }),
      });
      const currentUser = localStorage.getItem('reurb_current_user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed.id === userId) {
          parsed.quota = (result as any).quota;
          localStorage.setItem('reurb_current_user', JSON.stringify(parsed));
        }
      }
      return result;
    },

    login: async (email: string, password: string): Promise<{ token: string; refreshToken: string; user: User }> => {
      const result = await api<{ token: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setTokens(result.token, result.refreshToken);
      return result;
    },

    logout: async (): Promise<void> => {
      const rt = getRefreshToken();
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
      } catch { /* ignora erros de rede no logout */ }
      clearTokens();
    },

    googleLogin: async (userData: { name: string; email: string; avatar: string }): Promise<{ token: string; refreshToken: string; user: User }> => {
      const result = await api<{ token: string; refreshToken: string; user: User }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      setTokens(result.token, result.refreshToken);
      return result;
    },
  };

  processes = {
    selectAll: async (): Promise<REURBProcess[]> => {
      return api<REURBProcess[]>('/processes');
    },

    insert: async (process: Partial<REURBProcess>): Promise<REURBProcess> => {
      return api<REURBProcess>('/processes', {
        method: 'POST',
        body: JSON.stringify(process),
      });
    },

    updateStatus: async (id: string, status: ProcessStatus): Promise<void> => {
      await api(`/processes/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    update: async (id: string, data: Partial<REURBProcess>): Promise<REURBProcess> => {
      return api<REURBProcess>(`/processes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<void> => {
      await api(`/processes/${id}`, { method: 'DELETE' });
    },

    finalize: async (id: string): Promise<void> => {
      await api(`/processes/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Finalizado' }),
      });
    },

    getSteps: async (processId: string): Promise<any[]> => {
      return api<any[]>(`/processes/${processId}/steps`);
    },

    updateStep: async (processId: string, stepId: string, data: { status?: string; notes?: string; responsibleId?: string }): Promise<any> => {
      return api<any>(`/processes/${processId}/steps/${stepId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    initSteps: async (processId: string): Promise<any[]> => {
      return api<any[]>(`/processes/${processId}/steps/init`, { method: 'POST' });
    },
  };

  documents = {
    findByProcessId: async (processId: string): Promise<REURBDocument[]> => {
      return api<REURBDocument[]>(`/documents?processId=${encodeURIComponent(processId)}`);
    },

    upsert: async (doc: Partial<REURBDocument>): Promise<REURBDocument> => {
      return api<REURBDocument>('/documents', {
        method: 'PUT',
        body: JSON.stringify(doc),
      });
    },
  };
}

export const dbService = new APIDatabase();
