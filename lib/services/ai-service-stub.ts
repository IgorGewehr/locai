// lib/services/ai-service-stub.ts
// STUB para compatibilidade com sistema antigo
// Use ProfessionalAgent para novas implementações

export class AIService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Método stub para compatibilidade - MIGRATED TO SOFIA V4
  async processMessage(message: string, context: any): Promise<any> {
    console.info('🚀 AIService redirecting to SofiaAgentV4 (Step 2 Complete)');
    
    // Redirect to Sofia Agent V4 with Step 2 optimizations
    try {
      const { sofiaAgentV4 } = await import('@/lib/ai-agent/sofia-agent-v4');
      
      const result = await sofiaAgentV4.processMessage({
        message,
        clientPhone: context.clientPhone || '+0000000000',
        tenantId: this.tenantId,
        metadata: {
          source: 'whatsapp',
          priority: 'normal'
        }
      });
      
      // Convert Sofia V4 response to legacy format for compatibility
      return {
        reply: result.reply,
        intent: result.metadata.stage,
        confidence: result.metadata.leadScore / 100,
        tokensUsed: result.tokensUsed,
        fromCache: result.cacheHitRate === 100,
        actions: result.actions,
        responseTime: result.responseTime,
        performanceScore: result.performanceScore,
        functionsExecuted: result.functionsExecuted
      };
    } catch (error) {
      console.error('❌ Error in SofiaV4 via AIService stub:', error);
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