import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, Briefcase, Clock, FileText, ArrowUpRight } from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { User, REURBProcess, ProcessStatus } from '../../types/index';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  // 🔐 Permissões lidas do localStorage
  const permissoes = JSON.parse(localStorage.getItem('reurb_permissoes') || '{}');

  const podeCriar = permissoes?.acoes?.includes('editor');
  const isAdmin = permissoes?.roles?.includes('Admin');

  const [processes, setProcesses] = useState<REURBProcess[]>([]);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchProcesses = () => {
    setProcesses(dbService.processes.selectAll());
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const stats = [
    {
      label: 'Processos Ativos',
      value: processes.length.toString(),
      change: '+2',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Em Andamento',
      value: processes.filter(p => p.status === ProcessStatus.EM_ANDAMENTO).length.toString(),
      change: '0',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Concluídos',
      value: processes.filter(p => p.status === ProcessStatus.CONCLUIDO).length.toString(),
      change: '+1',
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">
            Bem-vindo, {user.name.split(' ')[0]}
          </h2>

          <p className="text-slate-500 mt-2 font-medium">
            Controle central de regularização fundiária municipal.
          </p>

          {isAdmin && (
            <p className="mt-2 text-xs font-black text-blue-600 uppercase tracking-widest">
              Acesso administrativo ativo
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notificacoesRef}>
            <button
              onClick={() => setShowNotificacoes(!showNotificacoes)}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 relative hover:shadow-md transition-all"
            >
              <Bell size={22} />
            </button>
          </div>

          {podeCriar && (
            <button
              onClick={() => navigate('/new-process')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
            >
              <Plus size={20} /> Novo Processo
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`${stat.bg} ${stat.color} p-4 rounded-[20px]`}>
                <stat.icon size={28} />
              </div>

              <span className="text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                {stat.change} Hoje
              </span>
            </div>

            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">
              {stat.label}
            </h3>

            <p className="text-4xl font-black text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-lg">Processos Recentes</h3>

          <Link
            to="/processes"
            className="text-blue-600 text-sm font-black hover:underline flex items-center gap-2"
          >
            Ver Todos <ArrowUpRight size={16} />
          </Link>
        </div>

        <ProcessTable processes={processes.slice(0, 5)} />
      </div>

      <NewProcessModal
        isOpen={false}
        onClose={() => {}}
        onSuccess={() => window.location.reload()}
        currentUser={user}
      />
    </div>
  );
};