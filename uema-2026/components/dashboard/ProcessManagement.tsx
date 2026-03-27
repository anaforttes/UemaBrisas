import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Plus, LayoutGrid, List,
  FileText, MapPin, Calendar,
  ChevronRight, MoreHorizontal, Activity,
  AlertCircle, CheckCircle2, Clock, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../../services/databaseService';
import { REURBProcess, ProcessStatus } from '../../types/index';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';
import { ProcessDrawer } from './ProcessDrawer';
import { usePermissoes } from '../../hooks/usePermissoes';

export const ProcessManagement: React.FC = () => {
  const [processes, setProcesses]                     = useState<REURBProcess[]>([]);
  const [viewMode, setViewMode]                       = useState<'table' | 'grid'>('grid');
  const [searchTerm, setSearchTerm]                   = useState('');
  const [isModalOpen, setIsModalOpen]                 = useState(false);
  const [filterStatus, setFilterStatus]               = useState<string>('all');
  const [processoSelecionado, setProcessoSelecionado] = useState<REURBProcess | null>(null);
  const [menuAberto, setMenuAberto]                   = useState<string | null>(null);
  const menuRef                                       = useRef<HTMLDivElement>(null);
  const navigate                                      = useNavigate();
  const { pode }                                      = usePermissoes();

  const currentUser = JSON.parse(localStorage.getItem('reurb_current_user') || '{}');

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async () => {
    const data = await dbService.processes.selectAll();
    setProcesses(data);
  };

  const handleProtocolar = (proc: REURBProcess) => {
    dbService.processes.protocolar(
      proc.id,
      currentUser.id   || 'u-admin',
      currentUser.name || 'Administrador'
    );
    fetchData();
  };

  const handleDownloadZip = async (proc: REURBProcess) => {
    if (!(window as any).JSZip) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    const JSZip = (window as any).JSZip;
    const zip   = new JSZip();
    const pasta = zip.folder(`processo_${proc.protocol || proc.id}`);

    const meta = [
      `PROCESSO: ${proc.protocol || proc.id}`,
      `REQUERENTE: ${proc.applicant}`,
      `NÚCLEO: ${proc.title}`,
      `MODALIDADE: ${proc.modality}`,
      `STATUS: ${proc.status}`,
      `LOCALIZAÇÃO: ${proc.location || '—'}`,
      `RESPONSÁVEL: ${proc.responsibleName || '—'}`,
      `ÁREA: ${proc.area || '—'}`,
      `PROGRESSO: ${proc.progress}%`,
      `CRIADO EM: ${proc.createdAt}`,
      `ATUALIZADO EM: ${proc.updatedAt}`,
    ].join('\n');
    pasta!.file('metadados.txt', meta);

    const documentos = dbService.documents.findByProcessId(proc.id);
    if (documentos.length > 0) {
      const pastaDocumentos = pasta!.folder('documentos');
      documentos.forEach((doc, i) => {
        const nomeArquivo = `${String(i + 1).padStart(2, '0')}_${doc.title.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim()}.html`;
        pastaDocumentos!.file(nomeArquivo, doc.content || '');
      });
    }

    const anexosSalvos = localStorage.getItem(`anexos_${proc.id}`);
    if (anexosSalvos) {
      const anexos = JSON.parse(anexosSalvos);
      if (anexos.length > 0) {
        const pastaAnexos = pasta!.folder('anexos');
        anexos.forEach((anexo: any) => {
          const base64Data = anexo.base64.split(',')[1] || anexo.base64;
          pastaAnexos!.file(anexo.nome, base64Data, { base64: true });
        });
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `processo_${proc.protocol || proc.id}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProcesses = processes.filter(p => {
    const matchesSearch =
      (p.applicant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.protocol  || '').includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Ativos', value: processes.length,                                                                                           color: 'text-blue-600',  icon: FileText,     bg: 'bg-blue-50'  },
    { label: 'Diligências',  value: processes.filter(p => p.status === ProcessStatus.DILIGENCIA).length,                                        color: 'text-red-500',   icon: AlertCircle,  bg: 'bg-red-50'   },
    { label: 'Finalizados',  value: processes.filter(p => p.status === ProcessStatus.CONCLUIDO || p.status === ProcessStatus.FINALIZADO).length, color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-50' },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">

      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Central de Processos</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Gerencie o fluxo de regularização da prefeitura.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          {/* Botão Novo Protocolo — oculto para usuário externo */}
          {pode.criarProcesso && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
            >
              <Plus size={18} /> Novo Protocolo
            </button>
          )}
        </div>
      </header>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white border border-slate-100 p-4 rounded-[32px] shadow-sm mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por requerente, núcleo ou protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50 outline-none text-sm transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 md:flex-none px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-blue-100 transition-all cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            {Object.values(ProcessStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all border border-transparent">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <ProcessTable processes={filteredProcesses} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProcesses.map(proc => (
            <div key={proc.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                  <FileText size={22} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                    proc.modality === 'REURB-S'
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : 'bg-purple-50 text-purple-600 border-purple-100'
                  }`}>
                    {proc.modality}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">#{proc.protocol || 'S/P'}</span>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-800 mb-1 truncate group-hover:text-blue-600 transition-colors">
                {proc.applicant}
              </h3>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-6 font-medium">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{proc.location || 'Localização não definida'}</span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Activity size={10} /> Progresso Geral</span>
                  <span className="text-slate-800">{proc.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                      proc.progress === 100 ? 'bg-green-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${proc.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6 mb-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Calendar size={10} /> Início
                  </span>
                  <span className="text-xs font-bold text-slate-600">{proc.createdAt}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                    <Clock size={10} /> Status
                  </span>
                  <span className="text-xs font-black text-blue-600">{proc.status}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setProcessoSelecionado(proc)}
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-slate-100"
                >
                  Gerenciar <ChevronRight size={14} />
                </button>

                {/* Menu ... — oculto para usuário externo */}
                {pode.verMenuAcoes && (
                  <div className="relative" ref={menuAberto === proc.id ? menuRef : null}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === proc.id ? null : proc.id); }}
                      className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {menuAberto === proc.id && (
                      <div className="absolute right-0 bottom-14 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 min-w-[190px]">
                        {!proc.protocolado && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleProtocolar(proc); setMenuAberto(null); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <CheckCircle2 size={14} /> Protocolar Processo
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/templates'); setMenuAberto(null); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <FileText size={14} /> Gerar Documento
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setProcessoSelecionado(proc); setMenuAberto(null); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Clock size={14} /> Ver Auditoria
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadZip(proc); setMenuAberto(null); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Download size={14} /> Baixar Pacote ZIP
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredProcesses.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Search size={48} />
              </div>
              <h3 className="text-slate-800 text-xl font-black">Nada por aqui...</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Ajuste os filtros ou crie um novo protocolo.</p>
            </div>
          )}
        </div>
      )}

      <NewProcessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        currentUser={JSON.parse(localStorage.getItem('reurb_current_user') || '{}')}
      />

      <ProcessDrawer
        process={processoSelecionado}
        onClose={() => setProcessoSelecionado(null)}
      />
    </div>
  );
};