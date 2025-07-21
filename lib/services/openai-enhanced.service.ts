import { OpenAI } from 'openai';
import { AIInput, AIResponse, ConversationContext } from '@/lib/types/ai-agent';
import { MASTER_PROMPT } from '@/lib/prompts/master-prompt-react';
import { validateAIResponse } from '@/lib/utils/ai-validation';
import { withTimeout } from '@/lib/utils/async';

export class EnhancedOpenAIService {
  private openai: OpenAI;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async runAITurn(input: AIInput): Promise<AIResponse> {
    const startTime = Date.now();
    const turnId = `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🤖 [${turnId}] Starting AI turn ${input.turnNumber || 1}`);
    
    try {
      // 1. Construir prompt enriquecido
      const enrichedPrompt = this.buildEnrichedPrompt(input);
      
      // 2. Selecionar modelo ideal  
      const model = this.selectOptimalModel(input);
      
      // 3. Log do input completo
      console.log(`🧠 [${turnId}] Input:`, {
        userMessage: input.userMessage,
        hasContext: !!input.conversationContext,
        hasPreviousResult: !!input.previousToolResult,
        historyLength: input.conversationHistory?.length || 0,
        model: model
      });
      
      // 4. Chamar OpenAI com retry
      const response = await this.callOpenAIWithRetry(model, enrichedPrompt, turnId);
      
      // 5. Processar resposta
      const aiResponse = await this.processAIResponse(response, input, turnId);
      
      // 6. Log da resposta
      const processingTime = Date.now() - startTime;
      console.log(`✅ [${turnId}] Success in ${processingTime}ms:`, {
        thought: aiResponse.thought.substring(0, 100) + '...',
        actionType: aiResponse.action.type,
        confidence: aiResponse.confidence,
        toolName: aiResponse.action.payload.toolName || 'N/A'
      });
      
      return aiResponse;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [${turnId}] Error after ${processingTime}ms:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: input.userMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback inteligente baseado no input
      return this.createIntelligentFallback(input, error);
    }
  }

  private buildEnrichedPrompt(input: AIInput): string {
    const sections = [];
    
    // Mensagem principal
    sections.push(`MENSAGEM_USUARIO: "${input.userMessage}"`);
    
    // Intenção original detectada
    if (input.originalIntent) {
      sections.push(`INTENCAO_ORIGINAL: ${input.originalIntent}`);
    }
    
    // Contexto da conversa
    if (input.conversationContext) {
      const ctx = input.conversationContext;
      
      if (ctx.searchFilters && Object.keys(ctx.searchFilters).length > 0) {
        sections.push(`FILTROS_ATUAIS: ${JSON.stringify(ctx.searchFilters)}`);
      }
      
      if (ctx.interestedProperties && ctx.interestedProperties.length > 0) {
        sections.push(`PROPRIEDADES_VISTAS: [${ctx.interestedProperties.slice(-5).join(', ')}]`);
      }
      
      if (ctx.pendingReservation) {
        sections.push(`RESERVA_PENDENTE: ${JSON.stringify(ctx.pendingReservation)}`);
      }
      
      if (ctx.clientProfile) {
        const profile = {
          nome: ctx.clientProfile.name || 'N/A',
          telefone: ctx.clientProfile.phone || 'N/A',
          preferencias: ctx.clientProfile.preferences || {},
          score: ctx.clientProfile.leadScore || 0
        };
        sections.push(`PERFIL_CLIENTE: ${JSON.stringify(profile)}`);
      }
    }
    
    // Histórico da conversa
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      const history = input.conversationHistory
        .slice(-3) // Últimas 3 interações
        .map(msg => {
          const content = msg.content || '';
          return `${msg.role}: ${content.substring(0, 100)}`;
        })
        .join(' | ');
      sections.push(`HISTORICO_RECENTE: ${history}`);
    }
    
    // Resultado da ferramenta anterior
    if (input.previousToolResult) {
      const result = {
        ferramenta: input.previousToolResult.toolName,
        sucesso: input.previousToolResult.success,
        dados: input.previousToolResult.data ? 
          (typeof input.previousToolResult.data === 'string' ? 
            input.previousToolResult.data.substring(0, 200) : 
            JSON.stringify(input.previousToolResult.data).substring(0, 200)) : 'N/A',
        erro: input.previousToolResult.error || 'N/A'
      };
      sections.push(`RESULTADO_FERRAMENTA_ANTERIOR: ${JSON.stringify(result)}`);
      
      // Adicionar contexto sobre ferramentas já usadas
      if (input.originalIntent) {
        sections.push(`FERRAMENTAS_JA_USADAS: ${input.previousToolResult.toolName}`);
      }
    }
    
    // Contexto do turno
    sections.push(`TURNO_NUMERO: ${input.turnNumber || 1}`);
    sections.push(`TENANT_ID: ${input.tenantId}`);
    
    return sections.join('\n\n');
  }

  private selectOptimalModel(input: AIInput): string {
    // QUICK WIN: Sempre usar GPT-3.5 para economia máxima
    // Remover lógica complexa e forçar modelo mais barato
    
    const userMessage = input.userMessage?.toLowerCase() || '';
    
    // GPT-4 APENAS para criação de reservas (caso crítico)
    if (userMessage.includes('confirmo') && userMessage.includes('reserva')) {
      console.log('🧠 Using GPT-4 only for reservation confirmation');
      return 'gpt-4o-mini';
    }
    
    // SEMPRE GPT-3.5 para todo o resto
    console.log('💰 Using GPT-3.5 for cost optimization');
    return 'gpt-3.5-turbo-0125';
  }

  private async callOpenAIWithRetry(
    model: string,
    prompt: string,
    turnId: string
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [${turnId}] Attempt ${attempt}/${this.maxRetries} with model ${model}`);
        
        // Configurar parâmetros da chamada
        const requestParams: any = {
          model: model,
          messages: [
            { role: "system", content: MASTER_PROMPT },
            { role: "user", content: prompt }
          ],
          temperature: 0.7, // Aumentado para respostas mais naturais e criativas
          max_tokens: model === 'gpt-3.5-turbo' ? 800 : 1200,
          top_p: 0.8,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        };
        
        // Apenas adicionar response_format se o modelo suportar
        // GPT-4-turbo e GPT-3.5-turbo suportam, mas GPT-4 básico não
        if (model.includes('turbo') || model === 'gpt-4-1106-preview' || model === 'gpt-4-0125-preview') {
          requestParams.response_format = { type: "json_object" };
        }
        
        const response = await withTimeout(
          this.openai.chat.completions.create(requestParams),
          15000, // 15s timeout (reduzido de 45s)
          `OpenAI API call attempt ${attempt}`
        );
        
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ [${turnId}] Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ [${turnId}] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async processAIResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
    input: AIInput,
    turnId: string
  ): Promise<AIResponse> {
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    console.log(`📝 [${turnId}] Raw response:`, content.substring(0, 200) + '...');
    
    let parsedResponse: any;
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      
      parsedResponse = JSON.parse(jsonContent);
    } catch (error) {
      console.error(`❌ [${turnId}] JSON parse error:`, error);
      
      // Fallback: tentar criar resposta estruturada baseada no conteúdo
      const fallbackResponse = this.createStructuredFallback(content, input);
      if (fallbackResponse) {
        console.log(`🔄 [${turnId}] Using structured fallback response`);
        return fallbackResponse;
      }
      
      throw new Error(`Invalid JSON response: ${content.substring(0, 100)}`);
    }
    
    // Validar e sanitizar resposta
    const validatedResponse = validateAIResponse(parsedResponse);
    
    // Garantir que updatedContext e clientProfile existam
    if (!validatedResponse.updatedContext) {
      validatedResponse.updatedContext = {
        searchFilters: {},
        interestedProperties: [],
        pendingReservation: undefined,
        clientProfile: {
          phone: input.clientPhone,
          preferences: {},
          lastInteraction: new Date()
        },
        currentPropertyId: null,
        conversationStage: 'greeting'
      };
    } else {
      // Garantir que clientProfile exista
      if (!validatedResponse.updatedContext.clientProfile) {
        validatedResponse.updatedContext.clientProfile = {
          phone: input.clientPhone,
          preferences: {},
          lastInteraction: new Date()
        };
      } else if (!validatedResponse.updatedContext.clientProfile.phone) {
        // Apenas adicionar o phone se clientProfile existir mas phone não
        validatedResponse.updatedContext.clientProfile.phone = input.clientPhone;
      }
    }
    
    return validatedResponse;
  }

  private createStructuredFallback(content: string, input: AIInput): AIResponse | null {
    try {
      // Tentar criar uma resposta estruturada baseada no conteúdo
      const lowerContent = content.toLowerCase();
      
      // Detectar se é uma resposta direta
      const isDirectResponse = !lowerContent.includes('buscar') && 
                              !lowerContent.includes('calcular') && 
                              !lowerContent.includes('verificar') &&
                              !lowerContent.includes('criar') &&
                              !lowerContent.includes('enviar');
      
      if (isDirectResponse) {
        return {
          thought: "Resposta direta ao cliente baseada na análise do conteúdo.",
          action: {
            type: 'reply',
            payload: {
              message: content.substring(0, 500) // Limitar tamanho
            }
          },
          confidence: 0.6,
          updatedContext: input.conversationContext || {
            searchFilters: {},
            interestedProperties: [],
            pendingReservation: undefined,
            clientProfile: {
              phone: input.clientPhone,
              preferences: {},
              lastInteraction: new Date()
            }
          }
        };
      }
      
      // Se não conseguir estruturar, retornar null
      return null;
    } catch (error) {
      console.error('Error creating structured fallback:', error);
      return null;
    }
  }

  private createIntelligentFallback(input: AIInput, error: any): AIResponse {
    const { userMessage, conversationContext } = input;
    
    // Fallback específico baseado no tipo de erro e contexto
    let fallbackMessage = "Desculpe, tive um problema técnico. ";
    
    if (error?.message?.includes('timeout')) {
      fallbackMessage += "O sistema está um pouco lento. Pode repetir sua solicitação?";
    } else if (error?.message?.includes('JSON')) {
      fallbackMessage += "Houve um erro na minha compreensão. Pode reformular sua pergunta?";
    } else if (userMessage.toLowerCase().includes('reservar')) {
      fallbackMessage += "Vou anotar seu interesse em fazer uma reserva. Pode me passar as datas e quantas pessoas?";
    } else if (userMessage.toLowerCase().includes('preço')) {
      fallbackMessage += "Vou calcular os valores para você. Pode me confirmar a propriedade e as datas?";
    } else {
      fallbackMessage += "Pode me explicar novamente o que você precisa?";
    }
    
    return {
      thought: `Erro técnico ocorreu: ${error?.message || 'Unknown'}. Gerando resposta de fallback apropriada.`,
      action: {
        type: 'reply',
        payload: {
          message: fallbackMessage
        }
      },
      confidence: 0.2,
      updatedContext: conversationContext || {
        searchFilters: {},
        interestedProperties: [],
        pendingReservation: undefined,
        clientProfile: {
          phone: input.clientPhone,
          preferences: {},
          lastInteraction: new Date()
        }
      }
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.openai.models.list();
      return response.data.length > 0;
    } catch (error) {
      console.error('❌ OpenAI health check failed:', error);
      return false;
    }
  }

  // Método para testar o agente com cenários específicos
  async testScenario(scenario: {
    userMessage: string;
    context?: ConversationContext;
    expectedAction?: string;
  }): Promise<{
    success: boolean;
    response: AIResponse;
    matchesExpected: boolean;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    const testInput: AIInput = {
      userMessage: scenario.userMessage,
      conversationContext: scenario.context || {
        searchFilters: {},
        interestedProperties: [],
        pendingReservation: undefined,
        clientProfile: {
          phone: '+5511999999999',
          preferences: {},
          lastInteraction: new Date()
        }
      },
      clientPhone: '+5511999999999',
      tenantId: 'test-tenant',
      turnNumber: 1
    };
    
    try {
      const response = await this.runAITurn(testInput);
      const processingTime = Date.now() - startTime;
      
      const matchesExpected = scenario.expectedAction ? 
        response.action.type === scenario.expectedAction : true;
      
      return {
        success: true,
        response,
        matchesExpected,
        processingTime
      };
    } catch (error) {
      return {
        success: false,
        response: this.createIntelligentFallback(testInput, error),
        matchesExpected: false,
        processingTime: Date.now() - startTime
      };
    }
  }
}