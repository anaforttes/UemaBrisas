
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, Briefcase, Clock, FileText, ArrowUpRight } from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { MOCK_MODELS } from '../../constants';
import { User, REURBProcess, ProcessStatus } from '../../types';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [processes, setProcesses] = useState<REURBProcess[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchProcesses = async () => {
    const data = await dbService.processes.selectAll();
    setProcesses(data);
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const stats = [
    { label: 'Processos Ativos', value: processes.length.toString(), change: '+2', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Em Revisão', value: processes.filter(p => p.status === ProcessStatus.EM_ANALISE).length.toString(), change: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Concluídos', value: processes.filter(p => p.status === ProcessStatus.CONCLUIDO).length.toString(), change: '+1', icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">
            Bem-vindo, {user.name.split(' ')[0]}
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Controle central de regularização fundiária municipal.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 relative hover:shadow-md transition-all">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Processo</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8 mb-8 lg:mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 lg:p-8 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start mb-4 lg:mb-6">
              <div className={`${stat.bg} ${stat.color} p-3 lg:p-4 rounded-[18px] transition-transform group-hover:rotate-3`}>
                <stat.icon size={24} />
              </div>
              <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {stat.change} Hoje
              </span>
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</h3>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
        <div className="xl:col-span-2 bg-white rounded-[28px] border border-slate-100 shadow-sm flex flex-col overflow-hidden min-w-0">
          <div className="p-5 lg:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <h3 className="font-black text-slate-800 text-base lg:text-lg">Processos Recentes</h3>
            <Link to="/processes" className="text-blue-600 text-sm font-black hover:underline flex items-center gap-1">
              Ver Todos <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <ProcessTable processes={processes.slice(0, 5)} />
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="p-5 lg:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
            <h3 className="font-black text-base lg:text-lg">Modelos Oficiais</h3>
          </div>
          <div className="p-4 lg:p-6 space-y-3">
            {MOCK_MODELS.slice(0, 4).map((model) => {
              const handleClick = () => {
                const content = `<h1>${model.name.toUpperCase()}</h1><p>Este documento foi gerado a partir do modelo oficial versão ${model.version}.</p><p>Edite os campos abaixo conforme a Lei 13.465/2017...</p>`;
                navigate(`/edit/new?template=${encodeURIComponent(model.name)}&content=${encodeURIComponent(content)}`);
              };
              return (
                <div key={model.id} onClick={handleClick} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-white transition-all group flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-all flex-shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-all truncate">{model.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">v{model.version}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleClick(); }} className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 flex-shrink-0">
                    <Plus size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <NewProcessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProcesses}
        currentUser={user}
      />
    </div>
  );
};
