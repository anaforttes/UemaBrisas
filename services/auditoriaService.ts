import { request } from '../shared/services/apiClient';

export interface RegistroAuditoria {
  id: string;
  tipo: string;
  usuario: string;
  descricao: string;
  versao: number | null;
  criado_em: string;
}

export interface UsuarioPresenca {
  usuario_id: number;
  usuario_name: string;
  ultimo_acesso: string;
  cursor_pos: number | null;
}

export const auditoriaService = {
  listar: async (docId: string): Promise<RegistroAuditoria[]> => {
    return request<RegistroAuditoria[]>(`/api/documentos/${docId}/auditoria/`);
  },

  obterPresenca: async (docId: string): Promise<UsuarioPresenca[]> => {
    return request<UsuarioPresenca[]>(`/api/documentos/${docId}/presenca/`);
  },

  atualizarPresenca: async (docId: string, cursorPos?: number | null): Promise<void> => {
    await request(`/api/documentos/${docId}/presenca/`, {
      method: 'POST',
      body: JSON.stringify({ cursor_pos: cursorPos ?? null }),
    });
  },
};
