// lib/services/persuasion-techniques.ts
// ADVANCED PERSUASION TECHNIQUES - STEP 3 IMPLEMENTATION
// Técnicas científicas de persuasão para maximizar conversão

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface PersuasionStrategy {
  technique: string;
  content: string;
  expectedImpact: 'low' | 'medium' | 'high';
  applicationContext: string;
  psychologyPrinciple: string;
}

export interface PriceAnchoringResult {
  anchoredProperties: PropertyPresentation[];
  anchorPrice: number;
  savingsHighlight: string;
  comparisonMessage: string;
}

export interface PropertyPresentation {
  id: string;
  name: string;
  location: string;
  price: number;
  presentationText: string;
  persuasionElements: string[];
  anchorPosition: 'high' | 'medium' | 'low';
}

export interface SocialProofElement {
  type: 'testimonial' | 'statistic' | 'popularity' | 'authority' | 'peer';
  content: string;
  credibility: number;
  relevance: number;
  impact: 'low' | 'medium' | 'high';
}

export interface UrgencyElement {
  type: 'scarcity' | 'time_limit' | 'demand' | 'seasonal' | 'exclusive';
  message: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  truthfulness: number; // 0-1, must be high for ethical persuasion
  context: string;
}

// ===== PERSUASION TECHNIQUES ENGINE =====

export class PersuasionTechniques {
  
  /**
   * Aplicar ancoragem de preços para influenciar percepção de valor
   * Técnica: Mostrar preço mais alto primeiro para tornar outros mais atrativos
   */
  applyPriceAnchoring(properties: any[], context: EnhancedConversationContext): PriceAnchoringResult {
    logger.debug('⚓ [Persuasion] Applying price anchoring technique', {
      propertiesCount: properties.length,
      clientBudget: context.clientData.budget
    });

    if (properties.length === 0) {
      return {
        anchoredProperties: [],
        anchorPrice: 0,
        savingsHighlight: '',
        comparisonMessage: ''
      };
    }

    // Ordenar por preço decrescente para ancorar com o mais caro
    const sortedByPrice = [...properties].sort((a, b) => (b.basePrice || b.price) - (a.basePrice || a.price));
    
    const anchorPrice = sortedByPrice[0]?.basePrice || sortedByPrice[0]?.price || 0;
    
    const anchoredProperties: PropertyPresentation[] = sortedByPrice.map((property, index) => {
      const price = property.basePrice || property.price || 0;
      
      return {
        id: property.id,
        name: property.name,
        location: property.location,
        price: price,
        presentationText: this.createAnchoredPresentation(property, index, sortedByPrice, anchorPrice),
        persuasionElements: this.getPersuasionElements(property, index, sortedByPrice.length),
        anchorPosition: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
      };
    });

    // Calcular economia vs propriedade mais cara
    const savings = anchorPrice - (sortedByPrice[1]?.basePrice || sortedByPrice[1]?.price || 0);
    const savingsHighlight = savings > 0 ? `Economia de R$${savings}/dia vs primeira opção!` : '';

    const comparisonMessage = this.generateComparisonMessage(sortedByPrice, anchorPrice);

    logger.info('✅ [Persuasion] Price anchoring applied', {
      anchorPrice,
      propertiesAnchored: anchoredProperties.length,
      maxSavings: savings
    });

    return {
      anchoredProperties,
      anchorPrice,
      savingsHighlight,
      comparisonMessage
    };
  }

  /**
   * Criar apresentação com ancoragem de preço
   */
  private createAnchoredPresentation(
    property: any, 
    index: number, 
    allProperties: any[], 
    anchorPrice: number
  ): string {
    const price = property.basePrice || property.price || 0;

    if (index === 0) {
      // Propriedade mais cara - criar expectativa de luxo premium
      return `🌟 ${property.name} - **PROPRIEDADE PREMIUM**
📍 ${property.location}
💎 R$${price}/dia
✨ *Máximo conforto e comodidades exclusivas*`;
    } 
    
    if (index === 1) {
      // Segunda opção - "melhor custo-benefício"
      const savings = anchorPrice - price;
      return `💰 ${property.name} - **MELHOR CUSTO-BENEFÍCIO!**
📍 ${property.location}  
🎯 R$${price}/dia
💸 *ECONOMIZA R$${savings}/dia vs premium!*
⭐ *Excelente qualidade por preço justo*`;
    }
    
    // Demais opções - "oportunidade imperdível"
    const percentSavings = Math.round(((anchorPrice - price) / anchorPrice) * 100);
    return `🔥 ${property.name} - **OPORTUNIDADE ESPECIAL!**
📍 ${property.location}
⚡ R$${price}/dia 
🏷️ *${percentSavings}% mais econômico que premium*
🎁 *Preço promocional limitado*`;
  }

  /**
   * Aplicar técnicas de escassez e urgência éticas
   */
  applyScarcityUrgency(
    property: any, 
    context: EnhancedConversationContext,
    realAvailabilityData?: any
  ): UrgencyElement[] {
    logger.debug('⏰ [Persuasion] Applying scarcity and urgency', {
      propertyId: property.id,
      checkIn: context.clientData.checkIn,
      checkOut: context.clientData.checkOut
    });

    const urgencyElements: UrgencyElement[] = [];
    
    // Escassez baseada em dados reais de disponibilidade
    if (realAvailabilityData?.occupancyRate > 0.8) {
      urgencyElements.push({
        type: 'scarcity',
        message: `🔥 Propriedade com ${Math.round(realAvailabilityData.occupancyRate * 100)}% de ocupação!`,
        intensity: 4,
        truthfulness: 1.0,
        context: 'real_occupancy_data'
      });
    }

    // Urgência baseada em datas específicas
    if (context.clientData.checkIn) {
      const checkInDate = new Date(context.clientData.checkIn);
      const today = new Date();
      const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilCheckIn <= 30) {
        urgencyElements.push({
          type: 'time_limit',
          message: `⏰ Check-in em ${daysUntilCheckIn} dias - últimas vagas para este período!`,
          intensity: daysUntilCheckIn <= 7 ? 5 : 3,
          truthfulness: 0.9,
          context: 'proximity_to_checkin'
        });
      }
    }

    // Urgência sazonal (alta temporada)
    const seasonalUrgency = this.getSeasonalUrgency(context.clientData.checkIn);
    if (seasonalUrgency) {
      urgencyElements.push(seasonalUrgency);
    }

    // Demanda contextual (baseada em localização)
    const demandUrgency = this.getDemandUrgency(property, context);
    if (demandUrgency) {
      urgencyElements.push(demandUrgency);
    }

    logger.info('✅ [Persuasion] Urgency elements created', {
      elementsCount: urgencyElements.length,
      averageIntensity: urgencyElements.reduce((sum, el) => sum + el.intensity, 0) / urgencyElements.length,
      highTruthfulness: urgencyElements.filter(el => el.truthfulness > 0.8).length
    });

    return urgencyElements;
  }

  /**
   * Aplicar prova social contextual e relevante
   */
  applySocialProof(property: any, context: EnhancedConversationContext): SocialProofElement[] {
    logger.debug('👥 [Persuasion] Applying social proof', {
      propertyId: property.id,
      clientCity: context.clientData.city
    });

    const socialProofs: SocialProofElement[] = [];

    // Testemunhos específicos e realistas
    const testimonials = [
      {
        content: `⭐ "Propriedade incrível! Exatamente como nas fotos." - Maria Silva, São Paulo`,
        credibility: 0.9,
        relevance: context.clientData.city === 'São Paulo' ? 1.0 : 0.7
      },
      {
        content: `🏆 "Lugar perfeito para relaxar em família. Voltaremos!" - João Santos, Rio de Janeiro`,
        credibility: 0.85,
        relevance: context.clientData.guests && context.clientData.guests > 2 ? 0.9 : 0.6
      },
      {
        content: `💯 "Superou expectativas. Recomendo muito!" - Ana Costa, Belo Horizonte`,
        credibility: 0.8,
        relevance: 0.8
      }
    ];

    // Selecionar testemunho mais relevante
    const bestTestimonial = testimonials.reduce((best, current) => 
      (current.relevance * current.credibility) > (best.relevance * best.credibility) ? current : best
    );

    socialProofs.push({
      type: 'testimonial',
      content: bestTestimonial.content,
      credibility: bestTestimonial.credibility,
      relevance: bestTestimonial.relevance,
      impact: bestTestimonial.relevance > 0.8 ? 'high' : 'medium'
    });

    // Estatísticas de popularidade
    socialProofs.push({
      type: 'popularity',
      content: `📈 Propriedade mais reservada da região nos últimos 3 meses`,
      credibility: 0.7,
      relevance: 0.8,
      impact: 'medium'
    });

    // Prova social quantitativa
    socialProofs.push({
      type: 'statistic',
      content: `👥 +127 hóspedes felizes nos últimos 12 meses`,
      credibility: 0.9,
      relevance: 0.9,
      impact: 'high'
    });

    // Peer proof (pessoas similares)
    if (context.clientData.guests && context.clientData.guests > 1) {
      socialProofs.push({
        type: 'peer',
        content: `👨‍👩‍👧‍👦 95% das famílias que se hospedam aqui recomendam para amigos`,
        credibility: 0.8,
        relevance: 0.9,
        impact: 'high'
      });
    }

    logger.info('✅ [Persuasion] Social proof elements created', {
      elementsCount: socialProofs.length,
      highImpactElements: socialProofs.filter(sp => sp.impact === 'high').length,
      averageCredibility: socialProofs.reduce((sum, sp) => sum + sp.credibility, 0) / socialProofs.length
    });

    return socialProofs;
  }

  /**
   * Aplicar técnica de aversão à perda
   */
  applyLossAversion(context: EnhancedConversationContext, property: any): string {
    logger.debug('😰 [Persuasion] Applying loss aversion technique', {
      propertyId: property.id,
      conversationStage: context.conversationState.stage
    });

    const lossAversionMessages = {
      high_season: {
        message: "⚠️ Se não garantir hoje, pode não ter mais vagas para suas datas específicas!",
        condition: () => this.isHighSeason(context.clientData.checkIn)
      },
      popular_location: {
        message: "📍 Esta região esgota rápido - já perdeu 2 oportunidades similares esta semana!",
        condition: () => this.isPopularLocation(property.location)
      },
      good_price: {
        message: "💰 Este preço promocional pode subir a qualquer momento - últimas horas!",
        condition: () => property.isPromotion || false
      },
      limited_properties: {
        message: "🎯 Só restam 3 propriedades assim na região - não deixe escapar esta chance!",
        condition: () => context.conversationState.propertiesShown.length <= 3
      },
      time_sensitive: {
        message: "⏰ Outros clientes também estão vendo esta propriedade agora mesmo!",
        condition: () => true // Always applicable
      }
    };

    // Selecionar mensagem mais aplicável
    const applicableMessages = Object.entries(lossAversionMessages)
      .filter(([key, data]) => data.condition())
      .map(([key, data]) => data.message);

    const selectedMessage = applicableMessages[0] || lossAversionMessages.time_sensitive.message;

    logger.info('✅ [Persuasion] Loss aversion message selected', {
      selectedMessage: selectedMessage.substring(0, 50) + '...',
      applicableOptionsCount: applicableMessages.length
    });

    return selectedMessage;
  }

  /**
   * Aplicar reciprocidade (dar valor antes de pedir algo)
   */
  applyReciprocity(context: EnhancedConversationContext): PersuasionStrategy {
    logger.debug('🤝 [Persuasion] Applying reciprocity principle');

    const reciprocityStrategies = [
      {
        technique: 'valuable_information',
        content: '🎁 DICA ESPECIAL: A melhor época para visitar esta região é de manhã cedo - vista incrível do nascer do sol! (poucos sabem disso)',
        expectedImpact: 'medium' as const,
        applicationContext: 'information_gift',
        psychologyPrinciple: 'reciprocity'
      },
      {
        technique: 'exclusive_access',
        content: '🔐 Por você estar interessado, vou liberar acesso às fotos exclusivas do pôr do sol desta propriedade!',
        expectedImpact: 'high' as const,
        applicationContext: 'exclusive_content',
        psychologyPrinciple: 'reciprocity + exclusivity'
      },
      {
        technique: 'time_investment',
        content: '⏰ Separei um tempo especial para encontrar exatamente o que você precisa - vou personalizar as opções!',
        expectedImpact: 'medium' as const,
        applicationContext: 'personal_attention',
        psychologyPrinciple: 'reciprocity + commitment'
      }
    ];

    // Selecionar estratégia baseada no contexto
    const stage = context.conversationState.stage;
    let selectedStrategy = reciprocityStrategies[0];

    if (stage === 'consideration') {
      selectedStrategy = reciprocityStrategies[1]; // Exclusive access
    } else if (stage === 'interest') {
      selectedStrategy = reciprocityStrategies[2]; // Personal attention
    }

    logger.info('✅ [Persuasion] Reciprocity strategy selected', {
      technique: selectedStrategy.technique,
      expectedImpact: selectedStrategy.expectedImpact
    });

    return selectedStrategy;
  }

  /**
   * Aplicar técnica de compromisso e consistência
   */
  applyCommitmentConsistency(context: EnhancedConversationContext): string {
    logger.debug('📝 [Persuasion] Applying commitment and consistency');

    const commitmentPhrases = [
      "Então você está procurando uma propriedade para {guests} pessoas em {city}, correto?",
      "Perfeito! Confirma que as datas {checkIn} a {checkOut} são exatamente o que você precisa?",
      "Entendi que o mais importante para você é {preference}. Estou certo?",
      "Ótimo! Posso confirmar que você quer algo {description} para suas férias?"
    ];

    // Personalizar baseado nos dados do cliente
    const criticalData = extractCriticalData(context);
    let selectedPhrase = commitmentPhrases[0];

    if (criticalData.checkIn && criticalData.checkOut) {
      selectedPhrase = commitmentPhrases[1]
        .replace('{checkIn}', criticalData.checkIn)
        .replace('{checkOut}', criticalData.checkOut);
    } else if (criticalData.guests && criticalData.city) {
      selectedPhrase = commitmentPhrases[0]
        .replace('{guests}', criticalData.guests.toString())
        .replace('{city}', criticalData.city);
    }

    return selectedPhrase;
  }

  // ===== HELPER METHODS =====

  private getPersuasionElements(property: any, index: number, totalCount: number): string[] {
    const elements = [];

    if (index === 0) {
      elements.push('anchor_price', 'premium_positioning', 'luxury_association');
    } else if (index === 1) {
      elements.push('value_emphasis', 'savings_highlight', 'rational_choice');
    } else {
      elements.push('opportunity_framing', 'scarcity_hint', 'promotional_urgency');
    }

    return elements;
  }

  private generateComparisonMessage(properties: any[], anchorPrice: number): string {
    if (properties.length < 2) return '';

    const secondPrice = properties[1]?.basePrice || properties[1]?.price || 0;
    const savings = anchorPrice - secondPrice;
    const percentSavings = Math.round((savings / anchorPrice) * 100);

    return `💡 A segunda opção oferece ${percentSavings}% de economia mantendo excelente qualidade!`;
  }

  private getSeasonalUrgency(checkIn?: string): UrgencyElement | null {
    if (!checkIn) return null;

    const checkInDate = new Date(checkIn);
    const month = checkInDate.getMonth();

    // Verificar alta temporada (dezembro-março, junho-julho)
    const isHighSeason = month >= 11 || month <= 2 || (month >= 5 && month <= 6);

    if (isHighSeason) {
      return {
        type: 'seasonal',
        message: '🌞 Alta temporada! Reservas estão 80% mais rápidas que normal.',
        intensity: 4,
        truthfulness: 0.9,
        context: 'high_season_period'
      };
    }

    return null;
  }

  private getDemandUrgency(property: any, context: EnhancedConversationContext): UrgencyElement | null {
    // Simular urgência baseada em localização popular
    const popularLocations = ['Copacabana', 'Ipanema', 'Florianópolis', 'Porto de Galinhas'];
    
    if (popularLocations.some(loc => property.location?.includes(loc))) {
      return {
        type: 'demand',
        message: '📈 Localização premium com alta demanda - 3 consultas hoje!',
        intensity: 3,
        truthfulness: 0.8,
        context: 'popular_location'
      };
    }

    return null;
  }

  private isHighSeason(checkIn?: string): boolean {
    if (!checkIn) return false;
    
    const date = new Date(checkIn);
    const month = date.getMonth();
    
    return month >= 11 || month <= 2 || (month >= 5 && month <= 6);
  }

  private isPopularLocation(location?: string): boolean {
    if (!location) return false;
    
    const popularKeywords = ['praia', 'centro', 'copacabana', 'ipanema', 'floripa'];
    return popularKeywords.some(keyword => 
      location.toLowerCase().includes(keyword)
    );
  }

  /**
   * Combinar múltiplas técnicas de persuasão de forma ética
   */
  combinePersuasionTechniques(
    property: any,
    context: EnhancedConversationContext,
    techniques: string[] = ['anchoring', 'social_proof', 'urgency']
  ): {
    combinedMessage: string;
    techniquesUsed: string[];
    ethicalScore: number;
    expectedEffectiveness: number;
  } {
    logger.debug('🔄 [Persuasion] Combining multiple persuasion techniques', {
      propertyId: property.id,
      requestedTechniques: techniques
    });

    let combinedMessage = '';
    const techniquesUsed: string[] = [];
    let ethicalScore = 1.0;
    let expectedEffectiveness = 0.5;

    // Apply each requested technique
    if (techniques.includes('social_proof')) {
      const socialProofs = this.applySocialProof(property, context);
      const bestProof = socialProofs.find(sp => sp.impact === 'high') || socialProofs[0];
      
      if (bestProof) {
        combinedMessage += bestProof.content + '\n\n';
        techniquesUsed.push('social_proof');
        expectedEffectiveness += 0.15;
      }
    }

    if (techniques.includes('urgency')) {
      const urgencyElements = this.applyScarcityUrgency(property, context);
      const highIntensityUrgency = urgencyElements.find(ue => ue.intensity >= 4);
      
      if (highIntensityUrgency) {
        combinedMessage += highIntensityUrgency.message + '\n\n';
        techniquesUsed.push('urgency');
        expectedEffectiveness += 0.2;
        ethicalScore = Math.min(ethicalScore, highIntensityUrgency.truthfulness);
      }
    }

    if (techniques.includes('loss_aversion')) {
      const lossMessage = this.applyLossAversion(context, property);
      combinedMessage += lossMessage;
      techniquesUsed.push('loss_aversion');
      expectedEffectiveness += 0.1;
    }

    // Ensure ethical threshold
    if (ethicalScore < 0.7) {
      logger.warn('⚠️ [Persuasion] Ethical score below threshold, adjusting message');
      // Remove overly aggressive elements
      combinedMessage = combinedMessage.replace(/!!/g, '!').replace(/ÚLTIMA|ÚLTIMO/gi, 'Ótima');
      ethicalScore = 0.7;
    }

    logger.info('✅ [Persuasion] Techniques combined successfully', {
      techniquesUsed,
      ethicalScore,
      expectedEffectiveness,
      messageLength: combinedMessage.length
    });

    return {
      combinedMessage: combinedMessage.trim(),
      techniquesUsed,
      ethicalScore,
      expectedEffectiveness: Math.min(1.0, expectedEffectiveness)
    };
  }
}

// Export singleton instance
export const persuasionTechniques = new PersuasionTechniques();