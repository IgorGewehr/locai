// lib/ai-agent/professional-agent.ts
// NOVA ARQUITETURA: Intent-Based + Function Routing

import { OpenAI } from 'openai';

// ===== 1. TIPOS E INTERFACES SIMPLIFICADAS =====

interface AgentInput {
  message: string;
  clientPhone: string;
  conversationHistory?: MessageHistory[];
  tenantId: string;
}

interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface AgentResponse {
  reply: string;
  actions?: AgentAction[];
  intent: string;
  confidence: number;
  tokensUsed: number;
  fromCache: boolean;
}

interface AgentAction {
  type: 'search_properties' | 'calculate_price' | 'create_reservation' | 'schedule_viewing';
  parameters: Record<string, any>;
  result?: any;
}

interface ConversationContext {
  intent: string;
  stage: 'greeting' | 'discovery' | 'presentation' | 'negotiation' | 'closing';
  clientData: {
    name?: string;
    city?: string;
    budget?: number;
    guests?: number;
    checkIn?: string;
    checkOut?: string;
  };
  interestedProperties: string[];
  lastAction?: string;
}

// ===== 2. SISTEMA DE INTENÇÕES INTELIGENTE =====

class IntentDetector {
  private static readonly INTENT_PATTERNS = {
    greeting: [
      'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello'
    ],
    search_properties: [
      'procuro', 'busco', 'quero', 'preciso', 'apartamento', 'casa', 'imóvel',
      'propriedade', 'alugar', 'temporada', 'férias'
    ],
    price_inquiry: [
      'quanto', 'preço', 'valor', 'custo', 'custa', 'orçamento', 'cotação'
    ],
    availability_check: [
      'disponível', 'disponibilidade', 'livre', 'vago', 'datas'
    ],
    booking_intent: [
      'reservar', 'reserva', 'confirmar', 'fechar', 'alugar definitivo'
    ],
    more_info: [
      'detalhes', 'informações', 'fotos', 'vídeo', 'comodidades', 'localização'
    ]
  };

  static detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        return intent;
      }
    }
    
    return 'general';
  }

  static extractLocation(message: string): string | null {
    // Regex simples para detectar cidades brasileiras comuns
    const cityPattern = /(rio de janeiro|são paulo|belo horizonte|salvador|brasília|fortaleza|recife|porto alegre|curitiba|goiânia|manaus|belém|vitória|natal|joão pessoa|aracaju|maceió|teresina|são luís|macapá|rio branco|boa vista|palmas|cuiabá|campo grande|florianópolis|copacabana|ipanema|leblon|barra|zona sul|centro)/i;
    
    const match = message.match(cityPattern);
    return match ? match[0] : null;
  }

  static extractNumbers(message: string): Record<string, number> {
    const numbers = message.match(/\d+/g) || [];
    
    return {
      guests: this.findGuests(message, numbers),
      budget: this.findBudget(message, numbers),
      nights: this.findNights(message, numbers)
    };
  }

  private static findGuests(message: string, numbers: string[]): number {
    if (message.includes('pessoa') || message.includes('hóspede')) {
      const num = numbers.find(n => parseInt(n) <= 20);
      return num ? parseInt(num) : 2;
    }
    return 2;
  }

  private static findBudget(message: string, numbers: string[]): number {
    if (message.includes('até') || message.includes('máximo') || message.includes('orçamento')) {
      const num = numbers.find(n => parseInt(n) >= 100);
      return num ? parseInt(num) : 0;
    }
    return 0;
  }

  private static findNights(message: string, numbers: string[]): number {
    if (message.includes('noite') || message.includes('dia')) {
      const num = numbers.find(n => parseInt(n) <= 30);
      return num ? parseInt(num) : 3;
    }
    return 3;
  }
}

// ===== 3. CACHE INTELIGENTE COM TTL =====

class SmartCache {
  private static instance: SmartCache;
  private cache = new Map<string, { data: any; expires: number; hitCount: number }>();
  
  static getInstance(): SmartCache {
    if (!this.instance) {
      this.instance = new SmartCache();
    }
    return this.instance;
  }

  private generateKey(input: AgentInput, intent: string): string {
    // Chave baseada em: intent + dados relevantes (não na mensagem completa)
    const keyData = {
      intent,
      tenantId: input.tenantId,
      // Só incluir dados relevantes para evitar cache miss desnecessário
      ...(intent === 'search_properties' && {
        location: IntentDetector.extractLocation(input.message),
        ...IntentDetector.extractNumbers(input.message)
      })
    };
    
    return btoa(JSON.stringify(keyData));
  }

  get(input: AgentInput, intent: string): AgentResponse | null {
    const key = this.generateKey(input, intent);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expires) {
      cached.hitCount++;
      return { ...cached.data, fromCache: true };
    }
    
    if (cached) {
      this.cache.delete(key); // Remove cache expirado
    }
    
    return null;
  }

  set(input: AgentInput, intent: string, response: AgentResponse, ttlMinutes = 30): void {
    const key = this.generateKey(input, intent);
    const expires = Date.now() + (ttlMinutes * 60 * 1000);
    
    this.cache.set(key, {
      data: { ...response, fromCache: false },
      expires,
      hitCount: 0
    });
  }

  getStats(): { size: number; hitRate: number } {
    const total = Array.from(this.cache.values());
    const hits = total.reduce((sum, item) => sum + item.hitCount, 0);
    
    return {
      size: this.cache.size,
      hitRate: hits / (hits + total.length) || 0
    };
  }
}

// ===== 4. AGENTE PRINCIPAL REFORMULADO =====

export class ProfessionalAgent {
  private openai: OpenAI;
  private cache: SmartCache;
  private conversationContexts = new Map<string, ConversationContext>();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cache = SmartCache.getInstance();
  }

  async processMessage(input: AgentInput): Promise<AgentResponse> {
    // 1. Detectar intenção
    const intent = IntentDetector.detectIntent(input.message);
    
    // 2. Verificar cache primeiro
    const cachedResponse = this.cache.get(input, intent);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 3. Obter/criar contexto
    const context = this.getOrCreateContext(input.clientPhone);
    
    // 4. Atualizar contexto com nova informação
    this.updateContext(context, input.message, intent);

    // 5. Processar baseado na intenção (sem ReAct desnecessário!)
    const response = await this.processBasedOnIntent(input, context, intent);

    // 6. Cachear resposta se apropriado
    if (this.shouldCache(intent)) {
      this.cache.set(input, intent, response);
    }

    return response;
  }

  private async processBasedOnIntent(
    input: AgentInput, 
    context: ConversationContext, 
    intent: string
  ): Promise<AgentResponse> {
    
    switch (intent) {
      case 'greeting':
        return this.handleGreeting(context);
      
      case 'search_properties':
        return await this.handlePropertySearch(input, context);
      
      case 'price_inquiry':
        return await this.handlePriceInquiry(input, context);
      
      case 'booking_intent':
        return await this.handleBookingIntent(input, context);
      
      default:
        return await this.handleGeneral(input, context);
    }
  }

  // ===== HANDLERS ESPECIALIZADOS (SEM REACT LOOPS!) =====

  private handleGreeting(context: ConversationContext): AgentResponse {
    const responses = [
      "Olá! Sou a Sofia, especialista em propriedades para temporada! 😊 Em qual cidade você está procurando?",
      "Oi! Aqui é a Sofia! Vou te ajudar a encontrar o lugar perfeito. Qual cidade você tem em mente?",
      "Olá! Sofia aqui! 🏠 Para onde você está planejando viajar?"
    ];

    return {
      reply: responses[Math.floor(Math.random() * responses.length)],
      intent: 'greeting',
      confidence: 0.95,
      tokensUsed: 0, // Resposta local, zero tokens!
      fromCache: false
    };
  }

  private async handlePropertySearch(input: AgentInput, context: ConversationContext): Promise<AgentResponse> {
    const location = IntentDetector.extractLocation(input.message);
    const numbers = IntentDetector.extractNumbers(input.message);

    if (!location && !context.clientData.city) {
      return {
        reply: "Em qual cidade você está procurando? 🏙️",
        intent: 'search_properties',
        confidence: 0.9,
        tokensUsed: 0,
        fromCache: false
      };
    }

    // FUNÇÃO ÚNICA DE BUSCA (ao invés de múltiplas chamadas)
    const searchAction: AgentAction = {
      type: 'search_properties',
      parameters: {
        location: location || context.clientData.city,
        guests: numbers.guests || 2,
        budget: numbers.budget || null,
        checkIn: context.clientData.checkIn,
        checkOut: context.clientData.checkOut
      }
    };

    // Executar busca
    const searchResult = await this.executeAction(searchAction, input.tenantId);
    
    if (!searchResult || searchResult.length === 0) {
      return {
        reply: `Não encontrei propriedades disponíveis em ${location}. Posso ajudar com outra cidade? 🔍`,
        intent: 'search_properties',
        confidence: 0.8,
        tokensUsed: 15, // Estimativa baixa
        fromCache: false
      };
    }

    // Resposta focada e direcionada
    const property = searchResult[0]; // Primeira propriedade
    context.interestedProperties.push(property.id);

    return {
      reply: `Encontrei ${searchResult.length} opções em ${location}! 🏠\n\n*${property.name}*\n💰 R$ ${property.basePrice}/noite\n🛏️ ${property.bedrooms} quartos\n\nQuer ver fotos e mais detalhes?`,
      actions: [{ ...searchAction, result: searchResult }],
      intent: 'search_properties',
      confidence: 0.9,
      tokensUsed: 25,
      fromCache: false
    };
  }

  private async handlePriceInquiry(input: AgentInput, context: ConversationContext): Promise<AgentResponse> {
    if (context.interestedProperties.length === 0) {
      return {
        reply: "Para calcular o valor, preciso saber qual propriedade te interessa. Quer ver as opções disponíveis? 💰",
        intent: 'price_inquiry',
        confidence: 0.8,
        tokensUsed: 0,
        fromCache: false
      };
    }

    const propertyId = context.interestedProperties[0];
    const numbers = IntentDetector.extractNumbers(input.message);

    const priceAction: AgentAction = {
      type: 'calculate_price',
      parameters: {
        propertyId,
        checkIn: context.clientData.checkIn,
        checkOut: context.clientData.checkOut,
        nights: numbers.nights || 3
      }
    };

    const priceResult = await this.executeAction(priceAction, input.tenantId);

    return {
      reply: `💰 *Orçamento completo:*\n\n🏠 ${numbers.nights || 3} noites: R$ ${priceResult.subtotal}\n🧹 Taxa limpeza: R$ ${priceResult.cleaningFee}\n\n✅ *Total: R$ ${priceResult.total}*\n\nQuer confirmar a reserva?`,
      actions: [{ ...priceAction, result: priceResult }],
      intent: 'price_inquiry',
      confidence: 0.95,
      tokensUsed: 20,
      fromCache: false
    };
  }

  private async handleBookingIntent(input: AgentInput, context: ConversationContext): Promise<AgentResponse> {
    // Usar prompt mínimo e direcionado para GPT
    const prompt = `Cliente quer fazer reserva. Contexto: ${JSON.stringify(context.clientData)}. Propriedades interessadas: ${context.interestedProperties.length}. 

Responda em português, máximo 2 linhas, coletando dados que faltam para reserva (nome, datas, confirmação).`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Usar 3.5 para booking simples!
        messages: [
          {
            role: 'system',
            content: 'Você é Sofia, agente de reservas. Seja direta e colete dados essenciais.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100, // Limite baixo = economia
        temperature: 0.3
      });

      const reply = completion.choices[0]?.message?.content || 
        "Para confirmar sua reserva, preciso do seu nome completo e as datas. Pode me passar? 📅";

      return {
        reply,
        intent: 'booking_intent',
        confidence: 0.85,
        tokensUsed: completion.usage?.total_tokens || 50,
        fromCache: false
      };

    } catch (error) {
      console.error('OpenAI error:', error);
      return {
        reply: "Para confirmar sua reserva, preciso do seu nome completo e as datas. Pode me passar? 📅",
        intent: 'booking_intent',
        confidence: 0.7,
        tokensUsed: 0,
        fromCache: false
      };
    }
  }

  private async handleGeneral(input: AgentInput, context: ConversationContext): Promise<AgentResponse> {
    // PROMPT SUPER FOCADO - só para casos que realmente precisam de IA
    const prompt = `Mensagem: "${input.message}"
Contexto: Estágio ${context.stage}, cidade: ${context.clientData.city || 'não informada'}

Responda como Sofia (vendedora imobiliária), máximo 2 linhas, direcionando para próxima ação.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system', 
            content: 'Sofia: vendedora objetiva. Direcione sempre para busca de propriedade, orçamento ou reserva.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 80,
        temperature: 0.4
      });

      return {
        reply: completion.choices[0]?.message?.content || "Como posso ajudar você a encontrar a propriedade ideal? 🏠",
        intent: 'general',
        confidence: 0.75,
        tokensUsed: completion.usage?.total_tokens || 40,
        fromCache: false
      };

    } catch (error) {
      return {
        reply: "Como posso ajudar você a encontrar a propriedade ideal? 🏠",
        intent: 'general',
        confidence: 0.6,
        tokensUsed: 0,
        fromCache: false
      };
    }
  }

  // ===== EXECUÇÃO DE FUNÇÕES SIMPLIFICADA =====

  private async executeAction(action: AgentAction, tenantId: string): Promise<any> {
    try {
      switch (action.type) {
        case 'search_properties':
          return await this.searchProperties(action.parameters, tenantId);
        
        case 'calculate_price':
          return await this.calculatePrice(action.parameters, tenantId);
        
        case 'create_reservation':
          return await this.createReservation(action.parameters, tenantId);
        
        default:
          console.warn(`Ação não implementada: ${action.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action.type}:`, error);
      return null;
    }
  }

  private async searchProperties(params: any, tenantId: string): Promise<any[]> {
    // Integração com seu serviço Firebase existente
    const { propertyService } = await import('@/lib/services/property-service');
    
    try {
      // Usar método de busca existente
      const properties = await propertyService.getPropertiesByTenant(tenantId);
      
      // Filtrar por localização se fornecida
      let filtered = properties;
      if (params.location) {
        const location = params.location.toLowerCase();
        filtered = properties.filter(p => 
          p.location?.toLowerCase().includes(location) ||
          p.address?.toLowerCase().includes(location) ||
          p.name?.toLowerCase().includes(location)
        );
      }
      
      // Filtrar por número de hóspedes
      if (params.guests && params.guests > 0) {
        filtered = filtered.filter(p => (p.maxGuests || p.capacity || 2) >= params.guests);
      }
      
      // Filtrar por orçamento
      if (params.budget && params.budget > 0) {
        filtered = filtered.filter(p => (p.basePrice || p.price || 0) <= params.budget);
      }
      
      // Retornar apenas propriedades ativas e até 5 resultados
      return filtered
        .filter(p => p.status === 'active')
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: p.name || 'Propriedade',
          basePrice: p.basePrice || p.price || 300,
          bedrooms: p.bedrooms || 2,
          bathrooms: p.bathrooms || 1,
          maxGuests: p.maxGuests || p.capacity || 4,
          location: p.location || p.address,
          amenities: p.amenities || []
        }));
        
    } catch (error) {
      console.error('Error searching properties:', error);
      return [];
    }
  }

  private async calculatePrice(params: any, tenantId: string): Promise<any> {
    try {
      const nights = params.nights || 3;
      
      // Buscar propriedade
      const { propertyService } = await import('@/lib/services/property-service');
      const property = await propertyService.getById(params.propertyId);
      
      if (!property) {
        throw new Error('Property not found');
      }

      // Cálculo simplificado
      const basePrice = property.basePrice || property.price || 300;
      const subtotal = basePrice * nights;
      const cleaningFee = property.cleaningFee || 100;
      const total = subtotal + cleaningFee;

      return {
        propertyId: params.propertyId,
        nights,
        basePrice,
        subtotal,
        cleaningFee,
        total,
        currency: 'BRL'
      };

    } catch (error) {
      console.error('Error calculating price:', error);
      // Retorno padrão em caso de erro
      return {
        propertyId: params.propertyId,
        nights: params.nights || 3,
        basePrice: 300,
        subtotal: 300 * (params.nights || 3),
        cleaningFee: 100,
        total: 300 * (params.nights || 3) + 100,
        currency: 'BRL'
      };
    }
  }

  private async createReservation(params: any, tenantId: string): Promise<any> {
    const { reservationService } = await import('@/lib/services/reservation-service');
    
    return await reservationService.create({
      tenantId,
      ...params
    });
  }

  // ===== GESTÃO DE CONTEXTO OTIMIZADA =====

  private getOrCreateContext(clientPhone: string): ConversationContext {
    if (!this.conversationContexts.has(clientPhone)) {
      this.conversationContexts.set(clientPhone, {
        intent: 'greeting',
        stage: 'greeting',
        clientData: {},
        interestedProperties: [],
        lastAction: undefined
      });
    }
    
    return this.conversationContexts.get(clientPhone)!;
  }

  private updateContext(context: ConversationContext, message: string, intent: string): void {
    context.intent = intent;
    
    // Extrair dados da mensagem
    const location = IntentDetector.extractLocation(message);
    if (location) {
      context.clientData.city = location;
    }

    const numbers = IntentDetector.extractNumbers(message);
    if (numbers.guests > 0) context.clientData.guests = numbers.guests;
    if (numbers.budget > 0) context.clientData.budget = numbers.budget;

    // Atualizar estágio da conversa
    this.updateConversationStage(context, intent);
  }

  private updateConversationStage(context: ConversationContext, intent: string): void {
    switch (intent) {
      case 'search_properties':
        context.stage = 'discovery';
        break;
      case 'price_inquiry':
        context.stage = 'presentation';
        break;
      case 'booking_intent':
        context.stage = 'closing';
        break;
    }
  }

  private shouldCache(intent: string): boolean {
    // Cachear apenas respostas que tendem a se repetir
    return ['greeting', 'search_properties'].includes(intent);
  }

  // ===== MÉTRICAS E MONITORAMENTO =====

  getAgentStats(): any {
    return {
      cacheStats: this.cache.getStats(),
      activeConversations: this.conversationContexts.size,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}