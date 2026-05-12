import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Briefcase, Clock, FileText, ArrowUpRight } from 'lucide-react';
import { buscarDashboard } from '../../services/painelService';
import { MOCK_MODELS } from '../../constants/index';
import { User } from '../../types/index';
import { ProcessTable } from './ProcessTable';

// Cache de módulo — evita spinner em toda navegação para o painel (TTL: 30s)
let _dashboardCache: any = null;
let _cacheAt = 0;
const CACHE_TTL = 30_000;

function isCacheValid() {
  return _dashboardCache !== null && Date.now() - _cacheAt < CACHE_TTL;
}

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [dadosPainel, setDadosPainel]          = useState<any>(isCacheValid() ? _dashboardCache : null);
  const [loading, setLoading]                  = useState(!isCacheValid());
  const [erro, setErro]                        = useState('');
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const notificacoesRef                        = useRef<HTMLDivElement>(null);
  const navigate                               = useNavigate();

  const carregarDashboard = async (silencioso = false) => {
    if (!silencioso) {
      setErro('');
      if (!isCacheValid()) setLoading(true);
    }
    try {
      const dados = await buscarDashboard();
      _dashboardCache = dados;
      _cacheAt = Date.now();
      setDadosPainel(dados);
      setErro('');
    } catch (e: any) {
      if (!_dashboardCache) {
        setErro(e?.message || 'Erro ao carregar painel. Verifique se o backend está rodando.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDashboard();

    const handleFocus = () => carregarDashboard(true);
    window.addEventListener('focus', handleFocus);

    const handleAlteracao = () => {
      _dashboardCache = null;
      carregarDashboard();
    };
    window.addEventListener('reurb:processos-alterados', handleAlteracao);

    const handler = (e: MouseEvent) => {
      if (notificacoesRef.current && !notificacoesRef.current.contains(e.target as Node)) {
        setShowNotificacoes(false);
      }
    };
    document.addEventListener('mousedown', handler);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('reurb:processos-alterados', handleAlteracao);
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  const stats = [
    { label: 'Processos Ativos', value: String(dadosPainel?.cards?.ativos    ?? 0), change: '+2', icon: Briefcase, color: 'text-blue-600',  bg: 'bg-blue-50'  },
    { label: 'Em Revisão',       value: String(dadosPainel?.cards?.em_revisao ?? 0), change: '0',  icon: Clock,     color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Concluídos',       value: String(dadosPainel?.cards?.concluidos  ?? 0), change: '+1', icon: FileText,  color: 'text-green-600', bg: 'bg-green-50' },
  ];

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{erro}</p>
          <button onClick={() => carregarDashboard()} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

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
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notificacoesRef}>
            <button
              type="button"
              onClick={() => setShowNotificacoes(!showNotificacoes)}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 relative hover:shadow-md transition-all"
            >
              <Bell size={22} />
              <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-[3px] border-white" />
            </button>

            {showNotificacoes && (
              <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 z-50">
                <h3 className="font-black text-slate-800 mb-2">Notificações</h3>
                <p className="text-sm text-slate-400">Nenhuma notificação no momento.</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`${stat.bg} ${stat.color} p-4 rounded-[20px] transition-transform group-hover:rotate-3`}>
                <stat.icon size={28} />
              </div>
              <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {stat.change} Hoje
              </span>
            </div>
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <h3 className="font-black text-slate-800 text-lg">Processos Recentes</h3>
            <Link to="/processes" className="text-blue-600 text-sm font-black hover:underline flex items-center gap-2">
              Ver Todos <ArrowUpRight size={16} />
            </Link>
          </div>
          <ProcessTable processes={dadosPainel?.recentes || []} />
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
            <h3 className="font-black text-lg">Modelos Oficiais</h3>
          </div>
          <div className="p-6 space-y-4">
            {MOCK_MODELS.slice(0, 4).map((model) => (
              <div
                key={model.id}
                className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-white transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-all">{model.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Versão {model.version}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/templates')}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200"
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
