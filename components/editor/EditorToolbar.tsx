import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table2,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  Highlighter,
  Undo,
  Redo,
  FileCheck,
  CheckCheck,
  Quote,
  RemoveFormatting,
  Indent,
  Outdent,
  ChevronDown,
} from 'lucide-react';
import type { SignatureRecord } from '../../services/assinaturaService';

interface EditorToolbarProps {
  editor: Editor;
  somenteLeitura: boolean;
  tamanhoFonte: string;
  setTamanhoFonte: (v: string) => void;
  fonteFamilia: string;
  setFonteFamilia: (v: string) => void;
  espacamento: string;
  setEspacamento: (v: string) => void;
  inserirTabela: () => void;
  inserirImagem: () => void;
  inserirLink: () => void;
  registroAssinatura: SignatureRecord | null;
  documentoFinalizado: boolean;
  mostrarBotaoAssinar?: boolean;
  onAbrirModalAssinatura: () => void;
  onFinalizarFluxo: () => void;
}

/* ── paleta de cores ─────────────────────────────────────── */
const CORES_TEXTO = [
  '#000000',
  '#1f2937',
  '#374151',
  '#6b7280',
  '#9ca3af',
  '#d1d5db',
  '#ffffff',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#fca5a5',
  '#fed7aa',
  '#fde68a',
  '#bbf7d0',
  '#bfdbfe',
  '#ddd6fe',
  '#fbcfe8',
];

const CORES_DESTAQUE = [
  '#fef08a',
  '#fed7aa',
  '#bbf7d0',
  '#bfdbfe',
  '#fecdd3',
  '#e9d5ff',
  '#f3f4f6',
];

/* ── sub-components ─────────────────────────────────────── */
const Btn: React.FC<{
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, title, active, disabled, children, className = '' }) => (
  <button
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    disabled={disabled}
    className={`
      flex items-center justify-center w-7 h-7 rounded transition-all text-[13px] select-none
      ${
        active
          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      }
      ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
      ${className}
    `}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;

const SelectCtrl: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  children: React.ReactNode;
}> = ({ value, onChange, disabled, className = '', title, children }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    title={title}
    className={`text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 bg-white
      focus:ring-1 focus:ring-blue-400 focus:outline-none hover:border-slate-300
      disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </select>
);

/* ── Color Picker Popover ────────────────────────────────── */
const ColorPicker: React.FC<{
  cores: string[];
  onSelect: (cor: string) => void;
  label: string;
  currentColor?: string;
}> = ({ cores, onSelect, label, currentColor }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        title={label}
        className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-all cursor-pointer"
      >
        <span className="text-[11px] font-black text-slate-700 leading-none">A</span>
        <span
          className="w-4 h-1 rounded-full mt-0.5"
          style={{ background: currentColor || '#000' }}
        />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-2 w-36">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            {label}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {cores.map((cor) => (
              <button
                key={cor}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(cor);
                  setOpen(false);
                }}
                title={cor}
                className="w-4 h-4 rounded-sm border border-slate-200 hover:scale-125 transition-transform"
                style={{ background: cor }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Highlight color button ──────────────────────────────── */
const HighlightPicker: React.FC<{ editor: Editor; disabled?: boolean }> = ({
  editor,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        title="Cor de destaque"
        disabled={disabled}
        className={`flex items-center gap-0.5 px-1.5 h-7 rounded hover:bg-slate-100 transition-all
          ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Highlighter size={13} className="text-yellow-500" />
        <ChevronDown size={10} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-2 w-32">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            Destaque
          </p>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {CORES_DESTAQUE.map((cor) => (
              <button
                key={cor}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleHighlight({ color: cor }).run();
                  setOpen(false);
                }}
                title={cor}
                className="w-4 h-4 rounded-sm border border-slate-200 hover:scale-125 transition-transform"
                style={{ background: cor }}
              />
            ))}
          </div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().unsetHighlight().run();
              setOpen(false);
            }}
            className="w-full text-[10px] text-slate-500 hover:text-slate-700 font-medium py-0.5"
          >
            Remover destaque
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Main Toolbar ────────────────────────────────────────── */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  somenteLeitura,
  tamanhoFonte,
  setTamanhoFonte,
  fonteFamilia,
  setFonteFamilia,
  espacamento,
  setEspacamento,
  inserirTabela,
  inserirImagem,
  inserirLink,
  registroAssinatura,
  documentoFinalizado,
  mostrarBotaoAssinar = true,
  onAbrirModalAssinatura,
  onFinalizarFluxo,
}) => {
  const d = somenteLeitura;

  const atributosCelula = {
    ...(editor.getAttributes('tableCell') as any),
    ...(editor.getAttributes('tableHeader') as any),
  };

  const mesclarECentralizarCelula = () => {
    editor
      .chain()
      .focus()
      .mergeCells()
      .setCellAttribute('textAlign', 'center')
      .setCellAttribute('verticalAlign', 'middle')
      .setTextAlign('center')
      .run();
  };

  const currentColor = (() => {
    try {
      return (editor.getAttributes('textStyle') as { color?: string })?.color || '#000000';
    } catch {
      return '#000000';
    }
  })();

  return (
    <div className="border-b border-slate-200 bg-white shrink-0 shadow-sm">
      {/* ── Linha 1: Histórico · Estilos · Fonte ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 flex-wrap">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <Btn
            onClick={() => editor.chain().focus().undo().run()}
            title="Desfazer (Ctrl+Z)"
            disabled={!editor.can().undo()}
          >
            <Undo size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().redo().run()}
            title="Refazer (Ctrl+Y)"
            disabled={!editor.can().redo()}
          >
            <Redo size={13} />
          </Btn>
        </div>

        <Sep />

        {/* Estilo de parágrafo */}
        <SelectCtrl
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
          }
          onChange={(v) => {
            if (v === 'p') editor.chain().focus().setParagraph().run();
            if (v === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (v === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          disabled={d}
          className="w-28"
          title="Estilo de parágrafo"
        >
          <option value="p">Normal</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
        </SelectCtrl>

        <Sep />

        {/* Família de fonte */}
        <SelectCtrl
          value={fonteFamilia}
          onChange={setFonteFamilia}
          disabled={d}
          className="w-40"
          title="Fonte"
        >
          {[
            'Calibri',
            'Arial',
            'Times New Roman',
            'Georgia',
            'Verdana',
            'Trebuchet MS',
            'Courier New',
            'Comic Sans MS',
          ].map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </SelectCtrl>

        {/* Tamanho da fonte */}
        <div className="flex items-center">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const n = Math.max(6, parseInt(tamanhoFonte) - 1);
              setTamanhoFonte(String(n));
              editor.chain().focus().setFontSize(`${n}pt`).run();
            }}
            disabled={d}
            className="w-5 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-l border border-slate-200 border-r-0 disabled:opacity-30"
            title="Diminuir fonte"
          >
            ‹
          </button>
          <input
            type="text"
            value={tamanhoFonte}
            disabled={d}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setTamanhoFonte(v);
            }}
            onBlur={(e) => {
              const n = Math.max(6, Math.min(96, parseInt(e.target.value) || 12));
              setTamanhoFonte(String(n));
              editor.chain().focus().setFontSize(`${n}pt`).run();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = Math.max(6, Math.min(96, parseInt(tamanhoFonte) || 12));
                editor.chain().focus().setFontSize(`${n}pt`).run();
              }
            }}
            className="w-10 h-7 text-center text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
            title="Tamanho da fonte"
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const n = Math.min(96, parseInt(tamanhoFonte) + 1);
              setTamanhoFonte(String(n));
              editor.chain().focus().setFontSize(`${n}pt`).run();
            }}
            disabled={d}
            className="w-5 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-r border border-slate-200 border-l-0 disabled:opacity-30"
            title="Aumentar fonte"
          >
            ›
          </button>
        </div>

        <Sep />

        {/* Espaçamento */}
        <SelectCtrl
          value={espacamento}
          onChange={setEspacamento}
          disabled={d}
          className="w-16"
          title="Espaçamento entre linhas"
        >
          <option value="1">1,0</option>
          <option value="1.15">1,15</option>
          <option value="1.5">1,5</option>
          <option value="2">2,0</option>
          <option value="2.5">2,5</option>
          <option value="3">3,0</option>
        </SelectCtrl>

        {/* Ações do documento (direita) */}
        <div className="flex items-center gap-2 ml-auto">
          {mostrarBotaoAssinar && (
            <button
              onClick={onAbrirModalAssinatura}
              disabled={!!registroAssinatura || documentoFinalizado}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold disabled:opacity-50 shadow-sm shadow-blue-200"
            >
              <FileCheck size={13} />
              {registroAssinatura ? '✓ Assinado' : 'Assinar'}
            </button>
          )}
          <button
            onClick={onFinalizarFluxo}
            disabled={documentoFinalizado}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold disabled:opacity-50 shadow-sm shadow-emerald-200"
          >
            <CheckCheck size={13} />
            {documentoFinalizado ? '✓ Finalizado' : 'Finalizar'}
          </button>
        </div>
      </div>

      {/* ── Linha 2: Formatação · Alinhamento · Listas · Inserir ── */}
      <div className="flex items-center gap-0.5 px-3 py-1 flex-wrap">
        {/* Formatação de caractere */}
        <div className="flex items-center gap-0.5">
          <Btn
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrito (Ctrl+B)"
            active={editor.isActive('bold')}
            disabled={d}
          >
            <Bold size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Itálico (Ctrl+I)"
            active={editor.isActive('italic')}
            disabled={d}
          >
            <Italic size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Sublinhado (Ctrl+U)"
            active={editor.isActive('underline')}
            disabled={d}
          >
            <UnderlineIcon size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Tachado"
            active={editor.isActive('strike')}
            disabled={d}
          >
            <Strikethrough size={13} />
          </Btn>
        </div>

        <Sep />

        {/* Cor do texto + Destaque */}
        <ColorPicker
          cores={CORES_TEXTO}
          onSelect={(cor) => editor.chain().focus().setColor(cor).run()}
          label="Cor do texto"
          currentColor={currentColor}
        />
        <HighlightPicker editor={editor} disabled={d} />

        {/* Limpar formatação */}
        <Btn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Limpar formatação"
          disabled={d}
        >
          <RemoveFormatting size={13} />
        </Btn>

        <Sep />

        {/* Alinhamento */}
        <div className="flex items-center gap-0.5">
          <Btn
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Alinhar à esquerda (Ctrl+L)"
            active={editor.isActive({ textAlign: 'left' })}
            disabled={d}
          >
            <AlignLeft size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Centralizar (Ctrl+E)"
            active={editor.isActive({ textAlign: 'center' })}
            disabled={d}
          >
            <AlignCenter size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Alinhar à direita (Ctrl+R)"
            active={editor.isActive({ textAlign: 'right' })}
            disabled={d}
          >
            <AlignRight size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            title="Justificar (Ctrl+J)"
            active={editor.isActive({ textAlign: 'justify' })}
            disabled={d}
          >
            <AlignJustify size={13} />
          </Btn>
        </div>

        <Sep />

        {/* Listas + Recuo */}
        <div className="flex items-center gap-0.5">
          <Btn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista com marcadores"
            active={editor.isActive('bulletList')}
            disabled={d}
          >
            <List size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
            active={editor.isActive('orderedList')}
            disabled={d}
          >
            <ListOrdered size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Citação"
            active={editor.isActive('blockquote')}
            disabled={d}
          >
            <Quote size={13} />
          </Btn>
        </div>

        <div className="flex items-center gap-0.5 ml-0.5">
          <Btn
            onClick={() => {
              if (editor.isActive('listItem')) {
                editor.chain().focus().sinkListItem('listItem').run();
              } else {
                editor.chain().focus().insertContent('    ').run();
              }
            }}
            title="Aumentar recuo (Tab)"
            disabled={d}
          >
            <Indent size={13} />
          </Btn>
          <Btn
            onClick={() => {
              if (editor.isActive('listItem')) {
                editor.chain().focus().liftListItem('listItem').run();
              }
            }}
            title="Diminuir recuo (Shift+Tab)"
            disabled={d || !editor.isActive('listItem')}
          >
            <Outdent size={13} />
          </Btn>
        </div>

        <Sep />

        {/* Inserir */}
        <div className="flex items-center gap-0.5">
          <Btn
            onClick={inserirTabela}
            title="Inserir tabela"
            disabled={d}
            className="text-teal-600"
          >
            <Table2 size={13} />
          </Btn>
          <Btn
            onClick={inserirImagem}
            title="Inserir imagem"
            disabled={d}
            className="text-violet-600"
          >
            <ImageIcon size={13} />
          </Btn>
          <Btn onClick={inserirLink} title="Inserir link" disabled={d} className="text-blue-600">
            <LinkIcon size={13} />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Linha divisória"
            disabled={d}
          >
            <Minus size={13} />
          </Btn>
        </div>

        {/* Controles de tabela (contextuais) */}
        {editor.isActive('table') && (
          <>
            <Sep />
            <div className="flex items-center gap-0.5">
              <SelectCtrl
                value={atributosCelula.textAlign || 'auto'}
                onChange={(v) => {
                  const align = v === 'auto' ? null : v;
                  editor.chain().focus().setCellAttribute('textAlign', align).run();
                  if (align)
                    editor
                      .chain()
                      .focus()
                      .setTextAlign(align as any)
                      .run();
                }}
                disabled={d}
                title="Alinhamento horizontal da célula"
                className="w-20"
              >
                <option value="auto">Auto</option>
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </SelectCtrl>
              <SelectCtrl
                value={atributosCelula.verticalAlign || 'top'}
                onChange={(v) => editor.chain().focus().setCellAttribute('verticalAlign', v).run()}
                disabled={d}
                title="Alinhamento vertical da célula"
                className="w-20"
              >
                <option value="top">Topo</option>
                <option value="middle">Meio</option>
                <option value="bottom">Base</option>
              </SelectCtrl>
              <SelectCtrl
                value={atributosCelula.writingMode || 'horizontal'}
                onChange={(v) =>
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute('writingMode', v === 'horizontal' ? null : v)
                    .run()
                }
                disabled={d}
                title="Orientação do texto da célula"
                className="w-24"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical-rl">Vertical</option>
                <option value="vertical-lr">Vertical invertido</option>
              </SelectCtrl>
              <Btn
                onClick={mesclarECentralizarCelula}
                title="Mesclar e centralizar células"
                disabled={d || !editor.can().mergeCells()}
                className="text-teal-600"
              >
                <span className="text-[10px] font-bold leading-none">⊞</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().splitCell().run()}
                title="Dividir célula"
                disabled={d || !editor.can().splitCell()}
                className="text-teal-600"
              >
                <span className="text-[10px] font-bold leading-none">⊟</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                title="Coluna antes"
                disabled={d}
              >
                <span className="text-[10px] font-bold leading-none">+|</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                title="Coluna depois"
                disabled={d}
              >
                <span className="text-[10px] font-bold leading-none">|+</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().addRowBefore().run()}
                title="Linha acima"
                disabled={d}
              >
                <span className="text-[10px] font-bold leading-none">+—</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().addRowAfter().run()}
                title="Linha abaixo"
                disabled={d}
              >
                <span className="text-[10px] font-bold leading-none">—+</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title="Excluir coluna"
                disabled={d}
                className="text-rose-500"
              >
                <span className="text-[10px] font-bold leading-none">✕|</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().deleteRow().run()}
                title="Excluir linha"
                disabled={d}
                className="text-rose-500"
              >
                <span className="text-[10px] font-bold leading-none">✕—</span>
              </Btn>
              <Btn
                onClick={() => editor.chain().focus().deleteTable().run()}
                title="Excluir tabela"
                disabled={d}
                className="text-rose-600"
              >
                <span className="text-[10px] font-bold leading-none">✕⊞</span>
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;
