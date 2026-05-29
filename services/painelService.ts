import { request } from '../shared/services/apiClient';
import { REURBProcess, ProcessStatus } from '../types/index';

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

function apiParaFrontend(p: ProcessoAPI & { meus_papeis?: string[] }): REURBProcess {
  return {
    id: String(p.id),
    protocol: p.protocol,
    protocolado: p.protocolado,
    title: p.title,
    applicant: p.applicant,
    modality: p.modality,
    status: p.status as ProcessStatus,
    progress: p.progress,
    location: p.location,
    municipio: p.municipio,
    estado: p.estado,
    area: p.area,
    responsibleName: p.responsible_name,
    technicianId: String(p.technician_id ?? ''),
    legalId: String(p.legal_id ?? ''),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    meus_papeis: p.meus_papeis ?? [],
  };
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function listarProcessos(params?: {
  search?: string;
  status?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  const query = qs.toString() ? `?${qs}` : '';

  const dados = await request<PaginatedResponse<ProcessoAPI>>(`/api/processos/${query}`);
  return {
    count: dados.count,
    next: dados.next,
    previous: dados.previous,
    results: dados.results.map(apiParaFrontend),
  };
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

export async function deletarProcesso(id: string | number): Promise<void> {
  await request<void>(`/api/processos/${id}/`, { method: 'DELETE' });
}

export interface ProcessoMeu extends ReturnType<typeof apiParaFrontend> {
  meus_papeis: string[];
}

export async function meusProcessos(): Promise<ProcessoMeu[]> {
  const dados = await request<(ProcessoAPI & { meus_papeis: string[] })[]>('/api/processos/meus/');
  return dados.map((p) => ({ ...apiParaFrontend(p), meus_papeis: p.meus_papeis }));
}

export interface AgregacoesAPI {
  total: number;
  progresso_medio: number;
  por_mes: { mes: string; total: number }[];
  por_modalidade: { modality: string; total: number }[];
  por_status: { status: string; total: number }[];
  por_responsavel: { responsible_name: string; total: number }[];
}

export async function buscarAgregacoes(
  periodo: '7d' | '30d' | '90d' | 'all' = 'all',
  modalidade: 'todos' | 'REURB-S' | 'REURB-E' = 'todos'
): Promise<AgregacoesAPI> {
  const qs = new URLSearchParams({ periodo, modalidade });
  return request<AgregacoesAPI>(`/api/painel/agregacoes/?${qs}`);
}

export async function buscarDashboard(statusFiltro?: string) {
  const qs = statusFiltro ? `?status=${encodeURIComponent(statusFiltro)}` : '';
  return request<{
    cards: { ativos: number; em_revisao: number; concluidos: number };
    status: {
      em_edicao: number;
      em_revisao: number;
      pendente: number;
      assinado: number;
      arquivado: number;
    };
    recentes: any[];
  }>(`/api/painel/dashboard/${qs}`);
}
