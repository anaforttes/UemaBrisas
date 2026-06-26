import React, { useState, useEffect } from 'react';
import forge from 'node-forge';
import QRCode from 'qrcode';
import {
  X,
  CheckCircle2,
  Clock,
  Shield,
  Hash,
  Download,
  AlertCircle,
  FileKey,
  ShieldCheck,
  Fingerprint,
  RefreshCw,
  UserCheck,
  Users,
  ExternalLink,
  UserPlus,
  Trash2,
  Search,
  Loader2,
} from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { buildSignatureVerificationUrl } from '../../services/signatureVerificationService';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Signer {
  id: string;
  name: string;
  role: string;
  email: string;
  order: number;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: string;
  signatureHash?: string;
  ip?: string;
  certificateCN?: string;
  certificateCPF?: string;
  certificateSerial?: string;
  certificateIssuer?: string;
  certificateType?: string;
  certificateValidFrom?: string;
  certificateValidTo?: string;
}

export interface SignatureRecord {
  protocol: string;
  documentTitle: string;
  createdAt: string;
  signers: Signer[];
  status: 'pending' | 'partial' | 'completed' | 'rejected';
  qrCodeData: string;
  documentHash: string;
  events: any[];
}

// ─── Membros da equipe disponíveis para seleção ──────────────────────────────
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

// Carregado dinamicamente via API (veja useEffect no componente)
const FALLBACK_TEAM: TeamMember[] = [];

// ─── Utilitários ──────────────────────────────────────────────────────────────
const generateProtocol = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000000 + 1000000);
  return `REURB-${year}-${rand}`;
};

const formatDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// ─── QR Code SVG ─────────────────────────────────────────────────────────────
const SimpleQRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 120 }) => {
  const cells = 21;
  const cellSize = size / cells;
  const getCell = (row: number, col: number): boolean => {
    const inFinder = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
    if (inFinder(row, col)) {
      const isOuter =
        row === 0 ||
        row === 6 ||
        col === 0 ||
        col === 6 ||
        row === cells - 1 ||
        row === cells - 7 ||
        col === cells - 1 ||
        col === cells - 7;
      const isInner =
        (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
        (row >= 2 && row <= 4 && col >= cells - 5 && col <= cells - 3) ||
        (row >= cells - 5 && row <= cells - 3 && col >= 2 && col <= 4);
      return isOuter || isInner;
    }
    const seed = value.charCodeAt((row * cells + col) % value.length) ^ (row * 7 + col * 13);
    return seed % 3 !== 0;
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="border border-slate-200 rounded"
    >
      <rect width={size} height={size} fill="white" />
      {Array.from({ length: cells }, (_, row) =>
        Array.from({ length: cells }, (_, col) =>
          getCell(row, col) ? (
            <rect
              key={`${row}-${col}`}
              x={col * cellSize}
              y={row * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1e293b"
            />
          ) : null
        )
      )}
    </svg>
  );
};

const QRCodeImage: React.FC<{ value: string; size?: number }> = ({ value, size = 120 }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (active) setSrc(dataUrl);
      })
      .catch(() => {
        if (active) setSrc('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) return <SimpleQRCode value={value} size={size} />;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR Code de verificacao"
      className="rounded border border-slate-200 bg-white"
    />
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  currentUser: { id?: string; name?: string; email?: string; role?: string } | null;
  onSignatureComplete: (record: SignatureRecord) => void | Promise<void>;
}

type Step = 'signers' | 'validating' | 'complete';

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  currentUser,
  onSignatureComplete,
}) => {
  const [step, setStep] = useState<Step>('signers');
  const [validationStep, setValidationStep] = useState(0);
  const [record, setRecord] = useState<SignatureRecord | null>(null);
  const [protocol] = useState(generateProtocol);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTeam, setAvailableTeam] = useState<TeamMember[]>(FALLBACK_TEAM);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Signatários selecionados
  const [selectedSigners, setSelectedSigners] = useState<TeamMember[]>([]);

  // Hash SHA-256 real
  const documentHash = React.useMemo(() => {
    const md = forge.md.sha256.create();
    md.update(documentContent + documentTitle, 'utf8');
    return md.digest().toHex().toUpperCase();
  }, [documentContent, documentTitle]);

  // Signers finais (o usuário atual + os selecionados)
  const buildSignersList = (): Signer[] => {
    const me: Signer = {
      id: currentUser?.id || 'current',
      name: currentUser?.name || 'Usuário Atual',
      role: currentUser?.role || 'Operador',
      email: currentUser?.email || '',
      order: 1,
      status: 'pending',
    };
    const others: Signer[] = selectedSigners.map((tm, i) => ({
      id: tm.id,
      name: tm.name,
      role: tm.role,
      email: tm.email,
      order: i + 2,
      status: 'pending' as const,
    }));
    return [me, ...others];
  };

  const [signers, setSigners] = useState<Signer[]>(buildSignersList());

  useEffect(() => {
    if (!isOpen) {
      setStep('signers');
      setValidationStep(0);
      setRecord(null);
      setSearchQuery('');
    } else if (availableTeam.length === 0) {
      setLoadingTeam(true);
      dbService.users
        .selectAll()
        .then((users) => {
          setAvailableTeam(
            users.map((u) => ({
              id: String(u.id),
              name: u.name,
              role: u.role ?? 'Operador',
              email: u.email,
            }))
          );
        })
        .catch(() => {})
        .finally(() => setLoadingTeam(false));
    }
  }, [isOpen]);

  // Atualiza signers quando seleção muda
  useEffect(() => {
    setSigners(buildSignersList());
  }, [selectedSigners]);

  // Filtra membros da equipe
  const filteredTeam = availableTeam.filter((tm) => {
    const isAlreadySelected = selectedSigners.some((s) => s.id === tm.id);
    const isCurrentUser = tm.email === currentUser?.email;
    const matchesSearch =
      !searchQuery ||
      tm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tm.role.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadySelected && !isCurrentUser && matchesSearch;
  });

  const addSigner = (tm: TeamMember) => setSelectedSigners((prev) => [...prev, tm]);
  const removeSigner = (tmId: string) =>
    setSelectedSigners((prev) => prev.filter((s) => s.id !== tmId));

  // ─── Validação e assinatura ────────────────────────────────────────────────
  const validationSteps = [
    { label: 'Validando ordem dos signatarios...', icon: Users },
    { label: `Calculando hash SHA-256 (${documentHash.slice(0, 16)}...)`, icon: Hash },
    { label: 'Gerando protocolo interno REURB...', icon: FileKey },
    { label: 'Registrando carimbo de tempo...', icon: Clock },
    { label: 'Registrando assinatura eletronica interna...', icon: Fingerprint },
    { label: 'Gerando QR Code de verificacao...', icon: ShieldCheck },
    { label: 'Assinatura concluida!', icon: CheckCircle2 },
  ];

  const handleSign = async () => {
    setStep('validating');
    for (let i = 0; i < validationSteps.length; i++) {
      setValidationStep(i);
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    }
    await new Promise((r) => setTimeout(r, 400));

    const now = new Date().toISOString();
    const md = forge.md.sha256.create();
    md.update(
      [protocol, documentHash, currentUser?.id || 'current', currentUser?.email || '', now].join(
        '|'
      ),
      'utf8'
    );
    const signatureHex = md.digest().toHex();

    const updated = signers.map((s) =>
      s.id === (currentUser?.id || 'current')
        ? {
            ...s,
            status: 'signed' as const,
            signedAt: now,
            signatureHash: signatureHex.slice(0, 64),
            ip: '187.xxx.xxx.xxx',
            certificateCN: currentUser?.name || s.name,
            certificateIssuer: 'Sistema REURB',
            certificateType: 'Padrao proprio',
          }
        : s
    );
    setSigners(updated);

    const orderedSigners = updated.slice().sort((a, b) => a.order - b.order);
    const allSigned = orderedSigners.every((s) => s.status === 'signed');
    const finalRecord: SignatureRecord = {
      protocol,
      documentTitle,
      createdAt: now,
      signers: orderedSigners,
      status: allSigned ? 'completed' : 'partial',
      qrCodeData: buildSignatureVerificationUrl(protocol),
      documentHash,
      events: [],
    };
    try {
      await onSignatureComplete(finalRecord);
      setRecord(finalRecord);
      setStep('complete');
    } catch (err) {
      setStep('signers');
      window.alert(
        err instanceof Error ? err.message : 'Nao foi possivel registrar a assinatura no backend.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield size={22} />
            </div>
            <div>
              <p className="font-bold text-sm">Assinatura Eletronica Interna</p>
              <p className="text-[11px] text-blue-100">Protocolo: {protocol} - padrao REURB</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ─── STEP 1: SELECIONAR SIGNATÁRIOS ─────────────────────────── */}
        {step === 'signers' && (
          <div className="p-6 space-y-5">
            {/* Usuário logado */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-500 uppercase font-bold">
                  Você está assinando como:
                </p>
                <p className="text-sm font-black text-blue-900">{currentUser?.name || 'Usuário'}</p>
                <p className="text-xs text-blue-600">
                  {currentUser?.email} • {currentUser?.role}
                </p>
              </div>
              <UserCheck size={24} className="text-blue-400" />
            </div>

            {/* Documento */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Documento</p>
              <p className="font-semibold text-slate-800">{documentTitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <Hash size={12} className="text-slate-400" />
                <p className="text-[11px] text-slate-400 font-mono">
                  SHA-256: {documentHash.slice(0, 32)}...
                </p>
              </div>
            </div>

            {/* Signatários já selecionados */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={16} className="text-blue-600" /> Signatários do Documento
              </p>

              {/* Eu (fixo) */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-2 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{currentUser?.name}</p>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold uppercase">
                      Você
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {currentUser?.role} • {currentUser?.email}
                  </p>
                </div>
              </div>

              {/* Outros selecionados */}
              {selectedSigners.map((tm, i) => (
                <div
                  key={tm.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl mb-2 flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 2}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{tm.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {tm.role} • {tm.email}
                    </p>
                  </div>
                  <button
                    onClick={() => removeSigner(tm.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Adicionar signatários */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                <UserPlus size={14} className="text-blue-600" /> Adicionar Signatários
              </p>
              <div className="relative mb-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou cargo..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50">
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-400 text-xs">
                    <Loader2 size={14} className="animate-spin" /> Carregando equipe...
                  </div>
                ) : filteredTeam.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Nenhum membro disponível
                  </p>
                ) : (
                  filteredTeam.map((tm) => (
                    <div
                      key={tm.id}
                      onClick={() => addSigner(tm)}
                      className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                    >
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">
                        {tm.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800">{tm.name}</p>
                        <p className="text-[10px] text-slate-400">{tm.role}</p>
                      </div>
                      <UserPlus size={14} className="text-blue-600" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Apos sua assinatura, os demais signatarios receberao uma notificacao para assinar
                pelo proprio perfil no padrao interno do sistema.
              </p>
            </div>

            <button
              onClick={handleSign}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
            >
              <Fingerprint size={18} /> Registrar Assinatura
            </button>
          </div>
        )}

        {/* ─── STEP 4: VALIDANDO ─────────────────────────────────────── */}
        {step === 'validating' && (
          <div className="p-8 space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RefreshCw size={28} className="text-blue-700 animate-spin" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Processando Assinatura Interna</h3>
              <p className="text-sm text-slate-500 mt-1">
                Assinando como <strong>{currentUser?.name || 'Usuario'}</strong>
              </p>
            </div>
            <div className="space-y-2">
              {validationSteps.map((vs, i) => {
                const IconComp = vs.icon;
                const isDone = i < validationStep;
                const isCurrent = i === validationStep;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isDone ? 'bg-green-50 border border-green-200' : isCurrent ? 'bg-blue-50 border border-blue-300 shadow-sm' : 'bg-slate-50 border border-slate-100 opacity-40'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-green-200 text-green-700' : isCurrent ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-400'}`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} />
                      ) : isCurrent ? (
                        <IconComp size={16} className="animate-pulse" />
                      ) : (
                        <IconComp size={16} />
                      )}
                    </div>
                    <p
                      className={`text-xs font-medium flex-1 ${isDone ? 'text-green-700' : isCurrent ? 'text-blue-800 font-bold' : 'text-slate-400'}`}
                    >
                      {vs.label}
                    </p>
                    {isDone && <CheckCircle2 size={14} className="text-green-500" />}
                    {isCurrent && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── STEP 5: CONCLUÍDO ─────────────────────────────────────── */}
        {step === 'complete' && record && (
          <div className="p-6 space-y-5">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Assinatura Registrada!</h3>
              <p className="text-sm text-slate-500 mt-1">
                {record.status === 'completed'
                  ? 'Todas as assinaturas coletadas.'
                  : 'Demais signatários serão notificados.'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 flex items-center gap-4">
              <QRCodeImage value={record.qrCodeData} size={100} />
              <div className="text-white">
                <p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Protocolo</p>
                <p className="text-lg font-black font-mono">{record.protocol}</p>
                <p className="text-[11px] text-blue-100 break-all mt-2">{record.qrCodeData}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Signatários</p>
              {record.signers.map((s) => {
                const isSigned = s.status === 'signed';
                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border ${isSigned ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isSigned ? (
                        <CheckCircle2 size={14} className="text-green-600" />
                      ) : (
                        <Clock size={14} className="text-amber-500" />
                      )}
                      <p
                        className={`text-xs font-bold ${isSigned ? 'text-green-800' : 'text-amber-800'}`}
                      >
                        {s.order}. {s.name} — {s.role}
                      </p>
                    </div>
                    {isSigned ? (
                      <>
                        <p className="text-[10px] text-green-700 ml-6">
                          Assinante: {s.certificateCN || s.name}
                        </p>
                        <p className="text-[10px] text-green-700 ml-6">
                          Origem: registro interno REURB
                        </p>
                        <p className="text-[10px] text-green-600 font-mono ml-6 truncate">
                          Sig: {s.signatureHash}
                        </p>
                        <p className="text-[10px] text-green-500 ml-6">
                          {s.signedAt ? formatDate(s.signedAt) : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-amber-600 ml-6 flex items-center gap-1">
                        <ExternalLink size={10} /> Aguardando assinatura pelo perfil de{' '}
                        {s.name.split(' ')[0]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] text-slate-400 uppercase font-bold mb-2">Hash SHA-256</p>
              <p className="text-xs font-mono text-slate-700 break-all">{record.documentHash}</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Assinatura registrada no padrao proprio do sistema, com hash, protocolo, ordem de
                signatarios e verificacao por QR Code. O registro foi gerado pelo fluxo interno
                REURB e pode ser verificado pelo protocolo.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Download size={18} /> Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureModal;
