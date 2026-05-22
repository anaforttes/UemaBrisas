import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Plus,
  Briefcase,
  Clock,
  FileText,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';

import { buscarDashboard } from '../../services/painelService';
import { dbService } from '../../services/databaseService';
import { MOCK_MODELS } from '../../constants';
import { User } from '../../types/index';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [dadosPainel, setDadosPainel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const carregarDashboard = async () => {
    try {
      setLoading(true);
      setErro('');

      const data = await buscarDashboard(statusFiltro);
      setDadosPainel(data);
    } catch (e) {
      console.error(e);
      setErro('Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, [statusFiltro]);

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

  const processosBase = dbService.processes.selectAll();
  const documentosBase = processosBase.flatMap((processo) =>
    dbService.documents.findByProcessId(processo.id)
  );
  const protocolos = processosBase
    .map((processo) => processo.protocol)
    .filter(Boolean);
  const protocolosDuplicados = protocolos.filter(
    (protocolo, index) => protocolos.indexOf(protocolo) !== index
  );
  const documentosComCpfPendente = documentosBase.filter((documento) =>
    /cpf|cnpj/i.test(documento.content || documento.title || '') &&
    /_{3,}|__\./.test(documento.content || '')
  );
  const datasInconsistentes = processosBase.filter((processo) => {
    if (!processo.createdAt || !processo.updatedAt) return true;
    return new Date(processo.createdAt).getTime() > new Date(processo.updatedAt).getTime();
  });
  const processosSemReferencia = processosBase.filter((processo) =>
    !processo.protocol ||
    !processo.title ||
    !processo.applicant ||
    !processo.modality ||
    !processo.status
  );
  const modelosComCpfCnpj = MOCK_MODELS.filter((modelo) =>
    /portaria|notifica|relat|demarca|título|titulo/i.test(modelo.name)
  ).length;
  const alertasInconsistencia = [
    {
      label: 'CPF/CNPJ',
      value: documentosComCpfPendente.length,
      detail: documentosComCpfPendente.length > 0
        ? 'documentos com identificação pendente'
        : `${modelosComCpfCnpj} modelos monitorados`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Datas',
      value: datasInconsistentes.length,
      detail: datasInconsistentes.length > 0
        ? 'processos com datas inconsistentes'
        : 'cronologia dos processos conferida',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Numeração',
      value: protocolosDuplicados.length,
      detail: protocolosDuplicados.length > 0
        ? 'protocolos duplicados encontrados'
        : `${protocolos.length} protocolos únicos`,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Referências',
      value: processosSemReferencia.length,
      detail: processosSemReferencia.length > 0
        ? 'processos com campos essenciais ausentes'
        : 'processos com referências básicas preenchidas',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  if (loading) {
    return <div className="p-10">Carregando painel...</div>;
  }

  if (erro) {
    return <div className="p-10 text-red-600">{erro}</div>;
  }

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">
            Bem-vindo TESTE, {user.name.split(' ')[0]}
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
                <p className="text-sm text-slate-400">
                  Notificações ainda serão integradas ao backend.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowNewProcessModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
          >
            <Plus size={20} /> Novo Processo
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {stats.map((stat, i) => (
          <div
            key={i}
            onClick={() => setStatusFiltro(stat.filter || '')}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <div
                className={`${stat.bg} ${stat.color} p-4 rounded-[20px] transition-transform group-hover:rotate-3`}
              >
                <stat.icon size={28} />
              </div>

              <span
                className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase ${
                  stat.change.startsWith('+')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stat.change} Hoje
              </span>
            </div>

            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">
              {stat.label}
            </h3>
            <p className="text-4xl font-black text-slate-800 mt-2">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 mb-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-slate-800 text-lg">
              Alertas de Inconsistência
            </h3>
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
                <div className={`${alerta.bg} ${alerta.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                  <AlertTriangle size={18} />
                </div>
                <span className="text-3xl font-black text-slate-800">
                  {alerta.value}
                </span>
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
              <h3 className="font-black text-slate-800 text-lg">
                Processos Recentes
              </h3>

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
                  <Plus size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NewProcessModal
        isOpen={showNewProcessModal}
        onClose={() => setShowNewProcessModal(false)}
        onSuccess={carregarDashboard}
        currentUser={user}
      />
    </div>
  );
};
