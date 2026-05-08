const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

const hdrs = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('reurb_access_token') ?? ''}`,
});

let _refreshing: Promise<boolean> | null = null;

const tryRefresh = (): Promise<boolean> => {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refresh = localStorage.getItem('reurb_refresh_token');
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_URL}/api/autenticacao/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access) {
        localStorage.setItem('reurb_access_token', data.access);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
};

const apiFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  let res = await fetch(input, { ...init, headers: { ...hdrs(), ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(input, { ...init, headers: { ...hdrs(), ...(init?.headers ?? {}) } });
    }
  }
  return res;
};

const ok = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.erro ?? body?.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

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
  criado_em: string;
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

export const documentoService = {
  // ─── Documentos ────────────────────────────────────────────────────────────

  buscarPorRef: async (docRef: string): Promise<DocDetalhe | null> => {
    const lista = await ok(await apiFetch(`${API_URL}/api/documentos/?doc_ref=${encodeURIComponent(docRef)}`));
    if (!lista || lista.length === 0) return null;
    return documentoService.buscar(lista[0].id);
  },

  buscar: async (id: string): Promise<DocDetalhe> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${id}/`));
  },

  criar: async (dados: {
    doc_ref?: string;
    titulo: string;
    conteudo?: string;
    processo_id?: string;
    status?: string;
  }): Promise<DocDetalhe> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }));
  },

  atualizar: async (id: string, dados: Partial<{ titulo: string; status: string; cabecalho: string; rodape: string }>): Promise<DocDetalhe> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }));
  },

  // ─── Versões ───────────────────────────────────────────────────────────────

  salvarVersao: async (docId: string, dados: {
    conteudo: string;
    titulo: string;
    descricao?: string;
    status?: string;
  }): Promise<{ versao: DocVersao; documento: DocDetalhe }> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/salvar/`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }));
  },

  listarVersoes: async (docId: string): Promise<DocVersao[]> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/versoes/`));
  },

  buscarVersao: async (docId: string, numero: number): Promise<DocVersao> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/versoes/${numero}/`));
  },

  // ─── Colaboradores ─────────────────────────────────────────────────────────

  listarColaboradores: async (docId: string): Promise<DocColaborador[]> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/colaboradores/`));
  },

  convidar: async (docId: string, usuarioId: number, papel: 'editor' | 'visualizador' = 'editor'): Promise<DocColaborador> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/colaboradores/`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId, papel }),
    }));
  },

  removerColaborador: async (docId: string, usuarioId: number): Promise<void> => {
    await ok(await apiFetch(`${API_URL}/api/documentos/${docId}/colaboradores/${usuarioId}/`, {
      method: 'DELETE',
    }));
  },

  // ─── Comentários ───────────────────────────────────────────────────────────

  listarComentarios: async (docId: string): Promise<DocComentario[]> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/comentarios/`));
  },

  criarComentario: async (docId: string, texto: string, tipo: 'comentario' | 'sugestao'): Promise<DocComentario> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/comentarios/`, {
      method: 'POST',
      body: JSON.stringify({ texto, tipo }),
    }));
  },

  atualizarComentario: async (docId: string, comentarioId: string, status: 'aceito' | 'rejeitado' | 'pendente'): Promise<DocComentario> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/comentarios/${comentarioId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }));
  },

  // ─── Assinaturas ───────────────────────────────────────────────────────────

  listarAssinaturas: async (docId: string): Promise<DocAssinatura[]> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/assinaturas/`));
  },

  iniciarAssinaturas: async (docId: string, signatarios: Array<{ usuario_id: number; ordem: number }>): Promise<DocAssinatura[]> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/assinaturas/iniciar/`, {
      method: 'POST',
      body: JSON.stringify({ signatarios }),
    }));
  },

  // ─── Convites ──────────────────────────────────────────────────────────────

  gerarConvite: async (docId: string, papel: 'editor' | 'visualizador' = 'editor', dias = 7): Promise<{
    codigo: string; papel: string; expira_em: string; usos: number;
  }> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/convite/`, {
      method: 'POST',
      body: JSON.stringify({ papel, dias }),
    }));
  },

  revogarConvites: async (docId: string): Promise<void> => {
    await ok(await apiFetch(`${API_URL}/api/documentos/${docId}/convite/`, {
      method: 'DELETE',
    }));
  },

  infoConvite: async (codigo: string): Promise<{
    documento_titulo: string; documento_id: string; criado_por: string;
    papel: string; expira_em: string; ja_membro: boolean;
  }> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/convite/${codigo}/`));
  },

  aceitarConvite: async (codigo: string): Promise<{
    mensagem: string; documento_id: string; doc_ref: string; papel: string;
  }> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/convite/${codigo}/`, {
      method: 'POST',
    }));
  },

  registrarAssinatura: async (docId: string, dados: {
    protocolo: string;
    hash_assinatura: string;
    nome_certificado: string;
    cpf_certificado?: string;
    ac_emissora?: string;
  }): Promise<DocAssinatura> => {
    return ok(await apiFetch(`${API_URL}/api/documentos/${docId}/assinaturas/`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }));
  },
};
