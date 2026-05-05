import React, { useState } from 'react';
import { X, Loader2, Plus, MapPin, User, FileText, Ruler, Building2 } from 'lucide-react';
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
  location: string;
  modality: 'REURB-S' | 'REURB-E';
  area: string;
  municipio: string;
  estado: string;
  responsible_name: string;
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
};

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300';

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

export const NewProcessModal: React.FC<NewProcessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const updateField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validarFormulario = () => {
    if (!form.title.trim()) return 'O título do processo é obrigatório.';
    if (!form.applicant.trim()) return 'O requerente é obrigatório.';
    return '';
  };

  const limparFormulario = () => { setForm(initialForm); setErro(''); };

  const handleClose = () => { if (loading) return; limparFormulario(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const erroValidacao = validarFormulario();
    if (erroValidacao) { setErro(erroValidacao); return; }
    setLoading(true);
    try {
      await criarProcesso({
        title: form.title,
        applicant: form.applicant,
        location: form.location || `${form.municipio} - ${form.estado}`.trim(),
        modality: form.modality,
        area: form.area ? `${form.area} m²` : '',
        responsible_name: form.responsible_name || currentUser?.name || 'Administrador',
        municipio: form.municipio,
        estado: form.estado,
        technician_id: Number(currentUser?.id) || null,
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
              <p className="text-xs text-slate-400 font-medium">Preencha os dados iniciais do processo REURB</p>
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
        <form id="novo-processo-form" onSubmit={handleSubmit} className="px-7 py-5 space-y-4 overflow-y-auto">

          {erro && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {erro}
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
              <select
                value={form.modality}
                onChange={(e) => updateField('modality', e.target.value as 'REURB-S' | 'REURB-E')}
                className={inputClass}
              >
                <option value="REURB-S">REURB-S</option>
                <option value="REURB-E">REURB-E</option>
              </select>
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

          {/* Município + Estado */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Município" icon={Building2}>
                <input
                  type="text"
                  value={form.municipio}
                  onChange={(e) => updateField('municipio', e.target.value)}
                  placeholder="Ex: São Luís"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Estado">
              <input
                type="text"
                value={form.estado}
                onChange={(e) => updateField('estado', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="MA"
                maxLength={2}
                className={`${inputClass} text-center uppercase font-bold tracking-widest`}
              />
            </Field>
          </div>

          {/* Responsável Técnico */}
          <Field label="Responsável Técnico" icon={User}>
            <input
              type="text"
              value={form.responsible_name}
              onChange={(e) => updateField('responsible_name', e.target.value)}
              placeholder={currentUser?.name || 'Administrador'}
              className={inputClass}
            />
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
                <><Loader2 size={15} className="animate-spin" /> Salvando...</>
              ) : (
                <><Plus size={15} /> Criar Processo</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
