import { useEffect, useState } from 'react';
import { User, FlagsAcesso } from '../types/index';
import { request, getToken } from '../shared/services/apiClient';

interface Permissoes {
  // Navegação
  verPainel: boolean;
  verProcessos: boolean;
  verModelos: boolean;
  verRelatorios: boolean;
  verEquipe: boolean;
  verSettings: boolean;

  // Ações em processos
  criarProcesso: boolean;
  protocolarProcesso: boolean;
  verMenuAcoes: boolean;
  baixarZip: boolean;

  // Ações em documentos
  editarDocumento: boolean;
  assinarDocumento: boolean;
  exportarDocumento: boolean;
  finalizarDocumento: boolean;

  // Ações em equipe
  gerenciarPermissoes: boolean;
  convidarMembro: boolean;
  removerMembro: boolean;
}

interface RetornoPermissoes {
  pode: Permissoes;
  isExterno: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isProfissional: boolean;
  user: User | null;
  flags: FlagsAcesso;
}

const FLAGS_PADRAO: FlagsAcesso = {
  superusuario: false,
  adminMunicipio: false,
  profissionalInterno: false,
  usuarioExterno: false,
};

function lerUsuarioLocalStorage(): User | null {
  try {
    const raw = localStorage.getItem('reurb_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function computarPermissoes(flags: FlagsAcesso): Permissoes {
  const isExterno = flags.usuarioExterno ?? false;
  const isAdmin = flags.adminMunicipio ?? false;
  const isSuperAdmin = flags.superusuario ?? false;
  const isProfissional = flags.profissionalInterno ?? false;

  return {
    verPainel: true,
    verProcessos: true,
    verModelos: true,
    verRelatorios: !isExterno,
    verEquipe: !isExterno,
    verSettings: !isExterno,

    criarProcesso: !isExterno,
    protocolarProcesso: !isExterno,
    verMenuAcoes: !isExterno,
    baixarZip: !isExterno,

    editarDocumento: !isExterno,
    assinarDocumento: !isExterno && (isProfissional || isAdmin || isSuperAdmin),
    exportarDocumento: !isExterno,
    finalizarDocumento: !isExterno,

    gerenciarPermissoes: isAdmin || isSuperAdmin,
    convidarMembro: isAdmin || isSuperAdmin,
    removerMembro: isAdmin || isSuperAdmin,
  };
}

export const usePermissoes = (): RetornoPermissoes => {
  const [user, setUser] = useState<User | null>(lerUsuarioLocalStorage);

  useEffect(() => {
    if (!getToken()) return;

    request<{ roles: string[]; flags: string[]; acoes: string[] }>('/api/permissoes/')
      .then((data) => {
        const flags: FlagsAcesso = {
          superusuario: data.flags.includes('superusuario'),
          adminMunicipio: data.flags.includes('admin_municipio'),
          profissionalInterno: data.flags.includes('profissional_interno'),
          usuarioExterno: data.flags.includes('usuario_externo'),
        };
        setUser((prev) => (prev ? { ...prev, flags } : null));
      })
      .catch(() => {
        // mantém os valores do localStorage em caso de erro de rede
      });
  }, []);

  const flags: FlagsAcesso = user?.flags ?? FLAGS_PADRAO;

  const isExterno = flags.usuarioExterno ?? false;
  const isAdmin = flags.adminMunicipio ?? false;
  const isSuperAdmin = flags.superusuario ?? false;
  const isProfissional = flags.profissionalInterno ?? false;

  const pode = computarPermissoes(flags);

  return { pode, isExterno, isAdmin, isSuperAdmin, isProfissional, user, flags };
};
