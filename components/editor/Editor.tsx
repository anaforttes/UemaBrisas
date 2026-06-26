import { REURBProcess } from '../../types/index';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── TipTap ───────────────────────────────────────────────────────────────────
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';

interface ImageAttrs {
  src: string;
  alt?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: ImageAttrs) => ReturnType;
    };
  }
}
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
  Save,
  FileDown,
  MessageSquare,
  Clock,
  CheckCircle2,
  X,
  RefreshCw,
  Shield,
  CheckCheck,
  ChevronDown,
  Users,
  AlertTriangle,
} from 'lucide-react';

// ─── Serviços e tipos ─────────────────────────────────────────────────────────
import { User } from '../../types/index';
import { documentoService, DocDetalhe, ConflictError } from '../../services/documentoService';
import { exportarDOCX } from '../../services/exportService';
import { SignatureModal } from './SignatureModal';
import type { SignatureRecord } from '../../services/assinaturaService';
import PainelComentarios from './PainelComentarios';
import PainelColaboradores from './PainelColaboradores';
import HistoricoVersoes, { Versao, EventoAuditoria } from './components/HistoricoVersoes';
import EditorToolbar from './EditorToolbar';
import EditorRuler from './EditorRuler';
import { usePresenca } from '../../hooks/usePresenca';

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

const PAGE_CONTENT_H = 832; // A4 content area in px: 1056 - 64(hdr) - 64(ftr) - 96(pad)

// ─── Componente React da Imagem ───────────────────────────────────────────────

const ImageNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, editor }) => {
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

  const alcas: { pos: string; style: React.CSSProperties }[] = [
    { pos: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
    {
      pos: 'n',
      style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
    },
    { pos: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
    {
      pos: 'e',
      style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' },
    },
    { pos: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
    {
      pos: 's',
      style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
    },
    { pos: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
    {
      pos: 'w',
      style: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'w-resize' },
    },
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
              <div
                key={pos}
                onMouseDown={iniciarResize}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  background: '#fff',
                  border: '2px solid #3b82f6',
                  borderRadius: 2,
                  zIndex: 10,
                  ...style,
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                bottom: -52,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '5px 10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap',
                zIndex: 50,
                fontSize: 12,
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginRight: 4 }}>
                ALINHAR
              </span>
              {[
                { label: '◧', title: 'Esquerda', value: 'left' },
                { label: '▣', title: 'Centro', value: 'center' },
                { label: '◨', title: 'Direita', value: 'right' },
              ].map(({ label, title, value }) => (
                <button
                  key={value}
                  title={title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    updateAttributes({ align: value });
                  }}
                  style={{
                    background: align === value ? '#dbeafe' : 'transparent',
                    border: 'none',
                    color: align === value ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'all .15s',
                  }}
                >
                  {label}
                </button>
              ))}
              <div
                style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch', margin: '0 4px' }}
              />
              <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginRight: 4 }}>
                TAMANHO
              </span>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    updateAttributes({ width: `${pct}%` });
                  }}
                  style={{
                    background: width === `${pct}%` ? '#dbeafe' : 'transparent',
                    border: 'none',
                    color: width === `${pct}%` ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    padding: '3px 7px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {pct}%
                </button>
              ))}
              <div
                style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch', margin: '0 4px' }}
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().deleteSelection().run();
                }}
                title="Remover imagem"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                ✕
              </button>
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
    return {
      src: { default: null },
      alt: { default: null },
      width: { default: '100%' },
      align: { default: 'left' },
    };
  },
  parseHTML() {
    return [{ tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const { align, width, ...rest } = HTMLAttributes;
    const marginStyle =
      align === 'center'
        ? 'margin:8px auto;'
        : align === 'right'
          ? 'margin:8px 0 8px auto;'
          : 'margin:8px 0;';
    return [
      'img',
      mergeAttributes(rest, { style: `width:${width || '100%'};display:block;${marginStyle}` }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
  addCommands() {
    return {
      setImage:
        (options: ImageAttrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },
});

// ─── Bloco de assinatura ──────────────────────────────────────────────────────

const BlocoAssinatura: React.FC<{ record: SignatureRecord }> = ({ record }) => (
  <div className="mt-10 border-t-2 border-blue-800 pt-6">
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-200">
        <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="font-black text-blue-900 text-sm uppercase tracking-wide">
            Registro de Assinaturas Digitais
          </p>
          <p className="text-[11px] text-blue-500 font-mono">Protocolo: {record.protocol}</p>
        </div>
        <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">
          ✓ Válido
        </span>
      </div>
      <div className="space-y-3">
        {record.signers.map((signer, idx) => (
          <div
            key={signer.id}
            className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-100"
          >
            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-800">
                {idx + 1}. {signer.name} — {signer.role}
              </p>
              <p className="text-[11px] text-slate-500">
                Assinado em:{' '}
                {signer.signedAt ? new Date(signer.signedAt).toLocaleString('pt-BR') : '-'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Modal Finalizado ─────────────────────────────────────────────────────────

const ModalFinalizado: React.FC<{ titulo: string; onFechar: () => void }> = ({
  titulo,
  onFechar,
}) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCheck size={32} className="text-green-600" />
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2">Documento Finalizado!</h3>
      <p className="text-sm text-slate-500 mb-1">
        O documento <span className="font-semibold text-slate-700">"{titulo}"</span> foi finalizado.
      </p>
      <p className="text-xs text-slate-400 mb-6">
        Finalizado em {new Date().toLocaleString('pt-BR')}
      </p>
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6">
        <p className="text-xs text-green-700 font-medium">
          Disponível para consulta no sistema REURB.
        </p>
      </div>
      <button
        onClick={onFechar}
        className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
      >
        Fechar
      </button>
    </div>
  </div>
);

// ─── Modal Sair sem Salvar ────────────────────────────────────────────────────

const ModalSairSemSalvar: React.FC<{
  titulo: string;
  onSalvar: () => void;
  onNaoSalvar: () => void;
  onCancelar: () => void;
}> = ({ titulo, onSalvar, onNaoSalvar, onCancelar }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-[420px]">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
          <Save size={22} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Deseja salvar as alterações?</h3>
          <p className="text-sm text-slate-500 mt-1">
            As alterações em <span className="font-semibold text-slate-700">"{titulo}"</span> serão
            perdidas se você não salvá-las.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onNaoSalvar}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Não salvar
        </button>
        <button
          onClick={onCancelar}
          className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSalvar}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
        >
          Salvar
        </button>
      </div>
    </div>
  </div>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

const Editor: React.FC<EditorProps> = ({
  initialContent,
  title,
  onSave,
  status,
  currentUser,
  processo,
  docLocalId,
}) => {
  const [tituloLocal, setTituloLocal] = useState(title);
  const [exportando, setExportando] = useState(false);
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [mostrarModalAssinatura, setMostrarModalAssinatura] = useState(false);
  const [mostrarModalFinalizado, setMostrarModalFinalizado] = useState(false);
  const [mostrarModalSair, setMostrarModalSair] = useState(false);
  const [registroAssinatura, setRegistroAssinatura] = useState<SignatureRecord | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('comentarios');
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [documentoFinalizado, setDocumentoFinalizado] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState('12');
  const [fonteFamilia, setFonteFamilia] = useState('Times New Roman');
  const [espacamento, setEspacamento] = useState('1.5');
  const [alturaConteudo, setAlturaConteudo] = useState(0);
  const [zoom, setZoom] = React.useState(1);
  const ZOOM_LEVELS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
  const [margemEsq, setMargemEsq] = React.useState(96);
  const [margemDir, setMargemDir] = React.useState(96);

  const numPaginas = Math.max(1, Math.ceil(alturaConteudo / PAGE_CONTENT_H));
  const CONTENT_PAD = 48;
  const pageBreakLines = React.useMemo(
    () => Array.from({ length: numPaginas - 1 }, (_, i) => CONTENT_PAD + (i + 1) * PAGE_CONTENT_H),
    [numPaginas]
  );

  // ── Colaboração backend ───────────────────────────────────────────────────
  const [docBackend, setDocBackend] = useState<DocDetalhe | null>(null);
  const [alertaNovaVersao, setAlertaNovaVersao] = useState<string | null>(null);
  const [conflito, setConflito] = useState<ConflictError | null>(null);
  const [payloadConflito, setPayloadConflito] = useState<{
    conteudo: string;
    titulo: string;
    descricao?: string;
    status?: string;
  } | null>(null);
  const docBackendRef = useRef<DocDetalhe | null>(null);
  const cursorPosRef = useRef<number | null>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // Cursores remotos de outros usuários
  const { usuariosOnline, setCursorPos } = usePresenca(docBackend?.id ?? null, !!currentUser);

  const CORES_CURSOR = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];
  const corCursor = (userId: number) => CORES_CURSOR[userId % CORES_CURSOR.length];

  // docRef estável por sessão para evitar colisão entre docs com mesmo título
  const docRefFallback = useRef(`local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const docRef = processo?.id ?? docLocalId ?? docRefFallback.current;

  const ehEditor = docBackend
    ? docBackend.criado_por?.id === Number(currentUser?.id) ||
      docBackend.colaboradores.some(
        (c) => String(c.usuario.id) === String(currentUser?.id) && c.papel === 'editor'
      )
    : true;

  type StatusAutoSave = 'idle' | 'salvando' | 'salvo';
  const [statusAutoSave, setStatusAutoSave] = useState<StatusAutoSave>('idle');
  const [ultimoSalvoEm, setUltimoSalvoEm] = useState<string | null>(null);

  const refMenuExport = useRef<HTMLDivElement>(null);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const refCabecalho = useRef<HTMLDivElement>(null);
  const refRodape = useRef<HTMLDivElement>(null);
  const prosemirrorWrapRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const conteudoSalvoRef = useRef(initialContent);
  const somenteLeitura = documentoFinalizado || !!registroAssinatura;

  const gerarIdEvento = () => `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

  const registrarEvento = useCallback(
    (tipo: EventoAuditoria['tipo'], descricao: string) => {
      setEventos((prev) => [
        {
          id: gerarIdEvento(),
          tipo,
          descricao,
          autor: currentUser?.name || 'Usuário',
          criadoEm: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [currentUser]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      FontSize,
      ImagemCustomizada,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Placeholder.configure({ placeholder: 'Comece a escrever o documento...' }),
      CharacterCount,
    ],
    content: initialContent,
    editable: !somenteLeitura,
  });

  useEffect(() => {
    if (editor) editor.setEditable(!somenteLeitura);
  }, [somenteLeitura, editor]);

  // Rastreia posição do cursor para compartilhar via presença
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const pos = editor.state.selection.from;
      cursorPosRef.current = pos;
      setCursorPos(pos);
    };
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('selectionUpdate', handler);
    };
  }, [editor, setCursorPos]);

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
      conteudoSalvoRef.current = initialContent;
    }
    setTituloLocal(title);
    setVersoes([
      {
        id: gerarId(),
        numero: 1,
        conteudo: initialContent,
        titulo: title,
        autor: currentUser?.name || 'Sistema',
        salvoEm: new Date().toISOString(),
        descricao: 'Versão inicial — documento aberto',
      },
    ]);
    setEventos([
      {
        id: gerarIdEvento(),
        tipo: 'criacao',
        descricao: `Documento "${title}" aberto`,
        autor: currentUser?.name || 'Sistema',
        criadoEm: new Date().toISOString(),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  // ── Carregar/criar documento backend ──────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const carregar = async () => {
      try {
        let doc: DocDetalhe | null = null;

        // 1. Tenta por ref (documentos do criador)
        doc = await documentoService.buscarPorRef(docRef);

        // 2. Tenta como UUID direto (colaboradores acessando via convite)
        if (!doc) {
          try {
            doc = await documentoService.buscar(docRef);
          } catch {
            doc = null;
          }
        }

        // 3. Cria novo documento se não encontrou
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

          // Carrega histórico de versões do backend
          try {
            const versoesBackend = await documentoService.listarVersoes(doc.id);
            if (!cancelado && versoesBackend.length > 0) {
              const versoesConvertidas: Versao[] = versoesBackend.map((v) => ({
                id: String(v.id),
                numero: v.numero,
                conteudo: v.conteudo ?? '',
                titulo: v.titulo,
                autor: v.autor_nome,
                salvoEm: v.criado_em,
                descricao: v.descricao || `Versão ${v.numero}`,
              }));
              setVersoes(versoesConvertidas);
            }
          } catch {
            /* mantém versão local */
          }
        }
      } catch {
        /* backend indisponível — modo local */
      }
    };
    if (currentUser) carregar();
    return () => {
      cancelado = true;
    };
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
      } catch {
        /* ignora */
      }
    }, 30000);
    return () => clearInterval(intervalo);
  }, [docBackend?.id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editor && editor.getHTML() !== conteudoSalvoRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        refMenuExport.current &&
        !refMenuExport.current.contains(e.target as unknown as globalThis.Node)
      )
        setMostrarMenuExportar(false);
    };
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
      registrarEvento('autosave', `Auto-save às ${hora}`);

      if (docBackendRef.current) {
        try {
          const payload = {
            conteudo: html,
            titulo: tituloLocal,
            descricao: `Auto-save ${hora}`,
            versao_esperada: docBackendRef.current.versao_atual,
          };
          const res = await documentoService.salvarVersao(docBackendRef.current.id, payload);
          if ('conflito' in res) {
            setConflito(res);
            setPayloadConflito({
              conteudo: html,
              titulo: tituloLocal,
              descricao: `Auto-save ${hora}`,
            });
            setStatusAutoSave('idle');
            return;
          }
          docBackendRef.current = res.documento;
          setDocBackend(res.documento);
          // Atualiza lista de versões com nova versão
          const vv = res.versao;
          setVersoes((prev) => [
            {
              id: String(vv.id),
              numero: vv.numero,
              conteudo: html,
              titulo: vv.titulo,
              autor: vv.autor_nome,
              salvoEm: vv.criado_em,
              descricao: vv.descricao,
            },
            ...prev.filter((v) => v.numero !== vv.numero),
          ]);
        } catch {
          /* ignora */
        }
      }
      setStatusAutoSave('salvo');
      setTimeout(() => setStatusAutoSave('idle'), 3000);
    }, 30000);
    return () => clearInterval(intervalo);
  }, [editor, tituloLocal, onSave, registrarEvento]);

  useEffect(() => {
    const el = prosemirrorWrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setAlturaConteudo(e.contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const inserirTabela = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };
  const inserirImagem = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        editor
          ?.chain()
          .focus()
          .insertContent({ type: 'image', attrs: { src, width: '50%', align: 'center' } })
          .run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const inserirLink = () => {
    const url = prompt('URL do link:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  const handleSalvar = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    onSave(html, tituloLocal);
    conteudoSalvoRef.current = html;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setUltimoSalvoEm(hora);
    setStatusAutoSave('salvando');
    registrarEvento('salvamento', `Documento salvo manualmente`);

    if (docBackendRef.current) {
      try {
        const payload = {
          conteudo: html,
          titulo: tituloLocal,
          descricao: `Versão ${docBackendRef.current.versao_atual + 1}`,
          versao_esperada: docBackendRef.current.versao_atual,
        };
        const res = await documentoService.salvarVersao(docBackendRef.current.id, payload);
        if ('conflito' in res) {
          setConflito(res);
          setPayloadConflito({ conteudo: html, titulo: tituloLocal });
          setStatusAutoSave('idle');
          return;
        }
        docBackendRef.current = res.documento;
        setDocBackend(res.documento);
        setAlertaNovaVersao(null);
        const vv = res.versao;
        setVersoes((prev) => [
          {
            id: String(vv.id),
            numero: vv.numero,
            conteudo: html,
            titulo: vv.titulo,
            autor: vv.autor_nome,
            salvoEm: vv.criado_em,
            descricao: vv.descricao,
          },
          ...prev.filter((v) => v.numero !== vv.numero),
        ]);
      } catch {
        /* ignora */
      }
    }
    setStatusAutoSave('salvo');
    setTimeout(() => setStatusAutoSave('idle'), 3000);
  };

  // Sobrescreve forçando sem verificação de versão
  const handleSalvarForcado = async (conteudo: string, titulo: string, descricao?: string) => {
    if (!docBackendRef.current) return;
    try {
      const res = await documentoService.salvarVersao(docBackendRef.current.id, {
        conteudo,
        titulo,
        descricao,
      });
      if (!('conflito' in res)) {
        docBackendRef.current = res.documento;
        setDocBackend(res.documento);
        const vv = res.versao;
        setVersoes((prev) => [
          {
            id: String(vv.id),
            numero: vv.numero,
            conteudo,
            titulo: vv.titulo,
            autor: vv.autor_nome,
            salvoEm: vv.criado_em,
            descricao: vv.descricao,
          },
          ...prev.filter((v) => v.numero !== vv.numero),
        ]);
      }
    } catch {
      /* ignora */
    }
    setConflito(null);
    setPayloadConflito(null);
  };

  const handleModalSalvarESair = () => {
    handleSalvar();
    setMostrarModalSair(false);
    pendingNavRef.current?.();
    pendingNavRef.current = null;
  };
  const handleModalNaoSalvar = () => {
    setMostrarModalSair(false);
    pendingNavRef.current?.();
    pendingNavRef.current = null;
  };
  const handleModalCancelar = () => {
    setMostrarModalSair(false);
    pendingNavRef.current = null;
  };

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
          conteudo: editor.getHTML(),
          titulo: tituloLocal,
          descricao: 'Documento finalizado',
          status: 'Finalizado',
        });
      } catch {
        /* ignora */
      }
    }
  };

  const handleExportarPDF = () => {
    setMostrarMenuExportar(false);
    registrarEvento('exportacao', 'PDF');

    const area = printAreaRef.current;
    if (!area) {
      window.print();
      return;
    }

    const clone = area.cloneNode(true) as HTMLElement;
    // Remove indicadores de quebra de página e decorações visuais
    clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    // Remove placeholders editáveis (cabeçalho/rodapé vazios)
    clone.querySelectorAll('.pointer-events-none').forEach((el) => el.remove());
    // Remove transform do zoom (inline style)
    clone.style.transform = 'none';
    // Remove padding inline do conteúdo — deixa @page controlar as margens
    const conteudoEl = clone.querySelector<HTMLElement>('.editor-conteudo');
    if (conteudoEl) {
      conteudoEl.style.paddingLeft = '0';
      conteudoEl.style.paddingRight = '0';
      conteudoEl.style.paddingTop = '0';
      conteudoEl.style.paddingBottom = '0';
    }

    const win = window.open('', '_blank');
    if (!win) {
      window.print();
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: white; }
@page { size: A4; margin: 2.54cm; }
.editor-cabecalho { padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; font-size: 11px; color: #9ca3af; min-height: 28px; margin-bottom: 8px; }
.editor-conteudo { padding: 0; }
.editor-rodape { padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #9ca3af; min-height: 28px; margin-top: 8px; }
.ProseMirror { outline: none; font-family: '${fonteFamilia}', 'Times New Roman', serif; line-height: ${espacamento}; font-size: 12pt; color: #1f2937; }
.ProseMirror p { margin: 0; padding: 2px 0; }
.ProseMirror p.is-editor-empty:first-child::before { content: none; }
.ProseMirror h1 { font-size: 1.6em; font-weight: 800; margin: 16px 0 8px; }
.ProseMirror h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
.ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
.ProseMirror table { border-collapse: collapse; width: 100%; margin: 12px 0; break-inside: avoid; }
.ProseMirror td, .ProseMirror th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
.ProseMirror th { background: #f1f5f9; font-weight: 700; }
.ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; color: #475569; font-style: italic; margin: 12px 0; }
.ProseMirror ul { list-style: disc; padding-left: 24px; }
.ProseMirror ol { list-style: decimal; padding-left: 24px; }
.ProseMirror a { color: #2563eb; text-decoration: underline; }
.ProseMirror code { background: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-family: monospace; font-size: 0.9em; }
.ProseMirror pre { background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 16px; font-family: monospace; }
@media screen {
  #__overlay__ { display: none; position: fixed; inset: 0; background: white; z-index: 9999; align-items: center; justify-content: center; font-family: sans-serif; color: #64748b; font-size: 14px; }
  #__overlay__.show { display: flex; }
}
@media print { #__overlay__ { display: none !important; } }
</style>
</head>
<body>
${clone.outerHTML}
<div id="__overlay__">Fechando...</div>
<script>
window.onafterprint = function() {
  document.getElementById('__overlay__').classList.add('show');
  setTimeout(function() { window.close(); }, 300);
};
window.print();
</script>
</body>
</html>`);

    win.document.close();
  };

  const handleExportarDOCX = async () => {
    if (!editor) return;
    setExportando(true);
    setMostrarMenuExportar(false);
    try {
      await exportarDOCX(tituloLocal, editor.getHTML());
      registrarEvento('exportacao', 'DOCX');
    } catch (e: unknown) {
      console.error('Erro DOCX:', e instanceof Error ? e.message : e);
    } finally {
      setExportando(false);
    }
  };

  if (!editor)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  // Calcula posição dos cursores remotos
  const cursoresVisiveis = usuariosOnline
    .filter((u) => u.usuario_id !== Number(currentUser?.id) && u.cursor_pos != null)
    .map((u) => {
      let coords: { top: number; left: number } | null = null;
      try {
        const docSize = editor.state.doc.content.size;
        const pos = Math.min(u.cursor_pos!, docSize - 1);
        const domCoords = editor.view.coordsAtPos(pos);
        const wrapEl = editorWrapRef.current;
        if (wrapEl) {
          const rect = wrapEl.getBoundingClientRect();
          coords = {
            top: domCoords.top - rect.top + wrapEl.scrollTop,
            left: domCoords.left - rect.left,
          };
        }
      } catch {
        /* ignora posição inválida */
      }
      return { ...u, coords };
    })
    .filter((u) => u.coords !== null);

  return (
    <>
      {/* Dialog de conflito */}
      {conflito && payloadConflito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Conflito de edição detectado</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-bold">{conflito.autor_ultima_versao}</span> salvou uma
                  versão mais recente (v{conflito.versao_atual}) enquanto você editava.
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              <button
                onClick={() => {
                  if (editor) {
                    editor.commands.setContent(conflito.conteudo_atual);
                    setTituloLocal(conflito.titulo_atual);
                    conteudoSalvoRef.current = conflito.conteudo_atual;
                    if (docBackendRef.current)
                      docBackendRef.current = {
                        ...docBackendRef.current,
                        versao_atual: conflito.versao_atual,
                      };
                  }
                  setConflito(null);
                  setPayloadConflito(null);
                }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Carregar versão de {conflito.autor_ultima_versao} (recomendado)
              </button>
              <button
                onClick={() =>
                  handleSalvarForcado(
                    payloadConflito.conteudo,
                    payloadConflito.titulo,
                    payloadConflito.descricao
                  )
                }
                className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
              >
                Sobrescrever com minha versão
              </button>
              <button
                onClick={() => {
                  setConflito(null);
                  setPayloadConflito(null);
                }}
                className="w-full py-2 text-slate-500 text-xs font-medium hover:text-slate-700 transition-colors"
              >
                Cancelar (manter editando)
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        /* ── ProseMirror base ─────────────────────────────────────── */
        .ProseMirror {
          outline: none;
          min-height: 200px;
          font-family: var(--editor-fonte, 'Times New Roman');
          line-height: var(--editor-espacamento, 1.5);
          font-size: 12pt;
          color: #1f2937;
        }
        .ProseMirror p { margin: 0; padding: 4px 0; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; color: #adb5bd; pointer-events: none; height: 0;
        }
        /* ── Tabelas ──────────────────────────────────────────────── */
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #cbd5e1; padding: 6px 10px; min-width: 60px; position: relative; vertical-align: top; }
        .ProseMirror th { background: #f1f5f9; font-weight: 700; }
        .ProseMirror .selectedCell { background: #dbeafe; }
        .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: #3b82f6; cursor: col-resize; z-index: 10; }
        /* ── Elementos ────────────────────────────────────────────── */
        .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; color: #475569; font-style: italic; margin: 12px 0; }
        .ProseMirror code { background: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-family: monospace; font-size: 0.9em; }
        .ProseMirror pre { background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 16px; font-family: monospace; overflow-x: auto; }
        .ProseMirror h1 { font-size: 1.6em; font-weight: 800; margin: 16px 0 8px; }
        .ProseMirror h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
        .ProseMirror ul { list-style: disc; padding-left: 24px; }
        .ProseMirror ol { list-style: decimal; padding-left: 24px; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; }
        /* ── Página do documento ──────────────────────────────────── */
        /* ── Página A4 — cresce com o conteúdo ───────────────────── */
        .editor-page {
          width: 100%;
          max-width: 816px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.13);
          box-sizing: border-box;
          position: relative;
          /* SEM flex — bloco normal, cresce com os filhos */
        }
        .editor-cabecalho {
          padding: 10px var(--margem-h, 96px);
          border-bottom: 1px dashed #e2e8f0;
          font-size: 11px; color: #9ca3af;
          min-height: 36px; box-sizing: border-box;
        }
        .editor-conteudo {
          /* min-height = 1 página A4 descontando cabeçalho/rodapé/padding */
          min-height: 966px;
          padding: 48px 96px;
          box-sizing: border-box;
          position: relative;
          /* bloco normal — ProseMirror determina a altura */
        }
        .editor-rodape {
          padding: 10px var(--margem-h, 96px);
          border-top: 1px dashed #e2e8f0;
          font-size: 11px; color: #9ca3af;
          min-height: 36px; box-sizing: border-box;
        }
        /* ── Impressão (fallback Ctrl+P) ──────────────────────────── */
        @media print {
          body > *:not(.editor-outer-wrap) { display: none !important; }
          .editor-outer-wrap { overflow: visible !important; height: auto !important; display: block !important; background: white !important; }
          .editor-page { box-shadow: none !important; max-width: none !important; transform: none !important; }
          .editor-conteudo { min-height: unset !important; }
          [aria-hidden="true"] { display: none !important; }
          @page { size: A4; margin: 2.54cm; }
        }
      `}</style>

      {mostrarModalSair && (
        <ModalSairSemSalvar
          titulo={tituloLocal}
          onSalvar={handleModalSalvarESair}
          onNaoSalvar={handleModalNaoSalvar}
          onCancelar={handleModalCancelar}
        />
      )}

      <SignatureModal
        isOpen={mostrarModalAssinatura}
        onClose={() => setMostrarModalAssinatura(false)}
        documentTitle={tituloLocal}
        documentContent={editor.getHTML()}
        currentUser={currentUser || null}
        onSignatureComplete={async (record) => {
          const mySigner = record.signers.find(
            (s) => s.status === 'signed' && String(s.id) === String(currentUser?.id || 'current')
          );
          if (!docBackendRef.current) {
            throw new Error(
              'Documento ainda não está sincronizado com o backend. Salve o documento antes de assinar.'
            );
          }
          if (!mySigner) {
            throw new Error('Não foi possível identificar o assinante atual.');
          }

          const assinaturasExistentes = docBackendRef.current.assinaturas ?? [];
          const jaTemAssinaturaConcluida = assinaturasExistentes.some(
            (assinatura) => assinatura.status === 'assinado'
          );
          if (!jaTemAssinaturaConcluida) {
            const signatarios = record.signers
              .map((signer) => ({ usuario_id: Number(signer.id), ordem: signer.order }))
              .filter((signer) => Number.isFinite(signer.usuario_id));
            if (signatarios.length > 0) {
              await documentoService.iniciarAssinaturas(docBackendRef.current.id, signatarios);
            }
          }

          await documentoService.registrarAssinatura(docBackendRef.current.id, {
            protocolo: record.protocol,
            hash_assinatura: mySigner.signatureHash ?? '',
            nome_certificado: mySigner.certificateCN ?? currentUser?.name ?? '',
            cpf_certificado: mySigner.certificateCPF ?? '',
            ac_emissora: mySigner.certificateIssuer ?? 'Sistema REURB',
          });

          setRegistroAssinatura(record);
          onSave(editor.getHTML(), tituloLocal, 'Signed');
          registrarEvento('assinatura', `Assinado — Protocolo: ${record.protocol}`);
        }}
      />

      {mostrarModalFinalizado && (
        <ModalFinalizado titulo={tituloLocal} onFechar={() => setMostrarModalFinalizado(false)} />
      )}

      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Alerta de nova versão remota */}
        {alertaNovaVersao && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <span className="flex-1">{alertaNovaVersao}</span>
            <button
              onClick={async () => {
                if (!docBackendRef.current) return;
                const versao = await documentoService.buscarVersao(
                  docBackendRef.current.id,
                  docBackendRef.current.versao_atual
                );
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
            <button
              onClick={() => setAlertaNovaVersao(null)}
              className="text-amber-400 hover:text-amber-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* TOPBAR */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex flex-col flex-1 mr-4">
            <input
              type="text"
              value={tituloLocal}
              onChange={(e) => setTituloLocal(e.target.value)}
              className="text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded px-1 -ml-1 border-none bg-transparent hover:bg-slate-50"
              placeholder="Título do documento..."
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${documentoFinalizado ? 'bg-green-100 text-green-700' : registroAssinatura ? 'bg-green-100 text-green-700' : status === 'Review' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
              >
                {documentoFinalizado ? '✓ Finalizado' : registroAssinatura ? '✓ Assinado' : status}
              </span>
              {registroAssinatura && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Protocolo: {registroAssinatura.protocol}
                </span>
              )}
              {statusAutoSave === 'salvando' && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400 animate-pulse">
                  <RefreshCw size={10} className="animate-spin" /> Salvando...
                </span>
              )}
              {statusAutoSave === 'salvo' && (
                <span className="flex items-center gap-1 text-[10px] text-green-600">
                  <CheckCircle2 size={10} /> Salvo às {ultimoSalvoEm}
                </span>
              )}
              {statusAutoSave === 'idle' && ultimoSalvoEm && (
                <span className="text-[10px] text-slate-300">Auto-save: {ultimoSalvoEm}</span>
              )}
              <span className="text-[10px] text-slate-300 ml-2">
                {wordCount} palavras · {charCount} caracteres
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Avatares dos colaboradores */}
            <div className="flex -space-x-2 mr-1">
              {currentUser && (
                <div
                  title={`${currentUser.name} (você)`}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white bg-blue-600 z-10"
                >
                  {currentUser.name.charAt(0)}
                </div>
              )}
              {docBackend?.colaboradores.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  title={c.usuario.name}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white bg-slate-500"
                >
                  {c.usuario.name.charAt(0)}
                </div>
              ))}
              {(docBackend?.colaboradores.length ?? 0) > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  +{(docBackend?.colaboradores.length ?? 0) - 3}
                </div>
              )}
            </div>
            <div className="relative" ref={refMenuExport}>
              <button
                onClick={() => setMostrarMenuExportar((v) => !v)}
                disabled={exportando}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium"
              >
                <FileDown size={14} className={exportando ? 'animate-bounce' : ''} />
                {exportando ? 'Exportando...' : 'Exportar'}
                <ChevronDown size={12} />
              </button>
              {mostrarMenuExportar && (
                <div className="absolute right-0 top-10 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 min-w-[150px]">
                  <button
                    onClick={handleExportarPDF}
                    className="flex items-center gap-2 w-full px-4 py-2 text-xs text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    📄 Exportar PDF
                  </button>
                  <button
                    onClick={handleExportarDOCX}
                    className="flex items-center gap-2 w-full px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    📝 Exportar DOCX
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleSalvar}
              disabled={documentoFinalizado}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm disabled:opacity-50"
            >
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
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Régua — alinhada apenas à área do editor, não à sidebar */}
            <EditorRuler
              zoom={zoom}
              marginLeft={margemEsq}
              marginRight={margemDir}
              onMarginChange={(l, r) => {
                setMargemEsq(l);
                setMargemDir(r);
              }}
            />
            <div
              ref={editorWrapRef}
              className="editor-outer-wrap flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-6 relative"
              style={
                {
                  '--editor-fonte': fonteFamilia,
                  '--editor-espacamento': espacamento,
                  background: '#e8eaed',
                  padding: '28px 16px 60px',
                } as React.CSSProperties
              }
            >
              {/* Cursores remotos */}
              {cursoresVisiveis.map((u) => (
                <div
                  key={u.usuario_id}
                  style={{
                    position: 'absolute',
                    top: u.coords!.top - 20,
                    left: u.coords!.left + 48,
                    zIndex: 20,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: 20,
                      background: corCursor(u.usuario_id),
                      borderRadius: 2,
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: -18,
                      left: 4,
                      background: corCursor(u.usuario_id),
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.usuario_name}
                  </span>
                </div>
              ))}
              <div
                ref={printAreaRef}
                className="editor-page editor-print-area"
                style={
                  {
                    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                    transformOrigin: 'top center',
                    '--margem-h': `${margemEsq}px`,
                  } as React.CSSProperties
                }
              >
                {/* sem frame divs - papel branco único via CSS */}

                {/* Cabeçalho */}
                <div
                  ref={refCabecalho}
                  contentEditable={!somenteLeitura}
                  suppressContentEditableWarning
                  className="editor-cabecalho focus:outline-none focus:bg-blue-50 transition-colors"
                  style={{ fontFamily: fonteFamilia }}
                >
                  {!somenteLeitura && (
                    <span className="pointer-events-none select-none italic text-gray-400">
                      Cabeçalho — clique para editar
                    </span>
                  )}
                </div>

                {/* Conteúdo editável */}
                <div
                  className="editor-conteudo"
                  style={{ paddingLeft: margemEsq, paddingRight: margemDir }}
                >
                  {/* Indicadores de quebra de página — apenas nas margens, sem cobrir texto */}
                  {pageBreakLines.map((y, i) => (
                    <React.Fragment key={i}>
                      {/* linha na margem esquerda */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          width: margemEsq - 12,
                          top: y,
                          height: 1,
                          background: '#94a3b8',
                          pointerEvents: 'none',
                        }}
                      />
                      {/* rótulo "Pg N" na margem esquerda */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 4,
                          top: y - 14,
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#94a3b8',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        Pg {i + 2}
                      </div>
                      {/* linha na margem direita */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          right: 0,
                          width: margemDir - 12,
                          top: y,
                          height: 1,
                          background: '#94a3b8',
                          pointerEvents: 'none',
                        }}
                      />
                    </React.Fragment>
                  ))}
                  <div ref={prosemirrorWrapRef}>
                    <EditorContent editor={editor} />
                  </div>
                </div>

                {/* Rodapé */}
                <div
                  ref={refRodape}
                  contentEditable={!somenteLeitura}
                  suppressContentEditableWarning
                  className="editor-rodape focus:outline-none focus:bg-blue-50 transition-colors"
                  style={{ fontFamily: fonteFamilia }}
                >
                  {!somenteLeitura && (
                    <span className="pointer-events-none select-none italic text-gray-400">
                      Rodapé — clique para editar
                    </span>
                  )}
                </div>
              </div>

              {registroAssinatura && (
                <>
                  <div className="page-break-indicator" aria-hidden>
                    Página de Assinaturas
                  </div>
                  <div className="editor-page" style={{ minHeight: 'auto' }}>
                    <div
                      className="editor-conteudo"
                      style={{ minHeight: 'auto', paddingTop: 32, paddingBottom: 32 }}
                    >
                      <BlocoAssinatura record={registroAssinatura} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* fecha flex-1 flex-col (wrapper da régua + scroll) */}

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
                {docBackend && (
                  <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-black">
                    {1 + docBackend.colaboradores.length}
                  </span>
                )}
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
              {abaAtiva === 'participantes' &&
                (docBackend ? (
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
                      <p className="text-xs text-slate-400">
                        Conectando ao servidor para carregar participantes...
                      </p>
                    </div>
                  </div>
                ))}
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

        {/* ── BARRA DE STATUS ── */}
        <div className="flex items-center justify-between px-4 py-1 border-t border-slate-200 bg-white text-[11px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>
              Página{' '}
              <strong className="text-slate-700">
                {Math.min(numPaginas, Math.max(1, Math.ceil(alturaConteudo / PAGE_CONTENT_H)))}
              </strong>{' '}
              de <strong className="text-slate-700">{numPaginas}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong className="text-slate-700">{wordCount}</strong> palavras
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong className="text-slate-700">{charCount}</strong> caracteres
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setZoom((z) => {
                  const idx = ZOOM_LEVELS.indexOf(z);
                  return idx > 0 ? ZOOM_LEVELS[idx - 1] : z;
                })
              }
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 font-bold"
              title="Diminuir zoom"
            >
              −
            </button>
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="text-[11px] border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              title="Zoom"
            >
              {ZOOM_LEVELS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                setZoom((z) => {
                  const idx = ZOOM_LEVELS.indexOf(z);
                  return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : z;
                })
              }
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 font-bold"
              title="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Editor;
