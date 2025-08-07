// lib/ai-agent/conversation-state.ts
// Sistema de Estado Persistente para Sofia - Resolve problema de contexto perdido

import { logger } from '@/lib/utils/logger';

export interface ConversationState {
  clientPhone: string;
  tenantId: string;
  lastPropertyIds: string[];           // IDs das últimas propriedades mostradas
  currentPropertyId?: string;          // Propriedade em foco na conversa
  interestedPropertyId?: string;       // Propriedade que o cliente demonstrou interesse
  lastPriceCalculation?: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    details: any;
  };
  clientInfo?: {
    name?: string;
    email?: string;
    document?: string;
    id?: string;
  };
  // NOVO: Dados da busca para reutilizar
  searchCriteria?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    location?: string;
    maxPrice?: number;
    propertyType?: string;
  };
  conversationPhase: 'searching' | 'viewing_details' | 'calculating_price' | 'booking' | 'visiting';
  lastFunction: string;
  createdAt: Date;
  updatedAt: Date;
}

class ConversationStateManager {
  private static states = new Map<string, ConversationState>();

  private static getKey(clientPhone: string, tenantId: string): string {
    return `${tenantId}:${clientPhone}`;
  }

  /**
   * Obter ou criar estado da conversa
   */
  static getState(clientPhone: string, tenantId: string): ConversationState {
    const key = this.getKey(clientPhone, tenantId);
    
    if (!this.states.has(key)) {
      const newState: ConversationState = {
        clientPhone,
        tenantId,
        lastPropertyIds: [],
        conversationPhase: 'searching',
        lastFunction: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.states.set(key, newState);
      
      logger.info('🆕 [ConversationState] Novo estado criado', {
        clientPhone: clientPhone.substring(0, 6) + '***',
        tenantId,
        phase: newState.conversationPhase
      });
    }
    
    return this.states.get(key)!;
  }

  /**
   * Atualizar critérios de busca
   */
  static updateSearchCriteria(
    clientPhone: string,
    tenantId: string,
    criteria: Partial<ConversationState['searchCriteria']>
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.searchCriteria = {
      ...state.searchCriteria,
      ...criteria
    };
    
    logger.info('🔍 [ConversationState] Critérios de busca atualizados', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      criteria: state.searchCriteria
    });
  }

  /**
   * Atualizar estado após busca de propriedades
   */
  static updateAfterSearch(
    clientPhone: string, 
    tenantId: string, 
    propertyIds: string[]
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    logger.info('📥 [ConversationState] Recebendo atualização de busca', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertyIdsReceived: propertyIds.length,
      propertyIds: propertyIds.map(id => id?.substring(0, 10) + '...'),
      previousProperties: state.lastPropertyIds.length
    });
    
    state.lastPropertyIds = propertyIds;
    state.currentPropertyId = propertyIds[0]; // Primeira propriedade como foco
    state.conversationPhase = propertyIds.length > 0 ? 'viewing_details' : 'searching';
    state.lastFunction = 'search_properties';
    state.updatedAt = new Date();
    
    logger.info('🔄 [ConversationState] Estado atualizado após busca', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertiesFound: propertyIds.length,
      currentPropertyId: state.currentPropertyId?.substring(0, 10) + '...' || 'nenhuma',
      newPhase: state.conversationPhase,
      success: propertyIds.length > 0
    });
  }

  /**
   * Atualizar propriedade em foco
   */
  static setCurrentProperty(
    clientPhone: string, 
    tenantId: string, 
    propertyId: string,
    isInterested: boolean = false
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.currentPropertyId = propertyId;
    if (isInterested) {
      state.interestedPropertyId = propertyId;
    }
    state.updatedAt = new Date();
    
    logger.info('🎯 [ConversationState] Propriedade em foco atualizada', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertyId: propertyId.substring(0, 10) + '...',
      isInterested
    });
  }

  /**
   * Atualizar após cálculo de preço
   */
  static updateAfterPriceCalculation(
    clientPhone: string,
    tenantId: string,
    calculation: {
      propertyId: string;
      checkIn: string;
      checkOut: string;
      totalPrice: number;
      details: any;
    }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.lastPriceCalculation = calculation;
    state.conversationPhase = 'booking';
    state.lastFunction = 'calculate_price';
    state.updatedAt = new Date();
    
    logger.info('💰 [ConversationState] Preço calculado', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertyId: calculation.propertyId.substring(0, 10) + '...',
      totalPrice: calculation.totalPrice
    });
  }

  /**
   * Atualizar informações do cliente
   */
  static updateClientInfo(
    clientPhone: string,
    tenantId: string,
    clientInfo: { name?: string; email?: string; document?: string; id?: string }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.clientInfo = { ...state.clientInfo, ...clientInfo };
    state.lastFunction = 'register_client';
    state.updatedAt = new Date();
    
    logger.info('👤 [ConversationState] Cliente atualizado', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      hasName: !!state.clientInfo.name,
      hasDocument: !!state.clientInfo.document,
      hasId: !!state.clientInfo.id
    });
  }

  /**
   * Atualizar propriedade atual (alias para setCurrentProperty)
   */
  static updateCurrentProperty(
    clientPhone: string,
    tenantId: string,
    propertyId: string,
    isInterested: boolean = false
  ): void {
    this.setCurrentProperty(clientPhone, tenantId, propertyId, isInterested);
  }

  /**
   * Atualizar estado após agendamento de visita
   */
  static updateAfterVisitScheduled(
    clientPhone: string,
    tenantId: string,
    visitInfo: {
      visitId: string;
      propertyId: string;
      scheduledDate: string;
      scheduledTime: string;
    }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    state.currentPropertyId = visitInfo.propertyId;
    state.interestedPropertyId = visitInfo.propertyId; // Se agendou visita, demonstrou interesse
    state.conversationPhase = 'visiting';
    state.lastFunction = 'schedule_visit';
    state.updatedAt = new Date();
    
    logger.info('📅 [ConversationState] Visita agendada', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      visitId: visitInfo.visitId.substring(0, 10) + '...',
      propertyId: visitInfo.propertyId.substring(0, 10) + '...',
      scheduledDate: visitInfo.scheduledDate,
      scheduledTime: visitInfo.scheduledTime
    });
  }

  /**
   * Atualizar estado após criação de reserva
   */
  static updateAfterReservation(
    clientPhone: string,
    tenantId: string,
    reservationInfo: {
      reservationId: string;
      propertyId: string;
      clientId: string;
      checkIn: string;
      checkOut: string;
      totalAmount: number;
      status: string;
    }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    state.currentPropertyId = reservationInfo.propertyId;
    state.conversationPhase = 'booking';
    state.lastFunction = 'create_reservation';
    state.updatedAt = new Date();
    
    // Atualizar informações do cliente se disponível
    if (reservationInfo.clientId && !state.clientInfo?.id) {
      if (!state.clientInfo) state.clientInfo = {};
      state.clientInfo.id = reservationInfo.clientId;
    }
    
    this.saveState(state);
    
    logger.info('📝 [ConversationState] Reserva criada registrada', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      propertyId: reservationInfo.propertyId.substring(0, 10) + '...',
      reservationId: reservationInfo.reservationId.substring(0, 10) + '...',
      totalAmount: reservationInfo.totalAmount,
      status: reservationInfo.status
    });
  }

  /**
   * Resolver ID da propriedade baseado no contexto
   */
  static resolvePropertyId(
    clientPhone: string,
    tenantId: string,
    hint?: string | number
  ): string | null {
    const state = this.getState(clientPhone, tenantId);
    
    // Se tem hint numérico (primeira, segunda, etc)
    if (typeof hint === 'number' && hint >= 0 && hint < state.lastPropertyIds.length) {
      const resolvedId = state.lastPropertyIds[hint];
      this.setCurrentProperty(clientPhone, tenantId, resolvedId);
      return resolvedId;
    }
    
    // Se tem hint textual
    if (typeof hint === 'string') {
      const lowerHint = hint.toLowerCase();
      if (lowerHint.includes('primeira') || lowerHint.includes('primeiro')) {
        return state.lastPropertyIds[0] || null;
      }
      if (lowerHint.includes('segunda') || lowerHint.includes('segundo')) {
        return state.lastPropertyIds[1] || null;
      }
      if (lowerHint.includes('terceira') || lowerHint.includes('terceiro')) {
        return state.lastPropertyIds[2] || null;
      }
    }
    
    // Fallback: propriedade em foco atual
    if (state.currentPropertyId) {
      return state.currentPropertyId;
    }
    
    // Fallback: primeira propriedade da última busca
    if (state.lastPropertyIds.length > 0) {
      return state.lastPropertyIds[0];
    }
    
    logger.warn('⚠️ [ConversationState] Não foi possível resolver propertyId', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      hint,
      hasProperties: state.lastPropertyIds.length > 0,
      hasCurrent: !!state.currentPropertyId
    });
    
    return null;
  }

  /**
   * Limpar estado (para testes)
   */
  static clearState(clientPhone: string, tenantId: string): void {
    const key = this.getKey(clientPhone, tenantId);
    this.states.delete(key);
    
    logger.info('🗑️ [ConversationState] Estado limpo', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      tenantId
    });
  }

  /**
   * Atualizar estado após criação de transação financeira
   */
  static updateAfterTransaction(
    clientPhone: string,
    tenantId: string,
    transactionInfo: {
      transactionId: string;
      reservationId: string;
      advanceAmount: number;
      totalAmount: number;
      paymentMethod: string;
      status: string;
    }
  ): void {
    const state = this.getState(clientPhone, tenantId);
    
    // Atualizar fase da conversa - após criar transação, conversa está em fase de booking/pagamento
    state.conversationPhase = 'booking';
    state.lastFunction = 'create_transaction';
    state.updatedAt = new Date();
    
    // Adicionar informações da transação ao estado (pode ser útil para referências futuras)
    (state as any).lastTransaction = {
      transactionId: transactionInfo.transactionId,
      reservationId: transactionInfo.reservationId,
      advanceAmount: transactionInfo.advanceAmount,
      totalAmount: transactionInfo.totalAmount,
      paymentMethod: transactionInfo.paymentMethod,
      status: transactionInfo.status,
      createdAt: new Date().toISOString()
    };
    
    logger.info('💳 [ConversationState] Transação registrada', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      transactionId: transactionInfo.transactionId.substring(0, 10) + '...',
      reservationId: transactionInfo.reservationId.substring(0, 10) + '...',
      advanceAmount: transactionInfo.advanceAmount,
      paymentMethod: transactionInfo.paymentMethod,
      status: transactionInfo.status
    });
  }

  /**
   * Obter resumo do estado atual
   */
  static getStateSummary(clientPhone: string, tenantId: string): any {
    const state = this.getState(clientPhone, tenantId);
    
    return {
      phase: state.conversationPhase,
      hasProperties: state.lastPropertyIds.length > 0,
      currentProperty: state.currentPropertyId?.substring(0, 10) + '...' || null,
      interestedProperty: state.interestedPropertyId?.substring(0, 10) + '...' || null,
      hasClient: !!state.clientInfo?.name,
      hasPriceCalculation: !!state.lastPriceCalculation,
      lastFunction: state.lastFunction,
      propertiesCount: state.lastPropertyIds.length,
      hasTransaction: !!(state as any).lastTransaction
    };
  }
}

export default ConversationStateManager;