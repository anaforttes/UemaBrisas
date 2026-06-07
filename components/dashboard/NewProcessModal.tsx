import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Plus,
  MapPin,
  User,
  FileText,
  Ruler,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { criarProcesso } from '../../services/painelService';
import { request } from '../../shared/services/apiClient';
import { User as UserType } from '../../types/index';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: UserType;
}

interface FormData {
  title: string;
  applicant: string;
  location: string;
  modality: 'REURB-S' | 'REURB-E';
  area: string;
  municipio: string;
  estado: string;
  responsible_name: string;
  technicianId: string;
}

interface UF {
  id: number;
  sigla: string;
  nome: string;
}

interface UsuarioSimples {
  id: string;
  name: string;
  role: string;
}

interface Municipio {
  id: number;
  nome: string;
}

const initialForm: FormData = {
  title: '',
  applicant: '',
  location: '',
  modality: 'REURB-S',
  area: '',
  municipio: '',
  estado: '',
  responsible_name: '',
  technicianId: '',
};

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300';

const selectClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const labelClass = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5';

const Field = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) => (
  <div>
    <label className={labelClass}>
      {Icon && <Icon size={10} className="inline mr-1 mb-0.5" />}
      {label}
    </label>
    {children}
  </div>
);

// Wrapper com ícone de chevron para selects
const SelectWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <ChevronDown
      size={14}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </div>
);

// Cache em memória para evitar múltiplas chamadas à API do IBGE
let _ufsCache: UF[] | null = null;
const _municipiosCache: Record<string, Municipio[]> = {};

// Cache de usuários
let _usuariosCache: UsuarioSimples[] | null = null;

export async function precarregarUsuarios(): Promise<void> {
  await buscarUsuarios();
}

async function buscarUsuarios(): Promise<UsuarioSimples[]> {
  if (_usuariosCache) return _usuariosCache;
  const data = await request<any[]>('/api/autenticacao/usuarios/');
  _usuariosCache = data
    .filter((u: any) => u.is_active !== false)
    .map((u: any) => ({ id: String(u.id), name: u.name, role: u.role || '' }))
    .sort((a: UsuarioSimples, b: UsuarioSimples) => a.name.localeCompare(b.name, 'pt-BR'));
  return _usuariosCache!;
}

async function buscarUFs(): Promise<UF[]> {
  if (_ufsCache) return _ufsCache;
  const res = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
  );
  if (!res.ok) throw new Error('Erro ao buscar estados');
  _ufsCache = await res.json();
  return _ufsCache!;
}

async function buscarMunicipios(ufSigla: string): Promise<Municipio[]> {
  if (_municipiosCache[ufSigla]) return _municipiosCache[ufSigla];
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufSigla}/municipios?orderBy=nome`
  );
  if (!res.ok) throw new Error('Erro ao buscar municípios');
  const data = await res.json();
  _municipiosCache[ufSigla] = data;
  return data;
}

export const NewProcessModal: React.FC<NewProcessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // IBGE
  const [ufs, setUfs] = useState<UF[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingUfs, setLoadingUfs] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [erroIbge, setErroIbge] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioSimples[]>(() => _usuariosCache ?? []);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Busca UFs ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    setLoadingUfs(true);
    setErroIbge('');
    buscarUFs()
      .then(setUfs)
      .catch(() => setErroIbge('Não foi possível carregar os estados. Verifique sua conexão.'))
      .finally(() => setLoadingUfs(false));

    if (!_usuariosCache) {
      setLoadingUsers(true);
      buscarUsuarios()
        .then(setUsuarios)
        .catch((err) => {
          console.error('[NewProcessModal] Erro ao buscar usuários:', err);
        })
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen]);

  // Busca municípios quando o estado muda
  useEffect(() => {
    if (!form.estado) {
      setMunicipios([]);
      return;
    }
    setLoadingMunis(true);
    setErroIbge('');
    buscarMunicipios(form.estado)
      .then(setMunicipios)
      .catch(() => setErroIbge('Não foi possível carregar os municípios.'))
      .finally(() => setLoadingMunis(false));
  }, [form.estado]);

  if (!isOpen) return null;

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleEstadoChange = (sigla: string) => {
    setForm((prev) => ({ ...prev, estado: sigla, municipio: '' }));
  };

  const validarFormulario = () => {
    if (!form.title.trim()) return 'O título do processo é obrigatório.';
    if (!form.applicant.trim()) return 'O requerente é obrigatório.';
    return '';
  };

  const limparFormulario = () => {
    setForm(initialForm);
    setErro('');
    setMunicipios([]);
  };

  const handleClose = () => {
    if (loading) return;
    limparFormulario();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    setLoading(true);
    try {
      await criarProcesso({
        title: form.title,
        applicant: form.applicant,
        location: form.location || `${form.municipio} - ${form.estado}`.trim(),
        modality: form.modality,
        area: form.area ? `${form.area} m²` : '',
        responsible_name: (() => {
          if (form.technicianId) {
            const u = usuarios.find((u) => u.id === form.technicianId);
            return u ? u.name : form.responsible_name || currentUser?.name || 'Administrador';
          }
          return form.responsible_name || currentUser?.name || 'Administrador';
        })(),
        municipio: form.municipio,
        estado: form.estado,
        technician_id: form.technicianId
          ? Number(form.technicianId)
          : Number(currentUser?.id) || null,
        legal_id: null,
      });
      limparFormulario();
      onSuccess();
      onClose();
    } catch (error: any) {
      setErro(error?.message ?? 'Erro ao criar processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 leading-tight">Novo Processo</h2>
              <p className="text-xs text-slate-400 font-medium">
                Preencha os dados iniciais do processo REURB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          id="novo-processo-form"
          onSubmit={handleSubmit}
          className="px-7 py-5 space-y-4 overflow-y-auto"
        >
          {erro && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {erro}
            </div>
          )}

          {erroIbge && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              ⚠ {erroIbge}
            </div>
          )}

          {/* Título */}
          <Field label="Título do Processo *" icon={FileText}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ex: Núcleo Habitacional Esperança"
              className={inputClass}
            />
          </Field>

          {/* Requerente */}
          <Field label="Requerente *" icon={User}>
            <input
              type="text"
              value={form.applicant}
              onChange={(e) => updateField('applicant', e.target.value)}
              placeholder="Ex: Associação Vila Verde"
              className={inputClass}
            />
          </Field>

          {/* Localização */}
          <Field label="Localização" icon={MapPin}>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Ex: Coroadinho, São Luís - MA"
              className={inputClass}
            />
          </Field>

          {/* Modalidade + Área */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modalidade *">
              <SelectWrapper>
                <select
                  value={form.modality}
                  onChange={(e) => updateField('modality', e.target.value as 'REURB-S' | 'REURB-E')}
                  className={selectClass}
                >
                  <option value="REURB-S">REURB-S</option>
                  <option value="REURB-E">REURB-E</option>
                </select>
              </SelectWrapper>
            </Field>

            <Field label="Área (m²)" icon={Ruler}>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  placeholder="Ex: 15400"
                  className={`${inputClass} pr-10`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  m²
                </span>
              </div>
            </Field>
          </div>

          {/* Estado + Município — via API IBGE */}
          <div className="grid grid-cols-3 gap-3">
            {/* Estado */}
            <Field label={loadingUfs ? 'Carregando...' : 'Estado'}>
              <SelectWrapper>
                <select
                  value={form.estado}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                  disabled={loadingUfs || ufs.length === 0}
                  className={selectClass}
                >
                  <option value="">{loadingUfs ? 'Aguarde...' : 'UF'}</option>
                  {ufs.map((uf) => (
                    <option key={uf.id} value={uf.sigla}>
                      {uf.sigla}
                    </option>
                  ))}
                </select>
              </SelectWrapper>
            </Field>

            {/* Município */}
            <div className="col-span-2">
              <Field
                label={
                  loadingMunis
                    ? 'Carregando municípios...'
                    : !form.estado
                      ? 'Município (selecione o estado)'
                      : 'Município'
                }
                icon={Building2}
              >
                <SelectWrapper>
                  <select
                    value={form.municipio}
                    onChange={(e) => updateField('municipio', e.target.value)}
                    disabled={!form.estado || loadingMunis || municipios.length === 0}
                    className={selectClass}
                  >
                    <option value="">
                      {loadingMunis
                        ? 'Carregando...'
                        : !form.estado
                          ? 'Selecione o estado'
                          : 'Selecione o município'}
                    </option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.nome}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </Field>
            </div>
          </div>

          {/* Responsável Técnico */}
          <Field
            label={loadingUsers ? 'Carregando usuários...' : 'Responsável Técnico'}
            icon={User}
          >
            {usuarios.length > 0 ? (
              <SelectWrapper>
                <select
                  value={form.technicianId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const user = usuarios.find((u) => u.id === uid);
                    setForm((prev) => ({
                      ...prev,
                      technicianId: uid,
                      responsible_name: user ? user.name : '',
                    }));
                  }}
                  disabled={loadingUsers}
                  className={selectClass}
                >
                  <option value="">— Selecione o responsável —</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.role ? ` (${u.role})` : ''}
                    </option>
                  ))}
                </select>
              </SelectWrapper>
            ) : (
              <input
                type="text"
                value={form.responsible_name}
                onChange={(e) => updateField('responsible_name', e.target.value)}
                placeholder={loadingUsers ? 'Carregando...' : currentUser?.name || 'Administrador'}
                disabled={loadingUsers}
                className={inputClass}
              />
            )}
          </Field>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <p className="text-xs text-slate-400">* Campos obrigatórios</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="novo-processo-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2 shadow-sm shadow-blue-200"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Plus size={15} /> Criar Processo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
