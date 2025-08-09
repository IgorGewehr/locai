import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { logger } from '@/lib/utils/logger';

// Schema de validação para o resultado
const IntentResultSchema = z.object({
  function: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  parameters: z.record(z.any()),
  reasoning: z.string().optional(),
  needsMoreInfo: z.boolean().optional()
});

export type EnhancedIntentResult = z.infer<typeof IntentResultSchema>;

export interface IntentDetectionInput {
  message: string;
  conversationContext: any;
  tenantId: string;
  clientPhone: string;
}

export class EnhancedIntentDetector {
  private llm: ChatOpenAI;
  private availableFunctions: string[] = [
    // Funções principais de busca e cálculo
    'search_properties',
    'calculate_price', 
    'get_property_details',
    'send_property_media',
    
    // Funções de reserva e cliente
    'create_reservation',
    'cancel_reservation',     // NOVA FUNÇÃO CRÍTICA
    'modify_reservation',     // NOVA FUNÇÃO CRÍTICA
    'register_client',
    
    // Funções de disponibilidade e visita
    'check_availability',     // NOVA FUNÇÃO CRÍTICA
    'schedule_visit',
    'check_visit_availability',
    
    // Funções de políticas e informações
    'get_policies',          // NOVA FUNÇÃO CRÍTICA
    
    // Funções de cotação e transação
    'generate_quote',
    'create_transaction',
    
    // Funções CRM
    'create_lead',
    'update_lead',
    'classify_lead',
    'update_lead_status'
  ];

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1, // Baixo para detecção precisa
      maxTokens: 300,   // Resposta concisa
      timeout: 10000    // 10s timeout
    });
  }

  async detectIntent(input: IntentDetectionInput): Promise<EnhancedIntentResult> {
    const startTime = Date.now();
    
    try {
      logger.info('🎯 [Enhanced Intent] Iniciando detecção', {
        messageLength: input.message.length,
        tenantId: input.tenantId.substring(0, 8) + '***',
        clientPhone: input.clientPhone.substring(0, 6) + '***'
      });

      const prompt = this.buildDetectionPrompt(input);
      const result = await this.llm.invoke(prompt);
      const parsedResult = this.parseAndValidateResult(result.content as string);
      
      const processingTime = Date.now() - startTime;
      
      logger.info('✅ [Enhanced Intent] Detecção concluída', {
        function: parsedResult.function,
        confidence: parsedResult.confidence,
        processingTime: `${processingTime}ms`
      });

      return parsedResult;

    } catch (error) {
      logger.error('❌ [Enhanced Intent] Erro na detecção', {
        error: error instanceof Error ? error.message : 'Unknown',
        processingTime: `${Date.now() - startTime}ms`
      });

      // Fallback seguro
      return {
        function: null,
        confidence: 0.0,
        parameters: {},
        reasoning: 'Erro na detecção enhanced, usar método original'
      };
    }
  }

  private buildDetectionPrompt(input: IntentDetectionInput): string {
    const { message, conversationContext } = input;
    
    const contextSummary = this.summarizeContext(conversationContext);
    
    return `
TAREFA: Detectar qual função específica executar baseado na mensagem do usuário.

IMPORTANTE: 
- Você é um DETECTOR, não um respondedor
- Analise apenas a INTENÇÃO, não gere resposta
- Seja PRECISO na detecção de função
- Use contexto da conversa para melhor precisão

FUNÇÕES DISPONÍVEIS:
1. search_properties - buscar/filtrar propriedades por critérios (cidade, hóspedes, datas)
2. calculate_price - calcular preços, valores, orçamentos para período específico
3. get_property_details - obter detalhes completos de uma propriedade específica
4. send_property_media - enviar fotos, vídeos, imagens da propriedade
5. create_reservation - criar/confirmar uma reserva
6. cancel_reservation - cancelar uma reserva existente
7. modify_reservation - modificar datas, hóspedes ou valores de uma reserva
8. register_client - cadastrar informações do cliente (nome, telefone, email)
9. check_availability - verificar se propriedade está disponível para datas específicas
10. schedule_visit - agendar visita presencial à propriedade
11. check_visit_availability - verificar disponibilidade para visitas
12. get_policies - obter políticas de cancelamento, pagamento e regras
13. generate_quote - gerar orçamento detalhado com valores
14. create_transaction - criar transação financeira para pagamento
15. create_lead - criar novo lead no CRM
16. update_lead - atualizar informações de lead existente
17. classify_lead - classificar lead (quente, morno, frio)
18. update_lead_status - atualizar status do lead no funil

MENSAGEM USUÁRIO: "${message}"

CONTEXTO CONVERSA: ${contextSummary}

EXEMPLOS DE DETECÇÃO:
- "quanto custa pra 4 pessoas?" → calculate_price
- "tem foto?" → send_property_media
- "quero algo em floripa" → search_properties
- "qual endereço?" → get_property_details
- "quero reservar" → create_reservation
- "quero cancelar minha reserva" → cancel_reservation
- "preciso mudar a data" → modify_reservation
- "tá disponível dia 15?" → check_availability
- "quais são as regras?" → get_policies
- "posso visitar amanhã?" → schedule_visit
- "tá disponível pra visita?" → check_visit_availability
- "me manda um orçamento" → generate_quote
- "sou João da Silva" → register_client
- "quero pagar com pix" → create_transaction

CRITÉRIOS DE CONFIANÇA:
- 0.9+: Intenção muito clara
- 0.8-0.9: Intenção clara
- 0.6-0.8: Intenção provável
- <0.6: Intenção incerta

RESPONDA EXATAMENTE NESTE FORMATO JSON:
{
  "function": "nome_da_funcao_ou_null",
  "confidence": 0.85,
  "parameters": {
    "key": "value"
  },
  "reasoning": "explicação breve da detecção",
  "needsMoreInfo": false
}
`;
  }

  private summarizeContext(context: any): string {
    if (!context) return "Conversa inicial";
    
    const summary = [];
    
    if (context.propertiesViewed?.length > 0) {
      summary.push(`Propriedades visualizadas: ${context.propertiesViewed.length}`);
    }
    
    if (context.searchCriteria) {
      const criteria = [];
      if (context.searchCriteria.guests) criteria.push(`${context.searchCriteria.guests} hóspedes`);
      if (context.searchCriteria.location) criteria.push(`local: ${context.searchCriteria.location}`);
      if (context.searchCriteria.checkIn) criteria.push(`check-in: ${context.searchCriteria.checkIn}`);
      if (criteria.length > 0) summary.push(`Critérios: ${criteria.join(', ')}`);
    }
    
    if (context.lastIntent) {
      summary.push(`Última intenção: ${context.lastIntent}`);
    }
    
    return summary.length > 0 ? summary.join(' | ') : "Contexto básico";
  }

  private parseAndValidateResult(content: string): EnhancedIntentResult {
    try {
      // Extrair JSON da resposta (pode vir com texto extra)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Formato JSON não encontrado na resposta');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar com Zod
      const validated = IntentResultSchema.parse(parsed);
      
      // Validar se função existe
      if (validated.function && !this.availableFunctions.includes(validated.function)) {
        logger.warn('⚠️ [Enhanced Intent] Função não reconhecida', {
          function: validated.function,
          available: this.availableFunctions
        });
        
        return {
          function: null,
          confidence: 0.0,
          parameters: {},
          reasoning: `Função '${validated.function}' não disponível`
        };
      }
      
      return validated;
      
    } catch (error) {
      logger.error('❌ [Enhanced Intent] Erro no parsing', {
        content: content.substring(0, 200),
        error: error instanceof Error ? error.message : 'Unknown'
      });
      
      return {
        function: null,
        confidence: 0.0,
        parameters: {},
        reasoning: 'Erro no parsing da resposta'
      };
    }
  }

  // Método para teste
  async testDetection(message: string): Promise<EnhancedIntentResult> {
    return await this.detectIntent({
      message,
      conversationContext: {},
      tenantId: 'test-tenant',
      clientPhone: 'test-phone'
    });
  }
}

// Export singleton
export const enhancedIntentDetector = new EnhancedIntentDetector();