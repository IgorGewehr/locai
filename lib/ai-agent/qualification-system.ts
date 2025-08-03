// lib/ai-agent/qualification-system.ts
// Sistema de qualificação humanizada para Sofia

import { logger } from '@/lib/utils/logger';

export interface QualificationContext {
  hasLocation: boolean;
  hasGuests: boolean;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  hasAmenities: boolean;
  hasBudget: boolean;
  hasPropertyType: boolean;
  messageHistory: string[];
}

export interface QualificationQuestion {
  question: string;
  priority: number;
  field: string;
}

export class QualificationSystem {
  /**
   * Determina se deve fazer pergunta de qualificação
   */
  static shouldQualify(
    message: string,
    context: QualificationContext,
    isFirstInteraction: boolean
  ): boolean {
    const normalizedMessage = message.toLowerCase();
    
    // Padrões que indicam busca inicial
    const searchPatterns = [
      /quero (alugar|um|uma)/i,
      /procuro (apartamento|casa|imóvel)/i,
      /preciso de (um|uma)/i,
      /apartamento|casa|imóvel/i,
      /aluguel|alugar|temporada/i
    ];
    
    const hasSearchIntent = searchPatterns.some(p => p.test(normalizedMessage));
    
    // Se é primeira interação e tem intenção de busca, qualificar
    if (isFirstInteraction && hasSearchIntent) {
      return true;
    }
    
    // Se já tem propriedades no contexto, não qualificar mais
    if (context.messageHistory.some(m => m.includes('search_properties'))) {
      return false;
    }
    
    // Se faltam informações essenciais, qualificar
    const missingEssentials = !context.hasLocation || !context.hasGuests;
    
    return hasSearchIntent && missingEssentials;
  }
  
  /**
   * Gera pergunta de qualificação personalizada
   */
  static generateQualificationQuestion(
    message: string,
    context: QualificationContext,
    clientInfo: any
  ): string {
    const normalizedMessage = message.toLowerCase();
    const questions: QualificationQuestion[] = [];
    
    // Detectar o que já foi informado
    const hasCouple = /esposa|marido|casal|nós dois/i.test(message);
    const hasFamily = /família|filhos|crianças/i.test(message);
    const hasSolo = /sozinho|eu mesmo|apenas eu/i.test(message);
    const hasApto = /apto|apartamento/i.test(message);
    const hasCasa = /casa|chácara|sítio/i.test(message);
    
    // Gerar saudação baseada no contexto
    let greeting = '';
    const hour = new Date().getHours();
    
    if (hour < 12) {
      greeting = 'Bom dia! ';
    } else if (hour < 18) {
      greeting = 'Boa tarde! ';
    } else {
      greeting = 'Boa noite! ';
    }
    
    // Se tem nome do cliente
    if (clientInfo?.name) {
      greeting += `${clientInfo.name}, `;
    }
    
    // Construir resposta personalizada baseada no que foi dito
    let response = greeting;
    
    // Reconhecer o que foi mencionado
    if (hasCouple) {
      response += 'Que legal, vou encontrar o lugar perfeito para vocês dois! ';
      context.hasGuests = true; // Marca como 2 pessoas
    } else if (hasFamily) {
      response += 'Maravilha, vou buscar opções ideais para sua família! ';
    } else if (hasSolo) {
      response += 'Perfeito, vou encontrar o lugar ideal para você! ';
      context.hasGuests = true; // Marca como 1 pessoa
    } else if (hasApto) {
      response += 'Ótimo, temos excelentes apartamentos disponíveis! ';
      context.hasPropertyType = true;
    } else if (hasCasa) {
      response += 'Que bom, temos lindas casas disponíveis! ';
      context.hasPropertyType = true;
    } else {
      response += 'Será um prazer ajudar você a encontrar o imóvel perfeito! ';
    }
    
    // Adicionar perguntas baseadas no que falta
    const missingFields: string[] = [];
    
    if (!context.hasLocation) {
      missingFields.push('em qual cidade ou região vocês preferem');
    }
    
    if (!context.hasGuests && !hasCouple && !hasSolo) {
      missingFields.push('quantas pessoas vão se hospedar');
    }
    
    if (!context.hasPropertyType && !hasApto && !hasCasa) {
      missingFields.push('se preferem casa ou apartamento');
    }
    
    // Adicionar pergunta sobre comodidades de forma natural
    if (!context.hasAmenities) {
      missingFields.push('se buscam algo específico como piscina, churrasqueira ou ar-condicionado');
    }
    
    // Construir pergunta final
    if (missingFields.length > 0) {
      response += 'Para encontrar as melhores opções, pode me contar ';
      
      if (missingFields.length === 1) {
        response += missingFields[0] + '?';
      } else if (missingFields.length === 2) {
        response += missingFields[0] + ' e ' + missingFields[1] + '?';
      } else {
        const lastField = missingFields.pop();
        response += missingFields.join(', ') + ' e ' + lastField + '?';
      }
    } else {
      // Se tem todas as informações básicas, perguntar sobre datas
      if (!context.hasCheckIn || !context.hasCheckOut) {
        response += 'Já tem as datas de check-in e check-out em mente?';
      } else {
        // Se tem tudo, buscar direto
        response += 'Vou buscar as melhores opções para você agora mesmo! 🔍';
      }
    }
    
    // Adicionar emoji contextual
    if (response.includes('?')) {
      response = response.replace('?', '? 😊');
    }
    
    logger.info('🎯 [QualificationSystem] Pergunta gerada', {
      hasCouple,
      hasFamily,
      hasSolo,
      hasApto,
      hasCasa,
      missingFields: missingFields.length,
      responseLength: response.length
    });
    
    return response;
  }
  
  /**
   * Extrai informações da mensagem para contexto
   */
  static extractContextFromMessage(
    message: string,
    context: QualificationContext
  ): QualificationContext {
    const normalizedMessage = message.toLowerCase();
    
    // Detectar localização
    const locationPatterns = [
      /florianópolis|floripa/i,
      /são paulo|sp/i,
      /rio de janeiro|rj/i,
      /balneário camboriú|bc/i,
      /bombinhas/i,
      /praia/i,
      /centro/i,
      /litoral/i
    ];
    
    if (locationPatterns.some(p => p.test(normalizedMessage))) {
      context.hasLocation = true;
    }
    
    // Detectar número de hóspedes
    const guestPatterns = [
      /(\d+)\s*(pessoas?|hóspedes?)/i,
      /para\s*(\d+)/i,
      /somos\s*(\d+)/i,
      /esposa|marido|casal|nós dois/i, // 2 pessoas
      /família|filhos/i, // múltiplas pessoas
      /sozinho|apenas eu|só eu/i // 1 pessoa
    ];
    
    if (guestPatterns.some(p => p.test(normalizedMessage))) {
      context.hasGuests = true;
    }
    
    // Detectar datas
    if (/\d{1,2}[/-]\d{1,2}|\d{1,2}\s+de\s+\w+|próxim[ao]|semana|mês/i.test(normalizedMessage)) {
      if (normalizedMessage.includes('check') || normalizedMessage.includes('entrada')) {
        context.hasCheckIn = true;
      }
      if (normalizedMessage.includes('out') || normalizedMessage.includes('saída')) {
        context.hasCheckOut = true;
      }
    }
    
    // Detectar comodidades
    const amenityPatterns = [
      /piscina/i,
      /churrasqueira/i,
      /ar[\s-]condicionado/i,
      /garagem|estacionamento/i,
      /wi-?fi|internet/i,
      /pet|cachorro|gato/i,
      /vista|mar|praia/i
    ];
    
    if (amenityPatterns.some(p => p.test(normalizedMessage))) {
      context.hasAmenities = true;
    }
    
    // Detectar tipo de propriedade
    if (/apartamento|apto|flat|studio/i.test(normalizedMessage)) {
      context.hasPropertyType = true;
    }
    if (/casa|chácara|sítio|chalé/i.test(normalizedMessage)) {
      context.hasPropertyType = true;
    }
    
    return context;
  }
  
  /**
   * Verifica se a mensagem já contém informações suficientes para busca
   */
  static hasEnoughInfoForSearch(message: string): boolean {
    const normalizedMessage = message.toLowerCase();
    
    // Se tem localização específica
    const hasSpecificLocation = /florianópolis|são paulo|rio|balneário|bombinhas/i.test(normalizedMessage);
    
    // Se tem número de pessoas específico
    const hasSpecificGuests = /\d+\s*(pessoas?|hóspedes?)/.test(normalizedMessage) ||
                              /esposa|marido|casal|família|sozinho/i.test(normalizedMessage);
    
    // Se tem ambos, pode buscar direto
    return hasSpecificLocation && hasSpecificGuests;
  }
}

export default QualificationSystem;