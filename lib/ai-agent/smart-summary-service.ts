// lib/ai-agent/smart-summary-service.ts
// SISTEMA DE SUMÁRIO INTELIGENTE - Sofia V5 CORRIGIDO
// Extrai e mantém informações relevantes progressivamente com logs detalhados

import OpenAI from 'openai';
import { logger } from '@/lib/utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SmartSummary {
  // Cliente
  clientInfo: {
    name?: string;
    phone?: string;
    document?: string;
    email?: string;
    preferences?: any;
  };

  // Necessidades identificadas
  searchCriteria: {
    guests?: number;
    checkIn?: string;
    checkOut?: string;
    location?: string;
    budget?: number;
    amenities?: string[];
    propertyType?: string;
  };

  // Propriedades vistas (COM IDs REAIS)
  propertiesViewed: Array<{
    id: string; // ✅ ID REAL do banco de dados
    name: string;
    price: number;
    interested: boolean;
    photosViewed: boolean;
    priceCalculated: boolean;
    location?: string;
    bedrooms?: number;
    maxGuests?: number;
  }>;

  // Estado da conversa
  conversationState: {
    stage: 'greeting' | 'discovery' | 'presentation' | 'engagement' | 'negotiation' | 'booking' | 'completed' | 'visit_scheduled';
    lastIntent: string;
    buyingSignals: string[];
    objections: string[];
    urgency: 'low' | 'medium' | 'high';
  };

  // Próxima ação sugerida
  nextBestAction: {
    action: string;
    reason: string;
    confidence: number;
  };

  lastUpdated: Date;
  version: string;
}

export class SmartSummaryService {
  private static instance: SmartSummaryService;
  // Cache para performance
  private summaryCache = new Map<string, {summary: SmartSummary, timestamp: number}>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  static getInstance(): SmartSummaryService {
    if (!this.instance) {
      this.instance = new SmartSummaryService();
    }
    return this.instance;
  }

  /**
   * NOVA FUNÇÃO: Limpar cache para um cliente específico
   */
  clearCacheForClient(clientPhone: string): void {
    // Remove todas as entradas de cache relacionadas ao cliente
    const keysToDelete: string[] = [];
    for (const [key, value] of this.summaryCache.entries()) {
      if (key.includes(clientPhone.substring(0, 8))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.summaryCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 [SmartSummary] Cache limpo: ${keysToDelete.length} entradas removidas para ${clientPhone.substring(0, 4)}***`);
    }
  }

  /**
   * NOVA FUNÇÃO: Cache management
   */
  private getCacheKey(message: string, previousSummary: SmartSummary | null): string {
    const summaryHash = previousSummary ? 
      JSON.stringify(previousSummary).substring(0, 100) : 'null';
    return `${message.substring(0, 50)}_${summaryHash}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private getFromCache(cacheKey: string): SmartSummary | null {
    const cached = this.summaryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.summary;
    }
    if (cached) {
      this.summaryCache.delete(cacheKey); // Remove expired
    }
    return null;
  }

  private setCache(cacheKey: string, summary: SmartSummary): void {
    this.summaryCache.set(cacheKey, {
      summary: { ...summary },
      timestamp: Date.now()
    });
    
    // Cleanup old entries
    if (this.summaryCache.size > 100) {
      const oldestKey = this.summaryCache.keys().next().value;
      this.summaryCache.delete(oldestKey);
    }
  }

  /**
   * Extrai informações da mensagem e atualiza o sumário
   */
  async updateSummary(
      currentMessage: string,
      previousSummary: SmartSummary | null,
      conversationHistory: Array<{ role: string; content: string }>
  ): Promise<SmartSummary> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(currentMessage, previousSummary);
      const cachedSummary = this.getFromCache(cacheKey);
      
      if (cachedSummary) {
        logger.info('⚡ [SmartSummary] Cache hit', {
          messageLength: currentMessage.length
        });
        return cachedSummary;
      }

      // Log reduzido para performance
      logger.info('🧠 [SmartSummary] Atualizando sumário', {
        messageLength: currentMessage.length,
        hasPreviousSummary: !!previousSummary,
        historyLength: conversationHistory.length
      });

      // Construir prompt otimizado para extração
      const extractionPrompt = this.buildExtractionPrompt(
          currentMessage,
          previousSummary,
          conversationHistory
      );

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('Resposta vazia do OpenAI');
      }

      // Log reduzido
      logger.info('🤖 [SmartSummary] IA processada', {
        tokensUsed: completion.usage?.total_tokens || 0
      });

      // Parse e validação da resposta
      let updatedSummary: SmartSummary;
      try {
        updatedSummary = JSON.parse(result) as SmartSummary;
      } catch (parseError) {
        logger.error('❌ [SmartSummary] Parse JSON falhou', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error'
        });
        throw new Error('Erro ao processar resposta da IA');
      }

      // Validar e corrigir estrutura
      updatedSummary = this.validateAndFixSummary(updatedSummary, previousSummary);

      // Aplicar inteligência de datas
      updatedSummary = this.applyDateIntelligence(updatedSummary, currentMessage);

      // Aplicar correções específicas conhecidas
      updatedSummary = this.applyKnownFixes(updatedSummary, currentMessage);

      // Validar consistência
      const validation = this.validateSummaryConsistency(updatedSummary);
      if (!validation.isValid) {
        logger.warn('⚠️ [SmartSummary] Inconsistências detectadas após atualização', {
          issues: validation.issues,
          applying: validation.fixes
        });
        updatedSummary = this.applyConsistencyFixes(updatedSummary, validation.fixes);
      }

      // Marcar timestamp e versão
      updatedSummary.lastUpdated = new Date();
      updatedSummary.version = '2.0';

      const processingTime = Date.now() - startTime;

      logger.info('✅ [SmartSummary] Sumário atualizado com sucesso', {
        processingTime: `${processingTime}ms`,
        clientInfo: !!updatedSummary.clientInfo.name,
        guests: updatedSummary.searchCriteria.guests,
        guestsType: typeof updatedSummary.searchCriteria.guests,
        propertiesCount: updatedSummary.propertiesViewed.length,
        stage: updatedSummary.conversationState.stage,
        urgency: updatedSummary.conversationState.urgency,
        checkIn: updatedSummary.searchCriteria.checkIn,
        checkOut: updatedSummary.searchCriteria.checkOut,
        location: updatedSummary.searchCriteria.location,
        buyingSignals: updatedSummary.conversationState.buyingSignals.length,
        confidence: updatedSummary.nextBestAction.confidence,
        validProperties: updatedSummary.propertiesViewed.filter(p => p.id && p.id.length >= 15).length
      });

      // Cache the result
      this.setCache(cacheKey, updatedSummary);

      return updatedSummary;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('❌ [SmartSummary] Erro na extração', {
        error: error instanceof Error ? error.message : 'Unknown error',
        time: `${processingTime}ms`
      });

      // Fallback: retorna sumário anterior ou básico
      return previousSummary || this.createEmptySummary();
    }
  }

  /**
   * NOVA FUNÇÃO: Inteligência de datas para correção automática
   */
  private applyDateIntelligence(summary: SmartSummary, currentMessage: string): SmartSummary {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Detectar e corrigir datas no passado
    if (summary.searchCriteria.checkIn) {
      const checkInDate = new Date(summary.searchCriteria.checkIn);
      if (checkInDate.getFullYear() < currentYear) {
        // Corrigir ano para ano atual
        checkInDate.setFullYear(currentYear);
        summary.searchCriteria.checkIn = checkInDate.toISOString().split('T')[0];
        
        logger.info('🗓️ [DateIntelligence] Check-in corrigido', {
          corrected: checkInDate.toISOString().split('T')[0]
        });
      }
      
      // Se ainda estiver no passado, mover para o futuro próximo
      if (checkInDate < today) {
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        summary.searchCriteria.checkIn = nextMonth.toISOString().split('T')[0];
        
        logger.info('🗓️ [DateIntelligence] Check-in movido para próximo mês', {
          newDate: summary.searchCriteria.checkIn
        });
      }
    }
    
    if (summary.searchCriteria.checkOut) {
      const checkOutDate = new Date(summary.searchCriteria.checkOut);
      if (checkOutDate.getFullYear() < currentYear) {
        checkOutDate.setFullYear(currentYear);
        summary.searchCriteria.checkOut = checkOutDate.toISOString().split('T')[0];
      }
      
      // Garantir que check-out seja após check-in
      if (summary.searchCriteria.checkIn) {
        const checkInDate = new Date(summary.searchCriteria.checkIn);
        if (checkOutDate <= checkInDate) {
          const newCheckOut = new Date(checkInDate);
          newCheckOut.setDate(checkInDate.getDate() + 2); // 2 dias depois
          summary.searchCriteria.checkOut = newCheckOut.toISOString().split('T')[0];
          
          logger.info('🗓️ [DateIntelligence] Check-out ajustado', {
            checkIn: summary.searchCriteria.checkIn,
            checkOut: summary.searchCriteria.checkOut
          });
        }
      }
    }
    
    return summary;
  }

  /**
   * Sistema de prompt otimizado
   */
  private getSystemPrompt(): string {
    return `Você é um extrator de informações especializado em conversas imobiliárias.

OBJETIVO: Extrair e organizar informações úteis da conversa SOMENTE quando relevante.

🚨 REGRA CRÍTICA - EXTRAÇÃO DE PESSOAS:
SE a mensagem contém qualquer número seguido de "pessoas" OU menção a acompanhantes:
- "2 pessoas" → guests: 2
- "3 pessoas" → guests: 3  
- "apartamento 2 pessoas" → guests: 2
- "apartamento para 2" → guests: 2
- "eu e minha esposa" → guests: 2
- "casal" → guests: 2
- "família" → guests: 4 (padrão)
- "nós dois" → guests: 2
- "comigo e mais um" → guests: 2

OBRIGATÓRIO: Se identificar qualquer número de pessoas, SEMPRE incluir no searchCriteria.guests!

🚨 REGRA CRÍTICA - IDs DE PROPRIEDADES:
- JAMAIS aceite ou use IDs fictícios como "primeira", "segunda", "1", "2", "ABC123"
- SOMENTE use IDs REAIS que começam com caracteres aleatórios e têm 15+ caracteres
- Se encontrar ID inválido, marque como "INVALID_ID" para correção posterior
- Exemplos de IDs VÁLIDOS: "2a3b4c5d6e7f8g9h0i1j2k3l", "prop_abc123xyz789def456"
- Exemplos de IDs INVÁLIDOS: "primeira", "1", "2", "abc123", "property1"

OUTRAS REGRAS:
1. SE a mensagem é apenas cumprimento/casual ("Oi", "Como está?", "Tudo bem?") 
   → NÃO FORCE contexto comercial
   → Mantenha stage como 'greeting' até haver intenção comercial real
2. SEMPRE preserve informações já coletadas
3. ADICIONE novas informações sem sobrescrever antigas
4. Detecte SINAIS DE COMPRA e OBJEÇÕES
5. Identifique URGÊNCIA temporal
6. Retorne JSON válido SEMPRE

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "clientInfo": { ... },
  "searchCriteria": { 
    "guests": número_de_pessoas_extraído,
    "checkIn": "YYYY-MM-DD",
    "checkOut": "YYYY-MM-DD",
    "location": "cidade/região",
    "budget": valor_numérico,
    ... 
  },
  "propertiesViewed": [
    {
      "id": "ID_REAL_OU_INVALID_ID",
      "name": "nome",
      "price": valor,
      "interested": boolean,
      "photosViewed": boolean,
      "priceCalculated": boolean
    }
  ],
  "conversationState": { 
    "stage": "greeting|discovery|presentation|engagement|negotiation|booking|completed",
    "lastIntent": "descrição",
    "buyingSignals": ["lista", "de", "sinais"],
    "objections": ["lista", "de", "objeções"],
    "urgency": "low|medium|high"
  },
  "nextBestAction": { 
    "action": "ação_recomendada",
    "reason": "razão",
    "confidence": 0.0-1.0
  }
}`;
  }

  /**
   * Constrói o prompt de extração
   */
  private buildExtractionPrompt(
      currentMessage: string,
      previousSummary: SmartSummary | null,
      history: Array<{ role: string; content: string }>
  ): string {
    const recentHistory = history.slice(-6).map(msg =>
        `${msg.role}: ${msg.content}`
    ).join('\n');

    return `
MENSAGEM ATUAL: "${currentMessage}"

SUMÁRIO ANTERIOR: ${previousSummary ? JSON.stringify(previousSummary, null, 2) : 'null'}

CONTEXTO (últimas mensagens):
${recentHistory}

INSTRUÇÕES ESPECÍFICAS:

1. INFORMAÇÕES DO CLIENTE:
   - Nome, telefone, CPF, email
   - Preferências mencionadas

2. CRITÉRIOS DE BUSCA:
   - Pessoas: CRÍTICO! Extrair número de pessoas DA MENSAGEM ATUAL:
     * "2 pessoas" = 2
     * "3 pessoas" = 3
     * "apartamento 2 pessoas" = 2
     * "apartamento para 2" = 2
     * "eu e minha esposa" = 2
     * "eu e meu marido" = 2 
     * "com minha esposa" = 2
     * "para mim e minha esposa" = 2
     * "nós dois" = 2
     * "casal" = 2
     * "família" = 4 (padrão)
     * SEMPRE procure números + "pessoas" primeiro
     * Se mencionado qualquer número de pessoas, OBRIGATÓRIO incluir em searchCriteria.guests
   - Datas: qualquer menção temporal específica (formato YYYY-MM-DD)
   - Localização: cidade, bairro, região específica
   - Orçamento: valores monetários mencionados
   - Tipo: apartamento, casa, studio, etc.

3. PROPRIEDADES VISTAS:
   - VALIDAR IDs: use apenas IDs REAIS (15+ caracteres), marque inválidos como "INVALID_ID"
   - Interesse demonstrado
   - Ações realizadas (fotos vistas, preços calculados)

4. ESTADO DA CONVERSA:
   - Stage: greeting → discovery → presentation → engagement → negotiation → booking → completed
   - Sinais de compra: "quero", "perfeito", "confirmar", "reservar", "gostei"
   - Objeções: "caro", "pequeno", "longe", "não tenho certeza"
   - Urgência: datas próximas = high, "urgente" = high, indefinido = low

5. PRÓXIMA AÇÃO:
   - Baseada no contexto atual e progressão natural
   - Confiança baseada na qualidade dos dados coletados

IMPORTANTE: 
- PRESERVE informações anteriores válidas
- ADICIONE novas informações sem sobrescrever antigas
- NÃO invente dados não mencionados
- Seja preciso na interpretação
- VALIDE IDs de propriedades
`;
  }

  /**
   * Valida e corrige estrutura do sumário
   */
  private validateAndFixSummary(
      summary: SmartSummary,
      previousSummary: SmartSummary | null
  ): SmartSummary {
    // Log reduzido

    // Garantir estrutura básica
    if (!summary.clientInfo) summary.clientInfo = {};
    if (!summary.searchCriteria) summary.searchCriteria = {};
    if (!summary.propertiesViewed) summary.propertiesViewed = [];
    if (!summary.conversationState) {
      summary.conversationState = {
        stage: 'greeting',
        lastIntent: 'greeting',
        buyingSignals: [],
        objections: [],
        urgency: 'low'
      };
    }
    if (!summary.nextBestAction) {
      summary.nextBestAction = {
        action: 'discovery',
        reason: 'Descobrir necessidades do cliente',
        confidence: 0.8
      };
    }

    // ✅ PRESERVAÇÃO CRÍTICA: Sempre manter informações do cliente
    if (previousSummary) {
      // CRÍTICO: Preservar informações do cliente SEMPRE (mesmo se summary vier vazio)
      if (previousSummary.clientInfo.name) {
        summary.clientInfo.name = previousSummary.clientInfo.name;
      }
      if (previousSummary.clientInfo.phone) {
        summary.clientInfo.phone = previousSummary.clientInfo.phone;
      }
      if (previousSummary.clientInfo.document) {
        summary.clientInfo.document = previousSummary.clientInfo.document;
      }
      if (previousSummary.clientInfo.email) {
        summary.clientInfo.email = previousSummary.clientInfo.email;
      }
      if (previousSummary.clientInfo.preferences) {
        summary.clientInfo.preferences = previousSummary.clientInfo.preferences;
      }

      // Preservar critérios se não foram atualizados
      if (!summary.searchCriteria.guests && previousSummary.searchCriteria.guests) {
        summary.searchCriteria.guests = previousSummary.searchCriteria.guests;
      }
      if (!summary.searchCriteria.location && previousSummary.searchCriteria.location) {
        summary.searchCriteria.location = previousSummary.searchCriteria.location;
      }
      if (!summary.searchCriteria.checkIn && previousSummary.searchCriteria.checkIn) {
        summary.searchCriteria.checkIn = previousSummary.searchCriteria.checkIn;
      }
      if (!summary.searchCriteria.checkOut && previousSummary.searchCriteria.checkOut) {
        summary.searchCriteria.checkOut = previousSummary.searchCriteria.checkOut;
      }

      // Merge propriedades vistas (manter IDs válidos)
      const validPreviousProperties = previousSummary.propertiesViewed.filter(p =>
          p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
      );

      if (validPreviousProperties.length > 0 && summary.propertiesViewed.length === 0) {
        summary.propertiesViewed = validPreviousProperties;
      }

      // ✅ PROTEÇÃO DE STAGE: Evitar regressão se cliente já está registrado
      if (previousSummary.clientInfo.name && summary.conversationState.stage === 'negotiation') {
        // Se cliente já estava registrado, manter stage avançado
        if (previousSummary.conversationState.stage === 'booking' || 
            previousSummary.conversationState.stage === 'completed' ||
            previousSummary.conversationState.stage === 'visit_scheduled') {
          summary.conversationState.stage = previousSummary.conversationState.stage;
        }
      }

      // Merge buying signals e objections
      const prevSignals = previousSummary.conversationState.buyingSignals || [];
      const newSignals = summary.conversationState.buyingSignals || [];
      summary.conversationState.buyingSignals = [...new Set([...prevSignals, ...newSignals])];

      const prevObjections = previousSummary.conversationState.objections || [];
      const newObjections = summary.conversationState.objections || [];
      summary.conversationState.objections = [...new Set([...prevObjections, ...newObjections])];
    }

    // Log reduzido para performance

    return summary;
  }

  /**
   * Aplicar correções específicas conhecidas
   */
  private applyKnownFixes(summary: SmartSummary, currentMessage: string): SmartSummary {
    // Log reduzido para performance

    // CORREÇÃO CRÍTICA: Forçar extração de pessoas se não foi extraído
    if (!summary.searchCriteria.guests && currentMessage) {
      const guestExtractions = [
        { pattern: /(\d+)\s*pessoas?/i, msg: 'número + pessoas' },
        { pattern: /apartamento\s+(\d+)/i, msg: 'apartamento + número' },
        { pattern: /para\s+(\d+)/i, msg: 'para + número' },
        { pattern: /(\d+)\s*hóspedes?/i, msg: 'número + hóspedes' }
      ];

      for (const extraction of guestExtractions) {
        const match = currentMessage.match(extraction.pattern);
        if (match) {
          const guests = parseInt(match[1]);
          summary.searchCriteria.guests = guests;
          logger.info('🔧 [SmartSummary] Guests extraído', {
            guests,
            pattern: extraction.msg
          });
          break;
        }
      }

      // Padrões específicos de casal/família
      const specialPatterns = [
        { pattern: /\b(casal|eu e minha? esposa|eu e meu marido)\b/i, guests: 2, msg: 'padrão casal' },
        { pattern: /\b(família|family)\b/i, guests: 4, msg: 'padrão família' },
        { pattern: /\b(nós dois|we two)\b/i, guests: 2, msg: 'nós dois' },
        { pattern: /\b(comigo e mais um|me and one more)\b/i, guests: 2, msg: 'comigo e mais um' }
      ];

      for (const pattern of specialPatterns) {
        if (currentMessage.toLowerCase().match(pattern.pattern)) {
          summary.searchCriteria.guests = pattern.guests;
          logger.info('🔧 [SmartSummary] Guests extraído (padrão)', {
            guests: pattern.guests
          });
          break;
        }
      }
    }

    // Validar e corrigir IDs de propriedades
    summary.propertiesViewed = summary.propertiesViewed.map(property => {
      if (this.isInvalidPropertyId(property.id)) {
        logger.warn('🚨 [SmartSummary] PropertyId inválido', {
          invalidId: property.id
        });
        return {
          ...property,
          id: 'INVALID_ID', // Marcar para correção posterior
          needsValidation: true
        };
      }
      return property;
    });

    // Filtrar propriedades com IDs marcados como inválidos
    const validProperties = summary.propertiesViewed.filter(p => p.id !== 'INVALID_ID');
    if (validProperties.length !== summary.propertiesViewed.length) {
      logger.warn('⚠️ [SmartSummary] IDs inválidos removidos', {
        removed: summary.propertiesViewed.length - validProperties.length
      });
      summary.propertiesViewed = validProperties;
    }

    // Corrigir stage baseado no contexto
    if (summary.propertiesViewed.length > 0 && summary.conversationState.stage === 'greeting') {
      summary.conversationState.stage = 'presentation';
      logger.info('🔧 [SmartSummary] Stage corrigido: greeting → presentation');
    }

    if (summary.propertiesViewed.some(p => p.priceCalculated) && summary.conversationState.stage === 'presentation') {
      summary.conversationState.stage = 'negotiation';
      logger.info('🔧 [SmartSummary] Stage corrigido: presentation → negotiation');
    }

    // Corrigir confiança baseada na qualidade dos dados
    const dataQuality = this.calculateDataQuality(summary);
    if (summary.nextBestAction.confidence !== dataQuality.confidence) {
      summary.nextBestAction.confidence = dataQuality.confidence;
      logger.info('🔧 [SmartSummary] Confiança ajustada', {
        newConfidence: dataQuality.confidence
      });
    }

    return summary;
  }

  /**
   * Detectar IDs inválidos
   */
  private isInvalidPropertyId(id: string): boolean {
    if (!id) return true;

    const invalidPatterns = [
      'primeira', 'segunda', 'terceira', 'quarta', 'quinta',
      'primeira_opcao', 'segunda_opcao',
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'abc123', 'property1', 'property2', 'prop1', 'prop2',
      'apto1', 'apartamento1', 'casa1', 'imovel1',
      'default', 'example', 'test', 'sample', 'demo'
    ];

    return invalidPatterns.includes(id.toLowerCase()) ||
        id.length < 15 ||
        /^[0-9]{1,3}$/.test(id) ||
        /^[A-Z]{3}[0-9]{3}$/.test(id);
  }

  /**
   * Calcular qualidade dos dados
   */
  private calculateDataQuality(summary: SmartSummary): { score: number; confidence: number } {
    let score = 0;
    let maxScore = 0;

    // Cliente info (peso: 20)
    maxScore += 20;
    if (summary.clientInfo.name) score += 8;
    if (summary.clientInfo.phone) score += 4;
    if (summary.clientInfo.document) score += 4;
    if (summary.clientInfo.email) score += 4;

    // Search criteria (peso: 30)
    maxScore += 30;
    if (summary.searchCriteria.guests) score += 10;
    if (summary.searchCriteria.checkIn) score += 8;
    if (summary.searchCriteria.checkOut) score += 8;
    if (summary.searchCriteria.location) score += 4;

    // Properties viewed (peso: 25)
    maxScore += 25;
    if (summary.propertiesViewed.length > 0) score += 10;
    if (summary.propertiesViewed.some(p => p.interested)) score += 8;
    if (summary.propertiesViewed.some(p => p.priceCalculated)) score += 7;

    // Conversation state (peso: 25)
    maxScore += 25;
    if (summary.conversationState.stage !== 'greeting') score += 8;
    if (summary.conversationState.buyingSignals.length > 0) score += 10;
    if (summary.conversationState.urgency === 'high') score += 7;

    const finalScore = (score / maxScore) * 100;
    const confidence = Math.min(Math.max(finalScore / 100, 0.1), 0.95);

    return { score: finalScore, confidence };
  }

  /**
   * Validar consistência do sumário
   */
  validateSummaryConsistency(summary: SmartSummary): {
    isValid: boolean;
    issues: string[];
    fixes: any;
  } {
    const issues: string[] = [];
    const fixes: any = {};

    // Log reduzido para performance

    // Validar IDs de propriedades
    if (summary.propertiesViewed) {
      const invalidProperties = summary.propertiesViewed.filter(p =>
          !p.id ||
          p.id.length < 15 ||
          this.isInvalidPropertyId(p.id)
      );

      if (invalidProperties.length > 0) {
        issues.push(`Propriedades com IDs inválidos: ${invalidProperties.map(p => p.id).join(', ')}`);
        fixes.needsPropertySearch = true;
      }
    }

    // Validar datas
    if (summary.searchCriteria.checkIn && summary.searchCriteria.checkOut) {
      const checkIn = new Date(summary.searchCriteria.checkIn);
      const checkOut = new Date(summary.searchCriteria.checkOut);

      if (checkIn >= checkOut) {
        issues.push('Data de check-out deve ser após check-in');
        fixes.needsDateCorrection = true;
      }

      if (checkIn < new Date()) {
        issues.push('Data de check-in no passado');
        fixes.needsDateCorrection = true;
      }
    }

    // Validar consistência de stage
    if (summary.conversationState.stage === 'presentation' && summary.propertiesViewed.length === 0) {
      issues.push('Stage presentation mas sem propriedades');
      fixes.stageCorrection = 'discovery';
    }

    if (summary.conversationState.stage === 'negotiation' && !summary.propertiesViewed.some(p => p.priceCalculated)) {
      issues.push('Stage negotiation mas sem preços calculados');
      fixes.stageCorrection = 'presentation';
    }

    if (summary.conversationState.stage === 'booking' && !summary.clientInfo.name) {
      issues.push('Stage booking mas sem dados do cliente');
      fixes.stageCorrection = 'negotiation';
      fixes.needsClientRegistration = true;
    }

    // Validar guests
    if (!summary.searchCriteria.guests && summary.conversationState.stage !== 'greeting') {
      issues.push('Sem número de pessoas definido');
      fixes.needsGuestInfo = true;
    }

    const isValid = issues.length === 0;

    // Log apenas se houver problemas
    if (!isValid) {
      logger.warn('⚠️ [SmartSummary] Inconsistências', {
        issuesCount: issues.length
      });
    }

    return { isValid, issues, fixes };
  }

  /**
   * Aplicar correções de consistência
   */
  private applyConsistencyFixes(summary: SmartSummary, fixes: any): SmartSummary {
    // Log reduzido

    if (fixes.stageCorrection) {
      summary.conversationState.stage = fixes.stageCorrection;
    }

    if (fixes.needsDateCorrection) {
      // Remover datas inválidas
      if (summary.searchCriteria.checkIn && new Date(summary.searchCriteria.checkIn) < new Date()) {
        delete summary.searchCriteria.checkIn;
      }
      if (summary.searchCriteria.checkOut && summary.searchCriteria.checkIn &&
          new Date(summary.searchCriteria.checkOut) <= new Date(summary.searchCriteria.checkIn)) {
        delete summary.searchCriteria.checkOut;
      }
    }

    if (fixes.needsPropertySearch) {
      // Atualizar próxima ação para buscar propriedades
      summary.nextBestAction = {
        action: 'search_properties',
        reason: 'Buscar propriedades com IDs válidos',
        confidence: 0.9
      };
    }

    return summary;
  }

  /**
   * NOVA FUNÇÃO: Atualizar sumário com resultados de funções
   */
  async updateSummaryWithFunctionResult(
      summary: SmartSummary,
      functionName: string,
      args: any,
      result: any
  ): Promise<SmartSummary> {
    const updatedSummary = { ...summary };

    try {
      // Log reduzido
      logger.info('🔄 [SmartSummary] Função executada', {
        function: functionName,
        success: result.success
      });

      switch (functionName) {
        case 'search_properties':
          if (result.success && result.properties && result.properties.length > 0) {
            // ✅ CRÍTICO: Preservar IDs reais das propriedades
            updatedSummary.propertiesViewed = result.properties.map((p: any) => ({
              id: p.id, // ✅ ID real do banco de dados
              name: p.name || p.title || 'Propriedade',
              price: p.basePrice || p.price || 0,
              interested: false,
              photosViewed: false,
              priceCalculated: false,
              // ✅ Dados extras para contexto
              location: p.location || p.city,
              bedrooms: p.bedrooms,
              maxGuests: p.maxGuests
            }));

            // Atualizar critérios de busca
            if (args.guests) updatedSummary.searchCriteria.guests = args.guests;
            if (args.location) updatedSummary.searchCriteria.location = args.location;
            if (args.checkIn) updatedSummary.searchCriteria.checkIn = args.checkIn;
            if (args.checkOut) updatedSummary.searchCriteria.checkOut = args.checkOut;

            // Atualizar stage
            updatedSummary.conversationState.stage = 'presentation';
            updatedSummary.nextBestAction = {
              action: 'show_property_details',
              reason: 'Propriedades encontradas, apresentar opções',
              confidence: 0.9
            };

            logger.info('✅ [SmartSummary] Propriedades atualizadas', {
              count: updatedSummary.propertiesViewed.length
            });
          }
          break;

        case 'send_property_media':
          if (result.success && args.propertyId) {
            const property = updatedSummary.propertiesViewed.find(p => p.id === args.propertyId);
            if (property) {
              property.photosViewed = true;
              property.interested = true; // Interesse implícito ao ver fotos

              updatedSummary.conversationState.stage = 'engagement';
              updatedSummary.conversationState.buyingSignals.push('viewed_photos');
              updatedSummary.nextBestAction = {
                action: 'calculate_price_or_schedule_visit',
                reason: 'Cliente viu fotos, próximo passo é preço ou visita',
                confidence: 0.85
              };
            }
          }
          break;

        case 'calculate_price':
          if (result.success && args.propertyId) {
            const property = updatedSummary.propertiesViewed.find(p => p.id === args.propertyId);
            if (property) {
              property.priceCalculated = true;
              property.interested = true;

              // Atualizar datas se fornecidas
              if (args.checkIn) updatedSummary.searchCriteria.checkIn = args.checkIn;
              if (args.checkOut) updatedSummary.searchCriteria.checkOut = args.checkOut;
              if (args.guests) updatedSummary.searchCriteria.guests = args.guests;

              updatedSummary.conversationState.stage = 'negotiation';
              updatedSummary.conversationState.buyingSignals.push('price_calculated');
              updatedSummary.nextBestAction = {
                action: 'encourage_booking',
                reason: 'Preço calculado, tentar fechar negócio',
                confidence: 0.95
              };
            }
          }
          break;

        case 'register_client':
          if (result.success && result.clientData) {
            updatedSummary.clientInfo = {
              ...updatedSummary.clientInfo,
              name: result.clientData.name,
              phone: result.clientData.phone,
              document: result.clientData.document,
              email: result.clientData.email
            };

            updatedSummary.conversationState.stage = 'booking';
            updatedSummary.conversationState.buyingSignals.push('client_registered');
            updatedSummary.nextBestAction = {
              action: 'create_reservation',
              reason: 'Cliente registrado, pode finalizar reserva',
              confidence: 0.9
            };
          }
          break;

        case 'create_reservation':
          if (result.success) {
            updatedSummary.conversationState.stage = 'completed';
            updatedSummary.conversationState.buyingSignals.push('reservation_created');
            updatedSummary.conversationState.urgency = 'low'; // Processo concluído
            updatedSummary.nextBestAction = {
              action: 'follow_up_payment',
              reason: 'Reserva criada, acompanhar pagamento',
              confidence: 1.0
            };
          }
          break;

        case 'schedule_visit':
          if (result.success) {
            updatedSummary.conversationState.stage = 'visit_scheduled';
            updatedSummary.conversationState.buyingSignals.push('visit_scheduled');
            updatedSummary.conversationState.urgency = 'high'; // Visita agendada
            updatedSummary.nextBestAction = {
              action: 'confirm_visit_details',
              reason: 'Visita agendada, confirmar detalhes',
              confidence: 0.9
            };
          }
          break;
      }

      updatedSummary.lastUpdated = new Date();

      // Log apenas a informação essencial
      logger.info('✅ [SmartSummary] Sumário atualizado', {
        stage: updatedSummary.conversationState.stage,
        action: updatedSummary.nextBestAction.action
      });

      return updatedSummary;

    } catch (error) {
      logger.error('❌ [SmartSummary] Erro na atualização', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return summary; // Retorna sumário original em caso de erro
    }
  }

  /**
   * Cria sumário vazio inicial
   */
  createEmptySummary(): SmartSummary {
    return {
      clientInfo: {},
      searchCriteria: {},
      propertiesViewed: [],
      conversationState: {
        stage: 'greeting',
        lastIntent: 'greeting',
        buyingSignals: [],
        objections: [],
        urgency: 'low'
      },
      nextBestAction: {
        action: 'discovery',
        reason: 'Descobrir necessidades do cliente',
        confidence: 0.8
      },
      lastUpdated: new Date(),
      version: '2.0'
    };
  }

  /**
   * Formatar sumário para usar no prompt da Sofia
   */
  formatForPrompt(summary: SmartSummary): string {
    // Validar consistência primeiro
    const validation = this.validateSummaryConsistency(summary);

    // Log apenas se houver problemas críticos
    if (!validation.isValid && validation.issues.length > 2) {
      logger.warn('⚠️ [SmartSummary] Problemas críticos', {
        issuesCount: validation.issues.length
      });
    }

    const criteriaParts = [];
    if (summary.searchCriteria.guests) criteriaParts.push(`${summary.searchCriteria.guests} pessoas`);
    if (summary.searchCriteria.checkIn) criteriaParts.push(`entrada: ${summary.searchCriteria.checkIn}`);
    if (summary.searchCriteria.checkOut) criteriaParts.push(`saída: ${summary.searchCriteria.checkOut}`);
    if (summary.searchCriteria.location) criteriaParts.push(`local: ${summary.searchCriteria.location}`);
    if (summary.searchCriteria.budget) criteriaParts.push(`orçamento: R$${summary.searchCriteria.budget}`);

    // ✅ Mostrar IDs reais das propriedades
    const propertiesInfo = summary.propertiesViewed.map((p, index) => {
      const status = [];
      if (p.interested) status.push('INTERESSADO');
      if (p.photosViewed) status.push('fotos vistas');
      if (p.priceCalculated) status.push('preço calculado');

      return `${index + 1}. 🏠 "${p.name}" - ID: ${p.id} - R$${p.price}/dia${status.length > 0 ? ` [${status.join(', ')}]` : ''}`;
    }).join('\n');

    let prompt = `
📊 RESUMO DA CONVERSA:
Cliente: ${summary.clientInfo.name || 'Nome não informado'}
Necessidades: ${criteriaParts.join(' | ') || 'A descobrir'}
Stage: ${summary.conversationState.stage}
Urgência: ${summary.conversationState.urgency}

🏠 PROPRIEDADES DISPONÍVEIS:
${propertiesInfo || 'Nenhuma propriedade buscada ainda'}

🎯 PRÓXIMA AÇÃO RECOMENDADA: ${summary.nextBestAction.action}
Razão: ${summary.nextBestAction.reason}
Confiança: ${Math.round(summary.nextBestAction.confidence * 100)}%

💡 SINAIS DE COMPRA: ${summary.conversationState.buyingSignals.join(', ') || 'Nenhum'}
⚠️ OBJEÇÕES: ${summary.conversationState.objections.join(', ') || 'Nenhuma'}

⚠️ IMPORTANTE: ${summary.propertiesViewed.length > 0 ? 'Use os IDs REAIS mostrados acima!' : 'Execute search_properties para obter propriedades!'}
`.trim();

    // Adicionar alertas se há problemas
    if (!validation.isValid) {
      prompt += `\n\n🚨 ALERTAS DE VALIDAÇÃO:\n${validation.issues.join('\n')}`;

      if (validation.fixes.needsPropertySearch) {
        prompt += '\n⚡ AÇÃO NECESSÁRIA: Execute search_properties para obter IDs válidos!';
      }
      if (validation.fixes.needsClientRegistration) {
        prompt += '\n👤 AÇÃO NECESSÁRIA: Execute register_client para cadastrar dados!';
      }
      if (validation.fixes.needsGuestInfo) {
        prompt += '\n👥 AÇÃO NECESSÁRIA: Pergunte quantas pessoas são!';
      }
    }

    return prompt;
  }
}

// Exportar instância singleton
export const smartSummaryService = SmartSummaryService.getInstance();