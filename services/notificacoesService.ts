import { request } from '../shared/services/apiClient';

export interface Notificacao {
  id: number;
  tipo: 'comentario' | 'colaborador' | 'conflito' | 'sistema';
  titulo: string;
  descricao: string;
  lida: boolean;
  link: string;
  criado_em: string;
}

export interface ListaNotificacoes {
  resultados: Notificacao[];
  nao_lidas: number;
}

export async function listarNotificacoes(apenasNaoLidas = false): Promise<ListaNotificacoes> {
  const qs = apenasNaoLidas ? '?nao_lidas=1' : '';
  return request<ListaNotificacoes>(`/api/notificacoes/${qs}`);
}

export async function marcarLida(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/api/notificacoes/${id}/lida/`, { method: 'PATCH' });
}

export async function marcarTodasLidas(): Promise<void> {
  await request<{ marcadas: number }>('/api/notificacoes/marcar-todas/', { method: 'POST' });
}
