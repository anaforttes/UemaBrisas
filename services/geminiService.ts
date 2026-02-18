
import { GoogleGenAI } from "@google/genai";
import { dbService } from "./databaseService";

// No Vite, usamos import.meta.env ou garantimos que process.env esteja mapeado
const getAiClient = () => {
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_APP_API_KEY;
  return new GoogleGenAI({ apiKey });
};

export const geminiService = {
  async checkUserQuota() {
    const user = JSON.parse(localStorage.getItem('reurb_current_user') || '{}');
    if (!user.id) return { allowed: false, error: "Usuário não autenticado." };
    
    const usage = user.quota?.used || 0;
    const limit = user.quota?.limit || 0;

    if (usage >= limit) {
      return { allowed: false, error: "Você atingiu seu limite individual de tokens para este período." };
    }
    return { allowed: true, userId: user.id };
  },

  async analyzeDocument(content: string) {
    const quotaCheck = await this.checkUserQuota();
    if (!quotaCheck.allowed) return `ERRO_QUOTA:${quotaCheck.error}`;

    const ai = getAiClient();
    const prompt = `Você é um consultor jurídico especialista em REURB (Lei 13.465/2017). Analise o seguinte conteúdo de documento e sugira melhorias técnicas ou correções legais: ${content}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.2 },
      });

      dbService.users.updateQuota(quotaCheck.userId!, 500);
      return response.text;
    } catch (error: any) {
      return this.handleAiError(error);
    }
  },

  async applySmartEdit(currentContent: string, instruction: string) {
    const quotaCheck = await this.checkUserQuota();
    if (!quotaCheck.allowed) throw new Error(`ERRO_QUOTA:${quotaCheck.error}`);

    const ai = getAiClient();
    const prompt = `Atue como um editor de documentos de REURB. Altere o HTML fornecido seguindo esta instrução: "${instruction}". Retorne APENAS o código HTML resultante, sem explicações. Conteúdo atual: ${currentContent}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.1 },
      });

      dbService.users.updateQuota(quotaCheck.userId!, 300);

      let cleanedHtml = response.text || "";
      cleanedHtml = cleanedHtml.replace(/```html/g, "").replace(/```/g, "").trim();
      return cleanedHtml;
    } catch (error: any) {
      throw new Error(this.handleAiError(error));
    }
  },

  handleAiError(error: any): string {
    console.error("[Gemini Service Error]:", error);
    if (error.message?.includes("429")) return "ERRO_SISTEMA: O servidor está sobrecarregado. Tente em 1 minuto.";
    return "Erro inesperado na comunicação com a IA. Verifique sua chave de API.";
  }
};
