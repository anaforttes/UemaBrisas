import { REURBProcess } from '../../types/index';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── TipTap ───────────────────────────────────────────────────────────────────
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import FontSize from './extensions/FontSize';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';

// ─── Ícones ───────────────────────────────────────────────────────────────────
import {
  Save, FileDown, MessageSquare, Clock, CheckCircle2, X,
  RefreshCw, Shield, CheckCheck, ChevronDown, Users, AlertTriangle,
} from 'lucide-react';

// ─── Serviços e tipos ─────────────────────────────────────────────────────────
import { User } from '../../types/index';
import { dbService } from '../../services/databaseService';
import { documentoService, DocDetalhe } from '../../services/documentoService';
import { exportarPDF, exportarDOCX } from '../../services/exportService';
import { SignatureModal } from './SignatureModal';
import type { SignatureRecord } from '../../services/assinaturaService';
import PainelComentarios from './PainelComentarios';
import PainelColaboradores from './PainelColaboradores';
import HistoricoVersoes, { Versao, EventoAuditoria } from './components/HistoricoVersoes';
import EditorToolbar from './EditorToolbar';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EditorProps {
  initialContent: string;
  title: string;
  onSave: (content: string, title: string, status?: string) => void;
  status: string;
  currentUser?: User | null;
  processo?: REURBProcess | null;
  docLocalId?: string;
}

type AbaAtiva = 'comentarios' | 'historico' | 'participantes';

const gerarId = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;


// ─── Componente React da Imagem ───────────────────────────────────────────────

const ImageNodeView: React.FC<any> = ({ node, updateAttributes, selected, editor }) => {
  const { src, alt, width, align } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const containerStyle: React.CSSProperties = {
    display: 'block',
    textAlign: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
    margin: align === 'center' ? '8px auto' : '8px 0',
    position: 'relative',
    lineHeight: 0,
  };

  const imgStyle: React.CSSProperties = {
    width: width || 'auto',
    maxWidth: '100%',
    height: 'auto',
    display: 'inline-block',
    borderRadius: 4,
    outline: selected ? '2px solid #3b82f6' : 'none',
    outlineOffset: 2,
    cursor: 'default',
    userSelect: 'none',
  };

  const alcas = [
    { pos: 'nw', style: { top: -5,    left: -5,                                          cursor: 'nw-resize' } },
    { pos: 'n',  style: { top: -5,    left: '50%' as any, transform: 'translateX(-50%)', cursor: 'n-resize'  } },
    { pos: 'ne', style: { top: -5,    right: -5,                                         cursor: 'ne-resize' } },
    { pos: 'e',  style: { top: '50%' as any, right: -5,   transform: 'translateY(-50%)', cursor: 'e-resize'  } },
    { pos: 'se', style: { bottom: -5, right: -5,                                         cursor: 'se-resize' } },
    { pos: 's',  style: { bottom: -5, left: '50%' as any, transform: 'translateX(-50%)', cursor: 's-resize'  } },
    { pos: 'sw', style: { bottom: -5, left: -5,                                          cursor: 'sw-resize' } },
    { pos: 'w',  style: { top: '50%' as any, left: -5,    transform: 'translateY(-50%)', cursor: 'w-resize'  } },
  ];

  const iniciarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current) return;
    isResizing.current = true;
    startX.current = e.clientX;
    startW.current = imgRef.current.offsetWidth;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientX - startX.current;
      const newWidth = Math.max(50, startW.current + delta);
      const parentWidth = containerRef.current?.parentElement?.offsetWidth || 600;
      const pct = Math.round((newWidth / parentWidth) * 100);
      updateAttributes({ width: `${Math.min(pct, 100)}%` });
    };
    const onMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper style={containerStyle} data-drag-handle>
      <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
        <img ref={imgRef} src={src} alt={alt || ''} style={imgStyle} draggable={false} />
        {selected && (
          <>
            {alcas.map(({ pos, style }) => (
              <div key={pos} onMouseDown={iniciarResize} style={{ position: 'absolute', width: 10, height: 10, background: '#fff', border: '2px solid #3b82f6', borderRadius: 2, zIndex: 10, ...style }} />
            ))}
            <div style={{ position: 'absolute', bottom: -52, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '5px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', whiteSpace: 'nowrap', zIndex: 50, fontSize: 12 }}>
              <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginRight: 4 }}>ALINHAR</span>
              {[{ label: '◧', title: 'Esquerda', value: 'left' }, { label: '▣', title: 'Centro', value: 'center' }, { label: '◨', title: 'Direita', value: 'right' }].map(({ label, title, value }) => (
                <button key={value} title={title} onMouseDown={(e) => { e.preventDefault(); updateAttributes({ align: value }); }} style={{ background: align === value ? '#dbeafe' : 'transparent', border: 'none', color: align === value ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '3px 8px', borderRadius: 6, fontSize: 14, fontWeight: 700, transition: 'all .15s' }}>{label}</button>
              ))}
              <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch', margin: '0 4px' }} />
              <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginRight: 4 }}>TAMANHO</span>
              {[25, 50, 75, 100].map((pct) => (
                <button key={pct} onMouseDown={(e) => { e.preventDefault(); updateAttributes({ width: `${pct}%` }); }} style={{ background: width === `${pct}%` ? '#dbeafe' : 'transparent', border: 'none', color: width === `${pct}%` ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '3px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{pct}%</button>
              ))}
              <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch', margin: '0 4px' }} />
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteSelection().run(); }} title="Remover imagem" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '3px 6px', borderRadius: 6, fontSize: 14 }}>✕</button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// ─── Extensão de Imagem Customizada ──────────────────────────────────────────

const ImagemCustomizada = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: null }, width: { default: '100%' }, align: { default: 'left' } };
  },
  parseHTML() { return [{ tag: 'img[src]' }]; },
  renderHTML({ HTMLAttributes }) {
    const { align, width, ...rest } = HTMLAttributes;
    const marginStyle = align === 'center' ? 'margin:8px auto;' : align === 'right' ? 'margin:8px 0 8px auto;' : 'margin:8px 0;';
    return ['img', mergeAttributes(rest, { style: `width:${width || '100%'};display:block;${marginStyle}` })];
  },
  addNodeView() { return ReactNodeViewRenderer(ImageNodeView); },
  addCommands() {
    return { setImage: (options: Record<string, any>) => ({ commands }: any) => commands.insertContent({ type: this.name, attrs: options }) } as any;
  },
});


// ─── Bloco de assinatura ──────────────────────────────────────────────────────

const BlocoAssinatura: React.FC<{ record: SignatureRecord }> = ({ record }) => (
  <div className="mt-10 border-t-2 border-blue-800 pt-6">
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-200">
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center shrink-0"><Shield size={16} className="text-white" /></div>
        <div>
          <p className="font-black text-blue-900 text-sm uppercase tracking-wide">Registro de Assinaturas Digitais</p>
          <p className="text-[11px] text-blue-500 font-mono">Protocolo: {record.protocol}</p>
        </div>
        <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">✓ Válido</span>
      </div>
      <div className="space-y-3">
        {record.signers.map((signer, idx) => (
          <div key={signer.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-100">
            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-800">{idx + 1}. {signer.name} — {signer.role}</p>
              <p className="text-[11px] text-slate-500">Assinado em: {signer.signedAt ? new Date(signer.signedAt).toLocaleString('pt-BR') : '-'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Modal Finalizado ─────────────────────────────────────────────────────────

const ModalFinalizado: React.FC<{ titulo: string; onFechar: () => void }> = ({ titulo, onFechar }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCheck size={32} className="text-green-600" /></div>
      <h3 className="text-xl font-black text-slate-800 mb-2">Documento Finalizado!</h3>
      <p className="text-sm text-slate-500 mb-1">O documento <span className="font-semibold text-slate-700">"{titulo}"</span> foi finalizado.</p>
      <p className="text-xs text-slate-400 mb-6">Finalizado em {new Date().toLocaleString('pt-BR')}</p>
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6"><p className="text-xs text-green-700 font-medium">Disponível para consulta no sistema REURB.</p></div>
      <button onClick={onFechar} className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">Fechar</button>
    </div>
  </div>
);

// ─── Modal Sair sem Salvar ────────────────────────────────────────────────────

const ModalSairSemSalvar: React.FC<{ titulo: string; onSalvar: () => void; onNaoSalvar: () => void; onCancelar: () => void }> = ({ titulo, onSalvar, onNaoSalvar, onCancelar }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-[420px]">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0"><Save size={22} className="text-amber-600" /></div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Deseja salvar as alterações?</h3>
          <p className="text-sm text-slate-500 mt-1">As alterações em <span className="font-semibold text-slate-700">"{titulo}"</span> serão perdidas se você não salvá-las.</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onNaoSalvar} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Não salvar</button>
        <button onClick={onCancelar} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
        <button onClick={onSalvar} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">Salvar</button>
      </div>
    </div>
  </div>
);

// ─── Painel de Membros do Banco ───────────────────────────────────────────────

const PainelMembros: React.FC<{ onInserir: (texto: string) => void }> = ({ onInserir }) => {
  const [busca, setBusca] = useState('');
  const [membros, setMembros] = useState<User[]>([]);
  useEffect(() => { dbService.users.selectAll().then(setMembros); }, []);
  const filtrados = membros.filter((u) => u.name.toLowerCase().includes(busca.toLowerCase()) || (u.role || '').toLowerCase().includes(busca.toLowerCase()));
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-100">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar membro..." className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtrados.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Nenhum membro encontrado.</p>}
        {filtrados.map((u) => (
          <div key={u.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0">{u.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{u.name}</p>
                <p className="text-[10px] text-slate-400">{u.role} · {u.tipoProfissional || ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => onInserir(u.name)} className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium">+ Nome</button>
              <button onClick={() => onInserir(`${u.name} — ${u.role}`)} className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium">+ Nome/Cargo</button>
              {u.email && <button onClick={() => onInserir(u.email)} className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium">+ E-mail</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100"><p className="text-[10px] text-slate-400 text-center">Clique para inserir no cursor do documento</p></div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const Editor: React.FC<EditorProps> = ({ initialContent, title, onSave, status, currentUser, processo, docLocalId }) => {
  const [tituloLocal, setTituloLocal]                       = useState(title);
  const [exportando, setExportando]                         = useState(false);
  const [mostrarMenuExportar, setMostrarMenuExportar]       = useState(false);
  const [mostrarModalAssinatura, setMostrarModalAssinatura] = useState(false);
  const [mostrarModalFinalizado, setMostrarModalFinalizado] = useState(false);
  const [mostrarModalSair, setMostrarModalSair]             = useState(false);
  const [registroAssinatura, setRegistroAssinatura]         = useState<SignatureRecord | null>(null);
  const [abaAtiva, setAbaAtiva]                             = useState<AbaAtiva>('comentarios');
  const [versoes, setVersoes]                               = useState<Versao[]>([]);
  const [eventos, setEventos]                               = useState<EventoAuditoria[]>([]);
  const [documentoFinalizado, setDocumentoFinalizado]       = useState(false);
  const [tamanhoFonte, setTamanhoFonte]                     = useState('12');
  const [fonteFamilia, setFonteFamilia]                     = useState('Times New Roman');
  const [espacamento, setEspacamento]                       = useState('1.5');

  // ── Colaboração backend ───────────────────────────────────────────────────
  const [docBackend, setDocBackend]         = useState<DocDetalhe | null>(null);
  const [alertaNovaVersao, setAlertaNovaVersao] = useState<string | null>(null);
  const docBackendRef = useRef<DocDetalhe | null>(null);

  const docRef = processo?.id ?? docLocalId ?? `local-${title.slice(0, 40)}`;

  const ehEditor = docBackend
    ? (docBackend.criado_por?.id === Number(currentUser?.id) ||
       docBackend.colaboradores.some(
         (c) => String(c.usuario.id) === String(currentUser?.id) && c.papel === 'editor'
       ))
    : true;

  type StatusAutoSave = 'idle' | 'salvando' | 'salvo';
  const [statusAutoSave, setStatusAutoSave] = useState<StatusAutoSave>('idle');
  const [ultimoSalvoEm, setUltimoSalvoEm]   = useState<string | null>(null);

  const refMenuExport    = useRef<HTMLDivElement>(null);
  const pendingNavRef    = useRef<(() => void) | null>(null);
  const refCabecalho     = useRef<HTMLDivElement>(null);
  const refRodape        = useRef<HTMLDivElement>(null);
  const conteudoSalvoRef = useRef(initialContent);
  const somenteLeitura   = documentoFinalizado || !!registroAssinatura;

  const gerarIdEvento = () => `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

  const registrarEvento = useCallback((tipo: EventoAuditoria['tipo'], descricao: string) => {
    setEventos((prev) => [{ id: gerarIdEvento(), tipo, descricao, autor: currentUser?.name || 'Usuário', criadoEm: new Date().toISOString() }, ...prev]);
  }, [currentUser]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ // @ts-ignore
        link: false, underline: false,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Color, TextStyle, FontSize, ImagemCustomizada,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' } }),
      Placeholder.configure({ placeholder: 'Comece a escrever o documento...' }),
      CharacterCount,
    ],
    content: initialContent,
    editable: !somenteLeitura,
  });

  useEffect(() => { if (editor) editor.setEditable(!somenteLeitura); }, [somenteLeitura, editor]);

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) { editor.commands.setContent(initialContent); conteudoSalvoRef.current = initialContent; }
    setTituloLocal(title);
    setVersoes([{ id: gerarId(), numero: 1, conteudo: initialContent, titulo: title, autor: currentUser?.name || 'Sistema', salvoEm: new Date().toISOString(), descricao: 'Versão inicial — documento aberto' }]);
    setEventos([{ id: gerarIdEvento(), tipo: 'criacao', descricao: `Documento "${title}" aberto`, autor: currentUser?.name || 'Sistema', criadoEm: new Date().toISOString() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  // ── Carregar/criar documento backend ──────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const carregar = async () => {
      try {
        let doc = await documentoService.buscarPorRef(docRef);
        if (!doc) {
          doc = await documentoService.criar({
            doc_ref: docRef,
            titulo: title,
            conteudo: initialContent,
            processo_id: processo?.id ?? '',
          });
        } else if (editor && doc.conteudo && doc.conteudo !== editor.getHTML()) {
          editor.commands.setContent(doc.conteudo);
          conteudoSalvoRef.current = doc.conteudo;
          setTituloLocal(doc.titulo);
        }
        if (!cancelado) {
          setDocBackend(doc);
          docBackendRef.current = doc;
        }
      } catch { /* backend indisponível — modo local */ }
    };
    if (currentUser) carregar();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRef]);

  // ── Polling para detectar atualizações remotas (30s) ─────────────────────
  useEffect(() => {
    if (!docBackendRef.current) return;
    const intervalo = setInterval(async () => {
      if (!docBackendRef.current) return;
      try {
        const atualizado = await documentoService.buscar(docBackendRef.current.id);
        if (atualizado.versao_atual > (docBackendRef.current?.versao_atual ?? 0)) {
          const autorNome = atualizado.criado_por?.name ?? 'alguém';
          setAlertaNovaVersao(`Nova versão salva por ${autorNome}. Clique para carregar.`);
          docBackendRef.current = atualizado;
          setDocBackend(atualizado);
        }
      } catch { /* ignora */ }
    }, 30000);
    return () => clearInterval(intervalo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docBackend?.id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (editor && editor.getHTML() !== conteudoSalvoRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (refMenuExport.current && !refMenuExport.current.contains(e.target as unknown as globalThis.Node)) setMostrarMenuExportar(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      if (!editor) return;
      const html = editor.getHTML();
      if (html === conteudoSalvoRef.current) return;
      setStatusAutoSave('salvando');
      onSave(html, tituloLocal);
      conteudoSalvoRef.current = html;
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setUltimoSalvoEm(hora);
      setStatusAutoSave('salvo');
      registrarEvento('autosave', `Auto-save às ${hora}`);
      setTimeout(() => setStatusAutoSave('idle'), 3000);

      if (docBackendRef.current) {
        try {
          const res = await documentoService.salvarVersao(docBackendRef.current.id, {
            conteudo: html, titulo: tituloLocal, descricao: `Auto-save ${hora}`,
          });
          docBackendRef.current = res.documento;
          setDocBackend(res.documento);
        } catch { /* ignora */ }
      }
    }, 30000);
    return () => clearInterval(intervalo);
  }, [editor, tituloLocal, onSave, registrarEvento]);

  const handleInserirMembro = (texto: string) => { if (!editor) return; editor.chain().focus().insertContent(texto).run(); };
  const inserirTabela = () => { editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); };
  const inserirImagem = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { const src = ev.target?.result as string; editor?.chain().focus().insertContent({ type: 'image', attrs: { src, width: '50%', align: 'center' } }).run(); };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const inserirLink = () => { const url = prompt('URL do link:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); };

  const handleSalvar = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const novaVersao: Versao = { id: gerarId(), numero: versoes.length + 1, conteudo: html, titulo: tituloLocal, autor: currentUser?.name || 'Usuário', salvoEm: new Date().toISOString(), descricao: `Versão ${versoes.length + 1} — ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` };
    setVersoes((prev) => [novaVersao, ...prev]);
    onSave(html, tituloLocal);
    conteudoSalvoRef.current = html;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setUltimoSalvoEm(hora);
    setStatusAutoSave('salvo');
    registrarEvento('salvamento', `Documento salvo manualmente — v${versoes.length + 1}`);
    setTimeout(() => setStatusAutoSave('idle'), 3000);

    // Persistir no backend
    if (docBackendRef.current) {
      try {
        const res = await documentoService.salvarVersao(docBackendRef.current.id, {
          conteudo: html,
          titulo: tituloLocal,
          descricao: `Versão ${versoes.length + 1}`,
        });
        docBackendRef.current = res.documento;
        setDocBackend(res.documento);
        setAlertaNovaVersao(null);
      } catch { /* ignora */ }
    }
  };

  const handleModalSalvarESair = () => { handleSalvar(); setMostrarModalSair(false); pendingNavRef.current?.(); pendingNavRef.current = null; };
  const handleModalNaoSalvar   = () => { setMostrarModalSair(false); pendingNavRef.current?.(); pendingNavRef.current = null; };
  const handleModalCancelar    = () => { setMostrarModalSair(false); pendingNavRef.current = null; };

  const handleRestaurarVersao = (versao: Versao) => {
    editor?.commands.setContent(versao.conteudo);
    setTituloLocal(versao.titulo);
    registrarEvento('restauracao', `Versão ${versao.numero} restaurada`);
  };

  const handleFinalizarFluxo = async () => {
    if (!editor) return;
    onSave(editor.getHTML(), tituloLocal, 'Finalizado');
    registrarEvento('salvamento', 'Documento finalizado');
    setDocumentoFinalizado(true);
    setMostrarModalFinalizado(true);
    if (docBackendRef.current) {
      try {
        await documentoService.salvarVersao(docBackendRef.current.id, {
          conteudo: editor.getHTML(), titulo: tituloLocal,
          descricao: 'Documento finalizado', status: 'Finalizado',
        });
      } catch { /* ignora */ }
    }
  };

  const handleExportarPDF = async () => {
    if (!editor) return;
    setExportando(true); setMostrarMenuExportar(false);
    try { await exportarPDF(tituloLocal, editor.getHTML(), registroAssinatura); registrarEvento('exportacao', 'PDF'); }
    finally { setExportando(false); }
  };

  const handleExportarDOCX = async () => {
    if (!editor) return;
    setExportando(true); setMostrarMenuExportar(false);
    try { await exportarDOCX(tituloLocal, editor.getHTML()); registrarEvento('exportacao', 'DOCX'); }
    catch (e: any) { console.error('Erro DOCX:', e?.message); }
    finally { setExportando(false); }
  };

  if (!editor) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <>
      <style>{`
        .ProseMirror { outline: none; min-height: 900px; font-family: var(--editor-fonte, 'Times New Roman'); line-height: var(--editor-espacamento, 1.5); }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #adb5bd; pointer-events: none; height: 0; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #cbd5e1; padding: 6px 10px; min-width: 60px; position: relative; vertical-align: top; }
        .ProseMirror th { background: #f1f5f9; font-weight: 700; }
        .ProseMirror .selectedCell { background: #dbeafe; }
        .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: #3b82f6; cursor: col-resize; z-index: 10; }
        .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; color: #475569; font-style: italic; margin: 12px 0; }
        .ProseMirror code { background: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-family: monospace; font-size: 0.9em; }
        .ProseMirror pre { background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 16px; font-family: monospace; overflow-x: auto; }
        .ProseMirror h1 { font-size: 1.6em; font-weight: 800; margin: 16px 0 8px; }
        .ProseMirror h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
        .ProseMirror ul { list-style: disc; padding-left: 24px; }
        .ProseMirror ol { list-style: decimal; padding-left: 24px; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; }
      `}</style>

      {mostrarModalSair && <ModalSairSemSalvar titulo={tituloLocal} onSalvar={handleModalSalvarESair} onNaoSalvar={handleModalNaoSalvar} onCancelar={handleModalCancelar} />}

      <SignatureModal
        isOpen={mostrarModalAssinatura}
        onClose={() => setMostrarModalAssinatura(false)}
        documentTitle={tituloLocal}
        documentContent={editor.getHTML()}
        currentUser={currentUser || null}
        onSignatureComplete={async (record) => {
          setRegistroAssinatura(record);
          onSave(editor.getHTML(), tituloLocal, 'Signed');
          registrarEvento('assinatura', `Assinado — Protocolo: ${record.protocol}`);
          const mySigner = record.signers.find((s) => s.status === 'signed' && String(s.id) === String(currentUser?.id || 'current'));
          if (docBackendRef.current && mySigner) {
            try {
              await documentoService.registrarAssinatura(docBackendRef.current.id, {
                protocolo: record.protocol,
                hash_assinatura: mySigner.signatureHash ?? '',
                nome_certificado: mySigner.certificateCN ?? '',
                cpf_certificado: mySigner.certificateCPF ?? '',
                ac_emissora: mySigner.certificateIssuer ?? '',
              });
            } catch { /* ignora */ }
          }
        }}
      />

      {mostrarModalFinalizado && <ModalFinalizado titulo={tituloLocal} onFechar={() => setMostrarModalFinalizado(false)} />}

      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Alerta de nova versão remota */}
        {alertaNovaVersao && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <span className="flex-1">{alertaNovaVersao}</span>
            <button
              onClick={async () => {
                if (!docBackendRef.current) return;
                const versao = await documentoService.buscarVersao(docBackendRef.current.id, docBackendRef.current.versao_atual);
                if (versao?.conteudo) {
                  editor?.commands.setContent(versao.conteudo);
                  conteudoSalvoRef.current = versao.conteudo;
                  setTituloLocal(versao.titulo);
                }
                setAlertaNovaVersao(null);
              }}
              className="px-2 py-1 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors whitespace-nowrap"
            >
              Carregar agora
            </button>
            <button onClick={() => setAlertaNovaVersao(null)} className="text-amber-400 hover:text-amber-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* TOPBAR */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex flex-col flex-1 mr-4">
            <input type="text" value={tituloLocal} onChange={(e) => setTituloLocal(e.target.value)} className="text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded px-1 -ml-1 border-none bg-transparent hover:bg-slate-50" placeholder="Título do documento..." />
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${documentoFinalizado ? 'bg-green-100 text-green-700' : registroAssinatura ? 'bg-green-100 text-green-700' : status === 'Review' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {documentoFinalizado ? '✓ Finalizado' : registroAssinatura ? '✓ Assinado' : status}
              </span>
              {registroAssinatura && <span className="text-[10px] text-slate-400 font-mono">Protocolo: {registroAssinatura.protocol}</span>}
              {statusAutoSave === 'salvando' && <span className="flex items-center gap-1 text-[10px] text-slate-400 animate-pulse"><RefreshCw size={10} className="animate-spin" /> Salvando...</span>}
              {statusAutoSave === 'salvo' && <span className="flex items-center gap-1 text-[10px] text-green-600"><CheckCircle2 size={10} /> Salvo às {ultimoSalvoEm}</span>}
              {statusAutoSave === 'idle' && ultimoSalvoEm && <span className="text-[10px] text-slate-300">Auto-save: {ultimoSalvoEm}</span>}
              <span className="text-[10px] text-slate-300 ml-2">{wordCount} palavras · {charCount} caracteres</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Avatares dos colaboradores */}
            <div className="flex -space-x-2 mr-1">
              {currentUser && (
                <div title={`${currentUser.name} (você)`} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white bg-blue-600 z-10">{currentUser.name.charAt(0)}</div>
              )}
              {docBackend?.colaboradores.slice(0, 3).map((c) => (
                <div key={c.id} title={c.usuario.name} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white bg-slate-500">{c.usuario.name.charAt(0)}</div>
              ))}
              {(docBackend?.colaboradores.length ?? 0) > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">+{(docBackend?.colaboradores.length ?? 0) - 3}</div>
              )}
            </div>
            <div className="relative" ref={refMenuExport}>
              <button onClick={() => setMostrarMenuExportar((v) => !v)} disabled={exportando} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium">
                <FileDown size={14} className={exportando ? 'animate-bounce' : ''} />
                {exportando ? 'Exportando...' : 'Exportar'}
                <ChevronDown size={12} />
              </button>
              {mostrarMenuExportar && (
                <div className="absolute right-0 top-10 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 min-w-[150px]">
                  <button onClick={handleExportarPDF}  className="flex items-center gap-2 w-full px-4 py-2 text-xs text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors">📄 Exportar PDF</button>
                  <button onClick={handleExportarDOCX} className="flex items-center gap-2 w-full px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">📝 Exportar DOCX</button>
                </div>
              )}
            </div>
            <button onClick={handleSalvar} disabled={documentoFinalizado} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm disabled:opacity-50">
              <Save size={14} /> Salvar
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <EditorToolbar
          editor={editor}
          somenteLeitura={somenteLeitura}
          tamanhoFonte={tamanhoFonte}
          setTamanhoFonte={setTamanhoFonte}
          fonteFamilia={fonteFamilia}
          setFonteFamilia={setFonteFamilia}
          espacamento={espacamento}
          setEspacamento={setEspacamento}
          inserirTabela={inserirTabela}
          inserirImagem={inserirImagem}
          inserirLink={inserirLink}
          registroAssinatura={registroAssinatura}
          documentoFinalizado={documentoFinalizado}
          onAbrirModalAssinatura={() => setMostrarModalAssinatura(true)}
          onFinalizarFluxo={handleFinalizarFluxo}
        />

        {/* ÁREA DO DOCUMENTO + SIDEBAR */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
            <div className="w-full max-w-[816px]">
              <div className="bg-white shadow-xl border border-slate-200 min-h-[1056px] flex flex-col" style={{ '--editor-fonte': fonteFamilia, '--editor-espacamento': espacamento } as React.CSSProperties}>
                <div ref={refCabecalho} contentEditable={!somenteLeitura} suppressContentEditableWarning className="px-[2cm] py-3 border-b border-dashed border-slate-300 text-xs focus:outline-none focus:bg-blue-50 transition-colors min-h-[40px]" style={{ fontFamily: fonteFamilia, color: '#94a3b8' }}>
                  {!somenteLeitura && <span className="pointer-events-none select-none italic">Cabeçalho — clique para editar</span>}
                </div>
                <div className="flex-1 px-[2cm] py-[1cm]">
                  <EditorContent editor={editor} />
                </div>
                <div ref={refRodape} contentEditable={!somenteLeitura} suppressContentEditableWarning className="px-[2cm] py-3 border-t border-dashed border-slate-300 text-xs focus:outline-none focus:bg-blue-50 transition-colors min-h-[40px]" style={{ fontFamily: fonteFamilia, color: '#94a3b8' }}>
                  {!somenteLeitura && <span className="pointer-events-none select-none italic">Rodapé — clique para editar</span>}
                </div>
              </div>
              {registroAssinatura && (
                <div className="bg-white shadow-xl border border-slate-200 px-[2cm] pb-[2cm]">
                  <BlocoAssinatura record={registroAssinatura} />
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
            <div className="flex border-b border-slate-200 overflow-x-auto">
              <button
                onClick={() => setAbaAtiva('comentarios')}
                className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors whitespace-nowrap px-2 ${abaAtiva === 'comentarios' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <MessageSquare size={11} className="inline mr-1" /> Comentários
              </button>
              <button
                onClick={() => setAbaAtiva('participantes')}
                className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors whitespace-nowrap px-2 ${abaAtiva === 'participantes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Users size={11} className="inline mr-1" /> Participantes
                {docBackend && <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-black">{1 + docBackend.colaboradores.length}</span>}
              </button>
              <button
                onClick={() => setAbaAtiva('historico')}
                className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors whitespace-nowrap px-2 ${abaAtiva === 'historico' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Clock size={11} className="inline mr-1" /> Histórico
              </button>
            </div>

            <>

                {abaAtiva === 'comentarios' && (
                  <PainelComentarios
                    docId={docBackend?.id}
                    nomeUsuario={currentUser?.name || 'Usuário'}
                    cargoUsuario={currentUser?.role || 'Operador'}
                    editor={editor}
                    ehEditor={ehEditor}
                  />
                )}
                {abaAtiva === 'participantes' && (
                  docBackend ? (
                    <PainelColaboradores
                      docId={docBackend.id}
                      currentUserId={currentUser?.id}
                      donoCriador={docBackend.criado_por}
                      ehEditor={ehEditor}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                      <div className="opacity-40">
                        <Users size={28} className="mx-auto mb-2 text-slate-400" />
                        <p className="text-xs text-slate-400">Conectando ao servidor para carregar participantes...</p>
                      </div>
                    </div>
                  )
                )}
                {abaAtiva === 'historico' && (
                  <HistoricoVersoes
                    versoes={versoes}
                    eventos={eventos}
                    onRestaurar={handleRestaurarVersao}
                  />
                )}
            </>
          </div>
        </div>
      </div>
    </>
  );
};

export default Editor;