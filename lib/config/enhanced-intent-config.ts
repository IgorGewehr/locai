// Configuração do Enhanced Intent Detection - OTIMIZADA

export const ENHANCED_INTENT_CONFIG = {
  // Feature flag principal - SEMPRE ATIVO
  enabled: true,
  
  // Porcentagem de A/B testing - 100% COBERTURA
  // Todos usam Enhanced Intent Detection
  abTestPercentage: 100,
  
  // Threshold mínimo de confiança - AJUSTADO PARA 0.75
  // Melhor equilíbrio entre precisão e cobertura
  confidenceThreshold: 0.75,
  
  // Timeout em millisegundos - REDUZIDO PARA MELHOR PERFORMANCE
  timeout: 5000,
  
  // Modelo GPT a usar - MANTIDO
  model: 'gpt-4o-mini',
  
  // Temperatura do modelo - MANTIDA BAIXA PARA PRECISÃO
  temperature: 0.1,
  
  // Máximo de tokens na resposta - OTIMIZADO
  maxTokens: 200,
  
  // Log detalhado para debug - ATIVADO TEMPORARIAMENTE
  debugMode: true,
  
  // Funções disponíveis (pode desativar específicas se necessário)
  availableFunctions: {
    search_properties: true,
    calculate_price: true,
    get_property_details: true,
    send_property_media: true,
    create_reservation: true,
    cancel_reservation: true,
    modify_reservation: true,
    register_client: true,
    check_availability: true,
    schedule_visit: true,
    check_visit_availability: true,
    get_policies: true,
    generate_quote: true,
    create_transaction: true,
    create_lead: true,
    update_lead: true,
    classify_lead: true,
    update_lead_status: true,
    create_goal: true,
    analyze_performance: true
  }
};

// Helper para verificar se uma função está habilitada
export function isFunctionEnabled(functionName: string): boolean {
  return ENHANCED_INTENT_CONFIG.enabled && 
         ENHANCED_INTENT_CONFIG.availableFunctions[functionName as keyof typeof ENHANCED_INTENT_CONFIG.availableFunctions] === true;
}

// Helper para verificar se deve usar Enhanced baseado em A/B testing
export function shouldUseEnhanced(): boolean {
  if (!ENHANCED_INTENT_CONFIG.enabled) return false;
  if (ENHANCED_INTENT_CONFIG.abTestPercentage >= 100) return true;
  if (ENHANCED_INTENT_CONFIG.abTestPercentage <= 0) return false;
  
  return Math.random() * 100 < ENHANCED_INTENT_CONFIG.abTestPercentage;
}