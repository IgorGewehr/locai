// lib/ai-agent/fallback-system.ts
// Sistema de Fallback Inteligente para quando não há propriedades no banco

import { logger } from '@/lib/utils/logger';

export interface FallbackResponse {
  success: boolean;
  reply: string;
  suggestion: string;
  metadata: {
    fallbackType: string;
    originalFunction: string;
    reason: string;
  };
}

export class FallbackSystem {
  
  /**
   * Fallback para quando search_properties não encontra nada
   */
  static handleEmptySearch(searchArgs: any): FallbackResponse {
    logger.info('🔄 [Fallback] Lidando com busca vazia', { searchArgs });
    
    const guests = searchArgs.guests || 'para o número de hóspedes';
    const dates = searchArgs.checkIn && searchArgs.checkOut ? 
      `de ${searchArgs.checkIn} a ${searchArgs.checkOut}` : 'para as datas solicitadas';
    
    return {
      success: false,
      reply: `Infelizmente não encontrei nenhuma propriedade disponível ${guests} ${dates}. 😔

Mas não desanime! Posso te ajudar de outras formas:

✨ Tentar outras datas próximas
✨ Ajustar o número de hóspedes
✨ Buscar propriedades com diferentes comodidades
✨ Verificar opções com outros critérios

O que você prefere fazer? Estou aqui para encontrar a melhor solução! 🏠💖`,
      suggestion: 'adjust_search_criteria',
      metadata: {
        fallbackType: 'empty_search',
        originalFunction: 'search_properties',
        reason: 'Nenhuma propriedade encontrada na base de dados'
      }
    };
  }

  /**
   * Fallback para get_property_details quando não tem propriedades
   */
  static handleNoPropertiesForDetails(): FallbackResponse {
    logger.info('🔄 [Fallback] Lidando com pedido de detalhes sem propriedades');
    
    return {
      success: false,
      reply: `Para ver os detalhes de uma propriedade, primeiro preciso te mostrar as opções disponíveis! 😊

Vamos fazer uma busca? Me conte:
📅 Para quais datas você precisa? (check-in e check-out)
👥 Quantas pessoas vão se hospedar?
✨ Que comodidades são importantes? (piscina, ar-condicionado, churrasqueira...)
💰 Qual seu orçamento?

Com essas informações posso encontrar as melhores opções para você! 🏠✨`,
      suggestion: 'search_properties',
      metadata: {
        fallbackType: 'no_properties_for_details',
        originalFunction: 'get_property_details',
        reason: 'Não há propriedades no contexto para mostrar detalhes'
      }
    };
  }

  /**
   * Fallback para send_property_media quando não tem propriedades
   */
  static handleNoPropertiesForMedia(): FallbackResponse {
    logger.info('🔄 [Fallback] Lidando com pedido de fotos sem propriedades');
    
    return {
      success: false,
      reply: `Adoraria te mostrar fotos das propriedades! 📸 Mas primeiro preciso saber qual imóvel te interessa.

Vamos começar? Me conte:
📅 Quais são suas datas de check-in e check-out?
👥 Quantos hóspedes vão se hospedar?
✨ Quais comodidades são essenciais? (piscina, ar-condicionado, wi-fi...)
🏠 Apartamento, casa ou outro tipo de imóvel?

Assim que eu encontrar as opções, posso te enviar todas as fotos! ✨📷`,
      suggestion: 'search_properties',
      metadata: {
        fallbackType: 'no_properties_for_media',
        originalFunction: 'send_property_media',
        reason: 'Não há propriedades no contexto para enviar fotos'
      }
    };
  }

  /**
   * Fallback para calculate_price quando não tem propriedades
   */
  static handleNoPropertiesForPrice(): FallbackResponse {
    logger.info('🔄 [Fallback] Lidando com pedido de preço sem propriedades');
    
    return {
      success: false,
      reply: `Para calcular o preço preciso saber qual propriedade te interessa! 💰

Vamos fazer uma busca primeiro? Me conte:
📅 Quais as datas da sua estadia? (check-in e check-out)
👥 Quantas pessoas vão ficar?
✨ Que comodidades você precisa? (piscina, ar-condicionado, churrasqueira...)
🏠 Que tipo de imóvel você quer?

Com essas informações encontro as opções e calculo o preço exato para você! 😊✨`,
      suggestion: 'search_properties',
      metadata: {
        fallbackType: 'no_properties_for_price',
        originalFunction: 'calculate_price',
        reason: 'Não há propriedades no contexto para calcular preço'
      }
    };
  }

  /**
   * Fallback para funções de visita quando não tem propriedades
   */
  static handleNoPropertiesForVisit(): FallbackResponse {
    logger.info('🔄 [Fallback] Lidando com pedido de visita sem propriedades');
    
    return {
      success: false,
      reply: `Para agendar uma visita, primeiro preciso saber qual propriedade te interessa! 🏠

Que tal começarmos por uma busca? Me conte:
📅 Para quais datas você precisa do imóvel?
👥 Quantas pessoas vão se hospedar?
✨ Quais comodidades são importantes?
🏠 Apartamento, casa ou outro tipo?

Assim que encontrar as opções, posso verificar a disponibilidade para visita! 😊📅`,
      suggestion: 'search_properties',
      metadata: {
        fallbackType: 'no_properties_for_visit',
        originalFunction: 'check_visit_availability',
        reason: 'Não há propriedades no contexto para agendar visita'
      }
    };
  }

  /**
   * Fallback para reserva quando não tem propriedades
   */
  static handleNoPropertiesForReservation(): FallbackResponse {
    logger.info('🔄 [Fallback] Lidando com pedido de reserva sem propriedades');
    
    return {
      success: false,
      reply: `Fico feliz que você queira fazer uma reserva! 🎉 Mas primeiro preciso saber qual propriedade te interessa.

Vamos encontrar o imóvel perfeito? Me conte:
📅 Para quais datas você precisa? (check-in e check-out)
👥 Quantos hóspedes vão se hospedar?
✨ Que comodidades são essenciais? (piscina, ar-condicionado, wi-fi...)
💰 Qual seu orçamento aproximado?
🏠 Que tipo de propriedade você procura?

Assim que encontrar as opções ideais, posso fazer sua reserva na hora! ✨`,
      suggestion: 'search_properties',
      metadata: {
        fallbackType: 'no_properties_for_reservation',
        originalFunction: 'create_reservation',
        reason: 'Não há propriedades no contexto para fazer reserva'
      }
    };
  }

  /**
   * Fallback para timeout de funções
   */
  static handleFunctionTimeout(functionName: string): FallbackResponse {
    logger.warn('⏱️ [Fallback] Lidando com timeout de função', { functionName });
    
    const functionMessages = {
      search_properties: 'buscar propriedades',
      get_property_details: 'obter detalhes da propriedade',
      send_property_media: 'enviar fotos',
      calculate_price: 'calcular preço',
      register_client: 'cadastrar cliente',
      check_visit_availability: 'verificar disponibilidade para visita',
      schedule_visit: 'agendar visita',
      create_reservation: 'criar reserva',
      classify_lead_status: 'classificar interesse'
    };

    const actionDescription = functionMessages[functionName as keyof typeof functionMessages] || 'processar sua solicitação';

    return {
      success: false,
      reply: `Desculpe, estou tendo uma lentidão para ${actionDescription}. 😅

Pode tentar novamente em alguns segundos? Às vezes nossa conexão fica um pouco lenta, mas funciona perfeitamente na segunda tentativa! 

Estou aqui para te ajudar! 💪✨`,
      suggestion: 'retry',
      metadata: {
        fallbackType: 'function_timeout',
        originalFunction: functionName,
        reason: `Timeout ao executar ${functionName}`
      }
    };
  }

  /**
   * Fallback para erro geral de função
   */
  static handleFunctionError(functionName: string, error: any): FallbackResponse {
    logger.error('❌ [Fallback] Lidando com erro de função', { 
      functionName, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return {
      success: false,
      reply: `Ops! Tive um pequeno problema técnico. 😅 Mas não se preocupe, posso te ajudar de outras formas!

Que tal me contar novamente o que você precisa? Estou funcionando perfeitamente agora! 💪

Posso te ajudar com:
🔍 Buscar propriedades
📋 Ver detalhes e fotos
💰 Calcular preços
📅 Agendar visitas
🏆 Fazer reservas

O que você gostaria de fazer? 😊✨`,
      suggestion: 'restart_conversation',
      metadata: {
        fallbackType: 'function_error',
        originalFunction: functionName,
        reason: `Erro ao executar ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }

  /**
   * Fallback para quando GPT não executa nenhuma função
   */
  static handleNoFunctionExecuted(userMessage: string): FallbackResponse {
    logger.info('🔄 [Fallback] Nenhuma função executada pelo GPT', { 
      message: userMessage.substring(0, 50) 
    });

    const lowerMessage = userMessage.toLowerCase();
    
    // Detectar intenção e sugerir ação específica
    if (lowerMessage.includes('alugar') || lowerMessage.includes('apartamento') || lowerMessage.includes('casa')) {
      return {
        success: false,
        reply: `Entendi que você quer alugar um imóvel! 🏠 Vou te ajudar a encontrar a opção perfeita.

Me conte mais detalhes:
📅 Para quais datas você precisa? (check-in e check-out)
👥 Quantas pessoas vão ficar?
✨ Quais comodidades são importantes para vocês?
💰 Qual seu orçamento aproximado?

Com essas informações posso te mostrar as melhores opções! ✨`,
        suggestion: 'search_properties',
        metadata: {
          fallbackType: 'no_function_detected_search',
          originalFunction: 'search_properties',
          reason: 'GPT não executou função mas detectou intenção de busca'
        }
      };
    }

    return {
      success: false,
      reply: `Entendi sua mensagem! 😊 Para te ajudar melhor, pode me contar especificamente o que você precisa?

Posso te ajudar com:
🔍 Encontrar propriedades para alugar
📋 Ver detalhes e fotos de imóveis
💰 Calcular preços para suas datas
📅 Agendar visitas
🏆 Fazer reservas

O que você gostaria de fazer agora? ✨`,
      suggestion: 'clarify_intent',
      metadata: {
        fallbackType: 'no_function_detected_general',
        originalFunction: 'none',
        reason: 'GPT não executou nenhuma função'
      }
    };
  }
}

export default FallbackSystem;