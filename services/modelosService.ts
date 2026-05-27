import { request } from '../shared/services/apiClient';

export interface ModeloAPI {
  id: string;
  nome: string;
  tipo: string;
  versao: string;
  descricao: string;
  conteudo: string;
  campos: unknown[];
  is_sistema: boolean;
  criado_por: { id: number; name: string; email: string; role: string } | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ModeloCreatePayload {
  nome: string;
  tipo: string;
  versao: string;
  descricao?: string;
  conteudo: string;
  campos?: unknown[];
}

const BASE = '/api/documentos/modelos/';

export const modelosService = {
  listar: (): Promise<ModeloAPI[]> => request<ModeloAPI[]>(BASE),

  criar: (payload: ModeloCreatePayload): Promise<ModeloAPI> =>
    request<ModeloAPI>(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  atualizar: (id: string, payload: Partial<ModeloCreatePayload>): Promise<ModeloAPI> =>
    request<ModeloAPI>(`${BASE}${id}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  excluir: (id: string): Promise<void> => request<void>(`${BASE}${id}/`, { method: 'DELETE' }),
};
