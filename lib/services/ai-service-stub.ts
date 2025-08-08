// lib/services/ai-service-stub.ts
// STUB para compatibilidade com sistema antigo
// Redireciona para Sofia Agent (Produção)

export class AIService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Método stub para compatibilidade - Redireciona para Sofia Agent
  async processMessage(message: string, context: any): Promise<any> {
    console.info('🚀 AIService redirecting to Sofia Agent (Production)');
    
    // Redirect to Sofia Agent production version
    try {
      const { sofiaAgent } = await import('@/lib/ai-agent/sofia-agent');
      
      const result = await sofiaAgent.processMessage({
        message,
        clientPhone: context.clientPhone || '+0000000000',
        tenantId: this.tenantId,
        metadata: {
          source: 'whatsapp',
          priority: 'normal'
        }
      });
      
      // Convert Sofia MVP response to legacy format for compatibility
      return {
        reply: result.reply,
        intent: result.metadata.stage,
        confidence: 0.8, // Fixed confidence for MVP
        tokensUsed: result.tokensUsed,
        fromCache: false, // No cache in MVP
        actions: result.actions,
        responseTime: result.responseTime,
        performanceScore: 85, // Fixed score for MVP
        functionsExecuted: result.functionsExecuted
      };
    } catch (error) {
      console.error('❌ Error in Sofia MVP via AIService stub:', error);
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