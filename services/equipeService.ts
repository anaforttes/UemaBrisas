import { request } from '../shared/services/apiClient';

export interface MembroEquipe {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const equipeService = {
  listar: (): Promise<MembroEquipe[]> => request<MembroEquipe[]>('/api/equipe/'),
};
