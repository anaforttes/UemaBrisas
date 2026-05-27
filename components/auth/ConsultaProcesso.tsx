import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  MapPin,
  User,
  FileText,
  CalendarDays,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { API_BASE } from '../../shared/services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EtapaPublica {
  numero: number;
  nome: string;
  eixo: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada' | 'cancelada';
  data_inicio: string | null;
  data_conclusao: string | null;
}

interface ProcessoPublico {
  protocolo: string;
  titulo: string;
  requerente: string;
  status: string;
  progresso: number;
  modalidade: string;
  municipio: string;
  estado: string;
  endereco: string;
  area: string;
  criado_em: string;
  atualizado_em: string;
  etapas: EtapaPublica[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  Pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Em Andamento': 'bg-blue-100 text-blue-700 border-blue-200',
  Iniciado: 'bg-blue-100 text-blue-700 border-blue-200',
  'Levantamento Técnico': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Análise Jurídica': 'bg-purple-100 text-purple-700 border-purple-200',
  'Em Edital': 'bg-orange-100 text-orange-700 border-orange-200',
  Diligência: 'bg-amber-100 text-amber-700 border-amber-200',
  'Em Análise': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Aprovado: 'bg-green-100 text-green-700 border-green-200',
  Concluído: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Finalizado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cancelado: 'bg-red-100 text-red-700 border-red-200',
  Arquivado: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_DESC: Record<string, { texto: string; icon: React.ReactNode; cor: string }> = {
  Pendente: {
    texto:
      'Seu processo foi registrado com sucesso e está aguardando o início das análises pela equipe técnica.',
    icon: <Clock size={16} />,
    cor: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  },
  Iniciado: {
    texto:
      'O processo foi iniciado e a equipe já tomou ciência. As atividades terão início em breve.',
    icon: <Info size={16} />,
    cor: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  'Em Andamento': {
    texto:
      'As atividades do seu processo estão em curso. A equipe está trabalhando nas próximas etapas.',
    icon: <Loader2 size={16} className="animate-spin" />,
    cor: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  'Levantamento Técnico': {
    texto:
      'A equipe técnica está realizando o levantamento e a caracterização da área para fins de REURB.',
    icon: <Loader2 size={16} className="animate-spin" />,
    cor: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  },
  'Análise Jurídica': {
    texto: 'A equipe jurídica está analisando a documentação e a conformidade legal do processo.',
    icon: <FileText size={16} />,
    cor: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  'Em Edital': {
    texto:
      'O processo está em fase de publicação de edital. Este é um passo obrigatório antes da titulação.',
    icon: <FileText size={16} />,
    cor: 'bg-orange-50 border-orange-200 text-orange-700',
  },
  Diligência: {
    texto:
      'Foram solicitadas diligências complementares. Entre em contato com a prefeitura para verificar o que é necessário.',
    icon: <AlertTriangle size={16} />,
    cor: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  'Em Análise': {
    texto:
      'A documentação está sendo analisada pelos responsáveis. Aguarde o resultado da análise.',
    icon: <Loader2 size={16} className="animate-spin" />,
    cor: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  },
  Aprovado: {
    texto: 'Seu processo foi aprovado! Aguardando a emissão do título de legitimação fundiária.',
    icon: <CheckCircle2 size={16} />,
    cor: 'bg-green-50 border-green-200 text-green-700',
  },
  Concluído: {
    texto: 'Parabéns! Seu processo de regularização fundiária foi concluído com sucesso.',
    icon: <CheckCheck size={16} />,
    cor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  Finalizado: {
    texto: 'Processo finalizado. O título de legitimação fundiária foi emitido.',
    icon: <CheckCheck size={16} />,
    cor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  Cancelado: {
    texto:
      'Este processo foi cancelado. Entre em contato com a prefeitura para obter mais informações.',
    icon: <XCircle size={16} />,
    cor: 'bg-red-50 border-red-200 text-red-700',
  },
  Arquivado: {
    texto: 'Este processo foi arquivado administrativamente.',
    icon: <Info size={16} />,
    cor: 'bg-slate-50 border-slate-200 text-slate-500',
  },
};

// Mapa de fase REURB padrão para mostrar mesmo sem etapas cadastradas
const FASES_REURB = [
  { label: 'Instauração', statuses: ['Pendente', 'Iniciado', 'Em Andamento'] },
  { label: 'Levantamento', statuses: ['Levantamento Técnico'] },
  { label: 'Análise', statuses: ['Análise Jurídica', 'Em Análise', 'Diligência', 'Em Edital'] },
  { label: 'Aprovação', statuses: ['Aprovado'] },
  { label: 'Titulação', statuses: ['Concluído', 'Finalizado'] },
];

function faseAtual(statusProcesso: string): number {
  for (let i = FASES_REURB.length - 1; i >= 0; i--) {
    if (FASES_REURB[i].statuses.includes(statusProcesso)) return i;
  }
  return 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function EtapaIcon({ status }: { status: EtapaPublica['status'] }) {
  if (status === 'concluida') return <CheckCircle2 size={20} className="text-green-500 shrink-0" />;
  if (status === 'em_andamento')
    return <Loader2 size={20} className="text-blue-500 shrink-0 animate-spin" />;
  if (status === 'bloqueada') return <XCircle size={20} className="text-red-400 shrink-0" />;
  if (status === 'cancelada') return <XCircle size={20} className="text-slate-400 shrink-0" />;
  return <Circle size={20} className="text-slate-300 shrink-0" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ConsultaProcesso: React.FC = () => {
  const [protocolo, setProtocolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ProcessoPublico | null>(null);
  const [erro, setErro] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBuscar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const valor = protocolo.trim();
    if (!valor) return;

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      const res = await fetch(`${API_BASE}/api/processos/consulta/${encodeURIComponent(valor)}/`);
      if (res.status === 404) {
        setErro('Protocolo não encontrado. Verifique o número e tente novamente.');
      } else if (!res.ok) {
        setErro('Erro ao consultar. Tente novamente em instantes.');
      } else {
        setResultado((await res.json()) as ProcessoPublico);
      }
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleNovaBusca = () => {
    setResultado(null);
    setErro('');
    setProtocolo('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const fase = resultado ? faseAtual(resultado.status) : -1;
  const isCancelado = resultado?.status === 'Cancelado' || resultado?.status === 'Arquivado';
  const descStatus = resultado ? STATUS_DESC[resultado.status] : null;

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50 p-4 pt-10 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-40" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-40" />

      <div className="w-full max-w-xl z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <Logo size="lg" />
          <h1 className="mt-5 text-2xl font-bold text-slate-800 text-center">
            Consulta de Processo
          </h1>
          <p className="text-slate-400 text-sm text-center mt-1 font-medium">
            Acompanhe o andamento do seu processo de regularização fundiária
          </p>
        </div>

        {/* Search card */}
        <div className="bg-white border border-slate-200 rounded-[28px] shadow-xl overflow-hidden">
          <div className="p-7">
            <form onSubmit={handleBuscar} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Número do Protocolo
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={protocolo}
                    onChange={(e) => setProtocolo(e.target.value)}
                    placeholder="Ex: 0003-2026"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono tracking-wider transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
                  <AlertCircle size={14} className="shrink-0" /> {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !protocolo.trim()}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Consultando...
                  </>
                ) : (
                  <>
                    <Search size={15} /> Consultar
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ─── Result ─────────────────────────────────────────────────────── */}
          {resultado && (
            <div className="border-t border-slate-100">
              {/* Protocol + status header */}
              <div className="px-7 pt-6 pb-4 bg-slate-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                      Protocolo
                    </p>
                    <p className="text-3xl font-black text-slate-800 font-mono tracking-wide leading-none">
                      {resultado.protocolo}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 mt-1">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_BADGE[resultado.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    >
                      {resultado.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {resultado.modalidade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-7 py-5 space-y-5">
                {/* Status description */}
                {descStatus && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-2xl border ${descStatus.cor}`}
                  >
                    <span className="mt-0.5 shrink-0">{descStatus.icon}</span>
                    <p className="text-sm font-medium leading-relaxed">{descStatus.texto}</p>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {resultado.titulo && (
                    <div className="col-span-2 flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                      <FileText size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Área / Descrição
                        </p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {resultado.titulo}
                        </p>
                      </div>
                    </div>
                  )}

                  {resultado.requerente && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                      <User size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Requerente
                        </p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {resultado.requerente}
                        </p>
                      </div>
                    </div>
                  )}

                  {(resultado.municipio || resultado.estado) && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                      <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Município
                        </p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {[resultado.municipio, resultado.estado].filter(Boolean).join(' — ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {resultado.endereco && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                      <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Endereço
                        </p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {resultado.endereco}
                        </p>
                      </div>
                    </div>
                  )}

                  {resultado.area && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                      <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Área
                        </p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {resultado.area}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                    <CalendarDays size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Abertura
                      </p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">
                        {formatDate(resultado.criado_em)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-2xl">
                    <RefreshCw size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Última atualização
                      </p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">
                        {formatDate(resultado.atualizado_em)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500">Progresso Geral</span>
                    <span className="text-sm font-black text-blue-600">{resultado.progresso}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                      style={{ width: `${resultado.progresso}%` }}
                    />
                  </div>
                </div>

                {/* REURB phases stepper */}
                {!isCancelado && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Fase do Processo
                    </p>
                    <div className="flex items-center gap-0">
                      {FASES_REURB.map((f, i) => {
                        const concluida = i < fase;
                        const atual = i === fase;
                        return (
                          <React.Fragment key={f.label}>
                            <div className="flex flex-col items-center flex-1 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                  concluida
                                    ? 'bg-green-500 border-green-500'
                                    : atual
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'bg-white border-slate-200'
                                }`}
                              >
                                {concluida ? (
                                  <CheckCircle2 size={14} className="text-white" />
                                ) : atual ? (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                ) : (
                                  <div className="w-2 h-2 bg-slate-200 rounded-full" />
                                )}
                              </div>
                              <p
                                className={`text-[9px] font-bold mt-1.5 text-center leading-tight ${
                                  concluida
                                    ? 'text-green-600'
                                    : atual
                                      ? 'text-blue-600'
                                      : 'text-slate-300'
                                }`}
                              >
                                {f.label}
                              </p>
                            </div>
                            {i < FASES_REURB.length - 1 && (
                              <div
                                className={`h-0.5 flex-1 mb-4 transition-all ${i < fase ? 'bg-green-400' : 'bg-slate-150'}`}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Etapas detalhadas */}
                {resultado.etapas.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Etapas Detalhadas
                    </p>
                    <div className="space-y-0">
                      {resultado.etapas.map((etapa, idx) => {
                        const isLast = idx === resultado.etapas.length - 1;
                        return (
                          <div key={etapa.numero} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <EtapaIcon status={etapa.status} />
                              {!isLast && (
                                <div
                                  className={`w-0.5 flex-1 my-1 min-h-[16px] ${etapa.status === 'concluida' ? 'bg-green-200' : 'bg-slate-100'}`}
                                />
                              )}
                            </div>
                            <div className="pb-4">
                              <p
                                className={`text-sm font-semibold leading-tight ${etapa.status === 'pendente' ? 'text-slate-400' : 'text-slate-700'}`}
                              >
                                {etapa.nome}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {etapa.eixo !== 'Geral' && (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {etapa.eixo}
                                  </span>
                                )}
                                {etapa.status === 'em_andamento' && (
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    Em andamento
                                  </span>
                                )}
                                {etapa.status === 'concluida' && etapa.data_conclusao && (
                                  <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                                    <Clock size={10} /> Concluída em{' '}
                                    {formatDate(etapa.data_conclusao)}
                                  </span>
                                )}
                                {etapa.status === 'em_andamento' && etapa.data_inicio && (
                                  <span className="text-[10px] text-blue-500 font-semibold flex items-center gap-1">
                                    <Clock size={10} /> Iniciada em {formatDate(etapa.data_inicio)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Nova consulta */}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleNovaBusca}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Nova consulta <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Back to login */}
        <div className="mt-7 mb-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-500 font-semibold hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  );
};
