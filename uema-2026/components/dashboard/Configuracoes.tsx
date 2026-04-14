import React, { useState, useEffect } from 'react';
import {
  Palette, Type, Accessibility, Monitor,
  RotateCcw, Save, CheckCircle2, Sun, Moon,
  Circle, Eye, EyeOff, Minus, Plus,
} from 'lucide-react';
import {
  configuracoesService,
  ConfiguracoesPlatforma,
  CONFIG_PADRAO,
} from '../../services/configuracoesService';

// ─── Componentes internos ─────────────────────────────────────────────────────

const Secao: React.FC<{ titulo: string; icone: React.ReactNode; children: React.ReactNode }> = ({
  titulo, icone, children,
}) => (
  <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
        {icone}
      </div>
      <h3 className="text-base font-black text-slate-800">{titulo}</h3>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const Linha: React.FC<{ label: string; descricao?: string; children: React.ReactNode }> = ({
  label, descricao, children,
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1">
      <p className="text-sm font-bold text-slate-700">{label}</p>
      {descricao && <p className="text-xs text-slate-400 mt-0.5">{descricao}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ valor: boolean; onChange: (v: boolean) => void }> = ({ valor, onChange }) => (
  <button
    onClick={() => onChange(!valor)}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
      valor ? 'bg-blue-600' : 'bg-slate-200'
    }`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
      valor ? 'left-7' : 'left-1'
    }`} />
  </button>
);

const SelectCustom: React.FC<{
  valor: string;
  opcoes: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ valor, opcoes, onChange }) => (
  <select
    value={valor}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
  >
    {opcoes.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

export const Configuracoes: React.FC = () => {
  const [config, setConfig]     = useState<ConfiguracoesPlatforma>(() => configuracoesService.carregar());
  const [salvo, setSalvo]       = useState(false);
  const [restaurado, setRestaurado] = useState(false);

  const atualizar = <K extends keyof ConfiguracoesPlatforma>(
    chave: K,
    valor: ConfiguracoesPlatforma[K]
  ) => {
    setConfig((prev) => ({ ...prev, [chave]: valor }));
    setSalvo(false);
  };

  const handleSalvar = () => {
    configuracoesService.salvar(config);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const handleRestaurar = () => {
    const padrao = configuracoesService.restaurar();
    setConfig(padrao);
    setRestaurado(true);
    setTimeout(() => setRestaurado(false), 3000);
  };

  const CORES = [
    { value: '#2563eb', label: 'Azul'    },
    { value: '#7c3aed', label: 'Roxo'   },
    { value: '#059669', label: 'Verde'  },
    { value: '#dc2626', label: 'Vermelho' },
    { value: '#d97706', label: 'Âmbar'  },
    { value: '#0891b2', label: 'Ciano'  },
    { value: '#db2777', label: 'Rosa'   },
    { value: '#374151', label: 'Cinza'  },
  ];

  return (
    <div className="p-10 max-w-4xl mx-auto animate-in fade-in duration-700">

      {/* Header */}
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Configurações</h2>
          <p className="text-slate-500 mt-2 font-medium">Personalize sua experiência na plataforma.</p>
        </div>

        <div className="flex items-center gap-3">
          {(salvo || restaurado) && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-2xl animate-in fade-in duration-300">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-xs font-bold text-green-700">
                {salvo ? 'Salvo!' : 'Padrão restaurado!'}
              </span>
            </div>
          )}
          <button
            onClick={handleRestaurar}
            className="flex items-center gap-2 px-5 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RotateCcw size={16} /> Restaurar padrão
          </button>
          <button
            onClick={handleSalvar}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Save size={16} /> Salvar alterações
          </button>
        </div>
      </header>

      <div className="space-y-6">

        {/* ── Aparência ───────────────────────────────────────────────────── */}
        <Secao titulo="Aparência" icone={<Palette size={20} />}>

          <Linha label="Tema" descricao="Escolha o tema visual da plataforma">
            <div className="flex items-center gap-2">
              {[
                { value: 'claro', label: 'Claro',   icon: <Sun size={14} />  },
                { value: 'escuro', label: 'Escuro',  icon: <Moon size={14} /> },
                { value: 'pb',    label: 'P&B',     icon: <Circle size={14} /> },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => atualizar('tema', t.value as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    config.tema === t.value
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </Linha>

          <Linha label="Cor principal" descricao="Cor dos elementos interativos e destaques">
            <div className="flex items-center gap-2">
              {CORES.map((cor) => (
                <button
                  key={cor.value}
                  onClick={() => atualizar('corPrincipal', cor.value)}
                  title={cor.label}
                  className={`w-7 h-7 rounded-full transition-all ${
                    config.corPrincipal === cor.value
                      ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: cor.value }}
                />
              ))}
            </div>
          </Linha>

          <Linha label="Tamanho da fonte" descricao="Tamanho base do texto da plataforma">
            <div className="flex items-center gap-2">
              {[
                { value: 'pequeno', label: 'Pequeno' },
                { value: 'normal',  label: 'Normal'  },
                { value: 'grande',  label: 'Grande'  },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => atualizar('tamanhoFonte', t.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    config.tamanhoFonte === t.value
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Linha>
        </Secao>

        {/* ── Editor ──────────────────────────────────────────────────────── */}
        <Secao titulo="Editor de Documentos" icone={<Type size={20} />}>

          <Linha label="Fonte padrão" descricao="Fonte usada ao abrir novos documentos">
            <SelectCustom
              valor={config.editorFonte}
              onChange={(v) => atualizar('editorFonte', v)}
              opcoes={[
                { value: 'Times New Roman', label: 'Times New Roman' },
                { value: 'Arial',           label: 'Arial'           },
                { value: 'Calibri',         label: 'Calibri'         },
                { value: 'Georgia',         label: 'Georgia'         },
              ]}
            />
          </Linha>

          <Linha label="Tamanho da fonte" descricao="Tamanho padrão do texto no editor">
            <SelectCustom
              valor={config.editorTamanhoFonte}
              onChange={(v) => atualizar('editorTamanhoFonte', v)}
              opcoes={[
                { value: '10', label: '10pt' },
                { value: '11', label: '11pt' },
                { value: '12', label: '12pt' },
                { value: '14', label: '14pt' },
                { value: '16', label: '16pt' },
              ]}
            />
          </Linha>

          <Linha label="Espaçamento entre linhas" descricao="Espaçamento padrão nos documentos">
            <SelectCustom
              valor={config.editorEspacamento}
              onChange={(v) => atualizar('editorEspacamento', v)}
              opcoes={[
                { value: '1',    label: '1.0'  },
                { value: '1.15', label: '1.15' },
                { value: '1.5',  label: '1.5'  },
                { value: '2',    label: '2.0'  },
              ]}
            />
          </Linha>

          <div className="border-t border-slate-50 pt-4 space-y-4">
            <Linha label="Mostrar margens do documento" descricao="Exibe a área de margem no editor">
              <Toggle
                valor={config.editorMostrarMargens}
                onChange={(v) => atualizar('editorMostrarMargens', v)}
              />
            </Linha>

            <Linha label="Mostrar cabeçalho e rodapé" descricao="Exibe as áreas editáveis de cabeçalho e rodapé">
              <Toggle
                valor={config.editorMostrarCabecalhoRodape}
                onChange={(v) => atualizar('editorMostrarCabecalhoRodape', v)}
              />
            </Linha>
          </div>
        </Secao>

        {/* ── Acessibilidade ───────────────────────────────────────────────── */}
        <Secao titulo="Acessibilidade" icone={<Accessibility size={20} />}>

          <Linha label="Alto contraste" descricao="Aumenta o contraste entre texto e fundo">
            <Toggle
              valor={config.altoContraste}
              onChange={(v) => atualizar('altoContraste', v)}
            />
          </Linha>

          <Linha label="Reduzir animações" descricao="Remove transições e efeitos de movimento">
            <Toggle
              valor={config.reduzirAnimacoes}
              onChange={(v) => atualizar('reduzirAnimacoes', v)}
            />
          </Linha>

          <Linha label="Aumentar textos" descricao="Incrementa o tamanho dos textos do sistema">
            <Toggle
              valor={config.aumentarTextos}
              onChange={(v) => atualizar('aumentarTextos', v)}
            />
          </Linha>

          <Linha label="Destacar foco de navegação" descricao="Exibe contorno visível no elemento focado">
            <Toggle
              valor={config.destacarFoco}
              onChange={(v) => atualizar('destacarFoco', v)}
            />
          </Linha>

          <Linha label="Melhorar legibilidade" descricao="Aumenta espaçamento e contraste de botões e campos">
            <Toggle
              valor={config.melhorarLegibilidade}
              onChange={(v) => atualizar('melhorarLegibilidade', v)}
            />
          </Linha>
        </Secao>

      </div>

      {/* Rodapé fixo em mobile */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={handleRestaurar}
          className="flex items-center gap-2 px-5 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
        >
          <RotateCcw size={16} /> Restaurar padrão
        </button>
        <button
          onClick={handleSalvar}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Save size={16} /> Salvar alterações
        </button>
      </div>
    </div>
  );
};