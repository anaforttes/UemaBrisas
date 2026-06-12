// Tipos compartilhados do fluxo de assinatura proprio REURB.
// A execucao e a verificacao da assinatura ficam integradas ao backend.

export type SignatureStatus = 'pending' | 'partial' | 'completed' | 'rejected';
export type SignerStatus = 'pending' | 'signed' | 'rejected';

export type EventType =
  | 'DOCUMENT_CREATED'
  | 'SIGN_FLOW_STARTED'
  | 'SIGNER_READY'
  | 'SIGN_REQUEST_SENT_TO_PROVIDER'
  | 'SIGNER_AUTH_STARTED'
  | 'SIGNER_AUTH_SUCCESS'
  | 'SIGNATURE_APPLIED'
  | 'SIGN_COMPLETED'
  | 'ERROR';

export interface Signer {
  id: string;
  name: string;
  role: string;
  email: string;
  order: number;
  status: SignerStatus;
  signedAt?: string;
  signatureHash?: string;
  ip?: string;
  certificateCN?: string;
  certificateCPF?: string;
  certificateIssuer?: string;
}

export interface SignatureEvent {
  id: string;
  protocol: string;
  type: EventType;
  timestamp: string;
  actorName?: string;
  ip?: string;
  userAgent?: string;
  documentHash: string;
  prevEventHash: string;
  eventHash: string;
  payload?: unknown;
}

export interface SignatureRecord {
  protocol: string;
  documentTitle: string;
  createdAt: string;
  status: SignatureStatus;
  documentHash: string;
  qrCodeData: string;
  signers: Signer[];
  events: SignatureEvent[];
}
