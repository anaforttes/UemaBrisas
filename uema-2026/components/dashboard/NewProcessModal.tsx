
import React, { useState } from 'react';
import { X, User, MapPin, Layers, Ruler, ArrowRight, Search, Loader2, AlertCircle } from 'lucide-react';
import { dbService } from '../../services/databaseService';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: any;
}

export const NewProcessModal: React.FC<NewProcessModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cep, setCep] = useState('');
  const [form, setForm] = useState({
    applicant: '',
    location: '',
    modality: 'REURB-S' as 'REURB-S' | 'REURB-E',
    area: ''
  });

  if (!isOpen) return null;

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCep(value);

    if (value.length === 8) {
      setSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await response.json();

        if (!data.erro) {
          const address = `${data.logradouro}${data.logradouro ? ', ' : ''}${data.bairro} - ${data.localidade}/${data.uf}`;
          setForm(prev => ({ ...prev, location: address }));
        } else {
          // Opcional: Feedback de CEP não encontrado
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setSearchingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');

    try {
      await dbService.processes.insert({
        title: form.applicant,
        applicant: form.applicant,
        location: form.location,
        modality: form.modality,
        area: form.area ? `${form.area} m²` : 'Não informada',
        responsibleName: currentUser.name || 'Admin',
        technicianId: currentUser.id,
        legalId: currentUser.id
      } as any);

      onSuccess();
      onClose();
      setForm({ applicant: '', location: '', modality: 'REURB-S', area: '' });
      setCep('');
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Erro ao criar processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[95dvh] overflow-y-auto">
        <div className="p-5 sm:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Novo Processo REURB</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Abertura de Protocolo Digital</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
              <User size={11} /> Requerente
            </label>
            <input
              required
              type="text"
              value={form.applicant}
              onChange={(e) => setForm({ ...form, applicant: e.target.value })}
              placeholder="Nome do cidadão ou associação"
              className="w-full px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                <Search size={11} /> CEP
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  value={cep}
                  onChange={handleCepChange}
                  placeholder="00000000"
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-black transition-all"
                />
                {searchingCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={15} className="text-blue-600 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                <MapPin size={11} /> Localização
              </label>
              <input
                required
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Logradouro, Bairro - Cidade/UF"
                className="w-full px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                <Layers size={11} /> Modalidade
              </label>
              <div className="relative">
                <select
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value as any })}
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-black transition-all appearance-none"
                >
                  <option value="REURB-S">REURB-S (Social)</option>
                  <option value="REURB-E">REURB-E (Específica)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ArrowRight size={13} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                <Ruler size={11} /> Área (m²)
              </label>
              <input
                type="number"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Ex: 250"
                className="w-full px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0" /> {submitError}
            </div>
          )}

          <div className="pt-2 pb-safe">
            <button
              type="submit"
              disabled={loading || searchingCep}
              className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-[22px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Gerar Protocolo <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
