import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Check, X, Plus, Loader2 } from 'lucide-react';
import { documentoService, DocComentario } from '../../services/documentoService';

export type { DocComentario as Comentario };

interface PainelComentariosProps {
  docId?: string;
  nomeUsuario: string;
  cargoUsuario: string;
  editor?: any;
  ehEditor?: boolean;
}

const gerarId = () => `com-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatarData = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const PainelComentarios: React.FC<PainelComentariosProps> = ({
  docId, nomeUsuario, cargoUsuario, editor, ehEditor = true,
}) => {
  const [comentarios, setComentarios]           = useState<DocComentario[]>([]);
  const [carregando, setCarregando]             = useState(!!docId);
  const [novoTexto, setNovoTexto]               = useState('');
  const [novoTipo, setNovoTipo]                 = useState<'comentario' | 'sugestao'>('comentario');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [enviando, setEnviando]                 = useState(false);
  const [atualizando, setAtualizando]           = useState<string | null>(null);

  const carregarComentarios = useCallback(async () => {
    if (!docId) return;
    setCarregando(true);
    try {
      const data = await documentoService.listarComentarios(docId);
      setComentarios(data);
    } catch {
      // silencia erro — lista fica vazia
    } finally {
      setCarregando(false);
    }
  }, [docId]);

  useEffect(() => {
    carregarComentarios();
  }, [carregarComentarios]);

  const handleAdicionar = async () => {
    if (!novoTexto.trim()) return;
    setEnviando(true);

    if (!docId) {
      const local: DocComentario = {
        id: gerarId(),
        autor: null,
        autor_nome: nomeUsuario,
        autor_cargo: cargoUsuario,
        texto: novoTexto.trim(),
        tipo: novoTipo,
        status: 'pendente',
        criado_em: new Date().toISOString(),
      };
      setComentarios((prev) => [local, ...prev]);
      setNovoTexto('');
      setMostrarFormulario(false);
      setEnviando(false);
      return;
    }

    try {
      const novo = await documentoService.criarComentario(docId, novoTexto.trim(), novoTipo);
      setComentarios((prev) => [novo, ...prev]);
      setNovoTexto('');
      setMostrarFormulario(false);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao enviar comentário.');
    } finally {
      setEnviando(false);
    }
  };

  const handleResponder = async (id: string, decisao: 'aceito' | 'rejeitado') => {
    const comentario = comentarios.find((c) => c.id === id);

    if (decisao === 'aceito' && comentario?.tipo === 'sugestao' && editor) {
      const { state } = editor;
      const { doc } = state;
      let found = false;
      doc.descendants((node: any, pos: number) => {
        if (found || node.type.name !== 'text') return;
        const palavra = comentario.texto.match(/"([^"]+)" por "([^"]+)"/);
        if (palavra && node.text?.includes(palavra[1])) {
          const inicio = pos + node.text.indexOf(palavra[1]);
          const fim = inicio + palavra[1].length;
          editor.chain().focus().setTextSelection({ from: inicio, to: fim }).insertContent(palavra[2]).run();
          found = true;
        }
      });
    }

    if (docId) {
      setAtualizando(id);
      try {
        const updated = await documentoService.atualizarComentario(docId, id, decisao);
        setComentarios((prev) => prev.map((c) => c.id === id ? updated : c));
      } catch {
        setComentarios((prev) => prev.map((c) => c.id === id ? { ...c, status: decisao } : c));
      } finally {
        setAtualizando(null);
      }
    } else {
      setComentarios((prev) => prev.map((c) => c.id === id ? { ...c, status: decisao } : c));
    }
  };

  const pendentes   = comentarios.filter((c) => c.status === 'pendente').length;
  const aceitos     = comentarios.filter((c) => c.status === 'aceito').length;
  const rejeitados  = comentarios.filter((c) => c.status === 'rejeitado').length;

  return (
    <div className="flex flex-col h-full">

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-100">
        <div className="text-center">
          <p className="text-lg font-black text-amber-500">{pendentes}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Pendentes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-green-500">{aceitos}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Aceitos</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-red-400">{rejeitados}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Rejeitados</p>
        </div>
      </div>

      {/* Botão adicionar */}
      <div className="p-4 border-b border-slate-100">
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          {mostrarFormulario ? 'Cancelar' : 'Adicionar Comentário'}
        </button>

        {mostrarFormulario && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setNovoTipo('comentario')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${novoTipo === 'comentario' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                💬 Comentário
              </button>
              <button
                onClick={() => setNovoTipo('sugestao')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${novoTipo === 'sugestao' ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                ✏️ Sugestão
              </button>
            </div>
            <textarea
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              placeholder={novoTipo === 'sugestao' ? 'Ex: Sugiro alterar "X" por "Y"' : 'Digite seu comentário...'}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none"
            />
            <button
              onClick={handleAdicionar}
              disabled={!novoTexto.trim() || enviando}
              className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enviando ? <><Loader2 size={12} className="animate-spin" /> Enviando...</> : 'Enviar'}
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {carregando && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        )}

        {!carregando && comentarios.length === 0 && (
          <div className="text-center py-10 opacity-40">
            <MessageSquare size={32} className="mx-auto mb-2" />
            <p className="text-xs font-medium">Nenhum comentário ainda.</p>
          </div>
        )}

        {!carregando && comentarios.map((comentario) => (
          <div
            key={comentario.id}
            className={`rounded-xl border p-3 space-y-2 transition-all ${
              comentario.status === 'aceito'    ? 'border-green-200 bg-green-50' :
              comentario.status === 'rejeitado' ? 'border-red-100 bg-red-50 opacity-60' :
              comentario.tipo === 'sugestao'    ? 'border-amber-200 bg-amber-50' :
              'border-slate-200 bg-white'
            }`}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {comentario.autor_nome.charAt(0)}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">{comentario.autor_nome}</p>
                  <p className="text-[10px] text-slate-400">{comentario.autor_cargo}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${comentario.tipo === 'sugestao' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {comentario.tipo === 'sugestao' ? '✏️ Sugestão' : '💬 Comentário'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{comentario.texto}</p>
            <p className="text-[10px] text-slate-400">{formatarData(comentario.criado_em)}</p>

            {/* Aceitar/Rejeitar */}
            {comentario.status === 'pendente' && ehEditor && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleResponder(comentario.id, 'aceito')}
                  disabled={atualizando === comentario.id}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500 text-white rounded-lg text-[11px] font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {atualizando === comentario.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />} Aceitar
                </button>
                <button
                  onClick={() => handleResponder(comentario.id, 'rejeitado')}
                  disabled={atualizando === comentario.id}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-400 text-white rounded-lg text-[11px] font-bold hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  <X size={12} /> Rejeitar
                </button>
              </div>
            )}

            {comentario.status !== 'pendente' && (
              <div className={`flex items-center gap-1 text-[11px] font-bold ${comentario.status === 'aceito' ? 'text-green-600' : 'text-red-400'}`}>
                {comentario.status === 'aceito' ? <Check size={12} /> : <X size={12} />}
                {comentario.status === 'aceito' ? 'Aceito' : 'Rejeitado'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PainelComentarios;
