import { request } from '../shared/services/apiClient';

export interface AnexoAPI {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  etapa_numero: number | null;
  adicionado_por: string | null;
  adicionado_em: string;
}

export const anexosService = {
  listar: (processoId: string | number): Promise<AnexoAPI[]> =>
    request<AnexoAPI[]>(`/api/processos/${processoId}/anexos/`),

  upload: async (
    processoId: string | number,
    arquivo: File,
    etapaNumero?: number | null
  ): Promise<AnexoAPI> => {
    const token = localStorage.getItem('reurb_access_token') || '';
    const form = new FormData();
    form.append('arquivo', arquivo);
    if (etapaNumero != null) form.append('etapa_numero', String(etapaNumero));
    const resp = await fetch(`/api/processos/${processoId}/anexos/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!resp.ok) throw new Error('Upload falhou');
    return resp.json();
  },

  deletar: (anexoId: number): Promise<void> =>
    request<void>(`/api/anexos/${anexoId}/`, { method: 'DELETE' }),
};
