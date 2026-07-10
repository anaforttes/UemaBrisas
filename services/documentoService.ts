import { request, getToken, API_BASE, refreshAccessToken } from '../shared/services/apiClient';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DocColaborador {
  id: number;
  usuario: { id: number; name: string; email: string; role: string };
  papel: 'editor' | 'visualizador';
  convidado_em: string;
}

export interface DocComentario {
  id: string;
  autor: { id: number; name: string; email: string; role: string } | null;
  autor_nome: string;
  autor_cargo: string;
  texto: string;
  tipo: 'comentario' | 'sugestao';
  status: 'pendente' | 'aceito' | 'rejeitado';
  texto_selecionado: string;
  pos_inicio: number | null;
  pos_fim: number | null;
  criado_em: string;
}

export interface ConflictError {
  conflito: true;
  versao_atual: number;
  conteudo_atual: string;
  titulo_atual: string;
  autor_ultima_versao: string;
}

export interface DocVersao {
  id: number;
  numero: number;
  titulo: string;
  autor_nome: string;
  descricao: string;
  criado_em: string;
  conteudo?: string;
}

export interface DocAssinatura {
  id: number;
  usuario: { id: number; name: string; email: string; role: string } | null;
  status: 'pendente' | 'assinado' | 'rejeitado';
  ordem: number;
  protocolo: string;
  hash_assinatura: string;
  nome_certificado: string;
  cpf_certificado: string;
  ac_emissora: string;
  assinado_em: string | null;
}

export interface DocLista {
  id: string;
  doc_ref: string;
  titulo: string;
  processo_id: string;
  criado_por: { id: number; name: string; email: string; role: string } | null;
  status: string;
  versao_atual: number;
  criado_em: string;
  atualizado_em: string;
}

export interface DocDetalhe {
  id: string;
  doc_ref: string;
  titulo: string;
  conteudo: string;
  cabecalho: string;
  rodape: string;
  processo_id: string;
  criado_por: { id: number; name: string; email: string; role: string } | null;
  status: string;
  versao_atual: number;
  criado_em: string;
  atualizado_em: string;
  colaboradores: DocColaborador[];
  assinaturas: DocAssinatura[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const documentoService = {
  listarPorProcesso: async (processoId: string): Promise<DocLista[]> => {
    return request<DocLista[]>(`/api/documentos/?processo_id=${encodeURIComponent(processoId)}`);
  },

  buscarPorRef: async (docRef: string): Promise<DocDetalhe | null> => {
    const lista = await request<DocDetalhe[]>(
      `/api/documentos/?doc_ref=${encodeURIComponent(docRef)}`
    );
    if (!lista || lista.length === 0) return null;
    return documentoService.buscar(lista[0].id);
  },

  buscar: async (id: string): Promise<DocDetalhe> => {
    return request<DocDetalhe>(`/api/documentos/${id}/`);
  },

  criar: async (dados: {
    doc_ref?: string;
    titulo: string;
    conteudo?: string;
    processo_id?: string;
    status?: string;
  }): Promise<DocDetalhe> => {
    return request<DocDetalhe>('/api/documentos/', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  atualizar: async (
    id: string,
    dados: Partial<{ titulo: string; status: string; cabecalho: string; rodape: string }>
  ): Promise<DocDetalhe> => {
    return request<DocDetalhe>(`/api/documentos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  },

  salvarVersao: async (
    docId: string,
    dados: {
      conteudo: string;
      titulo: string;
      descricao?: string;
      status?: string;
      versao_esperada?: number;
    }
  ): Promise<{ versao: DocVersao; documento: DocDetalhe } | ConflictError> => {
    let token = getToken();
    const makeReq = (t: string | null) =>
      fetch(`${API_BASE}/api/documentos/${docId}/salvar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify(dados),
      });
    let res = await makeReq(token);
    if (res.status === 401) {
      token = await refreshAccessToken();
      res = await makeReq(token);
    }
    const data = await res.json();
    if (res.status === 409) return data as ConflictError;
    if (!res.ok) throw new Error(data.erro ?? data.detail ?? data.message ?? `Erro ${res.status}`);
    return data as { versao: DocVersao; documento: DocDetalhe };
  },

  listarVersoes: async (docId: string): Promise<DocVersao[]> => {
    return request<DocVersao[]>(`/api/documentos/${docId}/versoes/`);
  },

  buscarVersao: async (docId: string, numero: number): Promise<DocVersao> => {
    return request<DocVersao>(`/api/documentos/${docId}/versoes/${numero}/`);
  },

  listarColaboradores: async (docId: string): Promise<DocColaborador[]> => {
    return request<DocColaborador[]>(`/api/documentos/${docId}/colaboradores/`);
  },

  convidar: async (
    docId: string,
    usuarioId: number,
    papel: 'editor' | 'visualizador' = 'editor'
  ): Promise<DocColaborador> => {
    return request<DocColaborador>(`/api/documentos/${docId}/colaboradores/`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId, papel }),
    });
  },

  removerColaborador: async (docId: string, usuarioId: number): Promise<void> => {
    await request<void>(`/api/documentos/${docId}/colaboradores/${usuarioId}/`, {
      method: 'DELETE',
    });
  },

  listarComentarios: async (docId: string): Promise<DocComentario[]> => {
    return request<DocComentario[]>(`/api/documentos/${docId}/comentarios/`);
  },

  criarComentario: async (
    docId: string,
    texto: string,
    tipo: 'comentario' | 'sugestao',
    ancora?: { texto_selecionado: string; pos_inicio: number; pos_fim: number }
  ): Promise<DocComentario> => {
    return request<DocComentario>(`/api/documentos/${docId}/comentarios/`, {
      method: 'POST',
      body: JSON.stringify({ texto, tipo, ...ancora }),
    });
  },

  atualizarComentario: async (
    docId: string,
    comentarioId: string,
    status: 'aceito' | 'rejeitado' | 'pendente'
  ): Promise<DocComentario> => {
    return request<DocComentario>(`/api/documentos/${docId}/comentarios/${comentarioId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  listarAssinaturas: async (docId: string): Promise<DocAssinatura[]> => {
    return request<DocAssinatura[]>(`/api/documentos/${docId}/assinaturas/`);
  },

  iniciarAssinaturas: async (
    docId: string,
    signatarios: Array<{ usuario_id: number; ordem: number }>
  ): Promise<DocAssinatura[]> => {
    return request<DocAssinatura[]>(`/api/documentos/${docId}/assinaturas/iniciar/`, {
      method: 'POST',
      body: JSON.stringify({ signatarios }),
    });
  },

  gerarConvite: async (
    docId: string,
    papel: 'editor' | 'visualizador' = 'editor',
    dias = 7
  ): Promise<{ codigo: string; papel: string; expira_em: string; usos: number }> => {
    return request(`/api/documentos/${docId}/convite/`, {
      method: 'POST',
      body: JSON.stringify({ papel, dias }),
    });
  },

  revogarConvites: async (docId: string): Promise<void> => {
    await request<void>(`/api/documentos/${docId}/convite/`, { method: 'DELETE' });
  },

  infoConvite: async (
    codigo: string
  ): Promise<{
    documento_titulo: string;
    documento_id: string;
    criado_por: string;
    papel: string;
    expira_em: string;
    ja_membro: boolean;
  }> => {
    return request(`/api/documentos/convite/${codigo}/`);
  },

  aceitarConvite: async (
    codigo: string
  ): Promise<{ mensagem: string; documento_id: string; doc_ref: string; papel: string }> => {
    return request(`/api/documentos/convite/${codigo}/`, { method: 'POST' });
  },

  registrarAssinatura: async (
    docId: string,
    dados: {
      protocolo: string;
      hash_assinatura: string;
      nome_certificado: string;
      cpf_certificado?: string;
      ac_emissora?: string;
    }
  ): Promise<DocAssinatura> => {
    return request<DocAssinatura>(`/api/documentos/${docId}/assinaturas/`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },
};
