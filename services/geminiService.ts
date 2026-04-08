
export const geminiService = {
  async checkUserQuota() {
    return { allowed: false, error: 'IA temporariamente desativada.' };
  },

  async analyzeDocument(_content: string): Promise<string> {
    return 'ERRO_DESATIVADO: A funcionalidade de IA está temporariamente desativada.';
  },

  async applySmartEdit(_currentContent: string, _instruction: string): Promise<string> {
    throw new Error('ERRO_DESATIVADO: A funcionalidade de IA está temporariamente desativada.');
  },

  handleAiError(_error: any): string {
    return 'ERRO_DESATIVADO: IA desativada.';
  },
};