import { REURBDocument, REURBProcess } from '../types/index';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ErroValidacao {
  campo: string;
  mensagem: string;
  severidade: 'erro' | 'aviso';
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: ErroValidacao[];
  avisos: ErroValidacao[];
}

// ─── Validadores de formato ───────────────────────────────────────────────────

const validarCPF = (cpf: string): boolean => {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
  const calc = (mod: number) =>
    nums.slice(0, mod).split('').reduce((s, n, i) => s + +n * (mod + 1 - i), 0);
  const d1 = (calc(9) * 10) % 11 % 10;
  const d2 = (calc(10) * 10) % 11 % 10;
  return d1 === +nums[9] && d2 === +nums[10];
};

const validarCNPJ = (cnpj: string): boolean => {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14 || /^(\d)\1+$/.test(nums)) return false;
  const calc = (mod: number, pesos: number[]) =>
    nums.slice(0, mod).split('').reduce((s, n, i) => s + +n * pesos[i], 0);
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(12, p1) % 11;
  const d2 = calc(13, p2) % 11;
  return (d1 < 2 ? 0 : 11 - d1) === +nums[12] && (d2 < 2 ? 0 : 11 - d2) === +nums[13];
};

const validarData = (data: string): boolean => {
  const d = new Date(data);
  return !isNaN(d.getTime());
};

const extrairCPFsCNPJs = (html: string): string[] => {
  const texto = html.replace(/<[^>]+>/g, ' ');
  const cpfs  = texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g) || [];
  const cnpjs = texto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) || [];
  return [...cpfs, ...cnpjs];
};

// ─── Checklist por tipo de documento ─────────────────────────────────────────

const CHECKLIST_POR_TIPO: Record<string, string[]> = {
  'Portaria de Instauração': [
    'número do processo',
    'modalidade',
    'requerente',
    'responsável técnico',
    'área',
  ],
  'Notificação de Confrontantes': [
    'número do processo',
    'núcleo urbano',
    'prazo',
    'endereço para contato',
  ],
  'Relatório Técnico Social': [
    'número de famílias',
    'renda média',
    'data do levantamento',
    'responsável técnico',
  ],
  'Auto de Demarcação Urbanística': [
    'área demarcada',
    'memorial descritivo',
    'responsável técnico',
    'número do processo',
  ],
  'Título de Legitimação Fundiária': [
    'nome do beneficiário',
    'CPF',
    'endereço do imóvel',
    'área do imóvel',
    'número do processo',
    'modalidade',
  ],
};

// ─── Validação principal ──────────────────────────────────────────────────────

export const validarDocumento = (
  documento: REURBDocument,
  processo: REURBProcess
): ResultadoValidacao => {
  const erros: ErroValidacao[] = [];
  const avisos: ErroValidacao[] = [];

  // ── 1. Campos essenciais do processo ─────────────────────────────────────

  if (!processo.protocol) {
    erros.push({ campo: 'Protocolo', mensagem: 'Processo sem número de protocolo.', severidade: 'erro' });
  }

  if (!processo.applicant?.trim()) {
    erros.push({ campo: 'Requerente', mensagem: 'Requerente não informado.', severidade: 'erro' });
  }

  if (!processo.responsibleName?.trim()) {
    erros.push({ campo: 'Responsável Técnico', mensagem: 'Responsável técnico não atribuído.', severidade: 'erro' });
  }

  if (!processo.area || processo.area === '0 m²' || processo.area === '________________') {
    erros.push({ campo: 'Área', mensagem: 'Área do núcleo não informada.', severidade: 'erro' });
  }

  if (!processo.technicianId) {
    avisos.push({ campo: 'Técnico', mensagem: 'Nenhum técnico vinculado ao processo.', severidade: 'aviso' });
  }

  if (!processo.legalId) {
    avisos.push({ campo: 'Jurídico', mensagem: 'Nenhum responsável jurídico vinculado.', severidade: 'aviso' });
  }

  // ── 2. Campos essenciais do documento ────────────────────────────────────

  if (!documento.title?.trim()) {
    erros.push({ campo: 'Título', mensagem: 'Título do documento não preenchido.', severidade: 'erro' });
  }

  if (!documento.content || documento.content === '<p></p>') {
    erros.push({ campo: 'Conteúdo', mensagem: 'Documento está vazio.', severidade: 'erro' });
  }

  // ── 3. Validação de CPF/CNPJ no conteúdo ─────────────────────────────────

  const documentos = extrairCPFsCNPJs(documento.content);
  documentos.forEach((doc) => {
    const nums = doc.replace(/\D/g, '');
    if (nums.length === 11 && !validarCPF(doc)) {
      avisos.push({
        campo: 'CPF',
        mensagem: `CPF inválido encontrado no documento: ${doc}`,
        severidade: 'aviso',
      });
    }
    if (nums.length === 14 && !validarCNPJ(doc)) {
      avisos.push({
        campo: 'CNPJ',
        mensagem: `CNPJ inválido encontrado no documento: ${doc}`,
        severidade: 'aviso',
      });
    }
  });

  // ── 4. Validação de datas ─────────────────────────────────────────────────

  if (processo.createdAt && !validarData(processo.createdAt)) {
    avisos.push({ campo: 'Data', mensagem: 'Data de criação do processo inválida.', severidade: 'aviso' });
  }

  // ── 5. Checklist por tipo de documento ───────────────────────────────────

  const tipoDoc = documento.title;
  const checklist = CHECKLIST_POR_TIPO[tipoDoc];

  if (checklist) {
    const conteudoTexto = documento.content.replace(/<[^>]+>/g, ' ').toLowerCase();
    checklist.forEach((campo) => {
      if (!conteudoTexto.includes(campo.toLowerCase())) {
        avisos.push({
          campo: 'Checklist',
          mensagem: `Campo esperado não encontrado no documento: "${campo}"`,
          severidade: 'aviso',
        });
      }
    });
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
  };
};