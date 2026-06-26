import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Loader2,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { controleAdminService, PerfilAcessoApi } from '../../services/controleAdminService';

type NivelAcessoOption = {
  id: number;
  codigo: string;
  nome: string;
};

type PermissaoOption = {
  id: number;
  codigo: string;
  nome: string;
  modulo: string;
};

type StatusAcesso = 'pendente' | 'ativo' | 'bloqueado' | 'inativo';
type EscopoTipo = 'global' | 'municipio' | 'setor' | 'atribuido';

const STATUS_LABEL: Record<StatusAcesso, string> = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  bloqueado: 'Bloqueado',
  inativo: 'Inativo',
};

const STATUS_STYLE: Record<StatusAcesso, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bloqueado: 'bg-rose-50 text-rose-700 border-rose-200',
  inativo: 'bg-slate-50 text-slate-600 border-slate-200',
};

const ESCOPO_LABEL: Record<EscopoTipo, string> = {
  global: 'Global',
  municipio: 'Municipio',
  setor: 'Setor',
  atribuido: 'Somente atribuidos',
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return 'Nao definido';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Data invalida';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface ModalPerfilProps {
  perfil: PerfilAcessoApi;
  niveis: NivelAcessoOption[];
  permissoes: PermissaoOption[];
  onClose: () => void;
  onSaved: (perfilAtualizado: PerfilAcessoApi) => void;
}

const ModalPerfil: React.FC<ModalPerfilProps> = ({
  perfil,
  niveis,
  permissoes,
  onClose,
  onSaved,
}) => {
  const [nivelId, setNivelId] = useState<number | ''>(perfil.nivel_acesso?.id ?? '');
  const [statusAcesso, setStatusAcesso] = useState<StatusAcesso>(perfil.status_acesso);
  const [municipio, setMunicipio] = useState(perfil.municipio);
  const [setor, setSetor] = useState(perfil.setor);
  const [escopoTipo, setEscopoTipo] = useState<EscopoTipo>(perfil.escopo_tipo);
  const [observacoes, setObservacoes] = useState(perfil.observacoes);
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<Record<number, boolean>>(
    () => {
      const initial: Record<number, boolean> = {};
      for (const permissao of perfil.permissoes_extras) {
        initial[permissao.permissao.id] = permissao.permitido;
      }
      return initial;
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const groupedPermissoes = useMemo(() => {
    return permissoes.reduce<Record<string, PermissaoOption[]>>((acc, permissao) => {
      acc[permissao.modulo] = acc[permissao.modulo] || [];
      acc[permissao.modulo].push(permissao);
      return acc;
    }, {});
  }, [permissoes]);

  const togglePermissao = (permissaoId: number) => {
    setPermissoesSelecionadas((prev) => ({
      ...prev,
      [permissaoId]: !prev[permissaoId],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        nivel_acesso_id: nivelId === '' ? null : nivelId,
        status_acesso: statusAcesso,
        municipio,
        setor,
        escopo_tipo: escopoTipo,
        observacoes,
        permissoes_extras: Object.entries(permissoesSelecionadas).map(
          ([permissaoId, permitido]) => ({
            permissao_id: Number(permissaoId),
            permitido,
            origem: 'manual',
          })
        ),
      };
      const atualizado = await controleAdminService.updateUsuario(perfil.user.id, payload);
      onSaved(atualizado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar perfil de acesso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              Controle Admin
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-800">{perfil.user.nome}</h3>
            <p className="text-sm text-slate-400">{perfil.user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Nivel de acesso
              </label>
              <select
                value={nivelId}
                onChange={(e) => setNivelId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem nivel definido</option>
                {niveis.map((nivel) => (
                  <option key={nivel.id} value={nivel.id}>
                    {nivel.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Status do acesso
              </label>
              <select
                value={statusAcesso}
                onChange={(e) => setStatusAcesso(e.target.value as StatusAcesso)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Municipio
              </label>
              <input
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="Municipio de atuacao"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Setor
              </label>
              <input
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="Setor"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Escopo
              </label>
              <select
                value={escopoTipo}
                onChange={(e) => setEscopoTipo(e.target.value as EscopoTipo)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ESCOPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Observacoes
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-[96px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
              placeholder="Observacoes administrativas"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-600" />
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Permissoes extras
              </p>
            </div>
            <div className="space-y-4">
              {Object.entries(groupedPermissoes).map(([modulo, items]) => (
                <div
                  key={modulo}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    {modulo}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {items.map((permissao) => (
                      <button
                        key={permissao.id}
                        type="button"
                        onClick={() => togglePermissao(permissao.id)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                          permissoesSelecionadas[permissao.id]
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        <span className="text-xs font-bold">{permissao.nome}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                          {permissoesSelecionadas[permissao.id] ? 'Liberada' : 'Padrao'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Salvar acesso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ControleAdmin: React.FC = () => {
  const [usuarios, setUsuarios] = useState<PerfilAcessoApi[]>([]);
  const [niveis, setNiveis] = useState<NivelAcessoOption[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusAcesso>('todos');
  const [busca, setBusca] = useState('');
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilAcessoApi | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [usuariosData, niveisData, permissoesData] = await Promise.all([
        controleAdminService.listUsuarios(),
        controleAdminService.listNiveis(),
        controleAdminService.listPermissoes(),
      ]);
      setUsuarios(usuariosData);
      setNiveis(
        niveisData.map((nivel) => ({ id: nivel.id, codigo: nivel.codigo, nome: nivel.nome }))
      );
      setPermissoes(
        permissoesData.map((permissao) => ({
          id: permissao.id,
          codigo: permissao.codigo,
          nome: permissao.nome,
          modulo: permissao.modulo,
        }))
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Nao foi possivel carregar o controle administrativo.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return usuarios.filter((perfil) => {
      const correspondeStatus = filtroStatus === 'todos' || perfil.status_acesso === filtroStatus;
      const correspondeBusca =
        !term ||
        perfil.user.nome.toLowerCase().includes(term) ||
        perfil.user.email.toLowerCase().includes(term) ||
        (perfil.nivel_acesso?.nome || '').toLowerCase().includes(term);
      return correspondeStatus && correspondeBusca;
    });
  }, [usuarios, busca, filtroStatus]);

  const totais = useMemo(
    () => ({
      pendente: usuarios.filter((perfil) => perfil.status_acesso === 'pendente').length,
      ativo: usuarios.filter((perfil) => perfil.status_acesso === 'ativo').length,
      bloqueado: usuarios.filter((perfil) => perfil.status_acesso === 'bloqueado').length,
      inativo: usuarios.filter((perfil) => perfil.status_acesso === 'inativo').length,
    }),
    [usuarios]
  );

  return (
    <div className="mx-auto max-w-[1600px] animate-in fade-in p-6 duration-500 lg:p-10">
      {perfilSelecionado && (
        <ModalPerfil
          perfil={perfilSelecionado}
          niveis={niveis}
          permissoes={permissoes}
          onClose={() => setPerfilSelecionado(null)}
          onSaved={(perfilAtualizado) => {
            setUsuarios((prev) =>
              prev.map((item) => (item.id === perfilAtualizado.id ? perfilAtualizado : item))
            );
            setPerfilSelecionado(null);
          }}
        />
      )}

      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
            Controle Admin
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-800">
            Governanca de acessos
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Aprovacao de usuarios cadastrados, niveis de acesso, escopo e permissoes extras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['pendente', 'ativo', 'bloqueado', 'inativo', 'todos'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                filtroStatus === status
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600'
              }`}
            >
              {status === 'todos' ? 'Todos' : STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] border border-amber-100 bg-amber-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
            Pendentes
          </p>
          <p className="mt-3 text-3xl font-black text-amber-700">{totais.pendente}</p>
        </div>
        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
            Ativos
          </p>
          <p className="mt-3 text-3xl font-black text-emerald-700">{totais.ativo}</p>
        </div>
        <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
            Bloqueados
          </p>
          <p className="mt-3 text-3xl font-black text-rose-700">{totais.bloqueado}</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Inativos
          </p>
          <p className="mt-3 text-3xl font-black text-slate-700">{totais.inativo}</p>
        </div>
      </section>

      <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Usuarios cadastrados</p>
              <p className="text-xs text-slate-400">
                Todos os usuarios com perfil administrativo associado.
              </p>
            </div>
          </div>
          <div className="relative w-full lg:w-80">
            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, email ou nivel..."
              className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Carregando usuarios...
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 px-6 py-12 text-rose-600">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Nivel</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Escopo</th>
                  <th className="px-6 py-4">Cadastro</th>
                  <th className="px-6 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuariosFiltrados.map((perfil) => (
                  <tr key={perfil.id} className="transition-colors hover:bg-blue-50/20">
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-sm font-black text-slate-800">{perfil.user.nome}</p>
                        <p className="text-xs font-medium text-slate-400">{perfil.user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                        {perfil.nivel_acesso?.nome || 'Sem nivel'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${STATUS_STYLE[perfil.status_acesso]}`}
                      >
                        {STATUS_LABEL[perfil.status_acesso]}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-500">
                      {ESCOPO_LABEL[perfil.escopo_tipo]}
                      {(perfil.municipio || perfil.setor) && (
                        <p className="mt-1 text-xs text-slate-400">
                          {[perfil.municipio, perfil.setor].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-500">
                      {formatDateTime(perfil.user.date_joined)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => setPerfilSelecionado(perfil)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700"
                      >
                        {perfil.status_acesso === 'pendente' ? (
                          <UserCheck size={14} />
                        ) : (
                          <Shield size={14} />
                        )}
                        {perfil.status_acesso === 'pendente' ? 'Aprovar' : 'Editar acesso'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuariosFiltrados.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                  <CheckCircle2 size={30} />
                </div>
                <p className="text-base font-bold text-slate-700">Nenhum usuario encontrado</p>
                <p className="mt-2 text-sm text-slate-400">
                  Ajuste o filtro ou aguarde novos cadastros.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControleAdmin;
