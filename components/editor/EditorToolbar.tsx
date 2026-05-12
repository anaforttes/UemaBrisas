import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Table2, Image as ImageIcon, Link as LinkIcon, Minus,
  Highlighter, Undo, Redo, FileCheck, CheckCheck, Quote, Code,
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
  onAbrirModalAssinatura: () => void;
  onFinalizarFluxo: () => void;
}

const BotaoToolbar: React.FC<{
  onClick: () => void;
  title: string;
  ativo?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, title, ativo, disabled, children, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`flex items-center justify-center w-7 h-7 rounded-md transition-all text-sm ${ativo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-slate-200 mx-0.5" />;

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor, somenteLeitura,
  tamanhoFonte, setTamanhoFonte,
  fonteFamilia, setFonteFamilia,
  espacamento, setEspacamento,
  inserirTabela, inserirImagem, inserirLink,
  registroAssinatura, documentoFinalizado,
  onAbrirModalAssinatura, onFinalizarFluxo,
}) => (
  <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-100 bg-white flex-wrap">
    <BotaoToolbar onClick={() => editor.chain().focus().undo().run()} title="Desfazer" disabled={!editor.can().undo()}><Undo size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().redo().run()} title="Refazer"  disabled={!editor.can().redo()}><Redo  size={14} /></BotaoToolbar>
    <Sep />
    <select
      value={tamanhoFonte}
      onChange={(e) => { setTamanhoFonte(e.target.value); (editor.chain().focus() as any).setFontSize(`${e.target.value}pt`).run(); }}
      disabled={somenteLeitura}
      className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none w-16"
    >
      {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map((t) => <option key={t} value={t}>{t}pt</option>)}
    </select>
    <select
      value={fonteFamilia}
      onChange={(e) => setFonteFamilia(e.target.value)}
      disabled={somenteLeitura}
      className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none w-36 ml-1"
      style={{ fontFamily: fonteFamilia }}
    >
      <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
      <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
    </select>
    <select
      value={espacamento}
      onChange={(e) => setEspacamento(e.target.value)}
      disabled={somenteLeitura}
      title="Espaçamento entre linhas"
      className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none w-16 ml-1"
    >
      <option value="1">1.0</option>
      <option value="1.15">1.15</option>
      <option value="1.5">1.5</option>
      <option value="2">2.0</option>
    </select>
    <select
      onChange={(e) => {
        const v = e.target.value;
        if (v === 'p')  editor.chain().focus().setParagraph().run();
        if (v === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
        if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
        if (v === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
      }}
      value={
        editor.isActive('heading', { level: 1 }) ? 'h1' :
        editor.isActive('heading', { level: 2 }) ? 'h2' :
        editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
      }
      disabled={somenteLeitura}
      className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none w-24 ml-1"
    >
      <option value="p">Normal</option>
      <option value="h1">Título 1</option>
      <option value="h2">Título 2</option>
      <option value="h3">Título 3</option>
    </select>
    <Sep />
    <BotaoToolbar onClick={() => editor.chain().focus().toggleBold().run()}      title="Negrito"    ativo={editor.isActive('bold')}      disabled={somenteLeitura}><Bold          size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleItalic().run()}    title="Itálico"    ativo={editor.isActive('italic')}    disabled={somenteLeitura}><Italic        size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado" ativo={editor.isActive('underline')} disabled={somenteLeitura}><UnderlineIcon size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleStrike().run()}    title="Tachado"    ativo={editor.isActive('strike')}    disabled={somenteLeitura}><Strikethrough size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleHighlight().run()} title="Destacar"   ativo={editor.isActive('highlight')} disabled={somenteLeitura} className="text-yellow-500"><Highlighter size={14} /></BotaoToolbar>
    <Sep />
    <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('left').run()}    title="Esquerda"   ativo={editor.isActive({ textAlign: 'left' })}    disabled={somenteLeitura}><AlignLeft    size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('center').run()}  title="Centro"     ativo={editor.isActive({ textAlign: 'center' })}  disabled={somenteLeitura}><AlignCenter  size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('right').run()}   title="Direita"    ativo={editor.isActive({ textAlign: 'right' })}   disabled={somenteLeitura}><AlignRight   size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justificar" ativo={editor.isActive({ textAlign: 'justify' })} disabled={somenteLeitura}><AlignJustify size={14} /></BotaoToolbar>
    <Sep />
    <BotaoToolbar onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Lista"          ativo={editor.isActive('bulletList')}  disabled={somenteLeitura}><List        size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada" ativo={editor.isActive('orderedList')} disabled={somenteLeitura}><ListOrdered size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="Citação"        ativo={editor.isActive('blockquote')}  disabled={somenteLeitura}><Quote       size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleCodeBlock().run()}   title="Código"         ativo={editor.isActive('codeBlock')}   disabled={somenteLeitura}><Code        size={14} /></BotaoToolbar>
    <Sep />
    <BotaoToolbar onClick={inserirTabela} title="Inserir tabela" disabled={somenteLeitura} className="text-emerald-600"><Table2    size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={inserirImagem} title="Inserir imagem" disabled={somenteLeitura} className="text-purple-600"><ImageIcon size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={inserirLink}   title="Inserir link"   disabled={somenteLeitura} className="text-blue-600"  ><LinkIcon  size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória" disabled={somenteLeitura}><Minus size={14} /></BotaoToolbar>
    <Sep />
    {editor.isActive('table') && (
      <>
        <BotaoToolbar onClick={() => editor.chain().focus().mergeCells().run()}      title="Mesclar células" disabled={somenteLeitura || !editor.can().mergeCells()} className="text-emerald-600"><span className="text-[10px] font-bold">⊞</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().splitCell().run()}       title="Dividir célula"  disabled={somenteLeitura || !editor.can().splitCell()}  className="text-emerald-600"><span className="text-[10px] font-bold">⊟</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().addColumnBefore().run()} title="Coluna antes"    disabled={somenteLeitura} className="text-slate-500"><span className="text-[10px] font-bold">+|</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().addColumnAfter().run()}  title="Coluna depois"   disabled={somenteLeitura} className="text-slate-500"><span className="text-[10px] font-bold">|+</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().addRowBefore().run()}    title="Linha acima"     disabled={somenteLeitura} className="text-slate-500"><span className="text-[10px] font-bold">+—</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().addRowAfter().run()}     title="Linha abaixo"    disabled={somenteLeitura} className="text-slate-500"><span className="text-[10px] font-bold">—+</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().deleteColumn().run()}    title="Deletar coluna"  disabled={somenteLeitura} className="text-rose-500"><span className="text-[10px] font-bold">✕|</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().deleteRow().run()}       title="Deletar linha"   disabled={somenteLeitura} className="text-rose-500"><span className="text-[10px] font-bold">✕—</span></BotaoToolbar>
        <BotaoToolbar onClick={() => editor.chain().focus().deleteTable().run()}     title="Deletar tabela"  disabled={somenteLeitura} className="text-rose-600"><span className="text-[10px] font-bold">✕⊞</span></BotaoToolbar>
        <Sep />
      </>
    )}
    <BotaoToolbar onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1" ativo={editor.isActive('heading', { level: 1 })} disabled={somenteLeitura}><Heading1 size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2" ativo={editor.isActive('heading', { level: 2 })} disabled={somenteLeitura}><Heading2 size={14} /></BotaoToolbar>
    <BotaoToolbar onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3" ativo={editor.isActive('heading', { level: 3 })} disabled={somenteLeitura}><Heading3 size={14} /></BotaoToolbar>
    <div className="flex items-center gap-2 ml-auto">
      <button
        onClick={onAbrirModalAssinatura}
        disabled={!!registroAssinatura || documentoFinalizado}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold disabled:opacity-50"
      >
        <FileCheck size={14} /> {registroAssinatura ? '✓ Assinado' : 'Assinar'}
      </button>
      <button
        onClick={onFinalizarFluxo}
        disabled={documentoFinalizado}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold disabled:opacity-50"
      >
        <CheckCheck size={14} /> {documentoFinalizado ? '✓ Finalizado' : 'Finalizar Fluxo'}
      </button>
    </div>
  </div>
);

export default EditorToolbar;
