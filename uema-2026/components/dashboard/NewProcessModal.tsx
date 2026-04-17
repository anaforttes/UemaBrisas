import React, { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { criarProcesso } from '../../services/painelService';
import { User } from '../../types/index';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: User;
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

  const updateField = (
    field: keyof FormData,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validarFormulario = () => {
    if (!form.title.trim()) return 'O título do processo é obrigatório.';
    if (!form.applicant.trim()) return 'O requerente é obrigatório.';
    if (!form.modality.trim()) return 'A modalidade é obrigatória.';
    return '';
  };

  const limparFormulario = () => {
    setForm(initialForm);
    setErro('');
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
        area: form.area,
        responsible_name: form.responsible_name || currentUser?.name || 'Administrador',
        municipio: form.municipio,
        estado: form.estado,
        technician_id: Number(currentUser?.id) || 1,
        legal_id: Number(currentUser?.id) || 1,
      });

      limparFormulario();
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      setErro('Erro ao criar processo. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              Novo Processo
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Preencha os dados iniciais do processo REURB.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {erro && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Título do Processo *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ex: Núcleo Habitacional Esperança"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Requerente *
            </label>
            <input
              type="text"
              value={form.applicant}
              onChange={(e) => updateField('applicant', e.target.value)}
              placeholder="Ex: Associação Vila Verde"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Localização
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Ex: Coroadinho, São Luís - MA"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Modalidade *
              </label>
              <select
                value={form.modality}
                onChange={(e) =>
                  updateField('modality', e.target.value as 'REURB-S' | 'REURB-E')
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              >
                <option value="REURB-S">REURB-S</option>
                <option value="REURB-E">REURB-E</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Área
              </label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
                placeholder="Ex: 15400 m²"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Município
              </label>
              <input
                type="text"
                value={form.municipio}
                onChange={(e) => updateField('municipio', e.target.value)}
                placeholder="Ex: São Luís"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={form.estado}
                onChange={(e) => updateField('estado', e.target.value)}
                placeholder="MA"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Responsável Técnico
            </label>
            <input
              type="text"
              value={form.responsible_name}
              onChange={(e) => updateField('responsible_name', e.target.value)}
              placeholder={currentUser?.name || 'Administrador'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Criar Processo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};