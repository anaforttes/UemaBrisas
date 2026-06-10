import { request } from '../shared/services/apiClient';

export interface EventoAPI {
  id: number;
  tipo: string;
  descricao: string;
  usuario: string;
  dados: Record<string, unknown>;
  criado_em: string;
}

export type PapelEquipe = 'tecnico' | 'juridico';

export interface ConviteAtribuicao {
  id: number;
  processo: number;
  processo_titulo: string;
  processo_protocol: string;
  papel: PapelEquipe;
  papel_display: string;
  convidado: number;
  convidado_nome: string | null;
  solicitante_nome: string | null;
  status: 'pendente' | 'aceito' | 'recusado' | 'cancelado';
  criado_em: string;
  respondido_em: string | null;
}

export interface ResultadoAtribuicao {
  resultado: 'removido' | 'atribuido' | 'convite_enviado';
  processo: Record<string, unknown>;
  convite?: ConviteAtribuicao;
}

export const processosService = {
  atribuir: (
    processoId: string | number,
    dados: { papel: PapelEquipe; usuario_id: number | null }
  ): Promise<ResultadoAtribuicao> =>
    request<ResultadoAtribuicao>(`/api/processos/${processoId}/atribuir/`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  listarConvites: (processoId: string | number): Promise<ConviteAtribuicao[]> =>
    request<ConviteAtribuicao[]>(`/api/processos/${processoId}/convites/`),

  responderConvite: (conviteId: number, acao: 'aceitar' | 'recusar'): Promise<ConviteAtribuicao> =>
    request<ConviteAtribuicao>(`/api/processos/convites/${conviteId}/responder/`, {
      method: 'POST',
      body: JSON.stringify({ acao }),
    }),

  listarEventos: (processoId: string | number): Promise<EventoAPI[]> =>
    request<EventoAPI[]>(`/api/processos/${processoId}/eventos/`),
};
