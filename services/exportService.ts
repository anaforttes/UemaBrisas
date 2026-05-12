import {
  Document, Packer, Paragraph, TextRun,
  Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, VerticalAlign, Header, Footer, PageNumber, LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import type { SignatureRecord } from './assinaturaService';

export const exportarPDF = (titulo: string, conteudoHtml: string, record?: SignatureRecord | null): Promise<void> => {
  const carregarScript = (): Promise<void> => new Promise((resolve) => {
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
      ${record ? `<div style="margin-top:20pt;border-top:2pt solid #1e3a8a;padding-top:12pt;"><strong style="color:#1e3a8a;">✓ REGISTRO DE ASSINATURAS DIGITAIS</strong><br/><span style="color:#3b82f6;font-size:9pt;">Protocolo: ${record.protocol}</span>${record.signers.map((s, i) => `<div style="margin-top:6pt;padding:6pt;border:1pt solid #dcfce7;border-radius:4pt;"><strong>${i + 1}. ${s.name} — ${s.role}</strong><br/><span style="font-size:8pt;">Assinado em: ${s.signedAt ? new Date(s.signedAt).toLocaleString('pt-BR') : '-'}</span></div>`).join('')}</div>` : ''}
    `;
    return (window as any).html2pdf().set({
      margin: [2, 2, 2, 2],
      filename: `${titulo || 'documento'}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
    }).from(wrapper).save();
  });
};

export const exportarDOCX = async (titulo: string, conteudoHtml: string): Promise<void> => {
  const borda = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
  const bordasCelula = { top: borda, bottom: borda, left: borda, right: borda };

  const parseNo = (no: ChildNode): any[] => {
    if (no.nodeType === 3) {
      const texto = no.textContent || '';
      if (!texto.trim()) return [];
      return [new TextRun({ text: texto, size: 24, font: 'Times New Roman' })];
    }
    if (no.nodeType !== 1) return [];
    const el = no as HTMLElement;
    const filhos = () => Array.from(el.childNodes).flatMap(parseNo);
    switch (el.tagName?.toLowerCase()) {
      case 'b': case 'strong': return filhos().map((r: any) => new TextRun({ ...r.options, bold: true }));
      case 'i': case 'em':     return filhos().map((r: any) => new TextRun({ ...r.options, italics: true }));
      case 'br': return [new TextRun({ text: '', break: 1 })];
      default:   return filhos();
    }
  };

  const parseBloco = (el: Element): any[] => {
    const tag = el.tagName?.toLowerCase();
    const filhos = Array.from(el.childNodes).flatMap(parseNo);
    switch (tag) {
      case 'h1': return [new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: el.textContent || '', bold: true, size: 28, font: 'Times New Roman' })] })];
      case 'h2': return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: el.textContent || '', bold: true, size: 26, font: 'Times New Roman' })] })];
      case 'p':  return [new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: filhos.length ? filhos : [new TextRun({ text: '', size: 24 })] })];
      case 'ul': case 'ol':
        return Array.from(el.querySelectorAll('li')).map((li) =>
          new Paragraph({ numbering: { reference: tag === 'ol' ? 'numeros' : 'marcadores', level: 0 }, children: [new TextRun({ text: li.textContent || '', size: 24, font: 'Times New Roman' })] })
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
                    children: [new TextRun({ text: celula.textContent || '', bold: ehCabecalho, size: 22, font: 'Times New Roman' })],
                  })],
                });
              }),
            })
          ),
        })];
      }
      default: return filhos.length ? [new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: filhos })] : [];
    }
  };

  const temp = document.createElement('div');
  temp.innerHTML = conteudoHtml;
  const conteudo: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PREFEITURA MUNICIPAL', bold: true, size: 26, font: 'Times New Roman' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: (titulo || 'DOCUMENTO OFICIAL').toUpperCase(), bold: true, size: 28, font: 'Times New Roman' })] }),
  ];
  Array.from(temp.children).forEach((el) => conteudo.push(...parseBloco(el)));

  const doc = new Document({
    numbering: {
      config: [
        { reference: 'marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: 'numeros',    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } }, children: [new TextRun({ text: `REURBDoc | ${titulo}`, size: 18, color: '888888', font: 'Arial', italics: true })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } }, children: [new TextRun({ text: 'Lei nº 13.465/2017  |  Página ', size: 18, color: '888888', font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Arial' }), new TextRun({ text: ' de ', size: 18, color: '888888', font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888', font: 'Arial' })] })] }),
      },
      children: conteudo,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${titulo || 'documento'}.docx`);
};
