import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/services/apiClient', () => ({
  request: vi.fn(),
}));

import { request } from '../../shared/services/apiClient';
import { buscarAgregacoes, listarProcessos } from '../../services/painelService';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buscarAgregacoes', () => {
  const mockAgregacoes = {
    total: 10,
    progresso_medio: 55,
    por_mes: [{ mes: '2025-01', total: 3 }],
    por_modalidade: [{ modality: 'REURB-S', total: 6 }],
    por_status: [{ status: 'Pendente', total: 4 }],
    por_responsavel: [{ responsible_name: 'Ana', total: 5 }],
  };

  it('chama endpoint com parâmetros padrão', async () => {
    mockedRequest.mockResolvedValueOnce(mockAgregacoes);
    await buscarAgregacoes();
    expect(mockedRequest).toHaveBeenCalledWith(expect.stringContaining('/api/painel/agregacoes/'));
  });

  it('inclui periodo e modalidade na query string', async () => {
    mockedRequest.mockResolvedValueOnce(mockAgregacoes);
    await buscarAgregacoes('30d', 'REURB-S');
    const url = mockedRequest.mock.calls[0][0] as string;
    expect(url).toContain('periodo=30d');
    expect(url).toContain('modalidade=REURB-S');
  });

  it('retorna estrutura completa', async () => {
    mockedRequest.mockResolvedValueOnce(mockAgregacoes);
    const result = await buscarAgregacoes();
    expect(result).toHaveProperty('total', 10);
    expect(result).toHaveProperty('por_mes');
    expect(result).toHaveProperty('por_status');
    expect(result).toHaveProperty('por_responsavel');
  });
});

describe('listarProcessos', () => {
  it('retorna lista paginada mapeada para frontend', async () => {
    mockedRequest.mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          protocol: '0001-2025',
          protocolado: false,
          title: 'Proc A',
          applicant: 'João',
          modality: 'REURB-S',
          status: 'Pendente',
          progress: 0,
          location: '',
          municipio: '',
          estado: '',
          area: '',
          responsible_name: 'Ana',
          technician_id: null,
          legal_id: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ],
    });
    const result = await listarProcessos();
    expect(result.count).toBe(1);
    expect(result.results[0].id).toBe('1');
    expect(result.results[0].title).toBe('Proc A');
  });
});
