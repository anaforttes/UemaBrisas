import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, FileText, Users, Calendar, Filter } from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { MOCK_PROCESSES } from '../../constants';
import { ProcessStatus } from '../../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatarHoras = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── Componente Principal ─────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'REURB-S' | 'REURB-E'>('todos');

  const processos = useMemo(() => {
    const doDb = dbService.processes.selectAll();
    return doDb.length > 0 ? doDb : MOCK_PROCESSES;
  }, []);

  const documentos = useMemo(() => dbService.documents.findByProcessId(''), []);

  // ── Filtro por período ────────────────────────────────────────────────────
  const processosFiltrados = useMemo(() => {
    const agora = new Date();
    const diasAtras = periodo === '7d' ? 7 : periodo === '30d' ? 30 : periodo === '90d' ? 90 : 99999;
    const corte = new Date(agora.getTime() - diasAtras * 24 * 60 * 60 * 1000);

    return processos.filter(p => {
      const dentroPerido = new Date(p.createdAt) >= corte;
      const dentroTipo = tipoFiltro === 'todos' || p.modality === tipoFiltro;
      return dentroPerido && dentroTipo;
    });
  }, [processos, periodo, tipoFiltro]);

  // ── Stats principais ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       processosFiltrados.length,
    emAndamento: processosFiltrados.filter(p => p.status === ProcessStatus.EM_ANDAMENTO).length,
    concluidos:  processosFiltrados.filter(p => p.status === ProcessStatus.CONCLUIDO || p.status === ProcessStatus.FINALIZADO).length,
    pendentes:   processosFiltrados.filter(p => p.status === ProcessStatus.PENDENTE).length,
    progressoMedio: processosFiltrados.length > 0
      ? Math.round(processosFiltrados.reduce((acc, p) => acc + p.progress, 0) / processosFiltrados.length)
      : 0,
  }), [processosFiltrados]);

  // ── Distribuição por status ───────────────────────────────────────────────
  const porStatus = useMemo(() => {
    const mapa: Record<string, number> = {};
    processosFiltrados.forEach(p => {
      mapa[p.status] = (mapa[p.status] || 0) + 1;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [processosFiltrados]);

  // ── Distribuição por modalidade ───────────────────────────────────────────
  const porModalidade = useMemo(() => {
    const s = processosFiltrados.filter(p => p.modality === 'REURB-S').length;
    const e = processosFiltrados.filter(p => p.modality === 'REURB-E').length;
    const total = s + e || 1;
    return { s, e, pctS: Math.round((s / total) * 100), pctE: Math.round((e / total) * 100) };
  }, [processosFiltrados]);

  // ── Produtividade por responsável ─────────────────────────────────────────
  const porResponsavel = useMemo(() => {
    const mapa: Record<string, number> = {};
    processosFiltrados.forEach(p => {
      const nome = p.responsibleName || 'Não atribuído';
      mapa[nome] = (mapa[nome] || 0) + 1;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [processosFiltrados]);

  // ── Processos por mês ─────────────────────────────────────────────────────
  const porMes = useMemo(() => {
    const mapa: Record<number, number> = {};
    processos.forEach(p => {
      const mes = new Date(p.createdAt).getMonth();
      mapa[mes] = (mapa[mes] || 0) + 1;
    });
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

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {(['7d', '30d', '90d', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  periodo === p ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p === '7d' ? 'Últimos 7 dias' : p === '30d' ? 'Últimos 30 dias' : p === '90d' ? 'Últimos 90 dias' : 'Tudo'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {(['todos', 'REURB-S', 'REURB-E'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTipoFiltro(t)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  tipoFiltro === t ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {[
          { label: 'Total de Processos', value: stats.total,         cor: 'text-blue-600',  bg: 'bg-blue-50',   icon: FileText   },
          { label: 'Em Andamento',        value: stats.emAndamento,  cor: 'text-amber-600', bg: 'bg-amber-50',  icon: TrendingUp },
          { label: 'Concluídos',          value: stats.concluidos,   cor: 'text-green-600', bg: 'bg-green-50',  icon: BarChart3  },
          { label: 'Pendentes',           value: stats.pendentes,    cor: 'text-slate-600', bg: 'bg-slate-50',  icon: Calendar   },
          { label: 'Progresso Médio',     value: `${stats.progressoMedio}%`, cor: 'text-indigo-600', bg: 'bg-indigo-50', icon: Users },
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
                <div
                  className="w-full bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700"
                  style={{ height: `${Math.max((m.valor / maxMes) * 100, m.valor > 0 ? 8 : 2)}%`, minHeight: m.valor > 0 ? 8 : 2 }}
                />
                <span className="text-[9px] font-bold text-slate-400">{m.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por modalidade */}
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

          {/* Distribuição por status */}
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
    </div>
  );
};