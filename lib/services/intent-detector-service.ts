/**
 * Intent Detector Service - Detecta intenções sem usar IA
 * Parte da ETAPA 1: Inteligência Local
 */

export interface Intent {
  pattern: RegExp;
  intent: string;
  requiredContext?: string[];
  response?: string;
  action?: string;
  priority?: number;
}

export interface DetectedIntent {
  intent: string;
  confidence: number;
  action?: string;
  response?: string;
  extractedData?: Record<string, any>;
  requiredContext?: string[];
}

export class IntentDetectorService {
  private static instance: IntentDetectorService;

  // Padrões de intenção ordenados por prioridade
  private readonly INTENT_PATTERNS: Intent[] = [
    // ========== SAUDAÇÕES ==========
    {
      pattern: /^(oi|ola|opa|hey|olá|bom dia|boa tarde|boa noite|boa madrugada|oii+|oie|oiee|oin|oies|oiii)/i,
      intent: 'greeting',
      response: 'Oi! 😊 Temos ÓTIMAS ofertas de temporada! Em qual cidade você procura?',
      action: 'ask_location',
      priority: 10
    },
    
    // ========== LOCALIZAÇÃO ==========
    {
      pattern: /(santos|guaruja|guarujá|praia grande|bertioga|são vicente|sao vicente|litoral|baixada)/i,
      intent: 'location_provided',
      action: 'save_location',
      priority: 9
    },
    
    // ========== BUSCA GENÉRICA ==========
    {
      pattern: /(quero|procuro|preciso|busco|desejo|gostaria|poderia|tem|teria).*(apto|apartamento|casa|lugar|imovel|imóvel|local|espaço|kitnet|flat|cobertura)/i,
      intent: 'search_generic',
      requiredContext: ['location'],
      action: 'search_properties',
      priority: 8
    },
    
    // ========== BUSCA COM DETALHES ==========
    {
      pattern: /(\d+)\s*(quarto|quartos|dormitorio|dormitórios|suite|suites|suíte|suítes)/i,
      intent: 'search_with_bedrooms',
      requiredContext: ['location'],
      action: 'search_properties',
      priority: 8
    },
    
    {
      pattern: /(piscina|churrasqueira|garagem|estacionamento|varanda|sacada|vista mar|pé na areia|beira mar|frente mar)/i,
      intent: 'search_with_amenities',
      requiredContext: ['location'],
      action: 'search_properties',
      priority: 8
    },
    
    // ========== DATAS ==========
    {
      pattern: /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?.*(?:até|ate|a|até o dia|ao).*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i,
      intent: 'dates_provided_full',
      action: 'save_dates',
      priority: 9
    },
    
    {
      pattern: /(?:dia|de)\s*(\d{1,2}).*(?:até|ate|a|até o dia|ao).*(?:dia)?\s*(\d{1,2})/i,
      intent: 'dates_provided_days',
      action: 'save_dates',
      priority: 8
    },
    
    {
      pattern: /(hoje|amanhã|semana que vem|próxima semana|proxima semana|fim de semana|fds|final de semana|feriado|carnaval|ano novo|reveillon|natal)/i,
      intent: 'dates_relative',
      action: 'calculate_dates',
      priority: 7
    },
    
    // ========== INTERESSE EM PROPRIEDADE ==========
    {
      pattern: /^(primeira|1ª|1a|1°|1)$/i,
      intent: 'property_interest_first',
      requiredContext: ['properties_shown'],
      action: 'select_property',
      priority: 10
    },
    
    {
      pattern: /^(segunda|2ª|2a|2°|2)$/i,
      intent: 'property_interest_second',
      requiredContext: ['properties_shown'],
      action: 'select_property',
      priority: 10
    },
    
    {
      pattern: /^(terceira|3ª|3a|3°|3)$/i,
      intent: 'property_interest_third',
      requiredContext: ['properties_shown'],
      action: 'select_property',
      priority: 10
    },
    
    {
      pattern: /(gostei|adorei|perfeito|perfeita|esse|essa|este|esta|quero esse|quero essa|me interessei)/i,
      intent: 'property_interest_current',
      requiredContext: ['current_property'],
      action: 'confirm_property',
      priority: 8
    },
    
    // ========== CONFIRMAÇÕES ==========
    {
      pattern: /^(sim|yes|claro|confirmo|aceito|quero|pode ser|beleza|blz|ok|okay|tá bom|ta bom|fechado|fecha|bora|vamos|dale|partiu|simbora|topo|confirma|confirmado)$/i,
      intent: 'confirmation',
      action: 'process_confirmation',
      priority: 10
    },
    
    // ========== NEGAÇÕES ==========
    {
      pattern: /^(não|nao|nunca|jamais|negativo|nope|não quero|nao quero|nem|de jeito nenhum)$/i,
      intent: 'negation',
      action: 'handle_negation',
      priority: 10
    },
    
    // ========== PREÇO ==========
    {
      pattern: /(quanto|qual|preço|preco|valor|custa|custo|sai por|fica por|ta quanto|tá quanto)/i,
      intent: 'price_inquiry',
      requiredContext: ['current_property'],
      action: 'show_pricing',
      priority: 7
    },
    
    // ========== PESSOAS/HÓSPEDES ==========
    {
      pattern: /(\d+)\s*(pessoa|pessoas|adulto|adultos|criança|crianças|hospede|hóspede|hospedes|hóspedes)/i,
      intent: 'guests_provided',
      action: 'save_guests',
      priority: 8
    },
    
    // ========== FOTOS/MÍDIA ==========
    {
      pattern: /(foto|fotos|imagem|imagens|video|vídeo|videos|vídeos|mais fotos|ver mais|me mostra|mostra|manda)/i,
      intent: 'media_request',
      requiredContext: ['current_property'],
      action: 'send_media',
      priority: 7
    },
    
    // ========== RESERVA ==========
    {
      pattern: /(reserv|agendar|fechar|garantir|confirmar pedido|finalizar)/i,
      intent: 'create_reservation',
      requiredContext: ['current_property', 'dates'],
      action: 'start_reservation',
      priority: 8
    },
    
    // ========== AJUDA/DÚVIDAS ==========
    {
      pattern: /(ajuda|ajudar|duvida|dúvida|como funciona|explica|explicar|não entendi|nao entendi)/i,
      intent: 'help_request',
      action: 'show_help',
      priority: 6
    }
  ];

  private constructor() {
    // Ordena padrões por prioridade
    this.INTENT_PATTERNS.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  static getInstance(): IntentDetectorService {
    if (!IntentDetectorService.instance) {
      IntentDetectorService.instance = new IntentDetectorService();
    }
    return IntentDetectorService.instance;
  }

  /**
   * Detecta a intenção principal da mensagem
   */
  detect(message: string, context?: Record<string, any>): DetectedIntent | null {
    const normalizedMessage = this.normalizeMessage(message);
    
    // Tenta cada padrão em ordem de prioridade
    for (const pattern of this.INTENT_PATTERNS) {
      const match = normalizedMessage.match(pattern.pattern);
      
      if (match) {
        // Verifica se o contexto necessário está presente
        if (pattern.requiredContext && context) {
          const missingContext = pattern.requiredContext.filter(
            key => !context[key] || (Array.isArray(context[key]) && context[key].length === 0)
          );
          
          if (missingContext.length > 0) {
            // Contexto faltando, mas ainda retorna a intenção
            return {
              intent: pattern.intent,
              confidence: 0.7, // Confiança menor sem contexto
              action: 'request_context',
              requiredContext: missingContext,
              extractedData: this.extractData(pattern.intent, match, normalizedMessage)
            };
          }
        }
        
        // Intenção detectada com sucesso
        return {
          intent: pattern.intent,
          confidence: this.calculateConfidence(match, normalizedMessage),
          action: pattern.action,
          response: pattern.response,
          extractedData: this.extractData(pattern.intent, match, normalizedMessage),
          requiredContext: pattern.requiredContext
        };
      }
    }
    
    // Nenhuma intenção detectada
    return null;
  }

  /**
   * Detecta múltiplas intenções na mensagem
   */
  detectMultiple(message: string, context?: Record<string, any>): DetectedIntent[] {
    const normalizedMessage = this.normalizeMessage(message);
    const detectedIntents: DetectedIntent[] = [];
    
    for (const pattern of this.INTENT_PATTERNS) {
      const match = normalizedMessage.match(pattern.pattern);
      
      if (match) {
        detectedIntents.push({
          intent: pattern.intent,
          confidence: this.calculateConfidence(match, normalizedMessage),
          action: pattern.action,
          response: pattern.response,
          extractedData: this.extractData(pattern.intent, match, normalizedMessage),
          requiredContext: pattern.requiredContext
        });
      }
    }
    
    return detectedIntents;
  }

  /**
   * Normaliza a mensagem para melhor detecção
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/[^\w\sàáãâéêíóôõúç\-\/]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Calcula a confiança da detecção
   */
  private calculateConfidence(match: RegExpMatchArray, message: string): number {
    // Confiança baseada na proporção do match com a mensagem total
    const matchLength = match[0].length;
    const messageLength = message.length;
    const ratio = matchLength / messageLength;
    
    // Se o match é quase toda a mensagem, alta confiança
    if (ratio > 0.8) return 0.95;
    if (ratio > 0.5) return 0.85;
    if (ratio > 0.3) return 0.75;
    
    return 0.65;
  }

  /**
   * Extrai dados específicos baseado na intenção
   */
  private extractData(intent: string, match: RegExpMatchArray, message: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    switch (intent) {
      case 'location_provided':
        data.location = this.normalizeLocation(match[1]);
        break;
        
      case 'dates_provided_full':
        data.checkIn = { day: parseInt(match[1]), month: parseInt(match[2]), year: match[3] ? parseInt(match[3]) : new Date().getFullYear() };
        data.checkOut = { day: parseInt(match[4]), month: parseInt(match[5]), year: match[6] ? parseInt(match[6]) : new Date().getFullYear() };
        break;
        
      case 'dates_provided_days':
        data.checkInDay = parseInt(match[1]);
        data.checkOutDay = parseInt(match[2]);
        break;
        
      case 'guests_provided':
        data.guests = parseInt(match[1]);
        data.guestType = match[2].toLowerCase();
        break;
        
      case 'search_with_bedrooms':
        data.bedrooms = parseInt(match[1]);
        break;
        
      case 'property_interest_first':
        data.propertyIndex = 0;
        break;
        
      case 'property_interest_second':
        data.propertyIndex = 1;
        break;
        
      case 'property_interest_third':
        data.propertyIndex = 2;
        break;
    }
    
    return data;
  }

  /**
   * Normaliza nomes de cidades
   */
  private normalizeLocation(location: string): string {
    const locationMap: Record<string, string> = {
      'guaruja': 'Guarujá',
      'guarujá': 'Guarujá',
      'santos': 'Santos',
      'praia grande': 'Praia Grande',
      'bertioga': 'Bertioga',
      'são vicente': 'São Vicente',
      'sao vicente': 'São Vicente',
      'litoral': 'Santos', // Default
      'baixada': 'Santos'  // Default
    };
    
    return locationMap[location.toLowerCase()] || location;
  }

  /**
   * Verifica se a mensagem precisa de IA
   */
  needsAI(message: string, context?: Record<string, any>): boolean {
    const intent = this.detect(message, context);
    
    // Se não detectou nenhuma intenção, precisa de IA
    if (!intent) return true;
    
    // Se a confiança é muito baixa, precisa de IA
    if (intent.confidence < 0.6) return true;
    
    // Se é uma mensagem muito complexa, precisa de IA
    if (message.length > 200) return true;
    
    // Se tem múltiplas intenções conflitantes, precisa de IA
    const multipleIntents = this.detectMultiple(message, context);
    if (multipleIntents.length > 3) return true;
    
    return false;
  }
}

// Export singleton instance
export const intentDetector = IntentDetectorService.getInstance();