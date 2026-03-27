// ─── Tipos de Usuário ─────────────────────────────────────────────────────────

export type TipoProfissional =
  | 'Advogado'
  | 'Engenheiro'
  | 'Arquiteto'
  | 'Topógrafo'
  | 'Assistente Social'
  | 'Geólogo'
  | 'Cidadão'
  | 'Terceirizado'
  | 'Representante'
  | 'Outro';

export type UserRole = 'Admin' | 'Técnico' | 'Jurídico' | 'Atendente' | 'Gestor' | 'Auditor';

export interface FlagsAcesso {
  superusuario: boolean;
  adminMunicipio: boolean;
  profissionalInterno: boolean;
  usuarioExterno: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  tipoProfissional?: TipoProfissional;
  flags?: FlagsAcesso;
  etapasPermitidas?: number[];
  email: string;
  avatar?: string;
  password?: string;
  lastLogin?: string;
  status?: 'Online' | 'Offline';
  quota?: {
    limit: number;
    used: number;
    resetAt: string;
  };
  permissions?: {
    visualizar: boolean;
    editor: boolean;
    comentar: boolean;
    aprovar: boolean;
    assinar: boolean;
    exportar: boolean;
  };
}

// ─── Etapas do REURB ──────────────────────────────────────────────────────────

export type EixoEtapa = 'Técnico' | 'Jurídico' | 'Social' | 'Cartorial' | 'Geral';

export type EtapaStatus =
  | 'pendente'
  | 'em_andamento'
  | 'concluida'
  | 'bloqueada'
  | 'cancelada';

export interface SubTarefa {
  id: string;
  descricao: string;
  concluida: boolean;
  prioridade: 'baixa' | 'media' | 'alta';
}

export interface REURBEtapa {
  id: string;
  processId: string;
  numero: number;
  nome: string;
  eixo: EixoEtapa;
  status: EtapaStatus;
  responsavelId?: string;
  responsavelNome?: string;
  observacoes?: string;
  dataInicio?: string;
  dataConclusao?: string;
  dependeDe?: number[];
  subTarefas?: SubTarefa[];
}

// ─── As 14 Etapas Padrão ──────────────────────────────────────────────────────

export const ETAPAS_PADRAO: Omit<REURBEtapa, 'id' | 'processId' | 'status'>[] = [
  { numero: 1,  nome: 'Abertura / Protocolo',           eixo: 'Geral',      dependeDe: [] },
  { numero: 2,  nome: 'Diagnóstico Prévio',             eixo: 'Geral',      dependeDe: [1] },
  { numero: 3,  nome: 'Levantamento Topográfico',       eixo: 'Técnico',    dependeDe: [2] },
  { numero: 4,  nome: 'Classificação da Modalidade',    eixo: 'Jurídico',   dependeDe: [2] },
  { numero: 5,  nome: 'Buscas Dominiais',               eixo: 'Jurídico',   dependeDe: [4] },
  { numero: 6,  nome: 'Notificação dos Confrontantes',  eixo: 'Jurídico',   dependeDe: [5] },
  { numero: 7,  nome: 'Estudos Técnicos',               eixo: 'Técnico',    dependeDe: [3] },
  { numero: 8,  nome: 'Vetorização + Cadastro Social',  eixo: 'Social',     dependeDe: [7] },
  { numero: 9,  nome: 'Saneamento',                     eixo: 'Geral',      dependeDe: [6, 8] },
  { numero: 10, nome: 'Elaboração do PRF',              eixo: 'Técnico',    dependeDe: [9] },
  { numero: 11, nome: 'Aprovação do PRF',               eixo: 'Geral',      dependeDe: [10] },
  { numero: 12, nome: 'Emissão da CRF',                 eixo: 'Geral',      dependeDe: [11] },
  { numero: 13, nome: 'Registro em Cartório',           eixo: 'Cartorial',  dependeDe: [12] },
  { numero: 14, nome: 'Monitoramento Pós-REURB',        eixo: 'Geral',      dependeDe: [13] },
];

// ─── Processos ────────────────────────────────────────────────────────────────

export enum ProcessStatus {
  PENDENTE         = 'Pendente',
  EM_ANDAMENTO     = 'Em Andamento',
  INICIADO         = 'Iniciado',
  LEVANTAMENTO     = 'Levantamento Técnico',
  ANALISE_JURIDICA = 'Análise Jurídica',
  EDITAL           = 'Em Edital',
  DILIGENCIA       = 'Diligência',
  EM_ANALISE       = 'Em Análise',
  APROVADO         = 'Aprovado',
  CONCLUIDO        = 'Concluído',
  FINALIZADO       = 'Finalizado',
  CANCELADO        = 'Cancelado',
  ARQUIVADO        = 'Arquivado',
  INICIAL          = 'Inicial',
}

export interface REURBProcess {
  id: string;
  protocol?: string;
  protocolado: boolean;
  title: string;
  applicant: string;
  location?: string;

  // ── Campos de geolocalização ──────────────────────────────────────────────
  // Separados da string location para uso direto na validação de GPS.
  // Opcionais para manter retrocompatibilidade com dados existentes.
  // Em produção virão do backend: GET /api/processos/:id
  municipio?: string; // ex: "São Luís", "Fortaleza", "Belém"
  estado?: string;    // ex: "MA", "CE", "PA"

  type?: 'REURB-S' | 'REURB-E' | 'REURB-I' | 'REURB-S/E' | 'Usucapião';
  modality: 'REURB-S' | 'REURB-E';
  status: ProcessStatus;
  responsibleName?: string;
  createdAt: string;
  updatedAt: string;
  technicianId: string;
  legalId: string;
  area: string;
  progress: number;
}

// ─── Mock de Processos ────────────────────────────────────────────────────────

export const MOCK_PROCESSES: REURBProcess[] = [
  {
    id: 'PR-2026-1001',
    protocol: '0001-2026',
    protocolado: true,
    title: 'Regularização Bairro São João',
    applicant: 'Prefeitura Municipal',
    location: 'Bairro São João',
    modality: 'REURB-S',
    status: ProcessStatus.EM_ANDAMENTO,
    responsibleName: 'Administrador do Sistema',
    createdAt: '2026-01-10',
    updatedAt: '2026-03-01',
    technicianId: 'u-admin',
    legalId: 'u-admin',
    area: '15.000 m²',
    progress: 35,
  },
  {
    id: 'PR-2026-1002',
    protocol: '0002-2026',
    protocolado: false,
    title: 'Loteamento Vila Nova',
    applicant: 'Associação de Moradores',
    location: 'Vila Nova',
    modality: 'REURB-E',
    status: ProcessStatus.PENDENTE,
    responsibleName: 'Não atribuído',
    createdAt: '2026-02-15',
    updatedAt: '2026-02-15',
    technicianId: '',
    legalId: '',
    area: '8.200 m²',
    progress: 0,
  },
  {
    id: 'PR-2026-1003',
    protocol: '0003-2026',
    protocolado: true,
    title: 'Ocupação Irregular Zona Oeste',
    applicant: 'Secretaria de Habitação',
    location: 'Zona Oeste',
    modality: 'REURB-S',
    status: ProcessStatus.ANALISE_JURIDICA,
    responsibleName: 'Administrador do Sistema',
    createdAt: '2026-01-20',
    updatedAt: '2026-03-10',
    technicianId: 'u-admin',
    legalId: 'u-admin',
    area: '22.500 m²',
    progress: 60,
  },
];

// ─── Documentos ───────────────────────────────────────────────────────────────

export interface DocumentModel {
  id: string;
  name: string;
  type: string;
  version: string;
  lastUpdated: string;
}

export interface REURBDocument {
  id: string;
  processId: string;
  title: string;
  content: string;
  status: 'Draft' | 'Review' | 'Approved' | 'Signed';
  authorId: string;
  version: number;
  updatedAt: string;
}

// ─── Comentários ──────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  authorName: string;
  text: string;
  timestamp: string;
  resolved: boolean;
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export type AcaoAuditoria =
  | 'login'
  | 'logout'
  | 'criacao'
  | 'edicao'
  | 'exclusao'
  | 'protocolo'
  | 'mudanca_status'
  | 'exportacao'
  | 'assinatura';

export interface LogAuditoria {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId: string;
  descricao: string;
  ip?: string;
  criadoEm: string;
}
// ─── Conteúdo dos Modelos ─────────────────────────────────────────────────────

export const getConteudoModelo = (modelId: string, processo: REURBProcess): string => {
  const p = processo;
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const cabecalho = `
    <div style="text-align:center;margin-bottom:24px;">
      <p style="font-size:11pt;font-weight:bold;margin:0;">PREFEITURA MUNICIPAL</p>
      <p style="font-size:10pt;margin:0;">SECRETARIA DE REGULARIZAÇÃO FUNDIÁRIA URBANA</p>
      <p style="font-size:10pt;margin:0;">${p.location || 'Município'}</p>
    </div>
  `;

  const rodape = `
    <div style="margin-top:48px;text-align:center;">
      <p style="margin:0;">${p.location || 'Local'}, ${data}</p>
      <br/><br/>
      <p style="margin:0;">_____________________________________________</p>
      <p style="margin:0;font-weight:bold;">${p.responsibleName || 'Responsável'}</p>
      <p style="margin:0;">Secretaria de Regularização Fundiária</p>
    </div>
  `;

  const modelos: Record<string, string> = {
    m1: `
      ${cabecalho}
      <h2 style="text-align:center;font-size:13pt;">PORTARIA DE INSTAURAÇÃO Nº __/${new Date().getFullYear()}</h2>
      <p style="text-align:justify;">
        O Secretário Municipal de Regularização Fundiária, no uso de suas atribuições legais,
        e com fundamento na Lei Federal nº 13.465/2017 e no Decreto Municipal correspondente,
      </p>
      <p style="text-align:justify;"><strong>RESOLVE:</strong></p>
      <p style="text-align:justify;">
        <strong>Art. 1º</strong> — Instaurar o procedimento de Regularização Fundiária Urbana (REURB)
        referente ao núcleo urbano informal denominado <strong>"${p.title}"</strong>,
        localizado em <strong>${p.location || 'localização não definida'}</strong>,
        modalidade <strong>${p.modality}</strong>, protocolo nº <strong>${p.protocol || p.id}</strong>.
      </p>
      <p style="text-align:justify;">
        <strong>Art. 2º</strong> — Fica designado como responsável técnico pelo processo o(a)
        servidor(a) <strong>${p.responsibleName || 'a designar'}</strong>.
      </p>
      <p style="text-align:justify;">
        <strong>Art. 3º</strong> — Esta Portaria entra em vigor na data de sua publicação.
      </p>
      ${rodape}
    `,

    m2: `
      ${cabecalho}
      <h2 style="text-align:center;font-size:13pt;">NOTIFICAÇÃO DE CONFRONTANTES</h2>
      <p style="text-align:justify;">
        Notificamos V.Sa. que foi instaurado procedimento de Regularização Fundiária Urbana
        referente ao imóvel localizado em <strong>${p.location || 'área não especificada'}</strong>,
        processo nº <strong>${p.protocol || p.id}</strong>, modalidade <strong>${p.modality}</strong>.
      </p>
      <p style="text-align:justify;">
        Conforme disposto no Art. 9º da Lei Federal nº 13.465/2017, fica V.Sa. notificado(a)
        para, querendo, apresentar impugnação no prazo de <strong>30 (trinta) dias</strong>
        contados do recebimento desta notificação.
      </p>
      <p style="text-align:justify;">
        A impugnação deverá ser dirigida à Secretaria de Regularização Fundiária do Município,
        com as razões de fato e de direito que a fundamentem.
      </p>
      ${rodape}
    `,

    m3: `
      ${cabecalho}
      <h2 style="text-align:center;font-size:13pt;">RELATÓRIO TÉCNICO DE VISTORIA</h2>
      <p><strong>Processo:</strong> ${p.protocol || p.id}</p>
      <p><strong>Núcleo Urbano:</strong> ${p.title}</p>
      <p><strong>Localização:</strong> ${p.location || 'Não definida'}</p>
      <p><strong>Modalidade:</strong> ${p.modality}</p>
      <p><strong>Responsável Técnico:</strong> ${p.responsibleName || 'A designar'}</p>
      <p><strong>Data da Vistoria:</strong> ${data}</p>
      <p><strong>Área Total:</strong> ${p.area || 'Não mensurada'}</p>
      <br/>
      <h3>1. OBJETO</h3>
      <p style="text-align:justify;">
        O presente relatório tem por objeto descrever as condições técnicas verificadas na
        vistoria realizada no núcleo urbano informal <strong>"${p.title}"</strong>,
        situado em <strong>${p.location || 'localização não definida'}</strong>.
      </p>
      <h3>2. SITUAÇÃO ENCONTRADA</h3>
      <p style="text-align:justify;">[Descrever aqui as condições urbanísticas, infraestrutura existente, estimativa de famílias, etc.]</p>
      <h3>3. CONCLUSÃO TÉCNICA</h3>
      <p style="text-align:justify;">[Inserir conclusão técnica e recomendações para continuidade do processo REURB.]</p>
      ${rodape}
    `,

    m4: `
      ${cabecalho}
      <h2 style="text-align:center;font-size:13pt;">TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA INDIVIDUAL</h2>
      <p style="text-align:center;font-size:10pt;">Art. 23 da Lei Federal nº 13.465/2017</p>
      <br/>
      <p style="text-align:justify;">
        O MUNICÍPIO DE <strong>${p.location?.toUpperCase() || 'MUNICÍPIO'}</strong>, por meio da
        Secretaria de Regularização Fundiária Urbana, no uso de suas atribuições legais,
        conferidas pela Lei Federal nº 13.465/2017,
      </p>
      <p style="text-align:justify;"><strong>CONFERE</strong> o presente Título de Legitimação Fundiária ao(à) beneficiário(a):</p>
      <p><strong>Nome:</strong> _______________________________________</p>
      <p><strong>CPF:</strong> _______________________ <strong>RG:</strong> _______________________</p>
      <p><strong>Estado Civil:</strong> _______________________</p>
      <p><strong>Endereço do Imóvel:</strong> ${p.location || '_______________________________________'}</p>
      <p><strong>Processo REURB nº:</strong> ${p.protocol || p.id}</p>
      <p><strong>Modalidade:</strong> ${p.modality}</p>
      <p><strong>Área do Imóvel:</strong> ${p.area || '_______________________'}</p>
      <br/>
      <p style="text-align:justify;">
        Este título confere ao beneficiário a legitimação de posse do imóvel acima identificado,
        nos termos do Art. 23 e seguintes da Lei Federal nº 13.465/2017.
      </p>
      <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:32px;text-align:center;">
        <div>
          <p>_________________________________</p>
          <p><strong>Prefeito Municipal</strong></p>
        </div>
        <div>
          <p>_________________________________</p>
          <p><strong>Beneficiário(a)</strong></p>
        </div>
        <div>
          <p>_________________________________</p>
          <p><strong>Secretário de Administração</strong></p>
        </div>
        <div>
          <p>_________________________________</p>
          <p><strong>Presidente da Comissão REURB</strong></p>
        </div>
      </div>
    `,

    m5: `
      ${cabecalho}
      <h2 style="text-align:center;font-size:13pt;">EDITAL DE NOTIFICAÇÃO</h2>
      <p style="text-align:justify;">
        A Secretaria de Regularização Fundiária Urbana do Município torna público que foi
        instaurado procedimento de REURB referente ao núcleo urbano informal
        <strong>"${p.title}"</strong>, localizado em <strong>${p.location || 'área não especificada'}</strong>,
        processo nº <strong>${p.protocol || p.id}</strong>, modalidade <strong>${p.modality}</strong>.
      </p>
      <p style="text-align:justify;">
        Ficam notificados todos os confrontantes e interessados para, no prazo de
        <strong>30 (trinta) dias</strong> a contar da publicação deste edital, apresentarem
        eventuais impugnações junto à Secretaria de Regularização Fundiária.
      </p>
      <p style="text-align:justify;">
        O processo encontra-se disponível para consulta na sede da Secretaria, nos dias úteis,
        durante o horário de expediente.
      </p>
      ${rodape}
    `,
  };

  return modelos[modelId] ?? `
    ${cabecalho}
    <h2 style="text-align:center;">${MOCK_MODELS.find(m => m.id === modelId)?.name || 'Documento'}</h2>
    <p>Processo: ${p.protocol || p.id}</p>
    <p>Requerente: ${p.applicant}</p>
    <p>Localização: ${p.location || 'Não definida'}</p>
    <p>Modalidade: ${p.modality}</p>
    ${rodape}
  `;
};
// ─── Mock de Modelos Oficiais ─────────────────────────────────────────────────

export const MOCK_MODELS: DocumentModel[] = [
  { id: 'm1', name: 'Portaria de Instauração',              type: 'Portaria',     version: '2.1', lastUpdated: '2026-01-10' },
  { id: 'm2', name: 'Notificação de Confrontantes',         type: 'Notificação',  version: '1.3', lastUpdated: '2026-01-15' },
  { id: 'm3', name: 'Relatório Técnico de Vistoria',        type: 'Relatório',    version: '3.0', lastUpdated: '2026-02-01' },
  { id: 'm4', name: 'Título de Legitimação Fundiária',      type: 'Título',       version: '1.8', lastUpdated: '2026-02-20' },
  { id: 'm5', name: 'Edital de Notificação',                type: 'Edital',       version: '1.1', lastUpdated: '2026-03-05' },
];