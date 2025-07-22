import { OpenAI } from 'openai';
import { AIInput, AIResponse } from '@/lib/types/ai-agent';
import { MASTER_PROMPT } from '@/lib/prompts/master-prompt';
import { validateAIResponse } from '@/lib/utils/ai-validation';
import { withTimeout } from '@/lib/utils/async';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async runAITurn(input: AIInput): Promise<AIResponse> {
    try {
      const modelToUse = this.selectOptimalModel(input);
      const optimizedPrompt = this.buildOptimizedPrompt(input);
      
      console.log(`🤖 Using model: ${modelToUse} for turn ${input.turnNumber || 1}`);
      
      const response = await withTimeout(
        this.openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: MASTER_PROMPT },
            { role: "user", content: optimizedPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // Baixo para previsibilidade
          max_tokens: 500, // SEMPRE 500 já que é sempre gpt-4o-mini
        }),
        30000, // 30s timeout
        'OpenAI API call'
      );

      const aiResponseJSON = response.choices[0].message.content;
      if (!aiResponseJSON) {
        throw new Error('Empty response from OpenAI');
      }

      const parsedResponse = JSON.parse(aiResponseJSON);
      const validatedResponse = validateAIResponse(parsedResponse);
      
      return validatedResponse;
    } catch (error) {
      console.error('❌ Error in runAITurn:', error);
      
      // Fallback response for errors
      return {
        thought: "Erro interno. Preciso responder ao cliente de forma amigável.",
        action: {
          type: 'reply',
          payload: {
            message: "Desculpe, estou com uma dificuldade técnica. Pode repetir sua solicitação?"
          }
        },
        confidence: 0.3,
        updatedContext: input.conversationContext
      };
    }
  }

  private selectOptimalModel(input: AIInput): string {
    // Regras para seleção de modelo (economia de tokens)
    const { userMessage, conversationContext } = input;
    
    // Usar GPT-4 apenas para casos complexos
    const complexKeywords = [
      'reservar', 'reserva', 'orçamento', 'preço', 'valor', 'calcular',
      'disponibilidade', 'negociar', 'desconto', 'comparar'
    ];
    
    const hasComplexIntent = complexKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );
    
    const hasRichContext = (
      conversationContext.searchFilters && 
      Object.keys(conversationContext.searchFilters).length > 0
    ) || conversationContext.interestedProperties.length > 0;
    
    // SEMPRE usar GPT-4o Mini - mais barato e inteligente
    return 'gpt-4o-mini';
  }

  private buildOptimizedPrompt(input: AIInput): string {
    const { userMessage, conversationContext, previousToolResult } = input;
    
    // Prompt super compacto para economizar tokens
    const promptParts = [
      `MENSAGEM: "${userMessage}"`,
      
      // Contexto minimal
      conversationContext.searchFilters ? 
        `FILTROS: ${JSON.stringify(conversationContext.searchFilters)}` : '',
      
      conversationContext.interestedProperties.length > 0 ? 
        `VISTOS: ${conversationContext.interestedProperties.slice(-3).join(', ')}` : '',
      
      conversationContext.pendingReservation ? 
        `RESERVA_PENDENTE: ${JSON.stringify(conversationContext.pendingReservation)}` : '',
      
      // Resultado de ferramenta anterior
      previousToolResult ? 
        `RESULTADO_ANTERIOR: ${JSON.stringify(previousToolResult)}` : '',
        
      // Histórico compacto (apenas essencial)
      input.conversationHistory && input.conversationHistory.length > 0 ?
        `HISTORICO: ${input.conversationHistory.slice(-2).map(h => `${h.role}: ${h.content.substring(0, 50)}`).join(' | ')}` : ''
    ].filter(Boolean);
    
    return promptParts.join('\n');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('❌ OpenAI health check failed:', error);
      return false;
    }
  }
}