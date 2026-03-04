
import React, { useState, useEffect } from 'react';
import { X, FileText, ArrowRight, User as UserIcon, CheckCircle2, Clock, AlertCircle, Circle, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { REURBProcess } from '../../types/index';
import { dbService } from '../../services/databaseService';
import { Link } from 'react-router-dom';

interface ProcessDrawerProps {
  process: REURBProcess | null;
  onClose: () => void;
}

type StepStatus = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada' | 'cancelada';

interface ProcessStep {
  id: string;
  stepNumber: number;
  name: string;
  axis: string | null;
  status: StepStatus;
  responsible?: { id: string; name: string; avatarUrl?: string } | null;
  notes: string | null;
  startedAt: string | null;
  concludedAt: string | null;
}

const stepStatusConfig: Record<StepStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  pendente:     { label: 'Pendente',     icon: <Circle size={14} />,        color: 'text-slate-400', bg: 'bg-slate-50',  border: 'border-slate-200' },
  em_andamento: { label: 'Em andamento', icon: <Clock size={14} />,         color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-200'  },
  concluida:    { label: 'Concluída',    icon: <CheckCircle2 size={14} />,   color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200' },
  bloqueada:    { label: 'Bloqueada',    icon: <Ban size={14} />,            color: 'text-red-500',   bg: 'bg-red-50',    border: 'border-red-200'   },
  cancelada:    { label: 'Cancelada',    icon: <AlertCircle size={14} />,    color: 'text-slate-300', bg: 'bg-slate-50',  border: 'border-slate-100' },
};

const axisColors: Record<string, string> = {
  'Técnico':          'bg-blue-100 text-blue-700',
  'Jurídico':         'bg-purple-100 text-purple-700',
  'Técnico / Social': 'bg-teal-100 text-teal-700',
  'Cartorial':        'bg-amber-100 text-amber-700',
};

export const ProcessDrawer: React.FC<ProcessDrawerProps> = ({ process, onClose }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);
  const [initializingSteps, setInitializingSteps] = useState(false);
  const [activeTab, setActiveTab] = useState<'etapas' | 'docs'>('etapas');

  useEffect(() => {
    if (!process) return;
    dbService.documents.findByProcessId(process.id).then(setDocuments);
    dbService.processes.getSteps(process.id).then(setSteps).catch(() => setSteps([]));
  }, [process]);

  if (!process) return null;

  const completedSteps = steps.filter(s => s.status === 'concluida').length;
  const progressPercent = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  const handleInitSteps = async () => {
    setInitializingSteps(true);
    try {
      const created = await dbService.processes.initSteps(process!.id);
      setSteps(created);
    } catch (e) {
      console.error(e);
    } finally {
      setInitializingSteps(false);
    }
  };

  const handleStepStatus = async (step: ProcessStep, newStatus: StepStatus) => {
    setUpdatingStep(step.id);
    try {
      const updated = await dbService.processes.updateStep(process.id, step.id, { status: newStatus });
      setSteps(prev => prev.map(s => s.id === step.id ? { ...s, ...updated } : s));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStep(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[110] animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl z-[120] animate-in slide-in-from-right duration-300 overflow-y-auto border-l border-slate-100 flex flex-col">

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-50 flex justify-between items-start sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div className="min-w-0 mr-3">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Protocolo {process.protocol}</span>
            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight truncate">{process.applicant}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{process.location}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Barra de progresso geral */}
        {steps.length > 0 && (
          <div className="px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Geral</span>
              <span className="text-xs font-black text-slate-700">{completedSteps}/{steps.length} etapas</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressPercent === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('etapas')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'etapas' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            14 Etapas do REURB
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'docs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Documentos {documents.length > 0 && `(${documents.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── ABA: ETAPAS ── */}
          {activeTab === 'etapas' && (
            <div className="p-4 sm:p-5 space-y-2">
              {steps.length === 0 && (
                <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-4">
                  <Circle size={32} className="opacity-30" />
                  <div>
                    <p className="text-sm font-bold text-slate-600">Nenhuma etapa encontrada.</p>
                    <p className="text-xs mt-1 text-slate-400">Este processo foi criado antes da atualização.</p>
                  </div>
                  <button
                    onClick={handleInitSteps}
                    disabled={initializingSteps}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-60"
                  >
                    {initializingSteps ? (
                      <><Clock size={15} className="animate-spin" /> Criando etapas...</>
                    ) : (
                      <><CheckCircle2 size={15} /> Inicializar 14 Etapas</>
                    )}
                  </button>
                </div>
              )}
              {steps.map((step) => {
                const cfg = stepStatusConfig[step.status] || stepStatusConfig.pendente;
                const isExpanded = expandedStep === step.id;
                const isUpdating = updatingStep === step.id;
                return (
                  <div key={step.id} className={`rounded-2xl border transition-all ${cfg.border} ${cfg.bg} overflow-hidden`}>
                    <button
                      className="w-full flex items-center gap-3 p-3.5 text-left"
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[10px] ${
                        step.status === 'concluida'    ? 'bg-green-600 text-white' :
                        step.status === 'em_andamento' ? 'bg-blue-600 text-white'  :
                        step.status === 'bloqueada'    ? 'bg-red-500 text-white'   :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {step.status === 'concluida' ? '✓' : step.stepNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold truncate ${step.status === 'cancelada' ? 'line-through text-slate-300' : 'text-slate-800'}`}>
                            {step.name}
                          </span>
                          {step.axis && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 ${axisColors[step.axis] || 'bg-slate-100 text-slate-500'}`}>
                              {step.axis}
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${cfg.color}`}>
                          {cfg.icon}
                          <span className="text-[10px] font-bold">{cfg.label}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-0 border-t border-white/60 space-y-3 animate-in fade-in duration-200">
                        {/* Datas */}
                        {(step.startedAt || step.concludedAt) && (
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {step.startedAt && (
                              <div>
                                <p className="text-slate-400 font-bold uppercase mb-0.5">Iniciada em</p>
                                <p className="text-slate-700 font-medium">{new Date(step.startedAt).toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                            {step.concludedAt && (
                              <div>
                                <p className="text-slate-400 font-bold uppercase mb-0.5">Concluída em</p>
                                <p className="text-slate-700 font-medium">{new Date(step.concludedAt).toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {step.notes && (
                          <p className="text-xs text-slate-600 bg-white rounded-lg p-2.5 border border-white/80">{step.notes}</p>
                        )}
                        {/* Ações de status */}
                        <div className="flex gap-1.5 flex-wrap">
                          {(['em_andamento', 'concluida', 'bloqueada'] as StepStatus[]).map((s) => {
                            if (s === step.status) return null;
                            const c = stepStatusConfig[s];
                            return (
                              <button
                                key={s}
                                onClick={() => handleStepStatus(step, s)}
                                disabled={isUpdating}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${c.border} ${c.color} hover:opacity-80`}
                              >
                                {c.icon} {c.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ABA: DOCUMENTOS ── */}
          {activeTab === 'docs' && (
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Vinculados</p>
                <Link to="/templates" className="text-[10px] font-bold text-blue-600 hover:underline">Novo Documento</Link>
              </div>
              {documents.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                  <FileText size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum documento gerado ainda.</p>
                </div>
              ) : (
                documents.map(doc => (
                  <Link to={`/edit/${doc.id}`} key={doc.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0">
                        <FileText size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{doc.title}</span>
                    </div>
                    <ArrowRight size={13} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </Link>
                ))
              )}

              {/* Responsável */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Responsável</p>
                <div className="flex items-center gap-3 p-4 bg-blue-50/30 border border-blue-50 rounded-xl">
                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{process.responsibleName || 'Não atribuído'}</p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Responsável Atual</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
