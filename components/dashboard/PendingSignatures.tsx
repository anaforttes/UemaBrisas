import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PenLine,
  FileSignature,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import {
  listarAssinaturasPendentes,
  AssinaturaPendente,
} from '../../services/notificacoesService';

export const PendingSignatures: React.FC = () => {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState<AssinaturaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (silencioso = false) => {
    if (silencioso) setAtualizando(true);
    try {
      const data = await listarAssinaturasPendentes();
      setPendentes(data.resultados);
    } catch {
      setPendentes([]);
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const iv = window.setInterval(() => carregar(true), 60_000);
    return () => window.clearInterval(iv);
  }, [carregar]);

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="mx-auto max-w-[1100px] animate-in fade-in p-6 duration-500 lg:p-10">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">
            Assinaturas Pendentes
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Documentos que aguardam a sua assinatura.
          </p>
        </div>
        <button
          onClick={() => carregar(true)}
          disabled={atualizando}
          className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={18} className={atualizando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : pendentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white py-20 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="text-lg font-black text-slate-700">Nenhuma pendência</p>
          <p className="mt-1 text-sm text-slate-400">
            Você não tem documentos aguardando assinatura.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.map((p) => (
            <div
              key={p.documento_id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <FileSignature size={22} className="text-blue-600" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-800">{p.titulo}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Solicitado por <strong>{p.solicitante || '—'}</strong> • {formatarData(p.criado_em)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {p.ordem}º na ordem
                  </span>
                  {p.minha_vez ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-600">
                      <PenLine size={11} /> Sua vez
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-600">
                      <Clock size={11} /> Aguardando signatário anterior
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate(p.link)}
                disabled={!p.minha_vez}
                title={p.minha_vez ? 'Abrir documento para assinar' : 'Aguarde a assinatura anterior'}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <PenLine size={16} /> Assinar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingSignatures;
