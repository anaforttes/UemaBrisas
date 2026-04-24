import React, { useState, useEffect } from 'react';
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
  
  const [technicians, setTechnicians] = useState<any[]>([])
  const [legals, setLegals] = useState<any[]>([])

  const [selectedTechnician, setSelectedTechnician] = useState('')
  const [selectedLegal, setSelectedLegal] = useState('')

  useEffect(() => {
  async function fetchUsers() {
    try {
      const token = localStorage.getItem('reurb_access_token');

      const response = await fetch('http://127.0.0.1:8000/api/equipe/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      console.log('STATUS EQUIPE:', response.status);
      console.log('USUÁRIOS RECEBIDOS:', data);

      if (!response.ok) {
        setErro(data.detail || 'Erro ao buscar equipe.');
        setTechnicians([]);
        setLegals([]);
        return;
      }

      const lista = Array.isArray(data) ? data : data.results || [];

      setTechnicians(lista.filter((u: any) => u.role === 'technician'));
      setLegals(lista.filter((u: any) => u.role === 'legal'));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setErro('Erro ao buscar equipe.');
      setTechnicians([]);
      setLegals([]);
    }
  }

  if (isOpen) {
    fetchUsers();
  }
}, [isOpen]);

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
  
 if (!selectedTechnician || !selectedLegal) {
    setErro('Selecione técnico e jurídico.');
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
      municipio: form.municipio,
      estado: form.estado,
      responsible_name:
        form.responsible_name || currentUser?.name || 'Administrador',

      status: 'Em Andamento',
      progress: 0,

      technician_id: Number(selectedTechnician),
      legal_id: Number(selectedLegal),
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
  <>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Título
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Requerente
              </label>
              <input
                type="text"
                value={form.applicant}
                onChange={(e) => updateField('applicant', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Município
              </label>
              <input
                type="text"
                value={form.municipio}
                onChange={(e) => updateField('municipio', e.target.value)}
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              />
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

            {/* SELECTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Técnico *
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                >
                  <option value="">Selecione o técnico</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Jurídico *
                </label>
                <select
                  value={selectedLegal}
                  onChange={(e) => setSelectedLegal(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                >
                  <option value="">Selecione o jurídico</option>
                  {legals.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {erro && (
              <div className="text-red-500 text-sm font-medium">
                {erro}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Processo'}
              </button>
            </div>

          </form>

        </div>
      </div>
    )}
  </>
)};
