import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../shared/services/apiClient', () => ({
  request: vi.fn(),
}));

import { request } from '../../shared/services/apiClient';
import {
  listarNotificacoes,
  marcarLida,
  marcarTodasLidas,
} from '../../services/notificacoesService';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listarNotificacoes', () => {
  it('chama endpoint correto sem filtro', async () => {
    mockedRequest.mockResolvedValueOnce({ resultados: [], nao_lidas: 0 });
    await listarNotificacoes();
    expect(mockedRequest).toHaveBeenCalledWith('/api/notificacoes/');
  });

  it('chama endpoint com filtro nao_lidas', async () => {
    mockedRequest.mockResolvedValueOnce({ resultados: [], nao_lidas: 0 });
    await listarNotificacoes(true);
    expect(mockedRequest).toHaveBeenCalledWith('/api/notificacoes/?nao_lidas=1');
  });

  it('retorna estrutura correta', async () => {
    const mockData = {
      resultados: [
        {
          id: 1,
          tipo: 'sistema',
          titulo: 'Teste',
          descricao: '',
          lida: false,
          link: '',
          criado_em: '2025-01-01T00:00:00Z',
        },
      ],
      nao_lidas: 1,
    };
    mockedRequest.mockResolvedValueOnce(mockData);
    const result = await listarNotificacoes();
    expect(result.resultados).toHaveLength(1);
    expect(result.nao_lidas).toBe(1);
  });
});

describe('marcarLida', () => {
  it('chama endpoint PATCH com id correto', async () => {
    mockedRequest.mockResolvedValueOnce({ ok: true });
    await marcarLida(42);
    expect(mockedRequest).toHaveBeenCalledWith('/api/notificacoes/42/lida/', { method: 'PATCH' });
  });
});

describe('marcarTodasLidas', () => {
  it('chama endpoint POST correto', async () => {
    mockedRequest.mockResolvedValueOnce({ marcadas: 3 });
    await marcarTodasLidas();
    expect(mockedRequest).toHaveBeenCalledWith('/api/notificacoes/marcar-todas/', {
      method: 'POST',
    });
  });
});
