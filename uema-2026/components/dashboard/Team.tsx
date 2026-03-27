import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { dbService as rawDbService } from '../../services/databaseService';

export type UserRole =
  | 'Admin'
  | 'Gestor'
  | 'Jurídico'
  | 'Técnico'
  | 'Auditor'
  | 'Atendente';

export type UserStatus = 'Online' | 'Offline';

export interface UserFlags {
  superusuario?: boolean;
  adminMunicipio?: boolean;
  profissionalInterno?: boolean;
  usuarioExterno?: boolean;
}

export interface UserQuota {
  used: number;
  limit: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status?: UserStatus;
  lastLogin?: string;
  quota?: UserQuota;
  flags?: UserFlags;
  permissions?: Record<string, boolean>;
}

type UsersService = {
  users: {
    selectAll: () => User[];
  };
};

const dbService = rawDbService as unknown as UsersService;

interface DeleteModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const avatarFallback =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="%23e2e8f0"/><circle cx="48" cy="36" r="16" fill="%2394a3b8"/><path d="M20 80c4-14 17-22 28-22s24 8 28 22" fill="%2394a3b8"/></svg>';

const safePercent = (used?: number, limit?: number) => {
  if (!limit || limit <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((Number(used || 0) / Number(limit)) * 100)));
};

const normalizeRole = (role?: string): UserRole => {
  switch (role) {
    case 'Admin':
      return 'Admin';
    case 'Gestor':
      return 'Gestor';
    case 'Jurídico':
    case 'Juridico':
      return 'Jurídico';
    case 'Técnico':
    case 'Tecnico':
      return 'Técnico';
    case 'Auditor':
      return 'Auditor';
    case 'Atendente':
      return 'Atendente';
    default:
      return 'Atendente';
  }
};

const DeleteModal: React.FC<DeleteModalProps> = ({ name, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Remover colaborador</h3>
          <p className="mt-1 text-sm text-slate-500">
            Tem certeza que deseja remover{' '}
            <span className="font-semibold text-slate-700">&quot;{name}&quot;</span> da equipe? Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface InlineEditProps {
  value: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

const InlineEdit: React.FC<InlineEditProps> = ({ value, onSave, onCancel }) => {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave(text.trim() || value);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-44 rounded-lg border border-blue-400 px-2 py-0.5 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <button
        onClick={() => onSave(text.trim() || value)}
        className="p-1 text-green-600 transition-colors hover:text-green-700"
        title="Salvar (Enter)"
      >
        <Check size={15} />
      </button>
      <button
        onClick={onCancel}
        className="p-1 text-slate-400 transition-colors hover:text-slate-600"
        title="Cancelar (Esc)"
      >
        <X size={15} />
      </button>
    </div>
  );
};

interface PermissoesModalProps {
  member: User;
  onSave: (updated: User) => void;
  onCancel: () => void;
}

const CARGOS: UserRole[] = ['Admin', 'Gestor', 'Jurídico', 'Técnico', 'Auditor', 'Atendente'];

const PERMISSOES = [
  { key: 'visualizar', label: 'Visualizar' },
  { key: 'editor', label: 'Editor' },
  { key: 'comentar', label: 'Comentar' },
  { key: 'aprovar', label: 'Aprovar' },
  { key: 'assinar', label: 'Assinar' },
  { key: 'exportar', label: 'Exportar' },
] as const;

const PermissoesModal: React.FC<PermissoesModalProps> = ({ member, onSave, onCancel }) => {
  const [cargo, setCargo] = useState<UserRole>(member.role);

  const [flags, setFlags] = useState<UserFlags>({
    superusuario: member.flags?.superusuario ?? false,
    adminMunicipio: member.flags?.adminMunicipio ?? false,
    profissionalInterno: member.flags?.profissionalInterno ?? true,
    usuarioExterno: member.flags?.usuarioExterno ?? false,
  });

  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({
    visualizar: member.permissions?.visualizar ?? true,
    editor: member.permissions?.editor ?? (member.flags?.profissionalInterno ?? true),
    comentar: member.permissions?.comentar ?? (member.flags?.profissionalInterno ?? true),
    aprovar: member.permissions?.aprovar ?? (member.flags?.adminMunicipio ?? false),
    assinar: member.permissions?.assinar ?? (member.flags?.adminMunicipio ?? false),
    exportar: member.permissions?.exportar ?? (member.flags?.profissionalInterno ?? true),
  });

  const toggleFlag = (key: keyof UserFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePermissao = (key: string) => {
    setPermissoes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave({
      ...member,
      role: cargo,
      flags: {
        superusuario: flags.superusuario ?? false,
        adminMunicipio: flags.adminMunicipio ?? false,
        profissionalInterno: flags.profissionalInterno ?? false,
        usuarioExterno: flags.usuarioExterno ?? false,
      },
      permissions: permissoes,
    });
  };

  const flagItems: Array<{ key: keyof UserFlags; label: string; desc: string }> = [
    { key: 'superusuario', label: 'Superusuário', desc: 'Gerencia todos os municípios' },
    { key: 'adminMunicipio', label: 'Admin do Município', desc: 'Gerencia configurações locais' },
    { key: 'profissionalInterno', label: 'Profissional Interno', desc: 'Acessa processos e gera documentos' },
    { key: 'usuarioExterno', label: 'Usuário Externo', desc: 'Visualiza apenas seus processos' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-4 border-b border-slate-100 p-6 pb-4">
          <img
            src={member.avatar || avatarFallback}
            alt={member.name}
            className="h-12 w-12 shrink-0 rounded-2xl border-2 border-white object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-800">{member.name}</p>
            <p className="truncate text-xs font-medium text-slate-400">{member.email}</p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo / Perfil</p>
            <div className="grid grid-cols-3 gap-2">
              {CARGOS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCargo(c)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    cargo === c
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Flags de acesso ao sistema</p>
            <div className="space-y-2">
              {flagItems.map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => toggleFlag(key)}
                    className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-all duration-300 ${
                      flags[key] ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${
                        flags[key] ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Permissões por ação</p>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSOES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => togglePermissao(key)}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                    permissoes[key]
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold">{label}</span>
                  {permissoes[key] ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700"
          >
            Salvar permissões
          </button>
        </div>
      </div>
    </div>
  );
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'Juridico':
    case 'Jurídico':
      return 'bg-purple-50 text-purple-600 border-purple-100';
    case 'Tecnico':
    case 'Técnico':
      return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'Gestor':
      return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'Admin':
      return 'bg-red-50 text-red-600 border-red-100';
    case 'Auditor':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'Atendente':
      return 'bg-green-50 text-green-600 border-green-100';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

const formatLastSeen = (dateString?: string) => {
  if (!dateString) {
    return 'Nunca acessou';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Data inválida';
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFlagsBadges = (member: User) => {
  const badges: Array<{ label: string; cor: string }> = [];

  if (member.flags?.superusuario) {
    badges.push({ label: 'Superusuário', cor: 'bg-purple-50 text-purple-700 border-purple-100' });
  }
  if (member.flags?.adminMunicipio) {
    badges.push({ label: 'Admin', cor: 'bg-amber-50 text-amber-700 border-amber-100' });
  }
  if (member.flags?.profissionalInterno) {
    badges.push({ label: 'Profissional', cor: 'bg-blue-50 text-blue-700 border-blue-100' });
  }
  if (member.flags?.usuarioExterno) {
    badges.push({ label: 'Externo', cor: 'bg-slate-50 text-slate-500 border-slate-200' });
  }

  return badges;
};

export const Team: React.FC = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [permissoesTarget, setPermissoesTarget] = useState<User | null>(null);

  const fetchMembers = async () => {
    try {
      const data = dbService.users.selectAll();
      const normalized: User[] = Array.isArray(data)
        ? data.map((member): User => ({
            ...member,
            role: normalizeRole(member.role),
            avatar: member.avatar || avatarFallback,
            status: member.status === 'Online' ? 'Online' : 'Offline',
            quota: {
              used: member.quota?.used ?? 0,
              limit: member.quota?.limit ?? 0,
            },
          }))
        : [];

      setMembers(normalized);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      setMembers([]);
    }
  };

  useEffect(() => {
    void fetchMembers();
    const interval = window.setInterval(() => {
      void fetchMembers();
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return true;
    }
    return m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term);
  });

  const handleSaveName = (id: string, newName: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name: newName } : m)));
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleSavePermissoes = (updated: User) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setPermissoesTarget(null);
  };

  return (
    <div className="mx-auto max-w-[1600px] animate-in fade-in p-6 duration-500 lg:p-10">
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {permissoesTarget && (
        <PermissoesModal
          member={permissoesTarget}
          onSave={handleSavePermissoes}
          onCancel={() => setPermissoesTarget(null)}
        />
      )}

      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Equipe Técnica</h2>
          <p className="text-sm font-medium text-slate-500">Controle de acessos e permissões dos colaboradores.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700">
            <Plus size={18} /> <span className="hidden sm:inline">Convidar</span>
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                <th className="px-8 py-5">Membro / Operador</th>
                <th className="px-6 py-5">Cargo</th>
                <th className="px-6 py-5">Flags de Acesso</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Último Acesso</th>
                <th className="px-6 py-5">Uso de IA</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member) => {
                const quotaPercent = safePercent(member.quota?.used, member.quota?.limit);
                const flagBadges = getFlagsBadges(member);

                return (
                  <tr key={member.id} className="group transition-all hover:bg-blue-50/20">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={member.avatar || avatarFallback}
                            alt={member.name}
                            className="h-11 w-11 rounded-2xl border-2 border-white object-cover shadow-sm"
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                              member.status === 'Online' ? 'bg-green-500' : 'bg-slate-300'
                            }`}
                          >
                            {member.status === 'Online' && <CheckCircle2 size={8} className="text-white" />}
                          </div>
                        </div>
                        <div>
                          {editingId === member.id ? (
                            <InlineEdit
                              value={member.name}
                              onSave={(name) => handleSaveName(member.id, name)}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <p className="mb-1 text-sm font-black leading-none text-slate-800">{member.name}</p>
                          )}
                          <p className="text-xs font-medium text-slate-400">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getRoleBadge(member.role)}`}>
                        {member.role}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {flagBadges.length > 0 ? (
                          flagBadges.map((b, i) => (
                            <span key={`${member.id}-${b.label}-${i}`} className={`rounded-md border px-2 py-0.5 text-[9px] font-black ${b.cor}`}>
                              {b.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-medium text-slate-300">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${member.status === 'Online' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className={`text-xs font-bold ${member.status === 'Online' ? 'text-green-600' : 'text-slate-400'}`}>
                          {member.status || 'Offline'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} />
                        <span className="text-xs font-medium">{formatLastSeen(member.lastLogin)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="w-24">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-400">Consumo</span>
                          <span className={`text-[10px] font-bold ${quotaPercent > 80 ? 'text-red-500' : 'text-blue-600'}`}>
                            {quotaPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all duration-700 ${quotaPercent > 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          title="Gerenciar permissões"
                          onClick={() => setPermissoesTarget(member)}
                          className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          title="Editar nome"
                          onClick={() => setEditingId(member.id)}
                          className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          title="Remover colaborador"
                          onClick={() => setDeleteTarget({ id: member.id, name: member.name })}
                          className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="group-hover:hidden">
                        <MoreVertical size={18} className="ml-auto text-slate-300" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-200">
              <Search size={32} />
            </div>
            <h3 className="font-bold text-slate-800">Nenhum membro encontrado</h3>
            <p className="text-sm text-slate-400">Tente uma busca diferente ou adicione um novo operador.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-6">
          <p className="text-xs font-medium text-slate-400">Exibindo {filteredMembers.length} de {members.length} colaboradores cadastrados.</p>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50" disabled>
              Anterior
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50" disabled>
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;
