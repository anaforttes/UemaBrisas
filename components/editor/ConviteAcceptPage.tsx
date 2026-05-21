import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentoService } from '../../services/documentoService';
import { dbService } from '../../services/databaseService';
import { Users, CheckCircle2, AlertCircle, Loader2, FileText, LogIn } from 'lucide-react';
import { User } from '../../types/index';

interface Props {
  currentUser: User | null;
}

const ConviteAcceptPage: React.FC<Props> = ({ currentUser }) => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  type Estado = 'carregando' | 'info' | 'aceitando' | 'sucesso' | 'erro';
  const [estado, setEstado] = useState<Estado>('carregando');
  const [info, setInfo] = useState<{
    documento_titulo: string;
    criado_por: string;
    papel: string;
    expira_em: string;
    ja_membro: boolean;
  } | null>(null);
  const [erro, setErro] = useState('');
  const [docId, setDocId] = useState('');

  useEffect(() => {
    if (!code) {
      setErro('Código inválido.');
      setEstado('erro');
      return;
    }
    if (!currentUser) return; // aguarda login

    documentoService
      .infoConvite(code)
      .then((data) => {
        setInfo(data);
        setEstado('info');
      })
      .catch((e) => {
        setErro(e?.message ?? 'Convite inválido ou expirado.');
        setEstado('erro');
      });
  }, [code, currentUser]);

  const handleAceitar = async () => {
    if (!code) return;
    setEstado('aceitando');
    try {
      const res = await documentoService.aceitarConvite(code);
      const backendId = res.documento_id;
      setDocId(backendId);

      // Busca o documento completo e salva no localStorage para o editor encontrar
      try {
        const doc = await documentoService.buscar(backendId);
        dbService.documents.upsert({
          id: backendId,
          title: doc.titulo,
          content: doc.conteudo,
          processId: doc.processo_id ?? '',
          status: doc.status as any,
        });
      } catch {
        /* se falhar, o editor vai buscar direto no backend */
      }

      setEstado('sucesso');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao entrar no documento.');
      setEstado('erro');
    }
  };

  const PAPEL_LABEL: Record<string, string> = { editor: 'Editor', visualizador: 'Visualizador' };
  const PAPEL_COR: Record<string, string> = {
    editor: 'bg-blue-100 text-blue-700',
    visualizador: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] shadow-2xl p-8">
        {/* Sem login */}
        {!currentUser && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <LogIn size={28} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Faça login para continuar</h2>
            <p className="text-sm text-slate-500">
              Você precisa estar logado para aceitar este convite.
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              Ir para o Login
            </Link>
          </div>
        )}

        {/* Carregando */}
        {currentUser && estado === 'carregando' && (
          <div className="text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
            <p className="text-sm text-slate-500">Verificando convite...</p>
          </div>
        )}

        {/* Info do convite */}
        {currentUser && estado === 'info' && info && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Convite para Documento</h2>
              <p className="text-sm text-slate-500 mt-1">Você foi convidado para colaborar</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Documento</p>
                  <p className="text-sm font-black text-slate-800">{info.documento_titulo}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Criado por {info.criado_por}</p>
                </div>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Seu papel</p>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full ${PAPEL_COR[info.papel]}`}
                >
                  {PAPEL_LABEL[info.papel] ?? info.papel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Expira em</p>
                <p className="text-xs text-slate-600 font-semibold">
                  {new Date(info.expira_em).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {info.ja_membro ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700 font-medium">
                  <CheckCircle2 size={14} /> Você já tem acesso a este documento.
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors"
                >
                  Ir para o Painel
                </button>
              </div>
            ) : (
              <button
                onClick={handleAceitar}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                <Users size={16} /> Entrar no Documento
              </button>
            )}
          </div>
        )}

        {/* Aceitando */}
        {currentUser && estado === 'aceitando' && (
          <div className="text-center space-y-3 py-4">
            <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">Entrando no documento...</p>
          </div>
        )}

        {/* Sucesso */}
        {currentUser && estado === 'sucesso' && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Pronto!</h2>
            <p className="text-sm text-slate-500">
              Você agora tem acesso ao documento como{' '}
              <strong>{PAPEL_LABEL[info?.papel ?? ''] ?? info?.papel}</strong>.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/edit/${docId}`)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                Abrir Documento
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Ir para o Painel
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Convite inválido</h2>
            <p className="text-sm text-slate-500">{erro}</p>
            <Link to="/" className="inline-block text-blue-600 font-bold text-sm hover:underline">
              Voltar ao painel
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConviteAcceptPage;
