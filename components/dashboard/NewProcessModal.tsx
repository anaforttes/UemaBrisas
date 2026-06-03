import React, { useState, useRef } from 'react';
import {
  X,
  Loader2,
  Plus,
  MapPin,
  User,
  FileText,
  Ruler,
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Hash,
  Home,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { criarProcesso } from '../../services/painelService';
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
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  estado: string;
  modality: 'REURB-S' | 'REURB-E';
  area: string;
  responsible_name: string;
}

type CepStatus = 'idle' | 'loading' | 'found' | 'error';

const initialForm: FormData = {
  title: '',
  applicant: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  estado: '',
  modality: 'REURB-S',
  area: '',
  responsible_name: '',
};

function formatCep(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/* ── sub-components ─────────────────────────────────────── */

const SectionHeader = ({ step, label }: { step: number; label: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-black text-white">{step}</span>
    </div>
    <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
    {children}
  </label>
);

const inputBase =
  'w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none transition-all placeholder:text-slate-300';

const inputNormal = `${inputBase} border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50`;

const inputLocked = `${inputBase} border-emerald-200 bg-emerald-50/50 text-slate-500 cursor-not-allowed`;

const inputBlocked = `${inputBase} border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed select-none`;

/* ── main component ─────────────────────────────────────── */

export const NewProcessModal: React.FC<NewProcessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const cepFetchRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* CEP -------------------------------------------------- */
  const buscarCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    if (cepFetchRef.current) cepFetchRef.current.abort();
    const ctrl = new AbortController();
    cepFetchRef.current = ctrl;
    setCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: ctrl.signal });
      const data = await res.json();
      if (data.erro) {
        setCepStatus('error');
        return;
      }
      setForm((prev) => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        municipio: data.localidade || '',
        estado: data.uf || '',
      }));
      setCepStatus('found');
    } catch (e: any) {
      if (e.name !== 'AbortError') setCepStatus('error');
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fmt = formatCep(e.target.value);
    const digits = fmt.replace(/\D/g, '');
    setForm((prev) => ({
      ...prev,
      cep: fmt,
      logradouro: digits.length < 8 ? '' : prev.logradouro,
      bairro: digits.length < 8 ? '' : prev.bairro,
      municipio: digits.length < 8 ? '' : prev.municipio,
      estado: digits.length < 8 ? '' : prev.estado,
    }));
    if (digits.length < 8) setCepStatus('idle');
    if (digits.length === 8) buscarCep(fmt);
  };

  /* Form ------------------------------------------------- */
  const limpar = () => {
    setForm(initialForm);
    setErro('');
    setCepStatus('idle');
  };
  const handleClose = () => {
    if (loading) return;
    limpar();
    onClose();
  };

  const buildLocation = () =>
    [
      form.logradouro,
      form.numero && `nº ${form.numero}`,
      form.complemento,
      form.bairro,
      form.municipio && form.estado
        ? `${form.municipio} - ${form.estado}`
        : form.municipio || form.estado,
      form.cep && `CEP ${form.cep}`,
    ]
      .filter(Boolean)
      .join(', ');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.title.trim()) {
      setErro('O título do processo é obrigatório.');
      return;
    }
    if (!form.applicant.trim()) {
      setErro('O requerente é obrigatório.');
      return;
    }
    setLoading(true);
    try {
      await criarProcesso({
        title: form.title,
        applicant: form.applicant,
        location: buildLocation(),
        modality: form.modality,
        area: form.area ? `${form.area} m²` : '',
        responsible_name: form.responsible_name || currentUser?.name || 'Administrador',
        municipio: form.municipio,
        estado: form.estado,
        technician_id: Number(currentUser?.id) || null,
        legal_id: null,
      });
      limpar();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err?.message ?? 'Erro ao criar processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const locked = cepStatus === 'found';
  const blocked = cepStatus === 'idle' || cepStatus === 'loading';

  const addrClass = (extra?: string) =>
    `${locked ? inputLocked : blocked ? inputBlocked : inputNormal} ${extra ?? ''}`;

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* ── Header ── */}
        <div className="relative flex items-center gap-4 px-7 pt-6 pb-5 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 leading-tight">
              Novo Processo REURB
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Preencha as informações abaixo para registrar
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-5 top-5 p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── divider ── */}
        <div className="h-px bg-slate-100 mx-7 shrink-0" />

        {/* ── Form ── */}
        <form
          id="novo-processo-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-7 py-5 space-y-6 scrollbar-thin"
        >
          {/* erro */}
          {erro && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <AlertCircle size={15} className="shrink-0" /> {erro}
            </div>
          )}

          {/* ── 1. Identificação ── */}
          <div>
            <SectionHeader step={1} label="Identificação" />
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>
                    <FileText size={9} className="inline mr-1 mb-0.5" />
                    Título do Processo *
                  </FieldLabel>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {form.title.length}/120
                  </span>
                </div>
                <input
                  type="text"
                  value={form.title}
                  maxLength={120}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Ex: Núcleo Habitacional Esperança"
                  className={inputNormal}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>
                    <User size={9} className="inline mr-1 mb-0.5" />
                    Requerente *
                  </FieldLabel>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {form.applicant.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  value={form.applicant}
                  maxLength={100}
                  onChange={(e) => update('applicant', e.target.value)}
                  placeholder="Ex: Associação Vila Verde"
                  className={inputNormal}
                />
              </div>
            </div>
          </div>

          {/* ── 2. Endereço ── */}
          <div>
            <SectionHeader step={2} label="Endereço" />
            <div className="space-y-3">
              {/* CEP */}
              <div>
                <FieldLabel>
                  <Search size={9} className="inline mr-1 mb-0.5" />
                  CEP
                </FieldLabel>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className={`${inputNormal} pr-11`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {cepStatus === 'loading' && (
                      <Loader2 size={15} className="animate-spin text-blue-400" />
                    )}
                    {cepStatus === 'found' && (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    )}
                    {cepStatus === 'error' && <AlertCircle size={15} className="text-red-400" />}
                  </span>
                </div>

                {/* status do CEP */}
                {cepStatus === 'found' && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-700">
                      {form.municipio} – {form.estado} &nbsp;·&nbsp; Endereço preenchido
                      automaticamente
                    </span>
                  </div>
                )}
                {cepStatus === 'error' && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-amber-700">
                      CEP não encontrado — preencha o endereço manualmente
                    </span>
                  </div>
                )}
                {blocked && (
                  <p className="mt-1.5 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <ChevronRight size={11} /> Digite o CEP para liberar os campos de endereço
                  </p>
                )}
              </div>

              {/* Logradouro */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>
                    <MapPin size={9} className="inline mr-1 mb-0.5" />
                    Logradouro
                    {locked && <Lock size={8} className="inline ml-1 mb-0.5 text-emerald-400" />}
                  </FieldLabel>
                  {!locked && !blocked && (
                    <span className="text-[10px] text-slate-300 font-medium">
                      {form.logradouro.length}/100
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.logradouro}
                  maxLength={100}
                  onChange={(e) => update('logradouro', e.target.value)}
                  placeholder={blocked ? 'Aguardando CEP...' : 'Ex: Rua Dagmar Desterro'}
                  disabled={locked || blocked}
                  className={addrClass()}
                />
              </div>

              {/* Número + Complemento */}
              <div className="grid grid-cols-5 gap-2.5">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <FieldLabel>
                      <Hash size={9} className="inline mr-1 mb-0.5" />
                      Número
                    </FieldLabel>
                    {!blocked && (
                      <span className="text-[10px] text-slate-300 font-medium">
                        {form.numero.length}/10
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.numero}
                    maxLength={10}
                    onChange={(e) =>
                      update('numero', e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())
                    }
                    placeholder={blocked ? '—' : 'Ex: 70B'}
                    disabled={blocked}
                    className={blocked ? inputBlocked : inputNormal}
                  />
                </div>
                <div className="col-span-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <FieldLabel>
                      <Home size={9} className="inline mr-1 mb-0.5" />
                      Complemento
                    </FieldLabel>
                    {!blocked && (
                      <span className="text-[10px] text-slate-300 font-medium">
                        {form.complemento.length}/50
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.complemento}
                    maxLength={50}
                    onChange={(e) => update('complemento', e.target.value)}
                    placeholder={blocked ? '—' : 'Apto, Bloco, Casa...'}
                    disabled={blocked}
                    className={blocked ? inputBlocked : inputNormal}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>
                    <MapPin size={9} className="inline mr-1 mb-0.5" />
                    Bairro
                    {locked && <Lock size={8} className="inline ml-1 mb-0.5 text-emerald-400" />}
                  </FieldLabel>
                  {!locked && !blocked && (
                    <span className="text-[10px] text-slate-300 font-medium">
                      {form.bairro.length}/72
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.bairro}
                  maxLength={72}
                  onChange={(e) => update('bairro', e.target.value)}
                  placeholder={blocked ? 'Aguardando CEP...' : 'Ex: Fátima'}
                  disabled={locked || blocked}
                  className={addrClass()}
                />
              </div>

              {/* Município + Estado */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <FieldLabel>
                      <Building2 size={9} className="inline mr-1 mb-0.5" />
                      Município
                      {locked && <Lock size={8} className="inline ml-1 mb-0.5 text-emerald-400" />}
                    </FieldLabel>
                  </div>
                  <input
                    type="text"
                    value={form.municipio}
                    maxLength={72}
                    onChange={(e) =>
                      update('municipio', e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''))
                    }
                    placeholder={blocked ? 'Aguardando CEP...' : 'Ex: São Luís'}
                    disabled={locked || blocked}
                    className={addrClass()}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <FieldLabel>
                      Estado
                      {locked && <Lock size={8} className="inline ml-1 mb-0.5 text-emerald-400" />}
                    </FieldLabel>
                  </div>
                  <input
                    type="text"
                    value={form.estado}
                    maxLength={2}
                    onChange={(e) =>
                      update(
                        'estado',
                        e.target.value
                          .replace(/[^a-zA-Z]/g, '')
                          .toUpperCase()
                          .slice(0, 2)
                      )
                    }
                    placeholder="UF"
                    disabled={locked || blocked}
                    className={`${addrClass()} text-center font-bold tracking-widest uppercase`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Dados do Processo ── */}
          <div>
            <SectionHeader step={3} label="Dados do Processo" />
            <div className="space-y-3">
              {/* Modalidade + Área */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <FieldLabel>Modalidade *</FieldLabel>
                  <select
                    value={form.modality}
                    onChange={(e) => update('modality', e.target.value as 'REURB-S' | 'REURB-E')}
                    className={inputNormal}
                  >
                    <option value="REURB-S">REURB-S — Social</option>
                    <option value="REURB-E">REURB-E — Específica</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>
                    <Ruler size={9} className="inline mr-1 mb-0.5" />
                    Área (m²)
                  </FieldLabel>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.area}
                      onChange={(e) => update('area', e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="Ex: 15.400"
                      className={`${inputNormal} pr-9`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                      m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsável Técnico */}
              <div>
                <FieldLabel>
                  <User size={9} className="inline mr-1 mb-0.5" />
                  Responsável Técnico
                </FieldLabel>
                <input
                  type="text"
                  value={form.responsible_name}
                  maxLength={100}
                  onChange={(e) => update('responsible_name', e.target.value)}
                  placeholder={currentUser?.name || 'Administrador'}
                  className={inputNormal}
                />
              </div>
            </div>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="shrink-0 px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">* Campos obrigatórios</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="novo-processo-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-200"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Plus size={14} /> Criar Processo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
