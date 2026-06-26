import { request } from '../shared/services/apiClient';

export interface ConviteNotificacao {
  id: number;
  status: 'pendente' | 'aceito' | 'recusado' | 'cancelado';
  papel: 'tecnico' | 'juridico';
  papel_display: string;
  processo_id: number;
  processo_titulo: string;
}

export interface Notificacao {
  id: number;
  tipo: 'comentario' | 'colaborador' | 'conflito' | 'atribuicao' | 'assinatura' | 'sistema';
  titulo: string;
  descricao: string;
  lida: boolean;
  link: string;
  convite: ConviteNotificacao | null;
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

export interface AssinaturaPendente {
  documento_id: string;
  doc_ref: string;
  titulo: string;
  solicitante: string;
  link: string;
  criado_em: string;
}

export async function listarAssinaturasPendentes(): Promise<{
  resultados: AssinaturaPendente[];
  total: number;
}> {
  return request('/api/documentos/assinaturas/pendentes/');
}
