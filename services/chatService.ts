import { request } from '../shared/services/apiClient';

export interface MensagemChat {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  texto: string;
  criado_em: string;
}

export const chatService = {
  listar: (desde?: string): Promise<MensagemChat[]> => {
    const qs = desde ? `?desde=${encodeURIComponent(desde)}` : '';
    return request<MensagemChat[]>(`/api/chat/${qs}`);
  },

  enviar: (texto: string): Promise<MensagemChat> =>
    request<MensagemChat>('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({ texto }),
    }),
};
