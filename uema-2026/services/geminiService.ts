// Funcionalidade de IA não disponível nesta versão.

export const geminiService = {
  async checkUserQuota() {
    return { allowed: false, error: 'Funcionalidade não disponível.' };
  },

  async analyzeDocument(_content: string): Promise<string> {
    return '';
  },

  async applySmartEdit(_currentContent: string, _instruction: string): Promise<string> {
    throw new Error('Funcionalidade não disponível.');
  },

  handleAiError(_error: unknown): string {
    return '';
  },
};