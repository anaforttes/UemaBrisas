import { User } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type PermissaoApi = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  modulo: string;
  ativo: boolean;
};

type NivelAcessoApi = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  permissoes_padrao: Array<{ id: number; permissao: PermissaoApi }>;
};

type UsuarioResumoApi = {
  id: number;
  email: string;
  is_active: boolean;
  date_joined: string;
  nome: string;
};

type PermissaoExtraApi = {
  id: number;
  permitido: boolean;
  origem: string;
  permissao: PermissaoApi;
};

export type PerfilAcessoApi = {
  id: number;
  user: UsuarioResumoApi;
  nivel_acesso: NivelAcessoApi | null;
  status_acesso: 'pendente' | 'ativo' | 'bloqueado' | 'inativo';
  municipio: string;
  setor: string;
  escopo_tipo: 'global' | 'municipio' | 'setor' | 'atribuido';
  observacoes: string;
  aprovado_em: string | null;
  permissoes_extras: PermissaoExtraApi[];
  criado_em: string;
  atualizado_em: string;
};

type AtualizarPerfilPayload = {
  nivel_acesso_id?: number | null;
  status_acesso?: 'pendente' | 'ativo' | 'bloqueado' | 'inativo';
  municipio?: string;
  setor?: string;
  escopo_tipo?: 'global' | 'municipio' | 'setor' | 'atribuido';
  observacoes?: string;
  permissoes_extras?: Array<{
    permissao_id: number;
    permitido: boolean;
    origem?: string;
  }>;
};

const ROLE_BY_LEVEL: Record<string, User['role']> = {
  superadmin: 'Admin',
  admin_municipio: 'Admin',
  gestor: 'Gestor',
  operador: 'Técnico',
  auditor: 'Auditor',
  externo: 'Atendente',
};

const extractErrorMessage = async (response: Response) => {
  const text = await response.text();
  if (!text) return 'Falha na requisicao.';
  try {
    const data = JSON.parse(text);
    return data.detail || data.error || JSON.stringify(data);
  } catch {
    return text;
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('reurb_access_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const collectPermissionCodes = (perfil: PerfilAcessoApi) => {
  const codes = new Set<string>();
  for (const item of perfil.nivel_acesso?.permissoes_padrao ?? []) {
    if (item.permissao?.codigo) codes.add(item.permissao.codigo);
  }
  for (const extra of perfil.permissoes_extras ?? []) {
    if (!extra.permissao?.codigo) continue;
    if (extra.permitido) {
      codes.add(extra.permissao.codigo);
    } else {
      codes.delete(extra.permissao.codigo);
    }
  }
  return codes;
};

export const mergeUserWithPerfil = (baseUser: User, perfil: PerfilAcessoApi): User => {
  const levelCode = perfil.nivel_acesso?.codigo || '';
  const permissionCodes = collectPermissionCodes(perfil);

  return {
    ...baseUser,
    id: String(perfil.user.id),
    name: perfil.user.nome || baseUser.name,
    email: perfil.user.email || baseUser.email,
    role: ROLE_BY_LEVEL[levelCode] || baseUser.role,
    flags: {
      superusuario: levelCode === 'superadmin',
      adminMunicipio: levelCode === 'admin_municipio',
      profissionalInterno: [
        'superadmin',
        'admin_municipio',
        'gestor',
        'operador',
        'auditor',
      ].includes(levelCode),
      usuarioExterno: levelCode === 'externo',
    },
    permissions: {
      visualizar:
        permissionCodes.has('processos.visualizar') || permissionCodes.has('documentos.visualizar'),
      editor: permissionCodes.has('documentos.editar'),
      comentar: permissionCodes.has('documentos.comentar'),
      aprovar: permissionCodes.has('processos.aprovar'),
      assinar: permissionCodes.has('documentos.assinar'),
      exportar: permissionCodes.has('documentos.exportar'),
    },
  };
};

export const controleAdminService = {
  async getMeuPerfil(): Promise<PerfilAcessoApi> {
    const response = await fetch(`${API_URL}/api/controleadmin/me/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json();
  },

  async enrichUser(baseUser: User): Promise<User> {
    try {
      const perfil = await this.getMeuPerfil();
      return mergeUserWithPerfil(baseUser, perfil);
    } catch {
      return baseUser;
    }
  },

  async listUsuarios(status?: string): Promise<PerfilAcessoApi[]> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await fetch(`${API_URL}/api/controleadmin/usuarios/${suffix}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json();
  },

  async listNiveis(): Promise<NivelAcessoApi[]> {
    const response = await fetch(`${API_URL}/api/controleadmin/niveis-acesso/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json();
  },

  async listPermissoes(): Promise<PermissaoApi[]> {
    const response = await fetch(`${API_URL}/api/controleadmin/permissoes/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json();
  },

  async updateUsuario(userId: number, payload: AtualizarPerfilPayload): Promise<PerfilAcessoApi> {
    const response = await fetch(`${API_URL}/api/controleadmin/usuarios/${userId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json();
  },
};
