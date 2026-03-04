
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Info } from 'lucide-react';
import { MOCK_MODELS } from '../../constants';

export const Templates: React.FC = () => {
  const navigate = useNavigate();

  const handleUseTemplate = (model: any) => {
    // Navega para o editor com o conteúdo do template
    const content = `<h1>${model.name.toUpperCase()}</h1><p>Este documento foi gerado a partir do modelo oficial versão ${model.version}.</p><p>Edite os campos abaixo conforme a Lei 13.465/2017...</p>`;
    navigate(`/edit/new?template=${encodeURIComponent(model.name)}&content=${encodeURIComponent(content)}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-6 lg:mb-10">
        <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Biblioteca de Modelos</h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">Documentos padronizados conforme a legislação federal de REURB.</p>
      </header>

      <div className="flex gap-3 mb-6 lg:mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou tipo..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm"
          />
        </div>
        <button className="px-4 sm:px-6 py-3.5 bg-slate-800 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all text-sm flex-shrink-0">
          <span className="hidden sm:inline">Filtrar</span>
          <Search size={16} className="sm:hidden" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {MOCK_MODELS.map((model) => (
          <div key={model.id} className="bg-white border border-slate-200 rounded-[28px] p-5 hover:shadow-xl hover:border-blue-200 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText size={60} />
            </div>

            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText size={22} />
            </div>

            <h3 className="text-base font-black text-slate-800 mb-2 leading-tight">{model.name}</h3>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                v{model.version}
              </span>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                {model.type}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="text-[10px] text-slate-400 font-medium">
                {model.lastUpdated}
              </div>
              <button
                onClick={() => handleUseTemplate(model)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
              >
                <Plus size={14} /> Usar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 lg:mt-12 p-5 sm:p-8 bg-indigo-50 rounded-[28px] border border-indigo-100 flex items-start sm:items-center gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
          <Info size={26} />
        </div>
        <div>
          <h4 className="font-black text-indigo-900 text-sm sm:text-base">Precisa de um modelo personalizado?</h4>
          <p className="text-xs sm:text-sm text-indigo-700/70 font-medium mt-0.5">Você pode solicitar ao setor jurídico a inclusão de novos templates padronizados para sua prefeitura.</p>
        </div>
      </div>
    </div>
  );
};
