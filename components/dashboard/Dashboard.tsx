import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Clock,
  FileText,
  ArrowUpRight,
  CheckCheck,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { buscarDashboard } from '../../services/painelService';
import { dbService } from '../../services/databaseService';
import {
  listarNotificacoes,
  marcarLida,
  marcarTodasLidas,
  type Notificacao,
} from '../../services/notificacoesService';
import { MOCK_MODELS } from '../../constants/index';
import { User } from '../../types/index';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';

// Cache de módulo — evita spinner em toda navegação para o painel (TTL: 30s)
let _dashboardCache: any = null;
let _cacheAt = 0;
const CACHE_TTL = 30_000;

function isCacheValid() {
  return _dashboardCache !== null && Date.now() - _cacheAt < CACHE_TTL;
}

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [dadosPainel, setDadosPainel] = useState<any>(isCacheValid() ? _dashboardCache : null);
  const [loading, setLoading] = useState(!isCacheValid());
  const [erro, setErro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const notificacoesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const carregarNotificacoes = useCallback(async () => {
    try {
      const dados = await listarNotificacoes();
      setNotificacoes(dados.resultados);
      setNaoLidas(dados.nao_lidas);
    } catch {
      // falha silenciosa — não bloqueia o painel
    }
  }, []);

  const handleMarcarLida = async (id: number) => {
    await marcarLida(id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    setNaoLidas((c) => Math.max(0, c - 1));
  };

  const handleMarcarTodas = async () => {
    await marcarTodasLidas();
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
  };

  const carregarDashboard = async (silencioso = false) => {
    if (!silencioso) {
      setErro('');
      if (!isCacheValid()) setLoading(true);
    }
    try {
      const dados = await buscarDashboard(statusFiltro || undefined);
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

  const prevFiltroRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevFiltroRef.current !== undefined && prevFiltroRef.current !== statusFiltro) {
      _dashboardCache = null;
    }
    prevFiltroRef.current = statusFiltro;
    carregarDashboard();
  }, [statusFiltro]);

  useEffect(() => {
    carregarNotificacoes();

    const interval = setInterval(carregarNotificacoes, 60_000);

    const handleFocus = () => {
      carregarDashboard(true);
      carregarNotificacoes();
    };
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
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('reurb:processos-alterados', handleAlteracao);
      document.removeEventListener('mousedown', handler);
    };
  }, [carregarNotificacoes]);

  const processosBase = dbService.processes.selectAll();
  const documentosBase = processosBase.flatMap((p) => dbService.documents.findByProcessId(p.id));
  const protocolos = processosBase.map((p) => p.protocol).filter(Boolean);
  const protocolosDuplicados = protocolos.filter((p, i) => protocolos.indexOf(p) !== i);
  const documentosComCpfPendente = documentosBase.filter(
    (d) => /cpf|cnpj/i.test(d.content || d.title || '') && /_{3,}|__\./.test(d.content || '')
  );
  const datasInconsistentes = processosBase.filter((p) => {
    if (!p.createdAt || !p.updatedAt) return true;
    return new Date(p.createdAt).getTime() > new Date(p.updatedAt).getTime();
  });
  const processosSemReferencia = processosBase.filter(
    (p) => !p.protocol || !p.title || !p.applicant || !p.modality || !p.status
  );
  const modelosComCpfCnpj = MOCK_MODELS.filter((m) =>
    /portaria|notifica|relat|demarca|título|titulo/i.test(m.name)
  ).length;

  const alertasInconsistencia = [
    {
      label: 'CPF/CNPJ',
      value: documentosComCpfPendente.length,
      detail:
        documentosComCpfPendente.length > 0
          ? 'documentos com identificação pendente'
          : `${modelosComCpfCnpj} modelos monitorados`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Datas',
      value: datasInconsistentes.length,
      detail:
        datasInconsistentes.length > 0
          ? 'processos com datas inconsistentes'
          : 'cronologia dos processos conferida',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Numeração',
      value: protocolosDuplicados.length,
      detail:
        protocolosDuplicados.length > 0
          ? 'protocolos duplicados encontrados'
          : `${protocolos.length} protocolos únicos`,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Referências',
      value: processosSemReferencia.length,
      detail:
        processosSemReferencia.length > 0
          ? 'processos com campos essenciais ausentes'
          : 'processos com referências básicas preenchidas',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  const stats = [
    {
      label: 'Processos Ativos',
      value: String(dadosPainel?.cards?.ativos ?? 0),
      change: '+2',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      filter: 'ativo',
    },
    {
      label: 'Em Revisão',
      value: String(dadosPainel?.cards?.em_revisao ?? 0),
      change: '0',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      filter: 'em_revisao',
    },
    {
      label: 'Concluídos',
      value: String(dadosPainel?.cards?.concluidos ?? 0),
      change: '+1',
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-50',
      filter: 'concluido',
    },
    {
      label: 'Em Edição',
      value: String(dadosPainel?.status?.em_edicao ?? 0),
      change: '0',
      icon: FileText,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      filter: 'em_edicao',
    },
    {
      label: 'Pendentes',
      value: String(dadosPainel?.status?.pendente ?? 0),
      change: '0',
      icon: Clock,
      color: 'text-red-600',
      bg: 'bg-red-50',
      filter: 'pendente',
    },
    {
      label: 'Assinados',
      value: String(dadosPainel?.status?.assinado ?? 0),
      change: '0',
      icon: Briefcase,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      filter: 'assinado',
    },
    {
      label: 'Arquivados',
      value: String(dadosPainel?.status?.arquivado ?? 0),
      change: '0',
      icon: FileText,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      filter: 'arquivado',
    },
  ];

  if (loading) {
    return (
      <div className="p-10 max-w-7xl mx-auto">
        <div className="mb-12 flex justify-between items-end">
          <div className="space-y-3">
            <div className="h-10 w-56 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-4 w-80 bg-slate-100 rounded-lg animate-pulse" />
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-[20px] animate-pulse" />
                <div className="w-20 h-7 bg-slate-100 rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse mb-3" />
              <div className="h-10 w-16 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-[32px] border border-slate-100 p-8">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-6 py-4 border-b border-slate-50 last:border-0">
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{erro}</p>
          <button
            onClick={() => carregarDashboard()}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
          >
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
              onClick={() => {
                setShowNotificacoes(!showNotificacoes);
                if (!showNotificacoes) carregarNotificacoes();
              }}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 relative hover:shadow-md transition-all"
            >
              <Bell size={22} />
              {naoLidas > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-black text-white border-2 border-white flex items-center justify-center">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </button>

            {showNotificacoes && (
              <div className="absolute right-0 top-14 w-96 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-800">Notificações</h3>
                  {naoLidas > 0 && (
                    <button
                      onClick={handleMarcarTodas}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <CheckCheck size={14} /> Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notificacoes.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Bell size={28} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Nenhuma notificação.</p>
                    </div>
                  ) : (
                    notificacoes.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 ${!n.lida ? 'bg-blue-50/40' : ''}`}
                        onClick={() => {
                          if (!n.lida) handleMarcarLida(n.id);
                          if (n.link) {
                            navigate(n.link);
                            setShowNotificacoes(false);
                          }
                        }}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.lida ? 'bg-blue-500' : 'bg-transparent'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${!n.lida ? 'text-slate-800' : 'text-slate-500'}`}
                          >
                            {n.titulo}
                          </p>
                          {n.descricao && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                              {n.descricao}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-300 mt-1">
                            {new Date(n.criado_em).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat, i) => (
          <div
            key={i}
            onClick={() => setStatusFiltro(stat.filter)}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <div
                className={`${stat.bg} ${stat.color} p-4 rounded-[20px] transition-transform group-hover:rotate-3`}
              >
                <stat.icon size={28} />
              </div>
              <span
                className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
              >
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

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 mb-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Alertas de Inconsistência</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              CPF/CNPJ, datas, numeração e referências dos processos.
            </p>
          </div>
          <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {alertasInconsistencia.map((alerta) => (
            <div
              key={alerta.label}
              className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div
                  className={`${alerta.bg} ${alerta.color} w-10 h-10 rounded-xl flex items-center justify-center`}
                >
                  <AlertTriangle size={18} />
                </div>
                <span className="text-3xl font-black text-slate-800">{alerta.value}</span>
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {alerta.label}
              </h4>
              <p className="text-xs font-bold text-slate-600 mt-1 leading-relaxed">
                {alerta.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <div>
              <h3 className="font-black text-slate-800 text-lg">Processos Recentes</h3>
              {statusFiltro && (
                <button
                  type="button"
                  onClick={() => setStatusFiltro('')}
                  className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline mt-1"
                >
                  Limpar Filtro
                </button>
              )}
            </div>
            <Link
              to="/processes"
              className="text-blue-600 text-sm font-black hover:underline flex items-center gap-2"
            >
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
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-all">
                      {model.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Versão {model.version}
                    </p>
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

      <NewProcessModal
        isOpen={showNewProcessModal}
        onClose={() => setShowNewProcessModal(false)}
        onSuccess={() => {
          _dashboardCache = null;
          carregarDashboard();
        }}
        currentUser={user}
      />
    </div>
  );
};
