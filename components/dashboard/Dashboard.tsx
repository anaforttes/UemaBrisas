import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Clock,
  FileText,
  ArrowUpRight,
  CheckCheck,
  TrendingUp,
  PenSquare,
  PenLine,
  AlertCircle,
  CalendarClock,
  Timer,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { buscarDashboard, DashboardData } from '../../services/painelService';
import {
  listarNotificacoes,
  marcarLida,
  marcarTodasLidas,
  type Notificacao,
} from '../../services/notificacoesService';
import { processosService } from '../../services/processosService';
import { User } from '../../types/index';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';

// ─── Cache (TTL 30s) ──────────────────────────────────────────────────────────
let _cache: DashboardData | null = null;
let _cacheAt = 0;
const CACHE_TTL = 30_000;
function cacheValido() {
  return _cache !== null && Date.now() - _cacheAt < CACHE_TTL;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function diasDesde(d: string) {
  return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : 0;
}

function badgeStatus(status: string) {
  const m: Record<string, string> = {
    Pendente: 'bg-red-100 text-red-700',
    'Em Andamento': 'bg-blue-100 text-blue-700',
    Concluído: 'bg-green-100 text-green-700',
    Finalizado: 'bg-emerald-100 text-emerald-700',
    Aprovado: 'bg-teal-100 text-teal-700',
    Arquivado: 'bg-gray-100 text-gray-500',
    Cancelado: 'bg-red-100 text-red-500',
    'Em Edital': 'bg-purple-100 text-purple-700',
    'Análise Jurídica': 'bg-indigo-100 text-indigo-700',
    'Levantamento Técnico': 'bg-cyan-100 text-cyan-700',
    Diligência: 'bg-orange-100 text-orange-700',
  };
  return m[status] ?? 'bg-slate-100 text-slate-600';
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [dados, setDados] = useState<DashboardData | null>(cacheValido() ? _cache : null);
  const [loading, setLoading] = useState(!cacheValido());
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const carregarNotifs = useCallback(async () => {
    try {
      const d = await listarNotificacoes();
      setNotifs(d.resultados);
      setNaoLidas(d.nao_lidas);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }, []);

  const [respondendoConvite, setRespondendoConvite] = useState<number | null>(null);

  const handleResponderConvite = useCallback(
    async (n: Notificacao, acao: 'aceitar' | 'recusar') => {
      if (!n.convite || respondendoConvite) return;
      setRespondendoConvite(n.convite.id);
      try {
        await processosService.responderConvite(n.convite.id, acao);
        if (!n.lida) {
          await marcarLida(n.id);
          setNaoLidas((c) => Math.max(0, c - 1));
        }
        await carregarNotifs();
      } catch (error) {
        console.error('Erro ao responder convite:', error);
      } finally {
        setRespondendoConvite(null);
      }
    },
    [respondendoConvite, carregarNotifs]
  );

  const carregar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) {
        setErro('');
        if (!cacheValido()) setLoading(true);
      }

      try {
        const d = await buscarDashboard(filtro || undefined);
        _cache = d;
        _cacheAt = Date.now();
        setDados(d);
        setErro('');
      } catch (e: unknown) {
        if (!_cache) {
          setErro(e instanceof Error ? e.message : 'Erro ao carregar painel.');
        }
      } finally {
        setLoading(false);
      }
    },
    [filtro]
  );

  const prevFiltro = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevFiltro.current !== undefined && prevFiltro.current !== filtro) _cache = null;

    prevFiltro.current = filtro;
    carregar();
  }, [filtro, carregar]);

  useEffect(() => {
    carregarNotifs();
    const iv = setInterval(carregarNotifs, 60_000);
    const onFocus = () => {
      carregar(true);
      carregarNotifs();
    };
    const onAlter = () => {
      _cache = null;
      carregar();
    };
    const onClickOut = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('reurb:processos-alterados', onAlter);
    document.addEventListener('mousedown', onClickOut);
    return () => {
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('reurb:processos-alterados', onAlter);
      document.removeEventListener('mousedown', onClickOut);
    };
  }, [carregarNotifs, carregar]);

  // ── Dados derivados ───────────────────────────────────────────────────────
  const maisAntigos = dados?.mais_antigos ?? [];
  const semMov = dados?.sem_movimentacao ?? [];
  const stats = [
    {
      label: 'Ativos',
      value: dados?.cards?.ativos ?? 0,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      f: 'ativo',
    },
    {
      label: 'Em Revisão',
      value: dados?.cards?.em_revisao ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      f: 'em_revisao',
    },
    {
      label: 'Concluídos',
      value: dados?.cards?.concluidos ?? 0,
      icon: CheckCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
      f: 'concluido',
    },
    {
      label: 'Em Edição',
      value: dados?.status?.em_edicao ?? 0,
      icon: PenSquare,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      f: 'em_edicao',
    },
    {
      label: 'Pendentes',
      value: dados?.status?.pendente ?? 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      f: 'pendente',
    },
    {
      label: 'Assinados',
      value: dados?.status?.assinado ?? 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      f: 'assinado',
    },
    {
      label: 'Arquivados',
      value: dados?.status?.arquivado ?? 0,
      icon: FileText,
      color: 'text-gray-500',
      bg: 'bg-gray-100',
      f: 'arquivado',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-[24px] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[28px] animate-pulse" />
          ))}
        </div>
      </div>
    );

  if (erro)
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{erro}</p>
          <button
            onClick={() => carregar()}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">
            Bem-vindo, {user.name.split(' ')[0]}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Controle central de regularização fundiária municipal.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                if (!showNotif) carregarNotifs();
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
            {showNotif && (
              <div className="absolute right-0 top-14 w-96 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-800">Notificações</h3>
                  {naoLidas > 0 && (
                    <button
                      onClick={async () => {
                        await marcarTodasLidas();
                        setNotifs((p) => p.map((n) => ({ ...n, lida: true })));
                        setNaoLidas(0);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <CheckCheck size={14} /> Marcar todas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifs.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Bell size={28} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Nenhuma notificação.</p>
                    </div>
                  ) : (
                    notifs.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${!n.lida ? 'bg-blue-50/40' : ''}`}
                        onClick={async () => {
                          const conviteAberto =
                            n.tipo === 'atribuicao' && n.convite?.status === 'pendente';
                          if (!n.lida) {
                            await marcarLida(n.id);
                            setNotifs((p) =>
                              p.map((x) => (x.id === n.id ? { ...x, lida: true } : x))
                            );
                            setNaoLidas((c) => Math.max(0, c - 1));
                          }
                          if (n.link && !conviteAberto) {
                            navigate(n.link);
                            setShowNotif(false);
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

                          {n.tipo === 'atribuicao' &&
                            n.convite &&
                            n.convite.status === 'pendente' && (
                              <div className="flex items-center gap-2 mt-2.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResponderConvite(n, 'aceitar');
                                  }}
                                  disabled={respondendoConvite === n.convite.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-black hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                  {respondendoConvite === n.convite.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  Aceitar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResponderConvite(n, 'recusar');
                                  }}
                                  disabled={respondendoConvite === n.convite.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-black hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                  <X size={12} />
                                  Recusar
                                </button>
                              </div>
                            )}

                          {n.tipo === 'atribuicao' && n.convite?.status === 'aceito' && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-emerald-600">
                              <Check size={11} /> Convite aceito
                            </span>
                          )}
                          {n.tipo === 'atribuicao' && n.convite?.status === 'recusado' && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-slate-400">
                              <X size={11} /> Convite recusado
                            </span>
                          )}

                          {n.tipo === 'assinatura' && n.link && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(n.link);
                                setShowNotif(false);
                              }}
                              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black hover:bg-blue-700 transition-colors"
                            >
                              <PenLine size={12} /> Assinar documento
                            </button>
                          )}
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

      {/* ── Cards de status ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {stats.map((s, i) => (
          <div
            key={i}
            onClick={() => setFiltro(filtro === s.f ? '' : s.f)}
            className={`bg-white p-5 rounded-[24px] border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${filtro === s.f ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100 shadow-sm'}`}
          >
            <div
              className={`${s.bg} ${s.color} w-10 h-10 rounded-[14px] flex items-center justify-center mb-3`}
            >
              <s.icon size={20} />
            </div>
            <p className="text-3xl font-black text-slate-800">{s.value}</p>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-tight">
              {s.label}
            </h3>
          </div>
        ))}
      </div>

      {/* ── Rankings: Mais antigos + Sem movimentação ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
              <CalendarClock size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">Processos Mais Antigos</h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Não finalizados — por data de abertura
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {maisAntigos.length === 0 ? (
              <p className="px-7 py-6 text-sm text-slate-400">Nenhum processo encontrado.</p>
            ) : (
              maisAntigos.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-7 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/processes', { state: { abrirProcessoId: p.id } })}
                >
                  <span className="text-lg font-black text-slate-200 w-5 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.protocol || 'Sem protocolo'} · {p.applicant}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeStatus(p.status)}`}
                    >
                      {p.status}
                    </span>
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      {diasDesde(p.created_at)}d aberto
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Timer size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">Sem Movimentação</h3>
              <p className="text-[10px] text-slate-400 font-medium">Maior tempo sem atualização</p>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {semMov.length === 0 ? (
              <p className="px-7 py-6 text-sm text-slate-400">Nenhum processo encontrado.</p>
            ) : (
              semMov.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-7 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/processes', { state: { abrirProcessoId: p.id } })}
                >
                  <span className="text-lg font-black text-slate-200 w-5 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.protocol || 'Sem protocolo'} · {p.applicant}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeStatus(p.status)}`}
                    >
                      {p.status}
                    </span>
                    <p className="text-[10px] text-amber-500 font-bold mt-1">
                      {diasDesde(p.updated_at)}d parado
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Processos recentes ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-7 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Processos Recentes</h3>
            {filtro && (
              <button
                onClick={() => setFiltro('')}
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
        <ProcessTable processes={dados?.recentes || []} />
      </div>

      <NewProcessModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          _cache = null;
          carregar();
        }}
        currentUser={user}
      />
    </div>
  );
};
