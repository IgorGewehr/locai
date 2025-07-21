// lib/services/ai-service-stub.ts
// STUB para compatibilidade com sistema antigo
// Use ProfessionalAgent para novas implementações

export class AIService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Método stub para compatibilidade
  async processMessage(message: string, context: any): Promise<any> {
    console.warn('AIService is deprecated. Use ProfessionalAgent instead.');
    
    // Redirect to ProfessionalAgent
    try {
      const { ProfessionalAgent } = await import('@/lib/ai-agent/professional-agent');
      const agent = new ProfessionalAgent();
      
      return await agent.processMessage({
        message,
        clientPhone: context.clientPhone || '+0000000000',
        tenantId: this.tenantId
      });
    } catch (error) {
      console.error('Error in AIService stub:', error);
      return {
        reply: 'Desculpe, estou com dificuldades técnicas. Tente novamente.',
        intent: 'error',
        confidence: 0.1,
        tokensUsed: 0,
        fromCache: false
      };
    }
  }

  // Outros métodos stub para compatibilidade
  loadDefaultAgent() {
    return Promise.resolve();
  }

  getAgent() {
    return null;
  }
}