import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { REURBProcess } from '../../types/index';

interface DeleteProcessModalProps {
  target: REURBProcess;
  deletando: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteProcessModal: React.FC<DeleteProcessModalProps> = ({ target, deletando, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Excluir processo</h3>
          <p className="mt-1 text-sm text-slate-500">
            Tem certeza que deseja excluir o processo de{' '}
            <span className="font-semibold text-slate-700">{target.applicant}</span>?
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            disabled={deletando}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deletando}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deletando ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {deletando ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  </div>
);
