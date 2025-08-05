// lib/ai-agent/intent-detector.ts
// Sistema de Detecção Forçada de Intenções - IGNORA GPT quando necessário

import { logger } from '@/lib/utils/logger';
import ConversationStateManager from './conversation-state';

export interface DetectedIntent {
  function: string;
  confidence: number;
  args: any;
  shouldForceExecution: boolean;
  reason: string;
}

export class IntentDetector {
  
  /**
   * Detectar intenção ANTES do GPT processar
   * Retorna null se deve deixar GPT decidir
   */
  static detectIntent(
    message: string, 
    clientPhone: string, 
    tenantId: string
  ): DetectedIntent | null {
    const lowerMessage = message.toLowerCase();
    const conversationState = ConversationStateManager.getState(clientPhone, tenantId);
    
    logger.info('🎯 [IntentDetector] Analisando mensagem', {
      message: message.substring(0, 50),
      hasProperties: conversationState.lastPropertyIds.length > 0,
      currentPhase: conversationState.conversationPhase
    });

    // 1. DETECÇÃO DE CADASTRO (sempre forçar)
    const clientDataMatch = IntentDetector.detectClientRegistration(message);
    if (clientDataMatch) {
      return {
        function: 'register_client',
        confidence: 0.95,
        args: {
          name: clientDataMatch.name,
          document: clientDataMatch.document,
          email: clientDataMatch.email,
          phone: clientDataMatch.phone || clientPhone
        },
        shouldForceExecution: true,
        reason: 'Dados pessoais detectados na mensagem'
      };
    }

    logger.info('🔍 [IntentDetector] Estado da conversa', {
      hasProperties: conversationState.lastPropertyIds.length > 0,
      propertiesCount: conversationState.lastPropertyIds.length,
      currentPhase: conversationState.conversationPhase,
      lastFunction: conversationState.lastFunction
    });

    // 2. SE TEM PROPRIEDADES NO CONTEXTO - detectar intenções específicas
    if (conversationState.lastPropertyIds.length > 0) {
      logger.info('✅ [IntentDetector] TEM PROPRIEDADES - testando detecções específicas');
      
      // Detalhes da propriedade
      const isDetails = IntentDetector.isDetailsRequest(lowerMessage);
      logger.info('🔍 [IntentDetector] Teste detalhes', { isDetails, message: lowerMessage.substring(0, 30) });
      
      if (isDetails) {
        const propertyIndex = IntentDetector.extractPropertyIndex(lowerMessage);
        const propertyId = conversationState.lastPropertyIds[propertyIndex] || conversationState.lastPropertyIds[0];
        
        logger.info('🎯 [IntentDetector] FORÇANDO get_property_details', { propertyIndex, propertyId: propertyId?.substring(0, 10) + '...' });
        
        return {
          function: 'get_property_details',
          confidence: 0.90,
          args: {
            propertyId,
            clientPhone
          },
          shouldForceExecution: true,
          reason: 'Pedido de detalhes com propriedades no contexto'
        };
      }

      // Fotos/mídia
      if (IntentDetector.isMediaRequest(lowerMessage)) {
        const propertyIndex = IntentDetector.extractPropertyIndex(lowerMessage);
        const propertyId = conversationState.lastPropertyIds[propertyIndex] || conversationState.lastPropertyIds[0];
        
        return {
          function: 'send_property_media',
          confidence: 0.90,
          args: {
            propertyId,
            clientPhone
          },
          shouldForceExecution: true,
          reason: 'Pedido de fotos com propriedades no contexto'
        };
      }

      // Orçamento detalhado (generate_quote) tem prioridade sobre calculate_price
      if (IntentDetector.isDetailedQuoteRequest(lowerMessage)) {
        const propertyIndex = IntentDetector.extractPropertyIndex(lowerMessage);
        const propertyId = conversationState.lastPropertyIds[propertyIndex] || conversationState.lastPropertyIds[0];
        const dates = IntentDetector.extractDatesFromQuote(message);
        
        return {
          function: 'generate_quote',
          confidence: 0.95,
          args: {
            propertyId,
            checkIn: dates.checkIn || IntentDetector.getDefaultCheckIn(),
            checkOut: dates.checkOut || IntentDetector.getDefaultCheckOut(),
            guests: IntentDetector.extractGuests(message) || 2,
            includeDetails: true
          },
          shouldForceExecution: true,
          reason: 'Pedido de orçamento detalhado com datas específicas'
        };
      }

      // Cálculo de preço simples
      if (IntentDetector.isPriceRequest(lowerMessage)) {
        const propertyIndex = IntentDetector.extractPropertyIndex(lowerMessage);
        const propertyId = conversationState.lastPropertyIds[propertyIndex] || conversationState.lastPropertyIds[0];
        const dates = IntentDetector.extractDates(message);
        
        return {
          function: 'calculate_price',
          confidence: 0.90,
          args: {
            propertyId,
            clientPhone,
            checkIn: dates.checkIn || IntentDetector.getDefaultCheckIn(),
            checkOut: dates.checkOut || IntentDetector.getDefaultCheckOut(),
            guests: IntentDetector.extractGuests(message) || 2
          },
          shouldForceExecution: true,
          reason: 'Pedido de preço com propriedades no contexto'
        };
      }

      // Agendamento de visita com data/hora específica
      const visitSchedule = IntentDetector.detectVisitScheduling(message);
      if (visitSchedule) {
        const propertyId = conversationState.lastPropertyIds[0];
        
        return {
          function: 'schedule_visit',
          confidence: 0.85,
          args: {
            propertyId,
            clientPhone,
            visitDate: visitSchedule.date,
            visitTime: visitSchedule.time,
            ...visitSchedule.extraArgs
          },
          shouldForceExecution: true,
          reason: 'Agendamento de visita com data/hora específica'
        };
      }

      // Consulta de disponibilidade para visita (genérica)
      if (IntentDetector.isVisitAvailabilityRequest(lowerMessage)) {
        return {
          function: 'check_visit_availability',
          confidence: 0.80,
          args: {
            clientPhone
          },
          shouldForceExecution: true,
          reason: 'Consulta de disponibilidade para visita'
        };
      }

      // Criar reserva
      if (IntentDetector.isReservationRequest(lowerMessage)) {
        const propertyId = conversationState.lastPropertyIds[0];
        const dates = IntentDetector.extractDates(message);
        
        return {
          function: 'create_reservation',
          confidence: 0.85,
          args: {
            propertyId,
            clientPhone,
            checkIn: dates.checkIn || IntentDetector.getDefaultCheckIn(),
            checkOut: dates.checkOut || IntentDetector.getDefaultCheckOut(),
            guests: IntentDetector.extractGuests(message) || 2
          },
          shouldForceExecution: true,
          reason: 'Pedido de reserva com propriedades no contexto'
        };
      }

      // Detectar método de pagamento (após reserva criada)
      if (IntentDetector.isPaymentMethodMention(lowerMessage) && conversationState.conversationPhase === 'booking') {
        const paymentMethod = IntentDetector.extractPaymentMethod(message);
        
        if (paymentMethod) {
          return {
            function: 'create_transaction',
            confidence: 0.90,
            args: {
              paymentMethod,
              clientPhone
            },
            shouldForceExecution: true,
            reason: 'Método de pagamento mencionado após reserva'
          };
        }
      }
    }

    // 3. SE NÃO TEM PROPRIEDADES - detectar busca
    if (conversationState.lastPropertyIds.length === 0) {
      if (IntentDetector.isSearchRequest(lowerMessage)) {
        const searchCriteria = IntentDetector.extractSearchCriteria(message);
        
        return {
          function: 'search_properties',
          confidence: 0.85,
          args: {
            location: searchCriteria.location || 'Brasil',
            guests: searchCriteria.guests || 2,
            checkIn: searchCriteria.checkIn || IntentDetector.getDefaultCheckIn(),
            checkOut: searchCriteria.checkOut || IntentDetector.getDefaultCheckOut(),
            clientPhone
          },
          shouldForceExecution: true,
          reason: 'Primeira busca ou nova busca necessária'
        };
      }
    }

    // 4. Classificação de interesse
    if (IntentDetector.isInterestExpression(lowerMessage)) {
      const sentiment = IntentDetector.analyzeSentiment(lowerMessage);
      
      return {
        function: 'classify_lead_status',
        confidence: 0.75,
        args: {
          clientPhone,
          conversationOutcome: sentiment.outcome,
          interestLevel: sentiment.level,
          reason: sentiment.indicators.join(', ')
        },
        shouldForceExecution: false, // Deixar GPT decidir junto
        reason: 'Expressão de interesse/sentimento detectada'
      };
    }

    // Nenhuma intenção específica detectada - deixar GPT decidir
    return null;
  }

  // ===== MÉTODOS DE DETECÇÃO ESPECÍFICOS =====

  private static detectClientRegistration(message: string): any | null {
    const text = message.toLowerCase();
    
    // Detectar nome + CPF/documento
    const nameMatch = message.match(/(?:meu nome é|sou|me chamo)\s+([a-záêîôõçúíéóü\s]+)/i);
    const cpfMatch = message.match(/(?:cpf|documento|identidade)\s*[:=]?\s*([0-9.-]+)/i);
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = message.match(/(?:telefone|fone|whatsapp)\s*[:=]?\s*([0-9+()-\s]+)/i);

    if (nameMatch && cpfMatch) {
      return {
        name: nameMatch[1].trim(),
        document: cpfMatch[1].replace(/[.-]/g, ''),
        email: emailMatch ? emailMatch[1] : null,
        phone: phoneMatch ? phoneMatch[1] : null
      };
    }

    return null;
  }

  private static isDetailsRequest(text: string): boolean {
    const detailsKeywords = [
      'detalhes', 'me conte', 'me fale', 'informações',
      'quantos quartos', 'quantos banheiros', 'qual o tamanho',
      'localização', 'endereço', 'onde fica',
      'primeira opção', 'segunda opção', 'terceira opção',
      'primeiro', 'segundo', 'terceiro',
      'mais sobre', 'característica'
    ];
    
    return detailsKeywords.some(keyword => text.includes(keyword));
  }

  private static isMediaRequest(text: string): boolean {
    const mediaKeywords = [
      'fotos', 'imagens', 'pictures', 'fotografias',
      'vídeo', 'vídeos', 'tour virtual',
      'me mostra', 'quero ver', 'envia as fotos',
      'pode enviar', 'tem fotos'
    ];
    
    return mediaKeywords.some(keyword => text.includes(keyword));
  }

  private static isPriceRequest(text: string): boolean {
    const priceKeywords = [
      'quanto custa', 'quanto fica', 'qual o valor', 'qual o preço',
      'preço', 'valor', 'custo', 'orçamento',
      'calcular', 'valor da diária', 'preço final',
      'quanto sai', 'quanto é'
    ];
    
    // Detectar se é pedido de orçamento detalhado (para generate_quote)
    const isDetailedQuote = text.includes('do dia') || text.includes('até') || 
                           text.includes('período') || text.includes('entre') ||
                           text.includes('orçamento');
    
    // Se tem datas específicas, não é price simples
    if (isDetailedQuote) {
      return false; // Deixar para generate_quote
    }
    
    return priceKeywords.some(keyword => text.includes(keyword));
  }

  private static isSearchRequest(text: string): boolean {
    const searchKeywords = [
      'quero alugar', 'procuro', 'busco', 'preciso',
      'apartamento', 'casa', 'imóvel', 'propriedade',
      'temporada', 'hospedagem', 'para alugar',
      'disponível', 'opções'
    ];
    
    return searchKeywords.some(keyword => text.includes(keyword));
  }

  private static isVisitAvailabilityRequest(text: string): boolean {
    const visitKeywords = [
      'posso visitar', 'disponibilidade para visita',
      'horários disponíveis', 'quando posso conhecer',
      'agenda para visita', 'como funciona a visita'
    ];
    
    return visitKeywords.some(keyword => text.includes(keyword));
  }

  private static isReservationRequest(text: string): boolean {
    const reservationKeywords = [
      'fazer reserva', 'confirmar reserva', 'quero reservar',
      'fechar negócio', 'está fechado', 'confirmado',
      'pode reservar', 'vamos fechar', 'está decidido',
      'quero fechar', 'confirmo', 'topo', 'bora fechar'
    ];
    
    return reservationKeywords.some(keyword => text.includes(keyword));
  }

  private static isDetailedQuoteRequest(text: string): boolean {
    const quoteKeywords = [
      'quanto fica do dia', 'quanto fica de', 'valor do dia',
      'orçamento do dia', 'preço do dia', 'entre os dias',
      'período de', 'temporada', 'quanto sai de',
      'me faça um orçamento', 'quero um orçamento'
    ];
    
    return quoteKeywords.some(keyword => text.includes(keyword));
  }

  private static isInterestExpression(text: string): boolean {
    const interestKeywords = [
      'adorei', 'gostei', 'não gostei', 'perfeito',
      'interessado', 'preciso pensar', 'vou avaliar',
      'muito bom', 'excelente', 'não serve',
      'muito caro', 'caro demais', 'dentro do orçamento'
    ];
    
    return interestKeywords.some(keyword => text.includes(keyword));
  }

  // ===== MÉTODOS DE EXTRAÇÃO =====

  private static extractPropertyIndex(text: string): number {
    if (text.includes('primeira') || text.includes('primeiro')) return 0;
    if (text.includes('segunda') || text.includes('segundo')) return 1;
    if (text.includes('terceira') || text.includes('terceiro')) return 2;
    return 0; // Padrão: primeira propriedade
  }

  private static extractDates(message: string): { checkIn?: string; checkOut?: string } {
    // Implementação básica - pode ser melhorada
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return { checkIn, checkOut };
  }

  private static extractDatesFromQuote(message: string): { checkIn?: string; checkOut?: string } {
    const text = message.toLowerCase();
    
    // Tentar extrair padrão "do dia X ao dia Y"
    const rangeMatch = message.match(/do\s+dia\s+(\d{1,2})(?:\/(\d{1,2}))?(?:\/(\d{2,4}))?\s+(?:ao|até)\s+(?:dia\s+)?(\d{1,2})(?:\/(\d{1,2}))?(?:\/(\d{2,4}))?/i);
    
    if (rangeMatch) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Extrair data inicial
      const startDay = parseInt(rangeMatch[1]);
      const startMonth = rangeMatch[2] ? parseInt(rangeMatch[2]) : currentMonth;
      const startYear = rangeMatch[3] ? parseInt(rangeMatch[3]) : currentYear;
      
      // Extrair data final
      const endDay = parseInt(rangeMatch[4]);
      const endMonth = rangeMatch[5] ? parseInt(rangeMatch[5]) : startMonth;
      const endYear = rangeMatch[6] ? parseInt(rangeMatch[6]) : startYear;
      
      const checkIn = new Date(startYear, startMonth - 1, startDay).toISOString().split('T')[0];
      const checkOut = new Date(endYear, endMonth - 1, endDay).toISOString().split('T')[0];
      
      return { checkIn, checkOut };
    }
    
    // Fallback para método básico
    return this.extractDates(message);
  }

  private static extractGuests(message: string): number | null {
    const guestMatch = message.match(/(\d+)\s*(?:pessoas?|hóspedes?|adultos?)/i);
    return guestMatch ? parseInt(guestMatch[1]) : null;
  }

  private static extractSearchCriteria(message: string): any {
    const locationMatch = message.match(/(?:em|para)\s+([a-záêîôõçúíéóü\s]+)/i);
    const guestsMatch = message.match(/(\d+)\s*(?:pessoas?|hóspedes?)/i);
    
    return {
      location: locationMatch ? locationMatch[1].trim() : null,
      guests: guestsMatch ? parseInt(guestsMatch[1]) : null
    };
  }

  private static detectVisitScheduling(message: string): any | null {
    const text = message.toLowerCase();
    
    // Detectar palavras de agendamento + data/hora
    const scheduleKeywords = ['agendar', 'marcar visita', 'visita para'];
    const hasScheduleIntent = scheduleKeywords.some(keyword => text.includes(keyword));
    
    if (!hasScheduleIntent) return null;
    
    // Extrair data e hora (implementação básica)
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?h?/);
    const dateMatch = message.match(/(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)/i);
    
    if (timeMatch || dateMatch) {
      return {
        date: IntentDetector.parseDate(dateMatch ? dateMatch[1] : 'amanhã'),
        time: timeMatch ? `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}` : '14:00',
        extraArgs: {}
      };
    }
    
    return null;
  }

  private static parseDate(dateStr: string): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Implementação básica - pode ser melhorada
    switch (dateStr.toLowerCase()) {
      case 'hoje':
        return today.toISOString().split('T')[0];
      case 'amanhã':
        return tomorrow.toISOString().split('T')[0];
      default:
        return tomorrow.toISOString().split('T')[0];
    }
  }

  private static isPaymentMethodMention(text: string): boolean {
    const paymentKeywords = [
      'pix', 'cartão', 'dinheiro', 'transferência',
      'débito', 'crédito', 'pagamento', 'pagar',
      'forma de pagamento', 'como pago', 'vou pagar'
    ];
    
    return paymentKeywords.some(keyword => text.includes(keyword));
  }

  private static extractPaymentMethod(message: string): string | null {
    const text = message.toLowerCase();
    
    if (text.includes('pix')) return 'pix';
    if (text.includes('cartão de crédito') || text.includes('crédito')) return 'credit_card';
    if (text.includes('cartão de débito') || text.includes('débito')) return 'debit_card';
    if (text.includes('dinheiro') || text.includes('espécie')) return 'cash';
    if (text.includes('transferência') || text.includes('ted') || text.includes('doc')) return 'bank_transfer';
    
    return null;
  }

  private static analyzeSentiment(text: string): any {
    const positiveWords = ['adorei', 'gostei', 'perfeito', 'excelente', 'muito bom'];
    const negativeWords = ['não gostei', 'não serve', 'muito caro', 'caro demais'];
    
    const hasPositive = positiveWords.some(word => text.includes(word));
    const hasNegative = negativeWords.some(word => text.includes(word));
    
    if (hasPositive) {
      return {
        outcome: 'interested',
        level: 'high',
        indicators: ['positive_sentiment']
      };
    }
    
    if (hasNegative) {
      return {
        outcome: 'not_interested',
        level: 'low',
        indicators: ['negative_sentiment']
      };
    }
    
    return {
      outcome: 'neutral',
      level: 'medium',
      indicators: ['neutral_sentiment']
    };
  }

  private static getDefaultCheckIn(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private static getDefaultCheckOut(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 4); // 3 dias depois
    return tomorrow.toISOString().split('T')[0];
  }
}

export default IntentDetector;