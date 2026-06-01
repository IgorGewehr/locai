// lib/services/ai-service-stub.ts
// STUB de compatibilidade do sistema antigo (Sofia).
//
// MVP WhatsApp-only: o agente legado SofiaAgentV3 foi REMOVIDO na migração para
// o agent LangGraph. O fluxo ativo de WhatsApp usa `dispatchToAgent` (fire-and-
// forget), NÃO este stub. Os canais que ainda dependem deste stub (Facebook DM,
// automações com IA do workflow-engine) estão FORA do escopo do MVP, então
// `processMessage` não roteia para lugar nenhum: retorna uma sentinela DESATIVADA
// sem `content` para que os callers pulem o envio (eles checam `aiResponse.content`).
// Importante: não importamos mais o módulo deletado (evita o erro "Module not
// found: @/lib/ai-agent/sofia-agent-v3" no build e a falha em runtime).

export class AIService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async processMessage(_message: string, _context: any): Promise<any> {
    console.info(
      'ℹ️ AIService.processMessage desativado no MVP WhatsApp-only (Sofia removida). Canal ignorado.'
    );
    return {
      content: null,   // callers (Facebook handler, workflow-engine) pulam o envio quando vazio
      reply: null,
      intent: 'disabled',
      disabled: true,
      confidence: 0,
      tokensUsed: 0,
      fromCache: false,
    };
  }

  // Outros métodos stub para compatibilidade
  loadDefaultAgent() {
    return Promise.resolve();
  }

  getAgent() {
    return null;
  }
}