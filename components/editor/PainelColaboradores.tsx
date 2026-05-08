import React, { useState, useEffect } from 'react';
import {
  Users, Link2, Copy, CheckCheck, Crown, Trash2,
  Loader2, RefreshCw, X, Clock, UserCheck,
} from 'lucide-react';
import { documentoService, DocColaborador } from '../../services/documentoService';

interface Props {
  docId: string;
  currentUserId?: number | string;
  donoCriador?: { id: number; name: string; email: string; role: string } | null;
  ehEditor: boolean;
}

const FRONTEND_URL = (import.meta as any).env?.VITE_FRONTEND_URL ?? 'http://localhost:5173';

const avatarCor = (nome: string) => {
  const cores = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
  return cores[nome.charCodeAt(0) % cores.length];
};

const PainelColaboradores: React.FC<Props> = ({ docId, currentUserId, donoCriador, ehEditor }) => {
  const [colaboradores, setColaboradores] = useState<DocColaborador[]>([]);
  const [loading, setLoading]             = useState(true);
  const [removendo, setRemovendo]         = useState<number | null>(null);

  const [conviteCodigo, setConviteCodigo] = useState<string | null>(null);
  const [conviteExpira, setConviteExpira] = useState<string | null>(null);
  const [gerando, setGerando]             = useState(false);
  const [copiado, setCopiado]             = useState(false);

  const linkConvite = conviteCodigo ? `${FRONTEND_URL}/#/convite/${conviteCodigo}` : '';

  useEffect(() => {
    documentoService.listarColaboradores(docId)
      .then(setColaboradores)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [docId]);

  const handleGerarConvite = async () => {
    setGerando(true);
    try {
      const data = await documentoService.gerarConvite(docId, 'editor', 7);
      setConviteCodigo(data.codigo);
      setConviteExpira(data.expira_em);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao gerar link.');
    } finally {
      setGerando(false);
    }
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(linkConvite).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const handleRevogar = async () => {
    if (!confirm('Deseja desativar este link de convite?')) return;
    try {
      await documentoService.revogarConvites(docId);
      setConviteCodigo(null);
      setConviteExpira(null);
    } catch { /* ignora */ }
  };

  const handleRemover = async (colab: DocColaborador) => {
    if (!confirm(`Remover ${colab.usuario.name} do documento?`)) return;
    setRemovendo(colab.usuario.id);
    try {
      await documentoService.removerColaborador(docId, colab.usuario.id);
      setColaboradores(prev => prev.filter(c => c.id !== colab.id));
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao remover.');
    } finally {
      setRemovendo(null);
    }
  };

  const expiracaoFormatada = conviteExpira
    ? new Date(conviteExpira).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    : '';

  const totalParticipantes = 1 + colaboradores.length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Users size={15} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Participantes</h3>
          <span className="ml-auto text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
            {totalParticipantes}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Todos os participantes podem ler e editar este documento.
        </p>
      </div>

      {/* ── Lista de pessoas ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        )}

        {/* Criador */}
        {donoCriador && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-2xl">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${avatarCor(donoCriador.name)}`}>
              {donoCriador.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate">{donoCriador.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{donoCriador.role}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Crown size={12} className="text-amber-400" />
              <span className="text-[10px] font-bold text-amber-600">Dono</span>
            </div>
          </div>
        )}

        {/* Colaboradores */}
        {!loading && colaboradores.map(colab => {
          const ehVoce = String(colab.usuario.id) === String(currentUserId);
          return (
            <div key={colab.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${avatarCor(colab.usuario.name)}`}>
                {colab.usuario.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{colab.usuario.name}</p>
                  {ehVoce && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full shrink-0">Você</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">{colab.usuario.role}</p>
              </div>
              {ehEditor && !ehVoce && (
                <button
                  onClick={() => handleRemover(colab)}
                  disabled={removendo === colab.usuario.id}
                  title="Remover participante"
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                >
                  {removendo === colab.usuario.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              )}
            </div>
          );
        })}

        {!loading && colaboradores.length === 0 && (
          <div className="text-center py-4 px-2">
            <p className="text-[11px] text-slate-400">Nenhum colaborador ainda.</p>
          </div>
        )}
      </div>

      {/* ── Seção de convite ───────────────────────────────────────── */}
      {ehEditor && (
        <div className="border-t border-slate-100 shrink-0">

          {!conviteCodigo ? (
            /* Estado: sem link ativo */
            <div className="px-5 py-4 space-y-2">
              <p className="text-[12px] font-semibold text-slate-600">Convidar por link</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gere um link e compartilhe com quem você quer que entre no documento.
              </p>
              <button
                onClick={handleGerarConvite}
                disabled={gerando}
                className="w-full flex items-center justify-center gap-2 py-3 mt-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-[13px] font-bold transition-colors disabled:opacity-60"
              >
                {gerando
                  ? <><Loader2 size={14} className="animate-spin" /> Gerando link...</>
                  : <><Link2 size={14} /> Gerar link de convite</>
                }
              </button>
            </div>

          ) : (
            /* Estado: link ativo */
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[12px] font-semibold text-slate-700">Link ativo</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock size={10} />
                  <span>até {expiracaoFormatada}</span>
                </div>
              </div>

              {/* Caixa de link */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                <p className="text-[10px] text-slate-500 font-mono break-all leading-relaxed select-all">
                  {linkConvite}
                </p>
                <button
                  onClick={handleCopiar}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                    copiado
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  {copiado
                    ? <><CheckCheck size={14} /> Link copiado!</>
                    : <><Copy size={14} /> Copiar link</>
                  }
                </button>
              </div>

              {/* Ações secundárias */}
              <div className="flex gap-2">
                <button
                  onClick={handleGerarConvite}
                  disabled={gerando}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-500 rounded-xl text-[11px] font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={11} /> Novo link
                </button>
                <button
                  onClick={handleRevogar}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-100 text-red-400 rounded-xl text-[11px] font-semibold hover:bg-red-50 transition-colors"
                >
                  <X size={11} /> Desativar
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Qualquer pessoa com o link consegue entrar.{' '}
                <button onClick={handleRevogar} className="text-red-400 hover:underline font-medium">Desative</button> se quiser bloquear o acesso.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PainelColaboradores;
