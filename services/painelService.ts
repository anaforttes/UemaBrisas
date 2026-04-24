// painelService — integração com a API Django
// Todos os dados vêm de http://localhost:8000/api/processos/

import { dbService } from './databaseService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('reurb_access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('reurb_refresh_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/api/autenticacao/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('reurb_access_token', data.access);
    if (data.refresh) localStorage.setItem('reurb_refresh_token', data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

function buildHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let token = getToken();
  let res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...buildHeaders(token), ...(init?.headers ?? {}) },
  });

  // Token expirado → tenta renovar e refaz a requisição uma vez
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { ...buildHeaders(token), ...(init?.headers ?? {}) },
      });
    }
  }

  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(
      (erro as any).detail ?? (erro as any).message ?? `Erro ${res.status}`
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Tipos locais (mapeamento backend → frontend) ─────────────────────────────

export interface ProcessoAPI {
  id: number;
  protocol: string;
  protocolado: boolean;
  title: string;
  applicant: string;
  modality: 'REURB-S' | 'REURB-E';
  status: string;
  progress: number;
  location: string;
  municipio: string;
  estado: string;
  area: string;
  responsible_name: string;
  technician_id: number | null;
  legal_id: number | null;
  created_at: string;
  updated_at: string;
}

// Converte o formato da API para o formato que o frontend (REURBProcess) espera
function apiParaFrontend(p: ProcessoAPI) {
  return {
    id:              String(p.id),
    protocol:        p.protocol,
    protocolado:     p.protocolado,
    title:           p.title,
    applicant:       p.applicant,
    modality:        p.modality,
    status:          p.status as any,
    progress:        p.progress,
    location:        p.location,
    municipio:       p.municipio,
    estado:          p.estado,
    area:            p.area,
    responsibleName: p.responsible_name,
    technicianId:    String(p.technician_id ?? ''),
    legalId:         String(p.legal_id ?? ''),
    createdAt:       p.created_at,
    updatedAt:       p.updated_at,
  };
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function listarProcessos(params?: { search?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString() ? `?${qs}` : '';

  const dados = await request<ProcessoAPI[]>(`/api/processos/${query}`);
  return dados.map(apiParaFrontend);
}

export async function obterProcesso(id: string | number) {
  const dado = await request<ProcessoAPI>(`/api/processos/${id}/`);
  return apiParaFrontend(dado);
}

export async function criarProcesso(data: {
  title: string;
  applicant: string;
  modality: string;
  location?: string;
  municipio?: string;
  estado?: string;
  area?: string;
  responsible_name?: string;
  technician_id?: number | null;
  legal_id?: number | null;
}) {
  if (!getToken()) {
    // Sem token JWT — usa localStorage como fallback
    const p = dbService.processes.insert({
      title:           data.title,
      applicant:       data.applicant,
      modality:        data.modality as any,
      location:        data.location    ?? '',
      municipio:       data.municipio   ?? '',
      estado:          data.estado      ?? '',
      area:            data.area        ?? '',
      responsibleName: data.responsible_name ?? '',
      protocolado:     false,
      progress:        0,
      status:          'Pendente' as any,
    });
    return p;
  }

  const dado = await request<ProcessoAPI>('/api/processos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return apiParaFrontend(dado);
}

export async function atualizarProcesso(id: string | number, patch: Partial<ProcessoAPI>) {
  const dado = await request<ProcessoAPI>(`/api/processos/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return apiParaFrontend(dado);
}

export async function deletarProcesso(id: string | number) {
  await request<void>(`/api/processos/${id}/`, { method: 'DELETE' });
}

export async function buscarDashboard() {
  const [processos, stats] = await Promise.all([
    listarProcessos(),
    request<{ total: number; ativos: number; concluidos: number; em_revisao: number }>(
      '/api/processos/stats/'
    ),
  ]);

  const recentes = [...processos]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return {
    cards: {
      ativos:     stats.ativos,
      em_revisao: stats.em_revisao,
      concluidos: stats.concluidos,
    },
    recentes,
  };
}
