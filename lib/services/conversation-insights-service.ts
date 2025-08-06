// Conversation Insights Service - Deep AI Analysis
// Extracts actionable insights from WhatsApp conversations

import { Timestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { Conversation, Message } from '@/lib/types/conversation';

export interface ConversationInsight {
  // Customer Intent Analysis
  customerIntent: {
    primaryIntent: 'booking' | 'inquiry' | 'support' | 'complaint' | 'praise';
    confidence: number;
    keywords: string[];
    urgencyLevel: 'high' | 'medium' | 'low';
    readyToBook: boolean;
  };

  // Sentiment Journey
  sentimentJourney: {
    initial: 'positive' | 'neutral' | 'negative';
    final: 'positive' | 'neutral' | 'negative';
    turningPoints: {
      timestamp: Date;
      trigger: string;
      sentimentChange: number;
    }[];
    overallScore: number; // -1 to 1
  };

  // Pain Points & Objections
  painPoints: {
    category: string;
    description: string;
    frequency: number;
    severity: 'high' | 'medium' | 'low';
    suggestedResponse: string;
  }[];

  // Feature Requests
  featureRequests: {
    feature: string;
    mentions: number;
    impact: 'revenue' | 'satisfaction' | 'efficiency';
    estimatedValue: number;
  }[];

  // Behavioral Patterns
  behaviorPatterns: {
    decisionSpeed: 'immediate' | 'considerate' | 'slow';
    priceConsciousness: 'high' | 'medium' | 'low';
    communicationStyle: 'formal' | 'casual' | 'brief';
    preferredChannels: string[];
  };

  // AI Performance
  aiPerformance: {
    responseAccuracy: number;
    contextRetention: number;
    goalAchievement: boolean;
    missedOpportunities: {
      type: string;
      description: string;
      potentialImpact: number;
    }[];
  };
}

export interface AggregatedInsights {
  // Top Customer Concerns
  topConcerns: {
    concern: string;
    frequency: number;
    avgResolutionTime: number;
    satisfactionRate: number;
    suggestedImprovement: string;
  }[];

  // Conversion Blockers
  conversionBlockers: {
    blocker: string;
    impactedConversations: number;
    lostRevenue: number;
    solution: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }[];

  // Success Patterns
  successPatterns: {
    pattern: string;
    occurrences: number;
    conversionRate: number;
    keyPhrases: string[];
    recommendation: string;
  }[];

  // Language Optimization
  languageOptimization: {
    ineffectivePhrases: {
      phrase: string;
      negativeImpact: number;
      suggestedAlternative: string;
    }[];
    powerWords: {
      word: string;
      positiveImpact: number;
      context: string;
    }[];
  };

  // Competitor Mentions
  competitorAnalysis: {
    competitorName: string;
    mentions: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    reasonsForComparison: string[];
    competitiveAdvantages: string[];
    disadvantages: string[];
  }[];

  // Regional Insights
  regionalInsights: {
    region: string;
    preferences: string[];
    priceExpectations: { min: number; max: number };
    popularAmenities: string[];
    culturalConsiderations: string[];
  }[];
}

class ConversationInsightsService {
  private readonly intentKeywords = {
    booking: ['reservar', 'alugar', 'disponível', 'check-in', 'check-out', 'hospedar'],
    inquiry: ['preço', 'valor', 'quanto', 'informações', 'detalhes', 'fotos'],
    support: ['ajuda', 'problema', 'não consigo', 'erro', 'dúvida'],
    complaint: ['ruim', 'péssimo', 'decepcionado', 'insatisfeito', 'reclamar'],
    praise: ['ótimo', 'excelente', 'parabéns', 'adorei', 'perfeito', 'recomendo']
  };

  private readonly painPointCategories = {
    pricing: ['caro', 'preço alto', 'desconto', 'mais barato', 'valor'],
    availability: ['ocupado', 'não disponível', 'outras datas', 'lotado'],
    amenities: ['não tem', 'falta', 'precisa ter', 'sem'],
    location: ['longe', 'distância', 'como chegar', 'transporte'],
    trust: ['seguro', 'confiável', 'garantia', 'contrato']
  };

  private readonly sentimentWords = {
    positive: ['ótimo', 'excelente', 'perfeito', 'adorei', 'maravilhoso', 'incrível'],
    negative: ['ruim', 'péssimo', 'horrível', 'não gostei', 'decepcionado', 'frustrado'],
    urgent: ['urgente', 'hoje', 'agora', 'imediato', 'rápido', 'pressa']
  };

  private analyzeSentiment(text: string): number {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    this.sentimentWords.positive.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    this.sentimentWords.negative.forEach(word => {
      if (lowerText.includes(word)) score -= 0.3;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private detectIntent(messages: Message[]): ConversationInsight['customerIntent'] {
    const allText = messages.map(m => m.text || '').join(' ').toLowerCase();
    const intents = Object.entries(this.intentKeywords);
    
    let primaryIntent: any = 'inquiry';
    let maxScore = 0;
    let detectedKeywords: string[] = [];
    
    intents.forEach(([intent, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (allText.includes(keyword)) {
          score++;
          detectedKeywords.push(keyword);
        }
      });
      
      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent;
      }
    });
    
    const urgencyLevel = this.sentimentWords.urgent.some(word => allText.includes(word)) 
      ? 'high' 
      : detectedKeywords.length > 3 ? 'medium' : 'low';
    
    const readyToBook = primaryIntent === 'booking' && 
      ['disponível', 'check-in', 'check-out'].some(kw => detectedKeywords.includes(kw));
    
    return {
      primaryIntent,
      confidence: Math.min(maxScore / 3, 1),
      keywords: detectedKeywords,
      urgencyLevel,
      readyToBook
    };
  }

  private detectPainPoints(messages: Message[]): ConversationInsight['painPoints'] {
    const painPoints: ConversationInsight['painPoints'] = [];
    const userMessages = messages.filter(m => m.from === 'user');
    
    Object.entries(this.painPointCategories).forEach(([category, keywords]) => {
      let mentions = 0;
      const relevantMessages: string[] = [];
      
      userMessages.forEach(msg => {
        const text = (msg.text || '').toLowerCase();
        if (keywords.some(kw => text.includes(kw))) {
          mentions++;
          relevantMessages.push(text);
        }
      });
      
      if (mentions > 0) {
        painPoints.push({
          category,
          description: this.generatePainPointDescription(category, relevantMessages),
          frequency: mentions,
          severity: mentions > 2 ? 'high' : mentions > 1 ? 'medium' : 'low',
          suggestedResponse: this.generateSuggestedResponse(category)
        });
      }
    });
    
    return painPoints.sort((a, b) => b.frequency - a.frequency);
  }

  private generatePainPointDescription(category: string, messages: string[]): string {
    const descriptions: { [key: string]: string } = {
      pricing: 'Cliente demonstra sensibilidade ao preço ou busca por descontos',
      availability: 'Dificuldade em encontrar datas disponíveis desejadas',
      amenities: 'Procura por comodidades específicas não encontradas',
      location: 'Preocupações sobre localização ou acesso',
      trust: 'Necessidade de mais garantias ou informações de segurança'
    };
    return descriptions[category] || 'Preocupação identificada nas mensagens';
  }

  private generateSuggestedResponse(category: string): string {
    const responses: { [key: string]: string } = {
      pricing: 'Ofereça opções de parcelamento ou destaque o custo-benefício',
      availability: 'Sugira datas alternativas próximas com possíveis vantagens',
      amenities: 'Apresente propriedades similares com as comodidades desejadas',
      location: 'Forneça informações detalhadas sobre transporte e proximidades',
      trust: 'Compartilhe avaliações de outros hóspedes e garantias oferecidas'
    };
    return responses[category] || 'Aborde a preocupação com empatia e soluções';
  }

  async analyzeConversation(
    conversation: Conversation,
    tenantId: string
  ): Promise<ConversationInsight> {
    const messages = conversation.messages || [];
    
    // Analyze customer intent
    const customerIntent = this.detectIntent(messages);
    
    // Analyze sentiment journey
    const sentiments = messages.map(msg => ({
      timestamp: msg.timestamp,
      sentiment: this.analyzeSentiment(msg.text || ''),
      text: msg.text
    }));
    
    const initialSentiment = sentiments[0]?.sentiment || 0;
    const finalSentiment = sentiments[sentiments.length - 1]?.sentiment || 0;
    
    // Find turning points
    const turningPoints = [];
    for (let i = 1; i < sentiments.length; i++) {
      const change = sentiments[i].sentiment - sentiments[i - 1].sentiment;
      if (Math.abs(change) > 0.3) {
        turningPoints.push({
          timestamp: sentiments[i].timestamp,
          trigger: sentiments[i].text?.substring(0, 50) || '',
          sentimentChange: change
        });
      }
    }
    
    // Detect pain points
    const painPoints = this.detectPainPoints(messages);
    
    // Extract feature requests
    const featureRequests = this.extractFeatureRequests(messages);
    
    // Analyze behavioral patterns
    const behaviorPatterns = this.analyzeBehaviorPatterns(messages);
    
    // Assess AI performance
    const aiPerformance = this.assessAIPerformance(messages, customerIntent);
    
    return {
      customerIntent,
      sentimentJourney: {
        initial: initialSentiment > 0.2 ? 'positive' : initialSentiment < -0.2 ? 'negative' : 'neutral',
        final: finalSentiment > 0.2 ? 'positive' : finalSentiment < -0.2 ? 'negative' : 'neutral',
        turningPoints,
        overallScore: sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length
      },
      painPoints,
      featureRequests,
      behaviorPatterns,
      aiPerformance
    };
  }

  private extractFeatureRequests(messages: Message[]): ConversationInsight['featureRequests'] {
    const featureKeywords = {
      'Tour Virtual': ['tour virtual', 'vídeo', '360', 'ver por dentro'],
      'Check-in Automático': ['check-in automático', 'senha', 'código', 'sem contato'],
      'Pet Friendly': ['pet', 'cachorro', 'gato', 'animal'],
      'Pagamento Facilitado': ['parcelar', 'cartão', 'boleto', 'pix'],
      'Cancelamento Flexível': ['cancelar', 'reembolso', 'flexível']
    };
    
    const requests: ConversationInsight['featureRequests'] = [];
    
    Object.entries(featureKeywords).forEach(([feature, keywords]) => {
      let mentions = 0;
      messages.forEach(msg => {
        const text = (msg.text || '').toLowerCase();
        if (keywords.some(kw => text.includes(kw))) mentions++;
      });
      
      if (mentions > 0) {
        requests.push({
          feature,
          mentions,
          impact: this.estimateFeatureImpact(feature),
          estimatedValue: this.estimateFeatureValue(feature, mentions)
        });
      }
    });
    
    return requests.sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  private estimateFeatureImpact(feature: string): 'revenue' | 'satisfaction' | 'efficiency' {
    const impactMap: { [key: string]: 'revenue' | 'satisfaction' | 'efficiency' } = {
      'Tour Virtual': 'revenue',
      'Check-in Automático': 'efficiency',
      'Pet Friendly': 'revenue',
      'Pagamento Facilitado': 'revenue',
      'Cancelamento Flexível': 'satisfaction'
    };
    return impactMap[feature] || 'satisfaction';
  }

  private estimateFeatureValue(feature: string, mentions: number): number {
    const valueMap: { [key: string]: number } = {
      'Tour Virtual': 500,
      'Check-in Automático': 300,
      'Pet Friendly': 800,
      'Pagamento Facilitado': 600,
      'Cancelamento Flexível': 400
    };
    return (valueMap[feature] || 200) * mentions;
  }

  private analyzeBehaviorPatterns(messages: Message[]): ConversationInsight['behaviorPatterns'] {
    const userMessages = messages.filter(m => m.from === 'user');
    const avgResponseTime = this.calculateAvgResponseTime(messages);
    const avgMessageLength = userMessages.reduce((sum, m) => sum + (m.text?.length || 0), 0) / userMessages.length;
    
    // Decision speed based on conversation duration
    const firstMessage = messages[0]?.timestamp;
    const lastMessage = messages[messages.length - 1]?.timestamp;
    const duration = firstMessage && lastMessage ? 
      (new Date(lastMessage).getTime() - new Date(firstMessage).getTime()) / 1000 / 60 : 0; // minutes
    
    const decisionSpeed = duration < 30 ? 'immediate' : duration < 120 ? 'considerate' : 'slow';
    
    // Price consciousness
    const priceWords = ['preço', 'valor', 'caro', 'barato', 'desconto', 'promoção'];
    const priceMentions = userMessages.filter(m => 
      priceWords.some(w => (m.text || '').toLowerCase().includes(w))
    ).length;
    const priceConsciousness = priceMentions > 3 ? 'high' : priceMentions > 1 ? 'medium' : 'low';
    
    // Communication style
    const communicationStyle = avgMessageLength > 100 ? 'formal' : avgMessageLength > 50 ? 'casual' : 'brief';
    
    return {
      decisionSpeed,
      priceConsciousness,
      communicationStyle,
      preferredChannels: ['WhatsApp'] // Could be expanded based on data
    };
  }

  private calculateAvgResponseTime(messages: Message[]): number {
    let totalTime = 0;
    let count = 0;
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].from !== messages[i - 1].from) {
        const time1 = new Date(messages[i - 1].timestamp).getTime();
        const time2 = new Date(messages[i].timestamp).getTime();
        totalTime += (time2 - time1) / 1000; // seconds
        count++;
      }
    }
    
    return count > 0 ? totalTime / count : 0;
  }

  private assessAIPerformance(
    messages: Message[], 
    intent: ConversationInsight['customerIntent']
  ): ConversationInsight['aiPerformance'] {
    const aiMessages = messages.filter(m => m.from === 'assistant');
    const userMessages = messages.filter(m => m.from === 'user');
    
    // Response accuracy - check if AI understood the intent
    const responseAccuracy = intent.confidence;
    
    // Context retention - check if AI remembers previous info
    let contextRetention = 1;
    const importantInfo = ['data', 'pessoas', 'orçamento', 'local'];
    importantInfo.forEach(info => {
      const mentioned = userMessages.some(m => (m.text || '').toLowerCase().includes(info));
      const remembered = aiMessages.slice(1).some(m => (m.text || '').toLowerCase().includes(info));
      if (mentioned && !remembered) contextRetention -= 0.25;
    });
    
    // Goal achievement
    const goalAchievement = intent.readyToBook && messages.some(m => 
      (m.text || '').toLowerCase().includes('reserva confirmada')
    );
    
    // Missed opportunities
    const missedOpportunities = [];
    
    // Check if failed to offer alternatives when unavailable
    if (userMessages.some(m => (m.text || '').toLowerCase().includes('não disponível'))) {
      const offeredAlternative = aiMessages.some(m => 
        (m.text || '').toLowerCase().includes('alternativa') ||
        (m.text || '').toLowerCase().includes('outra opção')
      );
      if (!offeredAlternative) {
        missedOpportunities.push({
          type: 'Alternativas não oferecidas',
          description: 'AI não sugeriu propriedades alternativas quando a desejada estava indisponível',
          potentialImpact: 2000
        });
      }
    }
    
    return {
      responseAccuracy,
      contextRetention,
      goalAchievement,
      missedOpportunities
    };
  }

  async getAggregatedInsights(
    tenantId: string,
    days: number = 30
  ): Promise<AggregatedInsights> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Query conversations directly from Firestore
      const conversationsRef = collection(db, `tenants/${tenantId}/conversations`);
      const q = query(
        conversationsRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      
      logger.info('📊 [ConversationInsights] Analyzing conversations', {
        tenantId,
        conversationCount: conversations.length,
        period: `${days} days`
      });
      
      // Analyze all conversations
      const insights = await Promise.all(
        conversations.map(conv => this.analyzeConversation(conv, tenantId))
      );
      
      // Aggregate insights
      const topConcerns = this.aggregatePainPoints(insights);
      const conversionBlockers = this.identifyConversionBlockers(insights, conversations);
      const successPatterns = this.findSuccessPatterns(insights, conversations);
      const languageOptimization = this.optimizeLanguage(insights, conversations);
      const competitorAnalysis = this.analyzeCompetitors(conversations);
      const regionalInsights = this.extractRegionalInsights(conversations);
      
      return {
        topConcerns,
        conversionBlockers,
        successPatterns,
        languageOptimization,
        competitorAnalysis,
        regionalInsights
      };
      
    } catch (error) {
      logger.error('❌ [ConversationInsights] Error generating insights', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private aggregatePainPoints(
    insights: ConversationInsight[]
  ): AggregatedInsights['topConcerns'] {
    const concernMap = new Map<string, {
      frequency: number;
      totalResolutionTime: number;
      resolvedCount: number;
    }>();
    
    insights.forEach(insight => {
      insight.painPoints.forEach(pain => {
        const key = pain.category;
        const existing = concernMap.get(key) || {
          frequency: 0,
          totalResolutionTime: 0,
          resolvedCount: 0
        };
        
        existing.frequency += pain.frequency;
        // Estimate resolution based on sentiment change
        if (insight.sentimentJourney.final === 'positive' && 
            insight.sentimentJourney.initial !== 'positive') {
          existing.resolvedCount++;
          existing.totalResolutionTime += 30; // minutes estimate
        }
        
        concernMap.set(key, existing);
      });
    });
    
    return Array.from(concernMap.entries())
      .map(([concern, data]) => ({
        concern,
        frequency: data.frequency,
        avgResolutionTime: data.resolvedCount > 0 ? 
          data.totalResolutionTime / data.resolvedCount : 0,
        satisfactionRate: data.resolvedCount / Math.max(1, data.frequency) * 100,
        suggestedImprovement: this.suggestImprovement(concern)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  private suggestImprovement(concern: string): string {
    const improvements: { [key: string]: string } = {
      pricing: 'Implemente tabela de preços dinâmica e destaque promoções automaticamente',
      availability: 'Mostre calendário visual com sugestões de datas alternativas',
      amenities: 'Crie filtros rápidos para comodidades mais procuradas',
      location: 'Adicione mapa interativo com pontos de interesse próximos',
      trust: 'Exiba selos de verificação e depoimentos em destaque'
    };
    return improvements[concern] || 'Analise padrões específicos para melhorias direcionadas';
  }

  private identifyConversionBlockers(
    insights: ConversationInsight[],
    conversations: Conversation[]
  ): AggregatedInsights['conversionBlockers'] {
    const blockers: AggregatedInsights['conversionBlockers'] = [];
    
    // Analyze conversations that didn't convert
    const nonConverted = insights.filter((insight, index) => {
      const conv = conversations[index];
      return !insight.customerIntent.readyToBook && 
             insight.customerIntent.primaryIntent === 'booking';
    });
    
    // Count blocker patterns
    const blockerPatterns: { [key: string]: number } = {
      'Preço acima do esperado': 0,
      'Falta de disponibilidade': 0,
      'Comodidades insuficientes': 0,
      'Resposta demorada': 0,
      'Informações incompletas': 0
    };
    
    nonConverted.forEach(insight => {
      if (insight.painPoints.some(p => p.category === 'pricing')) {
        blockerPatterns['Preço acima do esperado']++;
      }
      if (insight.painPoints.some(p => p.category === 'availability')) {
        blockerPatterns['Falta de disponibilidade']++;
      }
      if (insight.painPoints.some(p => p.category === 'amenities')) {
        blockerPatterns['Comodidades insuficientes']++;
      }
      if (insight.aiPerformance.responseAccuracy < 0.7) {
        blockerPatterns['Informações incompletas']++;
      }
    });
    
    Object.entries(blockerPatterns).forEach(([blocker, count]) => {
      if (count > 0) {
        blockers.push({
          blocker,
          impactedConversations: count,
          lostRevenue: count * 1500, // Estimated average booking value
          solution: this.suggestBlockerSolution(blocker),
          priority: count > 10 ? 'critical' : count > 5 ? 'high' : 'medium'
        });
      }
    });
    
    return blockers.sort((a, b) => b.lostRevenue - a.lostRevenue);
  }

  private suggestBlockerSolution(blocker: string): string {
    const solutions: { [key: string]: string } = {
      'Preço acima do esperado': 'Ofereça opções de parcelamento e destaque o valor agregado',
      'Falta de disponibilidade': 'Implemente lista de espera e notificações de disponibilidade',
      'Comodidades insuficientes': 'Adicione filtros detalhados e sugestões baseadas em preferências',
      'Resposta demorada': 'Otimize cache de respostas e implemente respostas preditivas',
      'Informações incompletas': 'Enriqueça base de dados e treine AI com mais contexto'
    };
    return solutions[blocker] || 'Análise detalhada necessária';
  }

  private findSuccessPatterns(
    insights: ConversationInsight[],
    conversations: Conversation[]
  ): AggregatedInsights['successPatterns'] {
    const patterns: AggregatedInsights['successPatterns'] = [];
    
    // Find converted conversations
    const successful = insights
      .map((insight, index) => ({ insight, conversation: conversations[index] }))
      .filter(({ insight }) => 
        insight.customerIntent.readyToBook && 
        insight.sentimentJourney.final === 'positive'
      );
    
    // Extract success patterns
    const patternMap = new Map<string, {
      occurrences: number;
      keyPhrases: Set<string>;
    }>();
    
    successful.forEach(({ insight, conversation }) => {
      // Quick response pattern
      if (insight.aiPerformance.responseAccuracy > 0.8) {
        const pattern = 'Resposta precisa e contextualizada';
        const existing = patternMap.get(pattern) || {
          occurrences: 0,
          keyPhrases: new Set<string>()
        };
        existing.occurrences++;
        patternMap.set(pattern, existing);
      }
      
      // Proactive suggestions pattern
      if (insight.aiPerformance.missedOpportunities.length === 0) {
        const pattern = 'Sugestões proativas de alternativas';
        const existing = patternMap.get(pattern) || {
          occurrences: 0,
          keyPhrases: new Set<string>()
        };
        existing.occurrences++;
        patternMap.set(pattern, existing);
      }
    });
    
    patternMap.forEach((data, pattern) => {
      patterns.push({
        pattern,
        occurrences: data.occurrences,
        conversionRate: (data.occurrences / conversations.length) * 100,
        keyPhrases: Array.from(data.keyPhrases),
        recommendation: this.recommendFromPattern(pattern)
      });
    });
    
    return patterns.sort((a, b) => b.conversionRate - a.conversionRate);
  }

  private recommendFromPattern(pattern: string): string {
    const recommendations: { [key: string]: string } = {
      'Resposta precisa e contextualizada': 'Mantenha treinamento constante da AI com casos reais',
      'Sugestões proativas de alternativas': 'Expanda catálogo de opções similares para cada propriedade'
    };
    return recommendations[pattern] || 'Continue monitorando e replicando este padrão';
  }

  private optimizeLanguage(
    insights: ConversationInsight[],
    conversations: Conversation[]
  ): AggregatedInsights['languageOptimization'] {
    const ineffectivePhrases: AggregatedInsights['languageOptimization']['ineffectivePhrases'] = [];
    const powerWords: AggregatedInsights['languageOptimization']['powerWords'] = [];
    
    // Analyze sentiment changes after specific phrases
    conversations.forEach((conv, index) => {
      const insight = insights[index];
      const messages = conv.messages || [];
      
      messages.forEach((msg, msgIndex) => {
        if (msg.from === 'assistant' && msgIndex < messages.length - 1) {
          const nextUserMsg = messages.slice(msgIndex + 1).find(m => m.from === 'user');
          if (nextUserMsg) {
            const sentimentBefore = this.analyzeSentiment(messages[msgIndex - 1]?.text || '');
            const sentimentAfter = this.analyzeSentiment(nextUserMsg.text || '');
            const change = sentimentAfter - sentimentBefore;
            
            // Extract key phrases
            const phrases = this.extractKeyPhrases(msg.text || '');
            
            phrases.forEach(phrase => {
              if (change < -0.2) {
                ineffectivePhrases.push({
                  phrase,
                  negativeImpact: Math.abs(change),
                  suggestedAlternative: this.suggestAlternativePhrase(phrase)
                });
              } else if (change > 0.2) {
                powerWords.push({
                  word: phrase,
                  positiveImpact: change,
                  context: msg.text?.substring(0, 100) || ''
                });
              }
            });
          }
        }
      });
    });
    
    return {
      ineffectivePhrases: ineffectivePhrases.slice(0, 5),
      powerWords: powerWords.slice(0, 10)
    };
  }

  private extractKeyPhrases(text: string): string[] {
    // Simple phrase extraction - could be enhanced with NLP
    const phrases = text.match(/\b[\w\s]{3,20}\b/g) || [];
    return phrases.filter(p => p.trim().split(' ').length >= 2);
  }

  private suggestAlternativePhrase(phrase: string): string {
    const alternatives: { [key: string]: string } = {
      'não disponível': 'temos outras opções incríveis',
      'infelizmente': 'vamos encontrar uma solução',
      'não é possível': 'vamos verificar alternativas'
    };
    
    const lowerPhrase = phrase.toLowerCase();
    for (const [key, value] of Object.entries(alternatives)) {
      if (lowerPhrase.includes(key)) return value;
    }
    
    return 'Use linguagem mais positiva e orientada a soluções';
  }

  private analyzeCompetitors(
    conversations: Conversation[]
  ): AggregatedInsights['competitorAnalysis'] {
    const competitors = ['Airbnb', 'Booking', 'Hotels.com', 'Trivago'];
    const analysis: AggregatedInsights['competitorAnalysis'] = [];
    
    competitors.forEach(competitor => {
      let mentions = 0;
      let sentimentSum = 0;
      const reasons = new Set<string>();
      
      conversations.forEach(conv => {
        const messages = conv.messages || [];
        messages.forEach(msg => {
          const text = (msg.text || '').toLowerCase();
          if (text.includes(competitor.toLowerCase())) {
            mentions++;
            sentimentSum += this.analyzeSentiment(text);
            
            // Extract comparison reasons
            if (text.includes('mais barato')) reasons.add('Preço');
            if (text.includes('mais opções')) reasons.add('Variedade');
            if (text.includes('mais fácil')) reasons.add('Usabilidade');
          }
        });
      });
      
      if (mentions > 0) {
        analysis.push({
          competitorName: competitor,
          mentions,
          sentiment: sentimentSum / mentions > 0.1 ? 'positive' : 
                     sentimentSum / mentions < -0.1 ? 'negative' : 'neutral',
          reasonsForComparison: Array.from(reasons),
          competitiveAdvantages: ['Atendimento personalizado', 'Resposta instantânea'],
          disadvantages: Array.from(reasons)
        });
      }
    });
    
    return analysis.sort((a, b) => b.mentions - a.mentions);
  }

  private extractRegionalInsights(
    conversations: Conversation[]
  ): AggregatedInsights['regionalInsights'] {
    const regionMap = new Map<string, {
      preferences: string[];
      priceRange: number[];
      amenities: Map<string, number>;
    }>();
    
    // Extract regional patterns from conversations
    // This is simplified - in production would use more sophisticated location detection
    const regions = ['Florianópolis', 'São Paulo', 'Rio de Janeiro', 'Curitiba'];
    
    regions.forEach(region => {
      const regionalConvs = conversations.filter(conv => 
        conv.messages?.some(m => 
          (m.text || '').toLowerCase().includes(region.toLowerCase())
        )
      );
      
      if (regionalConvs.length > 0) {
        const amenityCount = new Map<string, number>();
        const prices: number[] = [];
        
        regionalConvs.forEach(conv => {
          // Extract price mentions
          const priceMatches = (conv.messages || [])
            .map(m => m.text?.match(/R\$\s*(\d+)/g))
            .filter(Boolean)
            .flat();
          
          priceMatches?.forEach(match => {
            const price = parseInt(match?.replace(/\D/g, '') || '0');
            if (price > 0) prices.push(price);
          });
        });
        
        regionMap.set(region, {
          preferences: this.getRegionalPreferences(region),
          priceRange: prices,
          amenities: amenityCount
        });
      }
    });
    
    return Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      preferences: data.preferences,
      priceExpectations: {
        min: Math.min(...data.priceRange) || 0,
        max: Math.max(...data.priceRange) || 0
      },
      popularAmenities: this.getPopularAmenities(region),
      culturalConsiderations: this.getCulturalConsiderations(region)
    }));
  }

  private getRegionalPreferences(region: string): string[] {
    const preferences: { [key: string]: string[] } = {
      'Florianópolis': ['Praia', 'Vista mar', 'Churrasqueira'],
      'São Paulo': ['Localização central', 'Transporte público', 'Segurança'],
      'Rio de Janeiro': ['Vista', 'Praia', 'Área social'],
      'Curitiba': ['Aquecimento', 'Garagem coberta', 'Próximo a parques']
    };
    return preferences[region] || ['Conforto', 'Limpeza', 'Boa localização'];
  }

  private getPopularAmenities(region: string): string[] {
    const amenities: { [key: string]: string[] } = {
      'Florianópolis': ['Piscina', 'Churrasqueira', 'Wi-Fi', 'Ar condicionado'],
      'São Paulo': ['Wi-Fi rápido', 'Cozinha completa', 'Academia', 'Segurança 24h'],
      'Rio de Janeiro': ['Ar condicionado', 'Varanda', 'Churrasqueira', 'Piscina'],
      'Curitiba': ['Aquecedor', 'Lareira', 'Garagem', 'Cozinha equipada']
    };
    return amenities[region] || ['Wi-Fi', 'Cozinha', 'Ar condicionado'];
  }

  private getCulturalConsiderations(region: string): string[] {
    const considerations: { [key: string]: string[] } = {
      'Florianópolis': ['Alta temporada no verão', 'Preferência por casas de praia'],
      'São Paulo': ['Executivos valorizam localização', 'Check-in/out flexível'],
      'Rio de Janeiro': ['Eventos e festivais influenciam demanda', 'Segurança é prioridade'],
      'Curitiba': ['Inverno rigoroso requer aquecimento', 'Valorizam ambientes aconchegantes']
    };
    return considerations[region] || ['Adaptação às necessidades locais'];
  }
}

export const conversationInsightsService = new ConversationInsightsService();