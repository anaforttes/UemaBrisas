import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, FileCheck2, Hash, ShieldCheck, XCircle } from 'lucide-react';

import {
  buscarVerificacaoAssinatura,
  VerificacaoAssinatura,
} from '../../services/signatureVerificationService';

const formatarData = (valor?: string | null) => {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR');
};

export const SignatureVerifyScreen: React.FC = () => {
  const { protocol = '' } = useParams<{ protocol: string }>();
  const [dados, setDados] = useState<VerificacaoAssinatura | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscarVerificacaoAssinatura(decodeURIComponent(protocol))
      .then((resultado) => {
        if (ativo) setDados(resultado);
      })
      .catch((err) => {
        if (ativo) setErro(err instanceof Error ? err.message : 'Nao foi possivel verificar.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [protocol]);

  const assinado = dados?.assinaturas.some(
    (item) => item.status === 'assinado' || item.status === 'signed'
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200/50">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Verificacao de assinatura interna
              </h1>
              <p className="text-sm text-slate-500">Protocolo {decodeURIComponent(protocol)}</p>
            </div>
          </div>
          <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-900">
            Voltar
          </Link>
        </div>

        {carregando ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Consultando protocolo...
          </div>
        ) : erro ? (
          <div className="rounded-xl border border-red-100 bg-white p-8">
            <div className="flex items-center gap-3 text-red-700">
              <XCircle size={22} />
              <strong>{erro}</strong>
            </div>
          </div>
        ) : dados ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Documento</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    {dados.documento.titulo}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${assinado ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}
                >
                  {dados.documento.status}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <FileCheck2 size={14} /> Origem
                  </p>
                  <p className="text-sm text-slate-700">
                    {dados.origem === 'backend'
                      ? 'Registro interno validado no backend'
                      : 'Registro local do navegador'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Hash size={14} /> Hash
                  </p>
                  <p className="break-all font-mono text-xs text-slate-700">
                    {dados.documento.hash || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-4 text-xs font-bold uppercase text-slate-400">Ordem de assinatura</p>
              <div className="space-y-3">
                {dados.assinaturas
                  .slice()
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((assinatura) => {
                    const concluida =
                      assinatura.status === 'assinado' || assinatura.status === 'signed';
                    return (
                      <div
                        key={`${assinatura.ordem}-${assinatura.nome}`}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-center gap-2">
                          {concluida ? (
                            <CheckCircle2 size={16} className="text-blue-600" />
                          ) : (
                            <Clock size={16} className="text-amber-500" />
                          )}
                          <p className="text-sm font-bold text-slate-800">
                            {assinatura.ordem}. {assinatura.nome}
                          </p>
                        </div>
                        <div className="mt-2 space-y-1 pl-6 text-xs text-slate-500">
                          <p>Assinado em: {formatarData(assinatura.assinado_em)}</p>
                          {assinatura.ac_emissora && <p>Origem: registro interno REURB</p>}
                          {assinatura.hash_assinatura && (
                            <p className="break-all font-mono">
                              Hash: {assinatura.hash_assinatura}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SignatureVerifyScreen;
