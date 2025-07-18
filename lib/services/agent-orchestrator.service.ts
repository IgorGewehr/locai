import { OpenAIService } from './openai.service';
import { ToolsService } from './tools.service';
import { FirestoreService } from './firestore.service';
import { sendWhatsAppMessage } from '@/lib/whatsapp/message-sender';
import { AIInput, AIResponse, ConversationContext, ToolOutput } from '@/lib/types/ai-agent';
import { createFallbackResponse } from '@/lib/utils/ai-validation';

export class AgentOrchestratorService {
  private openaiService: OpenAIService;
  private toolsService: ToolsService;
  private firestoreService: FirestoreService;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.openaiService = new OpenAIService();
    this.toolsService = new ToolsService(tenantId);
    this.firestoreService = new FirestoreService(tenantId);
  }

  async processMessage(
    userMessage: string, 
    clientPhone: string
  ): Promise<{ success: boolean; response: string; metrics?: any }> {
    const startTime = Date.now();
    let currentTurn = 0;
    const maxTurns = 5; // Proteção contra loops infinitos
    
    try {
      // 1. Buscar contexto existente
      const conversationContext = await this.firestoreService.getContext(clientPhone);
      const conversationHistory = await this.firestoreService.getConversationHistory(clientPhone);
      
      // 2. Preparar input inicial
      let currentInput: AIInput = {
        userMessage,
        conversationContext,
        conversationHistory: conversationHistory.slice(-3), // Últimas 3 mensagens
        clientPhone,
        tenantId: this.tenantId,
        turnNumber: 1
      };

      let aiResponse: AIResponse;
      let previousToolResult: ToolOutput | undefined;

      // 3. Loop ReAct - Reasoning and Acting
      for (currentTurn = 1; currentTurn <= maxTurns; currentTurn++) {
        console.log(`🔄 Agent turn ${currentTurn}/${maxTurns}`);
        
        // Adicionar resultado da ferramenta anterior ao input
        if (previousToolResult) {
          currentInput.previousToolResult = previousToolResult;
        }
        
        // Obter resposta da AI
        aiResponse = await this.openaiService.runAITurn(currentInput);
        
        console.log(`🤖 AI Response (turn ${currentTurn}):`, {
          thought: aiResponse.thought,
          action: aiResponse.action.type,
          confidence: aiResponse.confidence
        });
        
        // Salvar contexto atualizado
        if (aiResponse.updatedContext) {
          await this.firestoreService.updateContext(clientPhone, aiResponse.updatedContext);
        }
        
        // Log da ação do agente
        await this.firestoreService.logAgentAction(clientPhone, 'ai_response', {
          turn: currentTurn,
          thought: aiResponse.thought,
          action: aiResponse.action,
          confidence: aiResponse.confidence
        });
        
        // 4. Verificar tipo de ação
        if (aiResponse.action.type === 'reply') {
          // A IA decidiu responder diretamente - finalizar loop
          const finalMessage = aiResponse.action.payload.message || '';
          
          // Enviar resposta via WhatsApp
          await sendWhatsAppMessage(clientPhone, finalMessage);
          
          // Salvar histórico da conversa
          await this.firestoreService.saveConversationHistory(
            clientPhone,
            userMessage,
            finalMessage
          );
          
          const metrics = {
            turns: currentTurn,
            processingTime: Date.now() - startTime,
            confidence: aiResponse.confidence,
            finalAction: 'reply'
          };
          
          return { success: true, response: finalMessage, metrics };
        }
        
        if (aiResponse.action.type === 'call_tool') {
          // A IA decidiu usar uma ferramenta
          const { toolName, parameters } = aiResponse.action.payload;
          
          console.log(`🔧 Executing tool: ${toolName} with params:`, parameters);
          
          // Executar ferramenta
          const toolResult = await this.toolsService.executeTool(toolName, parameters);
          
          console.log(`🔧 Tool result:`, toolResult);
          
          // Log da execução da ferramenta
          await this.firestoreService.logAgentAction(clientPhone, 'tool_execution', {
            turn: currentTurn,
            toolName,
            parameters,
            result: toolResult,
            executionTime: toolResult.executionTime
          });
          
          // Preparar próximo turno com resultado da ferramenta
          previousToolResult = toolResult;
          currentInput = {
            ...currentInput,
            previousToolResult: toolResult,
            turnNumber: currentTurn + 1
          };
          
          // Continuar o loop para próximo turno
          continue;
        }
        
        // Se chegou aqui, algo deu errado
        console.error('❌ Invalid action type:', aiResponse.action.type);
        break;
      }
      
      // Se o loop terminou sem reply, algo deu errado
      console.error('❌ Agent loop ended without reply');
      
      const fallbackResponse = createFallbackResponse(userMessage);
      await sendWhatsAppMessage(clientPhone, fallbackResponse.action.payload.message || '');
      
      return { 
        success: false, 
        response: fallbackResponse.action.payload.message || '',
        metrics: {
          turns: currentTurn,
          processingTime: Date.now() - startTime,
          confidence: 0.3,
          finalAction: 'fallback'
        }
      };
      
    } catch (error) {
      console.error('❌ Error in agent orchestrator:', error);
      
      // Resposta de erro amigável
      const errorMessage = "Desculpe, estou com dificuldades técnicas. Pode tentar novamente?";
      await sendWhatsAppMessage(clientPhone, errorMessage);
      
      return { 
        success: false, 
        response: errorMessage,
        metrics: {
          turns: currentTurn,
          processingTime: Date.now() - startTime,
          confidence: 0.2,
          finalAction: 'error'
        }
      };
    }
  }

  async getAgentStats(): Promise<any> {
    // Implementar estatísticas do agente
    return {
      totalRequests: 0,
      successRate: 0,
      averageTurns: 0,
      toolUsage: {},
      responseTime: 0
    };
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const openaiHealthy = await this.openaiService.healthCheck();
    
    return {
      status: openaiHealthy ? 'healthy' : 'unhealthy',
      services: {
        openai: openaiHealthy,
        tools: true, // Tools service é sempre healthy
        firestore: true // Firestore service é sempre healthy
      }
    };
  }
}