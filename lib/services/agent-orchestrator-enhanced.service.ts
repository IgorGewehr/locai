import { EnhancedOpenAIService } from './openai-enhanced.service';
import { ToolsService } from './tools.service';
import { FirestoreService } from './firestore.service';
import { sendWhatsAppMessage } from '@/lib/whatsapp/message-sender';
import { AIInput, AIResponse, ConversationContext, ToolOutput } from '@/lib/types/ai-agent';
import { createFallbackResponse } from '@/lib/utils/ai-validation';

export interface AgentExecutionResult {
  success: boolean;
  response: string;
  metrics: {
    totalTurns: number;
    processingTime: number;
    confidence: number;
    finalAction: string;
    toolsUsed: string[];
    errorCount: number;
  };
  logs: AgentExecutionLog[];
}

export interface AgentExecutionLog {
  timestamp: Date;
  turn: number;
  type: 'input' | 'ai_response' | 'tool_execution' | 'error' | 'final_response';
  data: any;
  processingTime?: number;
}

export class EnhancedAgentOrchestratorService {
  private openaiService: EnhancedOpenAIService;
  private toolsService: ToolsService;
  private firestoreService: FirestoreService;
  private tenantId: string;
  private readonly maxTurns = 8; // Aumentado para casos mais complexos
  private readonly maxProcessingTime = 120000; // 2 minutos máximo

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.openaiService = new EnhancedOpenAIService();
    this.toolsService = new ToolsService(tenantId);
    this.firestoreService = new FirestoreService(tenantId);
  }

  async processMessage(
    userMessage: string,
    clientPhone: string
  ): Promise<AgentExecutionResult> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const logs: AgentExecutionLog[] = [];
    
    let currentTurn = 0;
    let toolsUsed: string[] = [];
    let errorCount = 0;
    
    console.log(`🚀 [${sessionId}] Starting agent session for: "${userMessage}"`);
    
    try {
      // 1. Buscar contexto existente
      const conversationContext = await this.firestoreService.getContext(clientPhone);
      const conversationHistory = await this.firestoreService.getConversationHistory(clientPhone);
      
      // 2. Log do input inicial
      logs.push({
        timestamp: new Date(),
        turn: 0,
        type: 'input',
        data: {
          userMessage,
          clientPhone,
          existingContext: conversationContext,
          historyLength: conversationHistory.length
        }
      });
      
      // 3. Preparar input inicial
      let currentInput: AIInput = {
        userMessage,
        conversationContext,
        conversationHistory: conversationHistory.slice(-5), // Últimas 5 mensagens
        clientPhone,
        tenantId: this.tenantId,
        turnNumber: 1
      };

      let aiResponse: AIResponse;
      let previousToolResult: ToolOutput | undefined;

      // 4. Loop ReAct - Reasoning and Acting
      for (currentTurn = 1; currentTurn <= this.maxTurns; currentTurn++) {
        const turnStartTime = Date.now();
        
        // Verificar timeout geral
        if (Date.now() - startTime > this.maxProcessingTime) {
          console.warn(`⏰ [${sessionId}] Session timeout at turn ${currentTurn}`);
          break;
        }
        
        console.log(`🔄 [${sessionId}] Turn ${currentTurn}/${this.maxTurns}`);
        
        // Adicionar resultado da ferramenta anterior ao input
        if (previousToolResult) {
          currentInput.previousToolResult = previousToolResult;
        }
        
        // Obter resposta da AI
        try {
          aiResponse = await this.openaiService.runAITurn(currentInput);
        } catch (error) {
          errorCount++;
          console.error(`❌ [${sessionId}] AI turn ${currentTurn} failed:`, error);
          
          logs.push({
            timestamp: new Date(),
            turn: currentTurn,
            type: 'error',
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
              phase: 'ai_turn'
            },
            processingTime: Date.now() - turnStartTime
          });
          
          // Tentar recuperar com fallback
          aiResponse = createFallbackResponse(userMessage);
        }
        
        // Log da resposta da AI
        logs.push({
          timestamp: new Date(),
          turn: currentTurn,
          type: 'ai_response',
          data: {
            thought: aiResponse.thought,
            actionType: aiResponse.action.type,
            confidence: aiResponse.confidence,
            toolName: aiResponse.action.payload.toolName || null
          },
          processingTime: Date.now() - turnStartTime
        });
        
        console.log(`🧠 [${sessionId}] AI Response (turn ${currentTurn}):`, {
          thought: aiResponse.thought.substring(0, 100) + '...',
          action: aiResponse.action.type,
          confidence: aiResponse.confidence,
          toolName: aiResponse.action.payload.toolName || 'N/A'
        });
        
        // Salvar contexto atualizado
        try {
          if (aiResponse.updatedContext) {
            await this.firestoreService.updateContext(clientPhone, aiResponse.updatedContext);
          }
        } catch (error) {
          console.error(`❌ [${sessionId}] Failed to save context:`, error);
          // Não falhar por causa de contexto
        }
        
        // 5. Verificar tipo de ação
        if (aiResponse.action.type === 'reply') {
          // A IA decidiu responder diretamente - finalizar loop
          const finalMessage = aiResponse.action.payload.message || 
            'Desculpe, não consegui processar sua solicitação adequadamente.';
          
          // Enviar resposta via WhatsApp
          try {
            await sendWhatsAppMessage(clientPhone, finalMessage);
          } catch (error) {
            console.error(`❌ [${sessionId}] Failed to send WhatsApp message:`, error);
            errorCount++;
          }
          
          // Salvar histórico da conversa
          try {
            await this.firestoreService.saveConversationHistory(
              clientPhone,
              userMessage,
              finalMessage
            );
          } catch (error) {
            console.error(`❌ [${sessionId}] Failed to save conversation history:`, error);
          }
          
          logs.push({
            timestamp: new Date(),
            turn: currentTurn,
            type: 'final_response',
            data: {
              message: finalMessage,
              success: true
            },
            processingTime: Date.now() - turnStartTime
          });
          
          const totalTime = Date.now() - startTime;
          console.log(`✅ [${sessionId}] Session completed successfully in ${totalTime}ms`);
          
          return {
            success: true,
            response: finalMessage,
            metrics: {
              totalTurns: currentTurn,
              processingTime: totalTime,
              confidence: aiResponse.confidence,
              finalAction: 'reply',
              toolsUsed,
              errorCount
            },
            logs
          };
        }
        
        if (aiResponse.action.type === 'call_tool') {
          // A IA decidiu usar uma ferramenta
          const { toolName, parameters } = aiResponse.action.payload;
          
          if (!toolName) {
            console.error(`❌ [${sessionId}] No tool name specified`);
            errorCount++;
            continue;
          }
          
          console.log(`🔧 [${sessionId}] Executing tool: ${toolName}`);
          
          // Executar ferramenta
          const toolStartTime = Date.now();
          let toolResult: ToolOutput;
          
          try {
            toolResult = await this.toolsService.executeTool(toolName, parameters || {});
            toolsUsed.push(toolName);
          } catch (error) {
            errorCount++;
            console.error(`❌ [${sessionId}] Tool execution failed:`, error);
            
            toolResult = {
              toolName,
              success: false,
              error: error instanceof Error ? error.message : 'Tool execution failed',
              executionTime: Date.now() - toolStartTime
            };
          }
          
          logs.push({
            timestamp: new Date(),
            turn: currentTurn,
            type: 'tool_execution',
            data: {
              toolName,
              parameters,
              success: toolResult.success,
              error: toolResult.error,
              hasData: !!toolResult.data
            },
            processingTime: Date.now() - toolStartTime
          });
          
          console.log(`🔧 [${sessionId}] Tool result:`, {
            toolName,
            success: toolResult.success,
            error: toolResult.error,
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
        console.error(`❌ [${sessionId}] Invalid action type:`, aiResponse.action.type);
        errorCount++;
        break;
      }
      
      // Se o loop terminou sem reply, algo deu errado
      console.error(`❌ [${sessionId}] Agent loop ended without reply after ${currentTurn} turns`);
      
      const fallbackResponse = createFallbackResponse(userMessage);
      const fallbackMessage = fallbackResponse.action.payload.message || 
        'Desculpe, não consegui processar sua solicitação. Pode tentar novamente?';
      
      try {
        await sendWhatsAppMessage(clientPhone, fallbackMessage);
      } catch (error) {
        console.error(`❌ [${sessionId}] Failed to send fallback message:`, error);
      }
      
      logs.push({
        timestamp: new Date(),
        turn: currentTurn,
        type: 'final_response',
        data: {
          message: fallbackMessage,
          success: false,
          reason: 'max_turns_reached'
        }
      });
      
      return {
        success: false,
        response: fallbackMessage,
        metrics: {
          totalTurns: currentTurn,
          processingTime: Date.now() - startTime,
          confidence: 0.3,
          finalAction: 'fallback',
          toolsUsed,
          errorCount
        },
        logs
      };
      
    } catch (error) {
      console.error(`❌ [${sessionId}] Critical error in agent orchestrator:`, error);
      
      // Resposta de erro amigável
      const errorMessage = "Desculpe, estou com dificuldades técnicas. Pode tentar novamente em alguns instantes?";
      
      try {
        await sendWhatsAppMessage(clientPhone, errorMessage);
      } catch (sendError) {
        console.error(`❌ [${sessionId}] Failed to send error message:`, sendError);
      }
      
      logs.push({
        timestamp: new Date(),
        turn: currentTurn,
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'orchestrator'
        }
      });
      
      return {
        success: false,
        response: errorMessage,
        metrics: {
          totalTurns: currentTurn,
          processingTime: Date.now() - startTime,
          confidence: 0.2,
          finalAction: 'error',
          toolsUsed,
          errorCount: errorCount + 1
        },
        logs
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

  async healthCheck(): Promise<{ 
    status: string; 
    services: Record<string, boolean>;
    details: Record<string, any>;
  }> {
    const openaiHealthy = await this.openaiService.healthCheck();
    const toolsHealthy = this.toolsService.getAvailableTools().length > 0;
    
    return {
      status: (openaiHealthy && toolsHealthy) ? 'healthy' : 'unhealthy',
      services: {
        openai: openaiHealthy,
        tools: toolsHealthy,
        firestore: true // Sempre considerado saudável
      },
      details: {
        availableTools: this.toolsService.getAvailableTools(),
        tenantId: this.tenantId,
        maxTurns: this.maxTurns,
        maxProcessingTime: this.maxProcessingTime
      }
    };
  }

  // Método para teste e debug
  async debugSession(sessionLogs: AgentExecutionLog[]): Promise<{
    summary: string;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const errorLogs = sessionLogs.filter(log => log.type === 'error');
    const toolLogs = sessionLogs.filter(log => log.type === 'tool_execution');
    const aiLogs = sessionLogs.filter(log => log.type === 'ai_response');
    
    if (errorLogs.length > 0) {
      issues.push(`${errorLogs.length} errors occurred during session`);
      recommendations.push('Review error handling and add more robust fallbacks');
    }
    
    if (toolLogs.some(log => !log.data.success)) {
      issues.push('Some tool executions failed');
      recommendations.push('Check tool parameter validation and error handling');
    }
    
    if (aiLogs.some(log => log.data.confidence < 0.5)) {
      issues.push('Low confidence AI responses detected');
      recommendations.push('Review prompt engineering and provide more context');
    }
    
    const avgProcessingTime = sessionLogs.reduce((sum, log) => sum + (log.processingTime || 0), 0) / sessionLogs.length;
    if (avgProcessingTime > 5000) {
      issues.push('High processing times detected');
      recommendations.push('Optimize tool execution and AI response times');
    }
    
    return {
      summary: `Session had ${sessionLogs.length} logs, ${errorLogs.length} errors, ${toolLogs.length} tool executions`,
      issues,
      recommendations
    };
  }
}