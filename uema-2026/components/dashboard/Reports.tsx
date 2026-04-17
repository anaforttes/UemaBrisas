import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart3, TrendingUp, FileText, Users, Calendar, Send, MessageSquare, X, Minus } from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { MOCK_PROCESSES } from '../../constants';
import { ProcessStatus, User } from '../../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── Tipos do Chat ────────────────────────────────────────────────────────────

interface Mensagem {
  id: string;
  autorId: string;
  autorNome: string;
  autorCor: string;
  texto: string;
  hora: string;
  data: string;
}

const CHAT_KEY = 'reurb_chat_mensagens';

const salvarMensagens  = (msgs: Mensagem[]) => localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
const carregarMensagens = (): Mensagem[] => {
  try { const r = localStorage.getItem(CHAT_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
};

const CORES_AVATAR = ['#2563eb','#16a34a','#7c3aed','#dc2626','#d97706','#0891b2','#db2777','#374151'];
const getCorAvatar = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return CORES_AVATAR[Math.abs(h) % CORES_AVATAR.length];
};

const formatarHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Chat Flutuante ───────────────────────────────────────────────────────────

const ChatFlutuante: React.FC = () => {
  const currentUser = JSON.parse(localStorage.getItem('reurb_current_user') || '{}');
  const [membros, setMembros] = useState<User[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await dbService.users.selectAll();
        setMembros(data);
      } catch (error) {
        console.error('Erro ao carregar membros:', error);
        setMembros([]);
      }
    };
    fetchMembers();
  }, []);

  const [aberto, setAberto]       = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>(carregarMensagens);
  const [texto, setTexto]         = useState('');
  const [naoLidas, setNaoLidas]   = useState(0);
  const fimRef                    = useRef<HTMLDivElement>(null);
  const prevLen                   = useRef(mensagens.length);

  useEffect(() => {
    if (aberto && !minimizado) {
      fimRef.current?.scrollIntoView({ behavior: 'smooth' });
      setNaoLidas(0);
    }
  }, [mensagens, aberto, minimizado]);

  useEffect(() => {
    if (!aberto || minimizado) {
      const novas = mensagens.length - prevLen.current;
      if (novas > 0) setNaoLidas(n => n + novas);
    }
    prevLen.current = mensagens.length;
  }, [mensagens]);

  const enviar = () => {
    if (!texto.trim()) return;
    const agora = new Date().toISOString();
    const nova: Mensagem = {
      id:        `msg-${Date.now()}`,
      autorId:   currentUser.id   || 'u-anonimo',
      autorNome: currentUser.name || 'Usuário',
      autorCor:  getCorAvatar(currentUser.id || 'u-anonimo'),
      texto:     texto.trim(),
      hora:      agora,
      data:      formatarData(agora),
    };
    const atualizadas = [...mensagens, nova];
    setMensagens(atualizadas);
    salvarMensagens(atualizadas);
    setTexto('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  const online  = membros.filter(m => m.status === 'Online');
  const offline = membros.filter(m => m.status !== 'Online');

  const mensagensComSeparador = useMemo(() => {
    const resultado: { tipo: 'data' | 'mensagem'; valor: string | Mensagem }[] = [];
    let dataAtual = '';
    mensagens.forEach(m => {
      const data = formatarData(m.hora);
      if (data !== dataAtual) { dataAtual = data; resultado.push({ tipo: 'data', valor: data }); }
      resultado.push({ tipo: 'mensagem', valor: m });
    });
    return resultado;
  }, [mensagens]);

  return (
    <>
      {/* Janela flutuante */}
      {aberto && (
        <div
          className="fixed z-50 bg-white rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden flex animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ bottom: 88, right: 24, width: 680, height: minimizado ? 0 : 480 }}
        >
          {!minimizado && (
            <>
              {/* Sidebar membros */}
              <div className="w-48 border-r border-slate-100 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-800">Equipe REURB</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{online.length} online</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {online.length > 0 && (
                    <>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">Online</p>
                      {online.map(m => (
                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-50">
                          <div className="relative shrink-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: getCorAvatar(m.id) }}>
                              {m.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-800 truncate">{m.name.split(' ')[0]}</p>
                            <p className="text-[9px] text-slate-400 truncate">{m.role}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {offline.length > 0 && (
                    <>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 mt-2">Offline</p>
                      {offline.map(m => (
                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl opacity-40">
                          <div className="relative shrink-0">
                            <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white text-[10px] font-black">
                              {m.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-700 truncate">{m.name.split(' ')[0]}</p>
                            <p className="text-[9px] text-slate-400 truncate">{m.role}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Área do chat */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-900 rounded-xl flex items-center justify-center">
                      <MessageSquare size={13} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800"># geral</p>
                      <p className="text-[9px] text-slate-400 font-medium">Canal da equipe REURB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMinimizado(true)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => setAberto(false)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {mensagensComSeparador.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <MessageSquare size={20} className="text-slate-300" />
                      </div>
                      <p className="text-xs font-black text-slate-700">Nenhuma mensagem ainda</p>
                      <p className="text-[10px] text-slate-400 mt-1">Seja o primeiro a enviar uma mensagem.</p>
                    </div>
                  )}
                  {mensagensComSeparador.map((item, i) => {
                    if (item.tipo === 'data') {
                      return (
                        <div key={i} className="flex justify-center">
                          <span className="text-[10px] font-bold text-slate-400 px-3 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                            {item.valor as string}
                          </span>
                        </div>
                      );
                    }
                    const msg    = item.valor as Mensagem;
                    const ehMeu  = msg.autorId === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex gap-2.5 items-start ${ehMeu ? 'flex-row-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: msg.autorCor }}>
                          {msg.autorNome.charAt(0)}
                        </div>
                        <div className={`flex flex-col ${ehMeu ? 'items-end' : 'items-start'} max-w-[65%]`}>
                          <div className={`flex items-baseline gap-1.5 mb-0.5 ${ehMeu ? 'flex-row-reverse' : ''}`}>
                            <p className="text-[11px] font-black text-slate-700">{msg.autorNome.split(' ')[0]}</p>
                            <p className="text-[9px] text-slate-400">{formatarHora(msg.hora)}</p>
                          </div>
                          <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                            ehMeu
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                          }`}>
                            {msg.texto}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={fimRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-slate-100 flex gap-2 items-center">
                  <input
                    type="text"
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mensagem para #geral..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none transition-all"
                  />
                  <button
                    onClick={enviar}
                    disabled={!texto.trim()}
                    className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Barra minimizada */}
      {aberto && minimizado && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3 cursor-pointer hover:shadow-2xl transition-all animate-in fade-in duration-200"
          style={{ bottom: 88, right: 24, width: 280 }}
          onClick={() => setMinimizado(false)}
        >
          <div className="w-7 h-7 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-800"># geral — Equipe REURB</p>
            <p className="text-[10px] text-slate-400">{online.length} online</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setAberto(false); setMinimizado(false); }}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Botão flutuante */}
      {!aberto && (
        <button
          onClick={() => { setAberto(true); setMinimizado(false); setNaoLidas(0); }}
          className="fixed z-50 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all animate-in fade-in duration-300"
          style={{ bottom: 24, right: 24 }}
          title="Chat da Equipe"
        >
          <MessageSquare size={24} />
          {naoLidas > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white">
              {naoLidas}
            </div>
          )}
        </button>
      )}
    </>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const [periodo, setPeriodo]       = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'REURB-S' | 'REURB-E'>('todos');

  const processos = useMemo(() => {
    const doDb = dbService.processes.selectAll();
    return doDb.length > 0 ? doDb : MOCK_PROCESSES;
  }, []);

  const processosFiltrados = useMemo(() => {
    const agora     = new Date();
    const diasAtras = periodo === '7d' ? 7 : periodo === '30d' ? 30 : periodo === '90d' ? 90 : 99999;
    const corte     = new Date(agora.getTime() - diasAtras * 24 * 60 * 60 * 1000);
    return processos.filter(p => {
      const dentroPerido = new Date(p.createdAt) >= corte;
      const dentroTipo   = tipoFiltro === 'todos' || p.modality === tipoFiltro;
      return dentroPerido && dentroTipo;
    });
  }, [processos, periodo, tipoFiltro]);

  const stats = useMemo(() => ({
    total:          processosFiltrados.length,
    emAndamento:    processosFiltrados.filter(p => p.status === ProcessStatus.EM_ANDAMENTO).length,
    concluidos:     processosFiltrados.filter(p => p.status === ProcessStatus.CONCLUIDO || p.status === ProcessStatus.FINALIZADO).length,
    pendentes:      processosFiltrados.filter(p => p.status === ProcessStatus.PENDENTE).length,
    progressoMedio: processosFiltrados.length > 0
      ? Math.round(processosFiltrados.reduce((acc, p) => acc + p.progress, 0) / processosFiltrados.length)
      : 0,
  }), [processosFiltrados]);

  const porStatus = useMemo(() => {
    const mapa: Record<string, number> = {};
    processosFiltrados.forEach(p => { mapa[p.status] = (mapa[p.status] || 0) + 1; });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [processosFiltrados]);

  const porModalidade = useMemo(() => {
    const s     = processosFiltrados.filter(p => p.modality === 'REURB-S').length;
    const e     = processosFiltrados.filter(p => p.modality === 'REURB-E').length;
    const total = s + e || 1;
    return { s, e, pctS: Math.round((s / total) * 100), pctE: Math.round((e / total) * 100) };
  }, [processosFiltrados]);

  const porResponsavel = useMemo(() => {
    const mapa: Record<string, number> = {};
    processosFiltrados.forEach(p => {
      const nome = p.responsibleName || 'Não atribuído';
      mapa[nome] = (mapa[nome] || 0) + 1;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [processosFiltrados]);

  const porMes = useMemo(() => {
    const mapa: Record<number, number> = {};
    processos.forEach(p => { const mes = new Date(p.createdAt).getMonth(); mapa[mes] = (mapa[mes] || 0) + 1; });
    return MESES.map((nome, i) => ({ nome, valor: mapa[i] || 0 }));
  }, [processos]);

  const maxMes = Math.max(...porMes.map(m => m.valor), 1);

  const STATUS_COR: Record<string, string> = {
    [ProcessStatus.EM_ANDAMENTO]:     'bg-blue-500',
    [ProcessStatus.CONCLUIDO]:        'bg-green-500',
    [ProcessStatus.FINALIZADO]:       'bg-green-600',
    [ProcessStatus.PENDENTE]:         'bg-slate-400',
    [ProcessStatus.ANALISE_JURIDICA]: 'bg-amber-500',
    [ProcessStatus.LEVANTAMENTO]:     'bg-purple-500',
    [ProcessStatus.APROVADO]:         'bg-teal-500',
  };

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">

      {/* Header */}
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Relatórios e Análises</h2>
          <p className="text-slate-500 mt-2 font-medium">Visualize sua evolução e tome decisões baseadas em dados.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {(['7d', '30d', '90d', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${periodo === p ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                {p === '7d' ? 'Últimos 7 dias' : p === '30d' ? 'Últimos 30 dias' : p === '90d' ? 'Últimos 90 dias' : 'Tudo'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {(['todos', 'REURB-S', 'REURB-E'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tipoFiltro === t ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {[
          { label: 'Total de Processos', value: stats.total,                cor: 'text-blue-600',   bg: 'bg-blue-50',   icon: FileText   },
          { label: 'Em Andamento',        value: stats.emAndamento,          cor: 'text-amber-600',  bg: 'bg-amber-50',  icon: TrendingUp },
          { label: 'Concluídos',          value: stats.concluidos,           cor: 'text-green-600',  bg: 'bg-green-50',  icon: BarChart3  },
          { label: 'Pendentes',           value: stats.pendentes,            cor: 'text-slate-600',  bg: 'bg-slate-50',  icon: Calendar   },
          { label: 'Progresso Médio',     value: `${stats.progressoMedio}%`, cor: 'text-indigo-600', bg: 'bg-indigo-50', icon: Users      },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 hover:shadow-lg transition-all">
            <div className={`${s.bg} ${s.cor} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <s.icon size={20} />
            </div>
            <p className="text-3xl font-black text-slate-800">{s.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

        {/* Gráfico por mês */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-8">
          <h3 className="font-black text-slate-800 text-lg mb-6">Processos por Mês</h3>
          <div className="flex items-end gap-2 h-40">
            {porMes.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-slate-400">{m.valor > 0 ? m.valor : ''}</span>
                <div className="w-full bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700" style={{ height: `${Math.max((m.valor / maxMes) * 100, m.valor > 0 ? 8 : 2)}%`, minHeight: m.valor > 0 ? 8 : 2 }} />
                <span className="text-[9px] font-bold text-slate-400">{m.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-8">
          <h3 className="font-black text-slate-800 text-lg mb-6">Por Modalidade</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-slate-600">REURB-S</span>
                <span className="text-xs font-black text-blue-600">{porModalidade.pctS}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${porModalidade.pctS}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{porModalidade.s} processos</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-slate-600">REURB-E</span>
                <span className="text-xs font-black text-purple-600">{porModalidade.pctE}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${porModalidade.pctE}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{porModalidade.e} processos</p>
            </div>
          </div>

          <h3 className="font-black text-slate-800 text-base mt-8 mb-4">Por Status</h3>
          <div className="space-y-2">
            {porStatus.map(([status, count], i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COR[status] || 'bg-slate-400'}`} />
                  <span className="text-xs text-slate-600 font-medium truncate max-w-[140px]">{status}</span>
                </div>
                <span className="text-xs font-black text-slate-800">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Produtividade por responsável */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-8">
        <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
          <Users size={20} className="text-blue-600" /> Produtividade por Responsável
        </h3>
        {porResponsavel.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum dado disponível para o período.</p>
        ) : (
          <div className="space-y-4">
            {porResponsavel.map(([nome, count], i) => {
              const max = porResponsavel[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 text-xs font-black shrink-0">
                    {nome.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700 truncate">{nome}</span>
                      <span className="text-sm font-black text-slate-800">{count} processo{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat flutuante */}
      <ChatFlutuante />
    </div>
  );
};