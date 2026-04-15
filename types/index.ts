
export type UserRole = 'Admin' | 'Técnico' | 'Jurídico' | 'Atendente' | 'Gestor' | 'Auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
  password?: string;
  quota?: {
    limit: number;
    used: number;
    resetAt: string;
  };
}

export enum ProcessStatus {
  INICIADO = 'Iniciado',
  LEVANTAMENTO = 'Levantamento Técnico',
  ANALISE_JURIDICA = 'Análise Jurídica',
  EDITAL = 'Em Edital',
  FINALIZADO = 'Finalizado',
  ARQUIVADO = 'Arquivado'
}

export interface REURBProcess {
  id: string;
  title: string;
  applicant: string;
  modality: 'REURB-S' | 'REURB-E';
  status: ProcessStatus;
  createdAt: string;
  updatedAt: string;
  technicianId: string;
  legalId: string;
  area: string;
  progress: number;
}

export interface DocumentModel {
  id: string;
  name: string;
  type: string;
  version: string;
  lastUpdated: string;
}

export interface REURBDocument {
  id: string;
  processId: string;
  title: string;
  content: string;
  status: 'Draft' | 'Review' | 'Approved' | 'Signed';
  authorId: string;
  version: number;
  updatedAt: string;
}
