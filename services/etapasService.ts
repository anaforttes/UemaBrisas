import { request } from '../shared/services/apiClient';

export interface EtapaAPI {
  id: number;
  numero: number;
  nome: string;
  eixo: string;
  status: string;
  observacoes: string;
  data_inicio: string | null;
  data_conclusao: string | null;
  prazo: string | null;
  depende_de: number[];
  responsavel_id: number | null;
  responsavel_nome: string | null;
}

export const etapasService = {
  listar: (processoId: string | number): Promise<EtapaAPI[]> =>
    request<EtapaAPI[]>(`/api/processos/${processoId}/etapas/`),

  protocolar: (processoId: string | number): Promise<EtapaAPI[]> =>
    request<EtapaAPI[]>(`/api/processos/${processoId}/etapas/protocolar/`, { method: 'POST' }),

  atualizar: (
    etapaId: number,
    dados: Partial<Pick<EtapaAPI, 'status' | 'observacoes' | 'responsavel_id' | 'prazo'>>
  ): Promise<EtapaAPI> =>
    request<EtapaAPI>(`/api/etapas/${etapaId}/`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }),
};
