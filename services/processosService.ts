import { request } from '../shared/services/apiClient';

export interface EventoAPI {
  id: number;
  tipo: string;
  descricao: string;
  usuario: string;
  dados: Record<string, unknown>;
  criado_em: string;
}

export const processosService = {
  atribuirEquipe: (
    processoId: string | number,
    dados: { technician_id?: number | null; legal_id?: number | null }
  ) =>
    request<unknown>(`/api/processos/${processoId}/`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }),

  listarEventos: (processoId: string | number): Promise<EventoAPI[]> =>
    request<EventoAPI[]>(`/api/processos/${processoId}/eventos/`),
};
