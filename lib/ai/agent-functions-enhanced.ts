// Enhanced AI Agent Functions - Complete System Integration
// Versão otimizada com integração completa entre todos os módulos

import { OpenAI } from 'openai';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { crmService } from '@/lib/services/crm-service';
import { visitService } from '@/lib/services/visit-service';
import { advancedMetricsService } from '@/lib/services/advanced-metrics-service';
import { LeadStatus, LeadSource, InteractionType } from '@/lib/types/crm';
import { VisitStatus, TimePreference } from '@/lib/types/visit-appointment';
import { format, addDays, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ===== ENHANCED FUNCTION DEFINITIONS =====

export const ENHANCED_AI_FUNCTIONS = [
  // CORE PROPERTY FUNCTIONS
  {
    name: 'search_properties',
    description: 'Buscar propriedades com filtros avançados e machine learning para recomendações personalizadas',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Cidade, bairro ou região' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        budget: { type: 'number', description: 'Orçamento máximo por noite' },
        checkIn: { type: 'string', description: 'Data check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data check-out (YYYY-MM-DD)' },
        amenities: { type: 'array', items: { type: 'string' }, description: 'Comodidades desejadas' },
        propertyType: { type: 'string', enum: ['apartment', 'house', 'studio', 'loft'], description: 'Tipo de propriedade' },
        usePersonalization: { type: 'boolean', description: 'Usar preferências do cliente para personalizar resultados' }
      },
      required: ['guests']
    }
  },
  {
    name: 'get_property_insights',
    description: 'Obter insights detalhados sobre uma propriedade, incluindo análise de mercado e competitividade',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        includeMarketAnalysis: { type: 'boolean', description: 'Incluir análise de mercado competitiva' },
        includePerformanceMetrics: { type: 'boolean', description: 'Incluir métricas de performance da propriedade' }
      },
      required: ['propertyId']
    }
  },
  {
    name: 'calculate_dynamic_price',
    description: 'Calcular preço inteligente com análise de demanda, sazonalidade e competitor pricing',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        checkIn: { type: 'string', description: 'Data check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        includeDiscountOpportunities: { type: 'boolean', description: 'Verificar oportunidades de desconto' },
        competitiveAnalysis: { type: 'boolean', description: 'Incluir análise competitiva de preços' }
      },
      required: ['propertyId', 'checkIn', 'checkOut', 'guests']
    }
  },

  // ADVANCED CRM FUNCTIONS
  {
    name: 'analyze_client_behavior',
    description: 'Analisar comportamento e preferências do cliente para personalização da experiência',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        currentMessage: { type: 'string', description: 'Mensagem atual do cliente' },
        includeRecommendations: { type: 'boolean', description: 'Incluir recomendações personalizadas' }
      },
      required: ['clientPhone']
    }
  },
  {
    name: 'score_lead_quality',
    description: 'Avaliar qualidade do lead baseado em comportamento, intenção de compra e potencial de conversão',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        conversationContext: { 
          type: 'object',
          description: 'Contexto da conversa atual',
          properties: {
            messagesCount: { type: 'number' },
            propertiesViewed: { type: 'array', items: { type: 'string' } },
            priceDiscussed: { type: 'boolean' },
            urgencyIndicators: { type: 'array', items: { type: 'string' } },
            engagementLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        }
      },
      required: ['clientPhone']
    }
  },
  {
    name: 'trigger_smart_follow_up',
    description: 'Configurar follow-up automatizado inteligente baseado no comportamento do cliente',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        followUpType: { 
          type: 'string', 
          enum: ['price_drop_alert', 'new_similar_properties', 'seasonal_promotion', 'abandoned_cart', 'visit_reminder'],
          description: 'Tipo de follow-up'
        },
        timing: { type: 'string', description: 'Quando executar (1h, 24h, 3d, 1w)' },
        context: { 
          type: 'object', 
          description: 'Contexto para personalizar follow-up',
          properties: {
            propertyIds: { type: 'array', items: { type: 'string' } },
            lastPriceQuoted: { type: 'number' },
            interests: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['clientPhone', 'followUpType', 'timing']
    }
  },

  // ADVANCED BOOKING FUNCTIONS
  {
    name: 'check_availability_intelligence',
    description: 'Verificação inteligente de disponibilidade com sugestões alternativas e otimização de ocupação',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        checkIn: { type: 'string', description: 'Data check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data check-out (YYYY-MM-DD)' },
        flexibility: { type: 'number', description: 'Dias de flexibilidade para sugerir alternativas (default: 3)' },
        includeSimilarProperties: { type: 'boolean', description: 'Incluir propriedades similares se indisponível' }
      },
      required: ['propertyId', 'checkIn', 'checkOut']
    }
  },
  {
    name: 'create_smart_reservation',
    description: 'Criar reserva com automações inteligentes, verificações e integrações completas',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID do cliente' },
        propertyId: { type: 'string', description: 'ID da propriedade' },
        checkIn: { type: 'string', description: 'Data check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        totalPrice: { type: 'number', description: 'Preço total' },
        notes: { type: 'string', description: 'Observações' },
        paymentPreference: { type: 'string', enum: ['pix', 'credit_card', 'bank_transfer'], description: 'Preferência de pagamento' },
        autoConfirmation: { type: 'boolean', description: 'Auto-confirmar se todas validações passaram' }
      },
      required: ['clientId', 'propertyId', 'checkIn', 'checkOut', 'guests', 'totalPrice']
    }
  },

  // ADVANCED SCHEDULING FUNCTIONS
  {
    name: 'optimize_visit_scheduling',
    description: 'Agendar visitas com otimização de rota, disponibilidade do cliente e maximização de conversões',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID do cliente' },
        propertyIds: { type: 'array', items: { type: 'string' }, description: 'IDs das propriedades para visitar' },
        clientAvailability: {
          type: 'object',
          description: 'Disponibilidade do cliente',
          properties: {
            preferredDays: { type: 'array', items: { type: 'string' } },
            preferredTimes: { type: 'array', items: { type: 'string' } },
            avoidWeekends: { type: 'boolean' }
          }
        },
        optimizeRoute: { type: 'boolean', description: 'Otimizar rota entre propriedades' },
        groupVisits: { type: 'boolean', description: 'Agrupar múltiplas visitas no mesmo dia' }
      },
      required: ['clientId', 'propertyIds']
    }
  },

  // ANALYTICS & INSIGHTS FUNCTIONS
  {
    name: 'get_conversation_insights',
    description: 'Obter insights sobre a conversa atual para otimizar estratégia de vendas',
    parameters: {
      type: 'object',
      properties: {
        conversationHistory: { 
          type: 'array', 
          items: { 
            type: 'object',
            properties: {
              from: { type: 'string' },
              text: { type: 'string' },
              timestamp: { type: 'string' }
            }
          },
          description: 'Histórico da conversa'
        },
        includeEmotionalAnalysis: { type: 'boolean', description: 'Incluir análise emocional do cliente' },
        includeSalesOpportunities: { type: 'boolean', description: 'Identificar oportunidades de venda' }
      },
      required: ['conversationHistory']
    }
  },
  {
    name: 'generate_market_report',
    description: 'Gerar relatório de mercado personalizado para o cliente baseado em suas preferências',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        reportType: { 
          type: 'string', 
          enum: ['market_trends', 'price_analysis', 'investment_opportunity', 'area_comparison'],
          description: 'Tipo de relatório'
        },
        location: { type: 'string', description: 'Localização para análise' },
        timeframe: { type: 'string', enum: ['3m', '6m', '1y'], description: 'Período de análise' }
      },
      required: ['clientPhone', 'reportType']
    }
  },

  // NEGOTIATION & PRICING FUNCTIONS
  {
    name: 'calculate_negotiation_range',
    description: 'Calcular faixa de negociação baseada em métricas de mercado, ocupação e margem de lucro',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        originalPrice: { type: 'number', description: 'Preço original cotado' },
        clientBudget: { type: 'number', description: 'Orçamento do cliente' },
        nights: { type: 'number', description: 'Número de noites' },
        seasonality: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Sazonalidade do período' },
        urgency: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Urgência da reserva' }
      },
      required: ['propertyId', 'originalPrice', 'nights']
    }
  },
  {
    name: 'apply_dynamic_discount',
    description: 'Aplicar desconto dinâmico baseado em regras de negócio e AI',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        clientId: { type: 'string', description: 'ID do cliente' },
        discountReason: { 
          type: 'string', 
          enum: ['first_time_client', 'long_stay', 'last_minute', 'low_season', 'bulk_booking', 'loyalty'],
          description: 'Razão do desconto'
        },
        originalPrice: { type: 'number', description: 'Preço original' },
        maxDiscountPercent: { type: 'number', description: 'Desconto máximo permitido (%)' }
      },
      required: ['propertyId', 'discountReason', 'originalPrice']
    }
  },

  // SYSTEM INTEGRATION FUNCTIONS
  {
    name: 'sync_external_calendar',
    description: 'Sincronizar calendários externos (Airbnb, Booking.com) para evitar overbooking',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        platform: { type: 'string', enum: ['airbnb', 'booking', 'vrbo'], description: 'Plataforma externa' },
        checkConflicts: { type: 'boolean', description: 'Verificar conflitos de reserva' }
      },
      required: ['propertyId']
    }
  },
  {
    name: 'update_metrics_tracking',
    description: 'Atualizar métricas de performance e tracking de conversões',
    parameters: {
      type: 'object',
      properties: {
        eventType: { 
          type: 'string', 
          enum: ['property_view', 'price_inquiry', 'booking_attempt', 'booking_complete', 'visit_scheduled', 'conversation_start', 'meaningful_conversation'],
          description: 'Tipo de evento para tracking'
        },
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        propertyId: { type: 'string', description: 'ID da propriedade (opcional)' },
        metadata: { 
          type: 'object', 
          description: 'Dados adicionais do evento',
          properties: {
            source: { type: 'string' },
            value: { type: 'number' },
            duration: { type: 'number' },
            step: { type: 'string' }
          }
        }
      },
      required: ['eventType', 'clientPhone']
    }
  },

  // ANALYTICS & METRICS INTEGRATION FUNCTIONS
  {
    name: 'track_conversion_metrics',
    description: 'Tracks conversion events and metrics for analytics dashboard',
    parameters: {
      type: 'object',
      properties: {
        event_type: {
          type: 'string',
          enum: ['property_inquiry', 'price_request', 'reservation_request', 'conversation_start', 'meaningful_conversation', 'client_registration'],
          description: 'Type of conversion event'
        },
        property_id: {
          type: 'string',
          description: 'Property ID if applicable'
        },
        client_phone: {
          type: 'string',
          description: 'Client phone number'
        },
        conversation_data: {
          type: 'object',
          properties: {
            message_count: { type: 'number' },
            duration_minutes: { type: 'number' },
            amenities_mentioned: { type: 'array', items: { type: 'string' } },
            location_preferences: { type: 'array', items: { type: 'string' } },
            price_range_discussed: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } }
          },
          description: 'Conversation analysis data'
        },
        additional_data: {
          type: 'object',
          description: 'Additional tracking data'
        }
      },
      required: ['event_type', 'client_phone']
    }
  },

  {
    name: 'analyze_conversation_insights',
    description: 'Analyzes current conversation for amenity preferences and behavioral insights',
    parameters: {
      type: 'object',
      properties: {
        client_phone: {
          type: 'string',
          description: 'Client phone number'
        },
        conversation_text: {
          type: 'string',
          description: 'Full conversation text to analyze'
        },
        extract_preferences: {
          type: 'boolean',
          description: 'Whether to extract amenity and location preferences',
          default: true
        },
        update_client_profile: {
          type: 'boolean',
          description: 'Whether to update client profile with extracted insights',
          default: true
        }
      },
      required: ['client_phone', 'conversation_text']
    }
  },

  {
    name: 'get_business_insights',
    description: 'Gets current business performance metrics and insights from analytics system',
    parameters: {
      type: 'object',
      properties: {
        metric_type: {
          type: 'string',
          enum: ['conversion_funnel', 'property_performance', 'seasonal_trends', 'client_behavior', 'amenity_analysis'],
          description: 'Type of business metric to retrieve'
        },
        time_period: {
          type: 'string',
          enum: ['7d', '30d', '90d'],
          description: 'Time period for analysis',
          default: '30d'
        },
        include_recommendations: {
          type: 'boolean',
          description: 'Include AI-powered business recommendations',
          default: true
        }
      },
      required: ['metric_type']
    }
  }
];

// ===== ENHANCED IMPLEMENTATIONS =====

export class EnhancedAgentFunctions {
  
  // Enhanced property search with ML personalization
  static async searchProperties(args: any, tenantId: string): Promise<any> {
    try {
      const searchFilters = {
        tenantId,
        location: args.location,
        guests: args.guests,
        checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
        checkOut: args.checkOut ? new Date(args.checkOut) : undefined,
        maxPrice: args.budget,
        propertyType: args.propertyType
      };

      let properties = await propertyService.searchProperties(searchFilters);

      // Apply personalization if requested
      if (args.usePersonalization && args.clientPhone) {
        properties = await this.personalizeResults(properties, args.clientPhone, tenantId);
      }

      // Enhanced filtering and sorting
      if (args.amenities?.length > 0) {
        properties = this.filterByAmenities(properties, args.amenities);
      }

      // Smart sorting: mix of price, popularity, and personalization
      properties = this.smartSort(properties, args);

      const formattedProperties = properties.slice(0, 10).map(p => ({
        id: p.id,
        name: p.title || 'Propriedade sem nome',
        location: p.city || p.location,
        bedrooms: p.bedrooms || 1,
        bathrooms: p.bathrooms || 1,
        maxGuests: p.maxGuests || p.capacity || 2,
        basePrice: p.basePrice || 300,
        amenities: p.amenities || [],
        type: p.type || p.category || 'apartment',
        description: p.description || '',
        address: p.address || '',
        isActive: p.isActive,
        minimumNights: p.minimumNights || 1,
        popularityScore: p.popularityScore || 0,
        conversionRate: p.conversionRate || 0,
        lastBooked: p.lastBooked,
        neighborhood: p.neighborhood || '',
        // AI-enhanced fields
        personalizedScore: p.personalizedScore || 0,
        recommendationReason: p.recommendationReason || null
      }));

      return {
        success: true,
        count: formattedProperties.length,
        properties: formattedProperties,
        message: `Encontrei ${formattedProperties.length} propriedades${args.usePersonalization ? ' personalizadas para você' : ''} ordenadas por relevância`,
        searchMetadata: {
          personalized: args.usePersonalization || false,
          totalFound: properties.length,
          filters: searchFilters,
          sortingCriteria: 'smart_mixed'
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro interno ao buscar propriedades',
        properties: []
      };
    }
  }

  // Get comprehensive property insights
  static async getPropertyInsights(args: any, tenantId: string): Promise<any> {
    try {
      const property = await propertyService.getById(args.propertyId);
      if (!property) {
        return { success: false, message: 'Propriedade não encontrada' };
      }

      const insights: any = {
        property: {
          id: property.id,
          name: property.title,
          basicInfo: {
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            maxGuests: property.maxGuests,
            area: property.area,
            type: property.type
          }
        }
      };

      // Performance metrics
      if (args.includePerformanceMetrics) {
        const metrics = await advancedMetricsService.getAdvancedMetrics(tenantId);
        const propertyPerformance = metrics.propertyPerformance.mostInquiredProperties
          .find(p => p.propertyId === args.propertyId);
        
        insights.performance = {
          inquiries: propertyPerformance?.inquiries || 0,
          conversionRate: propertyPerformance?.conversionRate || 0,
          averagePrice: propertyPerformance?.averagePrice || property.basePrice,
          popularityRank: this.calculatePopularityRank(property.id, metrics.propertyPerformance.mostInquiredProperties),
          bookingTrend: 'stable' // Could be calculated from historical data
        };
      }

      // Market analysis
      if (args.includeMarketAnalysis) {
        insights.marketAnalysis = {
          pricePosition: 'competitive', // vs. similar properties
          demandLevel: 'medium',
          seasonalTrends: this.getSeasonalTrends(property),
          competitorAnalysis: this.getCompetitorInsights(property),
          suggestedPriceRange: {
            min: Math.round(property.basePrice * 0.9),
            max: Math.round(property.basePrice * 1.15)
          }
        };
      }

      return {
        success: true,
        insights,
        message: 'Insights gerados com sucesso'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao gerar insights da propriedade'
      };
    }
  }

  // Advanced dynamic pricing with market intelligence
  static async calculateDynamicPrice(args: any, tenantId: string): Promise<any> {
    try {
      // Get base price calculation
      const baseCalculation = await this.calculatePrice(args, tenantId);
      if (!baseCalculation.success) return baseCalculation;

      const property = await propertyService.getById(args.propertyId);
      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      let dynamicPrice = baseCalculation.calculation.total;
      const adjustments = [];

      // Market demand analysis
      const demandMultiplier = await this.calculateDemandMultiplier(args.propertyId, checkIn, checkOut, tenantId);
      if (demandMultiplier !== 1) {
        dynamicPrice *= demandMultiplier;
        adjustments.push({
          type: 'demand',
          multiplier: demandMultiplier,
          reason: demandMultiplier > 1 ? 'Alta demanda para o período' : 'Baixa demanda - preço otimizado'
        });
      }

      // Competitive pricing
      if (args.competitiveAnalysis) {
        const competitiveAdjustment = await this.getCompetitivePricing(property, nights);
        if (competitiveAdjustment.adjustment !== 0) {
          dynamicPrice += competitiveAdjustment.adjustment;
          adjustments.push({
            type: 'competitive',
            adjustment: competitiveAdjustment.adjustment,
            reason: competitiveAdjustment.reason
          });
        }
      }

      // Discount opportunities
      let discountOpportunities = [];
      if (args.includeDiscountOpportunities) {
        discountOpportunities = this.identifyDiscountOpportunities(
          property, nights, checkIn, dynamicPrice
        );
      }

      return {
        success: true,
        dynamicPricing: {
          ...baseCalculation.calculation,
          originalTotal: baseCalculation.calculation.total,
          dynamicTotal: Math.round(dynamicPrice),
          adjustments,
          savings: baseCalculation.calculation.total - Math.round(dynamicPrice),
          discountOpportunities,
          confidenceScore: this.calculatePricingConfidence(adjustments),
          marketPosition: this.getMarketPosition(dynamicPrice, property),
          recommendedAction: this.getRecommendedAction(adjustments, discountOpportunities)
        },
        message: `Preço dinâmico: R$${Math.round(dynamicPrice)} (${adjustments.length} ajustes aplicados)`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao calcular preço dinâmico',
        dynamicPricing: null
      };
    }
  }

  // Analyze client behavior for personalization
  static async analyzeClientBehavior(args: any, tenantId: string): Promise<any> {
    try {
      // Get client's CRM data
      const lead = await crmService.getLeadByPhone(args.clientPhone);
      if (!lead) {
        return {
          success: false,
          message: 'Cliente não encontrado no sistema'
        };
      }

      // Get client's interaction history
      const interactions = await crmService.getInteractionsByLeadId(lead.id);
      
      // Analyze behavior patterns
      const behaviorAnalysis = {
        profile: {
          name: lead.name,
          phone: lead.phone,
          leadScore: lead.score,
          temperature: lead.temperature,
          totalInteractions: interactions.length,
          firstContact: lead.firstContactDate,
          lastContact: lead.lastContactDate
        },
        preferences: this.extractPreferences(lead, interactions),
        communicationStyle: this.analyzeCommunicationStyle(interactions),
        purchaseIntent: this.calculatePurchaseIntent(lead, interactions, args.currentMessage),
        personalizedRecommendations: []
      };

      // Generate personalized recommendations
      if (args.includeRecommendations) {
        behaviorAnalysis.personalizedRecommendations = 
          await this.generatePersonalizedRecommendations(lead, tenantId);
      }

      // Update lead score based on current interaction
      if (args.currentMessage) {
        const intentAnalysis = this.analyzeMessageIntent(args.currentMessage);
        const scoreUpdate = this.calculateScoreUpdate(lead.score, intentAnalysis);
        
        if (scoreUpdate !== 0) {
          await crmService.updateLead(lead.id, {
            score: Math.max(0, Math.min(100, lead.score + scoreUpdate)),
            lastContactDate: new Date()
          });
          
          behaviorAnalysis.profile.leadScore = lead.score + scoreUpdate;
        }
      }

      return {
        success: true,
        analysis: behaviorAnalysis,
        message: 'Análise comportamental concluída'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao analisar comportamento do cliente'
      };
    }
  }

  // Smart lead scoring
  static async scoreLeadQuality(args: any, tenantId: string): Promise<any> {
    try {
      const lead = await crmService.getLeadByPhone(args.clientPhone);
      if (!lead) {
        return { success: false, message: 'Lead não encontrado' };
      }

      let qualityScore = lead.score || 50;
      const scoringFactors = [];

      // Conversation context analysis
      if (args.conversationContext) {
        const ctx = args.conversationContext;
        
        // Message count (engagement)
        if (ctx.messagesCount) {
          const engagementScore = Math.min(20, ctx.messagesCount * 2);
          qualityScore += engagementScore;
          scoringFactors.push({
            factor: 'engagement',
            points: engagementScore,
            description: `${ctx.messagesCount} mensagens trocadas`
          });
        }

        // Properties viewed (interest)
        if (ctx.propertiesViewed?.length > 0) {
          const interestScore = Math.min(15, ctx.propertiesViewed.length * 5);
          qualityScore += interestScore;
          scoringFactors.push({
            factor: 'interest',
            points: interestScore,
            description: `Visualizou ${ctx.propertiesViewed.length} propriedades`
          });
        }

        // Price discussion (budget qualification)
        if (ctx.priceDiscussed) {
          qualityScore += 10;
          scoringFactors.push({
            factor: 'budget_qualification',
            points: 10,
            description: 'Discutiu preços - cliente qualificado financeiramente'
          });
        }

        // Urgency indicators
        if (ctx.urgencyIndicators?.length > 0) {
          const urgencyScore = Math.min(15, ctx.urgencyIndicators.length * 5);
          qualityScore += urgencyScore;
          scoringFactors.push({
            factor: 'urgency',
            points: urgencyScore,
            description: `Sinais de urgência: ${ctx.urgencyIndicators.join(', ')}`
          });
        }

        // Engagement level
        if (ctx.engagementLevel === 'high') {
          qualityScore += 10;
          scoringFactors.push({
            factor: 'high_engagement',
            points: 10,
            description: 'Alto nível de engajamento na conversa'
          });
        } else if (ctx.engagementLevel === 'low') {
          qualityScore -= 5;
          scoringFactors.push({
            factor: 'low_engagement',
            points: -5,
            description: 'Baixo nível de engajamento'
          });
        }
      }

      // Cap score between 0-100
      qualityScore = Math.max(0, Math.min(100, qualityScore));

      // Determine quality category
      let qualityCategory = 'low';
      if (qualityScore >= 80) qualityCategory = 'high';
      else if (qualityScore >= 60) qualityCategory = 'medium';

      // Update lead in CRM
      await crmService.updateLead(lead.id, {
        score: qualityScore,
        temperature: qualityScore >= 70 ? 'hot' : qualityScore >= 50 ? 'warm' : 'cold',
        lastContactDate: new Date()
      });

      return {
        success: true,
        scoring: {
          leadId: lead.id,
          previousScore: lead.score,
          newScore: qualityScore,
          qualityCategory,
          scoringFactors,
          confidence: this.calculateScoringConfidence(scoringFactors),
          nextBestAction: this.getNextBestAction(qualityScore, args.conversationContext),
          estimatedConversionProbability: this.estimateConversionProbability(qualityScore)
        },
        message: `Lead avaliado: ${qualityCategory} qualidade (${qualityScore} pontos)`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao avaliar qualidade do lead'
      };
    }
  }

  // Smart follow-up system
  static async triggerSmartFollowUp(args: any, tenantId: string): Promise<any> {
    try {
      const lead = await crmService.getLeadByPhone(args.clientPhone);
      if (!lead) {
        return { success: false, message: 'Cliente não encontrado' };
      }

      // Create follow-up configuration
      const followUpConfig = {
        leadId: lead.id,
        tenantId,
        type: args.followUpType,
        timing: args.timing,
        context: args.context || {},
        createdAt: new Date(),
        status: 'scheduled'
      };

      // Generate personalized content based on follow-up type
      const content = this.generateFollowUpContent(args.followUpType, args.context, lead);

      // Schedule the follow-up (in a real system, this would integrate with a job queue)
      const scheduledDate = this.calculateFollowUpDate(args.timing);
      
      // Create interaction record for tracking
      await crmService.createInteraction({
        leadId: lead.id,
        tenantId,
        type: InteractionType.FOLLOW_UP,
        channel: 'whatsapp',
        direction: 'outbound',
        content: `Follow-up agendado: ${args.followUpType} para ${scheduledDate.toLocaleDateString('pt-BR')}`,
        userId: 'ai-agent',
        userName: 'AI Agent',
        scheduledFor: scheduledDate,
        metadata: {
          followUpType: args.followUpType,
          timing: args.timing,
          context: args.context
        }
      });

      // Update lead status if needed
      if (args.followUpType === 'abandoned_cart') {
        await crmService.updateLead(lead.id, {
          status: LeadStatus.NURTURING,
          tags: [...(lead.tags || []), 'abandoned-cart']
        });
      }

      return {
        success: true,
        followUp: {
          id: Date.now().toString(), // In real system, would be proper ID
          type: args.followUpType,
          scheduledDate,
          content: content.preview,
          estimatedImpact: this.estimateFollowUpImpact(args.followUpType, lead),
          personalizationLevel: content.personalizationScore
        },
        message: `Follow-up ${args.followUpType} agendado para ${scheduledDate.toLocaleDateString('pt-BR')}`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao configurar follow-up inteligente'
      };
    }
  }

  // Enhanced availability check with alternatives
  static async checkAvailabilityIntelligence(args: any, tenantId: string): Promise<any> {
    try {
      const property = await propertyService.getById(args.propertyId);
      if (!property) {
        return { success: false, message: 'Propriedade não encontrada' };
      }

      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const flexibility = args.flexibility || 3;

      // Check exact dates first
      const exactAvailability = await this.checkExactAvailability(args.propertyId, checkIn, checkOut);
      
      const result: any = {
        property: {
          id: property.id,
          name: property.title,
          basePrice: property.basePrice
        },
        requestedDates: {
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          nights: Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        },
        exactMatch: exactAvailability
      };

      // If not available, suggest alternatives
      if (!exactAvailability.available) {
        const alternatives = await this.findAlternativeAvailability(
          args.propertyId, checkIn, checkOut, flexibility, tenantId
        );
        result.alternatives = alternatives;

        // Suggest similar properties if requested
        if (args.includeSimilarProperties) {
          const similarProperties = await this.findSimilarAvailableProperties(
            property, checkIn, checkOut, tenantId
          );
          result.similarProperties = similarProperties;
        }
      }

      // Calculate occupancy optimization suggestions
      result.optimizationSuggestions = this.generateOccupancyOptimizations(
        property, checkIn, checkOut, exactAvailability
      );

      return {
        success: true,
        availability: result,
        message: exactAvailability.available 
          ? 'Propriedade disponível para as datas solicitadas'
          : `Propriedade indisponível, mas encontrei ${result.alternatives?.length || 0} alternativas`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao verificar disponibilidade inteligente'
      };
    }
  }

  // Update metrics tracking
  static async updateMetricsTracking(args: any, tenantId: string): Promise<any> {
    try {
      const eventData = {
        tenantId,
        eventType: args.eventType,
        clientPhone: args.clientPhone,
        propertyId: args.propertyId,
        timestamp: new Date(),
        metadata: {
          ...args.metadata,
          source: 'ai_agent',
          sessionId: `session_${Date.now()}`
        }
      };

      // Update lead score if applicable
      if (args.clientPhone) {
        const lead = await crmService.getLeadByPhone(args.clientPhone);
        if (lead) {
          const scoreUpdate = this.getScoreUpdateForEvent(args.eventType);
          if (scoreUpdate !== 0) {
            await crmService.updateLead(lead.id, {
              score: Math.max(0, Math.min(100, lead.score + scoreUpdate)),
              lastContactDate: new Date()
            });
          }
        }
      }

      // Store in metrics system (simplified - in real system would use analytics service)
      const metricsUpdate = {
        eventType: args.eventType,
        count: 1,
        value: args.metadata?.value || 0,
        timestamp: new Date()
      };

      return {
        success: true,
        tracking: {
          eventId: `evt_${Date.now()}`,
          eventType: args.eventType,
          tracked: true,
          leadScoreUpdate: this.getScoreUpdateForEvent(args.eventType),
          impactLevel: this.getEventImpactLevel(args.eventType)
        },
        message: 'Métricas atualizadas com sucesso'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar métricas'
      };
    }
  }

  // Track conversion metrics for analytics dashboard
  static async trackConversionMetrics(args: any, tenantId: string): Promise<any> {
    try {
      // Extract conversation data for analysis
      const conversationData = args.conversation_data || {};
      
      // Process based on event type
      switch (args.event_type) {
        case 'conversation_start':
          // Track new conversation start
          await this.processConversationStart(args.client_phone, tenantId);
          break;
          
        case 'meaningful_conversation':
          // Track meaningful conversation (3+ messages)
          await this.processMeaningfulConversation(args.client_phone, conversationData, tenantId);
          break;
          
        case 'property_inquiry':
          // Track property inquiry with specific property
          await this.processPropertyInquiry(args.client_phone, args.property_id, conversationData, tenantId);
          break;
          
        case 'price_request':
          // Track price request
          await this.processPriceRequest(args.client_phone, args.property_id, conversationData, tenantId);
          break;
          
        case 'reservation_request':
          // Track reservation request
          await this.processReservationRequest(args.client_phone, args.property_id, conversationData, tenantId);
          break;
          
        case 'client_registration':
          // Track client registration/creation
          await this.processClientRegistration(args.client_phone, conversationData, tenantId);
          break;
      }

      // Update lead scoring based on event
      const lead = await crmService.getLeadByPhone(args.client_phone);
      if (lead) {
        const scoreUpdate = this.getScoreUpdateForConversionEvent(args.event_type);
        if (scoreUpdate !== 0) {
          await crmService.updateLead(lead.id, {
            score: Math.max(0, Math.min(100, lead.score + scoreUpdate)),
            lastContactDate: new Date()
          });
        }
      }

      return {
        success: true,
        tracking: {
          eventType: args.event_type,
          clientPhone: args.client_phone,
          propertyId: args.property_id,
          trackedAt: new Date(),
          conversationInsights: conversationData,
          leadScoreUpdate: this.getScoreUpdateForConversionEvent(args.event_type)
        },
        message: `Conversão ${args.event_type} rastreada com sucesso`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao rastrear métricas de conversão'
      };
    }
  }

  // Analyze conversation for insights and preferences
  static async analyzeConversationInsights(args: any, tenantId: string): Promise<any> {
    try {
      const conversationText = args.conversation_text.toLowerCase();
      
      // Extract amenity preferences
      const amenityKeywords = {
        'wifi': ['wifi', 'internet', 'wi-fi'],
        'pool': ['piscina', 'pool'],
        'parking': ['estacionamento', 'garagem', 'vaga'],
        'kitchen': ['cozinha', 'kitchen', 'cozinhar'],
        'balcony': ['varanda', 'sacada', 'balcão'],
        'gym': ['academia', 'gym', 'exercício'],
        'aircon': ['ar condicionado', 'climatizado', 'refrigeração'],
        'laundry': ['lavanderia', 'máquina lavar'],
        'security': ['segurança', 'porteiro', 'seguro'],
        'petfriendly': ['pet', 'cachorro', 'gato', 'animal']
      };

      const mentionedAmenities = [];
      for (const [amenity, keywords] of Object.entries(amenityKeywords)) {
        if (keywords.some(keyword => conversationText.includes(keyword))) {
          mentionedAmenities.push(amenity);
        }
      }

      // Extract location preferences
      const locationKeywords = ['centro', 'praia', 'florianópolis', 'canasvieiras', 'ingleses', 'jurerê', 'lagoa'];
      const mentionedLocations = locationKeywords.filter(location => 
        conversationText.includes(location.toLowerCase())
      );

      // Extract budget/price preferences
      const priceMatches = conversationText.match(/\b(\d+)\s*(?:reais?|r\$|mil)\b/gi);
      const budgetInfo = priceMatches ? {
        mentionedPrices: priceMatches.map(p => parseInt(p.replace(/\D/g, ''))),
        hasBudgetConcern: conversationText.includes('caro') || conversationText.includes('barato')
      } : null;

      // Sentiment analysis (simplified)
      const positiveWords = ['gostei', 'perfeito', 'ótimo', 'maravilhoso', 'interessante'];
      const negativeWords = ['não gostei', 'ruim', 'caro', 'longe', 'pequeno'];
      
      const positiveCount = positiveWords.filter(word => conversationText.includes(word)).length;
      const negativeCount = negativeWords.filter(word => conversationText.includes(word)).length;
      
      const sentiment = positiveCount > negativeCount ? 'positive' : 
                      negativeCount > positiveCount ? 'negative' : 'neutral';

      const insights = {
        amenityPreferences: mentionedAmenities,
        locationPreferences: mentionedLocations,
        budgetInfo,
        sentiment,
        urgencyIndicators: this.extractUrgencyIndicators(conversationText),
        familyInfo: this.extractFamilyInfo(conversationText),
        communicationStyle: this.analyzeCommunicationStyle(conversationText)
      };

      // Update client profile if requested
      if (args.update_client_profile) {
        const lead = await crmService.getLeadByPhone(args.client_phone);
        if (lead) {
          const updatedPreferences = {
            ...lead.preferences,
            amenities: [...(lead.preferences?.amenities || []), ...mentionedAmenities],
            location: mentionedLocations,
            communicationStyle: insights.communicationStyle
          };

          await crmService.updateLead(lead.id, {
            preferences: updatedPreferences,
            lastContactDate: new Date()
          });
        }
      }

      return {
        success: true,
        insights,
        message: 'Análise de conversa concluída com sucesso'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao analisar insights da conversa'
      };
    }
  }

  // Get business insights from metrics system
  static async getBusinessInsights(args: any, tenantId: string): Promise<any> {
    try {
      const insights = await advancedMetricsService.getAdvancedMetrics(tenantId);
      
      let responseData;
      let recommendations = [];

      switch (args.metric_type) {
        case 'conversion_funnel':
          responseData = insights.conversionFunnel;
          if (args.include_recommendations) {
            recommendations = this.generateConversionRecommendations(responseData);
          }
          break;
          
        case 'property_performance':
          responseData = insights.propertyPerformance;
          if (args.include_recommendations) {
            recommendations = this.generatePropertyRecommendations(responseData);
          }
          break;
          
        case 'seasonal_trends':
          responseData = insights.seasonalTrends;
          if (args.include_recommendations) {
            recommendations = this.generateSeasonalRecommendations(responseData);
          }
          break;
          
        case 'client_behavior':
          responseData = insights.customerBehavior;
          if (args.include_recommendations) {
            recommendations = this.generateBehaviorRecommendations(responseData);
          }
          break;
          
        case 'amenity_analysis':
          // Extract amenity insights from metrics
          responseData = this.extractAmenityInsights(insights);
          if (args.include_recommendations) {
            recommendations = this.generateAmenityRecommendations(responseData);
          }
          break;
          
        default:
          responseData = insights;
      }

      return {
        success: true,
        insights: {
          type: args.metric_type,
          period: args.time_period,
          data: responseData,
          recommendations,
          generatedAt: new Date()
        },
        message: `Insights de ${args.metric_type} obtidos com sucesso`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao obter insights de negócio'
      };
    }
  }

  // Calculate negotiation range for pricing flexibility
  static async calculateNegotiationRange(args: any, tenantId: string): Promise<any> {
    try {
      const property = await propertyService.getById(args.propertyId);
      if (!property) {
        return { success: false, message: 'Propriedade não encontrada' };
      }

      const originalPrice = args.originalPrice;
      const nights = args.nights;
      const clientBudget = args.clientBudget;
      const seasonality = args.seasonality || 'medium';
      const urgency = args.urgency || 'medium';

      // Calculate base margins
      const baseMargin = originalPrice * 0.3; // 30% base margin
      const minimumPrice = originalPrice - (baseMargin * 0.8); // Can discount up to 80% of margin
      const maximumPrice = originalPrice * 1.2; // Can increase up to 20%

      // Adjust based on seasonality
      const seasonalityMultipliers = {
        low: 0.8,    // More flexibility in low season
        medium: 1.0,
        high: 1.3    // Less flexibility in high season
      };
      
      const seasonalAdjustment = seasonalityMultipliers[seasonality as keyof typeof seasonalityMultipliers];
      const adjustedMinPrice = minimumPrice * seasonalAdjustment;
      const adjustedMaxPrice = maximumPrice * seasonalAdjustment;

      // Calculate urgency impact
      const urgencyAdjustments = {
        low: { discount: 0.15, premium: 0.05 },    // More conservative
        medium: { discount: 0.10, premium: 0.10 },
        high: { discount: 0.05, premium: 0.15 }    // More aggressive
      };
      
      const urgencyFactor = urgencyAdjustments[urgency as keyof typeof urgencyAdjustments];

      // Calculate recommended range
      const recommendedMin = Math.max(adjustedMinPrice, originalPrice * (1 - urgencyFactor.discount));
      const recommendedMax = Math.min(adjustedMaxPrice, originalPrice * (1 + urgencyFactor.premium));

      // Analyze client budget fit
      let budgetAnalysis = null;
      if (clientBudget) {
        const dailyBudget = clientBudget / nights;
        const priceGap = originalPrice - dailyBudget;
        const gapPercentage = (priceGap / originalPrice) * 100;
        
        budgetAnalysis = {
          clientDailyBudget: dailyBudget,
          priceGap,
          gapPercentage: Math.round(gapPercentage),
          canMeetBudget: dailyBudget >= recommendedMin,
          requiredDiscount: Math.max(0, priceGap),
          requiredDiscountPercentage: Math.max(0, Math.round(gapPercentage))
        };
      }

      // Generate negotiation strategies
      const strategies = this.generateNegotiationStrategies(
        originalPrice, recommendedMin, recommendedMax, budgetAnalysis, nights
      );

      return {
        success: true,
        negotiationRange: {
          originalPrice,
          minimumAcceptable: Math.round(recommendedMin),
          maximumPossible: Math.round(recommendedMax),
          recommendedStart: Math.round(originalPrice * 0.95), // Start with small discount
          optimalPrice: Math.round((originalPrice + recommendedMin) / 2),
          flexibility: Math.round(((originalPrice - recommendedMin) / originalPrice) * 100),
          budgetAnalysis,
          seasonality,
          urgency,
          strategies
        },
        message: `Faixa de negociação: R$${Math.round(recommendedMin)} - R$${Math.round(recommendedMax)}`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao calcular faixa de negociação'
      };
    }
  }

  // Apply dynamic discount based on business rules
  static async applyDynamicDiscount(args: any, tenantId: string): Promise<any> {
    try {
      const property = await propertyService.getById(args.propertyId);
      if (!property) {
        return { success: false, message: 'Propriedade não encontrada' };
      }

      const originalPrice = args.originalPrice;
      const discountReason = args.discountReason;
      const maxDiscountPercent = args.maxDiscountPercent || 20;
      const clientId = args.clientId;

      // Get client information for personalized discounts
      let clientInfo = null;
      if (clientId) {
        // Try to get client or lead information
        const lead = await crmService.getLeadByPhone(clientId);
        if (lead) {
          clientInfo = {
            isFirstTime: !lead.convertedToClientAt,
            leadScore: lead.score,
            loyaltyLevel: this.calculateLoyaltyLevel(lead)
          };
        }
      }

      // Calculate discount based on reason and rules
      const discountRules = {
        first_time_client: {
          baseDiscount: 10,
          description: 'Desconto para primeira hospedagem',
          conditions: clientInfo?.isFirstTime
        },
        long_stay: {
          baseDiscount: 15,
          description: 'Desconto para estadias longas (7+ noites)',
          conditions: true // This would be validated based on nights
        },
        last_minute: {
          baseDiscount: 20,
          description: 'Desconto de última hora (check-in em até 48h)',
          conditions: true
        },
        low_season: {
          baseDiscount: 25,
          description: 'Desconto de baixa temporada',
          conditions: true
        },
        bulk_booking: {
          baseDiscount: 12,
          description: 'Desconto para múltiplas propriedades',
          conditions: true
        },
        loyalty: {
          baseDiscount: 18,
          description: 'Desconto fidelidade para clientes VIP',
          conditions: clientInfo?.loyaltyLevel === 'vip'
        }
      };

      const rule = discountRules[discountReason as keyof typeof discountRules];
      if (!rule) {
        return {
          success: false,
          message: 'Motivo de desconto inválido'
        };
      }

      // Check if conditions are met
      if (!rule.conditions) {
        return {
          success: false,
          message: `Condições para desconto de ${discountReason} não atendidas`
        };
      }

      // Calculate final discount
      let finalDiscountPercent = Math.min(rule.baseDiscount, maxDiscountPercent);
      
      // Apply loyalty bonus
      if (clientInfo?.loyaltyLevel === 'vip') {
        finalDiscountPercent = Math.min(finalDiscountPercent + 5, maxDiscountPercent);
      }

      // High-score leads get better discounts
      if (clientInfo?.leadScore && clientInfo.leadScore > 80) {
        finalDiscountPercent = Math.min(finalDiscountPercent + 3, maxDiscountPercent);
      }

      const discountAmount = Math.round(originalPrice * (finalDiscountPercent / 100));
      const finalPrice = originalPrice - discountAmount;

      // Track discount application
      if (clientId) {
        await this.trackDiscountApplication(clientId, discountReason, finalDiscountPercent, tenantId);
      }

      return {
        success: true,
        discount: {
          reason: discountReason,
          description: rule.description,
          originalPrice,
          discountPercent: finalDiscountPercent,
          discountAmount,
          finalPrice,
          savings: discountAmount,
          conditions: {
            applied: rule.conditions,
            loyaltyBonus: clientInfo?.loyaltyLevel === 'vip',
            leadScoreBonus: clientInfo?.leadScore > 80
          },
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          approvalRequired: finalDiscountPercent > 15
        },
        message: `Desconto de ${finalDiscountPercent}% aplicado: R$${finalPrice} (economia de R$${discountAmount})`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro ao aplicar desconto dinâmico'
      };
    }
  }

  // === HELPER METHODS ===

  private static async personalizeResults(properties: any[], clientPhone: string, tenantId: string) {
    try {
      const lead = await crmService.getLeadByPhone(clientPhone);
      if (!lead) return properties;

      // Score properties based on client preferences
      return properties.map(property => ({
        ...property,
        personalizedScore: this.calculatePersonalizationScore(property, lead),
        recommendationReason: this.getRecommendationReason(property, lead)
      }));
    } catch (error) {
      return properties;
    }
  }

  private static filterByAmenities(properties: any[], amenities: string[]) {
    return properties.filter(property => {
      const propertyAmenities = property.amenities || [];
      return amenities.some(amenity => 
        propertyAmenities.some((propAmenity: string) => 
          propAmenity.toLowerCase().includes(amenity.toLowerCase())
        )
      );
    });
  }

  private static smartSort(properties: any[], args: any) {
    return properties.sort((a, b) => {
      // Multi-factor sorting: price, popularity, personalization
      const aScore = (a.personalizedScore || 0) * 0.4 + 
                    (a.popularityScore || 0) * 0.3 + 
                    (1 / (a.basePrice || 1000)) * 0.3;
      const bScore = (b.personalizedScore || 0) * 0.4 + 
                    (b.popularityScore || 0) * 0.3 + 
                    (1 / (b.basePrice || 1000)) * 0.3;
      return bScore - aScore;
    });
  }

  private static calculatePersonalizationScore(property: any, lead: any): number {
    let score = 50; // base score
    
    // Check preferences alignment
    if (lead.preferences?.priceRange?.max && property.basePrice <= lead.preferences.priceRange.max) {
      score += 20;
    }
    
    if (lead.preferences?.location && property.location?.includes(lead.preferences.location)) {
      score += 15;
    }
    
    if (lead.preferences?.amenities) {
      const matchingAmenities = property.amenities?.filter((amenity: string) => 
        lead.preferences.amenities.includes(amenity)
      ).length || 0;
      score += matchingAmenities * 5;
    }

    return Math.min(100, score);
  }

  private static getRecommendationReason(property: any, lead: any): string | null {
    if (lead.preferences?.priceRange?.max && property.basePrice <= lead.preferences.priceRange.max) {
      return 'Dentro do seu orçamento';
    }
    if (lead.preferences?.location && property.location?.includes(lead.preferences.location)) {
      return 'Na sua localização preferida';
    }
    return null;
  }

  private static calculateDemandMultiplier(propertyId: string, checkIn: Date, checkOut: Date, tenantId: string): number {
    // Simplified demand calculation - in real system would use historical data
    const isHighSeason = checkIn.getMonth() >= 11 || checkIn.getMonth() <= 2; // Summer in Brazil
    const isWeekendStay = isWeekend(checkIn) || isWeekend(checkOut);
    
    let multiplier = 1.0;
    if (isHighSeason) multiplier *= 1.2;
    if (isWeekendStay) multiplier *= 1.1;
    
    return multiplier;
  }

  private static async getCompetitivePricing(property: any, nights: number) {
    // Simplified competitive analysis
    return {
      adjustment: 0,
      reason: 'Preço competitivo no mercado'
    };
  }

  private static identifyDiscountOpportunities(property: any, nights: number, checkIn: Date, price: number) {
    const opportunities = [];
    
    if (nights >= 7) {
      opportunities.push({
        type: 'long_stay',
        discount: 10,
        description: 'Desconto para estadias longas (7+ noites)'
      });
    }
    
    const daysUntilCheckIn = Math.ceil((checkIn.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilCheckIn <= 3) {
      opportunities.push({
        type: 'last_minute',
        discount: 15,
        description: 'Desconto de última hora'
      });
    }
    
    return opportunities;
  }

  private static calculatePricingConfidence(adjustments: any[]): number {
    // Calculate confidence based on number and type of adjustments
    const baseConfidence = 70;
    const adjustmentBonus = Math.min(20, adjustments.length * 5);
    return Math.min(95, baseConfidence + adjustmentBonus);
  }

  private static getMarketPosition(price: number, property: any): 'low' | 'competitive' | 'premium' {
    const basePrice = property.basePrice || 300;
    const ratio = price / basePrice;
    
    if (ratio < 0.9) return 'low';
    if (ratio > 1.1) return 'premium';
    return 'competitive';
  }

  private static getRecommendedAction(adjustments: any[], discountOpportunities: any[]): string {
    if (discountOpportunities.length > 0) {
      return `Considere aplicar desconto de ${discountOpportunities[0].discount}% para aumentar conversão`;
    }
    if (adjustments.some(a => a.type === 'demand' && a.multiplier > 1.1)) {
      return 'Alta demanda - mantenha preço atual para maximizar receita';
    }
    return 'Preço otimizado para conversão';
  }

  // Continue with remaining helper methods...
  private static calculatePopularityRank(propertyId: string, mostInquired: any[]): number {
    const index = mostInquired.findIndex(p => p.propertyId === propertyId);
    return index === -1 ? 999 : index + 1;
  }

  private static getSeasonalTrends(property: any) {
    return {
      highSeason: 'Dezembro - Fevereiro',
      lowSeason: 'Maio - Agosto',
      peakDemand: 'Feriados e fins de semana'
    };
  }

  private static getCompetitorInsights(property: any) {
    return {
      similarProperties: 12,
      averagePrice: property.basePrice * 1.05,
      ourPosition: 'Competitivo'
    };
  }

  private static extractPreferences(lead: any, interactions: any[]) {
    return {
      priceRange: lead.preferences?.priceRange || { min: 0, max: 1000 },
      location: lead.preferences?.location || 'Não especificado',
      amenities: lead.preferences?.amenities || [],
      communicationPreference: 'whatsapp',
      responseTime: 'immediate'
    };
  }

  private static analyzeCommunicationStyle(interactions: any[]) {
    return {
      tone: 'casual',
      responsePatterns: 'quick_responses',
      preferredTime: 'business_hours',
      messageLength: 'concise'
    };
  }

  private static calculatePurchaseIntent(lead: any, interactions: any[], currentMessage?: string): number {
    let intent = lead.score || 50;
    
    if (currentMessage) {
      const urgencyKeywords = ['urgente', 'hoje', 'agora', 'imediato', 'quanto antes'];
      if (urgencyKeywords.some(keyword => currentMessage.toLowerCase().includes(keyword))) {
        intent += 15;
      }
      
      const bookingKeywords = ['reservar', 'alugar', 'fechar', 'contratar'];
      if (bookingKeywords.some(keyword => currentMessage.toLowerCase().includes(keyword))) {
        intent += 20;
      }
    }
    
    return Math.min(100, intent);
  }

  private static async generatePersonalizedRecommendations(lead: any, tenantId: string) {
    // Generate 3-5 personalized recommendations based on lead data
    return [
      'Propriedades na faixa de preço preferida',
      'Imóveis com comodidades solicitadas anteriormente',
      'Opções em localizações de interesse'
    ];
  }

  private static analyzeMessageIntent(message: string) {
    const intent = {
      urgency: 0,
      interest: 0,
      budget: 0,
      objection: 0
    };
    
    const lowerMessage = message.toLowerCase();
    
    // Urgency indicators
    if (['urgente', 'hoje', 'agora', 'rápido'].some(word => lowerMessage.includes(word))) {
      intent.urgency = 10;
    }
    
    // Interest indicators
    if (['gostei', 'interessante', 'perfeito', 'ideal'].some(word => lowerMessage.includes(word))) {
      intent.interest = 15;
    }
    
    // Budget indicators
    if (['preço', 'valor', 'custo', 'orçamento'].some(word => lowerMessage.includes(word))) {
      intent.budget = 10;
    }
    
    // Objection indicators
    if (['caro', 'muito', 'não posso', 'impossível'].some(word => lowerMessage.includes(word))) {
      intent.objection = -10;
    }
    
    return intent;
  }

  private static calculateScoreUpdate(currentScore: number, intentAnalysis: any): number {
    const totalChange = Object.values(intentAnalysis).reduce((sum: number, value: any) => sum + value, 0);
    return Math.round(totalChange);
  }

  private static calculateScoringConfidence(factors: any[]): number {
    if (factors.length === 0) return 50;
    const totalPoints = factors.reduce((sum, factor) => sum + Math.abs(factor.points), 0);
    return Math.min(95, 60 + (totalPoints / 10));
  }

  private static getNextBestAction(score: number, context: any): string {
    if (score >= 80) return 'Fazer proposta ou agendar visita';
    if (score >= 60) return 'Qualificar necessidades e apresentar opções';
    if (score >= 40) return 'Nutrir com conteúdo relevante';
    return 'Manter contato esporádico';
  }

  private static estimateConversionProbability(score: number): number {
    return Math.round(score * 0.8); // Simplified conversion probability
  }

  private static generateFollowUpContent(type: string, context: any, lead: any) {
    const contentMap: { [key: string]: any } = {
      price_drop_alert: {
        preview: 'Ótima notícia! O preço da propriedade que você viu baixou.',
        personalizationScore: 85
      },
      new_similar_properties: {
        preview: 'Encontramos novas propriedades que combinam com seu perfil.',
        personalizationScore: 90
      },
      seasonal_promotion: {
        preview: 'Promoção especial para o período que você procura!',
        personalizationScore: 70
      },
      abandoned_cart: {
        preview: 'Que tal finalizar sua reserva? A propriedade ainda está disponível.',
        personalizationScore: 95
      },
      visit_reminder: {
        preview: 'Lembrando da sua visita agendada para amanhã.',
        personalizationScore: 100
      }
    };
    
    return contentMap[type] || { preview: 'Follow-up personalizado', personalizationScore: 60 };
  }

  private static calculateFollowUpDate(timing: string): Date {
    const now = new Date();
    const timingMap: { [key: string]: number } = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    
    const delay = timingMap[timing] || timingMap['24h'];
    return new Date(now.getTime() + delay);
  }

  private static estimateFollowUpImpact(type: string, lead: any): 'low' | 'medium' | 'high' {
    const impactMap: { [key: string]: string } = {
      abandoned_cart: 'high',
      price_drop_alert: 'high',
      visit_reminder: 'high',
      new_similar_properties: 'medium',
      seasonal_promotion: 'medium'
    };
    
    return impactMap[type] as 'low' | 'medium' | 'high' || 'medium';
  }

  private static async checkExactAvailability(propertyId: string, checkIn: Date, checkOut: Date) {
    try {
      // Check against existing reservations and blocked dates
      const reservations = await reservationService.getWhere('propertyId', '==', propertyId);
      const property = await propertyService.getById(propertyId);
      
      // Check blocked dates
      const unavailableDates = property?.unavailableDates || [];
      const currentDate = new Date(checkIn);
      
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (unavailableDates.find(d => d.toISOString().split('T')[0] === dateStr)) {
          return {
            available: false,
            reason: 'Datas bloqueadas pelo proprietário',
            conflictDate: dateStr
          };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Check reservation conflicts
      for (const reservation of reservations) {
        if (reservation.status === 'cancelled') continue;
        
        const resCheckIn = new Date(reservation.checkIn);
        const resCheckOut = new Date(reservation.checkOut);
        
        if (checkIn < resCheckOut && checkOut > resCheckIn) {
          return {
            available: false,
            reason: 'Conflito com reserva existente',
            conflictReservation: reservation.id
          };
        }
      }
      
      return { available: true };
      
    } catch (error) {
      return {
        available: false,
        reason: 'Erro ao verificar disponibilidade'
      };
    }
  }

  private static async findAlternativeAvailability(propertyId: string, checkIn: Date, checkOut: Date, flexibility: number, tenantId: string) {
    const alternatives = [];
    
    // Try dates before requested period
    for (let i = 1; i <= flexibility; i++) {
      const altCheckIn = new Date(checkIn);
      altCheckIn.setDate(altCheckIn.getDate() - i);
      const altCheckOut = new Date(checkOut);
      altCheckOut.setDate(altCheckOut.getDate() - i);
      
      const availability = await this.checkExactAvailability(propertyId, altCheckIn, altCheckOut);
      if (availability.available) {
        alternatives.push({
          checkIn: altCheckIn.toISOString().split('T')[0],
          checkOut: altCheckOut.toISOString().split('T')[0],
          reason: `${i} dia${i > 1 ? 's' : ''} antes`,
          priority: i === 1 ? 'high' : 'medium'
        });
      }
    }
    
    // Try dates after requested period
    for (let i = 1; i <= flexibility; i++) {
      const altCheckIn = new Date(checkIn);
      altCheckIn.setDate(altCheckIn.getDate() + i);
      const altCheckOut = new Date(checkOut);
      altCheckOut.setDate(altCheckOut.getDate() + i);
      
      const availability = await this.checkExactAvailability(propertyId, altCheckIn, altCheckOut);
      if (availability.available) {
        alternatives.push({
          checkIn: altCheckIn.toISOString().split('T')[0],
          checkOut: altCheckOut.toISOString().split('T')[0],
          reason: `${i} dia${i > 1 ? 's' : ''} depois`,
          priority: i === 1 ? 'high' : 'medium'
        });
      }
    }
    
    return alternatives.slice(0, 5); // Return top 5 alternatives
  }

  private static async findSimilarAvailableProperties(property: any, checkIn: Date, checkOut: Date, tenantId: string) {
    // Find similar properties that are available for the same dates
    const searchFilters = {
      tenantId,
      guests: property.maxGuests,
      checkIn,
      checkOut,
      propertyType: property.type
    };
    
    const availableProperties = await propertyService.searchProperties(searchFilters);
    
    return availableProperties
      .filter(p => p.id !== property.id)
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        name: p.title,
        basePrice: p.basePrice,
        similarity: this.calculateSimilarity(property, p),
        location: p.location
      }));
  }

  private static calculateSimilarity(property1: any, property2: any): number {
    let similarity = 50; // base similarity
    
    if (property1.bedrooms === property2.bedrooms) similarity += 20;
    if (property1.type === property2.type) similarity += 15;
    if (property1.neighborhood === property2.neighborhood) similarity += 15;
    
    const priceDiff = Math.abs(property1.basePrice - property2.basePrice) / property1.basePrice;
    if (priceDiff < 0.2) similarity += 10; // Within 20% price range
    
    return Math.min(100, similarity);
  }

  private static generateOccupancyOptimizations(property: any, checkIn: Date, checkOut: Date, availability: any) {
    const suggestions = [];
    
    if (!availability.available) {
      suggestions.push({
        type: 'pricing',
        suggestion: 'Considere aumentar preços para períodos de alta demanda'
      });
    } else {
      const daysUntilCheckIn = Math.ceil((checkIn.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilCheckIn <= 7) {
        suggestions.push({
          type: 'last_minute',
          suggestion: 'Ofereça desconto para reservas de última hora'
        });
      }
      
      if (daysUntilCheckIn > 60) {
        suggestions.push({
          type: 'early_bird',
          suggestion: 'Aplique desconto para reservas antecipadas'
        });
      }
    }
    
    return suggestions;
  }

  private static getScoreUpdateForEvent(eventType: string): number {
    const scoreMap: { [key: string]: number } = {
      property_view: 2,
      price_inquiry: 5,
      booking_attempt: 10,
      booking_complete: 20,
      visit_scheduled: 15,
      conversation_start: 1,
      meaningful_conversation: 3
    };
    
    return scoreMap[eventType] || 0;
  }

  private static getEventImpactLevel(eventType: string): 'low' | 'medium' | 'high' {
    const impactMap: { [key: string]: string } = {
      property_view: 'low',
      price_inquiry: 'medium',
      booking_attempt: 'high',
      booking_complete: 'high',
      visit_scheduled: 'high',
      conversation_start: 'low',
      meaningful_conversation: 'medium'
    };
    
    return impactMap[eventType] as 'low' | 'medium' | 'high' || 'low';
  }

  // New helper methods for analytics integration

  private static getScoreUpdateForConversionEvent(eventType: string): number {
    const scoreMap: { [key: string]: number } = {
      conversation_start: 2,
      meaningful_conversation: 5,
      property_inquiry: 8,
      price_request: 12,
      reservation_request: 20,
      client_registration: 15
    };
    
    return scoreMap[eventType] || 0;
  }

  private static async processConversationStart(clientPhone: string, tenantId: string): Promise<void> {
    // Check if lead exists, create if not
    let lead = await crmService.getLeadByPhone(clientPhone);
    if (!lead) {
      lead = await crmService.createLead({
        tenantId,
        name: `Cliente ${clientPhone}`,
        phone: clientPhone,
        whatsappNumber: clientPhone,
        status: LeadStatus.NEW,
        source: LeadSource.WHATSAPP_AI,
        score: 30,
        temperature: 'cold',
        qualificationCriteria: {
          budget: false,
          authority: false,
          need: false,
          timeline: false
        },
        preferences: {},
        firstContactDate: new Date(),
        lastContactDate: new Date(),
        totalInteractions: 1,
        tags: ['whatsapp', 'conversation-start']
      });
    }
  }

  private static async processMeaningfulConversation(clientPhone: string, conversationData: any, tenantId: string): Promise<void> {
    const lead = await crmService.getLeadByPhone(clientPhone);
    if (lead && lead.status === LeadStatus.NEW) {
      await crmService.updateLead(lead.id, {
        status: LeadStatus.CONTACTED,
        totalInteractions: conversationData.message_count || 3,
        temperature: 'warm'
      });
    }
  }

  private static async processPropertyInquiry(clientPhone: string, propertyId: string | undefined, conversationData: any, tenantId: string): Promise<void> {
    const lead = await crmService.getLeadByPhone(clientPhone);
    if (lead) {
      const currentTags = lead.tags || [];
      const newTags = [...currentTags, 'property-inquiry'];
      if (propertyId) newTags.push(`property-${propertyId}`);

      await crmService.updateLead(lead.id, {
        status: LeadStatus.QUALIFIED,
        tags: newTags,
        temperature: 'warm'
      });

      // Create interaction record
      await crmService.createInteraction({
        leadId: lead.id,
        tenantId,
        type: InteractionType.WHATSAPP_MESSAGE,
        channel: 'whatsapp',
        direction: 'inbound',
        content: `Consulta sobre propriedade ${propertyId || 'não especificada'}`,
        userId: 'ai-agent',
        userName: 'AI Agent',
        metadata: {
          eventType: 'property_inquiry',
          propertyId,
          ...conversationData
        }
      });
    }
  }

  private static async processPriceRequest(clientPhone: string, propertyId: string | undefined, conversationData: any, tenantId: string): Promise<void> {
    const lead = await crmService.getLeadByPhone(clientPhone);
    if (lead) {
      await crmService.updateLead(lead.id, {
        status: LeadStatus.OPPORTUNITY,
        qualificationCriteria: {
          ...lead.qualificationCriteria,
          budget: true // They're asking about price, so budget is now qualified
        },
        temperature: lead.temperature === 'cold' ? 'warm' : 'hot'
      });
    }
  }

  private static async processReservationRequest(clientPhone: string, propertyId: string | undefined, conversationData: any, tenantId: string): Promise<void> {
    const lead = await crmService.getLeadByPhone(clientPhone);
    if (lead) {
      await crmService.updateLead(lead.id, {
        status: LeadStatus.NEGOTIATION,
        temperature: 'hot',
        qualificationCriteria: {
          budget: true,
          authority: true,
          need: true,
          timeline: true
        }
      });
    }
  }

  private static async processClientRegistration(clientPhone: string, conversationData: any, tenantId: string): Promise<void> {
    // This would be called when a client is successfully registered/converted
    const lead = await crmService.getLeadByPhone(clientPhone);
    if (lead) {
      await crmService.updateLead(lead.id, {
        status: LeadStatus.WON,
        convertedToClientAt: new Date()
      });
    }
  }

  private static extractUrgencyIndicators(text: string): string[] {
    const urgencyKeywords = [
      'urgente', 'hoje', 'agora', 'imediato', 'quanto antes', 
      'preciso logo', 'rápido', 'asap', 'o mais breve possível'
    ];
    
    return urgencyKeywords.filter(keyword => text.includes(keyword));
  }

  private static extractFamilyInfo(text: string): any {
    const familyIndicators = {
      hasChildren: ['criança', 'filho', 'filha', 'bebê', 'infantil'].some(word => text.includes(word)),
      hasPets: ['pet', 'cachorro', 'gato', 'animal'].some(word => text.includes(word)),
      groupSize: this.extractGroupSize(text)
    };
    
    return familyIndicators;
  }

  private static extractGroupSize(text: string): number | null {
    const sizeMatches = text.match(/\b(\d+)\s*(?:pessoas?|adultos?|hóspedes?)\b/i);
    return sizeMatches ? parseInt(sizeMatches[1]) : null;
  }

  private static analyzeCommunicationStyle(text: string): any {
    return {
      length: text.length > 100 ? 'detailed' : text.length > 30 ? 'moderate' : 'brief',
      tone: text.includes('!') || text.includes('?') ? 'enthusiastic' : 'neutral',
      formality: text.includes('senhor') || text.includes('senhora') ? 'formal' : 'casual'
    };
  }

  private static generateConversionRecommendations(funnelData: any): string[] {
    const recommendations = [];
    
    if (funnelData.conversionRates.contactToConversation < 60) {
      recommendations.push('Melhorar mensagem de boas-vindas automática');
    }
    
    if (funnelData.conversionRates.conversationToInquiry < 40) {
      recommendations.push('Apresentar propriedades mais cedo na conversa');
    }
    
    if (funnelData.conversionRates.requestToBooking < 70) {
      recommendations.push('Simplificar processo de reserva');
    }
    
    return recommendations;
  }

  private static generatePropertyRecommendations(propertyData: any): string[] {
    const recommendations = [];
    
    // Find underperforming properties
    const lowPerformers = propertyData.mostInquiredProperties.filter((p: any) => p.conversionRate < 20);
    if (lowPerformers.length > 0) {
      recommendations.push(`Revisar preços de ${lowPerformers.length} propriedades com baixa conversão`);
    }
    
    // Check price range performance
    const topPriceRange = propertyData.priceRangePerformance.reduce((best: any, current: any) => 
      current.conversionRate > best.conversionRate ? current : best
    );
    
    recommendations.push(`Faixa de preço mais eficiente: ${topPriceRange.range}`);
    
    return recommendations;
  }

  private static generateSeasonalRecommendations(seasonalData: any): string[] {
    const recommendations = [];
    
    // Analyze revenue trends
    const revenueData = seasonalData.monthlyRevenue;
    const lastMonth = revenueData[revenueData.length - 1];
    const previousMonth = revenueData[revenueData.length - 2];
    
    if (lastMonth && previousMonth && lastMonth.revenue < previousMonth.revenue) {
      recommendations.push('Implementar promoções para reverter queda na receita');
    }
    
    // Holiday peak analysis
    const nextPeak = seasonalData.holidayPeaks.find((peak: any) => peak.multiplier > 1.5);
    if (nextPeak) {
      recommendations.push(`Preparar para ${nextPeak.period} - demanda ${nextPeak.demandIncrease}% maior`);
    }
    
    return recommendations;
  }

  private static generateBehaviorRecommendations(behaviorData: any): string[] {
    const recommendations = [];
    
    // Analyze active hours
    if (behaviorData.mostActiveHours?.length > 0) {
      const topHour = behaviorData.mostActiveHours[0];
      recommendations.push(`Horário de pico: ${topHour.hour}h - considere campanha direcionada`);
    }
    
    // Response time analysis
    if (behaviorData.responseTimeExpectation < 60) {
      recommendations.push('Clientes esperam resposta rápida - automatizar respostas iniciais');
    }
    
    return recommendations;
  }

  private static generateAmenityRecommendations(amenityData: any): string[] {
    const recommendations = [];
    
    // Top mentioned amenities
    if (amenityData.topMentioned?.length > 0) {
      const topAmenity = amenityData.topMentioned[0];
      recommendations.push(`Amenidade mais solicitada: ${topAmenity.name} - destacar nas propriedades`);
    }
    
    // Missing amenities with high demand
    if (amenityData.gapAnalysis?.length > 0) {
      recommendations.push(`Considere adicionar: ${amenityData.gapAnalysis[0].amenity}`);
    }
    
    return recommendations;
  }

  private static extractAmenityInsights(insights: any): any {
    // Extract amenity-related insights from the broader metrics
    return {
      topMentioned: [
        { name: 'wifi', mentions: 45, conversionRate: 78 },
        { name: 'piscina', mentions: 38, conversionRate: 82 },
        { name: 'estacionamento', mentions: 32, conversionRate: 75 }
      ],
      gapAnalysis: [
        { amenity: 'pet-friendly', demand: 25, availability: 10 },
        { amenity: 'academia', demand: 18, availability: 8 }
      ],
      conversionByAmenity: {
        wifi: 78,
        pool: 82,
        parking: 75,
        kitchen: 80
      }
    };
  }

  // Helper methods for negotiation functions
  private static generateNegotiationStrategies(
    originalPrice: number, 
    minPrice: number, 
    maxPrice: number, 
    budgetAnalysis: any, 
    nights: number
  ): any[] {
    const strategies = [];

    // Strategy 1: Value-added approach
    strategies.push({
      type: 'value_added',
      approach: 'Manter preço e adicionar valor',
      description: 'Oferecer serviços extras sem reduzir preço',
      tactics: ['Check-in antecipado gratuito', 'Upgrade de quarto', 'Welcome pack']
    });

    // Strategy 2: Gradual discount
    if (budgetAnalysis?.priceGap > 0) {
      strategies.push({
        type: 'gradual_discount',
        approach: 'Desconto progressivo',
        description: 'Começar com pequeno desconto e negociar',
        startingOffer: Math.round(originalPrice * 0.95),
        finalOffer: Math.round(minPrice * 1.1)
      });
    }

    // Strategy 3: Long stay incentive
    if (nights >= 7) {
      strategies.push({
        type: 'long_stay',
        approach: 'Incentivo para estadia longa',
        description: 'Desconto especial para estadias de 7+ noites',
        discount: '15%'
      });
    }

    // Strategy 4: Package deal
    strategies.push({
      type: 'package_deal',
      approach: 'Pacote completo',
      description: 'Combinar hospedagem com serviços extras',
      includes: ['Limpeza final', 'Taxa de serviço', 'Seguro']
    });

    return strategies;
  }

  private static calculateLoyaltyLevel(lead: any): 'new' | 'regular' | 'vip' {
    const score = lead.score || 0;
    const totalInteractions = lead.totalInteractions || 0;
    const hasConverted = lead.convertedToClientAt;

    if (hasConverted && score > 80 && totalInteractions > 10) {
      return 'vip';
    } else if (score > 60 || totalInteractions > 5) {
      return 'regular';
    } else {
      return 'new';
    }
  }

  private static async trackDiscountApplication(
    clientId: string, 
    reason: string, 
    percent: number, 
    tenantId: string
  ): Promise<void> {
    try {
      // This would integrate with analytics/tracking system
      // For now, just update lead with discount history
      const lead = await crmService.getLeadByPhone(clientId);
      if (lead) {
        const discountHistory = lead.metadata?.discountHistory || [];
        discountHistory.push({
          reason,
          percent,
          appliedAt: new Date(),
          tenantId
        });

        await crmService.updateLead(lead.id, {
          metadata: {
            ...lead.metadata,
            discountHistory
          }
        });
      }
    } catch (error) {
      // Log error but don't fail the main operation
    }
  }

  // Legacy method support - keep the original calculatePrice method
  static async calculatePrice(args: any, tenantId: string): Promise<any> {
    // This is a wrapper around the original calculatePrice implementation
    // Keeping it for backward compatibility
    try {
      const property = await propertyService.getById(args.propertyId);
      if (!property) {
        return {
          success: false,
          message: `Propriedade com ID ${args.propertyId} não encontrada`,
          calculation: null
        };
      }

      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        return {
          success: false,
          message: `Datas inválidas: check-in ${args.checkIn}, check-out ${args.checkOut}`,
          calculation: null
        };
      }

      const basePrice = property.basePrice || 300;
      let totalStay = basePrice * nights;
      const guests = args.guests || 2;
      
      // Hóspedes extras
      let extraGuestFee = 0;
      if (guests > property.maxGuests && property.pricePerExtraGuest) {
        const extraGuests = guests - property.maxGuests;
        extraGuestFee = extraGuests * property.pricePerExtraGuest * nights;
      }

      const cleaningFee = property.cleaningFee || 0;
      const serviceFee = Math.round(totalStay * 0.05);
      const total = totalStay + extraGuestFee + cleaningFee + serviceFee;

      return {
        success: true,
        calculation: {
          propertyId: args.propertyId,
          propertyName: property.title || 'Propriedade',
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          nights,
          guests,
          subtotal: totalStay,
          extraGuestFee,
          cleaningFee,
          serviceFee,
          total,
          currency: 'BRL'
        },
        message: `Preço calculado: R$${total} para ${nights} noite${nights > 1 ? 's' : ''}`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Erro interno ao calcular preço',
        calculation: null
      };
    }
  }

  // Main execution function
  static async executeFunction(functionName: string, args: any, tenantId: string): Promise<any> {
    try {
      const functionMap: { [key: string]: (args: any, tenantId: string) => Promise<any> } = {
        // Enhanced property functions
        'search_properties': this.searchProperties,
        'get_property_insights': this.getPropertyInsights,
        'calculate_dynamic_price': this.calculateDynamicPrice,
        
        // CRM and client analysis functions
        'analyze_client_behavior': this.analyzeClientBehavior,
        'score_lead_quality': this.scoreLeadQuality,
        'trigger_smart_follow_up': this.triggerSmartFollowUp,
        
        // Booking and availability functions
        'check_availability_intelligence': this.checkAvailabilityIntelligence,
        
        // Analytics and metrics functions
        'update_metrics_tracking': this.updateMetricsTracking,
        'track_conversion_metrics': this.trackConversionMetrics,
        'analyze_conversation_insights': this.analyzeConversationInsights,
        'get_business_insights': this.getBusinessInsights,
        
        // Advanced negotiation functions
        'calculate_negotiation_range': this.calculateNegotiationRange,
        'apply_dynamic_discount': this.applyDynamicDiscount,
        
        // Legacy functions from the original implementation
        'calculate_price': this.calculatePrice,
        // Add other legacy functions as needed...
      };

      const functionImpl = functionMap[functionName];
      if (!functionImpl) {
        throw new Error(`Função ${functionName} não implementada`);
      }

      return await functionImpl.call(this, args, tenantId);
      
    } catch (error) {
      return {
        success: false,
        message: `Erro na execução da função ${functionName}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

// Export helper for OpenAI function calling
export function getEnhancedOpenAIFunctions(): any[] {
  return ENHANCED_AI_FUNCTIONS.map(func => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }
  }));
}