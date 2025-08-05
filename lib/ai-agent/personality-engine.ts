// lib/ai-agent/personality-engine.ts
// Sistema de Personalização Dinâmica - Adaptação ao Perfil do Cliente

import { logger } from '@/lib/utils/logger';
import { ConversationState } from './conversation-state';

export interface ClientProfile {
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly';
  decisionMaking: 'quick' | 'analytical' | 'hesitant' | 'impulsive';
  pricesensitivity: 'low' | 'medium' | 'high' | 'very_high';
  informationNeed: 'minimal' | 'moderate' | 'detailed' | 'comprehensive';
  trustLevel: 'skeptical' | 'cautious' | 'trusting' | 'very_trusting';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  experienceLevel: 'first_time' | 'occasional' | 'experienced' | 'expert';
}

export interface PersonalityAdaptation {
  tone: 'professional' | 'friendly' | 'enthusiastic' | 'supportive' | 'consultative';
  responseLength: 'brief' | 'moderate' | 'detailed' | 'comprehensive';
  technicalLevel: 'simple' | 'standard' | 'advanced' | 'expert';
  persuasionStyle: 'soft' | 'moderate' | 'assertive' | 'consultative';
  urgencyHandling: 'relaxed' | 'standard' | 'proactive' | 'immediate';
  trustBuilding: 'minimal' | 'standard' | 'enhanced' | 'maximum';
}

export interface PersonalizedResponse {
  adaptedMessage: string;
  reasoning: string;
  personalityUsed: PersonalityAdaptation;
  confidenceLevel: number;
  adaptationsMade: string[];
}

export class PersonalityEngine {
  private static instance: PersonalityEngine;
  
  // Cache de perfis de clientes
  private clientProfiles = new Map<string, ClientProfile>();
  
  // Templates de personalidade
  private personalityTemplates = {
    professional: {
      greeting: ["Olá", "Bom dia/tarde", "Seja bem-vindo(a)"],
      enthusiasm: ["Perfeito", "Excelente", "Ótima escolha"],
      closing: ["Fico à disposição", "Qualquer dúvida, estarei aqui"],
      formality: "formal"
    },
    friendly: {
      greeting: ["Oi", "Olá", "E aí"],
      enthusiasm: ["Que legal!", "Adorei!", "Perfeito!"],
      closing: ["Qualquer coisa me chama!", "Estou aqui pra te ajudar!"],
      formality: "casual"
    },
    enthusiastic: {
      greeting: ["Oi! 😊", "Olá! Que bom te ver aqui!", "E aí! 🎉"],
      enthusiasm: ["Incrível! ✨", "Que máximo! 🚀", "Perfeito! 🏆"],
      closing: ["Vamos fazer acontecer! 💪", "Mal posso esperar! 🎯"],
      formality: "very_casual"
    },
    supportive: {
      greeting: ["Olá", "Fico feliz em te ajudar", "Vamos encontrar a solução ideal"],
      enthusiasm: ["Entendo perfeitamente", "Vamos resolver isso juntos", "Estou aqui para ajudar"],
      closing: ["Não se preocupe, vamos encontrar", "Conte comigo"],
      formality: "supportive"
    },
    consultative: {
      greeting: ["Olá", "Vamos analisar suas necessidades", "Preciso entender melhor"],
      enthusiasm: ["Interessante", "Vamos avaliar", "Essa é uma boa opção"],
      closing: ["Vamos analisar os próximos passos", "Precisa de mais informações?"],
      formality: "analytical"
    }
  };

  static getInstance(): PersonalityEngine {
    if (!this.instance) {
      this.instance = new PersonalityEngine();
    }
    return this.instance;
  }

  /**
   * Analisar perfil do cliente baseado na conversa
   */
  analyzeClientProfile(
    clientPhone: string,
    conversationHistory: any[],
    currentMessage: string,
    conversationState: ConversationState
  ): ClientProfile {
    logger.info('🎭 [PersonalityEngine] Analisando perfil do cliente', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      messagesCount: conversationHistory.length,
      currentPhase: conversationState.conversationPhase
    });

    // Verificar cache primeiro
    const cachedProfile = this.clientProfiles.get(clientPhone);
    if (cachedProfile) {
      // Atualizar perfil baseado na nova mensagem
      return this.updateProfileWithNewMessage(cachedProfile, currentMessage, conversationState);
    }

    // Criar novo perfil
    const profile: ClientProfile = {
      communicationStyle: this.analyzeCommunicationStyle(conversationHistory, currentMessage),
      decisionMaking: this.analyzeDecisionMaking(conversationHistory, conversationState),
      pricesensitivity: this.analyzePriceSensitivity(conversationHistory, currentMessage),
      informationNeed: this.analyzeInformationNeed(conversationHistory, currentMessage),
      trustLevel: this.analyzeTrustLevel(conversationHistory, conversationState),
      urgency: this.analyzeUrgency(conversationHistory, currentMessage),
      experienceLevel: this.analyzeExperienceLevel(conversationHistory, currentMessage)
    };

    // Armazenar no cache
    this.clientProfiles.set(clientPhone, profile);

    logger.info('✅ [PersonalityEngine] Perfil do cliente criado', {
      clientPhone: clientPhone.substring(0, 6) + '***',
      communicationStyle: profile.communicationStyle,
      decisionMaking: profile.decisionMaking,
      urgency: profile.urgency
    });

    return profile;
  }

  /**
   * Adaptar resposta baseada no perfil do cliente
   */
  adaptResponse(
    originalMessage: string,
    clientProfile: ClientProfile,
    conversationContext: any
  ): PersonalizedResponse {
    logger.info('🎨 [PersonalityEngine] Adaptando resposta', {
      originalLength: originalMessage.length,
      communicationStyle: clientProfile.communicationStyle,
      urgency: clientProfile.urgency
    });

    // Determinar personalidade ideal
    const personality = this.selectPersonality(clientProfile);
    
    // Aplicar adaptações
    const adaptations: string[] = [];
    let adaptedMessage = originalMessage;

    // 1. Adaptar tom e formalidade
    adaptedMessage = this.adaptTone(adaptedMessage, personality, clientProfile);
    adaptations.push('tom');

    // 2. Adaptar comprimento da resposta
    adaptedMessage = this.adaptLength(adaptedMessage, personality, clientProfile);
    adaptations.push('comprimento');

    // 3. Adaptar nível técnico
    adaptedMessage = this.adaptTechnicalLevel(adaptedMessage, personality, clientProfile);
    adaptations.push('nível técnico');

    // 4. Adaptar urgência
    adaptedMessage = this.adaptUrgency(adaptedMessage, personality, clientProfile);
    adaptations.push('urgência');

    // 5. Adicionar elementos de construção de confiança
    adaptedMessage = this.addTrustElements(adaptedMessage, personality, clientProfile);
    adaptations.push('confiança');

    // 6. Adaptar estilo de persuasão
    adaptedMessage = this.adaptPersuasionStyle(adaptedMessage, personality, clientProfile);
    adaptations.push('persuasão');

    const confidence = this.calculateAdaptationConfidence(clientProfile, adaptations);

    const reasoning = this.generateAdaptationReasoning(clientProfile, personality, adaptations);

    logger.info('✅ [PersonalityEngine] Resposta adaptada', {
      originalLength: originalMessage.length,
      adaptedLength: adaptedMessage.length,
      adaptationsMade: adaptations.length,
      confidence: Math.round(confidence * 100),
      personalityUsed: personality.tone
    });

    return {
      adaptedMessage,
      reasoning,
      personalityUsed: personality,
      confidenceLevel: confidence,
      adaptationsMade: adaptations
    };
  }

  // ===== ANÁLISE DE PERFIL =====

  private analyzeCommunicationStyle(history: any[], currentMessage: string): ClientProfile['communicationStyle'] {
    const message = currentMessage.toLowerCase();
    
    // Formal: linguagem rebuscada, tratamento formal
    if (message.includes('senhor') || message.includes('senhora') || 
        message.includes('poderia') || message.includes('gostaria')) {
      return 'formal';
    }
    
    // Technical: termos técnicos, especificações detalhadas
    if (message.includes('especificação') || message.includes('metragem') ||
        message.includes('configuração') || message.includes('infraestrutura')) {
      return 'technical';
    }
    
    // Casual: gírias, abreviações, informal
    if (message.includes('blz') || message.includes('vlw') || 
        message.includes('pô') || message.includes('cara')) {
      return 'casual';
    }
    
    return 'friendly'; // Padrão
  }

  private analyzeDecisionMaking(history: any[], state: ConversationState): ClientProfile['decisionMaking'] {
    // Analytical: muitas perguntas, comparações
    if (history.length > 5 && state.conversationPhase === 'viewing_details') {
      return 'analytical';
    }
    
    // Quick: poucas mensagens, decisões rápidas
    if (history.length <= 3 && state.conversationPhase === 'booking') {
      return 'quick';
    }
    
    // Hesitant: muitas dúvidas, vai e volta
    if (history.length > 8 && state.conversationPhase === 'viewing_details') {
      return 'hesitant';
    }
    
    return 'analytical'; // Padrão seguro
  }

  private analyzePriceSensitivity(history: any[], currentMessage: string): ClientProfile['priceS

ivity'] {
    const message = currentMessage.toLowerCase();
    
    // Very High: foca muito em preço
    if (message.includes('barato') || message.includes('desconto') || 
        message.includes('promoção') || message.includes('mais em conta')) {
      return 'very_high';
    }
    
    // High: menciona orçamento limitado
    if (message.includes('orçamento') || message.includes('preço') && 
        (message.includes('limite') || message.includes('máximo'))) {
      return 'high';
    }
    
    // Low: não menciona preço ou fala de qualidade
    if (message.includes('qualidade') || message.includes('luxo') ||
        message.includes('premium') || !message.includes('preço')) {
      return 'low';
    }
    
    return 'medium'; // Padrão
  }

  private analyzeInformationNeed(history: any[], currentMessage: string): ClientProfile['informationNeed'] {
    const questionCount = (currentMessage.match(/\?/g) || []).length;
    const detailWords = ['detalhes', 'especificação', 'informação', 'explicar', 'como funciona'];
    const hasDetailRequest = detailWords.some(word => currentMessage.toLowerCase().includes(word));
    
    if (questionCount >= 3 || hasDetailRequest) {
      return 'comprehensive';
    }
    
    if (questionCount === 2) {
      return 'detailed';
    }
    
    if (questionCount === 1) {
      return 'moderate';
    }
    
    return 'minimal';
  }

  private analyzeTrustLevel(history: any[], state: ConversationState): ClientProfile['trustLevel'] {
    // Skeptical: muitas verificações, dúvidas sobre legitimidade
    const skepticalWords = ['confiável', 'seguro', 'garantia', 'verificado'];
    const hasSkepticalLanguage = history.some(msg => 
      skepticalWords.some(word => msg.content?.toLowerCase().includes(word))
    );
    
    if (hasSkepticalLanguage) {
      return 'skeptical';
    }
    
    // Very Trusting: aceita rapidamente sem muitas perguntas
    if (history.length <= 3 && state.conversationPhase === 'booking') {
      return 'very_trusting';
    }
    
    return 'cautious'; // Padrão seguro
  }

  private analyzeUrgency(history: any[], currentMessage: string): ClientProfile['urgency'] {
    const urgentWords = ['urgente', 'rápido', 'hoje', 'agora', 'preciso logo'];
    const hasUrgentLanguage = urgentWords.some(word => 
      currentMessage.toLowerCase().includes(word)
    );
    
    if (hasUrgentLanguage) {
      return 'urgent';
    }
    
    // Medium urgency para perguntas diretas
    if (currentMessage.includes('quando') || currentMessage.includes('disponível')) {
      return 'medium';
    }
    
    return 'low'; // Padrão
  }

  private analyzeExperienceLevel(history: any[], currentMessage: string): ClientProfile['experienceLevel'] {
    const beginnerWords = ['primeira vez', 'não sei', 'como funciona', 'nunca aluguei'];
    const expertWords = ['já aluguei', 'conheço', 'sempre uso', 'experiência'];
    
    const isBeginnerLanguage = beginnerWords.some(word => 
      currentMessage.toLowerCase().includes(word)
    );
    
    const isExpertLanguage = expertWords.some(word => 
      currentMessage.toLowerCase().includes(word)
    );
    
    if (isBeginnerLanguage) {
      return 'first_time';
    }
    
    if (isExpertLanguage) {
      return 'experienced';
    }
    
    return 'occasional'; // Padrão
  }

  // ===== SELEÇÃO DE PERSONALIDADE =====

  private selectPersonality(profile: ClientProfile): PersonalityAdaptation {
    // Lógica de seleção baseada no perfil
    let tone: PersonalityAdaptation['tone'] = 'friendly';
    let responseLength: PersonalityAdaptation['responseLength'] = 'moderate';
    let technicalLevel: PersonalityAdaptation['technicalLevel'] = 'standard';
    let persuasionStyle: PersonalityAdaptation['persuasionStyle'] = 'moderate';
    let urgencyHandling: PersonalityAdaptation['urgencyHandling'] = 'standard';
    let trustBuilding: PersonalityAdaptation['trustBuilding'] = 'standard';

    // Adaptar tom baseado no estilo de comunicação
    switch (profile.communicationStyle) {
      case 'formal':
        tone = 'professional';
        break;
      case 'casual':
        tone = 'friendly';
        break;
      case 'technical':
        tone = 'consultative';
        technicalLevel = 'advanced';
        break;
      default:
        tone = 'friendly';
    }

    // Adaptar comprimento baseado na necessidade de informação
    switch (profile.informationNeed) {
      case 'minimal':
        responseLength = 'brief';
        break;
      case 'comprehensive':
        responseLength = 'comprehensive';
        break;
      case 'detailed':
        responseLength = 'detailed';
        break;
      default:
        responseLength = 'moderate';
    }

    // Adaptar urgência
    switch (profile.urgency) {
      case 'urgent':
        urgencyHandling = 'immediate';
        responseLength = 'brief';
        break;
      case 'high':
        urgencyHandling = 'proactive';
        break;
      case 'low':
        urgencyHandling = 'relaxed';
        break;
    }

    // Adaptar construção de confiança
    switch (profile.trustLevel) {
      case 'skeptical':
        trustBuilding = 'maximum';
        tone = 'professional';
        break;
      case 'very_trusting':
        trustBuilding = 'minimal';
        break;
      default:
        trustBuilding = 'standard';
    }

    // Adaptar persuasão baseada na tomada de decisão
    switch (profile.decisionMaking) {
      case 'quick':
        persuasionStyle = 'assertive';
        break;
      case 'hesitant':
        persuasionStyle = 'soft';
        tone = 'supportive';
        break;
      case 'analytical':
        persuasionStyle = 'consultative';
        technicalLevel = 'advanced';
        break;
    }

    return {
      tone,
      responseLength,
      technicalLevel,
      persuasionStyle,
      urgencyHandling,
      trustBuilding
    };
  }

  // ===== ADAPTAÇÕES =====

  private adaptTone(message: string, personality: PersonalityAdaptation, profile: ClientProfile): string {
    const templates = this.personalityTemplates[personality.tone] || this.personalityTemplates.friendly;
    
    // Substituir saudações genéricas
    let adapted = message.replace(/^(oi|olá|ola)/i, templates.greeting[0]);
    
    // Adicionar entusiasmo apropriado
    if (message.includes('Perfeito') || message.includes('Excelente')) {
      const enthusiasm = templates.enthusiasm[Math.floor(Math.random() * templates.enthusiasm.length)];
      adapted = adapted.replace(/(Perfeito|Excelente)/g, enthusiasm);
    }
    
    return adapted;
  }

  private adaptLength(message: string, personality: PersonalityAdaptation, profile: ClientProfile): string {
    switch (personality.responseLength) {
      case 'brief':
        // Manter apenas o essencial
        return message.split('.')[0] + '.';
      
      case 'comprehensive':
        // Adicionar mais detalhes e contexto
        if (!message.includes('Qualquer dúvida')) {
          return message + ' Qualquer dúvida ou informação adicional que precisar, estarei aqui para ajudar!';
        }
        return message;
      
      case 'detailed':
        // Adicionar explicações
        if (message.includes('propriedades')) {
          return message + ' Posso te dar mais detalhes sobre qualquer uma delas.';
        }
        return message;
      
      default:
        return message;
    }
  }

  private adaptTechnicalLevel(message: string, personality: PersonalityAdaptation, profile: ClientProfile): string {
    switch (personality.technicalLevel) {
      case 'simple':
        // Simplificar termos técnicos
        return message
          .replace(/propriedades/g, 'imóveis')
          .replace(/especificações/g, 'detalhes')
          .replace(/configuração/g, 'como está organizado');
      
      case 'advanced':
        // Adicionar termos mais técnicos quando apropriado
        return message
          .replace(/apartamento/g, 'unidade residencial')
          .replace(/quartos/g, 'dormitórios');
      
      default:
        return message;
    }
  }

  private adaptUrgency(message: string, personality: PersonalityAdaptation, profile: ClientProfile): string {
    switch (personality.urgencyHandling) {
      case 'immediate':
        return message + ' Vou acelerar o processo para você!';
      
      case 'proactive':
        return message + ' Vamos resolver isso rapidinho!';
      
      case 'relaxed':
        return message + ' Sem pressa, podemos ir no seu ritmo.';
      
      default:
        return message;
    }
  }

  private addTrustElements(message: string, personality: PersonalityAdaptation, profile: ClientProfile): string {
    switch (personality.trustBuilding) {
      case 'maximum':
        return message + ' Todos os nossos imóveis são verificados e seguros.';
      
      case 'enhanced':
        return message + ' Pode contar comigo para todas as informações!';
      
      default:
        return message;
    }
  }

  private adaptPersuasionStyle(message: string, personality: PersonalityAdaptation, profile: ClientProfile): string {
    switch (personality.persuasionStyle) {
      case 'soft':
        // Linguagem mais suave, menos pressão
        return message.replace(/deve|precisa/g, 'poderia').replace(/!+/g, '.');
      
      case 'assertive':
        // Mais direto e confiante
        return message + ' Essa é realmente uma excelente oportunidade!';
      
      case 'consultative':
        // Abordagem consultiva
        return message + ' O que você acha? Faz sentido para suas necessidades?';
      
      default:
        return message;
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private updateProfileWithNewMessage(
    profile: ClientProfile, 
    newMessage: string, 
    state: ConversationState
  ): ClientProfile {
    // Atualizar aspectos do perfil baseado na nova mensagem
    const updatedProfile = { ...profile };
    
    // Atualizar urgência se mudou
    const newUrgency = this.analyzeUrgency([], newMessage);
    if (newUrgency !== 'low') {
      updatedProfile.urgency = newUrgency;
    }
    
    return updatedProfile;
  }

  private calculateAdaptationConfidence(profile: ClientProfile, adaptations: string[]): number {
    let confidence = 0.5; // Base
    
    // Mais adaptações = maior confiança
    confidence += adaptations.length * 0.1;
    
    // Perfil mais definido = maior confiança
    if (profile.communicationStyle !== 'friendly') confidence += 0.1;
    if (profile.urgency !== 'low') confidence += 0.1;
    if (profile.trustLevel !== 'cautious') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateAdaptationReasoning(
    profile: ClientProfile, 
    personality: PersonalityAdaptation, 
    adaptations: string[]
  ): string {
    return `Adaptações baseadas no perfil: ${profile.communicationStyle} (${profile.urgency} urgência). ` +
           `Personalidade aplicada: ${personality.tone}. ` +
           `Adaptações realizadas: ${adaptations.join(', ')}.`;
  }

  // ===== MÉTODOS PÚBLICOS ADICIONAIS =====

  /**
   * Obter perfil de cliente existente
   */
  getClientProfile(clientPhone: string): ClientProfile | null {
    return this.clientProfiles.get(clientPhone) || null;
  }

  /**
   * Limpar perfil de cliente
   */
  clearClientProfile(clientPhone: string): void {
    this.clientProfiles.delete(clientPhone);
    logger.info('🗑️ [PersonalityEngine] Perfil do cliente limpo', {
      clientPhone: clientPhone.substring(0, 6) + '***'
    });
  }

  /**
   * Obter estatísticas dos perfis
   */
  getProfileStats(): {
    totalProfiles: number;
    communicationStyles: Record<string, number>;
    urgencyLevels: Record<string, number>;
  } {
    const profiles = Array.from(this.clientProfiles.values());
    
    const communicationStyles: Record<string, number> = {};
    const urgencyLevels: Record<string, number> = {};
    
    profiles.forEach(profile => {
      communicationStyles[profile.communicationStyle] = 
        (communicationStyles[profile.communicationStyle] || 0) + 1;
      urgencyLevels[profile.urgency] = 
        (urgencyLevels[profile.urgency] || 0) + 1;
    });
    
    return {
      totalProfiles: profiles.length,
      communicationStyles,
      urgencyLevels
    };
  }
}

export const personalityEngine = PersonalityEngine.getInstance();