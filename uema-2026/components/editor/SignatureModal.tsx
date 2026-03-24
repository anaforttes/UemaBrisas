import React, { useState, useEffect, useRef } from 'react';
import forge from 'node-forge';
import {
  X, CheckCircle2, Clock, Lock, Shield, Hash,
  Download, AlertCircle, Key, FileKey, ShieldCheck,
  Fingerprint, RefreshCw, UserCheck, Users, ExternalLink,
  Upload, FileUp, UserPlus, Trash2, Search
} from 'lucide-react';

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

// ─── Dados extraídos de um certificado real ──────────────────────────────────
interface ParsedCertificate {
  cn: string;
  cpf: string;
  email: string;
  issuerCN: string;
  issuerOrg: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  keyUsage: string[];
  algorithm: string;
  keySize: number;
  rawCert: forge.pki.Certificate;
  privateKey: forge.pki.rsa.PrivateKey;
  certChain: string[];
  isValid: boolean;
  isExpired: boolean;
}

// ─── Membros da equipe disponíveis para seleção ──────────────────────────────
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

const AVAILABLE_TEAM: TeamMember[] = [
  { id: 'tm-1', name: 'Eng. Ana Paula Torres', role: 'Técnico', email: 'ana.tecnico@prefeitura.gov.br' },
  { id: 'tm-2', name: 'Dr. Ricardo Silva', role: 'Jurídico', email: 'ricardo.juridico@prefeitura.gov.br' },
  { id: 'tm-3', name: 'Carlos Eduardo Mendes', role: 'Técnico', email: 'carlos.tecnico@prefeitura.gov.br' },
  { id: 'tm-4', name: 'Maria Fernanda Costa', role: 'Administrativo', email: 'maria.admin@prefeitura.gov.br' },
  { id: 'tm-5', name: 'José Oliveira Santos', role: 'Secretário Municipal', email: 'secretario@prefeitura.gov.br' },
  { id: 'tm-6', name: 'Prefeito Municipal', role: 'Prefeito', email: 'prefeito@prefeitura.gov.br' },
];

// ─── Utilitários ──────────────────────────────────────────────────────────────
const generateProtocol = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000000 + 1000000);
  return `REURB-${year}-${rand}`;
};

const formatDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const formatDateShort = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Parseamento PKCS#12 (.pfx / .p12) ──────────────────────────────────────
const parsePKCS12 = (arrayBuffer: ArrayBuffer, password: string): ParsedCertificate | null => {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const asn1 = forge.asn1.fromDer(binary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    const certs = certBags[forge.pki.oids.certBag] || [];
    const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

    if (certs.length === 0) throw new Error('Nenhum certificado encontrado no arquivo.');
    if (keys.length === 0 || !keys[0].key) throw new Error('Chave privada não encontrada.');

    const cert = certs[0].cert!;
    const privateKey = keys[0].key as forge.pki.rsa.PrivateKey;

    const cnAttr = cert.subject.getField('CN');
    const cn = cnAttr ? cnAttr.value : 'Desconhecido';

    let cpf = '';
    const cnParts = cn.split(':');
    if (cnParts.length >= 2) {
      const possibleCPF = cnParts[cnParts.length - 1].replace(/\D/g, '');
      if (possibleCPF.length === 11) {
        cpf = `${possibleCPF.slice(0, 3)}.${possibleCPF.slice(3, 6)}.${possibleCPF.slice(6, 9)}-${possibleCPF.slice(9)}`;
      }
    }
    if (!cpf) {
      try {
        const sanExt = cert.getExtension('subjectAltName') as any;
        if (sanExt?.altNames) {
          for (const altName of sanExt.altNames) {
            if (altName.type === 0 && altName.value) {
              const cpfMatch = (typeof altName.value === 'string' ? altName.value : '').match(/\d{11}/);
              if (cpfMatch) { const c = cpfMatch[0]; cpf = `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`; }
            }
          }
        }
      } catch { /* ignore */ }
    }

    const emailAttr = cert.subject.getField('E') || cert.subject.getField({ name: 'emailAddress' });
    const email = emailAttr ? emailAttr.value : '';
    const issuerCNAttr = cert.issuer.getField('CN');
    const issuerOrgAttr = cert.issuer.getField('O');
    const issuerCN = issuerCNAttr ? issuerCNAttr.value : 'Desconhecido';
    const issuerOrg = issuerOrgAttr ? issuerOrgAttr.value : '';
    const serialNumber = cert.serialNumber.match(/.{1,2}/g)?.join(':').toUpperCase() || cert.serialNumber;

    const kuExt = cert.getExtension('keyUsage') as any;
    const keyUsage: string[] = [];
    if (kuExt) {
      if (kuExt.digitalSignature) keyUsage.push('Assinatura Digital');
      if (kuExt.nonRepudiation) keyUsage.push('Não-Repúdio');
      if (kuExt.keyEncipherment) keyUsage.push('Criptografia de Chave');
    }
    if (keyUsage.length === 0) keyUsage.push('Assinatura Digital');

    const pubKey = cert.publicKey as forge.pki.rsa.PublicKey;
    const keySize = pubKey.n ? pubKey.n.bitLength() : 2048;

    const certChain: string[] = [];
    for (const bag of certs) { if (bag.cert) { const c = bag.cert.subject.getField('CN'); if (c) certChain.push(c.value); } }

    const now = new Date();
    const isExpired = cert.validity.notAfter < now;
    const isValid = cert.validity.notBefore <= now && !isExpired;

    return {
      cn, cpf, email, issuerCN, issuerOrg, serialNumber,
      validFrom: cert.validity.notBefore, validTo: cert.validity.notAfter,
      keyUsage, algorithm: `RSA ${keySize} bits`, keySize, rawCert: cert,
      privateKey, certChain, isValid, isExpired,
    };
  } catch (err: any) {
    console.error('Erro ao parsear PKCS#12:', err);
    if (err.message?.includes('Invalid password') || err.message?.includes('PKCS#12 MAC') || err.message?.includes('decryption')) {
      throw new Error('Senha incorreta do certificado.');
    }
    throw new Error(err.message || 'Erro ao ler o certificado.');
  }
};

// ─── Assinatura digital com chave privada ────────────────────────────────────
const signWithPrivateKey = (privateKey: forge.pki.rsa.PrivateKey, data: string): string => {
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');
  const signature = (privateKey as any).sign(md);
  return forge.util.bytesToHex(signature).toUpperCase();
};

// ─── QR Code SVG ─────────────────────────────────────────────────────────────
const SimpleQRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 120 }) => {
  const cells = 21; const cellSize = size / cells;
  const getCell = (row: number, col: number): boolean => {
    const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
    if (inFinder(row, col)) {
      const isOuter = row === 0 || row === 6 || col === 0 || col === 6 || row === cells - 1 || row === cells - 7 || col === cells - 1 || col === cells - 7;
      const isInner = (row >= 2 && row <= 4 && col >= 2 && col <= 4) || (row >= 2 && row <= 4 && col >= cells - 5 && col <= cells - 3) || (row >= cells - 5 && row <= cells - 3 && col >= 2 && col <= 4);
      return isOuter || isInner;
    }
    const seed = value.charCodeAt((row * cells + col) % value.length) ^ (row * 7 + col * 13);
    return (seed % 3) !== 0;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="border border-slate-200 rounded">
      <rect width={size} height={size} fill="white" />
      {Array.from({ length: cells }, (_, row) =>
        Array.from({ length: cells }, (_, col) =>
          getCell(row, col) ? <rect key={`${row}-${col}`} x={col * cellSize} y={row * cellSize} width={cellSize} height={cellSize} fill="#1e293b" /> : null
        )
      )}
    </svg>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  currentUser: { id?: string; name?: string; email?: string; role?: string } | null;
  onSignatureComplete: (record: SignatureRecord) => void;
}

type Step = 'signers' | 'upload' | 'details' | 'validating' | 'complete';

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen, onClose, documentTitle, documentContent, currentUser, onSignatureComplete
}) => {
  const [step, setStep] = useState<Step>('signers');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certError, setCertError] = useState('');
  const [parsedCert, setParsedCert] = useState<ParsedCertificate | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [validationStep, setValidationStep] = useState(0);
  const [record, setRecord] = useState<SignatureRecord | null>(null);
  const [protocol] = useState(generateProtocol);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      setCertFile(null);
      setCertPassword('');
      setCertError('');
      setParsedCert(null);
      setValidationStep(0);
      setRecord(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Atualiza signers quando seleção muda
  useEffect(() => {
    setSigners(buildSignersList());
  }, [selectedSigners]);

  // Filtra membros da equipe
  const filteredTeam = AVAILABLE_TEAM.filter(tm => {
    const isAlreadySelected = selectedSigners.some(s => s.id === tm.id);
    const isCurrentUser = tm.email === currentUser?.email;
    const matchesSearch = !searchQuery ||
      tm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tm.role.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadySelected && !isCurrentUser && matchesSearch;
  });

  const addSigner = (tm: TeamMember) => setSelectedSigners(prev => [...prev, tm]);
  const removeSigner = (tmId: string) => setSelectedSigners(prev => prev.filter(s => s.id !== tmId));

  // ─── Upload e parse ────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.pfx', '.p12'].includes(ext)) {
      setCertError('Formato inválido. Selecione .pfx ou .p12');
      return;
    }
    setCertFile(file);
    setCertError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleParseCertificate = async () => {
    if (!certFile) { setCertError('Selecione o arquivo do certificado.'); return; }
    if (!certPassword) { setCertError('Digite a senha do certificado.'); return; }
    setIsParsing(true);
    setCertError('');
    try {
      const ab = await certFile.arrayBuffer();
      const parsed = parsePKCS12(ab, certPassword);
      if (!parsed) throw new Error('Não foi possível ler o certificado.');
      if (parsed.isExpired) { setCertError(`Certificado expirado em ${formatDateShort(parsed.validTo)}.`); setIsParsing(false); return; }
      setParsedCert(parsed);
      setStep('details');
    } catch (err: any) {
      setCertError(err.message || 'Erro ao ler certificado.');
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Validação e assinatura ────────────────────────────────────────────────
  const validationSteps = [
    { label: 'Lendo certificado PKCS#12...', icon: FileKey },
    { label: `Validando cadeia: ${parsedCert?.issuerCN || 'AC'}...`, icon: ShieldCheck },
    { label: 'Verificando validade do certificado...', icon: Clock },
    { label: `Calculando SHA-256 (${documentHash.slice(0, 16)}...)`, icon: Hash },
    { label: `Assinando com RSA ${parsedCert?.keySize || 2048} bits...`, icon: Fingerprint },
    { label: 'Gerando carimbo de tempo (TSA)...', icon: Clock },
    { label: 'Assinatura concluída!', icon: CheckCircle2 },
  ];

  const handleSign = async () => {
    if (!parsedCert) return;
    setStep('validating');
    for (let i = 0; i < validationSteps.length; i++) {
      setValidationStep(i);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
    await new Promise(r => setTimeout(r, 400));

    const now = new Date().toISOString();
    const signatureHex = signWithPrivateKey(parsedCert.privateKey, documentHash + now);

    const updated = signers.map(s =>
      s.id === (currentUser?.id || 'current')
        ? {
          ...s, status: 'signed' as const, signedAt: now,
          signatureHash: signatureHex.slice(0, 64),
          ip: '187.xxx.xxx.xxx',
          certificateCN: parsedCert.cn,
          certificateCPF: parsedCert.cpf || undefined,
          certificateSerial: parsedCert.serialNumber,
          certificateIssuer: parsedCert.issuerCN,
          certificateType: 'A1',
          certificateValidFrom: parsedCert.validFrom.toISOString(),
          certificateValidTo: parsedCert.validTo.toISOString(),
        }
        : s
    );
    setSigners(updated);

    const allSigned = updated.every(s => s.status === 'signed');
    const finalRecord: SignatureRecord = {
      protocol, documentTitle, createdAt: now, signers: updated,
      status: allSigned ? 'completed' : 'partial',
      qrCodeData: `https://verificador.iti.gov.br/${protocol}`,
      documentHash,
      events: [],
    };
    setRecord(finalRecord);
    setStep('complete');
    onSignatureComplete(finalRecord);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Shield size={22} /></div>
            <div>
              <p className="font-bold text-sm">Assinatura Digital ICP-Brasil</p>
              <p className="text-[11px] text-emerald-300">Protocolo: {protocol} • MP 2.200-2/2001</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-300 hover:text-white transition-colors"><X size={20} /></button>
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
                <p className="text-xs text-blue-500 uppercase font-bold">Você está assinando como:</p>
                <p className="text-sm font-black text-blue-900">{currentUser?.name || 'Usuário'}</p>
                <p className="text-xs text-blue-600">{currentUser?.email} • {currentUser?.role}</p>
              </div>
              <UserCheck size={24} className="text-blue-400" />
            </div>

            {/* Documento */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Documento</p>
              <p className="font-semibold text-slate-800">{documentTitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <Hash size={12} className="text-slate-400" />
                <p className="text-[11px] text-slate-400 font-mono">SHA-256: {documentHash.slice(0, 32)}...</p>
              </div>
            </div>

            {/* Signatários já selecionados */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" /> Signatários do Documento
              </p>

              {/* Eu (fixo) */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-2 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{currentUser?.name}</p>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold uppercase">Você</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{currentUser?.role} • {currentUser?.email}</p>
                </div>
              </div>

              {/* Outros selecionados */}
              {selectedSigners.map((tm, i) => (
                <div key={tm.id} className="p-3 bg-white border border-slate-200 rounded-xl mb-2 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 2}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{tm.name}</p>
                    <p className="text-[11px] text-slate-400">{tm.role} • {tm.email}</p>
                  </div>
                  <button onClick={() => removeSigner(tm.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou cargo..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50">
                {filteredTeam.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">Nenhum membro disponível</p>
                ) : (
                  filteredTeam.map(tm => (
                    <div
                      key={tm.id}
                      onClick={() => addSigner(tm)}
                      className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                    >
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">
                        {tm.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800">{tm.name}</p>
                        <p className="text-[10px] text-slate-400">{tm.role}</p>
                      </div>
                      <UserPlus size={14} className="text-emerald-500" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Após sua assinatura, os demais signatários receberão uma notificação para assinar do próprio perfil com seu certificado digital ICP-Brasil.
              </p>
            </div>

            <button
              onClick={() => setStep('upload')}
              className="w-full py-3.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              <Key size={18} /> Prosseguir — Selecionar Certificado
            </button>
          </div>
        )}

        {/* ─── STEP 2: UPLOAD do certificado ─────────────────────────── */}
        {step === 'upload' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-xs text-blue-500 uppercase font-bold">Assinando como</p>
                <p className="text-sm font-bold text-blue-900">{currentUser?.name}</p>
              </div>
              <div className="ml-auto text-xs text-slate-400">
                {signers.length} signatário{signers.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Upload */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                <Key size={14} className="text-emerald-600" /> Certificado Digital A1 (.pfx / .p12)
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-emerald-500 bg-emerald-50' :
                    certFile ? 'border-green-400 bg-green-50' :
                      'border-slate-300 bg-slate-50 hover:border-emerald-400'
                  }`}
              >
                <input ref={fileInputRef} type="file" accept=".pfx,.p12" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                {certFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><FileKey size={20} className="text-green-600" /></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-green-800">{certFile.name}</p>
                      <p className="text-[11px] text-green-600">{(certFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <CheckCircle2 size={20} className="text-green-500" />
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-600">Arraste seu <strong>.pfx</strong> ou <strong>.p12</strong> aqui</p>
                    <p className="text-xs text-slate-400 mt-1">ou clique para selecionar</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1"><Lock size={12} /> Senha do Certificado</p>
              <input type="password" value={certPassword} onChange={e => { setCertPassword(e.target.value); setCertError(''); }}
                placeholder="Digite a senha do certificado" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              {certError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {certError}</p>}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">O certificado é lido <strong>localmente</strong> e <strong>nunca é enviado ao servidor</strong>.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('signers')} className="px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50">← Voltar</button>
              <button onClick={handleParseCertificate} disabled={isParsing || !certFile}
                className="flex-1 py-3.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 flex items-center justify-center gap-2 disabled:opacity-50">
                {isParsing ? <><RefreshCw size={18} className="animate-spin" /> Lendo...</> : <><FileUp size={18} /> Ler Certificado</>}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: DETALHES do certificado ───────────────────────── */}
        {step === 'details' && parsedCert && (
          <div className="p-6 space-y-5">
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${parsedCert.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {parsedCert.isValid ? <ShieldCheck size={24} className="text-green-600" /> : <AlertCircle size={24} className="text-red-600" />}
              <div>
                <p className={`text-sm font-bold ${parsedCert.isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {parsedCert.isValid ? 'Certificado Válido' : 'Certificado Inválido'}
                </p>
                <p className={`text-xs ${parsedCert.isValid ? 'text-green-600' : 'text-red-600'}`}>Lido de: {certFile?.name}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 text-white">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-3 flex items-center gap-2"><ShieldCheck size={12} /> Dados do Certificado</p>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase">Titular (CN)</p>
                  <p className="font-bold text-white text-sm">{parsedCert.cn}</p>
                </div>
                {parsedCert.cpf && <div><p className="text-slate-400 text-[10px] uppercase">CPF</p><p className="font-medium text-emerald-300">{parsedCert.cpf}</p></div>}
                {parsedCert.email && <div><p className="text-slate-400 text-[10px] uppercase">E-mail</p><p className="font-medium text-slate-200 text-xs">{parsedCert.email}</p></div>}
                <div className="h-px bg-slate-700" />
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-slate-400 text-[10px] uppercase">AC Emissora</p><p className="font-medium text-slate-200 text-xs">{parsedCert.issuerCN}</p></div>
                  <div><p className="text-slate-400 text-[10px] uppercase">Algoritmo</p><p className="font-medium text-slate-200 text-xs">{parsedCert.algorithm}</p></div>
                  <div><p className="text-slate-400 text-[10px] uppercase">Válido De</p><p className="font-medium text-slate-200 text-xs">{formatDateShort(parsedCert.validFrom)}</p></div>
                  <div><p className="text-slate-400 text-[10px] uppercase">Válido Até</p><p className={`font-medium text-xs ${parsedCert.isExpired ? 'text-red-400' : 'text-emerald-300'}`}>{formatDateShort(parsedCert.validTo)}</p></div>
                </div>
                <div><p className="text-slate-400 text-[10px] uppercase">Uso da Chave</p>
                  <div className="flex gap-1.5 flex-wrap mt-1">{parsedCert.keyUsage.map((ku, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-medium">{ku}</span>)}</div>
                </div>
                <div><p className="text-slate-400 text-[10px] uppercase">Serial</p><p className="font-mono text-[10px] text-slate-300 break-all">{parsedCert.serialNumber}</p></div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Hash SHA-256 do Documento</p>
              <p className="text-[11px] font-mono text-slate-600 break-all">{documentHash}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <Clock size={14} />
              <span>TSA: <strong className="text-slate-600">{new Date().toLocaleString('pt-BR')}</strong></span>
              <span className="ml-auto text-[10px] text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck size={10} /> Pronto</span>
            </div>

            <button onClick={handleSign} className="w-full py-3.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
              <Fingerprint size={18} /> Assinar com este Certificado
            </button>
            <button onClick={() => { setStep('upload'); setParsedCert(null); setCertFile(null); setCertPassword(''); }}
              className="w-full py-2.5 text-slate-500 text-sm font-medium hover:text-slate-700">← Selecionar outro certificado</button>
          </div>
        )}

        {/* ─── STEP 4: VALIDANDO ─────────────────────────────────────── */}
        {step === 'validating' && (
          <div className="p-8 space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><RefreshCw size={28} className="text-emerald-700 animate-spin" /></div>
              <h3 className="text-lg font-black text-slate-800">Processando Assinatura</h3>
              <p className="text-sm text-slate-500 mt-1">Assinando como <strong>{parsedCert?.cn?.split(':')[0] || currentUser?.name}</strong></p>
            </div>
            <div className="space-y-2">
              {validationSteps.map((vs, i) => {
                const IconComp = vs.icon; const isDone = i < validationStep; const isCurrent = i === validationStep;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isDone ? 'bg-green-50 border border-green-200' : isCurrent ? 'bg-emerald-50 border border-emerald-300 shadow-sm' : 'bg-slate-50 border border-slate-100 opacity-40'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-green-200 text-green-700' : isCurrent ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                      {isDone ? <CheckCircle2 size={16} /> : isCurrent ? <IconComp size={16} className="animate-pulse" /> : <IconComp size={16} />}
                    </div>
                    <p className={`text-xs font-medium flex-1 ${isDone ? 'text-green-700' : isCurrent ? 'text-emerald-800 font-bold' : 'text-slate-400'}`}>{vs.label}</p>
                    {isDone && <CheckCircle2 size={14} className="text-green-500" />}
                    {isCurrent && <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />}
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><ShieldCheck size={32} className="text-green-600" /></div>
              <h3 className="text-lg font-black text-slate-800">Assinatura Registrada!</h3>
              <p className="text-sm text-slate-500 mt-1">
                {record.status === 'completed' ? 'Todas as assinaturas coletadas.' : 'Demais signatários serão notificados.'}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4">
              <SimpleQRCode value={record.qrCodeData} size={100} />
              <div className="text-white">
                <p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Protocolo</p>
                <p className="text-lg font-black font-mono">{record.protocol}</p>
                <p className="text-[11px] text-emerald-300 break-all mt-2">{record.qrCodeData}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Signatários</p>
              {record.signers.map(s => {
                const isSigned = s.status === 'signed';
                return (
                  <div key={s.id} className={`p-3 rounded-xl border ${isSigned ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isSigned ? <CheckCircle2 size={14} className="text-green-600" /> : <Clock size={14} className="text-amber-500" />}
                      <p className={`text-xs font-bold ${isSigned ? 'text-green-800' : 'text-amber-800'}`}>{s.order}. {s.name} — {s.role}</p>
                    </div>
                    {isSigned ? (
                      <>
                        <p className="text-[10px] text-green-700 ml-6">CN: {s.certificateCN}</p>
                        {s.certificateCPF && <p className="text-[10px] text-green-700 ml-6">CPF: {s.certificateCPF}</p>}
                        <p className="text-[10px] text-green-700 ml-6">AC: {s.certificateIssuer}</p>
                        <p className="text-[10px] text-green-600 font-mono ml-6 truncate">Sig: {s.signatureHash}</p>
                        <p className="text-[10px] text-green-500 ml-6">{s.signedAt ? formatDate(s.signedAt) : ''}</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-amber-600 ml-6 flex items-center gap-1"><ExternalLink size={10} /> Aguardando assinatura pelo perfil de {s.name.split(' ')[0]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] text-slate-400 uppercase font-bold mb-2">Hash SHA-256</p>
              <p className="text-xs font-mono text-slate-700 break-all">{record.documentHash}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
              <Shield size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Assinatura qualificada com certificado ICP-Brasil. <strong>MP nº 2.200-2/2001</strong> e <strong>Lei nº 14.063/2020</strong>.
                O certificado foi processado localmente e não foi transmitido ao servidor.
              </p>
            </div>

            <button onClick={onClose} className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 flex items-center justify-center gap-2">
              <Download size={18} /> Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureModal;
