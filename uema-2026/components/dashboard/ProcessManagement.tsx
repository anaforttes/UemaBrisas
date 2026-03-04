
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Plus, LayoutGrid, List,
  FileText, MapPin, Calendar,
  ChevronRight, MoreHorizontal, Activity,
  AlertCircle, CheckCircle2, Clock,
  Trash2, Edit2, CheckSquare, X, Loader2,
} from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { REURBProcess, ProcessStatus } from '../../types';
import { ProcessTable } from './ProcessTable';
import { NewProcessModal } from './NewProcessModal';
import { ProcessDrawer } from './ProcessDrawer';
import { useAuth } from '../auth/AuthContext';
import { getStatusBadgeClass, isConcluded } from '../../utils/processUtils';

// ─── Menu de 3 pontos ─────────────────────────────────────────────────
interface DotsMenuProps {
  process: REURBProcess;
  onEdit: () => void;
  onDelete: () => void;
  onFinalize: () => void;
}

const DotsMenu: React.FC<DotsMenuProps> = ({ process, onEdit, onDelete, onFinalize }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const already = isConcluded(process.status) || process.status === 'Finalizado' as any;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
          >
            <Edit2 size={15} className="text-blue-500" /> Editar dados
          </button>
          {!already && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onFinalize(); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors font-medium"
            >
              <CheckSquare size={15} className="text-green-500" /> Finalizar processo
            </button>
          )}
          <div className="border-t border-slate-100" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <Trash2 size={15} /> Excluir processo
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Modal de confirmação de exclusão ────────────────────────────────
const DeleteConfirmModal: React.FC<{
  process: REURBProcess;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ process, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
    <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
          <Trash2 size={26} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Excluir processo?</h3>
          <p className="text-sm text-slate-500 mt-1">
            O processo <strong>{process.protocol}</strong> de <strong>{process.applicant}</strong> será removido permanentemente.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Modal de edição ─────────────────────────────────────────────────
const EditProcessModal: React.FC<{
  process: REURBProcess;
  onSave: (data: Partial<REURBProcess>) => Promise<void>;
  onClose: () => void;
}> = ({ process, onSave, onClose }) => {
  const [form, setForm] = useState({
    applicant:     process.applicant || '',
    location:      process.location  || '',
    modality:      process.modality  || 'REURB-S',
    area:          process.area      || '',
    responsibleName: process.responsibleName || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 max-h-[95dvh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-black text-slate-800">Editar Processo</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Protocolo {process.protocol}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Requerente</label>
            <input required type="text" value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Localização</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Modalidade</label>
              <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-black transition-all appearance-none">
                <option value="REURB-S">REURB-S</option>
                <option value="REURB-E">REURB-E</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Área (m²)</label>
              <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Responsável</label>
            <input type="text" value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:bg-white outline-none text-sm font-bold transition-all" />
          </div>
          <div className="pt-2 pb-safe flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────
export const ProcessManagement: React.FC = () => {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<REURBProcess[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Drawer de detalhes
  const [drawerProcess, setDrawerProcess] = useState<REURBProcess | null>(null);

  // Menu de ações
  const [editProcess, setEditProcess]     = useState<REURBProcess | null>(null);
  const [deleteProcess, setDeleteProcess] = useState<REURBProcess | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const data = await dbService.processes.selectAll();
    setProcesses(data);
  };

  const filteredProcesses = processes.filter(p => {
    const matchesSearch = (p.applicant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.protocol || '').includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Ativos',  value: processes.length,                                               color: 'text-blue-600',  icon: FileText,     bg: 'bg-blue-50'  },
    { label: 'Diligências',   value: processes.filter(p => p.status === ProcessStatus.DILIGENCIA).length, color: 'text-red-500',   icon: AlertCircle,  bg: 'bg-red-50'   },
    { label: 'Finalizados',   value: processes.filter(p => isConcluded(p.status)).length,            color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-50' },
  ];

  const handleDelete = async () => {
    if (!deleteProcess) return;
    setDeleteLoading(true);
    try {
      await dbService.processes.delete(deleteProcess.id);
      setProcesses(prev => prev.filter(p => p.id !== deleteProcess.id));
      setDeleteProcess(null);
      if (drawerProcess?.id === deleteProcess.id) setDrawerProcess(null);
    } catch (e) { console.error(e); }
    finally { setDeleteLoading(false); }
  };

  const handleFinalize = async (proc: REURBProcess) => {
    try {
      await dbService.processes.finalize(proc.id);
      await fetchData();
      if (drawerProcess?.id === proc.id) {
        const updated = await dbService.processes.selectAll();
        setDrawerProcess(updated.find(p => p.id === proc.id) || null);
      }
    } catch (e) { console.error(e); }
  };

  const handleEdit = async (id: string, data: Partial<REURBProcess>) => {
    const updated = await dbService.processes.update(id, data);
    setProcesses(prev => prev.map(p => p.id === id ? updated : p));
    if (drawerProcess?.id === id) setDrawerProcess(updated);
    setEditProcess(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">

      {/* Modais */}
      {deleteProcess && (
        <DeleteConfirmModal
          process={deleteProcess}
          onConfirm={handleDelete}
          onCancel={() => setDeleteProcess(null)}
          loading={deleteLoading}
        />
      )}
      {editProcess && (
        <EditProcessModal
          process={editProcess}
          onSave={(data) => handleEdit(editProcess.id, data)}
          onClose={() => setEditProcess(null)}
        />
      )}

      {/* Drawer de detalhes */}
      <ProcessDrawer process={drawerProcess} onClose={() => setDrawerProcess(null)} />

      <header className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Central de Processos</h2>
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Protocolo</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </header>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-6 lg:mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-3 sm:p-6 rounded-[20px] sm:rounded-[28px] shadow-sm flex items-center gap-3 sm:gap-5 group hover:shadow-md transition-all">
            <div className={`${stat.bg} ${stat.color} p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0`}>
              <stat.icon size={18} className="sm:hidden" />
              <stat.icon size={24} className="hidden sm:block" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white border border-slate-100 p-3 sm:p-4 rounded-[24px] sm:rounded-[32px] shadow-sm mb-6 lg:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar requerente ou protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50 outline-none text-sm transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-blue-100 transition-all cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            {Object.values(ProcessStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all border border-transparent flex-shrink-0">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <ProcessTable processes={filteredProcesses} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredProcesses.map(proc => (
            <div key={proc.id} className="bg-white border border-slate-200 rounded-[28px] p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${proc.modality === 'REURB-S' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                    {proc.modality}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">{proc.protocol || 'S/P'}</span>
                </div>
              </div>

              <h3 className="text-base font-black text-slate-800 mb-1 truncate group-hover:text-blue-600 transition-colors">{proc.applicant}</h3>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4 font-medium">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{proc.location || 'Localização não definida'}</span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span className="flex items-center gap-1"><Activity size={9} /> Progresso</span>
                  <span className="text-slate-800">{proc.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${proc.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                    style={{ width: `${proc.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-4 mb-4">
                <div>
                  <span className="text-[9px] font-black text-slate-300 uppercase flex items-center gap-1 mb-0.5">
                    <Calendar size={9} /> Início
                  </span>
                  <span className="text-xs font-bold text-slate-600">{proc.createdAt}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-300 uppercase flex items-center justify-end gap-1 mb-0.5">
                    <Clock size={9} /> Status
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getStatusBadgeClass(proc.status)}`}>{proc.status}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {/* ── Botão Gerenciar abre o Drawer ── */}
                <button
                  onClick={() => setDrawerProcess(proc)}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-all"
                >
                  Gerenciar <ChevronRight size={13} />
                </button>

                {/* ── Menu de 3 pontos ── */}
                <DotsMenu
                  process={proc}
                  onEdit={() => setEditProcess(proc)}
                  onDelete={() => setDeleteProcess(proc)}
                  onFinalize={() => handleFinalize(proc)}
                />
              </div>
            </div>
          ))}

          {filteredProcesses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                <Search size={32} />
              </div>
              <h3 className="text-slate-800 text-lg font-black">Nada por aqui...</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Ajuste os filtros ou crie um novo protocolo.</p>
            </div>
          )}
        </div>
      )}

      <NewProcessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        currentUser={user || {}}
      />
    </div>
  );
};
