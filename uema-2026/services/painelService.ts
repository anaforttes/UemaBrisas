// painelService — versão local/mock
// Todos os dados vêm do dbService (localStorage), sem chamada ao backend Django.

import { dbService } from './databaseService';

export async function buscarDashboard() {
  const processos = dbService.processes.selectAll();

  const ativos     = processos.filter(p => !['Concluído', 'Arquivado', 'Concluido'].includes(String(p.status))).length;
  const em_revisao = processos.filter(p => String(p.status).toLowerCase().includes('revis')).length;
  const concluidos = processos.filter(p => ['Concluído', 'Concluido'].includes(String(p.status))).length;

  // Últimos 10 processos ordenados por data de atualização
  const recentes = [...processos]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? '').getTime()
                  - new Date(a.updatedAt ?? a.createdAt ?? '').getTime())
    .slice(0, 10);

  return {
    cards: { ativos, em_revisao, concluidos },
    recentes,
  };
}

export async function criarProcesso(data: any) {
  // Salva localmente via dbService
  const novoProcesso = dbService.processes.insert({
    title:      data.titulo       ?? data.title      ?? 'Novo Processo',
    applicant:  data.requerente   ?? data.applicant  ?? '',
    modality:   data.modalidade   ?? data.modality   ?? 'REURB-S',
    status:     data.status       ?? 'Em Andamento',
    area:       data.area         ?? '',
    municipio:  data.municipio    ?? '',
    estado:     data.estado       ?? '',
    progress:   10,
  });

  return novoProcesso;
}