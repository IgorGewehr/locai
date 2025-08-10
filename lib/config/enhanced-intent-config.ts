// Configuração do Enhanced Intent Detection

export const ENHANCED_INTENT_CONFIG = {
  // Feature flag principal - true para ativar, false para desativar completamente
  enabled: true,
  
  // Porcentagem de A/B testing (0-100)
  // 100 = sempre usa Enhanced
  // 0 = nunca usa Enhanced
  abTestPercentage: 100,
  
  // Threshold mínimo de confiança para executar função
  confidenceThreshold: 0.8,
  
  // Timeout em millisegundos
  timeout: 10000,
  
  // Modelo GPT a usar
  model: 'gpt-4o-mini',
  
  // Temperatura do modelo (0-1)
  temperature: 0.1,
  
  // Máximo de tokens na resposta
  maxTokens: 300,
  
  // Log detalhado para debug
  debugMode: false,
  
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