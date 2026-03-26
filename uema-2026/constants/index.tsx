import { DocumentModel, REURBProcess, ProcessStatus, DadosAdicionaisDocumento } from '../types/index';

// ─── Modelos de documentos ────────────────────────────────────────────────────

export const MOCK_MODELS: DocumentModel[] = [
  { id: 'm1', name: 'Portaria de Instauração',        type: 'Administrativo', version: '2.1', lastUpdated: '2024-01-10' },
  { id: 'm2', name: 'Notificação de Confrontantes',   type: 'Notificação',    version: '1.5', lastUpdated: '2023-11-22' },
  { id: 'm3', name: 'Relatório Técnico Social',       type: 'Técnico',        version: '3.0', lastUpdated: '2024-02-15' },
  { id: 'm4', name: 'Auto de Demarcação Urbanística', type: 'Técnico',        version: '1.2', lastUpdated: '2024-03-01' },
  { id: 'm5', name: 'Título de Legitimação Fundiária',type: 'Titularidade',   version: '4.2', lastUpdated: '2024-05-05' },
];

// ─── Processos mock — municípios de todo o Brasil ─────────────────────────────
// Cada processo tem municipio + estado separados para uso na geolocalização.
// Em produção: GET /api/processos → substitui esta lista.

export const MOCK_PROCESSES: REURBProcess[] = [
  // ── Maranhão ────────────────────────────────────────────────────────────────
  {
    id: 'proc-001',
    protocol: '0001-2026',
    protocolado: true,
    title: 'Núcleo Habitacional Vila Verde',
    applicant: 'Associação de Moradores Vila Verde',
    location: 'Bairro Coroadinho, São Luís — MA',
    municipio: 'São Luís',
    estado: 'MA',
    modality: 'REURB-S',
    status: ProcessStatus.EM_ANDAMENTO,
    responsibleName: 'Eng. Carlos Souza',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-01T14:00:00Z',
    technicianId: 'user-001',
    legalId: 'user-002',
    area: '22.400 m²',
    progress: 45,
  },
  {
    id: 'proc-002',
    protocol: '0002-2026',
    protocolado: true,
    title: 'Núcleo Habitacional São Luís II',
    applicant: 'Comunidade do Bairro Jardim Tropical',
    location: 'Bairro Jardim Tropical, São Luís — MA',
    municipio: 'São Luís',
    estado: 'MA',
    modality: 'REURB-S',
    status: ProcessStatus.LEVANTAMENTO,
    responsibleName: 'Arq. Maria Lima',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-03-10T11:00:00Z',
    technicianId: 'user-001',
    legalId: 'user-002',
    area: '18.700 m²',
    progress: 20,
  },
  {
    id: 'proc-003',
    protocol: '0003-2026',
    protocolado: true,
    title: 'Vila Maranhão — Regularização',
    applicant: 'Prefeitura Municipal de Imperatriz',
    location: 'Bairro Vila Lobão, Imperatriz — MA',
    municipio: 'Imperatriz',
    estado: 'MA',
    modality: 'REURB-E',
    status: ProcessStatus.ANALISE_JURIDICA,
    responsibleName: 'Adv. João Melo',
    createdAt: '2025-11-10T08:00:00Z',
    updatedAt: '2026-02-20T16:00:00Z',
    technicianId: 'user-003',
    legalId: 'user-002',
    area: '31.200 m²',
    progress: 60,
  },

  // ── Ceará ────────────────────────────────────────────────────────────────────
  {
    id: 'proc-004',
    protocol: '0004-2026',
    protocolado: true,
    title: 'Ocupação Mondubim — REURB-S',
    applicant: 'Associação Comunitária do Mondubim',
    location: 'Bairro Mondubim, Fortaleza — CE',
    municipio: 'Fortaleza',
    estado: 'CE',
    modality: 'REURB-S',
    status: ProcessStatus.EM_ANDAMENTO,
    responsibleName: 'Eng. Fernanda Costa',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-03-15T09:00:00Z',
    technicianId: 'user-004',
    legalId: 'user-005',
    area: '14.500 m²',
    progress: 35,
  },
  {
    id: 'proc-005',
    protocol: '0005-2026',
    protocolado: false,
    title: 'Núcleo Bom Jardim',
    applicant: 'Comunidade Bom Jardim',
    location: 'Bairro Bom Jardim, Fortaleza — CE',
    municipio: 'Fortaleza',
    estado: 'CE',
    modality: 'REURB-S',
    status: ProcessStatus.PENDENTE,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
    technicianId: 'user-004',
    legalId: 'user-005',
    area: '9.800 m²',
    progress: 5,
  },

  // ── Pará ─────────────────────────────────────────────────────────────────────
  {
    id: 'proc-006',
    protocol: '0006-2025',
    protocolado: true,
    title: 'Comunidade Ribeirinha — Belém',
    applicant: 'Associação dos Ribeirinhos do Tucunduba',
    location: 'Bairro Jurunas, Belém — PA',
    municipio: 'Belém',
    estado: 'PA',
    modality: 'REURB-S',
    status: ProcessStatus.APROVADO,
    responsibleName: 'Geog. Rafael Santos',
    createdAt: '2025-06-10T10:00:00Z',
    updatedAt: '2026-01-30T14:00:00Z',
    technicianId: 'user-006',
    legalId: 'user-007',
    area: '28.300 m²',
    progress: 90,
  },

  // ── Bahia ────────────────────────────────────────────────────────────────────
  {
    id: 'proc-007',
    protocol: '0007-2025',
    protocolado: true,
    title: 'Ocupação Subúrbio Ferroviário',
    applicant: 'Comunidade do Subúrbio Ferroviário',
    location: 'Subúrbio Ferroviário, Salvador — BA',
    municipio: 'Salvador',
    estado: 'BA',
    modality: 'REURB-S',
    status: ProcessStatus.LEVANTAMENTO,
    responsibleName: 'Ass. Social Beatriz Nunes',
    createdAt: '2025-09-05T09:00:00Z',
    updatedAt: '2026-02-14T11:00:00Z',
    technicianId: 'user-008',
    legalId: 'user-009',
    area: '45.100 m²',
    progress: 25,
  },

  // ── Minas Gerais ──────────────────────────────────────────────────────────────
  {
    id: 'proc-008',
    protocol: '0008-2026',
    protocolado: true,
    title: 'Vila Esperança — BH',
    applicant: 'Associação de Moradores Vila Esperança',
    location: 'Bairro Barreiro, Belo Horizonte — MG',
    municipio: 'Belo Horizonte',
    estado: 'MG',
    modality: 'REURB-E',
    status: ProcessStatus.EM_ANDAMENTO,
    responsibleName: 'Eng. Paulo Ferreira',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-03-18T15:00:00Z',
    technicianId: 'user-010',
    legalId: 'user-011',
    area: '12.600 m²',
    progress: 40,
  },

  // ── São Paulo ─────────────────────────────────────────────────────────────────
  {
    id: 'proc-009',
    protocol: '0009-2025',
    protocolado: true,
    title: 'Favela do Sapé — Regularização',
    applicant: 'Associação Comunitária do Sapé',
    location: 'Bairro Jaguaré, São Paulo — SP',
    municipio: 'São Paulo',
    estado: 'SP',
    modality: 'REURB-S',
    status: ProcessStatus.CONCLUIDO,
    responsibleName: 'Arq. Luciana Torres',
    createdAt: '2025-03-15T08:00:00Z',
    updatedAt: '2026-01-20T17:00:00Z',
    technicianId: 'user-012',
    legalId: 'user-013',
    area: '38.900 m²',
    progress: 100,
  },

  // ── Rio de Janeiro ────────────────────────────────────────────────────────────
  {
    id: 'proc-010',
    protocol: '0010-2026',
    protocolado: true,
    title: 'Comunidade Nova Holanda',
    applicant: 'Associação de Moradores da Nova Holanda',
    location: 'Complexo da Maré, Rio de Janeiro — RJ',
    municipio: 'Rio de Janeiro',
    estado: 'RJ',
    modality: 'REURB-S',
    status: ProcessStatus.ANALISE_JURIDICA,
    responsibleName: 'Adv. Marcos Oliveira',
    createdAt: '2026-01-08T10:00:00Z',
    updatedAt: '2026-03-05T13:00:00Z',
    technicianId: 'user-014',
    legalId: 'user-015',
    area: '52.700 m²',
    progress: 55,
  },

  // ── Pernambuco ────────────────────────────────────────────────────────────────
  {
    id: 'proc-011',
    protocol: '0011-2026',
    protocolado: false,
    title: 'ZEIS Coque — Recife',
    applicant: 'Prefeitura do Recife — COHAB-PE',
    location: 'Bairro Coque, Recife — PE',
    municipio: 'Recife',
    estado: 'PE',
    modality: 'REURB-S',
    status: ProcessStatus.PENDENTE,
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
    technicianId: 'user-016',
    legalId: 'user-017',
    area: '19.300 m²',
    progress: 0,
  },

  // ── Goiás ─────────────────────────────────────────────────────────────────────
  {
    id: 'proc-012',
    protocol: '0012-2025',
    protocolado: true,
    title: 'Setor Santa Genoveva',
    applicant: 'Comunidade Setor Santa Genoveva',
    location: 'Setor Santa Genoveva, Goiânia — GO',
    municipio: 'Goiânia',
    estado: 'GO',
    modality: 'REURB-E',
    status: ProcessStatus.FINALIZADO,
    responsibleName: 'Eng. Thiago Borges',
    createdAt: '2024-08-20T10:00:00Z',
    updatedAt: '2025-12-10T16:00:00Z',
    technicianId: 'user-018',
    legalId: 'user-019',
    area: '7.400 m²',
    progress: 100,
  },
];

// ─── getConteudoModelo ────────────────────────────────────────────────────────
// Gera o HTML do documento já preenchido com os dados reais do processo E dados adicionais.
// Substitui automaticamente placeholders com os dados do usuário.

export function getConteudoModelo(
  modeloId: string, 
  processo: REURBProcess,
  dadosAdicionais?: DadosAdicionaisDocumento
): string {

  // ── Dados extraídos do processo ───────────────────────────────────────────
  const municipio       = processo.municipio || extrairMunicipio(processo.location || '');
  const estado          = processo.estado    || extrairEstado(processo.location    || '');
  const municipioEstado = `${municipio} — ${estado}`;
  const protocolo       = processo.protocol  || processo.id;
  const modalidade      = processo.modality  || 'REURB-S';
  const requerente      = processo.applicant;
  const nucleo          = processo.title;
  const responsavel     = processo.responsibleName || '________________________';
  const area            = processo.area || '________________';
  const hoje            = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Variáveis institucionais ───────────────────────────────────────────────
  const secretaria  = import.meta.env?.VITE_SECRETARIA  || 'Secretaria Municipal de Habitação e Regularização Fundiária';
  const normativa   = import.meta.env?.VITE_NORMATIVA   || 'Lei Federal nº 13.465/2017';
  const secretario  = import.meta.env?.VITE_SECRETARIO  || '________________________';
  const cargoSecret = import.meta.env?.VITE_CARGO_SECRETARIO || 'Secretário(a) Municipal de Habitação';

  // ── Dados adicionais (preencher com dados do usuário ou placeholders) ─────
  const nome = dadosAdicionais?.nome || '____________________';
  const cpf = dadosAdicionais?.cpf || '____________________';
  const local = dadosAdicionais?.local || '____________________';
  const cargo = dadosAdicionais?.cargo || '____________________';
  const instituicao = dadosAdicionais?.instituicao || '____________________';
  const dataPreenche = dadosAdicionais?.dataDocumento || '__/__/______';

  // ── Estilo compartilhado dos campos editáveis ─────────────────────────────
  const F = (valor: string) =>
    `<span style="color:#2563eb;font-weight:600;border-bottom:1.5px dashed #93c5fd;padding:0 2px;">${valor}</span>`;

  const AVISO = `
    <div style="margin:20px 0;padding:12px 16px;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:0 8px 8px 0;font-size:12px;color:#78350f;">
      ⚠️ Os campos destacados em azul são editáveis. Clique para alterar diretamente no editor.
    </div>`;

  const ASSINATURA = `
    <div style="margin-top:40px;text-align:center;">
      <p style="margin-bottom:40px;">${municipio}, ${F(hoje)}.</p>
      <p>______________________________</p>
      <p>${F(secretario)}</p>
      <p style="font-size:12px;color:#666;">${cargoSecret}</p>
    </div>`;

  // ── Switch por modelo ─────────────────────────────────────────────────────

  switch (modeloId) {

    // ── m1: Portaria de Instauração ──────────────────────────────────────────
    case 'm1': return `
      <h1 style="text-align:center;font-size:15px;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
        PORTARIA DE INSTAURAÇÃO REURB
      </h1>
      <p style="text-align:center;font-size:12px;color:#666;margin-bottom:28px;">
        Processo nº ${F(protocolo)} — ${secretaria}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        O(A) ${F(nome)}, ${cargoSecret} do Município de ${F(municipio)},
        Estado do ${F(estado)}, no uso de suas atribuições legais e regulamentares,
        considerando o disposto na <strong>${normativa}</strong>, resolve:
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Art. 1º</strong> — Instaurar o procedimento de Regularização Fundiária
        Urbana de Interesse Social (<strong>${modalidade}</strong>) no núcleo urbano
        informal denominado ${F(nucleo)}, localizado em ${F(municipioEstado)},
        requerido por ${F(requerente)}, com área aproximada de ${F(area)}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Art. 2º</strong> — Designar o(a) profissional ${F(nome)}, CPF ${F(cpf)},
        como Responsável Técnico(a) pelo levantamento planialtimétrico, elaboração
        do Projeto de Regularização Fundiária e identificação dos beneficiários.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Art. 3º</strong> — Esta Portaria entra em vigor na data de sua
        publicação, revogadas as disposições em contrário.
      </p>

      ${AVISO}
      ${ASSINATURA}`;

    // ── m2: Notificação de Confrontantes ─────────────────────────────────────
    case 'm2': return `
      <h1 style="text-align:center;font-size:15px;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
        NOTIFICAÇÃO DE CONFRONTANTES
      </h1>
      <p style="text-align:center;font-size:12px;color:#666;margin-bottom:28px;">
        Processo nº ${F(protocolo)} — ${secretaria}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        ${municipio}, ${F(dataPreenche)}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        Ao(s) Confrontante(s) do Núcleo Urbano Informal ${F(nucleo)},
        localizado em ${F(municipioEstado)}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>De:</strong> ${F(nome)} ${cargo ? `(${cargo})` : ''}<br/>
        <strong>CPF:</strong> ${F(cpf)}<br/>
        ${instituicao ? `<strong>Instituição:</strong> ${F(instituicao)}<br/>` : ''}
        <strong>Assunto:</strong> Notificação sobre instauração de procedimento ${F(modalidade)} — ${normativa}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        Comunicamos a instauração do procedimento de Regularização Fundiária
        Urbana (${F(modalidade)}) no núcleo urbano informal ${F(nucleo)},
        requerido por ${F(requerente)}, com área de ${F(area)}, conforme
        ${normativa}, processo nº ${F(protocolo)}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        Nos termos do Art. 21 da ${normativa}, fica(m) o(s) confrontante(s)
        notificado(s) para, querendo, manifestar-se no prazo de
        ${F('30 (trinta)')} dias a partir do recebimento desta notificação.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        Para mais informações, entre em contato com a ${secretaria},
        localizada em ${F(local)},
        telefone ${F('(__)____-____')}.
      </p>

      ${AVISO}
      ${ASSINATURA}`;

    // ── m3: Relatório Técnico Social ──────────────────────────────────────────
    case 'm3': return `
      <h1 style="text-align:center;font-size:15px;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
        RELATÓRIO TÉCNICO SOCIAL
      </h1>
      <p style="text-align:center;font-size:12px;color:#666;margin-bottom:28px;">
        Processo nº ${F(protocolo)} — ${secretaria}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Elaborado por:</strong> ${F(nome)}, CPF ${F(cpf)}<br/>
        <strong>Cargo:</strong> ${F(cargo)}<br/>
        ${instituicao ? `<strong>Instituição:</strong> ${F(instituicao)}<br/>` : ''}
        <strong>Data:</strong> ${F(dataPreenche)}
      </p>

      <h2 style="font-size:13px;font-weight:700;color:#1e293b;margin:20px 0 8px;">1. Identificação do Núcleo</h2>
      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Nome do Núcleo:</strong> ${F(nucleo)}<br/>
        <strong>Município/Estado:</strong> ${F(municipioEstado)}<br/>
        <strong>Local Específico:</strong> ${F(local)}<br/>
        <strong>Requerente:</strong> ${F(requerente)}<br/>
        <strong>Modalidade:</strong> ${F(modalidade)}<br/>
        <strong>Área Total:</strong> ${F(area)}<br/>
        <strong>Protocolo:</strong> ${F(protocolo)}
      </p>

      <h2 style="font-size:13px;font-weight:700;color:#1e293b;margin:20px 0 8px;">2. Caracterização Socioeconômica</h2>
      <p style="margin-bottom:14px;line-height:1.8;">
        O núcleo urbano ${F(nucleo)} possui aproximadamente ${F('___ famílias')}
        beneficiárias, com renda média mensal de ${F('até 3 salários mínimos')}.
        A ocupação data de ${F('____')} e apresenta características de
        ${F('consolidação urbana / urbanização precária')}.
      </p>

      <h2 style="font-size:13px;font-weight:700;color:#1e293b;margin:20px 0 8px;">3. Infraestrutura</h2>
      <p style="margin-bottom:14px;line-height:1.8;">
        A área apresenta: ${F('abastecimento de água / rede elétrica / coleta de lixo')}.
        Ausência de: ${F('saneamento básico / pavimentação / drenagem pluvial')}.
      </p>

      <h2 style="font-size:13px;font-weight:700;color:#1e293b;margin:20px 0 8px;">4. Conclusão e Recomendações</h2>
      <p style="margin-bottom:14px;line-height:1.8;">
        Com base no levantamento realizado, recomenda-se a continuidade
        do procedimento ${F(modalidade)} para o núcleo ${F(nucleo)},
        por preencher os requisitos legais estabelecidos pela ${normativa}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Responsável Técnico:</strong> ${F(nome)}, CPF ${F(cpf)}<br/>
        <strong>Data do Levantamento:</strong> ${F(dataPreenche)}
      </p>

      ${AVISO}
      ${ASSINATURA}`;

    // ── m4: Auto de Demarcação Urbanística ───────────────────────────────────
    case 'm4': return `
      <h1 style="text-align:center;font-size:15px;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
        AUTO DE DEMARCAÇÃO URBANÍSTICA
      </h1>
      <p style="text-align:center;font-size:12px;color:#666;margin-bottom:28px;">
        Processo nº ${F(protocolo)} — ${secretaria}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        Aos ${F(dataPreenche)}, no Município de ${F(municipio)}, Estado do ${F(estado)},
        compareceu o(a) técnico(a) responsável ${F(nome)}, CPF ${F(cpf)},
        ${F(cargo)}${instituicao ? ` da ${F(instituicao)}` : ''}, no uso de suas atribuições
        conferidas pela ${normativa}, para lavrar o presente Auto de Demarcação
        Urbanística referente ao núcleo ${F(nucleo)}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Art. 1º</strong> — Fica demarcada a área de ${F(area)},
        localizada em ${F(local)}, Município de ${F(municipio)}, destinada à Regularização
        Fundiária Urbana na modalidade ${F(modalidade)}, conforme planta e
        memorial descritivo elaborados pelo(a) responsável técnico(a)
        ${F(nome)}, CPF ${F(cpf)}, devidamente anexados a este processo.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Art. 2º</strong> — A demarcação foi realizada com base em
        levantamento topográfico georreferenciado, respeitando os limites
        e confrontações descritos no memorial descritivo de fls.
        ${F('___ a ___')}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Art. 3º</strong> — O presente Auto será encaminhado ao
        Cartório de Registro de Imóveis competente para as providências
        previstas nos Art. 19 e seguintes da ${normativa}.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Profissional Responsável:</strong> ${F(nome)}, CPF ${F(cpf)}<br/>
        <strong>Data do Levantamento:</strong> ${F(dataPreenche)}
      </p>

      ${AVISO}
      ${ASSINATURA}`;

    // ── m5: Título de Legitimação Fundiária ──────────────────────────────────
    case 'm5': return `
      <h1 style="text-align:center;font-size:15px;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
        TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA
      </h1>
      <p style="text-align:center;font-size:12px;color:#666;margin-bottom:28px;">
        Processo nº ${F(protocolo)} — ${secretaria}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        O Município de ${F(municipio)}, Estado do ${F(estado)}, por meio de
        seu servidor responsável ${F(nome)}, CPF ${F(cpf)}, 
        ${F(cargo)}${instituicao ? ` da ${F(instituicao)}` : ''}, 
        no uso das atribuições que lhe confere a ${normativa}, CONCEDE o presente 
        Título de Legitimação Fundiária ao(à) beneficiário(a) abaixo qualificado(a):
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Beneficiário(a):</strong> ${F('________________________')}<br/>
        <strong>CPF/CNPJ:</strong> ${F('___.___.___-__')}<br/>
        <strong>RG:</strong> ${F('__.___.___-_')}<br/>
        <strong>Endereço:</strong> ${F(local)}, ${F(municipioEstado)}<br/>
        <strong>Núcleo Urbano:</strong> ${F(nucleo)}<br/>
        <strong>Área do Imóvel:</strong> ${F(area)}<br/>
        <strong>Processo:</strong> ${F(protocolo)}<br/>
        <strong>Modalidade:</strong> ${F(modalidade)}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        O presente título foi expedido nos termos dos Art. 23 a 28 da
        ${normativa}, constituindo forma originária de aquisição do direito
        real de propriedade sobre o imóvel acima descrito.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        O presente título deverá ser registrado no Cartório de Registro de
        Imóveis da circunscrição imobiliária competente para produzir os
        efeitos legais previstos na legislação.
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Responsável pela Expedição:</strong> ${F(nome)}, CPF ${F(cpf)}<br/>
        <strong>Data da Expedição:</strong> ${F(dataPreenche)}
      </p>

      ${AVISO}
      ${ASSINATURA}`;

    // ── Caso padrão: template genérico para qualquer modelo futuro ───────────
    // Novos modelos adicionados ao MOCK_MODELS receberão automaticamente
    // este template como base, evitando erros.
    default: return `
      <h1 style="text-align:center;font-size:15px;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
        ${(MOCK_MODELS.find(m => m.id === modeloId)?.name || 'DOCUMENTO REURB').toUpperCase()}
      </h1>
      <p style="text-align:center;font-size:12px;color:#666;margin-bottom:28px;">
        Processo nº ${F(protocolo)} — ${secretaria}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;">
        <strong>Núcleo Urbano:</strong> ${F(nucleo)}<br/>
        <strong>Município/Estado:</strong> ${F(municipioEstado)}<br/>
        <strong>Requerente:</strong> ${F(requerente)}<br/>
        <strong>Modalidade:</strong> ${F(modalidade)}<br/>
        <strong>Área:</strong> ${F(area)}<br/>
        <strong>Responsável Técnico:</strong> ${F(responsavel)}<br/>
        <strong>Data:</strong> ${F(hoje)}
      </p>

      <p style="margin-bottom:14px;line-height:1.8;color:#64748b;font-style:italic;">
        [Conteúdo específico deste modelo será adicionado pelo setor jurídico.
        Os dados do processo acima já estão preenchidos automaticamente.]
      </p>

      ${AVISO}
      ${ASSINATURA}`;
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────
// Extraem município/estado da string de location quando os campos separados
// não estiverem disponíveis (retrocompatibilidade com dados antigos).

function extrairMunicipio(location: string): string {
  // Espera formato: "Bairro X, Município — UF" ou "Município — UF"
  const partes = location.split(',');
  if (partes.length >= 2) {
    return partes[partes.length - 1].split('—')[0].trim();
  }
  return location.split('—')[0].trim() || '________________________';
}

function extrairEstado(location: string): string {
  // Extrai as 2 letras após o "—"
  const match = location.match(/—\s*([A-Z]{2})/);
  return match?.[1] || '__';
}
