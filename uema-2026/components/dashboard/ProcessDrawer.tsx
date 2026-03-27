import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, CheckCircle2, ArrowRight, User as UserIcon, Clock, Calendar, AlertCircle, ChevronRight, Upload, Trash2, Paperclip } from 'lucide-react';
import { REURBProcess, REURBEtapa, EtapaStatus } from '../../types/index';
import { dbService } from '../../services/databaseService';
import { Link } from 'react-router-dom';

interface ProcessDrawerProps {
  process: REURBProcess | null;
  onClose: () => void;
}

type Aba = 'etapas' | 'documentos' | 'timeline' | 'equipe' | 'anexos';

// ─── Tipo Anexo ───────────────────────────────────────────────────────────────

interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  base64: string;
  adicionadoEm: string;
  adicionadoPor: string;
}

const ETAPA_COR: Record<string, string> = {
  concluida:    'bg-green-500',
  em_andamento: 'bg-blue-600',
  pendente:     'bg-slate-200',
  bloqueada:    'bg-red-400',
  cancelada:    'bg-slate-300',
};

const ETAPA_LABEL: Record<string, string> = {
  concluida:    'Concluída',
  em_andamento: 'Em andamento',
  pendente:     'Pendente',
  bloqueada:    'Bloqueada',
  cancelada:    'Cancelada',
};

const formatarData = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatarTamanho = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ICONE_TIPO: Record<string, string> = {
  'application/pdf':    '📄',
  'image/jpeg':         '🖼️',
  'image/png':          '🖼️',
  'image/webp':         '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/zip':                  '🗜️',
  'application/x-zip-compressed':     '🗜️',
  'application/octet-stream':         '🗜️',
};

// ─── Modal de Aprovação ───────────────────────────────────────────────────────

interface ModalAprovacaoProps {
  etapaAtual: REURBEtapa;
  proximaEtapa: REURBEtapa | null;
  onConfirmar: (parecer: string) => void;
  onFechar: () => void;
}

const ModalAprovacao: React.FC<ModalAprovacaoProps> = ({ etapaAtual, proximaEtapa, onConfirmar, onFechar }) => {
  const [parecer, setParecer] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Aprovar Etapa</h3>
            <p className="text-sm text-slate-500 mt-1">
              Concluir: <span className="font-bold text-slate-700">{etapaAtual.nome}</span>
            </p>
          </div>
        </div>

        {proximaEtapa && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5">
            <ChevronRight size={14} className="text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">
              Próxima etapa: <span className="font-bold">{proximaEtapa.nome}</span>
            </p>
          </div>
        )}

        <div className="mb-6">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
            Parecer / Observações
          </label>
          <textarea
            value={parecer}
            onChange={e => setParecer(e.target.value)}
            placeholder="Descreva o resultado da etapa ou observações relevantes..."
            className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-green-500 focus:outline-none min-h-[100px] resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onConfirmar(parecer)} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
            Confirmar Aprovação
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const ProcessDrawer: React.FC<ProcessDrawerProps> = ({ process, onClose }) => {
  const [documents, setDocuments]                       = useState<any[]>([]);
  const [etapas, setEtapas]                             = useState<REURBEtapa[]>([]);
  const [abaAtiva, setAbaAtiva]                         = useState<Aba>('etapas');
  const [auditoria, setAuditoria]                       = useState<any[]>([]);
  const [mostrarModalAprovacao, setMostrarModalAprovacao] = useState(false);
  const [aprovacaoSucesso, setAprovacaoSucesso]         = useState(false);
  const [anexos, setAnexos]                             = useState<Anexo[]>([]);
  const [dragAtivo, setDragAtivo]                       = useState(false);
  const inputRef                                        = useRef<HTMLInputElement>(null);

  const currentUser = JSON.parse(localStorage.getItem('reurb_current_user') || '{}');

  useEffect(() => {
    if (!process) return;
    carregarDados();
  }, [process]);

  const carregarDados = () => {
    if (!process) return;
    setDocuments(dbService.documents.findByProcessId(process.id));
    setEtapas(dbService.etapas.findByProcessId(process.id));
    setAuditoria(dbService.auditoria.findByEntidade(process.id));
    setAprovacaoSucesso(false);

    // Carrega anexos do localStorage
    const key = `anexos_${process.id}`;
    const saved = localStorage.getItem(key);
    setAnexos(saved ? JSON.parse(saved) : []);
  };

  const salvarAnexos = (novosAnexos: Anexo[]) => {
    if (!process) return;
    localStorage.setItem(`anexos_${process.id}`, JSON.stringify(novosAnexos));
    setAnexos(novosAnexos);
  };

  const handleArquivos = (files: FileList | null) => {
    if (!files || !process) return;
    const lista = Array.from(files);

    lista.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const novoAnexo: Anexo = {
          id: `anx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          base64: e.target?.result as string,
          adicionadoEm: new Date().toISOString(),
          adicionadoPor: currentUser.name || 'Usuário',
        };
        setAnexos(prev => {
          const atualizados = [...prev, novoAnexo];
          localStorage.setItem(`anexos_${process.id}`, JSON.stringify(atualizados));
          return atualizados;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoverAnexo = (id: string) => {
    const atualizados = anexos.filter(a => a.id !== id);
    salvarAnexos(atualizados);
  };

  const handleDownload = (anexo: Anexo) => {
    const link = document.createElement('a');
    link.href = anexo.base64;
    link.download = anexo.nome;
    link.click();
  };

  if (!process) return null;

  const etapaAtual   = etapas.find(e => e.status === 'em_andamento') || null;
  const proximaEtapa = etapaAtual
    ? etapas.find(e => e.numero === etapaAtual.numero + 1) || null
    : null;

  const steps = [
    { label: 'Instauração',      status: 'done'                                     },
    { label: 'Levantamento',     status: process.progress > 30 ? 'done' : 'doing'  },
    { label: 'Análise Jurídica', status: process.progress > 60 ? 'done' : 'todo'   },
    { label: 'Titulação',        status: process.progress === 100 ? 'done' : 'todo' },
  ];

  const abas: { id: Aba; label: string }[] = [
    { id: 'etapas',     label: 'Etapas'     },
    { id: 'documentos', label: 'Docs'       },
    { id: 'anexos',     label: 'Anexos'     },
    { id: 'timeline',   label: 'Timeline'   },
    { id: 'equipe',     label: 'Equipe'     },
  ];

  const handleConfirmarAprovacao = (parecer: string) => {
    if (!etapaAtual) return;
    dbService.etapas.updateStatus(etapaAtual.id, 'concluida' as EtapaStatus, currentUser.id || 'u-admin', currentUser.name || 'Administrador');
    if (parecer.trim()) dbService.etapas.atualizarObservacoes(etapaAtual.id, parecer);
    if (proximaEtapa) dbService.etapas.updateStatus(proximaEtapa.id, 'em_andamento' as EtapaStatus, currentUser.id || 'u-admin', currentUser.name || 'Administrador');
    setMostrarModalAprovacao(false);
    setAprovacaoSucesso(true);
    carregarDados();
  };

  return (
    <>
      {mostrarModalAprovacao && etapaAtual && (
        <ModalAprovacao
          etapaAtual={etapaAtual}
          proximaEtapa={proximaEtapa}
          onConfirmar={handleConfirmarAprovacao}
          onFechar={() => setMostrarModalAprovacao(false)}
        />
      )}

      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[110] animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[120] animate-in slide-in-from-right duration-500 overflow-y-auto border-l border-slate-100">

        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Protocolo {process.protocol}</span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{process.applicant}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{process.modality}</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{process.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="px-8 py-4 border-b border-slate-50">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">Progresso Geral</span>
            <span className="text-xs font-black text-blue-600">{process.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${process.progress}%` }} />
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-100 px-4">
          {abas.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex-1 py-3 text-[11px] font-bold transition-colors ${
                abaAtiva === aba.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6">

          {/* ── Aba Etapas ── */}
          {abaAtiva === 'etapas' && (
            <section>
              {etapas.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {etapas.map((etapa, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 shrink-0 ${ETAPA_COR[etapa.status] || 'bg-slate-200'}`}>
                        {etapa.status === 'concluida' && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className={`text-sm font-bold ${etapa.status === 'pendente' ? 'text-slate-400' : 'text-slate-800'}`}>
                          {etapa.numero}. {etapa.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            etapa.status === 'concluida'    ? 'bg-green-100 text-green-700' :
                            etapa.status === 'em_andamento' ? 'bg-blue-100 text-blue-700'  :
                            etapa.status === 'bloqueada'    ? 'bg-red-100 text-red-700'    :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {ETAPA_LABEL[etapa.status]}
                          </span>
                          {etapa.responsavelNome && <span className="text-[10px] text-slate-400">{etapa.responsavelNome}</span>}
                        </div>
                        {etapa.dataInicio && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Início: {formatarData(etapa.dataInicio)}
                            {etapa.dataConclusao && ` · Fim: ${formatarData(etapa.dataConclusao)}`}
                          </p>
                        )}
                        {etapa.observacoes && <p className="text-[10px] text-slate-500 mt-1 italic">{etapa.observacoes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                        step.status === 'done' ? 'bg-green-500' : step.status === 'doing' ? 'bg-blue-600' : 'bg-slate-200'
                      }`}>
                        {step.status === 'done' && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${step.status === 'todo' ? 'text-slate-400' : 'text-slate-800'}`}>{step.label}</p>
                        {step.status === 'doing' && <span className="text-[10px] text-blue-600 font-bold uppercase">Em andamento</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Aba Documentos ── */}
          {abaAtiva === 'documentos' && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos Vinculados</h4>
                <Link to="/templates" className="text-[10px] font-bold text-blue-600 hover:underline">Novo Documento</Link>
              </div>
              {documents.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                  <FileText size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum documento gerado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <Link to={`/edit/${doc.id}`} key={doc.id}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-700">{doc.title}</span>
                          <p className="text-[10px] text-slate-400">{doc.status}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Aba Anexos ── */}
          {abaAtiva === 'anexos' && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Anexos ({anexos.length})
                </h4>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Upload size={12} /> Adicionar
                </button>
              </div>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                className="hidden"
                onChange={e => handleArquivos(e.target.files)}
              />

              {/* Área de drag and drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragAtivo(true); }}
                onDragLeave={() => setDragAtivo(false)}
                onDrop={(e) => { e.preventDefault(); setDragAtivo(false); handleArquivos(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all mb-4 ${
                  dragAtivo ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <Upload size={24} className={`mx-auto mb-2 ${dragAtivo ? 'text-blue-500' : 'text-slate-300'}`} />
                <p className="text-xs font-bold text-slate-500">Arraste arquivos ou clique para selecionar</p>
                <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, DOCX, JPG, PNG — até 5MB por arquivo</p>
              </div>

              {/* Lista de anexos */}
              {anexos.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                  <Paperclip size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum anexo adicionado ainda.</p>
                  <p className="text-[10px] text-slate-300 mt-1">Plantas, memoriais, laudos, fotos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {anexos.map(anexo => (
                    <div key={anexo.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-slate-200 transition-all group">
                      <span className="text-xl shrink-0">{ICONE_TIPO[anexo.tipo] || '📎'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{anexo.nome}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatarTamanho(anexo.tamanho)} · {formatarData(anexo.adicionadoEm)} · {anexo.adicionadoPor}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDownload(anexo)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Baixar"
                        >
                          <ArrowRight size={12} />
                        </button>
                        <button
                          onClick={() => handleRemoverAnexo(anexo.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Aba Linha do Tempo ── */}
          {abaAtiva === 'timeline' && (
            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Linha do Tempo</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={12} className="text-blue-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Criado em</span>
                  </div>
                  <p className="text-sm font-black text-slate-800">{formatarData(process.createdAt)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={12} className="text-green-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Atualizado em</span>
                  </div>
                  <p className="text-sm font-black text-slate-800">{formatarData(process.updatedAt)}</p>
                </div>
              </div>

              {auditoria.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                  <Clock size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum evento registrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {auditoria.map((log, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className="w-6 h-6 rounded-full bg-blue-100 border-4 border-white shadow-sm flex items-center justify-center z-10 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-xs font-bold text-slate-800">{log.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{log.usuarioNome}</span>
                          <span className="text-[10px] text-slate-300">·</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Aba Equipe ── */}
          {abaAtiva === 'equipe' && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50/30 border border-blue-50 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <UserIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{process.responsibleName || 'Não atribuído'}</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Responsável Atual</p>
                </div>
              </div>
              {!process.responsibleName && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">Nenhum responsável atribuído a este processo.</p>
                </div>
              )}
            </section>
          )}

          {/* Botão Ações de Aprovação */}
          <div className="pt-4 space-y-3">
            {aprovacaoSucesso && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <p className="text-xs text-green-700 font-bold">Etapa aprovada com sucesso!</p>
              </div>
            )}
            <button
              onClick={() => etapaAtual ? setMostrarModalAprovacao(true) : null}
              disabled={!etapaAtual}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {etapaAtual ? `Aprovar: ${etapaAtual.nome}` : 'Nenhuma etapa em andamento'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};