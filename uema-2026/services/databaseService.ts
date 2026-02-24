
import { User, REURBProcess, REURBDocument, ProcessStatus } from '../types/index';

const API_URL = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('reurb_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
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
      // Atualizar usuário no localStorage
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
      // Atualizar quota no localStorage
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

    login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
      const result = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('reurb_token', result.token);
      return result;
    },

    googleLogin: async (userData: { name: string; email: string; avatar: string }): Promise<{ token: string; user: User }> => {
      const result = await api<{ token: string; user: User }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      localStorage.setItem('reurb_token', result.token);
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
