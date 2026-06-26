import { API_BASE } from '../shared/services/apiClient';

export interface VerificacaoAssinatura {
  protocolo: string;
  documento: {
    id?: string;
    titulo: string;
    status: string;
    hash: string;
    criado_em?: string;
    atualizado_em?: string;
  };
  assinaturas: Array<{
    ordem: number;
    status: string;
    nome: string;
    email?: string;
    nome_certificado?: string;
    cpf_certificado?: string;
    ac_emissora?: string;
    hash_assinatura?: string;
    assinado_em?: string | null;
  }>;
  origem: 'backend';
}

export function buildSignatureVerificationUrl(protocol: string): string {
  const configuredBase = import.meta.env.VITE_FRONTEND_URL?.trim();
  const base = configuredBase || `${window.location.origin}${window.location.pathname}`;
  const normalizedBase = base.replace(/\/$/, '');
  return `${normalizedBase}/#/signature-verify/${encodeURIComponent(protocol)}`;
}

export async function buscarVerificacaoAssinatura(
  protocol: string
): Promise<VerificacaoAssinatura> {
  const encoded = encodeURIComponent(protocol);
  const response = await fetch(`${API_BASE}/api/documentos/assinaturas/verificar/${encoded}/`);
  if (!response.ok) {
    let message = 'Protocolo nao encontrado no backend.';
    try {
      const data = await response.json();
      message = data.erro ?? data.detail ?? message;
    } catch {
      // Mantem a mensagem padrao.
    }
    throw new Error(message);
  }
  const data = await response.json();
  return { ...data, origem: 'backend' };
}
