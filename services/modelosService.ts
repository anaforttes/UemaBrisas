export interface ModeloAPI {
  id: string;
  nome: string;
  tipo: string;
  versao: string;
  descricao: string;
  conteudo: string;
  campos: unknown[];
  criado_por: { id: number; name: string; email: string; role: string };
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

function headers() {
  const token = localStorage.getItem('reurb_access_token') || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const modelosService = {
  async listar(): Promise<ModeloAPI[]> {
    const res = await fetch(BASE, { headers: await headers() });
    if (!res.ok) throw new Error('Erro ao listar modelos');
    return res.json();
  },

  async criar(payload: ModeloCreatePayload): Promise<ModeloAPI> {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erro ao criar modelo');
    return res.json();
  },

  async atualizar(id: string, payload: Partial<ModeloCreatePayload>): Promise<ModeloAPI> {
    const res = await fetch(`${BASE}${id}/`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Erro ao atualizar modelo');
    return res.json();
  },

  async excluir(id: string): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error('Erro ao excluir modelo');
  },
};
