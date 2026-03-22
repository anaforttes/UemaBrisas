import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── TipTap ───────────────────────────────────────────────────────────────────
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
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
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Table2, Image as ImageIcon, Link as LinkIcon, Minus,
  Highlighter, Undo, Redo, Save, FileDown, Wand2,
  MessageSquare, Clock, Sparkles, CheckCircle2, X,
  RefreshCw, Shield, FileCheck, CheckCheck, ChevronDown,
  Quote, Code, Users,
} from 'lucide-react';

// ─── Serviços e tipos ─────────────────────────────────────────────────────────
import {
  Document, Packer, Paragraph, TextRun,
  Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, VerticalAlign, Header, Footer, PageNumber, LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { geminiService } from '../../services/geminiService';
import { User } from '../../types/index';
import { dbService } from '../../services/databaseService';
import { SignatureModal } from './SignatureModal';
import type { SignatureRecord } from '../../services/assinaturaService';
import PainelComentarios from './PainelComentarios';
import HistoricoVersoes, { Versao, EventoAuditoria } from './HistoricoVersoes';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EditorProps {
  initialContent: string;
  title: string;
  onSave: (content: string, title: string, status?: string) => void;
  status: string;
  currentUser?: User | null;
}

type AbaAtiva = 'ia' | 'comentarios' | 'historico';

const gerarId = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Extensão FontSize customizada ───────────────────────────────────────────

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return { types: ['textStyle'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: any) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    } as any;
  },
});

// ─── Componente React da Imagem ───────────────────────────────────────────────
// Renderizado pelo TipTap no lugar de cada imagem
// Tem alças de redimensionamento e toolbar igual Google Docs

const ImageNodeView: React.FC<any> = ({ node, updateAttributes, selected, editor }) => {
  const { src, alt, width, align } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  // Estilo do container conforme alinhamento
  const containerStyle: React.CSSProperties = {
    display: 'block',
    textAlign: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
    margin: align === 'center' ? '8px auto' : '8px 0',
    position: 'relative',
    lineHeight: 0,
  };

  // Estilo da imagem
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

  // Definição das 8 alças de redimensionamento
  const alcas = [
    { pos: 'nw', style: { top: -5,    left: -5,                                      cursor: 'nw-resize' } },
    { pos: 'n',  style: { top: -5,    left: '50%' as any, transform: 'translateX(-50%)', cursor: 'n-resize'  } },
    { pos: 'ne', style: { top: -5,    right: -5,                                     cursor: 'ne-resize' } },
    { pos: 'e',  style: { top: '50%' as any, right: -5,   transform: 'translateY(-50%)', cursor: 'e-resize'  } },
    { pos: 'se', style: { bottom: -5, right: -5,                                     cursor: 'se-resize' } },
    { pos: 's',  style: { bottom: -5, left: '50%' as any, transform: 'translateX(-50%)', cursor: 's-resize'  } },
    { pos: 'sw', style: { bottom: -5, left: -5,                                      cursor: 'sw-resize' } },
    { pos: 'w',  style: { top: '50%' as any, left: -5,    transform: 'translateY(-50%)', cursor: 'w-resize'  } },
  ];

  // Lógica de redimensionamento ao arrastar alça
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

        {/* A imagem em si */}
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          style={imgStyle}
          draggable={false}
        />

        {/* Alças e toolbar — só visíveis quando selecionada */}
        {selected && (
          <>
            {/* 8 alças de redimensionamento */}
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

            {/* Toolbar abaixo da imagem — igual Google Docs */}
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
              {/* Alinhamento */}
              <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginRight: 4 }}>
                ALINHAR
              </span>

              {[
                { label: '◧', title: 'Esquerda', value: 'left'   },
                { label: '▣', title: 'Centro',   value: 'center' },
                { label: '◨', title: 'Direita',  value: 'right'  },
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

              <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch', margin: '0 4px' }} />

              {/* Tamanho em % */}
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

              <div style={{ width: 1, background: '#e2e8f0', alignSelf: 'stretch', margin: '0 4px' }} />

              {/* Botão deletar */}
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
      src:   { default: null },
      alt:   { default: null },
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
      align === 'center' ? 'margin:8px auto;' :
      align === 'right'  ? 'margin:8px 0 8px auto;' :
      'margin:8px 0;';

    return [
      'img',
      mergeAttributes(rest, {
        style: `width:${width || '100%'};display:block;${marginStyle}`,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
        (options: Record<string, any>) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    } as any;
  },
});

// ─── Exportar PDF ─────────────────────────────────────────────────────────────

const exportarPDF = (
  titulo: string,
  conteudoHtml: string,
  record?: SignatureRecord | null
): Promise<void> => {
  const carregarScript = (): Promise<void> =>
    new Promise((resolve) => {
      if ((window as any).html2pdf) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });

  return carregarScript().then(() => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;">
        <h1 style="font-size:14pt;font-weight:bold;margin:0;">PREFEITURA MUNICIPAL</h1>
        <p style="margin:0;">SECRETARIA DE REGULARIZAÇÃO FUNDIÁRIA – REURB</p>
        <p style="font-weight:bold;margin-top:6pt;">${titulo || 'DOCUMENTO OFICIAL'}</p>
      </div>
      <div style="font-family:'Times New Roman';font-size:12pt;line-height:1.5;">${conteudoHtml}</div>
      ${record ? `
        <div style="margin-top:20pt;border-top:2pt solid #1e3a8a;padding-top:12pt;">
          <strong style="color:#1e3a8a;">✓ REGISTRO DE ASSINATURAS DIGITAIS</strong><br/>
          <span style="color:#3b82f6;font-size:9pt;">Protocolo: ${record.protocol}</span>
          ${record.signers.map((s, i) => `
            <div style="margin-top:6pt;padding:6pt;border:1pt solid #dcfce7;border-radius:4pt;">
              <strong>${i + 1}. ${s.name} — ${s.role}</strong><br/>
              <span style="font-size:8pt;">Assinado em: ${s.signedAt ? new Date(s.signedAt).toLocaleString('pt-BR') : '-'}</span>
            </div>
          `).join('')}
        </div>` : ''
      }
    `;

    return (window as any).html2pdf()
      .set({
        margin: [2, 2, 2, 2],
        filename: `${titulo || 'documento'}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
      })
      .from(wrapper)
      .save();
  });
};

// ─── Exportar DOCX ────────────────────────────────────────────────────────────

const exportarDOCX = async (titulo: string, conteudoHtml: string): Promise<void> => {
  const borda = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
  const bordasCelula = { top: borda, bottom: borda, left: borda, right: borda };

  // Converte nós DOM em TextRun do docx
  const parseNo = (no: ChildNode): any[] => {
    if (no.nodeType === 3) {
      // Nó de texto
      const texto = no.textContent || '';
      if (!texto.trim()) return [];
      return [new TextRun({ text: texto, size: 24, font: 'Times New Roman' })];
    }

    if (no.nodeType !== 1) return [];

    const el = no as HTMLElement;
    const filhos = () => Array.from(el.childNodes).flatMap(parseNo);

    switch (el.tagName?.toLowerCase()) {
      case 'b':
      case 'strong':
        return filhos().map((r: any) => new TextRun({ ...r.options, bold: true }));
      case 'i':
      case 'em':
        return filhos().map((r: any) => new TextRun({ ...r.options, italics: true }));
      case 'br':
        return [new TextRun({ text: '', break: 1 })];
      default:
        return filhos();
    }
  };

  // Converte elementos bloco em parágrafos/tabelas do docx
  const parseBloco = (el: Element): any[] => {
    const tag = el.tagName?.toLowerCase();
    const filhos = Array.from(el.childNodes).flatMap(parseNo);

    switch (tag) {
      case 'h1':
        return [new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 28, font: 'Times New Roman' })],
        })];

      case 'h2':
        return [new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 26, font: 'Times New Roman' })],
        })];

      case 'p':
        return [new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 160 },
          children: filhos.length ? filhos : [new TextRun({ text: '', size: 24 })],
        })];

      case 'ul':
      case 'ol':
        return Array.from(el.querySelectorAll('li')).map((li) =>
          new Paragraph({
            numbering: { reference: tag === 'ol' ? 'numeros' : 'marcadores', level: 0 },
            children: [new TextRun({ text: li.textContent || '', size: 24, font: 'Times New Roman' })],
          })
        );

      case 'table': {
        const linhas = Array.from(el.querySelectorAll('tr'));
        const maxCols = Math.max(...linhas.map((r) => r.querySelectorAll('th,td').length));
        if (maxCols === 0) return [];
        const largura = Math.floor(9026 / maxCols);

        return [new DocxTable({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: Array(maxCols).fill(largura),
          rows: linhas.map((linha, idx) =>
            new DocxTableRow({
              tableHeader: idx === 0,
              children: Array.from(linha.querySelectorAll('th,td')).map((celula) => {
                const ehCabecalho = celula.tagName.toLowerCase() === 'th';
                return new DocxTableCell({
                  borders: bordasCelula,
                  shading: ehCabecalho ? { fill: 'D9D9D9', type: ShadingType.CLEAR } : undefined,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({
                    alignment: ehCabecalho ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [new TextRun({
                      text: celula.textContent || '',
                      bold: ehCabecalho,
                      size: 22,
                      font: 'Times New Roman',
                    })],
                  })],
                });
              }),
            })
          ),
        })];
      }

      default:
        return filhos.length
          ? [new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: filhos })]
          : [];
    }
  };

  const temp = document.createElement('div');
  temp.innerHTML = conteudoHtml;

  const conteudo: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'PREFEITURA MUNICIPAL', bold: true, size: 26, font: 'Times New Roman' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: (titulo || 'DOCUMENTO OFICIAL').toUpperCase(), bold: true, size: 28, font: 'Times New Roman' })],
    }),
  ];

  Array.from(temp.children).forEach((el) => conteudo.push(...parseBloco(el)));

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'marcadores',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: 'numeros',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
            children: [new TextRun({ text: `REURBDoc | ${titulo}`, size: 18, color: '888888', font: 'Arial', italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
            children: [
              new TextRun({ text: 'Lei nº 13.465/2017  |  Página ', size: 18, color: '888888', font: 'Arial' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Arial' }),
              new TextRun({ text: ' de ', size: 18, color: '888888', font: 'Arial' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888', font: 'Arial' }),
            ],
          })],
        }),
      },
      children: conteudo,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${titulo || 'documento'}.docx`);
};

// ─── Botão da toolbar ─────────────────────────────────────────────────────────

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
    className={`
      flex items-center justify-center w-7 h-7 rounded-md transition-all text-sm
      ${ativo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      ${className}
    `}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-slate-200 mx-0.5" />;

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
          <div key={signer.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-100">
            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-800">
                {idx + 1}. {signer.name} — {signer.role}
              </p>
              <p className="text-[11px] text-slate-500">
                Assinado em: {signer.signedAt ? new Date(signer.signedAt).toLocaleString('pt-BR') : '-'}
              </p>
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
            As alterações em{' '}
            <span className="font-semibold text-slate-700">"{titulo}"</span>{' '}
            serão perdidas se você não salvá-las.
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

// ─── Painel de Membros do Banco ───────────────────────────────────────────────

const PainelMembros: React.FC<{ onInserir: (texto: string) => void }> = ({ onInserir }) => {
  const [busca, setBusca] = useState('');
  const membros = dbService.users.selectAll();

  const filtrados = membros.filter((u) =>
    u.name.toLowerCase().includes(busca.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-100">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar membro..."
          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtrados.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Nenhum membro encontrado.</p>
        )}
        {filtrados.map((u) => (
          <div
            key={u.id}
            className="bg-slate-50 border border-slate-100 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{u.name}</p>
                <p className="text-[10px] text-slate-400">{u.role} · {u.tipoProfissional || ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onInserir(u.name)}
                className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium"
              >
                + Nome
              </button>
              <button
                onClick={() => onInserir(`${u.name} — ${u.role}`)}
                className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium"
              >
                + Nome/Cargo
              </button>
              {u.email && (
                <button
                  onClick={() => onInserir(u.email)}
                  className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium"
                >
                  + E-mail
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center">
          Clique para inserir no cursor do documento
        </p>
      </div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const Editor: React.FC<EditorProps> = ({ initialContent, title, onSave, status, currentUser }) => {

  const [tituloLocal, setTituloLocal]                       = useState(title);
  const [analisando, setAnalisando]                         = useState(false);
  const [editando, setEditando]                             = useState(false);
  const [exportando, setExportando]                         = useState(false);
  const [mostrarMenuExportar, setMostrarMenuExportar]       = useState(false);
  const [mostrarModalAssinatura, setMostrarModalAssinatura] = useState(false);
  const [mostrarModalFinalizado, setMostrarModalFinalizado] = useState(false);
  const [mostrarModalSair, setMostrarModalSair]             = useState(false);
  const [instrucaoIA, setInstrucaoIA]                       = useState('');
  const [analiseIA, setAnaliseIA]                           = useState<string | null>(null);
  const [registroAssinatura, setRegistroAssinatura]         = useState<SignatureRecord | null>(null);
  const [abaAtiva, setAbaAtiva]                             = useState<AbaAtiva>('ia');
  const [versoes, setVersoes]                               = useState<Versao[]>([]);
  const [eventos, setEventos]                               = useState<EventoAuditoria[]>([]);
  const [documentoFinalizado, setDocumentoFinalizado]       = useState(false);
  const [tamanhoFonte, setTamanhoFonte]                     = useState('12');
  const [fonteFamilia, setFonteFamilia]                     = useState('Times New Roman');
  const [espacamento, setEspacamento]                       = useState('1.5');
  const [mostrarMembros, setMostrarMembros]                 = useState(false);

  type StatusAutoSave = 'idle' | 'salvando' | 'salvo';
  const [statusAutoSave, setStatusAutoSave] = useState<StatusAutoSave>('idle');
  const [ultimoSalvoEm, setUltimoSalvoEm]   = useState<string | null>(null);

  const conteudoSalvoRef = useRef(initialContent);
  const refMenuExport    = useRef<HTMLDivElement>(null);
  const pendingNavRef    = useRef<(() => void) | null>(null);

  const somenteLeitura = documentoFinalizado || !!registroAssinatura;

  const gerarIdEvento = () =>
    `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

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

  // ─── Instância do TipTap ──────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
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

  // Atualiza editável quando muda somenteLeitura
  useEffect(() => {
    if (editor) editor.setEditable(!somenteLeitura);
  }, [somenteLeitura, editor]);

  // Inicializa versões e eventos ao abrir documento
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
      conteudoSalvoRef.current = initialContent;
    }
    setTituloLocal(title);
    setVersoes([{
      id: gerarId(),
      numero: 1,
      conteudo: initialContent,
      titulo: title,
      autor: currentUser?.name || 'Sistema',
      salvoEm: new Date().toISOString(),
      descricao: 'Versão inicial — documento aberto',
    }]);
    setEventos([{
      id: gerarIdEvento(),
      tipo: 'criacao',
      descricao: `Documento "${title}" aberto`,
      autor: currentUser?.name || 'Sistema',
      criadoEm: new Date().toISOString(),
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  // Aviso ao fechar aba com alterações não salvas
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

  // Fechar menu exportar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        refMenuExport.current &&
        !refMenuExport.current.contains(e.target as unknown as globalThis.Node)
      ) {
        setMostrarMenuExportar(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (!editor) return;
      const html = editor.getHTML();
      if (html === conteudoSalvoRef.current) return;

      setStatusAutoSave('salvando');
      setTimeout(() => {
        onSave(html, tituloLocal);
        conteudoSalvoRef.current = html;
        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setUltimoSalvoEm(hora);
        setStatusAutoSave('salvo');
        registrarEvento('autosave', `Auto-save às ${hora}`);
        setTimeout(() => setStatusAutoSave('idle'), 3000);
      }, 600);
    }, 30000);
    return () => clearInterval(intervalo);
  }, [editor, tituloLocal, onSave, registrarEvento]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleInserirMembro = (texto: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(texto).run();
  };

  const inserirTabela = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // Upload local → base64 → insere imagem centralizada
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
        editor?.chain().focus().insertContent({
          type: 'image',
          attrs: { src, width: '50%', align: 'center' },
        }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const inserirLink = () => {
    const url = prompt('URL do link:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  const handleSalvar = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const novaVersao: Versao = {
      id: gerarId(),
      numero: versoes.length + 1,
      conteudo: html,
      titulo: tituloLocal,
      autor: currentUser?.name || 'Usuário',
      salvoEm: new Date().toISOString(),
      descricao: `Versão ${versoes.length + 1} — ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    };
    setVersoes((prev) => [novaVersao, ...prev]);
    onSave(html, tituloLocal);
    conteudoSalvoRef.current = html;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setUltimoSalvoEm(hora);
    setStatusAutoSave('salvo');
    registrarEvento('salvamento', `Documento salvo manualmente — v${versoes.length + 1}`);
    setTimeout(() => setStatusAutoSave('idle'), 3000);
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

  const handleFinalizarFluxo = () => {
    if (!editor) return;
    onSave(editor.getHTML(), tituloLocal, 'Finalizado');
    registrarEvento('salvamento', 'Documento finalizado');
    setDocumentoFinalizado(true);
    setMostrarModalFinalizado(true);
  };

  const handleConsultarIA = async () => {
    if (analisando || !editor) return;
    setAnalisando(true);
    setAnaliseIA(null);
    try {
      const resultado = await geminiService.analyzeDocument(editor.getHTML());
      if (typeof resultado === 'string' && resultado.startsWith('ERRO_')) {
        setAnaliseIA(`⚠️ ${resultado.replace(/ERRO_\w+:/, '')}`);
        return;
      }
      setAnaliseIA(resultado || 'Nenhuma análise disponível.');
    } catch (erro: any) {
      setAnaliseIA(`⚠️ ${erro?.message ?? 'Erro desconhecido.'}`);
    } finally {
      setAnalisando(false);
    }
  };

  const handleEditarViaIA = async () => {
    if (!instrucaoIA.trim() || editando || !editor) return;
    setEditando(true);
    setAnaliseIA(null);
    try {
      const novoHtml = await geminiService.applySmartEdit(editor.getHTML(), instrucaoIA);
      if (typeof novoHtml === 'string' && novoHtml.startsWith('ERRO_')) {
        setAnaliseIA(`⚠️ ${novoHtml.replace(/ERRO_\w+:/, '')}`);
        return;
      }
      if (novoHtml?.trim()) {
        editor.commands.setContent(novoHtml);
        setInstrucaoIA('');
        setAnaliseIA('✓ Mudanças aplicadas com sucesso!');
        registrarEvento('ia_aplicada', `IA: "${instrucaoIA.slice(0, 50)}"`);
      } else {
        setAnaliseIA('⚠️ A IA não retornou conteúdo. Tente reformular.');
      }
    } catch (erro: any) {
      setAnaliseIA(`⚠️ ${erro?.message || 'Erro ao aplicar edições.'}`);
    } finally {
      setEditando(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!editor) return;
    setExportando(true);
    setMostrarMenuExportar(false);
    try {
      await exportarPDF(tituloLocal, editor.getHTML(), registroAssinatura);
      registrarEvento('exportacao', 'PDF');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarDOCX = async () => {
    if (!editor) return;
    setExportando(true);
    setMostrarMenuExportar(false);
    try {
      await exportarDOCX(tituloLocal, editor.getHTML());
      registrarEvento('exportacao', 'DOCX');
    } catch (e: any) {
      setAnaliseIA(`⚠️ Erro DOCX: ${e?.message}`);
    } finally {
      setExportando(false);
    }
  };

  if (!editor) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 900px;
          font-family: var(--editor-fonte, 'Times New Roman');
          line-height: var(--editor-espacamento, 1.5);
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0;
        }
        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          min-width: 60px;
          position: relative;
          vertical-align: top;
        }
        .ProseMirror th {
          background: #f1f5f9;
          font-weight: 700;
        }
        .ProseMirror .selectedCell {
          background: #dbeafe;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #3b82f6;
          cursor: col-resize;
          z-index: 10;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 16px;
          color: #475569;
          font-style: italic;
          margin: 12px 0;
        }
        .ProseMirror code {
          background: #f1f5f9;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .ProseMirror pre {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          font-family: monospace;
          overflow-x: auto;
        }
        .ProseMirror h1 { font-size: 1.6em; font-weight: 800; margin: 16px 0 8px; }
        .ProseMirror h2 { font-size: 1.3em; font-weight: 700; margin: 14px 0 6px; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; }
        .ProseMirror ul { list-style: disc;    padding-left: 24px; }
        .ProseMirror ol { list-style: decimal; padding-left: 24px; }
        .ProseMirror a  { color: #2563eb; text-decoration: underline; }
      `}</style>

      {/* Modais */}
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
        onSignatureComplete={(record) => {
          setRegistroAssinatura(record);
          onSave(editor.getHTML(), tituloLocal, 'Signed');
          registrarEvento('assinatura', `Assinado — Protocolo: ${record.protocol}`);
        }}
      />

      {mostrarModalFinalizado && (
        <ModalFinalizado titulo={tituloLocal} onFechar={() => setMostrarModalFinalizado(false)} />
      )}

      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
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
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                documentoFinalizado       ? 'bg-green-100 text-green-700'  :
                registroAssinatura        ? 'bg-green-100 text-green-700'  :
                status === 'Review'       ? 'bg-amber-100 text-amber-700'  :
                                            'bg-blue-100 text-blue-700'
              }`}>
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
            {/* Avatares usuários ativos */}
            <div className="flex -space-x-2 mr-1">
              {[
                { nome: 'Ana Silva',   cor: 'bg-blue-500'  },
                { nome: 'Carlos Tech', cor: 'bg-green-500' },
              ].map((u, i) => (
                <div
                  key={i}
                  title={u.nome}
                  className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${u.cor}`}
                >
                  {u.nome.charAt(0)}
                </div>
              ))}
            </div>

            <button
              onClick={handleConsultarIA}
              disabled={analisando || documentoFinalizado}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-medium disabled:opacity-50"
            >
              <Wand2 size={14} className={analisando ? 'animate-pulse' : ''} />
              {analisando ? 'Analisando...' : 'Consultar IA'}
            </button>

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

        {/* ── TOOLBAR ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-100 bg-white flex-wrap">

          <BotaoToolbar
            onClick={() => editor.chain().focus().undo().run()}
            title="Desfazer"
            disabled={!editor.can().undo()}
          >
            <Undo size={14} />
          </BotaoToolbar>
          <BotaoToolbar
            onClick={() => editor.chain().focus().redo().run()}
            title="Refazer"
            disabled={!editor.can().redo()}
          >
            <Redo size={14} />
          </BotaoToolbar>
          <Sep />

          {/* Tamanho de fonte */}
          <select
            value={tamanhoFonte}
            onChange={(e) => {
              setTamanhoFonte(e.target.value);
              (editor.chain().focus() as any).setFontSize(`${e.target.value}pt`).run();
            }}
            disabled={somenteLeitura}
            className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none w-16"
          >
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((t) => (
              <option key={t} value={t}>{t}pt</option>
            ))}
          </select>

          {/* Família de fonte */}
          <select
            value={fonteFamilia}
            onChange={(e) => setFonteFamilia(e.target.value)}
            disabled={somenteLeitura}
            className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-400 focus:outline-none w-36 ml-1"
            style={{ fontFamily: fonteFamilia }}
          >
            <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
            <option value="Arial"           style={{ fontFamily: 'Arial' }}>Arial</option>
          </select>

          {/* Espaçamento */}
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

          {/* Estilo de parágrafo */}
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

          {/* Formatação de texto */}
          <BotaoToolbar onClick={() => editor.chain().focus().toggleBold().run()}      title="Negrito"    ativo={editor.isActive('bold')}      disabled={somenteLeitura}><Bold          size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleItalic().run()}    title="Itálico"    ativo={editor.isActive('italic')}    disabled={somenteLeitura}><Italic        size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado" ativo={editor.isActive('underline')} disabled={somenteLeitura}><UnderlineIcon size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleStrike().run()}    title="Tachado"    ativo={editor.isActive('strike')}    disabled={somenteLeitura}><Strikethrough size={14} /></BotaoToolbar>
          <BotaoToolbar
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Destacar"
            ativo={editor.isActive('highlight')}
            disabled={somenteLeitura}
            className="text-yellow-500"
          >
            <Highlighter size={14} />
          </BotaoToolbar>
          <Sep />

          {/* Alinhamento */}
          <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('left').run()}    title="Esquerda"   ativo={editor.isActive({ textAlign: 'left' })}    disabled={somenteLeitura}><AlignLeft    size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('center').run()}  title="Centro"     ativo={editor.isActive({ textAlign: 'center' })}  disabled={somenteLeitura}><AlignCenter  size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('right').run()}   title="Direita"    ativo={editor.isActive({ textAlign: 'right' })}   disabled={somenteLeitura}><AlignRight   size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justificar" ativo={editor.isActive({ textAlign: 'justify' })} disabled={somenteLeitura}><AlignJustify size={14} /></BotaoToolbar>
          <Sep />

          {/* Listas e blocos */}
          <BotaoToolbar onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Lista"          ativo={editor.isActive('bulletList')}  disabled={somenteLeitura}><List        size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada" ativo={editor.isActive('orderedList')} disabled={somenteLeitura}><ListOrdered size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="Citação"        ativo={editor.isActive('blockquote')}  disabled={somenteLeitura}><Quote       size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleCodeBlock().run()}   title="Código"         ativo={editor.isActive('codeBlock')}   disabled={somenteLeitura}><Code        size={14} /></BotaoToolbar>
          <Sep />

          {/* Inserir elementos */}
          <BotaoToolbar onClick={inserirTabela} title="Inserir tabela"  disabled={somenteLeitura} className="text-emerald-600"><Table2    size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={inserirImagem} title="Inserir imagem"  disabled={somenteLeitura} className="text-purple-600"><ImageIcon  size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={inserirLink}   title="Inserir link"    disabled={somenteLeitura} className="text-blue-600"><LinkIcon    size={14} /></BotaoToolbar>
          <BotaoToolbar
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Linha divisória"
            disabled={somenteLeitura}
          >
            <Minus size={14} />
          </BotaoToolbar>
          <Sep />

          {/* Headings rápidos */}
          <BotaoToolbar onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1" ativo={editor.isActive('heading', { level: 1 })} disabled={somenteLeitura}><Heading1 size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2" ativo={editor.isActive('heading', { level: 2 })} disabled={somenteLeitura}><Heading2 size={14} /></BotaoToolbar>
          <BotaoToolbar onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3" ativo={editor.isActive('heading', { level: 3 })} disabled={somenteLeitura}><Heading3 size={14} /></BotaoToolbar>

          {/* Ações do fluxo — direita da toolbar */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setMostrarModalAssinatura(true)}
              disabled={!!registroAssinatura || documentoFinalizado}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold disabled:opacity-50"
            >
              <FileCheck size={14} /> {registroAssinatura ? '✓ Assinado' : 'Assinar'}
            </button>
            <button
              onClick={handleFinalizarFluxo}
              disabled={documentoFinalizado}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold disabled:opacity-50"
            >
              <CheckCheck size={14} /> {documentoFinalizado ? '✓ Finalizado' : 'Finalizar Fluxo'}
            </button>
          </div>
        </div>

        {/* ── ÁREA DO DOCUMENTO + SIDEBAR ──────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Página A4 */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
            <div className="w-full max-w-[816px]">
              <div
                className="bg-white shadow-xl border border-slate-200 p-[2cm] min-h-[1056px]"
                style={{
                  '--editor-fonte':       fonteFamilia,
                  '--editor-espacamento': espacamento,
                } as React.CSSProperties}
              >
                <EditorContent editor={editor} />
              </div>

              {registroAssinatura && (
                <div className="bg-white shadow-xl border border-slate-200 px-[2cm] pb-[2cm]">
                  <BlocoAssinatura record={registroAssinatura} />
                </div>
              )}
            </div>
          </div>

          {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col">

            {/* Abas */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => { setAbaAtiva('ia'); setMostrarMembros(false); }}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                  abaAtiva === 'ia' && !mostrarMembros
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sparkles size={12} className="inline mr-1" /> IA
              </button>
              <button
                onClick={() => { setAbaAtiva('comentarios'); setMostrarMembros(false); }}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                  abaAtiva === 'comentarios' && !mostrarMembros
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <MessageSquare size={12} className="inline mr-1" /> Comentários
              </button>
              <button
                onClick={() => { setAbaAtiva('historico'); setMostrarMembros(false); }}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                  abaAtiva === 'historico' && !mostrarMembros
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Clock size={12} className="inline mr-1" /> Histórico
              </button>
              <button
                onClick={() => setMostrarMembros((v) => !v)}
                title="Inserir membro do banco"
                className={`px-3 py-3 text-xs font-semibold transition-colors border-l border-slate-100 ${
                  mostrarMembros ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Users size={14} />
              </button>
            </div>

            {/* Painel de Membros */}
            {mostrarMembros && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 bg-blue-50">
                  <p className="text-xs font-black text-blue-700 flex items-center gap-2">
                    <Users size={14} /> Membros Cadastrados
                  </p>
                  <p className="text-[10px] text-blue-500 mt-0.5">
                    Clique para inserir no cursor do documento
                  </p>
                </div>
                <PainelMembros onInserir={handleInserirMembro} />
              </div>
            )}

            {/* Conteúdo das abas */}
            {!mostrarMembros && (
              <>
                {abaAtiva === 'ia' && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-5">

                    {/* Comando de edição via IA */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                        <Sparkles size={14} className="text-indigo-600" /> Comando de Edição
                      </h4>
                      <textarea
                        value={instrucaoIA}
                        onChange={(e) => setInstrucaoIA(e.target.value)}
                        disabled={documentoFinalizado}
                        placeholder="Ex: 'Atualize os dados do beneficiário'..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px] resize-none disabled:opacity-50"
                      />
                      <button
                        onClick={handleEditarViaIA}
                        disabled={editando || !instrucaoIA.trim() || documentoFinalizado}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {editando ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        {editando ? 'Aplicando...' : 'Aplicar via IA'}
                      </button>
                    </div>

                    {/* Feedback da IA */}
                    {analiseIA && (
                      <div className={`border p-4 rounded-xl relative ${
                        analiseIA.startsWith('⚠️') ? 'bg-red-50 border-red-200'   :
                        analiseIA.startsWith('✓')  ? 'bg-green-50 border-green-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <button
                          onClick={() => setAnaliseIA(null)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Feedback</h4>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{analiseIA}</p>
                      </div>
                    )}

                    {/* Checklist REURB */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-600" /> Checklist de REURB
                      </h4>
                      <ul className="space-y-2">
                        {[
                          'Qualificação Completa',
                          'Fundamentação Art. 12',
                          'Indicação de Beneficiários',
                          'Equipe técnica designada',
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{item}</span>
                            <CheckCircle2 size={14} className="text-green-500" />
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Metadados Jurídicos */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Metadados Jurídicos</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Normativa</span>
                          <span className="text-slate-700">Lei 13.465/17</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Autor</span>
                          <span className="text-slate-700">{currentUser?.name || 'Usuário'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Fonte</span>
                          <span className="text-slate-700">{fonteFamilia}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Espaçamento</span>
                          <span className="text-slate-700">{espacamento}x</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Palavras</span>
                          <span className="text-slate-700">{wordCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">Caracteres</span>
                          <span className="text-slate-700">{charCount}</span>
                        </div>
                        {registroAssinatura && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400 uppercase font-bold text-[10px]">Protocolo</span>
                            <span className="text-green-700 font-mono text-[10px]">{registroAssinatura.protocol}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {abaAtiva === 'comentarios' && (
                  <PainelComentarios
                    nomeUsuario={currentUser?.name || 'Usuário'}
                    cargoUsuario={currentUser?.role || 'Operador'}
                  />
                )}

                {abaAtiva === 'historico' && (
                  <HistoricoVersoes
                    versoes={versoes}
                    eventos={eventos}
                    onRestaurar={handleRestaurarVersao}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Editor;
