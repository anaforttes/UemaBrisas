import { request } from '../shared/services/apiClient';

export interface MonitoramentoLogin {
  tentativas: number;
  sucessos: number;
  falhas: number;
  taxa_sucesso: number;
  atualizado_em: string;
}

export const authMonitoramentoService = {
  obter: async (): Promise<MonitoramentoLogin> => {
    return request<MonitoramentoLogin>('/api/autenticacao/monitoramento-login/');
  },
};
