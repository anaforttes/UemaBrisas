
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { REURBProcess, ProcessStatus } from '../../types/index';
import { ProcessDrawer } from './ProcessDrawer';
import { getStatusBadgeClass } from '../../utils/processUtils';

interface ProcessTableProps {
  processes: REURBProcess[];
}

export const ProcessTable: React.FC<ProcessTableProps> = ({ processes }) => {
  const [selectedProcess, setSelectedProcess] = useState<REURBProcess | null>(null);

  const getStatusStyles = (status: ProcessStatus) => getStatusBadgeClass(status);

  return (
    <>
      <div className="w-full bg-white rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="px-4 sm:px-6 py-4 sm:py-6">Protocolo</th>
                <th className="px-4 sm:px-6 py-4 sm:py-6">Requerente</th>
                <th className="px-4 sm:px-6 py-4 sm:py-6 hidden sm:table-cell">Modalidade</th>
                <th className="px-4 sm:px-6 py-4 sm:py-6">Status</th>
                <th className="px-4 sm:px-6 py-4 sm:py-6 hidden md:table-cell">Responsável</th>
                <th className="px-4 sm:px-6 py-4 sm:py-6 text-right hidden lg:table-cell">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Database size={40} />
                      <p className="text-sm font-bold">Nenhum processo localizado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processes.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-50/40 transition-all group cursor-pointer" onClick={() => setSelectedProcess(proc)}>
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <button className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-all whitespace-nowrap">
                        {proc.protocol || proc.id}
                      </button>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="text-sm font-bold text-slate-800 truncate max-w-[120px] sm:max-w-[180px]">{proc.applicant}</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-[120px] sm:max-w-[180px]">{proc.location}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                      <span className={`text-[9px] px-2 py-1 rounded-md font-black tracking-wider border ${proc.modality === 'REURB-S' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                        {proc.modality}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap ${getStatusStyles(proc.status)}`}>
                        {proc.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 hidden md:table-cell">
                      <span className="text-sm text-slate-500 font-medium">
                        {proc.responsibleName || 'Não atribuído'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 text-right hidden lg:table-cell">
                      <Link to="/templates" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap">
                        Gerar Doc.
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProcessDrawer
        process={selectedProcess}
        onClose={() => setSelectedProcess(null)}
      />
    </>
  );
};
