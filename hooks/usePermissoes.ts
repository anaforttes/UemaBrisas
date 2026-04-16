// ─── Hook de Permissões ───────────────────────────────────────────────────────
// Arquivo central de controle de acesso.
// Importe em qualquer componente com: import { usePermissoes } from '../../hooks/usePermissoes';
// Use com: const { pode, isExterno, isAdmin } = usePermissoes();

import { User, FlagsAcesso } from '../types/index';

interface Permissoes {
  // Navegação
  verPainel:      boolean;
  verProcessos:   boolean;
  verModelos:     boolean;
  verRelatorios:  boolean;
  verEquipe:      boolean;
  verSettings:    boolean;

  // Ações em processos
  criarProcesso:  boolean;
  protocolarProcesso: boolean;
  verMenuAcoes:   boolean;
  baixarZip:      boolean;

  // Ações em documentos
  editarDocumento: boolean;
  assinarDocumento: boolean;
  exportarDocumento: boolean;
  finalizarDocumento: boolean;

  // Ações em equipe
  gerenciarPermissoes: boolean;
  convidarMembro:      boolean;
  removerMembro:       boolean;
}

interface RetornoPermissoes {
  pode:           Permissoes;
  isExterno:      boolean;
  isAdmin:        boolean;
  isSuperAdmin:   boolean;
  isProfissional: boolean;
  user:           User | null;
  flags:          FlagsAcesso;
}

const FLAGS_PADRAO: FlagsAcesso = {
  superusuario:        false,
  adminMunicipio:      false,
  profissionalInterno: false,
  usuarioExterno:      false,
};

export const usePermissoes = (): RetornoPermissoes => {
  // Lê o usuário atual do localStorage
  const user: User | null = (() => {
    try {
      const raw = localStorage.getItem('reurb_current_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const flags: FlagsAcesso = user?.flags ?? FLAGS_PADRAO;

  const isExterno      = flags.usuarioExterno      ?? false;
  const isAdmin        = flags.adminMunicipio       ?? false;
  const isSuperAdmin   = flags.superusuario         ?? false;
  const isProfissional = flags.profissionalInterno  ?? false;

  // Permissões derivadas das flags
  const pode: Permissoes = {
    // Navegação — externo só vê painel, processos e modelos
    verPainel:      true,
    verProcessos:   true,
    verModelos:     true,
    verRelatorios:  !isExterno,
    verEquipe:      !isExterno,
    verSettings:    !isExterno,

    // Processos — externo só visualiza
    criarProcesso:      !isExterno,
    protocolarProcesso: !isExterno,
    verMenuAcoes:       !isExterno,
    baixarZip:          !isExterno,

    // Documentos — externo só lê
    editarDocumento:    !isExterno,
    assinarDocumento:   !isExterno && (isProfissional || isAdmin || isSuperAdmin),
    exportarDocumento:  !isExterno,
    finalizarDocumento: !isExterno,

    // Equipe — só admin gerencia
    gerenciarPermissoes: isAdmin || isSuperAdmin,
    convidarMembro:      isAdmin || isSuperAdmin,
    removerMembro:       isAdmin || isSuperAdmin,
  };

  return { pode, isExterno, isAdmin, isSuperAdmin, isProfissional, user, flags };
};