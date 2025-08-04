// lib/services/ai-service-stub.ts
// STUB para compatibilidade com sistema antigo
// Use ProfessionalAgent para novas implementações

export class AIService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Método stub para compatibilidade - MIGRATED TO SOFIA MVP
  async processMessage(message: string, context: any): Promise<any> {
    
    // Redirect to Sofia Agent MVP production version
    try {
      const { SofiaAgentV3 } = await import('@/lib/ai-agent/sofia-agent-v3');
      
      const sofia = SofiaAgentV3.getInstance();
      const result = await sofia.processMessage({
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