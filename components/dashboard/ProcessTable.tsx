
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Database } from 'lucide-react';
import { REURBProcess, ProcessStatus } from '../../types';

interface ProcessTableProps {
  processes: REURBProcess[];
}

export const ProcessTable: React.FC<ProcessTableProps> = ({ processes }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <th className="px-8 py-5">Identificação</th>
          <th className="px-8 py-5">Modalidade</th>
          <th className="px-8 py-5">Status Operacional</th>
          <th className="px-8 py-5">Nível</th>
          <th className="px-8 py-5"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {processes.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-8 py-20 text-center">
              <div className="flex flex-col items-center gap-4 opacity-30">
                <Database size={48} />
                <p className="text-sm font-bold">Nenhum processo no banco de dados</p>
              </div>
            </td>
          </tr>
        ) : (
          processes.map((proc) => (
            <tr key={proc.id} className="hover:bg-slate-50/80 transition-all group cursor-pointer">
              <td className="px-8 py-6">
                <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{proc.title}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{proc.id} • {proc.applicant}</div>
              </td>
              <td className="px-8 py-6">
                <span className={`text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest ${proc.modality === 'REURB-S' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {proc.modality}
                </span>
              </td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    proc.status === ProcessStatus.FINALIZADO ? 'bg-green-500' : 
                    proc.status === ProcessStatus.ANALISE_JURIDICA ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{proc.status}</span>
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-[80px] bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${proc.progress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">{proc.progress}%</span>
                </div>
              </td>
              <td className="px-8 py-6 text-right">
                <Link to={`/edit/${proc.id}`} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg transition-all inline-flex">
                  <ChevronRight size={18} />
                </Link>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
