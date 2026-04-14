export type DynamicDadosPerfil = Record<string, string>;

export interface TemplateProfile {
  id: string;
  nomePerfil: string;
  dados: DynamicDadosPerfil;
  atualizadoEm: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('reurb_auth_token');
}

function getStorageKey(userId: string): string {
  return `reurb_template_profiles_${userId}`;
}

function readLocal(userId: string): TemplateProfile[] {
  const raw = localStorage.getItem(getStorageKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TemplateProfile[];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, profiles: TemplateProfile[]): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(profiles));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (init?.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const templateProfilesService = {
  async list(userId: string): Promise<TemplateProfile[]> {
    try {
      const data = await request<TemplateProfile[]>(`/api/users/${userId}/template-profiles`);
      writeLocal(userId, data);
      return data;
    } catch {
      return readLocal(userId);
    }
  },

  async create(userId: string, payload: { nomePerfil: string; dados: DynamicDadosPerfil }): Promise<TemplateProfile> {
    try {
      const created = await request<TemplateProfile>(`/api/users/${userId}/template-profiles`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const local = readLocal(userId);
      writeLocal(userId, [created, ...local.filter((p) => p.id !== created.id)].slice(0, 15));
      return created;
    } catch {
      const novo: TemplateProfile = {
        id: `perfil-${Date.now()}`,
        nomePerfil: payload.nomePerfil,
        dados: payload.dados,
        atualizadoEm: new Date().toISOString(),
      };
      const local = readLocal(userId);
      writeLocal(userId, [novo, ...local].slice(0, 15));
      return novo;
    }
  },

  async remove(userId: string, profileId: string): Promise<void> {
    try {
      await request<{ ok: true }>(`/api/users/${userId}/template-profiles/${profileId}`, {
        method: 'DELETE',
      });
    } catch {
      // fallback local
    }

    const local = readLocal(userId).filter((p) => p.id !== profileId);
    writeLocal(userId, local);
  },
};
