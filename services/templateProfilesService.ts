import { request } from '../shared/services/apiClient';

export type DynamicDadosPerfil = Record<string, string>;

export interface TemplateProfile {
  id: string;
  nomePerfil: string;
  dados: DynamicDadosPerfil;
  atualizadoEm: string;
}

interface PerfilAPI {
  id: number;
  nomePerfil: string;
  dados: DynamicDadosPerfil;
  atualizadoEm: string;
}

const BASE = '/api/autenticacao/perfis-template/';

function apiParaPerfil(p: PerfilAPI): TemplateProfile {
  return {
    id: String(p.id),
    nomePerfil: p.nomePerfil,
    dados: p.dados,
    atualizadoEm: p.atualizadoEm,
  };
}

export const templateProfilesService = {
  async list(_userId: string): Promise<TemplateProfile[]> {
    const data = await request<PerfilAPI[]>(BASE);
    return data.map(apiParaPerfil);
  },

  async create(
    _userId: string,
    payload: { nomePerfil: string; dados: DynamicDadosPerfil }
  ): Promise<TemplateProfile> {
    const created = await request<PerfilAPI>(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return apiParaPerfil(created);
  },

  async remove(_userId: string, profileId: string): Promise<void> {
    await request<void>(`${BASE}${profileId}/`, { method: 'DELETE' });
  },
};
