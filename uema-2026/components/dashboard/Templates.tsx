import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Info, X,
  FolderOpen, ChevronRight, MapPin, Loader2, AlertTriangle, CheckCircle2,
  Eye, Trash2, MoreHorizontal,
} from 'lucide-react';
import { MOCK_MODELS, MOCK_PROCESSES } from '../../constants';
import { dbService } from '../../services/databaseService';
import { REURBProcess, DadosAdicionaisDocumento } from '../../types/index';
import { useGeolocalizacao, gerarBlocoGeoHTML } from '../editor/components/useGeolocalizacao';
import { templateProfilesService, TemplateProfile } from '../../services/templateProfilesService';

// ─── Cores por tipo de documento ──────────────────────────────────────────────

const TIPO_STYLE: Record<string, { badge: string; icon: string }> = {
  Administrativo: { badge: 'bg-blue-50 text-blue-600 border-blue-100',      icon: 'text-blue-500'   },
  Notificação:    { badge: 'bg-amber-50 text-amber-600 border-amber-100',    icon: 'text-amber-500'  },
  Técnico:        { badge: 'bg-teal-50 text-teal-600 border-teal-100',       icon: 'text-teal-500'   },
  Titularidade:   { badge: 'bg-green-50 text-green-600 border-green-100',    icon: 'text-green-500'  },
  Jurídico:       { badge: 'bg-purple-50 text-purple-600 border-purple-100', icon: 'text-purple-500' },
};

const STATUS_BADGE: Record<string, string> = {
  Em_Andamento:     'bg-blue-50 text-blue-600',
  Pendente:         'bg-slate-50 text-slate-500',
  Levantamento:     'bg-amber-50 text-amber-600',
  Analise_Juridica: 'bg-purple-50 text-purple-600',
  Finalizado:       'bg-green-50 text-green-600',
};

const TIPOS_BASE = ['Todos', ...Array.from(new Set(MOCK_MODELS.map(m => m.type)))];

type DynamicDados = Record<string, string>;

type CampoInputType = 'text' | 'number' | 'cpf' | 'date' | 'textarea';

interface TemplateFieldConfig {
  key: string;
  label: string;
  type: CampoInputType;
  required: boolean;
}

interface TemplateModelCustom {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  content: string;
  fields: TemplateFieldConfig[];
  createdAt: string;
  updatedAt: string;
  source: 'custom';
}

type TemplateModelUnified = (typeof MOCK_MODELS[number] & { source?: 'mock' }) | TemplateModelCustom;

const CUSTOM_TEMPLATES_KEY = 'reurb_custom_templates';

interface CampoTemplate {
  key: string;
  label: string;
  type: CampoInputType;
  required: boolean;
  categoria: 'Dados pessoais' | 'Dados institucionais' | 'Dados do documento';
  placeholder: string;
}

type SituacaoProfissional = 'padrao' | 'autonomo' | 'sem_profissao' | 'aposentado';

const TEMPLATES_TEXTUAIS: Record<string, string> = {
  m1: `PORTARIA DE INSTAURACAO\n\nO proprietario {{nome}}, CPF {{cpf}}, {{cargo}}, residente em {{local}}, declara para os devidos fins que a area {{area}} esta vinculada ao processo de regularizacao fundiaria no endereco {{local}}.\n\nData do documento: {{dataDocumento}}.\nObservacoes: {{observacoes}}.`,
  m2: `NOTIFICACAO DE CONFRONTANTES\n\nComunicamos que {{nome}}, CPF {{cpf}}, no cargo de {{cargo}}, notifica os confrontantes da area {{area}}, localizada em {{local}}, conforme processo {{protocolo}}.\n\nData: {{dataDocumento}}.\nObservacoes: {{observacoes}}.`,
  m3: `RELATORIO TECNICO SOCIAL\n\nResponsavel: {{nome}} (CPF {{cpf}}), cargo {{cargo}}.\n\nCaracterizacao da area {{area}} em {{local}}.\n\nConclusao preliminar: {{observacoes}}.\nData do levantamento: {{dataDocumento}}.`,
  m4: `AUTO DE DEMARCACAO URBANISTICA\n\nAos {{dataDocumento}}, {{nome}}, CPF {{cpf}}, no cargo de {{cargo}}, lavra o presente auto para a area {{area}}, situada em {{local}}, protocolo {{protocolo}}.\n\nInformacoes complementares: {{observacoes}}.`,
  m5: `TITULO DE LEGITIMACAO FUNDIARIA\n\nFica registrado que {{nome}}, CPF {{cpf}}, na funcao {{cargo}}, reconhece os dados da area {{area}} localizada em {{local}}, processo {{protocolo}}.\n\nData de emissao: {{dataDocumento}}.\nComplemento: {{observacoes}}.`,
};

const BASE_REQUIRED_FIELDS = new Set(['nome', 'cpf', 'local']);

const FRIENDLY_LABELS: Record<string, string> = {
  nome: 'Nome completo',
  cpf: 'CPF',
  cargo: 'Cargo',
  local: 'Endereco',
  area: 'Area',
  municipio: 'Municipio',
  estado: 'Estado',
  protocolo: 'Protocolo',
  observacoes: 'Observacoes',
  dataDocumento: 'Data do documento',
};

const PLACEHOLDER_HINTS: Record<string, string> = {
  nome: 'Digite o nome completo',
  cpf: '000.000.000-00',
  cargo: 'Ex: Assistente de TI',
  local: 'Ex: Rua das Flores, Sao Luis - MA',
  area: 'Ex: 12.500 m2',
  municipio: 'Ex: Sao Luis',
  estado: 'Ex: MA',
  protocolo: 'Ex: 0001-2026',
  observacoes: 'Informacoes adicionais',
};

function getTemplateTexto(modeloId: string): string {
  return TEMPLATES_TEXTUAIS[modeloId] || `DOCUMENTO\n\nResponsavel: {{nome}} (CPF {{cpf}}).\nLocal: {{local}}.\nData: {{dataDocumento}}.\nObservacoes: {{observacoes}}.`;
}

function extrairChavesPlaceholders(template: string): string[] {
  const matches = template.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || [];
  return Array.from(new Set(matches.map((token) => token.replace(/[{}]/g, '').trim())));
}

function lerModelosCustom(): TemplateModelCustom[] {
  const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TemplateModelCustom[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarModelosCustom(modelos: TemplateModelCustom[]): void {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(modelos));
}

function ajustarTemplateParaSituacaoProfissional(template: string, situacao: SituacaoProfissional): string {
  if (situacao === 'padrao') return template;

  return template
    .replace(/,\s*vinculado\s+a\s*\{\{\s*instituicao\s*\}\}/gi, '')
    .replace(/,\s*pela\s+instituicao\s*\{\{\s*instituicao\s*\}\}/gi, '')
    .replace(/,\s*instituicao\s*\{\{\s*instituicao\s*\}\}/gi, '')
    .replace(/,\s*representando\s*\{\{\s*instituicao\s*\}\}/gi, '');
}

function extrairPlaceholders(template: string): string[] {
  const matches = template.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || [];
  return Array.from(
    new Set(matches.map((token) => token.replace(/[{}]/g, '').trim())),
  );
}

function preencherTemplate(template: string, dados: DynamicDados): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, chave) => {
    const key = String(chave).trim();
    const valor = dados[key];
    return valor && valor.trim() !== '' ? valor.trim() : `{{${key}}}`;
  });
}

function normalizarFraseProfissional(texto: string): string {
  return texto
    .replace(/,\s*no cargo de\s*Nao possui profissao\s*,/gi, ', sem profissao declarada,')
    .replace(/,\s*no cargo de\s*Autonomo\(a\)\s*,/gi, ', autonomo(a),')
    .replace(/,\s*no cargo de\s*Aposentado\(a\)\s*,/gi, ', aposentado(a),')
    .replace(/,\s*Nao possui profissao\s*,/gi, ', sem profissao declarada,')
    .replace(/,\s*Autonomo\(a\)\s*,/gi, ', autonomo(a),')
    .replace(/,\s*Aposentado\(a\)\s*,/gi, ', aposentado(a),')
    // Mantem as quebras de linha originais do template.
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.');
}

function mascararCpf(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function extrairMunicipioEstadoDeEndereco(endereco: string): { municipio: string; estado: string } {
  // Exemplo esperado: "Rua X, Sao Luis - MA"
  const texto = endereco.trim();
  if (!texto) return { municipio: '', estado: '' };

  const matchUf = texto.match(/-\s*([A-Za-z]{2})$/);
  const estado = matchUf ? matchUf[1].toUpperCase() : '';

  const semUf = matchUf ? texto.slice(0, matchUf.index).trim() : texto;
  const partes = semUf.split(',').map((p) => p.trim()).filter(Boolean);
  const municipio = partes.length > 0 ? partes[partes.length - 1] : '';

  return { municipio, estado };
}

function fieldMeta(key: string): CampoTemplate {
  const lower = key.toLowerCase();
  const isCpf = lower === 'cpf';
  const isDate = lower.includes('data');
  const isTextarea = lower.includes('observ');
  const categoria = isCpf || lower === 'nome'
    ? 'Dados pessoais'
    : lower === 'cargo' || lower === 'instituicao'
      ? 'Dados institucionais'
      : 'Dados do documento';

  return {
    key,
    label: FRIENDLY_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
    type: isTextarea ? 'textarea' : isDate ? 'date' : isCpf ? 'cpf' : 'text',
    required: BASE_REQUIRED_FIELDS.has(key),
    categoria,
    placeholder: PLACEHOLDER_HINTS[key] || `Informe ${key}`,
  };
}

function mergeWithProcessData(dados: DynamicDados, processo?: REURBProcess | null): DynamicDados {
  if (!processo) return dados;
  return {
    ...dados,
    protocolo: dados.protocolo || processo.protocol || processo.id,
    area: dados.area || processo.area || '',
    municipio: dados.municipio || processo.municipio || '',
    estado: dados.estado || processo.estado || '',
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textoParaHtml(texto: string, modelName: string, processo?: REURBProcess | null): string {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const corpo = linhas.map((l) => `<p style="margin-bottom:12px;line-height:1.7;">${escapeHtml(l)}</p>`).join('');
  const protocolo = processo?.protocol || processo?.id || 'Nao vinculado';

  return `
    <h1 style="text-align:center;font-size:16px;font-weight:700;letter-spacing:.04em;margin-bottom:8px;">${escapeHtml(modelName.toUpperCase())}</h1>
    <p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:24px;">Processo: ${escapeHtml(protocolo)}</p>
    ${corpo}
  `;
}

function montarMapaPreview(preenchido: string): Array<{ texto: string; pendente: boolean; preenchido: boolean }> {
  const partes = preenchido.split(/({{\s*[a-zA-Z0-9_]+\s*}})/g).filter(Boolean);
  return partes.map((parte) => {
    const isPendente = /^{{\s*[a-zA-Z0-9_]+\s*}}$/.test(parte);
    return { texto: parte, pendente: isPendente, preenchido: !isPendente && /[\w\d]/.test(parte) };
  });
}

// ─── Modal: Geolocalização ────────────────────────────────────────────────────
// Exibido ANTES do modal de processo — captura e valida o GPS do técnico

interface ModalGeoProps {
  municipioProcesso: string;
  onContinuar: () => void; // avança para o modal de processo
  onFechar: () => void;
  carregando: boolean;
  resultado: ReturnType<typeof useGeolocalizacao>['resultado'];
  onCapturar: () => void;
}

const ModalGeo: React.FC<ModalGeoProps> = ({
  municipioProcesso, onContinuar, onFechar, carregando, resultado, onCapturar,
}) => {
  const statusOk = resultado?.status === 'ok';
  const statusErro = resultado?.status === 'erro' || resultado?.status === 'negado';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
              <MapPin size={24} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Verificação de Localização</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Processo vinculado ao município de{' '}
              <span className="text-blue-600 font-bold">{municipioProcesso}</span>
            </p>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4">

          {/* Estado: aguardando captura */}
          {!carregando && !resultado && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-6">
                Para garantir a integridade do processo, o sistema vai registrar sua
                localização no momento de abertura do documento.
              </p>
              <button
                onClick={onCapturar}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mx-auto"
              >
                <MapPin size={16} /> Capturar localização
              </button>
            </div>
          )}

          {/* Estado: carregando GPS */}
          {carregando && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Capturando localização via GPS...</p>
              <p className="text-xs text-slate-400">Pode ser solicitada permissão no navegador</p>
            </div>
          )}

          {/* Estado: OK — município confirmado */}
          {statusOk && resultado?.dadosTecnico && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                <CheckCircle2 size={18} /> Localização confirmada
              </div>
              <p className="text-xs text-green-600">
                Você está em{' '}
                <strong>{resultado.dadosTecnico.municipio}/{resultado.dadosTecnico.estado}</strong>
                {' '}— município compatível com o processo.
              </p>
              <div className="text-[11px] text-green-500 font-mono">
                Lat: {resultado.dadosTecnico.latitude.toFixed(5)} &nbsp;|&nbsp;
                Lng: {resultado.dadosTecnico.longitude.toFixed(5)} &nbsp;|&nbsp;
                Precisão: ±{resultado.dadosTecnico.precisao}m
              </div>
            </div>
          )}

          {/* Estado: Erro ou permissão negada */}
          {statusErro && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <AlertTriangle size={18} /> Não foi possível capturar
              </div>
              <p className="text-xs text-red-600">{resultado?.mensagem}</p>
              <button
                onClick={onCapturar}
                className="text-xs text-red-600 underline font-medium mt-1"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-6 pt-0 border-t border-slate-100 flex gap-3">
          <button
            onClick={onFechar}
            className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            // Pode continuar quando houver resultado de captura (ok, erro ou negado)
            onClick={onContinuar}
            disabled={carregando || !resultado}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continuar <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Selecionar Processo ───────────────────────────────────────────────
// Permanece igual ao original — sem alterações

interface ModalSelecionarProcessoProps {
  modelName: string;
  processos: REURBProcess[];
  onConfirmar: (processo: REURBProcess) => void;
  onFechar: () => void;
}

const ModalSelecionarProcesso: React.FC<ModalSelecionarProcessoProps> = ({
  modelName, processos, onConfirmar, onFechar,
}) => {
  const [processoBusca, setProcessoBusca] = useState('');
  const [processoSelecionado, setProcessoSelecionado] = useState<REURBProcess | null>(null);

  const processosFiltrados = processos.filter(p =>
    p.title.toLowerCase().includes(processoBusca.toLowerCase()) ||
    p.applicant.toLowerCase().includes(processoBusca.toLowerCase()) ||
    (p.protocol || p.id).toLowerCase().includes(processoBusca.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
              <FolderOpen size={24} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Vincular ao Processo</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Selecione o processo para gerar o documento
              <span className="text-blue-600 font-bold"> "{modelName}"</span>
            </p>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Busca */}
        <div className="p-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por título, requerente ou protocolo..."
              value={processoBusca}
              onChange={e => setProcessoBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de processos */}
        <div className="px-6 pb-4 max-h-64 overflow-y-auto space-y-2">
          {processosFiltrados.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nenhum processo encontrado.
            </div>
          ) : (
            processosFiltrados.map(processo => {
              const selecionado = processoSelecionado?.id === processo.id;
              const statusKey = String(processo.status).replace(/ /g, '_');
              const badgeClass = STATUS_BADGE[statusKey] || 'bg-slate-50 text-slate-500';
              return (
                <div
                  key={processo.id}
                  onClick={() => setProcessoSelecionado(processo)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    selecionado
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  {/* Indicador de seleção */}
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    selecionado ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}>
                    {selecionado && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{processo.title}</p>
                    <p className="text-xs text-slate-400 truncate">{processo.applicant}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 font-mono">
                      {processo.protocol || processo.id}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${badgeClass}`}>
                      {processo.modality}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-6 pt-3 border-t border-slate-100 flex gap-3">
          <button
            onClick={onFechar}
            className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => processoSelecionado && onConfirmar(processoSelecionado)}
            disabled={!processoSelecionado}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Abrir no Editor <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Dados do Documento ────────────────────────────────────────────────
// Mostra prévia do modelo + formulário de dados lado a lado

interface ModalDadosDocumentoProps {
  modelo: any;
  onConfirmar: (payload: {
    dados: DadosAdicionaisDocumento;
    templateBase: string;
    textoFinal: string;
  }) => void;
  onFechar: () => void;
}

const ModalDadosDocumento: React.FC<ModalDadosDocumentoProps> = ({
  modelo, onConfirmar, onFechar,
}) => {
  const templateBase = useMemo(
    () => ((modelo as TemplateModelCustom).content || getTemplateTexto(modelo.id)),
    [modelo],
  );
  const placeholders = useMemo(() => extrairPlaceholders(templateBase), [templateBase]);
  const campos = useMemo(() => {
    const modeloCustom = modelo as TemplateModelCustom;
    if (Array.isArray(modeloCustom.fields) && modeloCustom.fields.length > 0) {
      return modeloCustom.fields.map((campo) => ({
        key: campo.key,
        label: campo.label,
        type: campo.type,
        required: campo.required,
        categoria: fieldMeta(campo.key).categoria,
        placeholder: PLACEHOLDER_HINTS[campo.key] || `Informe ${campo.label.toLowerCase()}`,
      })) as CampoTemplate[];
    }
    return placeholders.map(fieldMeta);
  }, [modelo, placeholders]);
  const [dados, setDados] = useState<DynamicDados>(() => {
    const base: DynamicDados = {
      dataDocumento: new Date().toISOString().split('T')[0],
    };
    placeholders.forEach((key) => {
      if (!base[key]) base[key] = '';
    });
    return base;
  });
  const [perfis, setPerfis] = useState<TemplateProfile[]>([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState('');
  const [nomePerfil, setNomePerfil] = useState('');
  const [salvarPerfil, setSalvarPerfil] = useState(false);
  const [situacaoProfissional, setSituacaoProfissional] = useState<SituacaoProfissional>('padrao');
  const userId = useMemo(() => {
    const current = localStorage.getItem('reurb_current_user');
    if (!current) return 'anon';
    try {
      const parsed = JSON.parse(current);
      return parsed?.id || 'anon';
    } catch {
      return 'anon';
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarPerfis = async () => {
      const data = await templateProfilesService.list(userId);
      if (ativo) setPerfis(data);
    };

    carregarPerfis();

    return () => {
      ativo = false;
    };
  }, [modelo.id, userId]);

  const camposObrigatorios = campos.filter((campo) => campo.required);
  const faltantes = camposObrigatorios.filter((campo) => !String(dados[campo.key] || '').trim());
  const preenchidos = campos.filter((campo) => String(dados[campo.key] || '').trim()).length;
  const isComplete = faltantes.length === 0;

  const templateBaseAjustado = useMemo(
    () => ajustarTemplateParaSituacaoProfissional(templateBase, situacaoProfissional),
    [templateBase, situacaoProfissional],
  );

  const textoDeterministico = useMemo(
    () => normalizarFraseProfissional(preencherTemplate(templateBaseAjustado, dados)),
    [templateBaseAjustado, dados],
  );

  const textoPreview = textoDeterministico;
  const previewTokens = useMemo(() => montarMapaPreview(textoPreview), [textoPreview]);

  const dadosComTipagem: DadosAdicionaisDocumento = {
    nome: dados.nome || '',
    cpf: dados.cpf || '',
    local: dados.local || '',
    cargo: dados.cargo || '',
    instituicao: dados.instituicao || '',
    dataDocumento: dados.dataDocumento || '',
    observacoes: dados.observacoes || '',
  };

  const groupedCampos = useMemo(() => {
    const camposVisiveis = campos.filter((campo) => campo.key !== 'municipio' && campo.key !== 'estado' && campo.key !== 'instituicao');
    return {
      'Dados pessoais': camposVisiveis.filter((campo) => campo.categoria === 'Dados pessoais'),
      'Dados institucionais': camposVisiveis.filter((campo) => campo.categoria === 'Dados institucionais'),
      'Dados do documento': camposVisiveis.filter((campo) => campo.categoria === 'Dados do documento'),
    };
  }, [campos]);

  const handleChange = (field: string, value: string) => {
    if (field === 'local') {
      const parsed = extrairMunicipioEstadoDeEndereco(value);
      setDados((prev) => ({
        ...prev,
        local: value,
        municipio: parsed.municipio || prev.municipio || '',
        estado: parsed.estado || prev.estado || '',
      }));
      return;
    }

    setDados((prev) => ({
      ...prev,
      [field]: field === 'cpf' ? mascararCpf(value) : value,
    }));
  };

  const handleSelecionarPerfil = (profileId: string) => {
    setPerfilSelecionado(profileId);
    const profile = perfis.find((p) => p.id === profileId);
    if (!profile) return;
    setDados((prev) => ({ ...prev, ...profile.dados }));
  };

  const handlePersistirPerfilSeMarcado = async () => {
    if (!salvarPerfil) return;
    const perfilNome = (nomePerfil || dados.nome || 'Perfil sem nome').trim();
    const novoPerfil = await templateProfilesService.create(userId, {
      nomePerfil: perfilNome,
      dados,
    });

    setPerfis((prev) => [novoPerfil, ...prev.filter((p) => p.id !== novoPerfil.id)].slice(0, 15));
  };

  const handleSituacaoProfissional = (situacao: SituacaoProfissional) => {
    setSituacaoProfissional(situacao);

    if (situacao === 'padrao') {
      setDados((prev) => {
        const cargosAuto = ['Autonomo(a)', 'Nao possui profissao', 'Aposentado(a)'];
        return {
          ...prev,
          cargo: cargosAuto.includes(prev.cargo || '') ? '' : prev.cargo,
        };
      });
      return;
    }

    const cargoPorSituacao: Record<Exclude<SituacaoProfissional, 'padrao'>, string> = {
      autonomo: 'Autonomo(a)',
      sem_profissao: 'Nao possui profissao',
      aposentado: 'Aposentado(a)',
    };

    setDados((prev) => ({
      ...prev,
      cargo: cargoPorSituacao[situacao],
    }));
  };

  const handleExcluirPerfil = async () => {
    if (!perfilSelecionado) return;
    const perfil = perfis.find((p) => p.id === perfilSelecionado);
    const nome = perfil?.nomePerfil || 'este perfil';
    const confirmar = window.confirm(`Tem certeza que deseja excluir o perfil "${nome}"?`);
    if (!confirmar) return;

    await templateProfilesService.remove(userId, perfilSelecionado);
    setPerfis((prev) => prev.filter((p) => p.id !== perfilSelecionado));
    setPerfilSelecionado('');
  };


  const renderCampo = (campo: CampoTemplate) => {
    const valor = dados[campo.key] || '';
    const erroObrigatorio = campo.required && !valor.trim();
    const campoInativo =
      situacaoProfissional !== 'padrao' &&
      campo.key === 'cargo';

    return (
      <div key={campo.key}>
        <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
          {campo.label}{campo.required ? ' *' : ''}
        </label>
        {campo.type === 'textarea' ? (
          <textarea
            value={valor}
            rows={3}
            placeholder={campo.placeholder}
            onChange={(e) => handleChange(campo.key, e.target.value)}
            disabled={campoInativo}
            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${
              erroObrigatorio ? 'border-amber-300' : 'border-slate-200'
            } ${campoInativo ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        ) : (
          <input
            type={campo.type === 'date' ? 'date' : 'text'}
            value={valor}
            placeholder={campo.placeholder}
            onChange={(e) => handleChange(campo.key, e.target.value)}
            disabled={campoInativo}
            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              campo.type === 'cpf' ? 'font-mono' : ''
            } ${erroObrigatorio ? 'border-amber-300' : 'border-slate-200'} ${campoInativo ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">

        {/* Cabeçalho */}
        <div className="border-b border-slate-100 flex items-center justify-between p-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">Geracao Dinamica de Documento</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Preencha os campos e acompanhe a substituicao automatica para {modelo.name}
            </p>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo Principal - Layout lado a lado */}
        <div className="flex-1 overflow-hidden flex gap-6 p-6">

          {/* LADO ESQUERDO: Prévia do Modelo */}
          <div className="flex-1 flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Eye size={16} /> Prévia do Modelo
            </h4>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-y-auto shadow-sm">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-base font-black text-center mb-2">{modelo.name.toUpperCase()}</h2>
                <p className="text-xs text-center text-slate-500 mb-4">
                  Tipo: <span className="font-bold text-blue-600">{modelo.type}</span> - v{modelo.version}
                </p>

                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                  <p className="font-bold text-slate-800 mb-1">Progresso de preenchimento</p>
                  <p>{preenchidos} de {campos.length} campos preenchidos</p>
                  {faltantes.length > 0 && (
                    <p className="text-amber-700 mt-1">
                      Faltando: {faltantes.map((campo) => campo.label).join(', ')}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] leading-7 text-slate-700 whitespace-pre-wrap">
                  {previewTokens.map((token, idx) => (
                    token.pendente ? (
                      <span key={`pending-${idx}`} className="inline px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        {token.texto}
                      </span>
                    ) : (
                      <span key={`filled-${idx}`} className={`inline ${token.preenchido ? 'bg-blue-100 text-blue-900 rounded px-0.5' : ''}`}>
                        {token.texto}
                      </span>
                    )
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* LADO DIREITO: Formulário de Dados */}
          <div className="w-96 flex flex-col">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText size={16} /> Dados do Documento
            </h4>
            <div className="mb-3 p-3 border border-slate-200 bg-slate-50 rounded-xl space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">Perfil salvo</label>
              <div className="flex items-center gap-2">
                <select
                  value={perfilSelecionado}
                  onChange={(e) => handleSelecionarPerfil(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Selecionar perfil salvo</option>
                  {perfis.map((perfil) => (
                    <option key={perfil.id} value={perfil.id}>{perfil.nomePerfil}</option>
                  ))}
                </select>

                <button
                  type="button"
                  title="Excluir perfil selecionado"
                  onClick={handleExcluirPerfil}
                  disabled={!perfilSelecionado}
                  className="h-10 w-10 shrink-0 inline-flex items-center justify-center text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={14} />
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={salvarPerfil}
                  onChange={(e) => setSalvarPerfil(e.target.checked)}
                />
                Salvar essas informacoes para uso futuro
              </label>

              {salvarPerfil && (
                <input
                  type="text"
                  value={nomePerfil}
                  onChange={(e) => setNomePerfil(e.target.value)}
                  placeholder="Nome do perfil (ex: Perfil Andre)"
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                />
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {Object.entries(groupedCampos).map(([categoria, itens]) => (
                itens.length > 0 ? (
                  <section key={categoria} className="space-y-2.5 pb-2 border-b border-slate-100">
                    <h5 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{categoria}</h5>

                    {categoria === 'Dados institucionais' && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSituacaoProfissional('autonomo')}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md border ${
                              situacaoProfissional === 'autonomo'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Autonomo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSituacaoProfissional('sem_profissao')}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md border ${
                              situacaoProfissional === 'sem_profissao'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Nao possui profissao
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSituacaoProfissional('aposentado')}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md border ${
                              situacaoProfissional === 'aposentado'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Aposentado
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSituacaoProfissional('padrao')}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md border ${
                              situacaoProfissional === 'padrao'
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Limpar selecao
                          </button>
                        </div>
                        {situacaoProfissional !== 'padrao' && (
                          <p className="text-[11px] text-slate-500">
                            Campos institucionais foram inativados para esta situacao.
                          </p>
                        )}
                      </div>
                    )}

                    {itens.map(renderCampo)}
                  </section>
                ) : null
              ))}

              <div className={`text-xs font-medium p-2.5 rounded-lg border ${
                isComplete
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isComplete
                  ? `Dados prontos para gerar documento (${preenchidos}/${campos.length}).`
                  : `Campos pendentes: ${faltantes.map((f) => f.label).join(', ')}`}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-100 flex gap-3 p-6 bg-slate-50">
          <button
            onClick={onFechar}
            className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              await handlePersistirPerfilSeMarcado();
              onConfirmar({
                dados: dadosComTipagem,
                templateBase: templateBaseAjustado,
                textoFinal: textoPreview,
              });
            }}
            disabled={!isComplete}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Gerar documento <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface TemplateBuilderModalProps {
  model?: TemplateModelCustom | null;
  onClose: () => void;
  onSave: (model: TemplateModelCustom) => void;
}

const TemplateBuilderModal: React.FC<TemplateBuilderModalProps> = ({ model, onClose, onSave }) => {
  const [name, setName] = useState(model?.name || '');
  const [type, setType] = useState(model?.type || 'Administrativo');
  const [version, setVersion] = useState(model?.version || '1.0');
  const [description, setDescription] = useState(model?.description || '');
  const [content, setContent] = useState(model?.content || '');
  const [fields, setFields] = useState<TemplateFieldConfig[]>(
    model?.fields?.length
      ? model.fields
      : [{ key: 'nome', label: 'Nome completo', type: 'text', required: true }],
  );

  const placeholders = useMemo(() => extrairChavesPlaceholders(content), [content]);
  const fieldKeys = useMemo(() => fields.map((f) => f.key.trim()).filter(Boolean), [fields]);
  const missingFields = useMemo(
    () => placeholders.filter((key) => !fieldKeys.includes(key)),
    [placeholders, fieldKeys],
  );
  const unusedFields = useMemo(
    () => fieldKeys.filter((key) => !placeholders.includes(key)),
    [fieldKeys, placeholders],
  );
  const duplicateFieldKeys = useMemo(
    () => fieldKeys.filter((key, idx) => fieldKeys.indexOf(key) !== idx),
    [fieldKeys],
  );

  const canSave =
    name.trim() !== '' &&
    type.trim() !== '' &&
    version.trim() !== '' &&
    content.trim() !== '' &&
    fields.length > 0 &&
    fields.every((f) => f.key.trim() !== '' && f.label.trim() !== '') &&
    missingFields.length === 0 &&
    duplicateFieldKeys.length === 0;

  const getTipoDescricao = (tipo: CampoInputType): string => {
    const mapa: Record<CampoInputType, string> = {
      text: 'Texto curto para nomes e identificadores simples.',
      number: 'Apenas numeros (ex.: area, quantidade).',
      cpf: 'Campo com formato de CPF.',
      date: 'Seletor de data.',
      textarea: 'Texto longo para observacoes e justificativas.',
    };
    return mapa[tipo];
  };

  const updateField = (index: number, patch: Partial<TemplateFieldConfig>) => {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  const addField = () => {
    setFields((prev) => [...prev, { key: '', label: '', type: 'text', required: false }]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!canSave) return;
    const now = new Date().toISOString().slice(0, 10);
    const payload: TemplateModelCustom = {
      id: model?.id || `tm-${Date.now()}`,
      name: name.trim(),
      type: type.trim(),
      version: version.trim(),
      description: description.trim(),
      content: content.trim(),
      fields: fields.map((f) => ({ ...f, key: f.key.trim(), label: f.label.trim() })),
      createdAt: model?.createdAt || now,
      updatedAt: now,
      source: 'custom',
    };
    onSave(payload);
  };

  const previewTokens = useMemo(() => montarMapaPreview(content), [content]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">{model ? 'Editar Modelo' : 'Criar Novo Modelo'}</h3>
            <p className="text-sm text-slate-500 mt-1">Configure metadados, conteúdo e campos dinâmicos manualmente.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do modelo" className="md:col-span-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Versão" className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Categoria" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none" />

            <div>
              <h4 className="text-sm font-black text-slate-700 mb-2">Editor de Conteúdo</h4>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva o modelo usando placeholders, ex: O proprietário {{nome}}, CPF {{cpf}}..."
                rows={13}
                className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm leading-6 font-mono resize-y"
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-700">Configuração de Campos</h4>
                <button type="button" onClick={addField} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Campo
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Defina manualmente cada campo que o modelo usa no formato <strong>{'{{campo}}'}</strong>.
              </p>
              <div className="grid grid-cols-12 gap-2 mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span className="col-span-3">Chave</span>
                <span className="col-span-3">Rótulo</span>
                <span className="col-span-3">Tipo de entrada</span>
                <span className="col-span-2">Obrigatório</span>
                <span className="col-span-1">Ação</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={`field-${index}`} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                        placeholder="chave interna (ex: nome)"
                        title="Chave usada no template: {{chave}}"
                        className="col-span-3 px-2 py-2 border border-slate-200 rounded text-xs"
                      />
                      <input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="rótulo visível (ex: Nome completo)"
                        title="Nome amigavel mostrado no formulario"
                        className="col-span-3 px-2 py-2 border border-slate-200 rounded text-xs"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as CampoInputType })}
                        className="col-span-3 px-2 py-2 border border-slate-200 rounded text-xs"
                        title="Define como o campo sera preenchido"
                      >
                        <option value="text">Texto curto</option>
                        <option value="number">Numero</option>
                        <option value="cpf">CPF</option>
                        <option value="date">Data</option>
                        <option value="textarea">Texto longo</option>
                      </select>
                      <label className="col-span-2 text-[11px] text-slate-600 flex items-center gap-1">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} />
                        Obrig.
                      </label>
                      <button type="button" onClick={() => removeField(index)} className="col-span-1 p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50" title="Remover campo">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 px-1">{getTipoDescricao(field.type)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-xs space-y-1">
              <p className="font-bold text-slate-700">Validação do Modelo</p>
              {missingFields.length > 0 && <p className="text-rose-700">Campos usados no texto e não configurados: {missingFields.map((m) => `{{${m}}}`).join(', ')}</p>}
              {unusedFields.length > 0 && <p className="text-amber-700">Campos configurados não utilizados: {unusedFields.join(', ')}</p>}
              {duplicateFieldKeys.length > 0 && <p className="text-rose-700">Chaves duplicadas: {Array.from(new Set(duplicateFieldKeys)).join(', ')}</p>}
              {missingFields.length === 0 && duplicateFieldKeys.length === 0 && <p className="text-emerald-700">Modelo consistente para salvar.</p>}
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-700 mb-2">Preview</h4>
              <div className="p-3 border border-slate-200 rounded-lg bg-white text-sm whitespace-pre-wrap leading-6">
                {previewTokens.map((token, i) => (
                  token.pendente
                    ? <span key={`pv-${i}`} className="bg-amber-100 text-amber-800 rounded px-1 py-0.5">{token.texto}</span>
                    : <span key={`pv-${i}`}>{token.texto}</span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white">Cancelar</button>
          <button onClick={handleSave} disabled={!canSave} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            Salvar modelo
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [tipoAtivo, setTipoAtivo] = useState('Todos');
  const [modelosCustom, setModelosCustom] = useState<TemplateModelCustom[]>(() => lerModelosCustom());
  const [builderAberto, setBuilderAberto] = useState(false);
  const [modeloEmEdicao, setModeloEmEdicao] = useState<TemplateModelCustom | null>(null);
  const [menuModeloId, setMenuModeloId] = useState<string | null>(null);

  // Modelo clicado pelo usuário
  const [modeloSelecionado, setModeloSelecionado] = useState<any | null>(null);

  // Dados adicionais do documento
  const [dadosDocumento, setDadosDocumento] = useState<DadosAdicionaisDocumento | null>(null);
  const [templateBase, setTemplateBase] = useState('');
  const [textoFinalDocumento, setTextoFinalDocumento] = useState('');

  // Controla qual modal está visível: 'dados' → 'processo' → 'geo' → editor
  const [etapaModal, setEtapaModal] = useState<'dados' | 'geo' | 'processo' | null>(null);

  // Processo escolhido no modal de processo (etapa 1)
  const [processoEscolhido, setProcessoEscolhido] = useState<REURBProcess | null>(null);

  // Hook de geolocalização
  const { carregando, resultado, capturarEValidar, limpar } = useGeolocalizacao();

  // Processos disponíveis para vincular
  // TODO (Backend): GET /api/processos → substitui essa lógica
  const processos = useMemo(() => {
    const doDb = dbService.processes.selectAll();
    return doDb.length > 0 ? doDb : MOCK_PROCESSES;
  }, []);

  // ─── Filtro de modelos ─────────────────────────────────────────────────────

  const todosModelos = useMemo<TemplateModelUnified[]>(() => {
    const mock = MOCK_MODELS.map((m) => ({ ...m, source: 'mock' as const }));
    return [...mock, ...modelosCustom];
  }, [modelosCustom]);

  const tiposDisponiveis = useMemo(() => {
    const tipos = Array.from(new Set(todosModelos.map((m) => m.type)));
    return Array.from(new Set([...TIPOS_BASE, ...tipos]));
  }, [todosModelos]);

  const modelosFiltrados = todosModelos.filter(m => {
    const matchBusca =
      m.name.toLowerCase().includes(busca.toLowerCase()) ||
      m.type.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = tipoAtivo === 'Todos' || m.type === tipoAtivo;
    return matchBusca && matchTipo;
  });

  const handleSalvarModeloCustom = (model: TemplateModelCustom) => {
    setModelosCustom((prev) => {
      const next = prev.some((m) => m.id === model.id)
        ? prev.map((m) => (m.id === model.id ? model : m))
        : [model, ...prev];
      salvarModelosCustom(next);
      return next;
    });
    setModeloEmEdicao(null);
    setBuilderAberto(false);
  };

  const handleEditarModelo = (model: TemplateModelUnified) => {
    if ((model as TemplateModelCustom).source !== 'custom') return;
    setModeloEmEdicao(model as TemplateModelCustom);
    setBuilderAberto(true);
  };

  const handleExcluirModelo = (model: TemplateModelUnified) => {
    if ((model as TemplateModelCustom).source !== 'custom') return;
    const confirmar = window.confirm(`Tem certeza que deseja excluir o modelo "${model.name}"?`);
    if (!confirmar) return;

    setModelosCustom((prev) => {
      const next = prev.filter((m) => m.id !== model.id);
      salvarModelosCustom(next);
      return next;
    });
  };

  // ─── Fluxo ao clicar "Usar Modelo" ────────────────────────────────────────
  // NOVA ORDEM: dados → processo primeiro → geo com município real → editor
  // O usuário preenche os dados que serão inseridos no documento

  const handleUsarModelo = (model: any) => {
    setModeloSelecionado(model);
    setProcessoEscolhido(null);
    setDadosDocumento(null);
    setTemplateBase('');
    setTextoFinalDocumento('');
    limpar();
    setEtapaModal('dados'); // 1. captura os dados do documento
  };

  // ─── Usuário preencheu os dados → vai para seleção de processo ────────────

  const handleConfirmarDados = (payload: {
    dados: DadosAdicionaisDocumento;
    templateBase: string;
    textoFinal: string;
  }) => {
    setDadosDocumento(payload.dados);
    setTemplateBase(payload.templateBase);
    setTextoFinalDocumento(payload.textoFinal);
    setEtapaModal('processo'); // 2. escolhe o processo
  };

  // ─── Usuário escolheu o processo → abre geo com município real ────────────

  const handleConfirmarProcesso = (processo: REURBProcess) => {
    setProcessoEscolhido(processo);
    setEtapaModal('geo'); // 3. valida GPS com município real do processo
  };

  // ─── Captura GPS usando o município REAL do processo escolhido ─────────────

  const handleCapturarGeo = () => {
    const municipio =
      processoEscolhido?.municipio ||
      processoEscolhido?.location?.split(',').pop()?.split('—')[0].trim() ||
      'Brasil';
    capturarEValidar(municipio);
  };

  // ─── Geo concluída → abre o editor ───────────────────────────────────────

  const handleContinuarParaEditor = () => {
    if (!processoEscolhido || !modeloSelecionado) return;

    const dadosParaTemplate = mergeWithProcessData((dadosDocumento || {}) as DynamicDados, processoEscolhido);
    const textoDeterministico = preencherTemplate(templateBase || getTemplateTexto(modeloSelecionado.id), dadosParaTemplate);
    const textoFinal = textoFinalDocumento && !/{{\s*[a-zA-Z0-9_]+\s*}}/.test(textoFinalDocumento)
      ? textoFinalDocumento
      : textoDeterministico;

    let conteudoCompleto = textoParaHtml(textoFinal, modeloSelecionado.name, processoEscolhido);

    // Injeta bloco de geo no início do documento se GPS foi capturado
    if (resultado?.dadosTecnico) {
      const blocoGeo = gerarBlocoGeoHTML(resultado.dadosTecnico);
      conteudoCompleto = blocoGeo + conteudoCompleto;
    }

    const newDoc = dbService.documents.upsert({
      title:     modeloSelecionado.name,
      content:   conteudoCompleto,
      processId: processoEscolhido.id,
      dadosAdicionais: dadosDocumento,
    });

    setModeloSelecionado(null);
    setProcessoEscolhido(null);
    setDadosDocumento(null);
    setTemplateBase('');
    setTextoFinalDocumento('');
    setEtapaModal(null);
    limpar();
    navigate(`/edit/${newDoc.id}`);
  };

  // ─── Fechar qualquer modal ─────────────────────────────────────────────────

  const handleFechar = () => {
    setModeloSelecionado(null);
    setProcessoEscolhido(null);
    setDadosDocumento(null);
    setTemplateBase('');
    setTextoFinalDocumento('');
    setEtapaModal(null);
    limpar();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Modal 0: Dados do Documento — primeiro passo (NOVO) */}
      {etapaModal === 'dados' && modeloSelecionado && (
        <ModalDadosDocumento
          modelo={modeloSelecionado}
          onConfirmar={handleConfirmarDados}
          onFechar={handleFechar}
        />
      )}

      {/* Modal 1: Selecionar Processo — segundo passo */}
      {etapaModal === 'processo' && modeloSelecionado && (
        <ModalSelecionarProcesso
          modelName={modeloSelecionado.name}
          processos={processos}
          onConfirmar={handleConfirmarProcesso}
          onFechar={handleFechar}
        />
      )}

      {/* Modal 2: Geolocalização — município real do processo escolhido */}
      {etapaModal === 'geo' && modeloSelecionado && processoEscolhido && (
        <ModalGeo
          municipioProcesso={
            processoEscolhido.municipio ||
            processoEscolhido.location?.split(',').pop()?.split('—')[0].trim() ||
            'Brasil'
          }
          onContinuar={handleContinuarParaEditor}
          onFechar={handleFechar}
          carregando={carregando}
          resultado={resultado}
          onCapturar={handleCapturarGeo}
        />
      )}

      {builderAberto && (
        <TemplateBuilderModal
          model={modeloEmEdicao}
          onClose={() => {
            setBuilderAberto(false);
            setModeloEmEdicao(null);
          }}
          onSave={handleSalvarModeloCustom}
        />
      )}

      {/* Header */}
      <header className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Biblioteca de Modelos</h2>
        <p className="text-slate-500 mt-2 font-medium">
          Documentos padronizados conforme a legislação federal de REURB.
        </p>
      </header>

      {/* Busca */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => {
            setModeloEmEdicao(null);
            setBuilderAberto(true);
          }}
          className="px-4 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          + Criar novo modelo
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome do documento ou tipo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tiposDisponiveis.map(tipo => (
          <button
            key={tipo}
            onClick={() => setTipoAtivo(tipo)}
            className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
              tipoAtivo === tipo
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600'
            }`}
          >
            {tipo}
          </button>
        ))}
      </div>

      {/* Grid de modelos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modelosFiltrados.map((model) => {
          const estilo = TIPO_STYLE[model.type] ?? TIPO_STYLE.Administrativo;
          const isCustom = (model as TemplateModelCustom).source === 'custom';
          return (
            <div
              key={model.id}
              className="bg-white border border-slate-200 rounded-[32px] p-6 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col"
            >
              {/* Ícone decorativo de fundo */}
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText size={80} />
              </div>

              {/* Ícone principal */}
              <div className={`w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${estilo.icon}`}>
                <FileText size={24} />
              </div>

              {/* Nome */}
              <h3 className="text-base font-black text-slate-800 mb-3 leading-tight flex-1">
                {model.name}
              </h3>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  v{model.version}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${estilo.badge}`}>
                  {model.type}
                </span>
              </div>

              {/* Rodapé do card */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 gap-2">
                <div className="text-[10px] text-slate-400 font-medium">
                  {'createdAt' in model ? model.createdAt : model.lastUpdated}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUsarModelo(model)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                  >
                    <Plus size={14} /> Usar Modelo
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuModeloId((prev) => (prev === model.id ? null : model.id));
                      }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Mais ações"
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {menuModeloId === model.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                        {isCustom ? (
                          <>
                            <button
                              onClick={() => {
                                handleEditarModelo(model);
                                setMenuModeloId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                handleExcluirModelo(model);
                                setMenuModeloId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-2.5 text-[11px] text-slate-500">
                            Ações disponíveis apenas para modelos personalizados.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Estado vazio */}
        {modelosFiltrados.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-200">
              <Search size={40} />
            </div>
            <h3 className="text-slate-800 font-black text-lg">Nenhum modelo encontrado</h3>
            <p className="text-slate-400 text-sm mt-1">Tente buscar por outro nome ou tipo de documento.</p>
          </div>
        )}
      </div>

      {/* Rodapé informativo — igual ao original */}
      <div className="mt-12 p-8 bg-indigo-50 rounded-[32px] border border-indigo-100 flex items-center gap-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
          <Info size={32} />
        </div>
        <div>
          <h4 className="font-black text-indigo-900">Precisa de um modelo personalizado?</h4>
          <p className="text-sm text-indigo-700/70 font-medium mt-1">
            Solicite ao setor jurídico a inclusão de novos templates padronizados.
            Administradores podem cadastrar modelos diretamente no painel de gestão.
          </p>
        </div>
      </div>
    </div>
  );
};
