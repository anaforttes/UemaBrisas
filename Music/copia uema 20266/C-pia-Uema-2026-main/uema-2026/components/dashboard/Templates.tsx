import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Info, X,
  FolderOpen, ChevronRight, MapPin, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { MOCK_MODELS, MOCK_PROCESSES, getConteudoModelo } from '../../constants';
import { dbService } from '../../services/databaseService';
import { REURBProcess } from '../../types/index';
import { useGeolocalizacao, gerarBlocoGeoHTML } from '../editor/components/useGeolocalizacao';

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

const TIPOS = ['Todos', ...Array.from(new Set(MOCK_MODELS.map(m => m.type)))];

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
  const statusDiv = resultado?.status === 'divergencia';
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

          {/* Estado: Divergência de município */}
          {statusDiv && resultado?.dadosTecnico && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <AlertTriangle size={18} /> Divergência detectada
              </div>
              <p className="text-xs text-amber-700">
                Você está em{' '}
                <strong>{resultado.dadosTecnico.municipio}/{resultado.dadosTecnico.estado}</strong>,
                mas o processo é referente a{' '}
                <strong>{municipioProcesso}</strong>.
              </p>
              <p className="text-xs text-amber-600">
                A divergência será registrada automaticamente no documento. Você pode continuar.
              </p>
              <div className="text-[11px] text-amber-500 font-mono">
                Lat: {resultado.dadosTecnico.latitude.toFixed(5)} &nbsp;|&nbsp;
                Lng: {resultado.dadosTecnico.longitude.toFixed(5)}
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
            // Pode continuar se: localização confirmada, divergência (registra mas não bloqueia),
            // ou erro/negado (técnico pode pular — a divergência fica registrada como "GPS indisponível")
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

// ─── Componente Principal ─────────────────────────────────────────────────────

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [tipoAtivo, setTipoAtivo] = useState('Todos');

  // Modelo clicado pelo usuário
  const [modeloSelecionado, setModeloSelecionado] = useState<any | null>(null);

  // Controla qual modal está visível: 'processo' → 'geo' → editor
  const [etapaModal, setEtapaModal] = useState<'geo' | 'processo' | null>(null);

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

  const modelosFiltrados = MOCK_MODELS.filter(m => {
    const matchBusca =
      m.name.toLowerCase().includes(busca.toLowerCase()) ||
      m.type.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = tipoAtivo === 'Todos' || m.type === tipoAtivo;
    return matchBusca && matchTipo;
  });

  // ─── Fluxo ao clicar "Usar Modelo" ────────────────────────────────────────
  // ORDEM CORRETA: processo primeiro → geo com município real → editor
  // Assim o GPS é validado contra o município do processo escolhido

  const handleUsarModelo = (model: any) => {
    setModeloSelecionado(model);
    setProcessoEscolhido(null);
    limpar();
    setEtapaModal('processo'); // 1. escolhe o processo primeiro
  };

  // ─── Usuário escolheu o processo → abre geo com município real ────────────

  const handleConfirmarProcesso = (processo: REURBProcess) => {
    setProcessoEscolhido(processo);
    setEtapaModal('geo'); // 2. valida GPS com município real do processo
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

    // TODO (Backend): GET /api/processos/:id → buscar dados completos
    let conteudoCompleto = getConteudoModelo(modeloSelecionado.id, processoEscolhido);

    // Injeta bloco de geo no início do documento se GPS foi capturado
    if (resultado?.dadosTecnico) {
      const blocoGeo = gerarBlocoGeoHTML(
        resultado.dadosTecnico,
        resultado.divergencia,
        resultado.municipioProcesso,
      );
      conteudoCompleto = blocoGeo + conteudoCompleto;
    }

    const newDoc = dbService.documents.upsert({
      title:     modeloSelecionado.name,
      content:   conteudoCompleto,
      processId: processoEscolhido.id,
    });

    setModeloSelecionado(null);
    setProcessoEscolhido(null);
    setEtapaModal(null);
    limpar();
    navigate(`/edit/${newDoc.id}`);
  };

  // ─── Fechar qualquer modal ─────────────────────────────────────────────────

  const handleFechar = () => {
    setModeloSelecionado(null);
    setProcessoEscolhido(null);
    setEtapaModal(null);
    limpar();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Modal 1: Selecionar Processo — primeiro passo */}
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

      {/* Header */}
      <header className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Biblioteca de Modelos</h2>
        <p className="text-slate-500 mt-2 font-medium">
          Documentos padronizados conforme a legislação federal de REURB.
        </p>
      </header>

      {/* Busca */}
      <div className="flex gap-4 mb-6">
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
        {TIPOS.map(tipo => (
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
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="text-[10px] text-slate-400 font-medium">
                  {model.lastUpdated}
                </div>
                <button
                  onClick={() => handleUsarModelo(model)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  <Plus size={14} /> Usar Modelo
                </button>
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
