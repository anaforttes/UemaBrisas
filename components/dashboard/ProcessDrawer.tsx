import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  User as UserIcon,
  Clock,
  Calendar,
  AlertCircle,
  ChevronRight,
  Upload,
  Trash2,
  Paperclip,
  Plus,
  ArrowRight,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Hammer,
  Scale,
  History,
  Users,
  FolderOpen,
  CheckCheck,
  AlertTriangle,
  XCircle,
  Circle,
} from 'lucide-react';
import { REURBProcess } from '../../types/index';
import { documentoService, DocLista } from '../../services/documentoService';
import { etapasService, EtapaAPI } from '../../services/etapasService';
import { equipeService, MembroEquipe } from '../../services/equipeService';
import { anexosService, AnexoAPI } from '../../services/anexosService';
import { processosService, EventoAPI } from '../../services/processosService';
import { Link, useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessDrawerProps {
  process: REURBProcess | null;
  onClose: () => void;
  onUpdate?: (id: string, dados: Record<string, unknown>) => void;
}

type Aba = 'resumo' | 'etapas' | 'arquivos' | 'historico';

// ─── Constants ────────────────────────────────────────────────────────────────

const ETAPA_STATUS_LABEL: Record<string, string> = {
  concluida: 'Concluída',
  em_andamento: 'Em andamento',
  pendente: 'Pendente',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
};

const EVENTO_ICONE: Record<string, React.ReactNode> = {
  arquivo_adicionado: <Upload size={12} className="text-blue-500" />,
  arquivo_removido: <Trash2 size={12} className="text-red-500" />,
  etapa_status: <CheckCircle2 size={12} className="text-green-600" />,
  equipe_alterada: <Users size={12} className="text-purple-500" />,
  status_alterado: <Shield size={12} className="text-orange-500" />,
  processo_criado: <Plus size={12} className="text-slate-400" />,
  processo_protocolado: <CheckCheck size={12} className="text-green-600" />,
};

const EIXO_ICONE: Record<string, React.ReactNode> = {
  Técnico: <Hammer size={11} className="text-indigo-500" />,
  Jurídico: <Scale size={11} className="text-purple-500" />,
  Social: <Users size={11} className="text-blue-500" />,
  Cartorial: <FileText size={11} className="text-amber-500" />,
  Geral: <Circle size={11} className="text-slate-400" />,
};

const ICONE_TIPO: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/zip': '🗜️',
  'application/x-zip-compressed': '🗜️',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtData = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const fmtDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtTamanho = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const EtapaStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'concluida'
      ? 'bg-green-100 text-green-700'
      : status === 'em_andamento'
        ? 'bg-blue-100 text-blue-700'
        : status === 'bloqueada'
          ? 'bg-red-100 text-red-700'
          : status === 'cancelada'
            ? 'bg-slate-100 text-slate-400'
            : 'bg-slate-100 text-slate-500';
  return (
    <span
      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}
    >
      {ETAPA_STATUS_LABEL[status] ?? status}
    </span>
  );
};

// ─── Modal Aprovação ──────────────────────────────────────────────────────────

interface ModalAprovacaoProps {
  etapa: EtapaAPI;
  proxima: EtapaAPI | null;
  membros: MembroEquipe[];
  onConfirmar: (parecer: string, proximoResponsavelId: number | null) => void;
  onFechar: () => void;
}

const ModalAprovacao: React.FC<ModalAprovacaoProps> = ({
  etapa,
  proxima,
  membros,
  onConfirmar,
  onFechar,
}) => {
  const [parecer, setParecer] = useState('');
  const [proximoResp, setProximoResp] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">Concluir Etapa</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{etapa.nome}</p>
          </div>
        </div>

        {proxima && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4 text-xs text-blue-700">
            <ChevronRight size={13} className="shrink-0" />
            Próxima: <span className="font-bold">{proxima.nome}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Parecer / Justificativa *
            </label>
            <textarea
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="Descreva o resultado ou observações relevantes desta etapa..."
              className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-green-400 focus:outline-none min-h-[90px] resize-none"
            />
          </div>

          {proxima && membros.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Responsável pela próxima etapa
              </label>
              <select
                value={proximoResp ?? ''}
                onChange={(e) => setProximoResp(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                <option value="">Manter responsável atual</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onFechar}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(parecer, proximoResp)}
            disabled={!parecer.trim()}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Etapa Card ───────────────────────────────────────────────────────────────

interface EtapaCardProps {
  etapa: EtapaAPI;
  anexos: AnexoAPI[];
  onAprovar: (etapa: EtapaAPI) => void;
  onUpload: (etapaNumero: number, files: FileList) => void;
  onRemoverAnexo: (id: number) => void;
  onAtualizar: (id: number, dados: Partial<EtapaAPI>) => void;
  uploadandoEtapa: number | null;
}

const EtapaCard: React.FC<EtapaCardProps> = ({
  etapa,
  anexos,
  onAprovar,
  onUpload,
  onRemoverAnexo,
  onAtualizar,
  uploadandoEtapa,
}) => {
  const [expandido, setExpandido] = useState(etapa.status === 'em_andamento');
  const inputRef = useRef<HTMLInputElement>(null);
  const anexosEtapa = anexos.filter((a) => a.etapa_numero === etapa.numero);

  const dotCls =
    etapa.status === 'concluida'
      ? 'bg-green-500 border-green-500'
      : etapa.status === 'em_andamento'
        ? 'bg-blue-600 border-blue-600'
        : etapa.status === 'bloqueada'
          ? 'bg-red-400 border-red-400'
          : etapa.status === 'cancelada'
            ? 'bg-slate-300 border-slate-300'
            : 'bg-white border-slate-300';

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all ${
        etapa.status === 'em_andamento'
          ? 'border-blue-200 bg-blue-50/30'
          : etapa.status === 'concluida'
            ? 'border-green-100 bg-green-50/20'
            : 'border-slate-100 bg-white'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${dotCls}`}
        >
          {etapa.status === 'concluida' && <CheckCircle2 size={11} className="text-white" />}
          {etapa.status === 'em_andamento' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold ${etapa.status === 'pendente' || etapa.status === 'bloqueada' ? 'text-slate-400' : 'text-slate-800'}`}
            >
              {etapa.numero}. {etapa.nome}
            </span>
            <EtapaStatusBadge status={etapa.status} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              {EIXO_ICONE[etapa.eixo]} {etapa.eixo}
            </span>
            {(etapa.data_inicio || etapa.data_conclusao) && (
              <span className="text-[10px] text-slate-400">
                ·{' '}
                {etapa.data_conclusao
                  ? `Concluída ${fmtData(etapa.data_conclusao)}`
                  : `Início ${fmtData(etapa.data_inicio)}`}
              </span>
            )}
            {anexosEtapa.length > 0 && (
              <span className="text-[10px] text-blue-500 font-semibold">
                · {anexosEtapa.length} arquivo{anexosEtapa.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {expandido ? (
          <ChevronUp size={14} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        )}
      </button>

      {/* Body */}
      {expandido && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100/80 pt-3">
          {/* Arquivos desta etapa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Arquivos ({anexosEtapa.length})
              </label>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploadandoEtapa === etapa.numero}
                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 disabled:opacity-50"
              >
                {uploadandoEtapa === etapa.numero ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Upload size={11} />
                )}
                {uploadandoEtapa === etapa.numero ? ' Enviando...' : ' Anexar'}
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onUpload(etapa.numero, e.target.files);
                e.target.value = '';
              }}
            />
            {anexosEtapa.length > 0 ? (
              <div className="space-y-1.5">
                {anexosEtapa.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl group hover:border-slate-200 transition-colors"
                  >
                    <span className="text-sm shrink-0">{ICONE_TIPO[a.tipo] || '📎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 truncate">{a.nome}</p>
                      <p className="text-[9px] text-slate-400">
                        {fmtTamanho(a.tamanho)} · {a.adicionado_por}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Download size={11} />
                      </a>
                      <button
                        onClick={() => onRemoverAnexo(a.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-300 italic">Nenhum arquivo nesta etapa.</p>
            )}
          </div>

          {/* Botão concluir */}
          {etapa.status === 'em_andamento' && (
            <button
              onClick={() => onAprovar(etapa)}
              className="w-full py-2.5 bg-green-600 text-white rounded-xl text-xs font-black tracking-wide hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={13} /> Concluir esta etapa
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const ProcessDrawer: React.FC<ProcessDrawerProps> = ({ process, onClose, onUpdate }) => {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('etapas');
  const [etapas, setEtapas] = useState<EtapaAPI[]>([]);
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [anexos, setAnexos] = useState<AnexoAPI[]>([]);
  const [documentos, setDocumentos] = useState<DocLista[]>([]);
  const [eventos, setEventos] = useState<EventoAPI[]>([]);
  const [uploadandoEtapa, setUploadandoEtapa] = useState<number | null>(null);
  const [uploadandoGeral, setUploadandoGeral] = useState(false);
  const [criandoDoc, setCriandoDoc] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [modalAprovacao, setModalAprovacao] = useState<EtapaAPI | null>(null);
  const [aprovacaoSucesso, setAprovacaoSucesso] = useState(false);
  const [tecnicoId, setTecnicoId] = useState<number | null>(null);
  const [juridicoId, setJuridicoId] = useState<number | null>(null);
  const [salvandoEquipe, setSalvandoEquipe] = useState(false);
  const [protocolando, setProtocolando] = useState(false);
  const inputGeralRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!process) return;
    setTecnicoId((process as any).technician_id ?? null);
    setJuridicoId((process as any).legal_id ?? null);
    carregarDados();
  }, [process?.id]);

  const carregarDados = useCallback(async () => {
    if (!process) return;
    setErroCarregamento(false);
    try {
      const [etapasR, membrosR, anexosR, docsR, eventosR] = await Promise.allSettled([
        etapasService.listar(process.id),
        equipeService.listar(),
        anexosService.listar(process.id),
        documentoService.listarPorProcesso(process.id),
        processosService.listarEventos(process.id),
      ]);
      if (etapasR.status === 'fulfilled') setEtapas(etapasR.value);
      if (membrosR.status === 'fulfilled') setMembros(membrosR.value);
      if (anexosR.status === 'fulfilled') setAnexos(anexosR.value);
      if (docsR.status === 'fulfilled') setDocumentos(docsR.value);
      if (eventosR.status === 'fulfilled') setEventos(eventosR.value);

      if ([etapasR, membrosR, anexosR].every((r) => r.status === 'rejected'))
        setErroCarregamento(true);
    } catch {
      setErroCarregamento(true);
    }
  }, [process?.id]);

  const handleProtocolar = async () => {
    if (!process || protocolando) return;
    setProtocolando(true);
    try {
      const novas = await etapasService.protocolar(process.id);
      setEtapas(novas);
      setEventos((prev) => [
        {
          id: Date.now(),
          tipo: 'processo_protocolado',
          descricao: 'Processo protocolado — etapas criadas.',
          usuario: 'Você',
          dados: {},
          criado_em: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setProtocolando(false);
    }
  };

  const handleAtualizar = async (etapaId: number, dados: Partial<EtapaAPI>) => {
    const atualizada = await etapasService.atualizar(etapaId, dados);
    setEtapas((prev) => prev.map((e) => (e.id === etapaId ? atualizada : e)));
  };

  const handleAprovar = (etapa: EtapaAPI) => setModalAprovacao(etapa);

  const handleConfirmarAprovacao = async (parecer: string, proximoRespId: number | null) => {
    if (!modalAprovacao) return;
    await etapasService.atualizar(modalAprovacao.id, {
      status: 'concluida',
      ...(parecer.trim() ? { observacoes: parecer } : {}),
    });
    const proxima = etapas.find((e) => e.numero === modalAprovacao.numero + 1);
    if (proxima) {
      await etapasService.atualizar(proxima.id, {
        status: 'em_andamento',
        ...(proximoRespId ? { responsavel_id: proximoRespId } : {}),
      });
    }
    setModalAprovacao(null);
    setAprovacaoSucesso(true);
    setTimeout(() => setAprovacaoSucesso(false), 3000);
    await carregarDados();
  };

  const handleUploadEtapa = async (etapaNumero: number, files: FileList) => {
    if (!process) return;
    setUploadandoEtapa(etapaNumero);
    try {
      for (const f of Array.from(files)) {
        const novo = await anexosService.upload(process.id, f, etapaNumero);
        setAnexos((prev) => [novo, ...prev]);
        setEventos((prev) => [
          {
            id: Date.now() + Math.random(),
            tipo: 'arquivo_adicionado',
            descricao: `Arquivo adicionado: ${f.name} (etapa ${etapaNumero})`,
            usuario: 'Você',
            dados: {},
            criado_em: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } finally {
      setUploadandoEtapa(null);
    }
  };

  const handleUploadGeral = async (files: FileList | null) => {
    if (!files || !process || uploadandoGeral) return;
    setUploadandoGeral(true);
    try {
      for (const f of Array.from(files)) {
        const novo = await anexosService.upload(process.id, f, null);
        setAnexos((prev) => [novo, ...prev]);
        setEventos((prev) => [
          {
            id: Date.now() + Math.random(),
            tipo: 'arquivo_adicionado',
            descricao: `Arquivo adicionado: ${f.name}`,
            usuario: 'Você',
            dados: {},
            criado_em: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } finally {
      setUploadandoGeral(false);
    }
  };

  const handleRemoverAnexo = async (id: number) => {
    const a = anexos.find((x) => x.id === id);
    await anexosService.deletar(id);
    setAnexos((prev) => prev.filter((x) => x.id !== id));
    if (a) {
      setEventos((prev) => [
        {
          id: Date.now(),
          tipo: 'arquivo_removido',
          descricao: `Arquivo removido: ${a.nome}`,
          usuario: 'Você',
          dados: {},
          criado_em: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const handleNovoDocumento = async () => {
    if (!process || criandoDoc) return;
    setCriandoDoc(true);
    try {
      const doc = await documentoService.criar({
        titulo: `Documento — ${process.title || process.applicant}`,
        processo_id: process.id,
        conteudo: '<p></p>',
      });
      onClose();
      navigate(`/edit/${doc.id}`);
    } catch {
      setCriandoDoc(false);
    }
  };

  const handleSalvarEquipe = async () => {
    if (!process) return;
    setSalvandoEquipe(true);
    try {
      await processosService.atribuirEquipe(process.id, {
        technician_id: tecnicoId,
        legal_id: juridicoId,
      });
      if (onUpdate) onUpdate(process.id, { technician_id: tecnicoId, legal_id: juridicoId });
      await carregarDados();
    } finally {
      setSalvandoEquipe(false);
    }
  };

  if (!process) return null;

  const etapaAtual = etapas.find((e) => e.status === 'em_andamento');
  const proximaEtapa = etapaAtual
    ? (etapas.find((e) => e.numero === etapaAtual.numero + 1) ?? null)
    : null;
  const anexosGerais = anexos.filter((a) => a.etapa_numero == null);

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'etapas', label: 'Etapas', icon: <CheckCircle2 size={13} /> },
    { id: 'arquivos', label: 'Arquivos', icon: <FolderOpen size={13} /> },
    { id: 'resumo', label: 'Equipe', icon: <Users size={13} /> },
    { id: 'historico', label: 'Histórico', icon: <History size={13} /> },
  ];

  return (
    <>
      {modalAprovacao && (
        <ModalAprovacao
          etapa={modalAprovacao}
          proxima={proximaEtapa}
          membros={membros}
          onConfirmar={handleConfirmarAprovacao}
          onFechar={() => setModalAprovacao(null)}
        />
      )}

      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[110]" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[120] flex flex-col border-l border-slate-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-white/95 backdrop-blur-md shrink-0">
          <div>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">
              Protocolo {process.protocol}
            </span>
            <h3 className="text-lg font-black text-slate-800 leading-tight mt-0.5">
              {process.title || process.applicant}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{process.applicant}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {process.modality}
              </span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {process.status}
              </span>
              {process.location && (
                <span className="text-[9px] text-slate-400 truncate max-w-[140px]">
                  {process.location}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 shrink-0 mt-0.5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-slate-50 shrink-0">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500">Progresso Geral</span>
            <span className="text-[10px] font-black text-blue-600">{process.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${process.progress}%` }}
            />
          </div>
          {aprovacaoSucesso && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-600 font-bold">
              <CheckCircle2 size={11} /> Etapa concluída com sucesso!
            </div>
          )}
        </div>

        {/* Error */}
        {erroCarregamento && (
          <div className="mx-6 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl shrink-0">
            <AlertCircle size={13} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700 flex-1">Falha ao carregar dados.</p>
            <button
              onClick={carregarDados}
              className="text-[10px] font-black text-red-600 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-3 shrink-0">
          {abas.map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold transition-colors ${
                abaAtiva === aba.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {aba.icon} {aba.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* ── ETAPAS ── */}
            {abaAtiva === 'etapas' && (
              <section className="space-y-3">
                {etapas.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">Processo não protocolado</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Protocole para criar as 14 etapas padrão do fluxo REURB.
                      </p>
                    </div>
                    <button
                      onClick={handleProtocolar}
                      disabled={protocolando}
                      className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {protocolando ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ArrowRight size={13} />
                      )}
                      {protocolando ? 'Protocolando...' : 'Protocolar processo'}
                    </button>
                  </div>
                ) : (
                  <>
                    {etapaAtual && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-semibold">
                        <Loader2 size={13} className="animate-spin shrink-0" />
                        Em andamento: <span className="font-black">{etapaAtual.nome}</span>
                        {etapaAtual.responsavel_nome && (
                          <span className="text-blue-500 font-normal">
                            · {etapaAtual.responsavel_nome}
                          </span>
                        )}
                      </div>
                    )}
                    {etapas.map((etapa) => (
                      <EtapaCard
                        key={etapa.id}
                        etapa={etapa}
                        anexos={anexos}
                        onAprovar={handleAprovar}
                        onUpload={handleUploadEtapa}
                        onRemoverAnexo={handleRemoverAnexo}
                        onAtualizar={handleAtualizar}
                        uploadandoEtapa={uploadandoEtapa}
                      />
                    ))}
                  </>
                )}
              </section>
            )}

            {/* ── ARQUIVOS ── */}
            {abaAtiva === 'arquivos' && (
              <section className="space-y-5">
                {/* Documentos gerados */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Documentos gerados ({documentos.length})
                    </h4>
                    <button
                      onClick={handleNovoDocumento}
                      disabled={criandoDoc}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 disabled:opacity-50"
                    >
                      <Plus size={11} /> {criandoDoc ? 'Criando...' : 'Novo'}
                    </button>
                  </div>
                  {documentos.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                      <FileText size={20} className="mx-auto text-slate-200 mb-1.5" />
                      <p className="text-xs text-slate-400">Nenhum documento gerado ainda.</p>
                      <button
                        onClick={handleNovoDocumento}
                        disabled={criandoDoc}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Criar primeiro documento
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documentos.map((doc) => (
                        <Link
                          to={`/edit/${doc.id}`}
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-white transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600">
                              <FileText size={14} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-700">{doc.titulo}</span>
                              <p className="text-[9px] text-slate-400">
                                {doc.status} · v{doc.versao_atual}
                              </p>
                            </div>
                          </div>
                          <ArrowRight
                            size={13}
                            className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arquivos por etapa */}
                {etapas.filter((e) => anexos.some((a) => a.etapa_numero === e.numero)).length >
                  0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Arquivos por etapa
                    </h4>
                    <div className="space-y-3">
                      {etapas
                        .filter((e) => anexos.some((a) => a.etapa_numero === e.numero))
                        .map((etapa) => (
                          <div
                            key={etapa.id}
                            className="border border-slate-100 rounded-xl overflow-hidden"
                          >
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
                              <EtapaStatusBadge status={etapa.status} />
                              <span className="text-xs font-bold text-slate-700">
                                {etapa.numero}. {etapa.nome}
                              </span>
                            </div>
                            <div className="px-3 pb-2 pt-1 space-y-1.5">
                              {anexos
                                .filter((a) => a.etapa_numero === etapa.numero)
                                .map((a) => (
                                  <div
                                    key={a.id}
                                    className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg group hover:border-slate-200"
                                  >
                                    <span className="text-sm shrink-0">
                                      {ICONE_TIPO[a.tipo] || '📎'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-semibold text-slate-700 truncate">
                                        {a.nome}
                                      </p>
                                      <p className="text-[9px] text-slate-400">
                                        {fmtTamanho(a.tamanho)} · {a.adicionado_por} ·{' '}
                                        {fmtData(a.adicionado_em)}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <a
                                        href={a.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      >
                                        <Download size={11} />
                                      </a>
                                      <button
                                        onClick={() => handleRemoverAnexo(a.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Arquivos gerais */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Arquivos gerais ({anexosGerais.length})
                    </h4>
                    <button
                      onClick={() => inputGeralRef.current?.click()}
                      disabled={uploadandoGeral}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 disabled:opacity-50"
                    >
                      {uploadandoGeral ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Upload size={11} />
                      )}
                      {uploadandoGeral ? ' Enviando...' : ' Adicionar'}
                    </button>
                  </div>
                  <input
                    ref={inputGeralRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                    className="hidden"
                    onChange={(e) => {
                      handleUploadGeral(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {anexosGerais.length === 0 ? (
                    <div
                      onClick={() => inputGeralRef.current?.click()}
                      className="p-5 border-2 border-dashed border-slate-100 rounded-2xl text-center cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                    >
                      <Paperclip size={20} className="mx-auto text-slate-300 mb-1.5" />
                      <p className="text-xs text-slate-400">
                        Arraste arquivos ou clique para adicionar
                      </p>
                      <p className="text-[10px] text-slate-300 mt-0.5">PDF, DOC, JPG, PNG, ZIP</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {anexosGerais.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200"
                        >
                          <span className="text-sm shrink-0">{ICONE_TIPO[a.tipo] || '📎'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">
                              {a.nome}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {fmtTamanho(a.tamanho)} · {a.adicionado_por} ·{' '}
                              {fmtData(a.adicionado_em)}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Download size={12} />
                            </a>
                            <button
                              onClick={() => handleRemoverAnexo(a.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── EQUIPE / RESUMO ── */}
            {abaAtiva === 'resumo' && (
              <section className="space-y-5">
                {/* Info processo */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Requerente', value: process.applicant },
                    { label: 'Localização', value: process.location || '—' },
                    { label: 'Área', value: (process as any).area || '—' },
                    { label: 'Abertura', value: fmtData(process.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                        {label}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Atribuição de equipe */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-700">Atribuição de Equipe</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      O técnico e o jurídico terão acesso a este processo.
                    </p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <Hammer size={10} /> Responsável Técnico
                      </label>
                      <select
                        value={tecnicoId ?? ''}
                        onChange={(e) =>
                          setTecnicoId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      >
                        <option value="">Não atribuído</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {m.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <Scale size={10} /> Responsável Jurídico
                      </label>
                      <select
                        value={juridicoId ?? ''}
                        onChange={(e) =>
                          setJuridicoId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      >
                        <option value="">Não atribuído</option>
                        {membros.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {m.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleSalvarEquipe}
                      disabled={salvandoEquipe}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {salvandoEquipe ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Users size={13} />
                      )}
                      {salvandoEquipe ? 'Salvando...' : 'Salvar atribuições'}
                    </button>
                  </div>
                </div>

                {/* Membros da plataforma */}
                {membros.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Membros da plataforma ({membros.length})
                    </h4>
                    <div className="space-y-1.5">
                      {membros.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">
                            {m.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                            <p className="text-[10px] text-slate-400">{m.role}</p>
                          </div>
                          {m.id === tecnicoId && (
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                              Técnico
                            </span>
                          )}
                          {m.id === juridicoId && (
                            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
                              Jurídico
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── HISTÓRICO ── */}
            {abaAtiva === 'historico' && (
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Calendar size={11} className="text-blue-600" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Criado em
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-800">
                      {fmtData(process.createdAt)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Clock size={11} className="text-green-600" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Atualizado
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-800">
                      {fmtData(process.updatedAt)}
                    </p>
                  </div>
                </div>

                {eventos.length === 0 ? (
                  <div className="py-10 text-center">
                    <History size={28} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm font-bold text-slate-400">Nenhum evento registrado.</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Ações como aprovações, uploads e mudanças de equipe aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0 relative before:absolute before:left-[10px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
                    {eventos.map((ev) => (
                      <div key={ev.id} className="flex gap-3 pb-4 relative">
                        <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center z-10 shrink-0 shadow-sm">
                          {EVENTO_ICONE[ev.tipo] ?? <Circle size={10} className="text-slate-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-tight">
                            {ev.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-medium">
                              {ev.usuario}
                            </span>
                            <span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400">
                              {fmtDataHora(ev.criado_em)}
                            </span>
                          </div>
                          {ev.tipo === 'etapa_status' && ev.dados.parecer && (
                            <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 rounded-lg px-2 py-1">
                              "{String(ev.dados.parecer)}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
