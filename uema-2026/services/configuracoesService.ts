// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ConfiguracoesPlatforma {
  // Aparência
  tema: 'claro' | 'escuro' | 'pb';
  corPrincipal: string;
  tamanhoFonte: 'pequeno' | 'normal' | 'grande';

  // Editor
  editorFonte: string;
  editorTamanhoFonte: string;
  editorEspacamento: string;
  editorMostrarMargens: boolean;
  editorMostrarCabecalhoRodape: boolean;

  // Acessibilidade
  altoContraste: boolean;
  reduzirAnimacoes: boolean;
  aumentarTextos: boolean;
  destacarFoco: boolean;
  melhorarLegibilidade: boolean;
}

export const CONFIG_PADRAO: ConfiguracoesPlatforma = {
  tema: 'claro',
  corPrincipal: '#2563eb',
  tamanhoFonte: 'normal',
  editorFonte: 'Times New Roman',
  editorTamanhoFonte: '12',
  editorEspacamento: '1.5',
  editorMostrarMargens: true,
  editorMostrarCabecalhoRodape: true,
  altoContraste: false,
  reduzirAnimacoes: false,
  aumentarTextos: false,
  destacarFoco: false,
  melhorarLegibilidade: false,
};

const CHAVE = 'reurb_configuracoes';

export const configuracoesService = {
  carregar(): ConfiguracoesPlatforma {
    const salvo = localStorage.getItem(CHAVE);
    if (!salvo) return { ...CONFIG_PADRAO };
    try {
      return { ...CONFIG_PADRAO, ...JSON.parse(salvo) };
    } catch {
      return { ...CONFIG_PADRAO };
    }
  },

  salvar(config: ConfiguracoesPlatforma): void {
    localStorage.setItem(CHAVE, JSON.stringify(config));
    this.aplicar(config);
  },

  restaurar(): ConfiguracoesPlatforma {
    localStorage.removeItem(CHAVE);
    this.aplicar(CONFIG_PADRAO);
    return { ...CONFIG_PADRAO };
  },

  aplicar(config: ConfiguracoesPlatforma): void {
    const root = document.documentElement;

    // ── Tema ──────────────────────────────────────────────────────────────────
    root.classList.remove('tema-escuro', 'tema-pb');
    if (config.tema === 'escuro') root.classList.add('tema-escuro');
    if (config.tema === 'pb')     root.classList.add('tema-pb');

    // ── Cor principal ─────────────────────────────────────────────────────────
    root.style.setProperty('--cor-principal', config.corPrincipal);

    // ── Tamanho da fonte global ───────────────────────────────────────────────
    const tamanhos = { pequeno: '13px', normal: '15px', grande: '17px' };
    root.style.setProperty('--fonte-global', tamanhos[config.tamanhoFonte]);

    // ── Acessibilidade ────────────────────────────────────────────────────────
    root.classList.toggle('alto-contraste',    config.altoContraste);
    root.classList.toggle('reduzir-animacoes', config.reduzirAnimacoes);
    root.classList.toggle('aumentar-textos',   config.aumentarTextos);
    root.classList.toggle('destacar-foco',     config.destacarFoco);
    root.classList.toggle('melhorar-legibilidade', config.melhorarLegibilidade);
  },
};