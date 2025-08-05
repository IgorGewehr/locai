// lib/ai-agent/sofia-agent-mvp.ts
// SOFIA MVP - Versão simplificada PRONTA PARA PRODUÇÃO
// Inclui apenas funcionalidades essenciais e testadas

import { OpenAI } from 'openai';
import { getTenantAwareOpenAIFunctions, executeTenantAwareFunction } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { SOFIA_PROMPT } from './sofia-prompt';
import { conversationContextService } from '@/lib/services/conversation-context-service';

// ===== COMPONENTES ESSENCIAIS APENAS =====
import IntentDetector, { DetectedIntent } from './intent-detector';
import ConversationStateManager, { ConversationState } from './conversation-state';
import { loopPrevention } from './loop-prevention';

// ===== INTERFACES SIMPLIFICADAS =====

interface SofiaInput {
  message: string;
  clientPhone: string;
  tenantId: string;
  metadata?: {
    source: 'whatsapp' | 'web' | 'api';
    priority?: 'low' | 'normal' | 'high';
  };
}

interface SofiaResponse {
  reply: string;
  summary: any;
  actions?: any[];
  tokensUsed: number;
  responseTime: number;
  functionsExecuted: string[];
  metadata: {
    stage: string;
    confidence: number;
    reasoningUsed: boolean;
    intentDetected?: DetectedIntent | null;
    loopPrevented?: boolean;
    fallbackUsed?: boolean;
  };
}

// ===== CLASSE PRINCIPAL MVP =====

export class SofiaMVP {
  private openai: OpenAI;
  private static instance: SofiaMVP;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaMVP {
    if (!this.instance) {
      logger.info('🚀 [Sofia MVP] Criando instância para produção');
      this.instance = new SofiaMVP();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];
    let intentDetected: DetectedIntent | null = null;
    let loopPrevented = false;
    let fallbackUsed = false;

    try {
      logger.info('💬 [Sofia MVP] Processando mensagem', {
        clientPhone: this.maskPhone(input.clientPhone),
        messagePreview: input.message.substring(0, 50) + '...',
        tenantId: input.tenantId
      });

      // 1. DETECTAR INTENÇÃO (funcionalidade testada)
      intentDetected = IntentDetector.detectIntent(
        input.message,
        input.clientPhone,
        input.tenantId
      );

      // 2. VERIFICAR PREVENÇÃO DE LOOP (funcionalidade testada)
      if (intentDetected?.shouldForceExecution) {
        const loopCheck = loopPrevention.checkForLoop(
          input.clientPhone,
          intentDetected.function,
          intentDetected.args
        );

        if (loopCheck.isLoop) {
          logger.warn('🔄 [Sofia MVP] Loop detectado - usando fallback', {
            functionName: intentDetected.function,
            reason: loopCheck.reason
          });

          loopPrevented = true;
          fallbackUsed = true;

          return {
            reply: this.getLoopFallbackMessage(intentDetected.function),
            summary: this.createSimpleSummary(input.tenantId, input.clientPhone),
            actions: [],
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            functionsExecuted: [],
            metadata: {
              stage: 'loop_prevention',
              confidence: 0.8,
              reasoningUsed: false,
              intentDetected,
              loopPrevented: true,
              fallbackUsed: true
            }
          };
        }
      }

      // 3. EXECUÇÃO DIRETA SE INTENÇÃO DETECTADA COM ALTA CONFIANÇA
      if (intentDetected?.shouldForceExecution && intentDetected.confidence >= 0.85) {
        logger.info('⚡ [Sofia MVP] Execução direta', {
          functionName: intentDetected.function,
          confidence: intentDetected.confidence
        });

        // Registrar execução para prevenção de loops
        const executionId = `direct_${Date.now()}`;
        loopPrevention.recordExecution(
          input.clientPhone,
          intentDetected.function,
          intentDetected.args,
          executionId
        );

        // Executar função diretamente
        const result = await executeTenantAwareFunction(
          intentDetected.function,
          intentDetected.args,
          input.tenantId
        );

        if (result.success) {
          functionsExecuted.push(intentDetected.function);
          
          // Atualizar estado da conversa
          this.updateConversationState(
            input.clientPhone,
            input.tenantId,
            intentDetected.function,
            result
          );

          const reply = this.generateContextualResponse([intentDetected.function], [result]);

          // Salvar no histórico
          await this.saveMessageHistory(input, reply, 0);

          return {
            reply,
            summary: this.createSimpleSummary(input.tenantId, input.clientPhone),
            actions: [{ type: intentDetected.function, result }],
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            functionsExecuted,
            metadata: {
              stage: 'direct_execution',
              confidence: intentDetected.confidence,
              reasoningUsed: false,
              intentDetected,
              loopPrevented: false,
              fallbackUsed: false
            }
          };
        }
      }

      // 4. USAR GPT COM CONTEXTO BÁSICO
      logger.info('🧠 [Sofia MVP] Usando GPT');
      
      const conversationState = ConversationStateManager.getState(input.clientPhone, input.tenantId);
      const messageHistory = await conversationContextService.getMessageHistory(
        input.clientPhone,
        input.tenantId,
        3 // Reduzido para MVP
      );

      const messages = [
        {
          role: 'system' as const,
          content: this.buildMVPPrompt(input.tenantId, conversationState, messageHistory, intentDetected)
        },
        {
          role: 'user' as const,
          content: input.message
        }
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getTenantAwareOpenAIFunctions(),
        tool_choice: intentDetected?.shouldForceExecution ? 'required' : 'auto',
        max_tokens: 800, // Reduzido para MVP
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      // 5. PROCESSAR TOOL CALLS COM PREVENÇÃO DE LOOP SIMPLES
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // Verificar loop simples
            const loopCheck = loopPrevention.checkForLoop(
              input.clientPhone,
              functionName,
              functionArgs
            );

            if (loopCheck.isLoop) {
              logger.warn('🔄 [Sofia MVP] Loop detectado na tool call');
              loopPrevented = true;
              continue;
            }

            // Registrar e executar
            const executionId = `gpt_${toolCall.id}`;
            loopPrevention.recordExecution(
              input.clientPhone,
              functionName,
              functionArgs,
              executionId
            );

            const result = await executeTenantAwareFunction(
              functionName,
              functionArgs,
              input.tenantId
            );

            if (result.success) {
              functionsExecuted.push(functionName);
              actions.push({ type: functionName, result });

              // Atualizar estado
              this.updateConversationState(
                input.clientPhone,
                input.tenantId,
                functionName,
                result
              );
            }

          } catch (error: any) {
            logger.error('❌ [Sofia MVP] Erro ao executar tool call', {
              function: toolCall.function.name,
              error: error.message
            });
          }
        }

        // Gerar resposta baseada nas funções executadas
        if (functionsExecuted.length > 0) {
          reply = this.generateContextualResponse(functionsExecuted, actions);
        }
      }

      // 6. FALLBACK SIMPLES SE NECESSÁRIO
      if (functionsExecuted.length === 0 && intentDetected?.shouldForceExecution) {
        logger.warn('⚠️ [Sofia MVP] Nenhuma função executada - usando fallback');
        reply = this.getNoExecutionFallback(intentDetected.function, conversationState);
        fallbackUsed = true;
      }

      // 7. SALVAR HISTÓRICO
      await this.saveMessageHistory(input, reply, totalTokens);

      const responseTime = Date.now() - startTime;

      logger.info('✅ [Sofia MVP] Processamento completo', {
        responseTime: `${responseTime}ms`,
        tokensUsed: totalTokens,
        functionsExecuted: functionsExecuted.length,
        loopPrevented,
        fallbackUsed
      });

      return {
        reply,
        summary: this.createSimpleSummary(input.tenantId, input.clientPhone),
        actions,
        tokensUsed: totalTokens,
        responseTime,
        functionsExecuted,
        metadata: {
          stage: functionsExecuted.length > 0 ? 'function_executed' : 'conversation',
          confidence: intentDetected?.confidence || 0.7,
          reasoningUsed: true,
          intentDetected,
          loopPrevented,
          fallbackUsed
        }
      };

    } catch (error: any) {
      return this.handleError(error, input, startTime, intentDetected, loopPrevented, fallbackUsed);
    }
  }

  // ===== MÉTODOS AUXILIARES SIMPLIFICADOS =====

  private buildMVPPrompt(
    tenantId: string,
    conversationState: ConversationState,
    messageHistory: any[],
    intentDetected: DetectedIntent | null
  ): string {
    let prompt = `${SOFIA_PROMPT}\n\n`;
    prompt += `IMPORTANTE: Você está operando para o tenant ${tenantId}.\n\n`;

    // Adicionar contexto básico de estado
    if (conversationState.lastPropertyIds.length > 0) {
      prompt += `CONTEXTO IMPORTANTE:\n`;
      prompt += `- JÁ FORAM ENCONTRADAS ${conversationState.lastPropertyIds.length} propriedades\n`;
      prompt += `- IDs das propriedades: ${conversationState.lastPropertyIds.join(', ')}\n`;
      prompt += `- Fase: ${conversationState.conversationPhase}\n`;
      prompt += `- Se cliente perguntar sobre "opções" ou "propriedades", LISTE as propriedades encontradas\n`;
      prompt += `- NÃO execute search_properties novamente a menos que sejam novos critérios\n`;
      
      if (conversationState.clientInfo?.name) {
        prompt += `- Cliente: ${conversationState.clientInfo.name}\n`;
      }
      prompt += `\n`;
    }

    // Adicionar intenção detectada
    if (intentDetected) {
      prompt += `INTENÇÃO DETECTADA:\n`;
      prompt += `- Função sugerida: ${intentDetected.function}\n`;
      prompt += `- Confiança: ${(intentDetected.confidence * 100).toFixed(1)}%\n\n`;
    }

    prompt += `INSTRUÇÕES:\n`;
    prompt += `- Respostas concisas (máximo 3 linhas)\n`;
    prompt += `- Use o contexto para evitar repetições\n`;
    prompt += `- Se detectou intenção, considere usá-la\n`;

    return prompt;
  }

  private updateConversationState(
    clientPhone: string,
    tenantId: string,
    functionName: string,
    result: any
  ): void {
    switch (functionName) {
      case 'search_properties':
        if (result.properties && result.properties.length > 0) {
          const propertyIds = result.properties.map((p: any) => p.id);
          ConversationStateManager.updateAfterSearch(clientPhone, tenantId, propertyIds);
        }
        break;

      case 'calculate_price':
        if (result.pricing) {
          ConversationStateManager.updateAfterPriceCalculation(
            clientPhone,
            tenantId,
            {
              propertyId: result.property?.id || '',
              checkIn: result.dates?.checkIn || '',
              checkOut: result.dates?.checkOut || '',
              totalPrice: result.pricing?.totalPrice || 0,
              details: result.pricing
            }
          );
        }
        break;

      case 'register_client':
        if (result.client) {
          ConversationStateManager.updateClientInfo(
            clientPhone,
            tenantId,
            {
              name: result.client.name,
              email: result.client.email,
              id: result.client.id
            }
          );
        }
        break;
      
      case 'get_property_details':
        if (result.property) {
          ConversationStateManager.updateCurrentProperty(
            clientPhone,
            tenantId,
            result.property.id
          );
        }
        break;
      
      case 'send_property_media':
        if (result.property) {
          ConversationStateManager.updateCurrentProperty(
            clientPhone,
            tenantId,
            result.property.id
          );
        }
        break;
      
      case 'schedule_visit':
        if (result.visit) {
          ConversationStateManager.updateAfterVisitScheduled(
            clientPhone,
            tenantId,
            {
              visitId: result.visit.id,
              propertyId: result.visit.propertyId,
              scheduledDate: result.visit.scheduledDate,
              scheduledTime: result.visit.scheduledTime
            }
          );
        }
        break;
      
      case 'create_transaction':
        if (result.transaction) {
          ConversationStateManager.updateAfterTransaction(
            clientPhone,
            tenantId,
            {
              transactionId: result.transaction.id,
              reservationId: result.transaction.reservationId,
              advanceAmount: result.transaction.advanceAmount,
              totalAmount: result.transaction.totalAmount,
              paymentMethod: result.transaction.paymentMethod,
              status: 'pending'
            }
          );
        }
        break;
    }
  }

  private generateContextualResponse(
    functionsExecuted: string[],
    actions: any[]
  ): string {
    const mainFunction = functionsExecuted[0];
    
    switch (mainFunction) {
      case 'search_properties':
        const properties = actions[0]?.result?.properties || [];
        const propCount = properties.length;
        
        if (propCount > 0) {
          let response = `Encontrei ${propCount} opções perfeitas! 🏠\n\n`;
          
          properties.forEach((prop: any, index: number) => {
            response += `${index + 1}. **${prop.name}**\n`;
            response += `   📍 ${prop.location}\n`;
            response += `   🛏️ ${prop.bedrooms} quartos | 🚿 ${prop.bathrooms} banheiros\n`;
            response += `   👥 Até ${prop.maxGuests} hóspedes\n`;
            response += `   💰 R$ ${prop.basePrice}/diária\n`;
            if (prop.amenities && prop.amenities.length > 0) {
              response += `   ✨ ${prop.amenities.slice(0, 3).join(', ')}\n`;
            }
            response += '\n';
          });
          
          response += 'Qual te interessa mais? Posso mostrar fotos e calcular preços! 📸';
          return response;
        } else {
          return `Não encontrei opções com esses critérios. Vamos ajustar a busca? 🔍`;
        }
      
      case 'calculate_price':
        const price = actions[0]?.result?.pricing?.totalPrice;
        if (price) {
          return `Valor calculado: R$ ${price.toFixed(2)} 💰 Quer prosseguir?`;
        } else {
          return `Dificuldade para calcular. Pode repetir as datas? 📅`;
        }
      
      case 'create_reservation':
        return `Reserva criada com sucesso! 📝 Em breve envio os detalhes.`;
      
      case 'register_client':
        return `Dados registrados! 👤 Agora posso te ajudar melhor.`;
      
      case 'get_property_details':
        const details = actions[0]?.result?.property;
        if (details) {
          let response = `🏠 **${details.name}**\n\n`;
          response += `📍 ${details.location?.address}, ${details.location?.neighborhood}\n`;
          response += `🛏️ ${details.specs?.bedrooms} quartos | 🚿 ${details.specs?.bathrooms} banheiros\n`;
          response += `👥 Até ${details.specs?.maxGuests} hóspedes | 🏠 ${details.specs?.area}m²\n`;
          response += `💰 R$ ${details.pricing?.basePrice}/diária\n\n`;
          if (details.amenities?.length > 0) {
            response += `✨ **Comodidades:** ${details.amenities.slice(0, 5).join(', ')}\n\n`;
          }
          response += `Quer ver as fotos? 📸 Ou calcular o preço para suas datas?`;
          return response;
        } else {
          return `Aqui estão todos os detalhes da propriedade! 📋 Em que mais posso ajudar?`;
        }
      
      case 'send_property_media':
        const media = actions[0]?.result;
        if (media?.media?.length > 0) {
          return `📸 Enviando ${media.mediaDescription} de **${media.property?.name}**! Que tal? Posso calcular preços ou agendar uma visita!`;
        } else {
          return `Fotos enviadas! 📸 Gostou do que viu? Quer agendar uma visita?`;
        }
      
      case 'schedule_visit':
        const visit = actions[0]?.result?.visit;
        if (visit) {
          return `✅ **Visita agendada com sucesso!**\n\n📅 ${visit.scheduledDate}\n⏰ ${visit.scheduledTime}\n🏠 ${visit.propertyName}\n📍 ${visit.propertyAddress}\n\nConfirmarei todos os detalhes por WhatsApp! 😊`;
        } else {
          return `Visita agendada com sucesso! 📅 Em breve envio a confirmação.`;
        }
      
      case 'generate_quote':
        const quote = actions[0]?.result?.quote;
        if (quote) {
          let response = `💰 **Orçamento Detalhado**\n\n`;
          response += `🏠 **${actions[0]?.result?.property?.name}**\n`;
          response += `📅 ${quote.checkIn} até ${quote.checkOut} (${quote.nights} noites)\n`;
          response += `👥 ${quote.guests} hóspedes\n\n`;
          
          response += `💵 **Valores:**\n`;
          response += `• Hospedagem: R$ ${quote.pricing.subtotal.toFixed(2)}\n`;
          if (quote.pricing.cleaningFee > 0) {
            response += `• Taxa de limpeza: R$ ${quote.pricing.cleaningFee.toFixed(2)}\n`;
          }
          if (quote.pricing.extraGuestFee > 0) {
            response += `• Taxa hóspedes extras (${quote.pricing.extraGuests}): R$ ${quote.pricing.extraGuestFee.toFixed(2)}\n`;
          }
          response += `• Taxa de serviço: R$ ${quote.pricing.serviceFee.toFixed(2)}\n`;
          if (quote.pricing.paymentSurcharge > 0) {
            response += `• Taxa pagamento: R$ ${quote.pricing.paymentSurcharge.toFixed(2)}\n`;
          }
          
          response += `\n🎯 **TOTAL: R$ ${quote.pricing.totalPrice.toFixed(2)}**\n`;
          response += `📊 Média: R$ ${quote.averagePricePerNight}/noite\n\n`;
          
          if (quote.surcharges.weekend > 0 || quote.surcharges.holiday > 0) {
            response += `ℹ️ *Inclui acréscimos de `;
            const surcharges = [];
            if (quote.surcharges.weekend > 0) surcharges.push('fim de semana');
            if (quote.surcharges.holiday > 0) surcharges.push('feriados');
            if (quote.surcharges.seasonal > 0) surcharges.push('alta temporada');
            response += surcharges.join(' e ') + '*\n\n';
          }
          
          response += `Confirma esse orçamento para prosseguirmos? 😊`;
          return response;
        } else {
          return `Orçamento calculado! 💰 Consulte os valores e me avise se está de acordo.`;
        }
      
      case 'classify_lead':
        const leadData = actions[0]?.result?.lead;
        if (leadData) {
          const statusLabels = {
            'new': 'Novo',
            'contacted': 'Contatado',
            'qualified': 'Qualificado',
            'opportunity': 'Oportunidade',
            'negotiation': 'Negociação'
          };
          
          if (leadData.isNewLead) {
            return `👋 Prazer em conhecer! Já te cadastrei como ${statusLabels[leadData.status as keyof typeof statusLabels] || leadData.status}. Como posso te ajudar hoje?`;
          } else {
            return `📊 Perfil atualizado! Score: ${leadData.score}/100 | Status: ${statusLabels[leadData.status as keyof typeof statusLabels] || leadData.status}`;
          }
        }
        return `Perfil do cliente atualizado no sistema! 📊`;
      
      case 'update_lead_status':
        const leadUpdate = actions[0]?.result?.lead;
        if (leadUpdate) {
          return `✅ Status atualizado: ${leadUpdate.oldStatus} → ${leadUpdate.newStatus} | Score: ${leadUpdate.score}/100`;
        }
        return `Status do lead atualizado com sucesso! 📈`;
      
      case 'create_transaction':
        const transaction = actions[0]?.result?.transaction;
        const paymentInstructions = actions[0]?.result?.paymentInstructions;
        if (transaction) {
          let response = `💳 **Transação Criada com Sucesso!**\n\n`;
          response += `🏠 ${transaction.propertyName}\n`;
          response += `👤 ${transaction.clientName}\n\n`;
          
          response += `💰 **Detalhes Financeiros:**\n`;
          response += `• Valor total: R$ ${transaction.totalAmount.toFixed(2)}\n`;
          response += `• Entrada (${transaction.advancePercentage}%): R$ ${transaction.advanceAmount.toFixed(2)}\n`;
          if (transaction.discount > 0) {
            response += `• Desconto ${transaction.paymentMethod.toUpperCase()}: R$ ${transaction.discount.toFixed(2)}\n`;
          }
          response += `• Restante: R$ ${transaction.remainingAmount.toFixed(2)}\n`;
          response += `• Vencimento: ${paymentInstructions?.dueDate}\n\n`;
          
          response += `🔸 **Forma de Pagamento: ${transaction.paymentMethod.toUpperCase()}**\n`;
          
          if (paymentInstructions?.pixKey) {
            response += `📱 PIX: ${paymentInstructions.pixKey}\n`;
          }
          
          if (paymentInstructions?.bankDetails) {
            response += `🏦 Banco: ${paymentInstructions.bankDetails.bank}\n`;
            response += `🏦 Agência: ${paymentInstructions.bankDetails.agency}\n`;
            response += `🏦 Conta: ${paymentInstructions.bankDetails.account}\n`;
          }
          
          response += `\n✅ Pagamento pendente. Confirmarei assim que receber o comprovante!`;
          return response;
        } else {
          return `Transação financeira criada! 💳 Em breve envio os detalhes do pagamento.`;
        }
      
      default:
        return `Pronto! Executei as ações necessárias. 😊`;
    }
  }

  private createSimpleSummary(tenantId: string, clientPhone: string): any {
    const conversationState = ConversationStateManager.getState(clientPhone, tenantId);
    const stateSummary = ConversationStateManager.getStateSummary(clientPhone, tenantId);
    
    return {
      ...stateSummary,
      tenantId,
      timestamp: new Date().toISOString()
    };
  }

  private async saveMessageHistory(
    input: SofiaInput,
    reply: string,
    tokensUsed: number
  ): Promise<void> {
    try {
      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        { role: 'user', content: input.message }
      );

      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        { role: 'assistant', content: reply, tokensUsed }
      );
    } catch (error) {
      logger.error('❌ [Sofia MVP] Erro ao salvar histórico', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getLoopFallbackMessage(functionName: string): string {
    switch (functionName) {
      case 'search_properties':
        return `Já te mostrei as propriedades disponíveis! 😊 Qual te chamou mais atenção?`;
      case 'calculate_price':
        return `Já calculei o preço! 💰 Quer recalcular para outras datas?`;
      case 'get_property_details':
        return `Já te passei os detalhes! 📋 Tem alguma dúvida específica?`;
      case 'send_property_media':
        return `Acabei de enviar as fotos! 📸 Gostou do que viu?`;
      case 'schedule_visit':
        return `Sua visita já está agendada! 📅 Confirmarei os detalhes em breve.`;
      case 'generate_quote':
        return `Já calculei esse orçamento! 💰 Quer recalcular para outras datas?`;
      case 'classify_lead':
        return `Cliente já classificado no sistema! 📊 Como posso ajudar mais?`;
      case 'update_lead_status':
        return `Status do lead já atualizado! 📈 Algo mais que posso fazer?`;
      case 'create_transaction':
        return `Transação já criada! 💳 Assim que efetivar o pagamento, confirmarei sua reserva.`;
      default:
        return `Acabamos de fazer essa ação! 😊 Em que mais posso ajudar?`;
    }
  }

  private getNoExecutionFallback(functionName: string, state: ConversationState): string {
    if (state.lastPropertyIds.length === 0) {
      switch (functionName) {
        case 'get_property_details':
        case 'calculate_price':
        case 'send_property_media':
        case 'schedule_visit':
        case 'generate_quote':
          return `Para isso, primeiro preciso te mostrar as propriedades! Me conte: que tipo de imóvel você procura e em qual cidade? 🏠`;
        case 'create_reservation':
          return `Para fazer uma reserva, primeiro vamos encontrar o imóvel ideal! Em qual cidade você está procurando? 🏠`;
        case 'create_transaction':
          return `Para criar uma transação, primeiro preciso processar uma reserva! Vamos encontrar o imóvel ideal para você? 🏠`;
        default:
          return `Vamos começar? Me conte que tipo de imóvel você procura e em qual cidade! 😊`;
      }
    }
    
    return `Em que posso te ajudar? Posso mostrar detalhes, calcular preços ou agendar visitas! 😊`;
  }

  private handleError(
    error: any,
    input: SofiaInput,
    startTime: number,
    intentDetected: DetectedIntent | null,
    loopPrevented: boolean,
    fallbackUsed: boolean
  ): SofiaResponse {
    const responseTime = Date.now() - startTime;

    logger.error('❌ [Sofia MVP] Erro no processamento', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientPhone: this.maskPhone(input.clientPhone),
      responseTime: `${responseTime}ms`
    });

    return {
      reply: 'Ops! Probleminha técnico. Pode repetir sua mensagem? 🙏',
      summary: this.createSimpleSummary(input.tenantId, input.clientPhone),
      actions: [],
      tokensUsed: 0,
      responseTime,
      functionsExecuted: [],
      metadata: {
        stage: 'error',
        confidence: 0,
        reasoningUsed: false,
        intentDetected,
        loopPrevented,
        fallbackUsed: true
      }
    };
  }

  private maskPhone(phone: string): string {
    if (phone.length > 4) {
      return phone.substring(0, 4) + '***' + phone.substring(phone.length - 2);
    }
    return phone;
  }

  // Método para limpar contexto do cliente
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    logger.info('🗑️ [Sofia MVP] Limpando contexto do cliente', {
      clientPhone: this.maskPhone(clientPhone),
      tenantId
    });

    ConversationStateManager.clearState(clientPhone, tenantId);
    loopPrevention.clearClientHistory(clientPhone);
    
    try {
      await conversationContextService.clearClientContext(clientPhone, tenantId);
    } catch (error) {
      logger.error('❌ Erro ao limpar contexto do serviço', { error });
    }
  }
}

// Export da instância singleton
export const sofiaMVP = SofiaMVP.getInstance();