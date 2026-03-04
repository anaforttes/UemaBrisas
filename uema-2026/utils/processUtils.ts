import { ProcessStatus } from '../types';

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    [ProcessStatus.INICIAL]:         'bg-slate-50 text-slate-500 border-slate-200',
    [ProcessStatus.INICIADO]:        'bg-blue-50 text-blue-600 border-blue-200',
    [ProcessStatus.EM_ANALISE]:      'bg-yellow-50 text-yellow-600 border-yellow-200',
    [ProcessStatus.ANALISE_JURIDICA]:'bg-purple-50 text-purple-600 border-purple-200',
    [ProcessStatus.LEVANTAMENTO]:    'bg-cyan-50 text-cyan-600 border-cyan-200',
    [ProcessStatus.DILIGENCIA]:      'bg-red-50 text-red-500 border-red-200',
    [ProcessStatus.EDITAL]:          'bg-orange-50 text-orange-600 border-orange-200',
    [ProcessStatus.APROVADO]:        'bg-emerald-50 text-emerald-600 border-emerald-200',
    [ProcessStatus.CONCLUIDO]:       'bg-green-50 text-green-700 border-green-200',
    [ProcessStatus.FINALIZADO]:      'bg-green-100 text-green-800 border-green-300',
    [ProcessStatus.ARQUIVADO]:       'bg-gray-100 text-gray-500 border-gray-200',
  };
  return map[status] ?? 'bg-slate-50 text-slate-500 border-slate-200';
}

export function isConcluded(status: string): boolean {
  return [
    ProcessStatus.CONCLUIDO,
    ProcessStatus.FINALIZADO,
    ProcessStatus.ARQUIVADO,
    ProcessStatus.APROVADO,
  ].includes(status as ProcessStatus);
}
