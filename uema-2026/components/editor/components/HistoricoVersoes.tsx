import React, { useState } from 'react';
import { Clock, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface Versao {
  id: string;
  numero: number;
  conteudo: string;
  titulo: string;
  autor: string;
  salvoEm: string;
  descricao: string;
}

export interface EventoAuditoria {
  id: string;
  tipo: 'criacao' | 'salvamento' | 'autosave' | 'restauracao' | 'assinatura' | 'exportacao' | 'ia_aplicada';
  descricao: string;
  autor: string;
  criadoEm: string;
}

interface HistoricoVersoesProps {
  versoes: Versao[];
  eventos: EventoAuditoria[];
  onRestaurar: (versao: Versao) => void;
}

// ─── Formata data ─────────────────────────────────────────────────────────────

const formatarData = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Badge por tipo de evento ─────────────────────────────────────────────────

const EVENTO_STYLE: Record<EventoAuditoria['tipo'], { cor: string; label: string }> = {
  criacao:     { cor: 'bg-blue-100 text-blue-700',   label: 'Criação'    },
  salvamento:  { cor: 'bg-green-100 text-green-700', label: 'Salvo'      },
  autosave:    { cor: 'bg-slate-100 text-slate-500', label: 'Auto-save'  },
  restauracao: { cor: 'bg-amber-100 text-amber-700', label: 'Restaurado' },
  assinatura:  { cor: 'bg-indigo-100 text-indigo-700', label: 'Assinado' },
  exportacao:  { cor: 'bg-teal-100 text-teal-700',   label: 'Exportado'  },
  ia_aplicada: { cor: 'bg-purple-100 text-purple-700', label: 'IA'       },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const HistoricoVersoes: React.FC<HistoricoVersoesProps> = ({ versoes, eventos, onRestaurar }) => {
  const [abaAtiva, setAbaAtiva] = useState<'versoes' | 'eventos'>('versoes');
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">

      {/* Abas internas */}
      <div className="flex border-b border-slate-100 px-4 pt-3">
        <button
          onClick={() => setAbaAtiva('versoes')}
          className={`flex-1 pb-2 text-xs font-bold transition-colors ${
            abaAtiva === 'versoes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Versões ({versoes.length})
        </button>
        <button
          onClick={() => setAbaAtiva('eventos')}
          className={`flex-1 pb-2 text-xs font-bold transition-colors ${
            abaAtiva === 'eventos'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Auditoria ({eventos.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">

        {/* Lista de versões */}
        {abaAtiva === 'versoes' && (
          <>
            {versoes.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">Nenhuma versão salva ainda.</p>
            )}
            {versoes.map((versao) => (
              <div
                key={versao.id}
                className="border border-slate-100 rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandido(expandido === versao.id ? null : versao.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-black text-blue-700">v{versao.numero}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{versao.descricao}</p>
                      <p className="text-[10px] text-slate-400">{formatarData(versao.salvoEm)}</p>
                    </div>
                  </div>
                  {expandido === versao.id
                    ? <ChevronUp size={14} className="text-slate-400" />
                    : <ChevronDown size={14} className="text-slate-400" />
                  }
                </div>

                {expandido === versao.id && (
                  <div className="px-3 pb-3 border-t border-slate-50 bg-slate-50/50">
                    <p className="text-[10px] text-slate-500 mt-2 mb-2">
                      Autor: <span className="font-bold">{versao.autor}</span>
                    </p>
                    {versao.numero > 1 && (
                      <button
                        onClick={() => onRestaurar(versao)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600 transition-colors"
                      >
                        <RotateCcw size={11} /> Restaurar esta versão
                      </button>
                    )}
                    {versao.numero === 1 && (
                      <span className="text-[10px] text-slate-400 italic">Versão inicial</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Lista de eventos de auditoria */}
        {abaAtiva === 'eventos' && (
          <>
            {eventos.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">Nenhum evento registrado.</p>
            )}
            {eventos.map((evento) => {
              const estilo = EVENTO_STYLE[evento.tipo] ?? EVENTO_STYLE.salvamento;
              return (
                <div key={evento.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl">
                  <Clock size={12} className="text-slate-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${estilo.cor}`}>
                        {estilo.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatarData(evento.criadoEm)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{evento.descricao}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{evento.autor}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default HistoricoVersoes;