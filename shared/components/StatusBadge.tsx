import React from 'react';
import { ProcessStatus } from '../../types/index';

const STATUS_COLORS: Record<string, string> = {
  [ProcessStatus.PENDENTE]: 'bg-slate-100 text-slate-600 border-slate-200',
  [ProcessStatus.INICIAL]: 'bg-slate-100 text-slate-600 border-slate-200',
  [ProcessStatus.EM_ANDAMENTO]: 'bg-blue-50   text-blue-700  border-blue-100',
  [ProcessStatus.INICIADO]: 'bg-blue-50   text-blue-700  border-blue-100',
  [ProcessStatus.LEVANTAMENTO]: 'bg-cyan-50   text-cyan-700  border-cyan-100',
  [ProcessStatus.EM_ANALISE]: 'bg-amber-50  text-amber-700 border-amber-100',
  [ProcessStatus.ANALISE_JURIDICA]: 'bg-amber-50  text-amber-700 border-amber-100',
  [ProcessStatus.EDITAL]: 'bg-violet-50 text-violet-700 border-violet-100',
  [ProcessStatus.DILIGENCIA]: 'bg-rose-50   text-rose-700  border-rose-100',
  [ProcessStatus.APROVADO]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  [ProcessStatus.CONCLUIDO]: 'bg-green-50  text-green-700 border-green-100',
  [ProcessStatus.FINALIZADO]: 'bg-green-50  text-green-700 border-green-100',
  [ProcessStatus.CANCELADO]: 'bg-red-50    text-red-600   border-red-100',
  [ProcessStatus.ARQUIVADO]: 'bg-gray-50   text-gray-500  border-gray-200',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const colors = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
  const sizeClass = size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-widest rounded-full border ${colors} ${sizeClass}`}
    >
      {status}
    </span>
  );
};
