// lib/ai-agent/professional-agent.ts
// NOVA ARQUITETURA: Intent-Based + Function Routing com Persistência

import { OpenAI } from 'openai';
import { conversationContextService, ConversationContextData } from '@/lib/services/conversation-context-service';

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
      // Saudações formais
      'olá', 'oi', 'oie', 'opa', 'eae', 'e aí',
      'bom dia', 'boa tarde', 'boa noite', 'bom-dia', 'boa-tarde', 'boa-noite',
      // Saudações informais
      'hey', 'hello', 'hi', 'salve', 'fala', 'fala aí',
      // Início de conversa
      'tudo bem', 'tudo bom', 'como vai', 'oi tudo bem', 'olá tudo bem'
    ],
    search_properties: [
      // Verbos de busca
      'procuro', 'busco', 'quero', 'preciso', 'gostaria', 'desejo', 'to procurando',
      'tô procurando', 'estou procurando', 'procurando', 'buscando',
      // Tipos de propriedade
      'apartamento', 'casa', 'apto', 'ap', 'imóvel', 'propriedade', 'lugar', 'local',
      'casa de praia', 'casa na praia', 'chalé', 'kitnet', 'studio', 'estúdio',
      // Ações de aluguel
      'alugar', 'aluguel', 'temporada', 'férias', 'fim de semana', 'feriado',
      'hospedagem', 'hospedar', 'me hospedar', 'ficar', 'passar uns dias',
      // Opções e escolhas
      'opções', 'opção', 'mostrar', 'ver', 'conhecer', 'apresentar',
      'disponível', 'tem', 'existe', 'há', 'vocês tem', 'vocês têm',
      // Características de preço (sem perguntar orçamento)
      'barato', 'barata', 'econômico', 'econômica', 'em conta', 'mais barato',
      'preço bom', 'preço justo', 'acessível', 'simples', 'básico'
    ],
    price_inquiry: [
      'quanto', 'preço', 'valor', 'custo', 'custa', 'orçamento', 'cotação',
      'quanto custa', 'qual o preço', 'qual o valor', 'quanto fica',
      'quanto sai', 'quanto é', 'preço da diária', 'valor da diária',
      'total', 'quanto no total', 'valor total', 'preço final'
    ],
    availability_check: [
      'disponível', 'disponibilidade', 'livre', 'vago', 'vazia', 'desocupado',
      'datas', 'agenda', 'calendário', 'pode', 'consegue', 'tem vaga',
      'está livre', 'tá livre', 'posso', 'dá para', 'rola'
    ],
    booking_intent: [
      'reservar', 'reserva', 'confirmar', 'fechar', 'quero este', 'quero essa',
      'vou querer', 'pode reservar', 'quero reservar', 'fazer reserva',
      'alugar definitivo', 'fecha comigo', 'topo', 'aceito', 'ok fechou',
      'vamos fechar', 'bora fechar', 'quero confirmar'
    ],
    more_info: [
      'detalhes', 'informações', 'info', 'dados', 'especificações',
      'fotos', 'foto', 'imagem', 'imagens', 'ver fotos', 'mostrar fotos',
      'vídeo', 'video', 'tour', 'virtual', 'localização', 'endereço', 'onde fica',
      'comodidades', 'facilidades', 'o que tem', 'inclui', 'tem o que',
      'mais detalhes', 'saber mais', 'me fala mais', 'conta mais'
    ],
    affirmative: [
      'sim', 'yes', 'ok', 'okay', 'beleza', 'perfeito', 'ótimo', 'excelente',
      'pode ser', 'tá bom', 'tudo bem', 'fechou', 'combinado', 'certo',
      'positivo', 'confirma', 'isso mesmo', 'correto'
    ],
    negative: [
      'não', 'no', 'nao', 'não quero', 'não serve', 'não rola',
      'não é isso', 'não é bem isso', 'não combina', 'negativo'
    ]
  };

  static detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase().trim();
    
    console.log(`🎯 [INTENT] Detectando intenção para: "${lowerMessage}"`);
    
    // Score system - múltiplas intenções podem pontuar
    const scores: Record<string, number> = {};
    
    for (const [intent, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      scores[intent] = 0;
      
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          // Pontuação baseada na precisão do match
          const exactMatch = lowerMessage === pattern;
          const wordMatch = lowerMessage.split(' ').includes(pattern);
          
          if (exactMatch) {
            scores[intent] += 3; // Match exato vale mais
          } else if (wordMatch) {
            scores[intent] += 2; // Palavra completa
          } else {
            scores[intent] += 1; // Substring
          }
        }
      }
    }
    
    // Encontrar a intenção com maior pontuação
    const topIntent = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topIntent) {
      const [intent, score] = topIntent;
      console.log(`✅ [INTENT] Detectado: ${intent} (score: ${score})`);
      console.log(`📊 [INTENT] Todos os scores:`, scores);
      return intent;
    }
    
    console.log(`❓ [INTENT] Nenhuma intenção específica detectada, usando 'general'`);
    return 'general';
  }

  static extractLocation(message: string): string | null {
    // Regex simples para detectar cidades brasileiras comuns
    const cityPattern = /(rio de janeiro|são paulo|belo horizonte|salvador|brasília|fortaleza|recife|porto alegre|curitiba|goiânia|manaus|belém|vitória|natal|joão pessoa|aracaju|maceió|teresina|são luís|macapá|rio branco|boa vista|palmas|cuiabá|campo grande|florianópolis|floripa|copacabana|ipanema|leblon|barra|zona sul|centro)/i;
    
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

// Singleton instance para manter contexto entre requisições
let agentInstance: ProfessionalAgent | null = null;

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

  // Método estático para obter instância singleton
  static getInstance(): ProfessionalAgent {
    if (!agentInstance) {
      console.log('🆕 Criando nova instância singleton do Professional Agent');
      agentInstance = new ProfessionalAgent();
    } else {
      console.log('♻️ Reutilizando instância existente do Professional Agent');
    }
    return agentInstance;
  }

  async processMessage(input: AgentInput): Promise<AgentResponse> {
    try {
      // 1. Detectar intenção
      const intent = IntentDetector.detectIntent(input.message);
      
      // 2. Verificar cache primeiro
      const cachedResponse = this.cache.get(input, intent);
      if (cachedResponse) {
        // Salvar mensagem mesmo se vier do cache
        await this.saveConversationMessages(input, cachedResponse);
        return cachedResponse;
      }

      // 3. Obter contexto do banco de dados ou memória
      const context = await this.getOrCreateContextWithPersistence(input.clientPhone, input.tenantId);
      
      // 4. Obter histórico de conversas se não fornecido
      let conversationHistory = input.conversationHistory;
      if (!conversationHistory || conversationHistory.length === 0) {
        const messageHistory = await conversationContextService.getMessageHistory(
          input.clientPhone,
          input.tenantId,
          10 // Últimas 10 mensagens
        );
        
        conversationHistory = messageHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp.toDate()
        }));
        
        console.log(`📜 [Agent] Histórico carregado: ${conversationHistory.length} mensagens`);
      }

      // 5. Atualizar contexto com nova informação
      this.updateContext(context, input.message, intent);

      // Debug: Log do contexto atual
      console.log(`[Agent] Contexto para ${input.clientPhone}:`, {
        intent,
        stage: context.stage,
        clientData: context.clientData,
        interestedProperties: context.interestedProperties,
        historyLoaded: conversationHistory.length
      });

      // 6. Processar baseado na intenção com histórico
      const response = await this.processBasedOnIntent(input, context, intent, conversationHistory);

      // 7. Salvar mensagens e contexto no banco
      await this.saveConversationMessages(input, response);
      await this.persistContext(input.clientPhone, input.tenantId, context);

      // 8. Cachear resposta se apropriado
      if (this.shouldCache(intent)) {
        this.cache.set(input, intent, response);
      }

      // 9. Incrementar contador de tokens
      await conversationContextService.incrementTokensUsed(
        input.clientPhone,
        input.tenantId,
        response.tokensUsed
      );

      return response;
      
    } catch (error) {
      console.error('❌ [Agent] Erro ao processar mensagem:', error);
      
      // Resposta de erro padrão
      return {
        reply: 'Desculpe, tive um problema técnico. Por favor, tente novamente em alguns instantes. 🙏',
        intent: 'error',
        confidence: 0,
        tokensUsed: 0,
        fromCache: false
      };
    }
  }

  private async processBasedOnIntent(
    input: AgentInput, 
    context: ConversationContext, 
    intent: string,
    conversationHistory?: MessageHistory[]
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
        return await this.handleGeneral(input, context, conversationHistory);
    }
  }

  // ===== HANDLERS ESPECIALIZADOS (SEM REACT LOOPS!) =====

  private handleGreeting(context: ConversationContext): AgentResponse {
    const responses = [
      "Olá! Sou a Sofia, especialista em propriedades para temporada! 😊 Em qual cidade você está procurando?",
      "Oi! Aqui é a Sofia! Vou te ajudar a encontrar o lugar perfeito. Qual cidade você tem em mente?",
      "Olá! Sofia aqui! 🏠 Para onde você está planejando viajar?",
      "Olá! Sou a Sofia e vou te ajudar a encontrar a propriedade ideal! 🏡 Qual destino você está considerando?"
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

    // Usar cidade do contexto se já foi mencionada anteriormente
    const searchLocation = location || context.clientData.city;

    if (!searchLocation) {
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
        location: searchLocation,
        guests: numbers.guests || context.clientData.guests || 2,
        budget: numbers.budget || context.clientData.budget || null,
        checkIn: context.clientData.checkIn,
        checkOut: context.clientData.checkOut
      }
    };

    // Executar busca
    const searchResult = await this.executeAction(searchAction, input.tenantId);
    
    if (!searchResult || searchResult.length === 0) {
      return {
        reply: `Não encontrei propriedades disponíveis em ${searchLocation}. Posso ajudar com outra cidade? 🔍`,
        intent: 'search_properties',
        confidence: 0.8,
        tokensUsed: 15, // Estimativa baixa
        fromCache: false
      };
    }

    // Resposta focada e direcionada
    const lowerMessage = input.message.toLowerCase();
    const wantsMultiple = lowerMessage.includes('opções') || lowerMessage.includes('barato') || 
                         lowerMessage.includes('3') || lowerMessage.includes('mais');
    
    if (wantsMultiple && searchResult.length > 1) {
      // Mostrar múltiplas opções com abordagem mais atrativa
      const topProperties = searchResult.slice(0, 3);
      let reply = `Perfeito! Encontrei ${searchResult.length} propriedades incríveis em ${searchLocation}! 🌟\n\n`;
      
      // Organizar por faixa de preço
      const economica = topProperties[0];
      const intermediaria = topProperties[1];
      const premium = topProperties[2];
      
      reply += `🏡 *Opção Econômica*\n`;
      reply += `*${economica.name}*\n`;
      reply += `✨ ${economica.bedrooms} quarto${economica.bedrooms > 1 ? 's' : ''} | Até ${economica.maxGuests} pessoa${economica.maxGuests > 1 ? 's' : ''}\n`;
      reply += `💰 R$ ${economica.basePrice}/noite\n\n`;
      
      if (intermediaria) {
        reply += `🏠 *Conforto Ideal*\n`;
        reply += `*${intermediaria.name}*\n`;
        reply += `✨ ${intermediaria.bedrooms} quarto${intermediaria.bedrooms > 1 ? 's' : ''} | Até ${intermediaria.maxGuests} pessoa${intermediaria.maxGuests > 1 ? 's' : ''}\n`;
        reply += `💰 R$ ${intermediaria.basePrice}/noite\n\n`;
      }
      
      if (premium) {
        reply += `🌴 *Experiência Completa*\n`;
        reply += `*${premium.name}*\n`;
        reply += `✨ ${premium.bedrooms} quarto${premium.bedrooms > 1 ? 's' : ''} | Até ${premium.maxGuests} pessoa${premium.maxGuests > 1 ? 's' : ''}\n`;
        reply += `💰 R$ ${premium.basePrice}/noite\n\n`;
      }
      
      topProperties.forEach(prop => context.interestedProperties.push(prop.id));
      
      reply += `Qual estilo combina mais com você? Posso mostrar fotos e mais detalhes! 📸`;
      
      return {
        reply,
        actions: [{ ...searchAction, result: searchResult }],
        intent: 'search_properties',
        confidence: 0.9,
        tokensUsed: 35,
        fromCache: false
      };
    } else if (searchResult.length === 1) {
      // Apenas uma propriedade disponível
      const property = searchResult[0];
      context.interestedProperties.push(property.id);

      return {
        reply: `Encontrei a propriedade perfeita para você em ${searchLocation}! 🎯\n\n*${property.name}*\n✨ ${property.bedrooms} quarto${property.bedrooms > 1 ? 's' : ''} | ${property.bathrooms} banheiro${property.bathrooms > 1 ? 's' : ''}\n👥 Acomoda até ${property.maxGuests} pessoa${property.maxGuests > 1 ? 's' : ''}\n💰 Diária a partir de R$ ${property.basePrice}\n\nGostaria de ver as fotos e conhecer todos os detalhes? 📸`,
        actions: [{ ...searchAction, result: searchResult }],
        intent: 'search_properties',
        confidence: 0.9,
        tokensUsed: 25,
        fromCache: false
      };
    } else {
      // Várias propriedades mas não pediu múltiplas
      const property = searchResult[0];
      context.interestedProperties.push(property.id);
      
      return {
        reply: `Excelente escolha! Tenho ${searchResult.length} propriedades disponíveis em ${searchLocation}! 🏖️\n\nDestaque especial:\n*${property.name}*\n✨ ${property.bedrooms} quarto${property.bedrooms > 1 ? 's' : ''} | Até ${property.maxGuests} pessoa${property.maxGuests > 1 ? 's' : ''}\n💰 A partir de R$ ${property.basePrice}/noite\n\nQuer ver esta ou prefere conhecer outras opções? 🤔`,
        actions: [{ ...searchAction, result: searchResult }],
        intent: 'search_properties',
        confidence: 0.9,
        tokensUsed: 25,
        fromCache: false
      };
    }
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
    // Verificar se tem propriedade selecionada
    if (context.interestedProperties.length === 0) {
      return {
        reply: "Vamos escolher primeiro a propriedade ideal para você! Me conta: quantas pessoas vão se hospedar e em quais datas? 📅",
        intent: 'booking_intent',
        confidence: 0.85,
        tokensUsed: 0,
        fromCache: false
      };
    }
    
    // Usar prompt mínimo e direcionado para GPT
    const prompt = `Cliente quer fazer reserva. Contexto: ${JSON.stringify(context.clientData)}. Propriedades interessadas: ${context.interestedProperties.length}. 

Responda em português, máximo 2 linhas, coletando dados que faltam para reserva (nome, datas, confirmação). NUNCA pergunte sobre orçamento.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Usar 3.5 para booking simples!
        messages: [
          {
            role: 'system',
            content: 'Você é Sofia, agente de reservas. Colete apenas nome e datas. NUNCA pergunte sobre valores ou orçamento.'
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
        "Perfeito! Para finalizar sua reserva, preciso do seu nome completo e confirmar as datas desejadas. 📅";

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
        reply: "Perfeito! Para finalizar sua reserva, preciso do seu nome completo e confirmar as datas desejadas. 📅",
        intent: 'booking_intent',
        confidence: 0.7,
        tokensUsed: 0,
        fromCache: false
      };
    }
  }

  private async handleGeneral(input: AgentInput, context: ConversationContext, conversationHistory?: MessageHistory[]): Promise<AgentResponse> {
    // Verificar se a mensagem contém informações sobre datas ou requisitos de busca
    const lowerMessage = input.message.toLowerCase();
    
    // Se está pedindo opções/mostrar e tem cidade no contexto, fazer busca
    if (context.clientData.city && 
        (lowerMessage.includes('opções') || lowerMessage.includes('opção') || 
         lowerMessage.includes('mostrar') || lowerMessage.includes('barato') ||
         lowerMessage.includes('barata'))) {
      console.log(`[Agent] Redirecionando para busca - cidade já conhecida: ${context.clientData.city}`);
      return await this.handlePropertySearch(input, context);
    }
    
    // Se tem informações sobre acomodação mas ainda não tem cidade, perguntar cidade
    if ((lowerMessage.includes('quarto') || lowerMessage.includes('pessoa') || 
         lowerMessage.includes('check in') || lowerMessage.includes('check out')) && 
        !context.clientData.city) {
      return {
        reply: "Perfeito! Em qual cidade você está procurando? 🏙️",
        intent: 'general',
        confidence: 0.9,
        tokensUsed: 0,
        fromCache: false
      };
    }
    
    // Se tem cidade e está dando mais detalhes, fazer busca
    if (context.clientData.city && 
        (lowerMessage.includes('quarto') || lowerMessage.includes('pessoa') || 
         lowerMessage.includes('check in') || lowerMessage.includes('check out') ||
         lowerMessage.includes('hospede') || lowerMessage.includes('hóspede'))) {
      return await this.handlePropertySearch(input, context);
    }
    
    // PROMPT SUPER FOCADO - só para casos que realmente precisam de IA
    const prompt = `Mensagem: "${input.message}"
Contexto: Estágio ${context.stage}, cidade: ${context.clientData.city || 'não informada'}
Dados coletados: ${JSON.stringify(context.clientData)}
${conversationHistory && conversationHistory.length > 0 ? 
  `\nHistórico recente:\n${conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}` : ''}

Responda como Sofia (vendedora imobiliária), máximo 2 linhas. NUNCA pergunte sobre orçamento ou valores. Sempre ofereça mostrar opções disponíveis.`;

    try {
      // Construir mensagens incluindo histórico
      const messages: any[] = [
        {
          role: 'system', 
          content: 'Sofia: vendedora que apresenta opções sem perguntar orçamento. Foque em mostrar propriedades, não em filtrar por preço. NUNCA pergunte valores ou orçamento.'
        }
      ];

      // Adicionar histórico relevante (últimas 5 mensagens)
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-5);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Adicionar mensagem atual
      messages.push({
        role: 'user',
        content: input.message
      });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 80,
        temperature: 0.4
      });

      return {
        reply: completion.choices[0]?.message?.content || "Vou te mostrar as melhores opções disponíveis! 🏠",
        intent: 'general',
        confidence: 0.75,
        tokensUsed: completion.usage?.total_tokens || 40,
        fromCache: false
      };

    } catch (error) {
      return {
        reply: "Vou te mostrar as melhores opções disponíveis! 🏠",
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
    const searchId = Date.now().toString();
    
    try {
      console.log(`🔍 [SEARCH-${searchId}] Iniciando busca de propriedades:`, params);
      
      // Integração com serviço Firebase
      const { propertyService } = await import('@/lib/services/property-service');
      
      // Buscar todas as propriedades do tenant
      const allProperties = await propertyService.getActiveProperties(tenantId);
      console.log(`📊 [SEARCH-${searchId}] Total de propriedades encontradas: ${allProperties.length}`);
      
      if (allProperties.length === 0) {
        console.log(`❌ [SEARCH-${searchId}] Nenhuma propriedade cadastrada para o tenant ${tenantId}`);
        return [];
      }
      
      // Filtrar apenas propriedades ativas
      let filtered = allProperties.filter(p => 
        p.status === 'active' || p.status === 'available' || !p.status
      );
      console.log(`✅ [SEARCH-${searchId}] Propriedades ativas: ${filtered.length}`);
      
      // Filtrar por localização se fornecida
      if (params.location) {
        const location = params.location.toLowerCase();
        const beforeCount = filtered.length;
        
        filtered = filtered.filter(p => {
          const searchableFields = [
            p.location,
            p.address?.city,
            p.address?.state, 
            p.address?.neighborhood,
            p.city,
            p.name,
            p.description
          ].filter(Boolean).map(f => f?.toLowerCase());
          
          return searchableFields.some(field => 
            field?.includes(location) || location.includes(field)
          );
        });
        
        console.log(`🏙️ [SEARCH-${searchId}] Filtro por localização "${location}": ${beforeCount} → ${filtered.length}`);
      }
      
      // Filtrar por número de hóspedes
      if (params.guests && params.guests > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(p => {
          const capacity = p.maxGuests || p.capacity || p.guests || 2;
          return capacity >= params.guests;
        });
        console.log(`👥 [SEARCH-${searchId}] Filtro por hóspedes (${params.guests}): ${beforeCount} → ${filtered.length}`);
      }
      
      // Filtrar por orçamento (apenas se explicitamente fornecido)
      if (params.budget && params.budget > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(p => {
          const price = p.basePrice || p.price || 0;
          return price <= params.budget;
        });
        console.log(`💰 [SEARCH-${searchId}] Filtro por orçamento (≤R$${params.budget}): ${beforeCount} → ${filtered.length}`);
      }
      
      // Ordenar por preço (mais barato primeiro)
      const sorted = filtered.sort((a, b) => {
        const priceA = a.basePrice || a.price || 999999;
        const priceB = b.basePrice || b.price || 999999;
        return priceA - priceB;
      });
      
      // Retornar até 5 resultados formatados
      const results = sorted
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: p.name || 'Propriedade sem nome',
          basePrice: p.basePrice || p.price || 300,
          bedrooms: p.bedrooms || 1,
          bathrooms: p.bathrooms || 1,
          maxGuests: p.maxGuests || p.capacity || p.guests || 2,
          location: p.location || p.address?.city || p.city || 'Localização não informada',
          amenities: p.amenities || [],
          type: p.type || 'apartment',
          status: p.status || 'active'
        }));
      
      console.log(`✅ [SEARCH-${searchId}] Busca finalizada. Retornando ${results.length} propriedades:`);
      results.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.name} - R$${p.basePrice}/noite - ${p.bedrooms}Q - ${p.maxGuests}P - ${p.location}`);
      });
      
      return results;
        
    } catch (error) {
      console.error(`❌ [SEARCH-${searchId}] Erro na busca de propriedades:`, error);
      
      // Em caso de erro, tentar busca básica
      try {
        console.log(`🔄 [SEARCH-${searchId}] Tentando busca básica fallback...`);
        const { propertyService } = await import('@/lib/services/property-service');
        const basicProperties = await propertyService.getActiveProperties(tenantId);
        
        return basicProperties.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name || 'Propriedade',
          basePrice: p.basePrice || 300,
          bedrooms: p.bedrooms || 1,
          bathrooms: p.bathrooms || 1, 
          maxGuests: p.maxGuests || 2,
          location: p.location || 'Não informado',
          amenities: []
        }));
      } catch (fallbackError) {
        console.error(`❌ [SEARCH-${searchId}] Erro na busca fallback também:`, fallbackError);
        return [];
      }
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

  // ===== GESTÃO DE CONTEXTO OTIMIZADA COM PERSISTÊNCIA =====

  private async getOrCreateContextWithPersistence(
    clientPhone: string, 
    tenantId: string
  ): Promise<ConversationContext> {
    // Verificar memória primeiro
    if (this.conversationContexts.has(clientPhone)) {
      const existingContext = this.conversationContexts.get(clientPhone);
      console.log(`📊 [Agent] Contexto em memória para ${clientPhone}`);
      return existingContext!;
    }

    // Buscar do banco de dados
    try {
      const dbContext = await conversationContextService.getOrCreateContext(clientPhone, tenantId);
      
      // Converter formato do banco para formato interno
      const context: ConversationContext = {
        intent: dbContext.context.intent,
        stage: dbContext.context.stage,
        clientData: dbContext.context.clientData,
        interestedProperties: dbContext.context.interestedProperties,
        lastAction: dbContext.context.lastAction
      };
      
      // Salvar na memória para acesso rápido
      this.conversationContexts.set(clientPhone, context);
      
      console.log(`📊 [Agent] Contexto carregado do banco para ${clientPhone}:`, {
        stage: context.stage,
        clientData: context.clientData,
        interestedProperties: context.interestedProperties?.length || 0
      });
      
      return context;
    } catch (error) {
      console.error('❌ [Agent] Erro ao buscar contexto do banco, criando novo:', error);
      return this.getOrCreateContext(clientPhone);
    }
  }

  private getOrCreateContext(clientPhone: string): ConversationContext {
    if (!this.conversationContexts.has(clientPhone)) {
      console.log(`🆕 [Agent] Criando novo contexto para ${clientPhone}`);
      this.conversationContexts.set(clientPhone, {
        intent: 'greeting',
        stage: 'greeting',
        clientData: {},
        interestedProperties: [],
        lastAction: undefined
      });
    } else {
      const existingContext = this.conversationContexts.get(clientPhone);
      console.log(`📊 [Agent] Contexto existente para ${clientPhone}:`, {
        stage: existingContext?.stage,
        clientData: existingContext?.clientData,
        interestedProperties: existingContext?.interestedProperties?.length || 0,
        totalContexts: this.conversationContexts.size
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

    // Extrair datas se mencionadas
    const datePattern = /dia\s+(\d{1,2})\s+de\s+(\w+)/gi;
    const dateMatches = [...message.matchAll(datePattern)];
    
    if (dateMatches.length > 0) {
      // Mapear meses em português
      const monthMap: Record<string, number> = {
        janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
        julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
      };
      
      dateMatches.forEach((match, index) => {
        const day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        const month = monthMap[monthName];
        
        if (month !== undefined) {
          const year = new Date().getFullYear();
          const date = new Date(year, month, day);
          
          if (index === 0 && message.includes('check in')) {
            context.clientData.checkIn = date.toISOString().split('T')[0];
          } else if ((index === 1 || message.includes('check out')) && !context.clientData.checkIn) {
            context.clientData.checkOut = date.toISOString().split('T')[0];
          } else if (index === 1) {
            context.clientData.checkOut = date.toISOString().split('T')[0];
          }
        }
      });
    }

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

  // Limpar contexto de um cliente específico (útil para testes)
  clearClientContext(clientPhone: string): void {
    if (this.conversationContexts.has(clientPhone)) {
      console.log(`[Agent] Limpando contexto para ${clientPhone}`);
      this.conversationContexts.delete(clientPhone);
    }
  }

  // Limpar todos os contextos (útil para reset completo)
  clearAllContexts(): void {
    console.log(`[Agent] Limpando todos os ${this.conversationContexts.size} contextos`);
    this.conversationContexts.clear();
  }

  // ===== MÉTODOS DE PERSISTÊNCIA =====

  private async saveConversationMessages(
    input: AgentInput,
    response: AgentResponse
  ): Promise<void> {
    try {
      // Salvar mensagem do usuário
      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        {
          role: 'user',
          content: input.message
        }
      );

      // Salvar resposta do assistente
      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        {
          role: 'assistant',
          content: response.reply,
          intent: response.intent,
          confidence: response.confidence,
          tokensUsed: response.tokensUsed,
          fromCache: response.fromCache
        }
      );
    } catch (error) {
      console.error('❌ [Agent] Erro ao salvar mensagens:', error);
    }
  }

  private async persistContext(
    clientPhone: string,
    tenantId: string,
    context: ConversationContext
  ): Promise<void> {
    try {
      await conversationContextService.updateContext(
        clientPhone,
        tenantId,
        {
          intent: context.intent,
          stage: context.stage,
          clientData: context.clientData,
          interestedProperties: context.interestedProperties,
          lastAction: context.lastAction
        }
      );
    } catch (error) {
      console.error('❌ [Agent] Erro ao persistir contexto:', error);
    }
  }

  // Método de teste para verificar se o singleton está funcionando
  static testSingleton(): { working: boolean; details: any } {
    console.log('🧪 [SINGLETON-TEST] Iniciando teste do singleton...');
    
    // Limpar instância anterior se houver
    agentInstance = null;
    
    // Criar primeira instância
    const agent1 = ProfessionalAgent.getInstance();
    console.log('✅ [SINGLETON-TEST] Primeira instância criada');
    
    // Criar segunda instância
    const agent2 = ProfessionalAgent.getInstance();
    console.log('✅ [SINGLETON-TEST] Segunda instância obtida');
    
    const sameInstance = agent1 === agent2;
    console.log(`🔍 [SINGLETON-TEST] Mesmo objeto: ${sameInstance}`);
    
    // Testar contexto
    const testPhone = '5511999999999';
    
    // Adicionar contexto via agent1
    const context1 = agent1.getOrCreateContext(testPhone);
    context1.clientData.city = 'Florianópolis';
    context1.stage = 'discovery';
    
    // Verificar via agent2
    const context2 = agent2.getOrCreateContext(testPhone);
    const contextPersisted = context2.clientData.city === 'Florianópolis' && context2.stage === 'discovery';
    
    const result = {
      working: sameInstance && contextPersisted,
      details: {
        same_instance: sameInstance,
        context_persisted: contextPersisted,
        agent1_stats: agent1.getAgentStats(),
        agent2_stats: agent2.getAgentStats(),
        context1_city: context1.clientData.city,
        context2_city: context2.clientData.city,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('🎯 [SINGLETON-TEST] Resultado:', result);
    return result;
  }
}