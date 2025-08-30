// lib/ai/tenant-aware-agent-functions.ts
// FUNÇÕES MULTI-TENANT PARA SOFIA AGENT
// Versão que usa estrutura tenants/{tenantId}/collections

import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import { Reservation, ReservationStatus, ReservationSource, PaymentMethod, PaymentStatus } from '@/lib/types/reservation';
import { VisitAppointment, VisitStatus } from '@/lib/types/visit-appointment';
// import { Ticket, TicketResponse, CreateTicketRequest, TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';
// import { TicketServiceV2 } from '@/lib/services/ticket-service-v2';
import { propertyCache } from '@/lib/cache/property-cache-manager';
import { leadScoringService } from '@/lib/services/lead-scoring-service';

// ===== HELPER FUNCTIONS =====

/**
 * 🔍 Função auxiliar para buscar propriedade por nome
 * Como cada tenant não tem propriedades com nomes duplicados, 
 * podemos usar busca por nome em vez de ID
 */
async function findPropertyByName(propertyName: string, tenantId: string): Promise<Property | null> {
  try {
    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    
    // Buscar propriedades ativas com nome exato (case-insensitive)
    const properties = await propertyService.getMany([
      { field: 'isActive', operator: '==', value: true }
    ]) as Property[];
    
    // Encontrar propriedade com nome correspondente (case-insensitive)
    const property = properties.find(p => 
      p.title?.toLowerCase().trim() === propertyName.toLowerCase().trim()
    );
    
    if (property) {
      logger.info('✅ [Helper] Propriedade encontrada por nome', {
        tenantId: tenantId.substring(0, 8) + '***',
        propertyName: propertyName,
        foundProperty: property.title,
        propertyId: property.id
      });
      return property;
    }
    
    // Se não encontrou exata, tentar busca parcial
    const partialMatch = properties.find(p => 
      p.title?.toLowerCase().includes(propertyName.toLowerCase().trim()) ||
      propertyName.toLowerCase().includes(p.title?.toLowerCase().trim() || '')
    );
    
    if (partialMatch) {
      logger.info('✅ [Helper] Propriedade encontrada por busca parcial', {
        tenantId: tenantId.substring(0, 8) + '***',
        searchTerm: propertyName,
        foundProperty: partialMatch.title,
        propertyId: partialMatch.id
      });
      return partialMatch;
    }
    
    logger.warn('⚠️ [Helper] Propriedade não encontrada por nome', {
      tenantId: tenantId.substring(0, 8) + '***',
      searchTerm: propertyName,
      availableProperties: properties.map(p => p.title)
    });
    
    return null;
  } catch (error) {
    logger.error('❌ [Helper] Erro ao buscar propriedade por nome', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

// ===== INTERFACES =====

interface SearchPropertiesArgs {
  location?: string;
  guests?: number;
  bedrooms?: number;
  checkIn?: string;
  checkOut?: string;
  maxPrice?: number;
  amenities?: string[];
  propertyType?: string;
}

interface CalculatePriceArgs {
  propertyName: string; // Mudado de propertyId para propertyName
  checkIn: string;
  checkOut: string;
  guests?: number;
  clientPhone?: string; // Para acessar contexto da conversa
}

interface CreateReservationArgs {
  propertyName: string; // Mudado de propertyId para propertyName
  clientId?: string;
  clientPhone?: string;
  clientName?: string;
  clientEmail?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice?: number;
}

interface RegisterClientArgs {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  whatsappNumber?: string;
}

interface GetPropertyDetailsArgs {
  propertyName: string; // Mudado de propertyId para propertyName - OBRIGATÓRIO
  propertyIndex?: number;
  propertyReference?: string;
}

interface SendPropertyMediaArgs {
  propertyName?: string; // Mudado de propertyId para propertyName
  propertyIndex?: number;
  mediaType?: 'photos' | 'videos' | 'all';
}

interface ScheduleVisitArgs {
  propertyId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  visitDate: string;
  visitTime?: string;
  notes?: string;
}

interface ClassifyLeadArgs {
  clientPhone: string;
  interactionType: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  interestedProperties?: string[];
  budget?: number;
  timeline?: string;
  notes?: string;
}

interface UpdateLeadStatusArgs {
  clientPhone: string;
  newStatus: string;
  reason?: string;
  notes?: string;
}

interface GenerateQuoteArgs {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  includeDetails?: boolean;
  paymentMethod?: string;
}

interface CheckAvailabilityArgs {
  propertyName: string; // Mudado de propertyId para propertyName
  checkIn: string;
  checkOut: string;
}

// Interface para verificar disponibilidade da agenda
interface CheckAgendaAvailabilityArgs {
  year: number;    // Ano (ex: 2025)
  month: number;   // Mês (1-12)
  day?: number;    // Dia opcional - se fornecido, retorna apenas esse dia
}

// Interface para slot ocupado na agenda
interface OccupiedTimeSlot {
  id: string;
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime: string;        // HH:MM (calculado baseado em duration)
  duration: number;       // Em minutos
  title: string;          // Título do evento/visita
  clientName: string;
  clientPhone?: string;
  type: 'meeting' | 'visit' | 'blocked';  // Tipo do evento
  status: string;         // Status da agenda
  notes?: string;
}

// Interface para resposta de disponibilidade da agenda
interface AgendaAvailabilityResponse {
  success: boolean;
  date?: string;              // Data consultada (se day fornecido)
  month?: string;             // Mês consultado (se day não fornecido)
  occupiedSlots: OccupiedTimeSlot[];
  totalOccupied: number;
  availableSuggestions?: string[];  // Horários livres sugeridos
  workingHours?: {
    start: string;            // Horário de início do trabalho
    end: string;              // Horário de fim do trabalho
    lunchBreak?: {
      start: string;
      end: string;
    };
  };
  error?: string;
  tenantId: string;
}

// Função para criar transação financeira
interface CreateTransactionArgs {
  reservationId: string;
  clientId: string;
  propertyId: string;
  totalAmount: number;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash';
  advancePaymentPercentage?: number; // Percentual a ser pago antecipadamente (ex: 10 para 10%)
  notes?: string;
}

// ===== INTERFACES CRM MANAGEMENT =====

interface CreateLeadArgs {
  phone: string;
  whatsappNumber?: string;
  name?: string;
  email?: string;
  source?: 'whatsapp_ai' | 'website' | 'referral' | 'social_media' | 'manual';
  sourceDetails?: string;
  initialInteraction?: string;
  preferences?: {
    propertyType?: string[];
    location?: string[];
    priceRange?: { min: number; max: number };
    bedrooms?: { min: number; max: number };
  };
}

interface UpdateLeadArgs {
  leadId?: string;
  clientPhone?: string; // Alternativa se não tiver leadId
  updates: {
    name?: string;
    email?: string;
    status?: string;
    score?: number;
    temperature?: 'cold' | 'warm' | 'hot';
    clientId?: string; // Para linkar com cliente criado
    preferences?: {
      propertyType?: string[];
      location?: string[];
      priceRange?: { min: number; max: number };
      bedrooms?: { min: number; max: number };
      amenities?: string[];
    };
    tags?: string[];
    notes?: string;
  };
}

// ===== NOVAS INTERFACES CRÍTICAS =====

interface CancelReservationArgs {
  reservationId?: string;
  clientPhone?: string; // Para buscar reserva pelo telefone
  reason?: string;
  refundAmount?: number;
  refundPercentage?: number;
}

interface ModifyReservationArgs {
  reservationId?: string;
  clientPhone?: string;
  updates: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    totalPrice?: number;
    status?: ReservationStatus;
    notes?: string;
  };
}

interface GetPoliciesArgs {
  policyType?: 'cancellation' | 'payment' | 'check_in' | 'general' | 'all';
  propertyId?: string; // Para políticas específicas da propriedade
}

// Interface duplicada removida - usando a primeira definição atualizada

interface CreateTaskArgs {
  leadId?: string;
  clientId?: string;
  title: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'document' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string; // ISO date string
  reminderDate?: string;
  assignedTo?: string; // User ID, defaults to system user
  notes?: string;
}

interface UpdateTaskArgs {
  taskId: string;
  updates: {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
    outcome?: string;
    completedAt?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// ===== INTERFACES ANALYTICS & GOALS =====

interface GenerateReportArgs {
  reportType: 'financial' | 'crm' | 'properties' | 'occupancy' | 'custom';
  period: {
    startDate: string; // ISO date
    endDate: string;   // ISO date
  };
  metrics?: string[]; // Métricas específicas a incluir
  format?: 'summary' | 'detailed' | 'insights';
  includeComparison?: boolean; // Comparar com período anterior
  includeForecasting?: boolean; // Incluir projeções
}

interface TrackMetricsArgs {
  metricType: 'revenue' | 'occupancy' | 'conversion' | 'lead_score' | 'customer_satisfaction';
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  includeGrowth?: boolean;
  includeTrends?: boolean;
  clientPhone?: string; // Para métricas específicas de cliente
}

interface CreateGoalArgs {
  name: string;
  description?: string;
  type: 'revenue' | 'occupancy' | 'bookings' | 'average_ticket' | 'customer_acquisition';
  targetValue: number;
  period: {
    startDate: string;
    endDate: string;
  };
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  notifications?: boolean;
}

interface UpdateGoalProgressArgs {
  goalId?: string;
  goalName?: string; // Alternativa para buscar por nome
  currentValue?: number; // Atualizar valor atual
  addProgress?: number;  // Adicionar ao progresso atual
  notes?: string;
  milestone?: {
    name: string;
    achieved: boolean;
    date?: string;
  };
}

interface AnalyzePerformanceArgs {
  analysisType: 'properties' | 'financial' | 'crm' | 'overall';
  period: {
    startDate: string;
    endDate: string;
  };
  includeRecommendations?: boolean;
  includeAiInsights?: boolean;
  compareWithPrevious?: boolean;
}

// ===== TICKET FUNCTION INTERFACES =====

interface CreateSupportTicketArgs {
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  type?: 'support' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'question';
  clientPhone?: string; // Para identificar o usuário
  userEmail?: string;
  userName?: string;
}

interface GetUserTicketsArgs {
  clientPhone?: string;
  limit?: number;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
}

// ===== CRM ADVANCED FUNCTION INTERFACES =====

interface AnalyzeLeadBehaviorArgs {
  clientPhone?: string;
  leadId?: string;
  includeAIPredictions?: boolean;
}

interface UpdateLeadTemperatureArgs {
  clientPhone?: string;
  leadId?: string;
  temperature: 'cold' | 'warm' | 'hot';
  reason?: string;
}

interface PredictConversionArgs {
  clientPhone?: string;
  leadId?: string;
  includeRecommendations?: boolean;
}

interface SegmentCustomersArgs {
  segmentType: 'behavior' | 'value' | 'lifecycle' | 'geographic' | 'demographic';
  criteria?: {
    minScore?: number;
    maxScore?: number;
    sources?: string[];
    ageRange?: { min: number; max: number };
    valueRange?: { min: number; max: number };
  };
}

interface GenerateInsightsArgs {
  type: 'lead_performance' | 'conversion_trends' | 'source_analysis' | 'pipeline_health' | 'predictive_analytics';
  period?: '7d' | '30d' | '90d' | '6m' | '1y';
  includeAI?: boolean;
}

// ===== IMPORTS ADICIONAIS =====
import { Lead, LeadStatus, InteractionType } from '@/lib/types/crm';
import { FinancialMovement, CreateFinancialMovementInput } from '@/lib/types/financial-movement';
import { FinancialGoal, GoalType, GoalCategory, GoalMetric, GoalStatus } from '@/lib/types/financial';
import { Transaction } from '@/lib/types';
import { startOfDay, endOfDay, subDays, subWeeks, subMonths, format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ===== FUNÇÕES ESSENCIAIS MULTI-TENANT =====

/**
 * FUNÇÃO 1: Buscar propriedades usando estrutura tenant
 */
export async function searchProperties(args: SearchPropertiesArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🔍 [TenantAgent] search_properties iniciada', {
      tenantId,
      filters: {
        location: args.location,
        guests: args.guests,
        bedrooms: args.bedrooms,
        maxPrice: args.maxPrice,
        propertyType: args.propertyType,
        checkIn: args.checkIn,
        checkOut: args.checkOut
      }
    });

    // Verificar cache primeiro
    const cachedProperties = propertyCache.get(tenantId, args);
    if (cachedProperties) {
      logger.info('✅ [TenantAgent] Propriedades obtidas do cache', {
        tenantId,
        count: cachedProperties.length,
        cacheStats: propertyCache.getStats()
      });
      
      // Retornar do cache (economiza 200-500ms)
      return {
        success: true,
        properties: cachedProperties.slice(0, 10), // Limitar a 10 resultados
        totalFound: cachedProperties.length,
        fromCache: true,
        message: cachedProperties.length > 0 
          ? `Encontrei ${cachedProperties.length} propriedades disponíveis!` 
          : 'Não encontrei propriedades com esses critérios.',
        tenantId
      };
    }

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    
    // Buscar todas as propriedades ativas
    const allProperties = await propertyService.getMany([
      { field: 'isActive', operator: '==', value: true }
    ]) as Property[];

    let filteredProperties = allProperties;

    // Aplicar filtros
    if (args.location) {
      const location = args.location.toLowerCase();
      
      logger.info('🎯 [TenantAgent] Aplicando filtro de localização (com campo location concatenado)', {
        tenantId,
        searchTerm: location,
        propertiesBeforeFilter: filteredProperties.length
      });
      
      filteredProperties = filteredProperties.filter(property => {
        // ✅ NOVA ABORDAGEM: Use o campo location concatenado primeiro (mais eficiente)
        if (property.location) {
          const matchLocation = property.location.toLowerCase().includes(location);
          if (matchLocation) {
            logger.debug('📍 [TenantAgent] Match encontrado via campo location', {
              propertyId: property.id,
              searchTerm: location,
              locationField: property.location.substring(0, 100) + '...'
            });
            return true;
          }
        }
        
        // ✅ FALLBACK: Busca nos campos individuais para propriedades antigas
        const matchCity = property.city?.toLowerCase().includes(location);
        const matchNeighborhood = property.neighborhood?.toLowerCase().includes(location);
        const matchAddress = property.address?.toLowerCase().includes(location);
        const matchDescription = property.description?.toLowerCase().includes(location);
        
        const matches = matchCity || matchNeighborhood || matchAddress || matchDescription;
        
        if (matches) {
          logger.info('✅ [TenantAgent] Propriedade encontrada por localização', {
            tenantId,
            propertyTitle: property.title,
            matchedBy: {
              city: matchCity ? property.city : null,
              neighborhood: matchNeighborhood ? property.neighborhood : null,
              address: matchAddress ? property.address?.substring(0, 50) : null,
              description: matchDescription ? property.description?.substring(0, 100) : null
            }
          });
        }
        
        return matches;
      });
      
      logger.info('📊 [TenantAgent] Filtro de localização aplicado', {
        tenantId,
        searchTerm: location,
        propertiesAfterFilter: filteredProperties.length
      });
    }

    if (args.guests) {
      filteredProperties = filteredProperties.filter(property => 
        (property.maxGuests || 0) >= args.guests!
      );
    }

    if (args.bedrooms) {
      filteredProperties = filteredProperties.filter(property => 
        (property.bedrooms || 0) >= args.bedrooms!
      );
    }

    if (args.maxPrice) {
      filteredProperties = filteredProperties.filter(property => 
        (property.basePrice || 0) <= args.maxPrice!
      );
    }

    if (args.propertyType) {
      const type = args.propertyType.toLowerCase();
      filteredProperties = filteredProperties.filter(property => 
        property.category?.toLowerCase().includes(type)
      );
    }

    // Limitar resultados para não sobrecarregar
    const limitedProperties = filteredProperties.slice(0, 5);
    
    // Armazenar no cache para próximas buscas (TTL de 5 minutos)
    if (filteredProperties.length > 0) {
      propertyCache.set(tenantId, args, filteredProperties);
      logger.debug('💾 [TenantAgent] Propriedades armazenadas no cache', {
        tenantId,
        count: filteredProperties.length,
        ttl: '5 minutos'
      });
    }

    logger.info('✅ [TenantAgent] search_properties concluída', {
      tenantId,
      totalProperties: allProperties.length,
      filteredCount: filteredProperties.length,
      returnedCount: limitedProperties.length,
      cacheStats: propertyCache.getStats()
    });

    return {
      success: true,
      properties: limitedProperties.map(p => ({
        id: p.id,
        name: p.title, // Property interface usa 'title', não 'name'
        location: `${p.neighborhood || ''}, ${p.city || ''}`.replace(/^, |, $/, ''),
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        pricePerNight: p.basePrice || 0, // Corrigir para pricePerNight na resposta
        basePrice: p.basePrice || 0, // Manter basePrice também
        amenities: p.amenities?.slice(0, 5) || [],
        description: p.description?.substring(0, 200) || '',
        images: p.photos?.slice(0, 3).map(photo => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption
        })) || [] // Property interface usa 'photos', não 'images'
      })),
      totalFound: filteredProperties.length,
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em search_properties', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao buscar propriedades',
      properties: [],
      totalFound: 0,
      tenantId
    };
  }
}

/**
 * FUNÇÃO 2: Calcular preço usando dados tenant-specific
 */
export async function calculatePrice(args: CalculatePriceArgs, tenantId: string): Promise<any> {
  try {
    // Importar ConversationStateManager para acessar contexto
    const { default: ConversationStateManager } = await import('@/lib/ai-agent/conversation-state');
    
    // Se não tem datas, tentar pegar do contexto
    let checkIn = args.checkIn;
    let checkOut = args.checkOut;
    let guests = args.guests;
    
    if ((!checkIn || !checkOut || !guests) && args.clientPhone) {
      // Buscar do contexto usando o clientPhone correto
      const state = ConversationStateManager.getState(args.clientPhone, tenantId);
      if (state.searchCriteria) {
        checkIn = checkIn || state.searchCriteria.checkIn || new Date().toISOString().split('T')[0];
        checkOut = checkOut || state.searchCriteria.checkOut || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        guests = guests || state.searchCriteria.guests || 2;
      } else if (state.lastPriceCalculation) {
        // Usar dados do último cálculo de preço se disponível
        checkIn = checkIn || state.lastPriceCalculation.checkIn;
        checkOut = checkOut || state.lastPriceCalculation.checkOut;
        guests = guests || 2;
      }
    }
    
    // Fallback para valores padrão se ainda não tem dados
    if (!checkIn) checkIn = new Date().toISOString().split('T')[0];
    if (!checkOut) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      checkOut = tomorrow.toISOString().split('T')[0];
    }
    if (!guests) guests = 2;
    
    logger.info('💰 [TenantAgent] calculate_price iniciada', {
      tenantId,
      propertyName: args.propertyName,
      checkIn,
      checkOut,
      guests,
      fromContext: !args.checkIn || !args.checkOut || !args.guests
    });

    // 🔍 BUSCAR PROPRIEDADE POR NOME
    const property = await findPropertyByName(args.propertyName, tenantId);

    if (!property) {
      logger.error('❌ [TenantAgent] Propriedade não encontrada', {
        tenantId,
        propertyName: args.propertyName
      });

      return {
        success: false,
        error: `Propriedade "${args.propertyName}" não encontrada. Verifique o nome ou faça uma nova busca.`,
        tenantId
      };
    }

    logger.info('✅ [TenantAgent] Propriedade encontrada para cálculo', {
      tenantId,
      searchName: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id,
      hasBasePrice: !!property.basePrice
    });

    // Calcular preço usando preços dinâmicos (fim de semana, feriados, customizados)
    // Corrigir timezone para manter a data local
    const checkInDate = new Date(checkIn + 'T12:00:00-03:00');
    const checkOutDate = new Date(checkOut + 'T12:00:00-03:00');
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Verificar se número de hóspedes excede a capacidade
    const capacity = property.capacity || property.maxGuests || 2;
    const extraGuestFee = guests > capacity ? 
      (guests - capacity) * (property.pricePerExtraGuest || 0) * nights : 0;
    
    // CÁLCULO CORRETO: usar preços dinâmicos dia a dia
    const dailyBreakdown = [];
    let subtotal = 0;
    let weekendSurcharge = 0;
    let holidaySurcharge = 0;
    let customPricingSurcharge = 0;
    
    const currentDate = new Date(checkIn);
    
    for (let i = 0; i < nights; i++) {
      const dayPrice = calculateDayPrice(property, currentDate);
      dailyBreakdown.push({
        date: new Date(currentDate),
        basePrice: property.basePrice || 0,
        finalPrice: dayPrice.finalPrice,
        reason: dayPrice.reason
      });
      
      subtotal += dayPrice.finalPrice;
      
      // Registrar sobretaxas para breakdown
      if (dayPrice.isWeekend && !dayPrice.isHoliday) {
        weekendSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
      }
      
      if (dayPrice.isHoliday) {
        holidaySurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
      }
      
      if (dayPrice.reason === 'Preço customizado') {
        customPricingSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const cleaningFee = property.cleaningFee || 0;
    const serviceFee = Math.round((subtotal + extraGuestFee) * 0.1); // 10% sobre subtotal + hóspedes extras
    const totalPrice = subtotal + extraGuestFee + cleaningFee + serviceFee;

    logger.info('✅ [TenantAgent] calculate_price concluída', {
      tenantId,
      propertyName: args.propertyName,
      foundProperty: property.title,
      nights,
      totalPrice
    });

    return {
      success: true,
      property: {
        id: property.id,
        name: property.title, // Property interface usa 'title', não 'name'
        location: `${property.neighborhood || ''}, ${property.city || ''}`.replace(/^, |, $/, '')
      },
      pricing: {
        basePrice: property.basePrice || 0,
        nights,
        subtotal,
        extraGuestFee,
        cleaningFee,
        serviceFee,
        totalPrice,
        guests,
        capacity,
        extraGuests: guests > capacity ? guests - capacity : 0,
        surcharges: {
          weekend: weekendSurcharge,
          holiday: holidaySurcharge,
          customPricing: customPricingSurcharge
        },
        dailyBreakdown,
        averagePricePerNight: Math.round(subtotal / nights)
      },
      dates: {
        checkIn,
        checkOut
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em calculate_price', {
      tenantId,
      propertyName: args.propertyName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao calcular preço',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 3: Criar reserva na estrutura tenant
 */
export async function createReservation(args: CreateReservationArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📝 [TenantAgent] create_reservation iniciada', {
      tenantId,
      propertyName: args.propertyName,
      clientPhone: args.clientPhone?.substring(0, 6) + '***',
      guests: args.guests
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const clientService = serviceFactory.clients;
    const reservationService = serviceFactory.reservations;

    // 🔍 BUSCAR PROPRIEDADE POR NOME
    const property = await findPropertyByName(args.propertyName, tenantId);
    if (!property) {
      logger.error('❌ [TenantAgent] Propriedade não encontrada para reserva', {
        tenantId,
        propertyName: args.propertyName
      });

      return {
        success: false,
        error: `Propriedade "${args.propertyName}" não encontrada. Verifique o nome ou faça uma nova busca.`,
        tenantId
      };
    }

    // Resolver ou criar cliente
    let clientId = args.clientId;
    
    if (!clientId && (args.clientPhone || args.clientEmail)) {
      // Tentar encontrar cliente existente por telefone
      if (args.clientPhone) {
        const existingClients = await clientService.getMany([
          { field: 'phone', operator: '==', value: args.clientPhone }
        ]) as Client[];
        
        if (existingClients.length > 0) {
          clientId = existingClients[0].id!;
          logger.info('✅ [TenantAgent] Cliente existente encontrado', { tenantId, clientId });
        }
      }
      
      // Criar novo cliente se não encontrou
      if (!clientId) {
        const newClientData = {
          name: args.clientName || 'Cliente WhatsApp',
          phone: args.clientPhone || '',
          email: args.clientEmail,
          document: '',
          documentType: 'cpf' as const,
          whatsappNumber: args.clientPhone,
          
          // Campos obrigatórios da interface Client
          preferences: {
            preferredPaymentMethod: 'pix' as const,
            petOwner: false,
            smoker: false,
            communicationPreference: 'whatsapp' as const,
            marketingOptIn: true
          },
          totalReservations: 0,
          totalSpent: 0,
          averageRating: 0,
          lifetimeValue: 0,
          whatsappConversations: [],
          customerSegment: 'new' as const,
          acquisitionSource: 'whatsapp' as const,
          isActive: true,
          isVip: false,
          tags: [],
          notes: '',
          reviews: [],
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        clientId = await clientService.create(newClientData);
        logger.info('✅ [TenantAgent] Novo cliente criado', { tenantId, clientId });
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Cliente não identificado',
        tenantId
      };
    }

    // Validar datas - Corrigir timezone para manter a data local
    // Usar formato ISO com timezone local para evitar conversão UTC
    const checkInDate = new Date(args.checkIn + 'T12:00:00-03:00');
    const checkOutDate = new Date(args.checkOut + 'T12:00:00-03:00');
    
    if (checkInDate >= checkOutDate) {
      return {
        success: false,
        error: 'Data de check-out deve ser após o check-in',
        tenantId
      };
    }
    
    if (checkInDate < new Date()) {
      return {
        success: false,
        error: 'Data de check-in não pode ser no passado',
        tenantId
      };
    }
    
    // Validar número de hóspedes
    if (args.guests > property.maxGuests) {
      return {
        success: false,
        error: `Máximo de ${property.maxGuests} hóspedes para esta propriedade`,
        tenantId
      };
    }

    // Calcular preço se não foi fornecido
    let totalPrice = args.totalPrice;
    if (!totalPrice && property.basePrice) {
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      totalPrice = property.basePrice * nights + (property.cleaningFee || 0);
    }

    // Criar reserva com todos os campos obrigatórios da interface
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const reservationData: Omit<Reservation, 'id'> = {
      propertyId: property.id!, // Usar ID da propriedade encontrada
      clientId,
      status: ReservationStatus.PENDING,
      
      // Datas
      checkIn: checkInDate,
      checkOut: checkOutDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Hóspedes
      guests: args.guests,
      guestDetails: [], // Lista vazia inicialmente
      
      // Financeiro
      totalAmount: totalPrice || 0,
      paidAmount: 0, // Ainda não foi pago
      pendingAmount: totalPrice || 0, // Todo o valor está pendente
      paymentMethod: PaymentMethod.PIX, // Padrão
      paymentPlan: {
        totalAmount: totalPrice || 0,
        installments: [{
          number: 1,
          amount: totalPrice || 0,
          dueDate: new Date(),
          description: 'Pagamento único',
          isPaid: false
        }],
        paymentMethod: PaymentMethod.PIX,
        feePercentage: 0,
        totalFees: 0,
        description: 'Pagamento à vista'
      }, // Pagamento à vista por padrão
      payments: [], // Nenhum pagamento ainda
      
      // Analytics
      nights,
      paymentStatus: PaymentStatus.PENDING,
      
      // Extras
      extraServices: [],
      specialRequests: '',
      observations: '',
      
      // Origem
      source: ReservationSource.WHATSAPP_AI,
      agentId: 'sofia-ai',
      
      // Metadados
      tenantId
    };

    const reservationId = await reservationService.create(reservationData);

    logger.info('✅ [TenantAgent] create_reservation concluída', {
      tenantId,
      reservationId,
      propertyName: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id,
      clientId
    });

    return {
      success: true,
      reservation: {
        id: reservationId,
        propertyId: property.id!,
        propertyName: property.title, // Property interface usa 'title'
        clientId,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        guests: args.guests,
        totalAmount: totalPrice || 0,
        nights,
        status: 'pending'
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em create_reservation', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao criar reserva',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 4: Registrar cliente na estrutura tenant
 */
export async function registerClient(args: RegisterClientArgs, tenantId: string): Promise<any> {
  try {
    logger.info('👤 [TenantAgent] register_client iniciada', {
      tenantId,
      clientName: args.name,
      hasPhone: !!args.phone,
      hasEmail: !!args.email
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const clientService = serviceFactory.clients;
    
    // Verificar se cliente já existe (deduplicação)
    let existingClient = null;
    if (args.phone) {
      const existingClients = await clientService.getMany([
        { field: 'phone', operator: '==', value: args.phone }
      ]) as Client[];
      
      if (existingClients.length > 0) {
        existingClient = existingClients[0];
      }
    }

    if (existingClient) {
      // Atualizar cliente existente
      await clientService.update(existingClient.id!, {
        name: args.name,
        email: args.email || existingClient.email,
        document: args.document || existingClient.document,
        whatsappNumber: args.whatsappNumber || args.phone || existingClient.whatsappNumber
      });

      logger.info('✅ [TenantAgent] Cliente existente atualizado', {
        tenantId,
        clientId: existingClient.id
      });
      
      // Verificar se já existe um lead para este cliente e atualizar
      const leadService = serviceFactory.leads;
      const existingLeads = await leadService.getMany([
        { field: 'phone', operator: '==', value: args.phone }
      ]);
      
      if (existingLeads.length > 0) {
        // Atualizar lead existente com score dinâmico
        const existingLead = existingLeads[0];
        
        // Calcular novo score baseado em informações atualizadas
        const scoringFactors = {
          messagesExchanged: existingLead.interactions?.length || 5,
          hasPhone: !!args.phone,
          hasEmail: !!args.email || !!existingLead.email,
          hasDocument: !!args.document,
          source: existingLead.source || 'whatsapp_ai' as const,
          returningClient: true // Cliente retornando
        };
        
        const scoreResult = leadScoringService.calculateScore(scoringFactors);
        
        await leadService.update(existingLead.id!, {
          clientId: existingClient.id,
          name: args.name,
          email: args.email || existingLead.email,
          score: scoreResult.score,
          temperature: scoreResult.temperature
        });
        
        logger.info('📈 [TenantAgent] Lead score atualizado', {
          leadId: existingLead.id,
          oldScore: existingLead.score,
          newScore: scoreResult.score,
          temperature: scoreResult.temperature
        });
      }

      return {
        success: true,
        client: {
          id: existingClient.id,
          name: args.name,
          phone: args.phone,
          email: args.email,
          isNew: false
        },
        message: 'Cliente já existia, dados atualizados.',
        tenantId
      };
    } else {
      // Criar novo cliente com campos obrigatórios da interface Client
      const clientData = {
        name: args.name,
        phone: args.phone || '',
        email: args.email,
        document: args.document || '',
        documentType: 'cpf' as const,
        whatsappNumber: args.whatsappNumber || args.phone,
        
        // Campos obrigatórios da interface Client
        preferences: {
          preferredPaymentMethod: 'pix' as const,
          petOwner: false,
          smoker: false,
          communicationPreference: 'whatsapp' as const,
          marketingOptIn: true
        },
        totalReservations: 0,
        totalSpent: 0,
        averageRating: 0,
        lifetimeValue: 0,
        whatsappConversations: [],
        customerSegment: 'new' as const,
        acquisitionSource: 'whatsapp' as const,
        isActive: true,
        isVip: false,
        tags: [],
        notes: '',
        reviews: [],
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const clientId = await clientService.create(clientData);

      logger.info('✅ [TenantAgent] Novo cliente registrado', {
        tenantId,
        clientId
      });
      
      // Criar lead automaticamente no CRM
      try {
        const leadService = serviceFactory.leads;
        
        // Calcular score dinâmico para o novo lead
        const scoringFactors = {
          messagesExchanged: 3, // Assumindo que houve pelo menos 3 mensagens para chegar ao registro
          hasPhone: !!args.phone,
          hasEmail: !!args.email,
          hasDocument: !!args.document,
          source: 'whatsapp_ai' as const,
          budgetDefined: false, // Será atualizado se tiver contexto
          checkInDateDefined: false, // Será atualizado se tiver contexto
          guestsCountDefined: false // Será atualizado se tiver contexto
        };
        
        const scoreResult = leadScoringService.calculateScore(scoringFactors);
        
        const leadData = {
          name: args.name,
          phone: args.phone || '',
          whatsappNumber: args.whatsappNumber || args.phone || '',
          email: args.email,
          source: 'whatsapp_ai' as const,
          sourceDetails: 'Cadastrado automaticamente pela Sofia durante conversa no WhatsApp',
          status: 'new' as const,
          temperature: scoreResult.temperature,
          score: scoreResult.score,
          clientId: clientId,
          assignedTo: '',
          preferences: {
            propertyType: [],
            location: [],
            priceRange: { min: 0, max: 0 },
            bedrooms: { min: 0, max: 0 }
          },
          interactions: [],
          tasks: [],
          notes: `Lead criado automaticamente quando cliente foi registrado pela Sofia. ${scoreResult.insights.join('. ')}`,
          tags: ['sofia-registered', 'whatsapp', scoreResult.temperature],
          tenantId
        };
        
        const leadId = await leadService.create(leadData);
        
        logger.info('📋 [TenantAgent] Lead criado automaticamente no CRM', {
          tenantId,
          clientId,
          leadId
        });
      } catch (leadError) {
        // Não falhar a operação se não conseguir criar o lead
        logger.warn('⚠️ [TenantAgent] Não foi possível criar lead no CRM', {
          tenantId,
          clientId,
          error: leadError instanceof Error ? leadError.message : 'Unknown error'
        });
      }

      return {
        success: true,
        client: {
          id: clientId,
          name: args.name,
          phone: args.phone,
          email: args.email,
          isNew: true
        },
        message: 'Cliente registrado com sucesso!',
        tenantId
      };
    }
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em register_client', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao registrar cliente',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 5: Obter detalhes completos de uma propriedade
 */
export async function getPropertyDetails(args: GetPropertyDetailsArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🏠 [TenantAgent] get_property_details iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyName: args.propertyName,
      propertyIndex: args.propertyIndex,
      propertyReference: args.propertyReference,
      argsReceived: JSON.stringify(args),
      argsType: typeof args
    });

    // 🔍 VALIDAR ENTRADA
    if (!args.propertyName || typeof args.propertyName !== 'string') {
      return {
        success: false,
        error: 'PropertyName é obrigatório e deve ser uma string',
        receivedArgs: args,
        tenantId
      };
    }

    // 🔍 BUSCAR PROPRIEDADE POR NOME (obrigatório)
    const property = await findPropertyByName(args.propertyName, tenantId);

    if (!property) {
      logger.warn('⚠️ [TenantAgent] Propriedade não encontrada', {
        tenantId,
        searchArgs: args
      });

      const errorMessage = `Propriedade "${args.propertyName}" não encontrada. Verifique o nome e tente novamente.`;

      return {
        success: false,
        error: errorMessage,
        tenantId
      };
    }

    logger.info('✅ [TenantAgent] get_property_details concluída', {
      tenantId: tenantId.substring(0, 8) + '***',
      searchTerm: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id
    });

    // Retornar detalhes completos formatados
    return {
      success: true,
      property: {
        id: property.id,
        name: property.title, // Property interface usa 'title'
        type: property.category, // Property interface usa 'category'
        description: property.description,
        // Localização
        location: {
          address: property.address,
          neighborhood: property.neighborhood,
          city: property.city,
        },
        // Especificações
        specs: {
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          maxGuests: property.maxGuests
        },
        // Comodidades
        amenities: property.amenities || [],
        // Regras
        rules: {
          petsAllowed: property.allowsPets || false,
          minimumNights: property.minimumNights || 1
        },
        // Preços
        pricing: {
          basePrice: property.basePrice || 0, // Property interface tem basePrice direto
          cleaningFee: property.cleaningFee || 0, // Property interface tem cleaningFee direto
          pricePerExtraGuest: property.pricePerExtraGuest || 0
        },
        // Mídia
        media: {
          photos: property.photos?.length || 0, // Property interface usa 'photos'
          mainPhoto: property.photos?.[0],
          videos: property.videos?.length || 0
        },
        // Status
        availability: {
          isActive: property.isActive,
          isFeatured: property.isFeatured || false
        }
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em get_property_details', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao buscar detalhes da propriedade',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 6: Enviar mídia (fotos/vídeos) da propriedade
 */
export async function sendPropertyMedia(args: SendPropertyMediaArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📸 [TenantAgent] send_property_media iniciada', {
      tenantId,
      propertyName: args.propertyName,
      propertyIndex: args.propertyIndex,
      mediaType: args.mediaType || 'photos'
    });

    let property: Property | null = null;

    // 🔍 BUSCAR POR NOME (prioridade)
    if (args.propertyName) {
      property = await findPropertyByName(args.propertyName, tenantId);
    }
    
    // Se não encontrou por nome e tem índice, buscar nas últimas propriedades
    if (!property && args.propertyIndex !== undefined) {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const propertyService = serviceFactory.properties;
      
      const recentProperties = await propertyService.getMany(
        [{ field: 'isActive', operator: '==', value: true }],
        { limit: 10, orderBy: { field: 'updatedAt', direction: 'desc' } }
      ) as Property[];
      
      if (args.propertyIndex >= 0 && args.propertyIndex < recentProperties.length) {
        property = recentProperties[args.propertyIndex];
      }
    }

    if (!property) {
      logger.warn('⚠️ [TenantAgent] Propriedade não encontrada para mídia', {
        tenantId,
        searchArgs: args
      });

      const errorMessage = args.propertyName 
        ? `Propriedade "${args.propertyName}" não encontrada. Verifique o nome ou faça uma nova busca.`
        : 'Propriedade não encontrada. Qual propriedade você gostaria de ver as fotos?';

      return {
        success: false,
        error: errorMessage,
        tenantId
      };
    }

    const mediaType = args.mediaType || 'photos';
    const photos = property.photos || [];
    const videos = property.videos || [];

    // 🔍 DEBUG: Log media structure for debugging
    logger.info('🔍 [TenantAgent] Media structure debug', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyId: property.id,
      propertyTitle: property.title,
      photosCount: photos.length,
      photosType: photos.length > 0 ? typeof photos[0] : 'empty',
      photosFirst: photos.length > 0 ? (typeof photos[0] === 'string' ? photos[0] : 'object') : 'none',
      videosCount: videos.length,
      videosType: videos.length > 0 ? typeof videos[0] : 'empty',
      videosFirst: videos.length > 0 ? (typeof videos[0] === 'string' ? videos[0] : 'object') : 'none'
    });

    let mediaToSend: any[] = [];
    let mediaDescription = '';

    if (mediaType === 'photos' || mediaType === 'all') {
      // ✅ Handle both new string[] format and legacy PropertyPhoto[] format
      const photoUrls = photos.map(photo => {
        if (typeof photo === 'string') {
          // New format: direct URL strings
          return { type: 'photo', url: photo, caption: '' };
        } else if (photo && typeof photo === 'object' && 'url' in photo) {
          // Legacy format: PropertyPhoto objects
          return { type: 'photo', url: (photo as any).url, caption: (photo as any).caption || '' };
        } else {
          return null;
        }
      }).filter(Boolean); // Remove null entries
      
      mediaToSend.push(...photoUrls);
      mediaDescription = `${photos.length} foto(s)`;
    }

    if (mediaType === 'videos' || mediaType === 'all') {
      // ✅ Handle both new string[] format and legacy PropertyVideo[] format  
      const videoUrls = videos.map(video => {
        if (typeof video === 'string') {
          // New format: direct URL strings
          return { type: 'video', url: video, title: '' };
        } else if (video && typeof video === 'object' && 'url' in video) {
          // Legacy format: PropertyVideo objects
          return { type: 'video', url: (video as any).url, title: (video as any).title || '' };
        } else {
          return null;
        }
      }).filter(Boolean); // Remove null entries
      
      mediaToSend.push(...videoUrls);
      mediaDescription += mediaDescription ? ` e ${videos.length} vídeo(s)` : `${videos.length} vídeo(s)`;
    }

    if (mediaToSend.length === 0) {
      return {
        success: false,
        error: `Desculpe, não há ${mediaType === 'videos' ? 'vídeos' : 'fotos'} disponíveis para ${property.title} no momento.`,
        tenantId
      };
    }

    logger.info('✅ [TenantAgent] send_property_media concluída', {
      tenantId,
      searchTerm: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id,
      mediaCount: mediaToSend.length,
      mediaType
    });

    return {
      success: true,
      property: {
        id: property.id,
        name: property.title,
        location: `${property.neighborhood}, ${property.city}`
      },
      media: mediaToSend.slice(0, 10), // Limitar a 10 mídias por vez
      totalMedia: mediaToSend.length,
      mediaDescription,
      caption: `📸 ${property.title} - ${mediaDescription}\n📍 ${property.neighborhood}, ${property.city}\n💰 A partir de R$ ${property.basePrice || 0}/noite`,
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em send_property_media', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao buscar mídia da propriedade',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 7: Verificar disponibilidade para visitas
 */
export async function checkVisitAvailability(args: { visitDate: string; propertyId?: string }, tenantId: string): Promise<any> {
  try {
    logger.info('🕐 [TenantAgent] check_visit_availability iniciada', {
      tenantId,
      visitDate: args.visitDate,
      propertyId: args.propertyId
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const visitService = serviceFactory.visits;
    
    const requestedDate = new Date(args.visitDate);
    
    // Verificar se a data é futura
    if (requestedDate <= new Date()) {
      return {
        success: false,
        error: 'Por favor, escolha uma data futura para a visita.',
        tenantId
      };
    }
    
    // Buscar visitas já agendadas na data
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingVisits = await visitService.getMany([
      { field: 'scheduledDate', operator: '>=', value: startOfDay },
      { field: 'scheduledDate', operator: '<=', value: endOfDay },
      { field: 'status', operator: '!=', value: 'cancelled_by_client' },
      { field: 'status', operator: '!=', value: 'cancelled_by_agent' }
    ]) as VisitAppointment[];

    // Definir horários de funcionamento (9h às 18h)
    const workingHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '16:30', '17:00', '17:30', '18:00'];
    
    // Filtrar horários já ocupados
    const occupiedTimes = existingVisits.map(visit => visit.scheduledTime);
    const availableTimes = workingHours.filter(time => !occupiedTimes.includes(time));
    
    logger.info('✅ [TenantAgent] check_visit_availability concluída', {
      tenantId,
      visitDate: args.visitDate,
      totalSlots: workingHours.length,
      occupiedSlots: occupiedTimes.length,
      availableSlots: availableTimes.length
    });

    return {
      success: true,
      date: args.visitDate,
      availableTimes,
      occupiedTimes,
      totalAvailable: availableTimes.length,
      workingDay: availableTimes.length > 0,
      suggestedTimes: availableTimes.slice(0, 3), // Top 3 sugestões
      tenantId
    };

  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em check_visit_availability', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao verificar disponibilidade. Por favor, tente novamente.',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 8: Agendar visita à propriedade
 */
export async function scheduleVisit(args: ScheduleVisitArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📅 [TenantAgent] schedule_visit iniciada', {
      tenantId,
      propertyId: args.propertyId,
      visitDate: args.visitDate,
      visitTime: args.visitTime,
      clientPhone: args.clientPhone?.substring(0, 6) + '***'
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    const clientService = serviceFactory.clients;
    const visitService = serviceFactory.visits;
    
    // Verificar se propriedade existe
    const property = await propertyService.get(args.propertyId) as Property;
    if (!property) {
      return {
        success: false,
        error: 'Propriedade não encontrada',
        tenantId
      };
    }

    // Resolver ou criar cliente
    let clientId = args.clientId;
    
    if (!clientId && (args.clientPhone || args.clientName)) {
      // Tentar encontrar cliente existente por telefone
      if (args.clientPhone) {
        const existingClients = await clientService.getMany([
          { field: 'phone', operator: '==', value: args.clientPhone }
        ]) as Client[];
        
        if (existingClients.length > 0) {
          clientId = existingClients[0].id!;
          logger.info('✅ [TenantAgent] Cliente existente encontrado para visita', { tenantId, clientId });
        }
      }
      
      // Criar novo cliente se não encontrou
      if (!clientId) {
        const newClientData = {
          name: args.clientName || 'Cliente WhatsApp',
          phone: args.clientPhone,
          whatsappNumber: args.clientPhone,
          tenantId
        };
        
        clientId = await clientService.create(newClientData);
        logger.info('✅ [TenantAgent] Novo cliente criado para visita', { tenantId, clientId });
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Cliente não identificado. Por favor, forneça seu nome ou telefone.',
        tenantId
      };
    }

    // Preparar data e hora da visita
    const visitDateTime = new Date(args.visitDate);
    if (args.visitTime) {
      const [hours, minutes] = args.visitTime.split(':');
      visitDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // Se não especificou hora, assumir 14:00
      visitDateTime.setHours(14, 0, 0, 0);
    }

    // Verificar se a data é futura
    if (visitDateTime <= new Date()) {
      return {
        success: false,
        error: 'Por favor, escolha uma data e hora futuras para a visita.',
        tenantId
      };
    }

    // Obter dados do cliente para preenchimento completo
    const client = await clientService.get(clientId) as Client;
    
    // Criar agendamento de visita
    const visitData: Omit<VisitAppointment, 'id'> = {
      tenantId,
      clientId,
      clientName: client?.name || args.clientName || 'Cliente WhatsApp',
      clientPhone: client?.phone || args.clientPhone || '',
      propertyId: args.propertyId,
      propertyName: property.title, // Property interface usa 'title'
      propertyAddress: `${property.address || ''}, ${property.neighborhood || ''}`.trim(),
      scheduledDate: visitDateTime,
      scheduledTime: args.visitTime || '14:00',
      duration: 60,
      status: VisitStatus.SCHEDULED, // VisitStatus enum value
      notes: args.notes || `Visita agendada via WhatsApp - ${property.title}`,
      source: 'whatsapp',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const visitId = await visitService.create(visitData);

    logger.info('✅ [TenantAgent] schedule_visit concluída', {
      tenantId,
      visitId,
      propertyId: args.propertyId,
      clientId,
      scheduledDate: visitDateTime.toISOString()
    });

    // Formatar data e hora para resposta
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const formattedDate = visitDateTime.toLocaleDateString('pt-BR', dateOptions);
    const formattedTime = visitDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return {
      success: true,
      visit: {
        id: visitId,
        propertyId: args.propertyId,
        propertyName: property.title, // Property interface usa 'title'
        propertyAddress: `${property.address || ''}, ${property.neighborhood || ''}`.trim(),
        clientId,
        scheduledDate: formattedDate,
        scheduledTime: formattedTime,
        status: VisitStatus.SCHEDULED
      },
      message: `Visita agendada com sucesso para ${formattedDate} às ${formattedTime}!`,
      instructions: 'Enviaremos uma confirmação com todos os detalhes por WhatsApp.',
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em schedule_visit', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao agendar visita. Por favor, tente novamente.',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 8: Classificar e categorizar lead baseado na interação
 */
export async function classifyLead(args: ClassifyLeadArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🎯 [TenantAgent] classify_lead iniciada', {
      tenantId,
      clientPhone: args.clientPhone?.substring(0, 6) + '***',
      interactionType: args.interactionType,
      sentiment: args.sentiment
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const clientService = serviceFactory.clients;
    const leadService = serviceFactory.leads;
    
    // Buscar cliente existente
    const existingClients = await clientService.getMany([
      { field: 'phone', operator: '==', value: args.clientPhone }
    ]) as Client[];
    
    let clientId: string;
    if (existingClients.length > 0) {
      clientId = existingClients[0].id!;
    } else {
      // Criar cliente básico se não existe
      const newClientData = {
        name: 'Cliente WhatsApp',
        phone: args.clientPhone,
        whatsappNumber: args.clientPhone,
        tenantId
      };
      clientId = await clientService.create(newClientData);
    }

    // Buscar lead existente ou criar novo
    const existingLeads = await leadService.getMany([
      { field: 'phone', operator: '==', value: args.clientPhone }
    ]) as Lead[];
    
    let lead: Lead;
    let isNewLead = false;
    
    if (existingLeads.length > 0) {
      lead = existingLeads[0];
    } else {
      // Criar novo lead
      isNewLead = true;
      const leadData = {
        tenantId,
        name: 'Cliente WhatsApp',
        phone: args.clientPhone,
        whatsappNumber: args.clientPhone,
        status: LeadStatus.NEW,
        source: 'whatsapp_ai' as any,
        score: 0,
        temperature: 'cold' as any,
        qualificationCriteria: {
          budget: false,
          authority: false,
          need: false,
          timeline: false
        },
        preferences: {},
        firstContactDate: new Date(),
        lastContactDate: new Date(),
        interactions: [],
        tags: [],
        notes: [],
        activities: [],
        metadata: {}
      };
      
      const leadId = await leadService.create(leadData);
      // Re-buscar o lead criado
      lead = await leadService.get(leadId) as Lead;
    }

    // Calcular novo score baseado na interação
    let scoreIncrease = 0;
    let newStatus = lead.status;
    let temperature = lead.temperature;
    
    switch (args.sentiment) {
      case 'positive':
        scoreIncrease += 15;
        if (lead.status === LeadStatus.NEW) newStatus = LeadStatus.CONTACTED;
        break;
      case 'neutral':
        scoreIncrease += 5;
        break;
      case 'negative':
        scoreIncrease -= 10;
        break;
    }
    
    switch (args.interactionType) {
      case 'property_inquiry':
        scoreIncrease += 20;
        newStatus = LeadStatus.QUALIFIED;
        break;
      case 'price_request':
        scoreIncrease += 25;
        newStatus = LeadStatus.OPPORTUNITY;
        break;
      case 'visit_request':
        scoreIncrease += 30;
        newStatus = LeadStatus.OPPORTUNITY;
        break;
      case 'reservation_intent':
        scoreIncrease += 35;
        newStatus = LeadStatus.NEGOTIATION;
        break;
    }
    
    if (args.budget && args.budget > 100) {
      scoreIncrease += 10;
    }
    
    const newScore = Math.min(100, Math.max(0, lead.score + scoreIncrease));
    
    // Atualizar temperatura baseada no score
    if (newScore >= 70) temperature = 'hot';
    else if (newScore >= 40) temperature = 'warm';
    else temperature = 'cold';

    // Atualizar critérios de qualificação
    const updatedQualification = { ...lead.qualificationCriteria };
    if (args.budget) updatedQualification.budget = true;
    if (args.timeline) updatedQualification.timeline = true;
    if (args.interactionType === 'property_inquiry') updatedQualification.need = true;
    
    // Atualizar lead
    const updateData = {
      status: newStatus,
      score: newScore,
      temperature,
      qualificationCriteria: updatedQualification,
      lastContactDate: new Date()
    };
    
    await leadService.update(lead.id!, updateData);

    logger.info('✅ [TenantAgent] classify_lead concluída', {
      tenantId,
      leadId: lead.id,
      isNewLead,
      oldScore: lead.score,
      newScore,
      oldStatus: lead.status,
      newStatus,
      temperature
    });

    return {
      success: true,
      lead: {
        id: lead.id,
        status: newStatus,
        score: newScore,
        temperature,
        isNewLead,
        qualification: updatedQualification
      },
      analysis: {
        scoreChange: scoreIncrease,
        statusChanged: lead.status !== newStatus,
        qualificationImproved: args.budget || args.timeline
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em classify_lead', {
      tenantId,
      clientPhone: args.clientPhone?.substring(0, 6) + '***',
      interactionType: args.interactionType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      success: false,
      error: 'Erro ao classificar lead',
      data: {
        clientPhone: args.clientPhone,
        interactionType: args.interactionType,
        processed: false,
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      },
      tenantId
    };
  }
}

/**
 * FUNÇÃO 9: Atualizar status do lead no CRM
 */
export async function updateLeadStatus(args: UpdateLeadStatusArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📊 [TenantAgent] update_lead_status iniciada', {
      tenantId,
      clientPhone: args.clientPhone?.substring(0, 6) + '***',
      newStatus: args.newStatus,
      reason: args.reason
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    
    // Buscar lead existente
    const existingLeads = await leadService.getMany([
      { field: 'phone', operator: '==', value: args.clientPhone }
    ]) as Lead[];
    
    if (existingLeads.length === 0) {
      return {
        success: false,
        error: 'Lead não encontrado. É necessário primeiro classificar o cliente.',
        tenantId
      };
    }
    
    const lead = existingLeads[0];
    const oldStatus = lead.status;
    
    // Validar se o novo status é válido
    const validStatuses = Object.values(LeadStatus);
    if (!validStatuses.includes(args.newStatus as LeadStatus)) {
      return {
        success: false,
        error: `Status inválido. Status válidos: ${validStatuses.join(', ')}`,
        tenantId
      };
    }
    
    // Ajustar score baseado no movimento no funil
    let scoreAdjustment = 0;
    const statusOrder = {
      [LeadStatus.NEW]: 1,
      [LeadStatus.CONTACTED]: 2,
      [LeadStatus.QUALIFIED]: 3,
      [LeadStatus.OPPORTUNITY]: 4,
      [LeadStatus.NEGOTIATION]: 5,
      [LeadStatus.WON]: 6,
      [LeadStatus.LOST]: 0,
      [LeadStatus.NURTURING]: 2
    };
    
    const oldOrder = statusOrder[oldStatus];
    const newOrder = statusOrder[args.newStatus as LeadStatus];
    
    if (newOrder > oldOrder) {
      scoreAdjustment = (newOrder - oldOrder) * 10; // Progredindo no funil
    } else if (newOrder < oldOrder && args.newStatus !== LeadStatus.LOST) {
      scoreAdjustment = (newOrder - oldOrder) * 5; // Retrocedendo
    }
    
    const newScore = Math.min(100, Math.max(0, lead.score + scoreAdjustment));
    
    // Atualizar temperatura baseada no novo status
    let temperature = lead.temperature;
    if (args.newStatus === LeadStatus.NEGOTIATION || args.newStatus === LeadStatus.OPPORTUNITY) {
      temperature = 'hot';
    } else if (args.newStatus === LeadStatus.QUALIFIED) {
      temperature = 'warm';
    } else if (args.newStatus === LeadStatus.LOST) {
      temperature = 'cold';
    }
    
    // Atualizar lead
    const updateData = {
      status: args.newStatus as LeadStatus,
      score: newScore,
      temperature,
      lastContactDate: new Date()
    };
    
    await leadService.update(lead.id!, updateData);

    logger.info('✅ [TenantAgent] update_lead_status concluída', {
      tenantId,
      leadId: lead.id,
      oldStatus,
      newStatus: args.newStatus,
      scoreChange: scoreAdjustment,
      newScore
    });

    return {
      success: true,
      lead: {
        id: lead.id,
        oldStatus,
        newStatus: args.newStatus,
        score: newScore,
        temperature,
        scoreChange: scoreAdjustment
      },
      message: `Lead movido de ${oldStatus} para ${args.newStatus} com sucesso!`,
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em update_lead_status', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao atualizar status do lead',
      tenantId
    };
  }
}

/**
 * FUNÇÃO 10: Gerar orçamento detalhado com preços dinâmicos
 */
export async function generateQuote(args: GenerateQuoteArgs, tenantId: string): Promise<any> {
  try {
    logger.info('💰 [TenantAgent] generate_quote iniciada', {
      tenantId,
      propertyId: args?.propertyId?.substring(0, 10) + '...',
      checkIn: args?.checkIn,
      checkOut: args?.checkOut,
      guests: args?.guests,
      paymentMethod: args?.paymentMethod,
      argsType: typeof args,
      argsIsNull: args === null,
      argsIsUndefined: args === undefined
    });

    logger.info('🏗️ [TenantAgent] Iniciando serviceFactory', { tenantId });
    const serviceFactory = new TenantServiceFactory(tenantId);
    logger.info('🏗️ [TenantAgent] ServiceFactory criado, criando propertyService', { tenantId });
    const propertyService = serviceFactory.properties;
    logger.info('🏗️ [TenantAgent] PropertyService criado', { tenantId });
    
    // Buscar propriedade
    logger.info('🔍 [TenantAgent] Buscando propriedade', { 
      tenantId, 
      propertyId: args.propertyId 
    });
    const property = await propertyService.get(args.propertyId) as Property;
    logger.info('🔍 [TenantAgent] Propriedade obtida', { 
      tenantId, 
      propertyId: args.propertyId,
      hasProperty: !!property,
      propertyName: property?.name
    });
    if (!property) {
      return {
        success: false,
        error: 'Propriedade não encontrada',
        tenantId
      };
    }

    // Validar datas
    const checkInDate = new Date(args.checkIn);
    const checkOutDate = new Date(args.checkOut);
    const now = new Date();
    
    if (checkInDate <= now) {
      return {
        success: false,
        error: 'Data de check-in deve ser futura',
        tenantId
      };
    }
    
    if (checkOutDate <= checkInDate) {
      return {
        success: false,
        error: 'Data de check-out deve ser após o check-in',
        tenantId
      };
    }

    // Calcular preços dinâmicos
    let quote;
    try {
      logger.info('🧮 [TenantAgent] Iniciando cálculo detalhado', {
        tenantId,
        propertyId: args.propertyId,
        propertyBasePrice: property.basePrice,
        hasCustomPricing: !!(property.customPricing && Object.keys(property.customPricing).length > 0),
        customPricingCount: property.customPricing ? Object.keys(property.customPricing).length : 0
      });
      
      quote = calculateDetailedQuote(property, checkInDate, checkOutDate, args.guests, args.paymentMethod);
      
      if (!quote) {
        logger.error('❌ [TenantAgent] calculateDetailedQuote retornou undefined', {
          tenantId,
          propertyId: args.propertyId,
          propertyData: {
            id: property.id,
            basePrice: property.basePrice,
            hasCustomPricing: !!(property.customPricing && Object.keys(property.customPricing).length > 0)
          }
        });
        throw new Error('calculateDetailedQuote retornou undefined');
      }
      
      logger.info('✅ [TenantAgent] Cálculo detalhado concluído', {
        tenantId,
        propertyId: args.propertyId,
        nights: quote.nights,
        totalPrice: quote.pricing?.totalPrice,
        customPricingSurcharge: quote.surcharges?.customPricing
      });
    } catch (error) {
      logger.error('❌ [TenantAgent] Erro em calculateDetailedQuote', {
        tenantId,
        propertyId: args.propertyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
        propertyData: {
          id: property?.id,
          basePrice: property?.basePrice,
          maxGuests: property?.maxGuests,
          minimumNights: property?.minimumNights
        },
        dateValidation: {
          checkInDate: checkInDate.toISOString(),
          checkOutDate: checkOutDate.toISOString(),
          guests: args.guests,
          paymentMethod: args.paymentMethod
        }
      });
      
      return {
        success: false,
        error: 'Erro ao calcular orçamento detalhado. Verifique as datas e tente novamente.',
        tenantId
      };
    }
    
    // Verificar disponibilidade
    let unavailableDates = [];
    try {
      unavailableDates = checkUnavailableDates(property, checkInDate, checkOutDate) || [];
    } catch (error) {
      logger.error('❌ [TenantAgent] Erro em checkUnavailableDates', {
        tenantId,
        propertyId: args.propertyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continua com array vazio em caso de erro
      unavailableDates = [];
    }
    if (unavailableDates.length > 0) {
      return {
        success: false,
        error: `Propriedade indisponível nas seguintes datas: ${unavailableDates.map(d => d.toLocaleDateString('pt-BR')).join(', ')}`,
        tenantId
      };
    }

    logger.info('✅ [TenantAgent] generate_quote concluída', {
      tenantId,
      propertyId: args.propertyId,
      nights: quote.nights
    });

    return {
      success: true,
      quote,
      property: {
        id: property.id,
        name: property.title,
        location: `${property.neighborhood}, ${property.city}`,
        maxGuests: property.maxGuests,
        minimumNights: property.minimumNights
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em generate_quote', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: typeof error,
      errorValue: error,
      stack: error instanceof Error ? error.stack : undefined,
      args: args ? {
        propertyId: args.propertyId,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        guests: args.guests,
        paymentMethod: args.paymentMethod
      } : 'undefined args'
    });

    return {
      success: false,
      error: 'Erro ao gerar orçamento. Por favor, verifique as datas e tente novamente.',
      tenantId
    };
  }
}

/**
 * Método auxiliar para calcular orçamento detalhado
 */
function calculateDetailedQuote(
  property: Property,
  checkIn: Date,
  checkOut: Date,
  guests: number,
  paymentMethod?: string
): any {
  try {
    logger.info('🧮 [calculateDetailedQuote] Iniciando cálculo', {
      propertyId: property?.id,
      basePrice: property?.basePrice,
      checkIn: checkIn?.toISOString(),
      checkOut: checkOut?.toISOString(),
      guests,
      paymentMethod
    });
    
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  
  if (nights < (property.minimumNights || 1)) {
    throw new Error(`Estadia mínima de ${property.minimumNights || 1} noite(s)`);
  }
  
  if (guests > property.maxGuests) {
    throw new Error(`Máximo ${property.maxGuests} hóspedes`);
  }

  // Calcular preço base por noite com preços dinâmicos
  const dailyBreakdown = [];
  let subtotal = 0;
  let weekendSurcharge = 0;
  let holidaySurcharge = 0;
  let seasonalSurcharge = 0;
  let customPricingSurcharge = 0;
  
  const currentDate = new Date(checkIn);
  
  for (let i = 0; i < nights; i++) {
    const dayPrice = calculateDayPrice(property, currentDate);
    dailyBreakdown.push({
      date: new Date(currentDate),
      basePrice: property.basePrice || 0,
      finalPrice: dayPrice.finalPrice,
      isWeekend: dayPrice.isWeekend,
      isHoliday: dayPrice.isHoliday,
      isSeason: dayPrice.isSeason,
      multiplier: dayPrice.multiplier,
      reason: dayPrice.reason
    });
    
    subtotal += dayPrice.finalPrice;
    
    if (dayPrice.isWeekend && !dayPrice.isHoliday && dayPrice.reason !== 'Preço customizado') {
      weekendSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
    }
    
    if (dayPrice.isHoliday && dayPrice.reason !== 'Preço customizado') {
      holidaySurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
    }
    
    if (dayPrice.isSeason && dayPrice.reason !== 'Preço customizado') {
      seasonalSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
    }
    
    // Contabilizar custom pricing surcharge
    if (dayPrice.reason === 'Preço customizado') {
      customPricingSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Taxa de limpeza
  const cleaningFee = property.cleaningFee || 0;
  
  // Taxa por hóspedes extras
  let extraGuestFee = 0;
  const baseGuestCapacity = 4; // A partir de 5 hóspedes cobra extra
  if (guests > baseGuestCapacity) {
    const extraGuests = guests - baseGuestCapacity;
    const extraGuestRate = property.pricePerExtraGuest || Math.round(subtotal * 0.12 / extraGuests); // 12% total dividido pelos extras
    extraGuestFee = extraGuests * extraGuestRate;
  }
  
  // Taxa de serviço (10%)
  const serviceFee = Math.round(subtotal * 0.1);
  
  // Taxa por método de pagamento
  let paymentSurcharge = 0;
  if (paymentMethod && property.paymentMethodSurcharges) {
    const surchargeRate = property.paymentMethodSurcharges[paymentMethod as keyof typeof property.paymentMethodSurcharges] || 0;
    paymentSurcharge = Math.round((subtotal + cleaningFee + extraGuestFee + serviceFee) * surchargeRate);
  }
  
  const totalPrice = subtotal + cleaningFee + extraGuestFee + serviceFee + paymentSurcharge;
  
  return {
    checkIn: checkIn.toISOString().split('T')[0],
    checkOut: checkOut.toISOString().split('T')[0],
    nights,
    guests,
    dailyBreakdown,
    pricing: {
      subtotal,
      cleaningFee,
      extraGuestFee,
      extraGuests: Math.max(0, guests - baseGuestCapacity),
      serviceFee,
      paymentSurcharge,
      totalPrice
    },
    surcharges: {
      weekend: weekendSurcharge,
      holiday: holidaySurcharge,
      seasonal: seasonalSurcharge,
      customPricing: typeof customPricingSurcharge === 'number' ? customPricingSurcharge : 0,
      payment: paymentSurcharge
    },
    paymentMethod,
    averagePricePerNight: Math.round(subtotal / nights),
    summary: {
      propertyBasePrice: property.basePrice || 0,
      totalNights: nights,
      totalGuests: guests,
      pricePerNightRange: {
        min: Math.min(...dailyBreakdown.map(d => d.finalPrice)),
        max: Math.max(...dailyBreakdown.map(d => d.finalPrice))
      }
    }
  };
  } catch (error) {
    logger.error('❌ [calculateDetailedQuote] Erro no cálculo detalhado', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      propertyId: property?.id,
      basePrice: property?.basePrice,
      checkIn: checkIn?.toISOString(),
      checkOut: checkOut?.toISOString(),
      guests,
      paymentMethod
    });
    
    // Re-throw the error so that the calling function can handle it
    throw error;
  }
}

/**
 * Calcular preço de um dia específico com todas as variações
 */
function calculateDayPrice(property: Property, date: Date): any {
  try {
    const basePrice = property.basePrice || 0;
    let finalPrice = basePrice;
    let multiplier = 1;
    let reason = 'Preço base';
  
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const month = date.getMonth() + 1;
  
  // Preços customizados por data específica
  const dateKey = date.toISOString().split('T')[0];
  if (property.customPricing && property.customPricing[dateKey]) {
    finalPrice = property.customPricing[dateKey];
    multiplier = finalPrice / basePrice;
    reason = 'Preço customizado';
    
    return {
      finalPrice,
      basePrice,
      multiplier,
      reason,
      isWeekend,
      isHoliday: false,
      isSeason: false
    };
  }
  
  // Verificar feriados
  const isHoliday = checkIsHoliday(date);
  if (isHoliday.isHoliday) {
    multiplier = isHoliday.multiplier!;
    finalPrice = Math.round(basePrice * multiplier);
    reason = `Feriado: ${isHoliday.name}`;
    
    return {
      finalPrice,
      basePrice,
      multiplier,
      reason,
      isWeekend,
      isHoliday: true,
      isSeason: false
    };
  }
  
  // Alta temporada
  const isHighSeason = property.highSeasonMonths?.includes(month);
  if (isHighSeason && property.highSeasonSurcharge) {
    multiplier = 1 + (property.highSeasonSurcharge / 100);
    finalPrice = Math.round(basePrice * multiplier);
    reason = 'Alta temporada';
    
    return {
      finalPrice,
      basePrice,
      multiplier,
      reason,
      isWeekend,
      isHoliday: false,
      isSeason: true
    };
  }
  
  // Dezembro
  if (month === 12 && property.decemberSurcharge) {
    multiplier = 1 + (property.decemberSurcharge / 100);
    finalPrice = Math.round(basePrice * multiplier);
    reason = 'Temporada de dezembro';
    
    return {
      finalPrice,
      basePrice,
      multiplier,
      reason,
      isWeekend,
      isHoliday: false,
      isSeason: true
    };
  }
  
  // Fim de semana
  if (isWeekend && property.weekendSurcharge) {
    multiplier = 1 + (property.weekendSurcharge / 100);
    finalPrice = Math.round(basePrice * multiplier);
    reason = 'Fim de semana';
  }
  
  return {
    finalPrice,
    basePrice,
    multiplier,
    reason,
    isWeekend,
    isHoliday: false,
    isSeason: false
  };
  } catch (error) {
    logger.error('❌ [calculateDayPrice] Erro no cálculo de preço diário', {
      error: error instanceof Error ? error.message : 'Unknown error',
      propertyId: property?.id,
      date: date?.toISOString(),
      basePrice: property?.basePrice
    });
    
    // Retorno de fallback para evitar undefined
    return {
      finalPrice: property?.basePrice || 100,
      basePrice: property?.basePrice || 100,
      multiplier: 1,
      reason: 'Preço base (fallback)',
      isWeekend: false,
      isHoliday: false,
      isSeason: false
    };
  }
}

/**
 * Verificar se é feriado
 */
function checkIsHoliday(date: Date): { isHoliday: boolean; name?: string; multiplier?: number } {
  const holidays = [
    { name: 'Ano Novo', date: [1, 1], multiplier: 1.5 },
    { name: 'Tiradentes', date: [4, 21], multiplier: 1.2 },
    { name: 'Dia do Trabalho', date: [5, 1], multiplier: 1.2 },
    { name: 'Independência', date: [9, 7], multiplier: 1.3 },
    { name: 'Nossa Senhora', date: [10, 12], multiplier: 1.2 },
    { name: 'Finados', date: [11, 2], multiplier: 1.1 },
    { name: 'Proclamação', date: [11, 15], multiplier: 1.2 },
    { name: 'Natal', date: [12, 25], multiplier: 1.8 }
  ];
  
  const day = date.getDate();
  const month = date.getMonth() + 1;
  
  const holiday = holidays.find(h => h.date[0] === month && h.date[1] === day);
  if (holiday) {
    return {
      isHoliday: true,
      name: holiday.name,
      multiplier: holiday.multiplier
    };
  }
  
  // Períodos especiais
  if (month === 12 && day >= 20) {
    return { isHoliday: true, name: 'Réveillon', multiplier: 2.0 };
  }
  
  if (month === 1 && day <= 6) {
    return { isHoliday: true, name: 'Réveillon', multiplier: 2.0 };
  }
  
  if (month === 2 && day >= 10 && day <= 17) {
    return { isHoliday: true, name: 'Carnaval', multiplier: 1.8 };
  }
  
  if (month === 7) {
    return { isHoliday: true, name: 'Férias de Julho', multiplier: 1.4 };
  }
  
  return { isHoliday: false };
}

/**
 * Verificar datas indisponíveis
 */
function checkUnavailableDates(property: Property, checkIn: Date, checkOut: Date): Date[] {
  if (!property.unavailableDates) return [];
  
  const unavailable = [];
  const currentDate = new Date(checkIn);
  
  while (currentDate < checkOut) {
    const isUnavailable = property.unavailableDates.some(unavailableDate => {
      const unavailable = new Date(unavailableDate);
      return unavailable.toDateString() === currentDate.toDateString();
    });
    
    if (isUnavailable) {
      unavailable.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return unavailable;
}

/**
 * FUNÇÃO 11: Criar transação financeira para reserva
 */
export async function createTransaction(args: CreateTransactionArgs, tenantId: string): Promise<any> {
  try {
    logger.info('💳 [TenantAgent] create_transaction iniciada', {
      tenantId,
      reservationId: args.reservationId,
      totalAmount: args.totalAmount,
      paymentMethod: args.paymentMethod,
      advancePaymentPercentage: args.advancePaymentPercentage
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    const clientService = serviceFactory.clients;
    const reservationService = serviceFactory.reservations;
    const financialService = serviceFactory.financialMovements;

    // Se não temos todos os IDs, tentar recuperar do contexto ou reserva mais recente
    let reservationId = args.reservationId;
    let clientId = args.clientId;
    let propertyId = args.propertyId;
    let totalAmount = args.totalAmount;
    
    // Se faltam dados, buscar reserva mais recente do cliente
    if (!reservationId || !propertyId || !totalAmount) {
      const recentReservations = await reservationService.getMany(
        [{ field: 'status', operator: '==', value: 'pending' }],
        { limit: 1, orderBy: { field: 'createdAt', direction: 'desc' } }
      ) as Reservation[];
      
      if (recentReservations.length > 0) {
        const recentReservation = recentReservations[0];
        reservationId = reservationId || recentReservation.id!;
        clientId = clientId || recentReservation.clientId;
        propertyId = propertyId || recentReservation.propertyId;
        totalAmount = totalAmount || recentReservation.totalAmount;
      }
    }
    
    // Verificar se temos os dados mínimos
    if (!reservationId || !propertyId || !totalAmount) {
      return {
        success: false,
        error: 'Dados insuficientes para criar transação. Certifique-se de que existe uma reserva pendente.',
        tenantId
      };
    }

    // Verificar se reserva existe
    const reservation = await reservationService.get(reservationId) as Reservation;
    if (!reservation) {
      return {
        success: false,
        error: 'Reserva não encontrada',
        tenantId
      };
    }
    
    // Usar dados da reserva se não foram fornecidos
    clientId = clientId || reservation.clientId;
    propertyId = propertyId || reservation.propertyId;
    totalAmount = totalAmount || reservation.totalPrice;

    // Verificar se cliente existe
    const client = await clientService.get(clientId) as Client;
    if (!client) {
      return {
        success: false,
        error: 'Cliente não encontrado',
        tenantId
      };
    }

    // Verificar se propriedade existe
    const property = await propertyService.get(propertyId) as Property;
    if (!property) {
      return {
        success: false,
        error: 'Propriedade não encontrada',
        tenantId
      };
    }

    // Calcular valor do pagamento antecipado
    const advancePercentage = args.advancePaymentPercentage || property.advancePaymentPercentage || 10;
    const advanceAmount = Math.round(args.totalAmount * (advancePercentage / 100));
    
    // Aplicar desconto por método de pagamento (se disponível)
    let finalAdvanceAmount = advanceAmount;
    let discount = 0;
    
    // TODO: Implementar descontos por método de pagamento quando Property interface for atualizada
    // if (property.paymentMethodDiscounts && property.paymentMethodDiscounts[args.paymentMethod]) {
    //   const discountPercentage = property.paymentMethodDiscounts[args.paymentMethod];
    //   discount = Math.round(advanceAmount * (discountPercentage / 100));
    //   finalAdvanceAmount = advanceAmount - discount;
    // }

    // Preparar dados da transação
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Prazo de 3 dias para pagamento

    const transactionData: CreateFinancialMovementInput = {
      type: 'income',
      category: 'rent',
      description: `Pagamento antecipado - ${property.title} (${advancePercentage}%)`,
      amount: finalAdvanceAmount,
      dueDate,
      propertyId: args.propertyId,
      clientId: args.clientId,
      reservationId: args.reservationId,
      paymentMethod: args.paymentMethod as any,
      autoCharge: false,
      notes: `${args.notes || ''}\nValor total: R$ ${args.totalAmount.toFixed(2)}\nDesconto ${args.paymentMethod}: R$ ${discount.toFixed(2)}\nValor de entrada (${advancePercentage}%): R$ ${finalAdvanceAmount.toFixed(2)}`
    };

    const transactionId = await financialService.create(transactionData);

    // Atualizar status da reserva para indicar que há transação pendente
    await reservationService.update(args.reservationId, {
      financialStatus: 'partial_payment_pending',
      advancePaymentAmount: finalAdvanceAmount,
      advancePaymentDue: dueDate,
      paymentMethod: args.paymentMethod,
      updatedAt: new Date()
    });

    logger.info('✅ [TenantAgent] create_transaction concluída', {
      tenantId,
      transactionId,
      reservationId: args.reservationId,
      originalAmount: args.totalAmount,
      advanceAmount: finalAdvanceAmount,
      discount,
      paymentMethod: args.paymentMethod
    });

    // Calcular valor restante que deve ser pago posteriormente
    const remainingAmount = args.totalAmount - finalAdvanceAmount;

    return {
      success: true,
      transaction: {
        id: transactionId,
        reservationId: args.reservationId,
        propertyName: property.title,
        clientName: client.name,
        totalAmount: args.totalAmount,
        advanceAmount: finalAdvanceAmount,
        remainingAmount,
        discount,
        discountPercentage: 0, // TODO: Implementar quando Property interface for atualizada
        paymentMethod: args.paymentMethod,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending',
        advancePercentage
      },
      paymentInstructions: {
        method: args.paymentMethod,
        amount: finalAdvanceAmount,
        dueDate: dueDate.toLocaleDateString('pt-BR'),
        pixKey: args.paymentMethod === 'pix' ? 'pix@example.com' : undefined,
        bankDetails: args.paymentMethod === 'bank_transfer' ? {
          bank: 'Banco Example',
          agency: '1234',
          account: '56789-0'
        } : undefined
      },
      message: `Transação criada! Valor de entrada: R$ ${finalAdvanceAmount.toFixed(2)} via ${args.paymentMethod}${discount > 0 ? ` (desconto: R$ ${discount.toFixed(2)})` : ''}. Valor restante: R$ ${remainingAmount.toFixed(2)} será cobrado posteriormente.`,
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em create_transaction', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao criar transação financeira',
      tenantId
    };
  }
}

// ===== DEFINIÇÕES PARA OPENAI ====="

export function getTenantAwareOpenAIFunctions() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'search_properties',
        description: 'Buscar propriedades disponíveis com filtros específicos',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Cidade, bairro, endereço ou palavra-chave que apareça na descrição da propriedade'
            },
            guests: {
              type: 'number',
              description: 'Número de hóspedes'
            },
            checkIn: {
              type: 'string',
              description: 'Data de check-in (YYYY-MM-DD)'
            },
            checkOut: {
              type: 'string',
              description: 'Data de check-out (YYYY-MM-DD)'
            },
            maxPrice: {
              type: 'number',
              description: 'Preço máximo por noite'
            },
            propertyType: {
              type: 'string',
              description: 'Tipo de propriedade (apartamento, casa, etc.)'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'calculate_price',
        description: 'Calcular preço total para uma propriedade específica usando o nome da propriedade',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            checkIn: {
              type: 'string',
              description: 'Data de check-in (YYYY-MM-DD)'
            },
            checkOut: {
              type: 'string',
              description: 'Data de check-out (YYYY-MM-DD)'
            },
            guests: {
              type: 'number',
              description: 'Número de hóspedes'
            }
          },
          required: ['propertyName', 'checkIn', 'checkOut']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_reservation',
        description: 'Criar uma nova reserva usando o nome da propriedade',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            clientName: {
              type: 'string',
              description: 'Nome do cliente'
            },
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente'
            },
            clientEmail: {
              type: 'string',
              description: 'Email do cliente'
            },
            checkIn: {
              type: 'string',
              description: 'Data de check-in (YYYY-MM-DD)'
            },
            checkOut: {
              type: 'string',
              description: 'Data de check-out (YYYY-MM-DD)'
            },
            guests: {
              type: 'number',
              description: 'Número de hóspedes'
            },
            totalPrice: {
              type: 'number',
              description: 'Preço total da reserva'
            }
          },
          required: ['propertyName', 'checkIn', 'checkOut', 'guests']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'register_client',
        description: 'Registrar um novo cliente ou atualizar dados existentes',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nome completo do cliente'
            },
            phone: {
              type: 'string',
              description: 'Telefone do cliente'
            },
            email: {
              type: 'string',
              description: 'Email do cliente'
            },
            document: {
              type: 'string',
              description: 'CPF ou documento do cliente'
            }
          },
          required: ['name']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_property_details',
        description: 'Obter detalhes completos de uma propriedade usando o nome',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            propertyIndex: {
              type: 'number',
              description: 'Índice da propriedade na lista (0 para primeira, 1 para segunda, etc)'
            },
            propertyReference: {
              type: 'string',
              description: 'Referência como "primeira", "segunda", "última"'
            }
          },
          required: ['propertyName']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'send_property_media',
        description: 'Enviar fotos e vídeos de uma propriedade usando o nome',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            propertyIndex: {
              type: 'number',
              description: 'Índice da propriedade na lista'
            },
            mediaType: {
              type: 'string',
              enum: ['photos', 'videos', 'all'],
              description: 'Tipo de mídia a enviar'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'check_visit_availability',
        description: 'Verificar horários disponíveis para visita em uma data específica',
        parameters: {
          type: 'object',
          properties: {
            visitDate: {
              type: 'string',
              description: 'Data da visita (YYYY-MM-DD)'
            },
            propertyId: {
              type: 'string',
              description: 'ID da propriedade (opcional)'
            }
          },
          required: ['visitDate']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'schedule_visit',
        description: 'Agendar uma visita para conhecer a propriedade',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            clientName: {
              type: 'string',
              description: 'Nome do cliente'
            },
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente'
            },
            visitDate: {
              type: 'string',
              description: 'Data da visita (YYYY-MM-DD)'
            },
            visitTime: {
              type: 'string',
              description: 'Hora da visita (HH:MM)'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre a visita'
            }
          },
          required: ['propertyId', 'visitDate']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'classify_lead',
        description: 'Classificar e categorizar lead baseado na interação e comportamento',
        parameters: {
          type: 'object',
          properties: {
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente'
            },
            interactionType: {
              type: 'string',
              enum: ['property_inquiry', 'price_request', 'visit_request', 'reservation_intent', 'general_question'],
              description: 'Tipo de interação do cliente'
            },
            sentiment: {
              type: 'string',
              enum: ['positive', 'neutral', 'negative'],
              description: 'Sentimento demonstrado pelo cliente'
            },
            interestedProperties: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs das propriedades de interesse'
            },
            budget: {
              type: 'number',
              description: 'Orçamento mencionado pelo cliente'
            },
            timeline: {
              type: 'string',
              description: 'Prazo mencionado pelo cliente'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre a interação'
            }
          },
          required: ['clientPhone', 'interactionType']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'update_lead_status',
        description: 'Atualizar status do lead no funil de vendas (CRM)',
        parameters: {
          type: 'object',
          properties: {
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente'
            },
            newStatus: {
              type: 'string',
              enum: ['new', 'contacted', 'qualified', 'opportunity', 'negotiation', 'won', 'lost', 'nurturing'],
              description: 'Novo status do lead'
            },
            reason: {
              type: 'string',
              description: 'Motivo da mudança de status'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre a mudança'
            }
          },
          required: ['clientPhone', 'newStatus']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'generate_quote',
        description: 'Gerar orçamento detalhado com preços dinâmicos por dia, taxas e acréscimos',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            checkIn: {
              type: 'string',
              description: 'Data de check-in (YYYY-MM-DD)'
            },
            checkOut: {
              type: 'string',
              description: 'Data de check-out (YYYY-MM-DD)'
            },
            guests: {
              type: 'number',
              description: 'Número de hóspedes'
            },
            includeDetails: {
              type: 'boolean',
              description: 'Se deve incluir detalhamento dia a dia'
            },
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'pix', 'cash', 'bank_transfer'],
              description: 'Método de pagamento para calcular taxas'
            }
          },
          required: ['propertyName', 'checkIn', 'checkOut', 'guests']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_transaction',
        description: 'Criar transação financeira para pagamento de reserva com valor de entrada',
        parameters: {
          type: 'object',
          properties: {
            reservationId: {
              type: 'string',
              description: 'ID da reserva'
            },
            clientId: {
              type: 'string',
              description: 'ID do cliente'
            },
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            totalAmount: {
              type: 'number',
              description: 'Valor total da reserva'
            },
            paymentMethod: {
              type: 'string',
              enum: ['pix', 'credit_card', 'debit_card', 'bank_transfer', 'cash'],
              description: 'Método de pagamento escolhido pelo cliente'
            },
            advancePaymentPercentage: {
              type: 'number',
              description: 'Percentual de pagamento antecipado (ex: 10 para 10%)'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre a transação'
            }
          },
          required: ['reservationId', 'clientId', 'propertyId', 'totalAmount', 'paymentMethod']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_lead',
        description: 'Criar um novo lead no CRM (executado automaticamente no primeiro contato WhatsApp)',
        parameters: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'Número de telefone do lead (obrigatório)'
            },
            whatsappNumber: {
              type: 'string',
              description: 'Número do WhatsApp (opcional, padrão é o phone)'
            },
            name: {
              type: 'string',
              description: 'Nome do lead (opcional, padrão: "Lead WhatsApp")'
            },
            email: {
              type: 'string',
              description: 'Email do lead (opcional)'
            },
            source: {
              type: 'string',
              enum: ['whatsapp_ai', 'website', 'referral', 'social_media', 'manual'],
              description: 'Origem do lead'
            },
            initialInteraction: {
              type: 'string',
              description: 'Primeira mensagem/interação do cliente (opcional)'
            },
            preferences: {
              type: 'object',
              description: 'Preferências iniciais do cliente (opcional)',
              properties: {
                propertyType: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tipos de propriedade preferidos'
                },
                location: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Localizações preferidas'
                },
                priceRange: {
                  type: 'object',
                  properties: {
                    min: { type: 'number' },
                    max: { type: 'number' }
                  }
                }
              }
            }
          },
          required: ['phone']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'update_lead',
        description: 'Atualizar informações de um lead existente no CRM',
        parameters: {
          type: 'object',
          properties: {
            leadId: {
              type: 'string',
              description: 'ID do lead (opcional se usar clientPhone)'
            },
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente para buscar o lead (alternativa ao leadId)'
            },
            updates: {
              type: 'object',
              description: 'Campos a serem atualizados',
              properties: {
                name: {
                  type: 'string',
                  description: 'Nome atualizado do lead'
                },
                email: {
                  type: 'string',
                  description: 'Email atualizado do lead'
                },
                status: {
                  type: 'string',
                  enum: ['new', 'contacted', 'qualified', 'opportunity', 'negotiation', 'won', 'lost'],
                  description: 'Novo status no pipeline CRM'
                },
                temperature: {
                  type: 'string',
                  enum: ['cold', 'warm', 'hot'],
                  description: 'Temperatura do lead baseada no interesse'
                },
                clientId: {
                  type: 'string',
                  description: 'ID do cliente para linkar o lead quando cliente for criado'
                },
                preferences: {
                  type: 'object',
                  description: 'Preferências atualizadas do cliente'
                },
                notes: {
                  type: 'string',
                  description: 'Observações sobre o lead'
                }
              }
            }
          },
          required: ['updates']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_task',
        description: 'Criar tarefa de follow-up para lead ou cliente',
        parameters: {
          type: 'object',
          properties: {
            leadId: {
              type: 'string',
              description: 'ID do lead (opcional se usar clientId)'
            },
            clientId: {
              type: 'string',
              description: 'ID do cliente (opcional se usar leadId)'
            },
            title: {
              type: 'string',
              description: 'Título da tarefa'
            },
            description: {
              type: 'string',
              description: 'Descrição detalhada da tarefa (opcional)'
            },
            type: {
              type: 'string',
              enum: ['call', 'email', 'meeting', 'follow_up', 'document', 'other'],
              description: 'Tipo da tarefa'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Prioridade da tarefa'
            },
            dueDate: {
              type: 'string',
              description: 'Data limite da tarefa (formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)'
            },
            reminderDate: {
              type: 'string',
              description: 'Data do lembrete (formato ISO, opcional)'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre a tarefa (opcional)'
            }
          },
          required: ['title', 'type', 'priority', 'dueDate']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'update_task',
        description: 'Atualizar status e informações de uma tarefa',
        parameters: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'ID da tarefa a ser atualizada'
            },
            updates: {
              type: 'object',
              description: 'Campos a serem atualizados',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed', 'cancelled'],
                  description: 'Novo status da tarefa'
                },
                notes: {
                  type: 'string',
                  description: 'Observações sobre a atualização'
                },
                outcome: {
                  type: 'string',
                  description: 'Resultado da tarefa (usado quando completada)'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Nova prioridade da tarefa'
                }
              }
            }
          },
          required: ['taskId', 'updates']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'generate_report',
        description: 'Gerar relatório detalhado de performance (financeiro, CRM, ocupação, propriedades)',
        parameters: {
          type: 'object',
          properties: {
            reportType: {
              type: 'string',
              enum: ['financial', 'crm', 'occupancy', 'properties'],
              description: 'Tipo do relatório a ser gerado'
            },
            period: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Data de início do período (YYYY-MM-DD)'
                },
                endDate: {
                  type: 'string', 
                  description: 'Data de fim do período (YYYY-MM-DD)'
                }
              },
              required: ['startDate', 'endDate']
            },
            format: {
              type: 'string',
              enum: ['summary', 'detailed'],
              description: 'Formato do relatório (padrão: summary)'
            },
            includeInsights: {
              type: 'boolean',
              description: 'Incluir insights e recomendações no relatório'
            }
          },
          required: ['reportType', 'period']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'track_metrics',
        description: 'Rastrear métricas específicas de performance e KPIs em tempo real',
        parameters: {
          type: 'object',
          properties: {
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['revenue', 'occupancy_rate', 'adr', 'revpar', 'conversion_rate', 'lead_score', 'response_time']
              },
              description: 'Lista de métricas a serem rastreadas'
            },
            period: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Data de início (YYYY-MM-DD)'
                },
                endDate: {
                  type: 'string',
                  description: 'Data de fim (YYYY-MM-DD)'
                }
              },
              required: ['startDate', 'endDate']
            },
            compareWith: {
              type: 'string',
              enum: ['previous_period', 'same_period_last_year', 'target'],
              description: 'Comparar com período anterior, mesmo período do ano passado, ou meta'
            }
          },
          required: ['metrics', 'period']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_goal',
        description: 'Criar uma nova meta financeira ou operacional para acompanhamento',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nome da meta (ex: "Receita Q1 2024")'
            },
            description: {
              type: 'string',
              description: 'Descrição detalhada da meta'
            },
            type: {
              type: 'string',
              enum: ['revenue', 'occupancy', 'bookings', 'average_ticket', 'customer_acquisition'],
              description: 'Tipo da meta'
            },
            targetValue: {
              type: 'number',
              description: 'Valor alvo da meta'
            },
            currentValue: {
              type: 'number',
              description: 'Valor atual (opcional, padrão: 0)'
            },
            period: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Data de início (YYYY-MM-DD)'
                },
                endDate: {
                  type: 'string',
                  description: 'Data de fim (YYYY-MM-DD)'
                }
              },
              required: ['startDate', 'endDate']
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'quarterly'],
              description: 'Frequência de acompanhamento'
            }
          },
          required: ['name', 'type', 'targetValue', 'period', 'frequency']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'update_goal_progress',
        description: 'Atualizar o progresso de uma meta existente com novos valores',
        parameters: {
          type: 'object',
          properties: {
            goalId: {
              type: 'string',
              description: 'ID da meta a ser atualizada'
            },
            currentValue: {
              type: 'number',
              description: 'Novo valor atual da meta'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre o progresso (opcional)'
            },
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Nome do marco'
                  },
                  targetValue: {
                    type: 'number',
                    description: 'Valor alvo do marco'
                  },
                  achieved: {
                    type: 'boolean',
                    description: 'Se o marco foi alcançado'
                  }
                }
              },
              description: 'Marcos intermediários da meta'
            }
          },
          required: ['goalId', 'currentValue']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'analyze_performance',
        description: 'Analisar performance geral do negócio com insights automáticos e recomendações',
        parameters: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['overall', 'revenue', 'crm', 'properties', 'trends'],
              description: 'Tipo de análise a ser realizada'
            },
            period: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Data de início (YYYY-MM-DD)'
                },
                endDate: {
                  type: 'string',
                  description: 'Data de fim (YYYY-MM-DD)'
                }
              },
              required: ['startDate', 'endDate']
            },
            includeRecommendations: {
              type: 'boolean',
              description: 'Incluir recomendações específicas na análise'
            },
            focusAreas: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['revenue_optimization', 'cost_reduction', 'conversion_improvement', 'customer_retention']
              },
              description: 'Áreas específicas para focar a análise'
            }
          },
          required: ['analysisType', 'period']
        }
      }
    },
    
    // ===== FUNÇÕES CRÍTICAS ADICIONAIS =====
    {
      type: 'function' as const,
      function: {
        name: 'cancel_reservation',
        description: 'Cancelar uma reserva existente com política de reembolso',
        parameters: {
          type: 'object',
          properties: {
            reservationId: {
              type: 'string',
              description: 'ID da reserva a ser cancelada'
            },
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente para verificação'
            },
            reason: {
              type: 'string',
              description: 'Motivo do cancelamento'
            },
            refundRequested: {
              type: 'boolean',
              description: 'Se o cliente deseja reembolso'
            }
          },
          required: ['reservationId', 'clientPhone']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'modify_reservation',
        description: 'Modificar datas, hóspedes ou propriedade de uma reserva',
        parameters: {
          type: 'object',
          properties: {
            reservationId: {
              type: 'string',
              description: 'ID da reserva a ser modificada'
            },
            clientPhone: {
              type: 'string',
              description: 'Telefone do cliente para verificação'
            },
            newCheckIn: {
              type: 'string',
              description: 'Nova data de check-in (YYYY-MM-DD)'
            },
            newCheckOut: {
              type: 'string',
              description: 'Nova data de check-out (YYYY-MM-DD)'
            },
            newGuests: {
              type: 'number',
              description: 'Novo número de hóspedes'
            },
            newPropertyId: {
              type: 'string',
              description: 'Nova propriedade (se aplicável)'
            },
            reason: {
              type: 'string',
              description: 'Motivo da modificação'
            }
          },
          required: ['reservationId', 'clientPhone']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_policies',
        description: 'Obter políticas de cancelamento, pagamento e check-in/check-out',
        parameters: {
          type: 'object',
          properties: {
            policyType: {
              type: 'string',
              enum: ['cancellation', 'payment', 'checkin', 'general', 'all'],
              description: 'Tipo específico de política ou todas'
            },
            propertyId: {
              type: 'string',
              description: 'ID da propriedade (para políticas específicas)'
            }
          }
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'check_availability',
        description: 'Verificar disponibilidade em tempo real de uma propriedade usando o nome',
        parameters: {
          type: 'object',
          properties: {
            propertyName: {
              type: 'string',
              description: 'Nome da propriedade (ex: "Apartamento Vista Mar", "Casa da Praia")'
            },
            checkIn: {
              type: 'string',
              description: 'Data de check-in (YYYY-MM-DD)'
            },
            checkOut: {
              type: 'string',
              description: 'Data de check-out (YYYY-MM-DD)'
            },
            guests: {
              type: 'number',
              description: 'Número de hóspedes'
            }
          },
          required: ['propertyName', 'checkIn', 'checkOut']
        }
      }
    }
  ];
}

// ===== FUNÇÕES ANALYTICS & GOALS =====

/**
 * FUNÇÃO ANALYTICS 1: Gerar relatório detalhado de performance
 */
export async function generateReport(args: GenerateReportArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📊 [Analytics] generate_report iniciada', {
      tenantId,
      reportType: args.reportType,
      period: args.period,
      format: args.format || 'summary'
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const startDate = new Date(args.period.startDate);
    const endDate = new Date(args.period.endDate);
    
    let reportData: any = {
      reportType: args.reportType,
      period: args.period,
      generatedAt: new Date(),
      summary: {},
      details: {},
      insights: [],
      recommendations: []
    };

    switch (args.reportType) {
      case 'financial':
        reportData = await generateFinancialReport(serviceFactory, startDate, endDate, args);
        break;
        
      case 'crm':
        reportData = await generateCRMReport(serviceFactory, startDate, endDate, args);
        break;
        
      case 'properties':
        reportData = await generatePropertiesReport(serviceFactory, startDate, endDate, args);
        break;
        
      case 'occupancy':
        reportData = await generateOccupancyReport(serviceFactory, startDate, endDate, args);
        break;
        
      default:
        reportData = await generateOverallReport(serviceFactory, startDate, endDate, args);
    }

    // Adicionar comparação com período anterior se solicitado
    if (args.includeComparison) {
      const periodLength = differenceInDays(endDate, startDate);
      const previousStart = subDays(startDate, periodLength + 1);
      const previousEnd = subDays(startDate, 1);
      
      const previousData = await generateSimpleReport(serviceFactory, previousStart, previousEnd, args.reportType);
      reportData.comparison = {
        previous: previousData,
        growth: calculateGrowthMetrics(reportData.summary, previousData.summary)
      };
    }

    logger.info('✅ [Analytics] Relatório gerado com sucesso', {
      tenantId,
      reportType: args.reportType,
      summaryKeys: Object.keys(reportData.summary),
      insightsCount: reportData.insights.length
    });

    return {
      success: true,
      message: `Relatório ${args.reportType} gerado com sucesso`,
      report: reportData,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [Analytics] Erro ao gerar relatório', error instanceof Error ? error : undefined, {
      tenantId,
      reportType: args.reportType,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao gerar relatório: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO ANALYTICS 2: Acompanhar métricas em tempo real
 */
export async function trackMetrics(args: TrackMetricsArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📈 [Analytics] track_metrics iniciada', {
      tenantId,
      metricType: args.metricType,
      period: args.period || 'month',
      clientPhone: args.clientPhone
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const now = new Date();
    
    // Calcular período baseado no argumento
    let startDate: Date;
    let endDate: Date = now;
    
    switch (args.period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = subWeeks(now, 1);
        break;
      case 'quarter':
        startDate = subMonths(now, 3);
        break;
      case 'year':
        startDate = subMonths(now, 12);
        break;
      default: // month
        startDate = subMonths(now, 1);
    }

    let metrics: any = {
      metricType: args.metricType,
      period: args.period || 'month',
      dateRange: { startDate, endDate },
      value: 0,
      trend: 'neutral',
      insights: []
    };

    // Buscar métricas específicas por tipo
    switch (args.metricType) {
      case 'revenue':
        metrics = await calculateRevenueMetrics(serviceFactory, startDate, endDate, args);
        break;
        
      case 'occupancy':
        metrics = await calculateOccupancyMetrics(serviceFactory, startDate, endDate, args);
        break;
        
      case 'conversion':
        metrics = await calculateConversionMetrics(serviceFactory, startDate, endDate, args);
        break;
        
      case 'lead_score':
        metrics = await calculateLeadScoreMetrics(serviceFactory, startDate, endDate, args);
        break;
        
      case 'customer_satisfaction':
        metrics = await calculateSatisfactionMetrics(serviceFactory, startDate, endDate, args);
        break;
    }

    // Adicionar tendências se solicitado
    if (args.includeTrends) {
      metrics.trends = await calculateTrends(serviceFactory, startDate, endDate, args.metricType);
    }

    logger.info('✅ [Analytics] Métricas calculadas com sucesso', {
      tenantId,
      metricType: args.metricType,
      value: metrics.value,
      trend: metrics.trend
    });

    return {
      success: true,
      message: `Métricas de ${args.metricType} calculadas com sucesso`,
      metrics,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [Analytics] Erro ao calcular métricas', error instanceof Error ? error : undefined, {
      tenantId,
      metricType: args.metricType,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao calcular métricas: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO GOALS 1: Criar meta financeira/operacional
 */
export async function createGoal(args: CreateGoalArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🎯 [Goals] create_goal iniciada', {
      tenantId,
      name: args.name,
      type: args.type,
      targetValue: args.targetValue,
      frequency: args.frequency
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const goalService = serviceFactory.goals;
    
    const now = new Date();
    const startDate = new Date(args.period.startDate);
    const endDate = new Date(args.period.endDate);

    // Mapear tipos para enums corretos
    const goalTypeMap: Record<string, GoalType> = {
      'revenue': GoalType.REVENUE,
      'occupancy': GoalType.OCCUPANCY,
      'bookings': GoalType.BOOKINGS,
      'average_ticket': GoalType.AVERAGE_TICKET,
      'customer_acquisition': GoalType.CUSTOMER_ACQUISITION
    };

    const newGoal: Partial<FinancialGoal> = {
      tenantId,
      name: args.name,
      description: args.description,
      type: goalTypeMap[args.type] || GoalType.REVENUE,
      category: GoalCategory.FINANCIAL,
      metric: GoalMetric.TOTAL_REVENUE, // Padrão, pode ser refinado
      targetValue: args.targetValue,
      currentValue: 0,
      startValue: 0,
      period: { startDate, endDate },
      frequency: args.frequency as any,
      status: GoalStatus.ACTIVE,
      progress: 0,
      checkpoints: [],
      milestones: [],
      alerts: [],
      notificationSettings: {
        enabled: args.notifications ?? true,
        triggers: ['milestone_reached', 'goal_achieved', 'goal_at_risk'],
        recipients: ['owner'],
        methods: ['in_app', 'email']
      },
      createdAt: now,
      updatedAt: now,
      createdBy: 'sofia-ai'
    };

    const goalId = await goalService.create(newGoal);
    const createdGoal = await goalService.getById(goalId);

    logger.info('✅ [Goals] Meta criada com sucesso', {
      tenantId,
      goalId,
      name: args.name,
      targetValue: args.targetValue
    });

    return {
      success: true,
      message: 'Meta criada com sucesso',
      goal: createdGoal,
      goalId,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [Goals] Erro ao criar meta', error instanceof Error ? error : undefined, {
      tenantId,
      name: args.name,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao criar meta: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO GOALS 2: Atualizar progresso da meta
 */
export async function updateGoalProgress(args: UpdateGoalProgressArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📈 [Goals] update_goal_progress iniciada', {
      tenantId,
      goalId: args.goalId,
      goalName: args.goalName,
      currentValue: args.currentValue,
      addProgress: args.addProgress
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const goalService = serviceFactory.goals;
    
    let goalId = args.goalId;
    
    // Se não tem goalId, buscar por nome
    if (!goalId && args.goalName) {
      const goals = await goalService.getMany([
        { field: 'name', operator: '==', value: args.goalName }
      ]);
      
      if (goals.length === 0) {
        return {
          success: false,
          error: 'Meta não encontrada com este nome',
          tenantId
        };
      }
      
      goalId = goals[0].id;
    }
    
    if (!goalId) {
      return {
        success: false,
        error: 'goalId ou goalName obrigatório',
        tenantId
      };
    }

    // Buscar meta atual
    const currentGoal = await goalService.getById(goalId);
    if (!currentGoal) {
      return {
        success: false,
        error: 'Meta não encontrada',
        tenantId
      };
    }

    // Calcular novo valor
    let newCurrentValue = currentGoal.currentValue;
    if (args.currentValue !== undefined) {
      newCurrentValue = args.currentValue;
    } else if (args.addProgress !== undefined) {
      newCurrentValue = currentGoal.currentValue + args.addProgress;
    }

    // Calcular novo progresso
    const newProgress = Math.min((newCurrentValue / currentGoal.targetValue) * 100, 100);
    
    // Preparar updates
    const updates: Partial<FinancialGoal> = {
      currentValue: newCurrentValue,
      progress: newProgress,
      updatedAt: new Date()
    };

    // Adicionar milestone se fornecido
    if (args.milestone) {
      const milestones = [...currentGoal.milestones];
      milestones.push({
        id: Date.now().toString(),
        name: args.milestone.name,
        targetValue: newCurrentValue,
        achieved: args.milestone.achieved,
        achievedAt: args.milestone.achieved ? new Date(args.milestone.date || Date.now()) : undefined,
        description: args.notes
      });
      updates.milestones = milestones;
    }

    // Atualizar status baseado no progresso
    if (newProgress >= 100) {
      updates.status = GoalStatus.ACHIEVED;
    } else if (newProgress >= 75) {
      updates.status = GoalStatus.ON_TRACK;
    } else if (newProgress < 25) {
      updates.status = GoalStatus.AT_RISK;
    }

    // Executar update
    await goalService.update(goalId, updates);

    const updatedGoal = await goalService.getById(goalId);

    logger.info('✅ [Goals] Progresso da meta atualizado com sucesso', {
      tenantId,
      goalId,
      newCurrentValue,
      newProgress: newProgress.toFixed(1),
      status: updates.status
    });

    return {
      success: true,
      message: 'Progresso da meta atualizado com sucesso',
      goal: updatedGoal,
      goalId,
      previousValue: currentGoal.currentValue,
      newValue: newCurrentValue,
      progressChange: newProgress - currentGoal.progress,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [Goals] Erro ao atualizar progresso da meta', error instanceof Error ? error : undefined, {
      tenantId,
      goalId: args.goalId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao atualizar progresso: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO ANALYTICS 3: Análise de performance com insights IA
 */
export async function analyzePerformance(args: AnalyzePerformanceArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🔍 [Analytics] analyze_performance iniciada', {
      tenantId,
      analysisType: args.analysisType,
      period: args.period,
      includeRecommendations: args.includeRecommendations
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const startDate = new Date(args.period.startDate);
    const endDate = new Date(args.period.endDate);
    
    let analysis: any = {
      analysisType: args.analysisType,
      period: args.period,
      performanceScore: 0,
      keyMetrics: {},
      trends: [],
      insights: [],
      recommendations: [],
      riskFactors: [],
      opportunities: []
    };

    // Realizar análise específica por tipo
    switch (args.analysisType) {
      case 'financial':
        analysis = await analyzeFinancialPerformance(serviceFactory, startDate, endDate, args);
        break;
        
      case 'crm':
        analysis = await analyzeCRMPerformance(serviceFactory, startDate, endDate, args);
        break;
        
      case 'properties':
        analysis = await analyzePropertiesPerformance(serviceFactory, startDate, endDate, args);
        break;
        
      default: // overall
        analysis = await analyzeOverallPerformance(serviceFactory, startDate, endDate, args);
    }

    // Adicionar insights de IA se solicitado
    if (args.includeAiInsights) {
      analysis.aiInsights = await generateAIInsights(analysis, tenantId);
    }

    // Comparação com período anterior se solicitado
    if (args.compareWithPrevious) {
      const periodLength = differenceInDays(endDate, startDate);
      const previousStart = subDays(startDate, periodLength + 1);
      const previousEnd = subDays(startDate, 1);
      
      const previousAnalysis = await analyzeSimplePerformance(serviceFactory, previousStart, previousEnd, args.analysisType);
      analysis.comparison = {
        previous: previousAnalysis,
        improvements: comparePerformance(analysis, previousAnalysis)
      };
    }

    logger.info('✅ [Analytics] Análise de performance concluída', {
      tenantId,
      analysisType: args.analysisType,
      performanceScore: analysis.performanceScore,
      insightsCount: analysis.insights.length,
      recommendationsCount: analysis.recommendations.length
    });

    return {
      success: true,
      message: `Análise de performance ${args.analysisType} concluída`,
      analysis,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [Analytics] Erro na análise de performance', error instanceof Error ? error : undefined, {
      tenantId,
      analysisType: args.analysisType,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro na análise: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

// ===== HELPER FUNCTIONS FOR ANALYTICS =====

async function generateFinancialReport(serviceFactory: any, startDate: Date, endDate: Date, args: GenerateReportArgs) {
  const transactions = await serviceFactory.transactions.getMany([
    { field: 'date', operator: '>=', value: startDate },
    { field: 'date', operator: '<=', value: endDate }
  ]);

  const totalRevenue = transactions
    .filter((t: Transaction) => t.type === 'income' && t.status === 'completed')
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t: Transaction) => t.type === 'expense' && t.status === 'completed')
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  return {
    reportType: 'financial',
    summary: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      transactionCount: transactions.length,
      averageTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0
    },
    insights: [
      totalRevenue > totalExpenses ? 'Período lucrativo com resultado positivo' : 'Atenção: despesas superiores à receita',
      `Foram processadas ${transactions.length} transações no período`
    ],
    recommendations: [
      totalExpenses > totalRevenue * 0.7 ? 'Considere revisar e otimizar custos operacionais' : 'Margem de lucro saudável',
      'Continue monitorando o fluxo de caixa regularmente'
    ]
  };
}

async function generateCRMReport(serviceFactory: any, startDate: Date, endDate: Date, args: GenerateReportArgs) {
  const leads = await serviceFactory.leads.getMany([
    { field: 'createdAt', operator: '>=', value: startDate },
    { field: 'createdAt', operator: '<=', value: endDate }
  ]);

  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: Lead) => l.status === LeadStatus.WON).length;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  return {
    reportType: 'crm',
    summary: {
      totalLeads,
      convertedLeads,
      conversionRate,
      averageScore: leads.reduce((sum: number, l: Lead) => sum + (l.score || 0), 0) / totalLeads || 0,
      hotLeads: leads.filter((l: Lead) => l.temperature === 'hot').length
    },
    insights: [
      `Taxa de conversão de ${conversionRate.toFixed(1)}% ${conversionRate > 15 ? '(excelente)' : conversionRate > 8 ? '(boa)' : '(pode melhorar)'}`,
      `${leads.filter((l: Lead) => l.temperature === 'hot').length} leads quentes necessitam atenção prioritária`
    ],
    recommendations: [
      conversionRate < 10 ? 'Implemente estratégias de nurturing para melhorar conversão' : 'Mantenha o bom trabalho de conversão',
      'Foque nos leads quentes para maximizar resultados'
    ]
  };
}

async function calculateRevenueMetrics(serviceFactory: any, startDate: Date, endDate: Date, args: TrackMetricsArgs) {
  const transactions = await serviceFactory.transactions.getMany([
    { field: 'date', operator: '>=', value: startDate },
    { field: 'date', operator: '<=', value: endDate },
    { field: 'type', operator: '==', value: 'income' },
    { field: 'status', operator: '==', value: 'completed' }
  ]);

  const totalRevenue = transactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
  
  return {
    metricType: 'revenue',
    value: totalRevenue,
    trend: 'positive', // Simplificado, poderia calcular baseado em comparação
    insights: [
      `Receita total de R$ ${totalRevenue.toLocaleString('pt-BR')} no período`,
      `Média de R$ ${(totalRevenue / Math.max(transactions.length, 1)).toLocaleString('pt-BR')} por transação`
    ],
    breakdown: {
      transactionCount: transactions.length,
      averageTicket: totalRevenue / Math.max(transactions.length, 1)
    }
  };
}

async function calculateConversionMetrics(serviceFactory: any, startDate: Date, endDate: Date, args: TrackMetricsArgs) {
  const leads = await serviceFactory.leads.getAll();
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: Lead) => l.status === LeadStatus.WON).length;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  return {
    metricType: 'conversion',
    value: conversionRate,
    trend: conversionRate > 15 ? 'positive' : conversionRate > 8 ? 'neutral' : 'negative',
    insights: [
      `Taxa de conversão atual: ${conversionRate.toFixed(1)}%`,
      `${convertedLeads} leads convertidos de ${totalLeads} total`
    ],
    breakdown: {
      totalLeads,
      convertedLeads,
      pipelineHealth: conversionRate > 10 ? 'saudável' : 'precisa atenção'
    }
  };
}

function calculateGrowthMetrics(current: any, previous: any) {
  const growth: any = {};
  
  for (const key in current) {
    if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
      const currentValue = current[key];
      const previousValue = previous[key];
      
      if (previousValue !== 0) {
        growth[key] = ((currentValue - previousValue) / previousValue) * 100;
      } else {
        growth[key] = currentValue > 0 ? 100 : 0;
      }
    }
  }
  
  return growth;
}

async function generateSimpleReport(serviceFactory: any, startDate: Date, endDate: Date, reportType: string) {
  // Versão simplificada para comparação
  const transactions = await serviceFactory.transactions.getMany([
    { field: 'date', operator: '>=', value: startDate },
    { field: 'date', operator: '<=', value: endDate }
  ]);

  const totalRevenue = transactions
    .filter((t: Transaction) => t.type === 'income' && t.status === 'completed')
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  return {
    summary: {
      totalRevenue,
      transactionCount: transactions.length
    }
  };
}

// ===== FUNÇÕES CRM MANAGEMENT =====

/**
 * FUNÇÃO CRM 1: Criar novo lead (chamada automaticamente no primeiro contato WhatsApp)
 */
export async function createLead(args: CreateLeadArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🎯 [CRM] create_lead iniciada', {
      tenantId,
      phone: args.phone,
      source: args.source || 'whatsapp_ai'
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    
    // Verificar se lead já existe com este telefone
    const existingLeads = await leadService.getMany([
      { field: 'phone', operator: '==', value: args.phone }
    ]);

    if (existingLeads.length > 0) {
      logger.info('🔄 [CRM] Lead já existe, retornando existente', {
        tenantId,
        phone: args.phone,
        existingLeadId: existingLeads[0].id
      });

      return {
        success: true,
        message: 'Lead já existe no sistema',
        lead: existingLeads[0],
        action: 'found_existing',
        tenantId
      };
    }

    // Criar novo lead
    const now = new Date();
    const newLead: Partial<Lead> = {
      tenantId,
      name: args.name || 'Lead WhatsApp',
      email: args.email || '', // Firestore não aceita undefined
      phone: args.phone,
      whatsappNumber: args.whatsappNumber || args.phone,
      
      // Status inicial
      status: LeadStatus.NEW,
      source: args.source === 'whatsapp_ai' ? 'whatsapp_ai' : args.source || 'whatsapp_ai',
      sourceDetails: args.sourceDetails || 'Primeiro contato via WhatsApp AI',
      
      // Pontuação inicial
      score: 25, // Score inicial baixo, aumenta com interações
      temperature: 'warm', // Começa warm por ser WhatsApp
      qualificationCriteria: {
        budget: false,
        authority: false,
        need: false,
        timeline: false
      },
      
      // Preferências iniciais
      preferences: args.preferences || {},
      
      // Dados de contato
      firstContactDate: now,
      lastContactDate: now,
      totalInteractions: 1,
      
      // Metadata
      tags: ['whatsapp', 'new_contact'],
      createdAt: now,
      updatedAt: now
    };

    const leadId = await leadService.create(newLead);

    // Registrar interação inicial
    if (args.initialInteraction) {
      const interactionService = serviceFactory.interactions;
      await interactionService.create({
        leadId,
        tenantId,
        type: InteractionType.WHATSAPP_MESSAGE,
        channel: 'whatsapp',
        direction: 'inbound',
        content: args.initialInteraction,
        userId: 'sofia-ai',
        userName: 'Sofia AI',
        sentiment: 'neutral',
        createdAt: now,
        updatedAt: now
      });
    }

    logger.info('✅ [CRM] Lead criado com sucesso', {
      tenantId,
      leadId,
      phone: args.phone,
      name: args.name
    });

    const createdLead = await leadService.getById(leadId);

    return {
      success: true,
      message: 'Lead criado com sucesso',
      lead: createdLead,
      leadId,
      action: 'created',
      tenantId
    };

  } catch (error) {
    logger.error('❌ [CRM] Erro ao criar lead', error instanceof Error ? error : undefined, {
      tenantId,
      phone: args.phone,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao criar lead: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO CRM 2: Atualizar informações do lead
 */
export async function updateLead(args: UpdateLeadArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🔄 [CRM] update_lead iniciada', {
      tenantId,
      leadId: args.leadId,
      clientPhone: args.clientPhone,
      updateKeys: Object.keys(args.updates)
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    
    let leadId = args.leadId;
    
    // Se não tem leadId, buscar por telefone
    if (!leadId && args.clientPhone) {
      const leads = await leadService.getMany([
        { field: 'phone', operator: '==', value: args.clientPhone }
      ]);
      
      if (leads.length === 0) {
        return {
          success: false,
          error: 'Lead não encontrado com este telefone',
          tenantId
        };
      }
      
      leadId = leads[0].id;
    }
    
    if (!leadId) {
      return {
        success: false,
        error: 'leadId ou clientPhone obrigatório',
        tenantId
      };
    }

    // Buscar lead atual
    const currentLead = await leadService.getById(leadId);
    if (!currentLead) {
      return {
        success: false,
        error: 'Lead não encontrado',
        tenantId
      };
    }

    // Preparar updates
    const updates: Partial<Lead> = {
      ...args.updates,
      updatedAt: new Date()
    };

    // Atualizar interações se mudou status
    if (args.updates.status && args.updates.status !== currentLead.status) {
      updates.lastContactDate = new Date();
    }

    // Atualizar score baseado em novas informações
    if (args.updates.preferences || args.updates.email || args.updates.name) {
      let scoreBonus = 0;
      if (args.updates.email && !currentLead.email) scoreBonus += 10;
      if (args.updates.name && currentLead.name === 'Lead WhatsApp') scoreBonus += 10;
      if (args.updates.preferences) scoreBonus += 15;
      
      updates.score = Math.min((currentLead.score || 0) + scoreBonus, 100);
    }

    // Executar update
    await leadService.update(leadId, updates);

    const updatedLead = await leadService.getById(leadId);

    logger.info('✅ [CRM] Lead atualizado com sucesso', {
      tenantId,
      leadId,
      updatedFields: Object.keys(updates),
      newScore: updatedLead?.score
    });

    return {
      success: true,
      message: 'Lead atualizado com sucesso',
      lead: updatedLead,
      leadId,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [CRM] Erro ao atualizar lead', error instanceof Error ? error : undefined, {
      tenantId,
      leadId: args.leadId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao atualizar lead: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO CRM 3: Criar tarefa de follow-up
 */
export async function createTask(args: CreateTaskArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📋 [CRM] create_task iniciada', {
      tenantId,
      leadId: args.leadId,
      clientId: args.clientId,
      title: args.title,
      type: args.type,
      priority: args.priority
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const taskService = serviceFactory.tasks;
    
    if (!args.leadId && !args.clientId) {
      return {
        success: false,
        error: 'leadId ou clientId obrigatório',
        tenantId
      };
    }

    const now = new Date();
    const dueDate = new Date(args.dueDate);
    const reminderDate = args.reminderDate ? new Date(args.reminderDate) : undefined;

    const newTask = {
      tenantId,
      title: args.title,
      description: args.description,
      type: args.type,
      priority: args.priority as any,
      
      // Assignment
      assignedTo: args.assignedTo || 'sofia-ai',
      assignedBy: 'sofia-ai',
      leadId: args.leadId,
      clientId: args.clientId,
      
      // Scheduling
      dueDate,
      reminderDate,
      
      // Status
      status: 'pending' as any,
      
      // Metadata
      tags: [args.type, `priority_${args.priority}`],
      notes: args.notes,
      createdAt: now,
      updatedAt: now
    };

    const taskId = await taskService.create(newTask);

    logger.info('✅ [CRM] Task criada com sucesso', {
      tenantId,
      taskId,
      title: args.title,
      dueDate: args.dueDate
    });

    const createdTask = await taskService.getById(taskId);

    return {
      success: true,
      message: 'Task criada com sucesso',
      task: createdTask,
      taskId,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [CRM] Erro ao criar task', error instanceof Error ? error : undefined, {
      tenantId,
      leadId: args.leadId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao criar task: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

/**
 * FUNÇÃO CRM 4: Atualizar status de tarefa
 */
export async function updateTask(args: UpdateTaskArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📝 [CRM] update_task iniciada', {
      tenantId,
      taskId: args.taskId,
      updateKeys: Object.keys(args.updates)
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const taskService = serviceFactory.tasks;
    
    // Buscar task atual
    const currentTask = await taskService.getById(args.taskId);
    if (!currentTask) {
      return {
        success: false,
        error: 'Task não encontrada',
        tenantId
      };
    }

    // Preparar updates
    const updates: any = {
      ...args.updates,
      updatedAt: new Date()
    };

    // Se completando task, adicionar timestamp
    if (args.updates.status === 'completed' && !args.updates.completedAt) {
      updates.completedAt = new Date();
    }

    // Executar update
    await taskService.update(args.taskId, updates);

    const updatedTask = await taskService.getById(args.taskId);

    logger.info('✅ [CRM] Task atualizada com sucesso', {
      tenantId,
      taskId: args.taskId,
      newStatus: args.updates.status,
      completed: args.updates.status === 'completed'
    });

    return {
      success: true,
      message: 'Task atualizada com sucesso',
      task: updatedTask,
      taskId: args.taskId,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [CRM] Erro ao atualizar task', error instanceof Error ? error : undefined, {
      tenantId,
      taskId: args.taskId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: `Erro ao atualizar task: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

// ===== FUNÇÕES CRÍTICAS IMPLEMENTADAS =====

// Função para cancelar reserva
export async function cancelReservation(args: CancelReservationArgs, tenantId: string) {
  try {
    logger.info('🚫 [CancelReservation] Iniciando cancelamento', {
      tenantId,
      hasReservationId: !!args.reservationId,
      hasClientPhone: !!args.clientPhone
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const reservationService = serviceFactory.reservations;
    
    // Buscar reserva por ID ou telefone do cliente
    let reservation;
    if (args.reservationId) {
      reservation = await reservationService.getById(args.reservationId);
    } else if (args.clientPhone) {
      // Buscar última reserva ativa do cliente
      const reservations = await reservationService.getAll({
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 1
      });
      
      reservation = reservations.find(r => 
        r.clientPhone === args.clientPhone && 
        ['pending', 'confirmed'].includes(r.status)
      );
    }

    if (!reservation) {
      return {
        success: false,
        error: 'Reserva não encontrada ou já cancelada',
        tenantId
      };
    }

    // Atualizar status para cancelada
    await reservationService.update(reservation.id, {
      status: 'cancelled' as ReservationStatus,
      cancelledAt: new Date(),
      cancellationReason: args.reason || 'Solicitado pelo cliente',
      refundAmount: args.refundAmount,
      refundPercentage: args.refundPercentage,
      updatedAt: new Date()
    });

    logger.info('✅ [CancelReservation] Reserva cancelada', {
      reservationId: reservation.id,
      propertyName: reservation.propertyName
    });

    return {
      success: true,
      data: {
        reservationId: reservation.id,
        propertyName: reservation.propertyName,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        status: 'cancelled',
        refundAmount: args.refundAmount,
        message: 'Reserva cancelada com sucesso'
      },
      tenantId
    };

  } catch (error) {
    logger.error('❌ [CancelReservation] Erro', { error, tenantId });
    return {
      success: false,
      error: 'Erro ao cancelar reserva',
      tenantId
    };
  }
}

// Função para modificar reserva
export async function modifyReservation(args: ModifyReservationArgs, tenantId: string) {
  try {
    logger.info('✏️ [ModifyReservation] Iniciando modificação', {
      tenantId,
      hasReservationId: !!args.reservationId,
      updates: Object.keys(args.updates || {})
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const reservationService = serviceFactory.reservations;
    
    // Buscar reserva
    let reservation;
    if (args.reservationId) {
      reservation = await reservationService.getById(args.reservationId);
    } else if (args.clientPhone) {
      const reservations = await reservationService.getAll({
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 1
      });
      
      reservation = reservations.find(r => 
        r.clientPhone === args.clientPhone && 
        ['pending', 'confirmed'].includes(r.status)
      );
    }

    if (!reservation) {
      return {
        success: false,
        error: 'Reserva não encontrada ou não pode ser modificada',
        tenantId
      };
    }

    // Aplicar modificações
    const updates: any = {
      ...args.updates,
      updatedAt: new Date()
    };

    // Se mudou datas, recalcular preço
    if (args.updates.checkIn || args.updates.checkOut) {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const propertyService = serviceFactory.properties;
      const property = await propertyService.get(reservation.propertyId);
      
      if (property) {
        const checkIn = args.updates.checkIn || reservation.checkIn;
        const checkOut = args.updates.checkOut || reservation.checkOut;
        const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
        
        updates.totalPrice = property.basePrice * nights;
        updates.nights = nights;
      }
    }

    await reservationService.update(reservation.id, updates);

    logger.info('✅ [ModifyReservation] Reserva modificada', {
      reservationId: reservation.id,
      modifications: Object.keys(args.updates || {})
    });

    return {
      success: true,
      data: {
        reservationId: reservation.id,
        propertyName: reservation.propertyName,
        updates: args.updates,
        message: 'Reserva modificada com sucesso'
      },
      tenantId
    };

  } catch (error) {
    logger.error('❌ [ModifyReservation] Erro', { error, tenantId });
    return {
      success: false,
      error: 'Erro ao modificar reserva',
      tenantId
    };
  }
}

// Função para obter políticas
export async function getPolicies(args: GetPoliciesArgs, tenantId: string) {
  try {
    logger.info('📋 [GetPolicies] Buscando políticas', {
      tenantId,
      policyType: args.policyType || 'all'
    });

    const policies: any = {
      cancellation: {
        title: 'Política de Cancelamento',
        rules: [
          'Cancelamento até 7 dias antes: reembolso total',
          'Cancelamento entre 3-7 dias: reembolso de 50%',
          'Cancelamento com menos de 3 dias: sem reembolso',
          'Casos de força maior serão analisados individualmente'
        ]
      },
      payment: {
        title: 'Política de Pagamento',
        rules: [
          'Pagamento de 30% no ato da reserva',
          'Restante até 24h antes do check-in',
          'Aceitamos Pix, cartão de crédito e débito',
          'Parcelamento em até 3x sem juros no cartão'
        ]
      },
      check_in: {
        title: 'Política de Check-in/Check-out',
        rules: [
          'Check-in: a partir das 14h',
          'Check-out: até às 11h',
          'Late check-out sujeito a disponibilidade e taxa adicional',
          'Documento com foto obrigatório no check-in'
        ]
      },
      general: {
        title: 'Regras Gerais',
        rules: [
          'Proibido fumar dentro do imóvel',
          'Animais de estimação mediante consulta prévia',
          'Festas e eventos não permitidos',
          'Visitantes devem ser informados previamente',
          'Multa de R$ 500 por violação das regras'
        ]
      }
    };

    // Retornar política específica ou todas
    let selectedPolicies;
    if (args.policyType && args.policyType !== 'all') {
      selectedPolicies = { [args.policyType]: policies[args.policyType] };
    } else {
      selectedPolicies = policies;
    }

    return {
      success: true,
      data: {
        policies: selectedPolicies,
        propertyId: args.propertyId,
        message: 'Políticas recuperadas com sucesso'
      },
      tenantId
    };

  } catch (error) {
    logger.error('❌ [GetPolicies] Erro', { error, tenantId });
    return {
      success: false,
      error: 'Erro ao buscar políticas',
      tenantId
    };
  }
}

// Função para verificar disponibilidade
// CORRIGIDA: Agora usa AvailabilityService que é o sistema real de disponibilidade
export async function checkAvailability(args: CheckAvailabilityArgs, tenantId: string) {
  try {
    logger.info('🔍 [CheckAvailability] Verificando disponibilidade da propriedade', {
      tenantId,
      propertyName: args.propertyName,
      checkIn: args.checkIn,
      checkOut: args.checkOut
    });

    // 🔍 BUSCAR PROPRIEDADE POR NOME
    const property = await findPropertyByName(args.propertyName, tenantId);
    
    if (!property) {
      logger.warn('❌ [CheckAvailability] Propriedade não encontrada', {
        tenantId,
        propertyName: args.propertyName
      });
      return {
        success: false,
        error: `Propriedade "${args.propertyName}" não encontrada. Verifique o nome ou faça uma nova busca.`,
        tenantId
      };
    }

    logger.info('✅ [CheckAvailability] Propriedade encontrada', {
      tenantId,
      searchName: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id
    });

    // Converter datas de string para Date - Corrigir timezone
    const checkInDate = new Date(args.checkIn + 'T12:00:00-03:00');
    const checkOutDate = new Date(args.checkOut + 'T12:00:00-03:00');
    
    // Validar datas
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return {
        success: false,
        error: 'Formato de data inválido',
        tenantId
      };
    }

    if (checkInDate >= checkOutDate) {
      return {
        success: false,
        error: 'Data de check-in deve ser anterior à data de check-out',
        tenantId
      };
    }

    // Verificar se a propriedade está ativa
    if (!property.isActive) {
      return {
        success: true,
        available: false,
        propertyId: property.id,
        propertyName: property.title,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        reason: 'Propriedade não está ativa',
        message: 'Esta propriedade não está disponível para reservas no momento.',
        tenantId
      };
    }

    // 🎯 VERIFICAÇÃO INTELIGENTE DE DISPONIBILIDADE
    // Foco apenas em conflitos reais (reservas confirmadas)
    const serviceFactory = new TenantServiceFactory(tenantId);
    const reservationService = serviceFactory.reservations;
    
    const conflictingReservations = await reservationService.getMany([
      { field: 'propertyId', operator: '==', value: property.id },
      { field: 'status', operator: 'in', value: ['confirmed', 'pending'] },
      // Buscar reservas que se sobrepõem ao período solicitado
      { field: 'checkIn', operator: '<', value: checkOutDate },
      { field: 'checkOut', operator: '>', value: checkInDate }
    ]);

    const isAvailable = conflictingReservations.length === 0;
    
    // Log detalhado para debug
    logger.info('🔍 [CheckAvailability] Verificação inteligente', {
      tenantId,
      searchName: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id,
      dateRange: `${args.checkIn} a ${args.checkOut}`,
      conflictingReservations: conflictingReservations.length,
      reservationIds: conflictingReservations.map(r => r.id),
      available: isAvailable
    });

    // Calcular número de noites
    const totalNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Motivo da indisponibilidade (se houver)
    let unavailabilityReason = null;
    if (!isAvailable && conflictingReservations.length > 0) {
      const conflictReservation = conflictingReservations[0];
      unavailabilityReason = `Conflito com reserva ${conflictReservation.id.slice(-8)} (${new Date(conflictReservation.checkIn as Date).toLocaleDateString('pt-BR')} a ${new Date(conflictReservation.checkOut as Date).toLocaleDateString('pt-BR')})`;
    }
    
    logger.info('✅ [CheckAvailability] Verificação inteligente concluída', {
      tenantId: tenantId.substring(0, 8) + '***',
      searchName: args.propertyName,
      foundProperty: property.title,
      propertyId: property.id,
      available: isAvailable,
      totalNights,
      dateRange: `${args.checkIn} a ${args.checkOut}`,
      conflictingCount: conflictingReservations.length,
      unavailabilityReason
    });

    return {
      success: true,
      available: isAvailable,
      propertyId: property.id,
      propertyName: property.title,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalNights,
      reason: isAvailable ? null : (unavailabilityReason || 'Propriedade não disponível para as datas solicitadas'),
      message: isAvailable 
        ? `Propriedade "${property.title}" está DISPONÍVEL para as datas solicitadas (${totalNights} noites)!`
        : `Propriedade "${property.title}" está INDISPONÍVEL para o período de ${args.checkIn} a ${args.checkOut}${unavailabilityReason ? `. ${unavailabilityReason}` : ''}`,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [CheckAvailability] Erro ao verificar disponibilidade', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
      propertyName: args.propertyName
    });
    return {
      success: false,
      error: 'Erro ao verificar disponibilidade da propriedade',
      tenantId
    };
  }
}

// Função para agendar reunião/evento geral - USANDO MESMA ESTRUTURA DA scheduleVisit
export async function scheduleMeeting(args: any, tenantId: string) {
  try {
    logger.info('🤝 [ScheduleMeeting] Agendando evento/visita', {
      tenantId: tenantId.substring(0, 8) + '***',
      clientName: args.clientName,
      title: args.title,
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      propertyId: args.propertyId,
      fullArgs: args,
      argsKeys: Object.keys(args)
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const clientService = serviceFactory.clients;
    const visitService = serviceFactory.visits; // ✅ MESMA COLEÇÃO QUE scheduleVisit
    
    // Se tiver propertyId, buscar dados da propriedade
    let propertyData = null;
    if (args.propertyId) {
      const propertyService = serviceFactory.properties;
      propertyData = await propertyService.get(args.propertyId) as Property;
    }

    // Validar campos obrigatórios
    if (!args.clientName || !args.scheduledDate || !args.scheduledTime || !args.title) {
      return {
        success: false,
        error: 'Campos obrigatórios: clientName, scheduledDate, scheduledTime, title',
        tenantId
      };
    }

    // Parse da data e hora fornecidas
    const dateStr = args.scheduledDate; // YYYY-MM-DD
    const timeStr = args.scheduledTime; // HH:MM
    
    logger.info('📅 [ScheduleMeeting] Processando data e hora', {
      dateStr,
      timeStr,
      dateStrType: typeof dateStr,
      timeStrType: typeof timeStr
    });
    
    // Criar data/hora no timezone do Brasil (-03:00)
    const dateTimeString = dateStr + 'T' + timeStr + ':00-03:00';
    const scheduledDateTime = new Date(dateTimeString);
    
    logger.info('✅ [ScheduleMeeting] Data processada', {
      dateTimeString,
      scheduledDateTime: scheduledDateTime.toISOString(),
      scheduledDateTimeLocal: scheduledDateTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      isValidDate: !isNaN(scheduledDateTime.getTime())
    });

    // Resolver ou criar cliente (MESMA LÓGICA DA scheduleVisit)
    let clientId = args.clientId;
    
    if (!clientId && (args.clientPhone || args.clientName)) {
      // Tentar encontrar cliente existente por telefone
      if (args.clientPhone) {
        const existingClients = await clientService.getMany([
          { field: 'phone', operator: '==', value: args.clientPhone }
        ]) as Client[];
        
        if (existingClients.length > 0) {
          clientId = existingClients[0].id!;
          logger.info('✅ [ScheduleMeeting] Cliente existente encontrado', { tenantId, clientId });
        }
      }
      
      // Criar novo cliente se não encontrou
      if (!clientId) {
        const newClientData = {
          name: args.clientName,
          phone: args.clientPhone,
          whatsappNumber: args.clientPhone,
          tenantId
        };
        
        clientId = await clientService.create(newClientData);
        logger.info('✅ [ScheduleMeeting] Novo cliente criado', { tenantId, clientId });
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Cliente não identificado. Por favor, forneça nome e telefone.',
        tenantId
      };
    }

    // Obter dados do cliente para preenchimento completo
    const client = await clientService.get(clientId) as Client;

    // ✅ CRIAR EVENTO USANDO ESTRUTURA VisitAppointment (mesmo formato que scheduleVisit)
    const visitData: Omit<VisitAppointment, 'id'> = {
      tenantId,
      clientId,
      clientName: client?.name || args.clientName,
      clientPhone: client?.phone || args.clientPhone || '',
      
      // Se tem propertyId, é uma visita; senão, evento genérico
      propertyId: args.propertyId || 'GENERIC_EVENT',
      propertyName: propertyData?.title || args.title, // Usar título como "propriedade"
      propertyAddress: propertyData?.address || args.location || 'Local a definir',
      
      scheduledDate: scheduledDateTime,
      scheduledTime: args.scheduledTime,
      duration: args.duration || 60,
      status: VisitStatus.SCHEDULED,
      notes: args.description || `${args.title} - Agendado via IA`,
      source: 'whatsapp', // Mesmo source da scheduleVisit
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Campos específicos para eventos genéricos
      confirmedByClient: false,
      confirmedByAgent: false
    };

    // Salvar no banco (MESMA COLEÇÃO visits)
    logger.info('💾 [ScheduleMeeting] Salvando na coleção visits', {
      visitData: {
        ...visitData,
        tenantId: tenantId.substring(0, 8) + '***'
      },
      hasService: !!visitService
    });
    
    const visitId = await visitService.create(visitData);
    
    logger.info('✅ [ScheduleMeeting] Evento salvo na coleção visits', {
      visitId,
      tenantId: tenantId.substring(0, 8) + '***'
    });

    // Calcular horário de término baseado na duração
    const eventDuration = args.duration || 60;
    const endDateTime = new Date(scheduledDateTime.getTime() + (eventDuration * 60000)); // Adicionar minutos em ms
    const endTime = endDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Gerar mensagem de confirmação
    const confirmationMessage = `✅ ${propertyData ? 'Visita' : 'Evento'} agendado${propertyData ? 'a' : ''} com sucesso!
📅 Data: ${scheduledDateTime.toLocaleDateString('pt-BR')}
🕒 Horário: ${args.scheduledTime} - ${endTime} (${eventDuration}min)
👤 Cliente: ${args.clientName}
${propertyData ? `🏠 Propriedade: ${propertyData.title}` : `📋 Assunto: ${args.title}`}
${args.clientPhone ? `📱 Telefone: ${args.clientPhone}` : ''}

ID do agendamento: ${visitId}`;

    logger.info('✅ [ScheduleMeeting] Evento criado com sucesso', {
      tenantId: tenantId.substring(0, 8) + '***',
      visitId,
      scheduledDateTime: scheduledDateTime.toISOString(),
      clientName: args.clientName
    });

    return {
      success: true,
      data: {
        visitId, // Mudança: era meetingId, agora é visitId
        scheduledDate: args.scheduledDate,
        scheduledTime: args.scheduledTime,
        title: args.title,
        clientName: args.clientName,
        propertyName: propertyData?.title || args.title,
        confirmationMessage
      },
      tenantId
    };

  } catch (error) {
    logger.error('❌ [ScheduleMeeting] Erro ao agendar evento', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      args
    });

    return {
      success: false,
      error: 'Erro ao agendar evento. Tente novamente.',
      tenantId
    };
  }
}

// ===== TICKET SUPPORT FUNCTIONS =====

/**
 * FUNÇÃO: Criar ticket de suporte
 */
/* export async function createSupportTicket(args: CreateSupportTicketArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🎫 [TenantAgent] create_support_ticket iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      subject: args.subject,
      priority: args.priority,
      type: args.type,
      hasClientPhone: !!args.clientPhone
    });

    const ticketService = new TicketServiceV2(tenantId);
    
    // Determinar informações do usuário
    let userId = 'unknown';
    let userName = 'Usuário';
    let userEmail = 'naoforecido@exemplo.com';
    
    if (args.clientPhone) {
      // Buscar cliente pelo telefone para obter informações completas
      const serviceFactory = new TenantServiceFactory(tenantId);
      const clientService = serviceFactory.clients;
      
      const clients = await clientService.getMany([
        { field: 'phone', operator: '==', value: args.clientPhone }
      ]) as Client[];
      
      if (clients.length > 0) {
        const client = clients[0];
        userId = client.id || args.clientPhone;
        userName = client.name || 'Cliente';
        userEmail = client.email || args.userEmail || `${args.clientPhone}@whatsapp.com`;
      } else {
        userId = args.clientPhone;
        userName = args.userName || 'Cliente WhatsApp';
        userEmail = args.userEmail || `${args.clientPhone}@whatsapp.com`;
      }
    }
    
    // Mapear prioridade
    const priority = args.priority === 'high' ? TicketPriority.HIGH :
                    args.priority === 'low' ? TicketPriority.LOW :
                    TicketPriority.MEDIUM;
    
    // Mapear tipo
    const type = args.type === 'technical' ? TicketType.TECHNICAL :
                 args.type === 'billing' ? TicketType.BILLING :
                 args.type === 'feature_request' ? TicketType.FEATURE_REQUEST :
                 args.type === 'bug_report' ? TicketType.BUG_REPORT :
                 args.type === 'question' ? TicketType.QUESTION :
                 TicketType.SUPPORT;
    
    // Criar o ticket
    const ticket = await ticketService.createTicket(
      userId,
      userName,
      userEmail,
      {
        subject: args.subject,
        description: args.description,
        priority,
        type
      }
    );

    logger.info('✅ [TenantAgent] Ticket criado com sucesso', {
      tenantId: tenantId.substring(0, 8) + '***',
      ticketId: ticket.id,
      subject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status
    });

    return {
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        type: ticket.type,
        status: ticket.status,
        createdAt: ticket.createdAt
      },
      message: `Ticket #${ticket.id} criado com sucesso! Assunto: "${ticket.subject}". Status: ${ticket.status}`,
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro ao criar ticket', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao criar ticket de suporte. Tente novamente ou entre em contato com o administrador.',
      tenantId
    };
  }
} */

/**
 * FUNÇÃO: Buscar tickets do usuário
 */
/* export async function getUserTickets(args: GetUserTicketsArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📋 [TenantAgent] get_user_tickets iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      hasClientPhone: !!args.clientPhone,
      status: args.status,
      limit: args.limit
    });

    if (!args.clientPhone) {
      return {
        success: false,
        error: 'Telefone do cliente é necessário para buscar tickets.',
        tenantId
      };
    }

    const ticketService = new TicketServiceV2(tenantId);
    
    // Buscar cliente pelo telefone
    const serviceFactory = new TenantServiceFactory(tenantId);
    const clientService = serviceFactory.clients;
    
    const clients = await clientService.getMany([
      { field: 'phone', operator: '==', value: args.clientPhone }
    ]) as Client[];
    
    if (clients.length === 0) {
      return {
        success: true,
        tickets: [],
        message: 'Nenhum ticket encontrado para este número de telefone.',
        tenantId
      };
    }

    const client = clients[0];
    const userId = client.id || args.clientPhone;
    
    // Buscar tickets do usuário
    const tickets = await ticketService.getUserTickets(userId, args.limit || 10);
    
    // Filtrar por status se especificado
    let filteredTickets = tickets;
    if (args.status) {
      const statusMap = {
        'open': TicketStatus.OPEN,
        'in_progress': TicketStatus.IN_PROGRESS,
        'resolved': TicketStatus.RESOLVED,
        'closed': TicketStatus.CLOSED
      };
      filteredTickets = tickets.filter(ticket => ticket.status === statusMap[args.status!]);
    }

    logger.info('✅ [TenantAgent] Tickets encontrados', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId,
      ticketCount: filteredTickets.length,
      statusFilter: args.status
    });

    return {
      success: true,
      tickets: filteredTickets.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        unreadCount: ticket.unreadCount || 0
      })),
      total: filteredTickets.length,
      message: filteredTickets.length > 0 
        ? `Encontrados ${filteredTickets.length} ticket(s)`
        : 'Nenhum ticket encontrado com os critérios especificados.',
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro ao buscar tickets do usuário', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao buscar seus tickets. Tente novamente.',
      tenantId
    };
  }
} */

// ===== CRM ADVANCED FUNCTIONS =====

/**
 * FUNÇÃO: Analisar comportamento do lead com IA
 */
export async function analyzeLeadBehavior(args: AnalyzeLeadBehaviorArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🧠 [TenantAgent] analyze_lead_behavior iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      hasClientPhone: !!args.clientPhone,
      hasLeadId: !!args.leadId,
      includeAIPredictions: args.includeAIPredictions
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;

    let lead: Lead | null = null;

    // Encontrar lead
    if (args.leadId) {
      lead = await leadService.get(args.leadId) as Lead;
    } else if (args.clientPhone) {
      const leads = await leadService.getMany([
        { field: 'phone', operator: '==', value: args.clientPhone }
      ]) as Lead[];
      lead = leads.length > 0 ? leads[0] : null;
    }

    if (!lead) {
      return {
        success: false,
        error: 'Lead não encontrado. Verifique o telefone ou ID fornecido.',
        tenantId
      };
    }

    // Analisar padrões de interação
    const interactions = lead.interactions || [];
    const totalInteractions = interactions.length;
    const positiveInteractions = interactions.filter(i => i.response === 'positive').length;
    const engagementRate = totalInteractions > 0 ? (positiveInteractions / totalInteractions) * 100 : 0;

    // Analisar frequência de contato
    const lastInteraction = interactions[interactions.length - 1];
    const daysSinceLastContact = lastInteraction 
      ? Math.floor((Date.now() - (lastInteraction.date?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24))
      : 999;

    // Analisar padrão temporal
    const contactHours = interactions.map(i => i.date?.toDate().getHours() || 9);
    const preferredHour = contactHours.length > 0 
      ? Math.round(contactHours.reduce((a, b) => a + b, 0) / contactHours.length)
      : 9;

    const preferredPeriod = preferredHour < 12 ? 'manhã' : 
                           preferredHour < 18 ? 'tarde' : 'noite';

    // Calcular score de qualificação
    let qualificationScore = (lead.score || 0);
    
    // Ajustes baseados em comportamento
    if (engagementRate > 70) qualificationScore += 10;
    else if (engagementRate < 30) qualificationScore -= 10;

    if (daysSinceLastContact <= 7) qualificationScore += 5;
    else if (daysSinceLastContact > 30) qualificationScore -= 15;

    qualificationScore = Math.max(0, Math.min(100, qualificationScore));

    // Identificar padrões de interesse
    const interestPatterns = [];
    if (interactions.some(i => i.description?.includes('preço'))) {
      interestPatterns.push('Sensível a preço');
    }
    if (interactions.some(i => i.description?.includes('localização'))) {
      interestPatterns.push('Focado em localização');
    }
    if (interactions.some(i => i.description?.includes('financiamento'))) {
      interestPatterns.push('Precisa de financiamento');
    }
    if (interactions.some(i => i.description?.includes('urgente'))) {
      interestPatterns.push('Tem urgência');
    }

    // Prever próxima ação mais eficaz
    let nextBestAction = 'Enviar mensagem de follow-up';
    let actionReason = 'Ação padrão de relacionamento';

    if (lead.temperature === 'hot' && daysSinceLastContact <= 3) {
      nextBestAction = 'Ligar para agendar visita presencial';
      actionReason = 'Lead quente com interesse recente';
    } else if (engagementRate > 70 && lead.status === 'contacted') {
      nextBestAction = 'Enviar proposta personalizada';
      actionReason = 'Alto engajamento indica prontidão para proposta';
    } else if (daysSinceLastContact > 14) {
      nextBestAction = 'Reativar com conteúdo relevante';
      actionReason = 'Lead inativo precisa de reativação';
    } else if (lead.budget && (lead.budget > 0)) {
      nextBestAction = 'Apresentar opções dentro do orçamento';
      actionReason = 'Lead tem orçamento definido';
    }

    const analysis = {
      leadInfo: {
        id: lead.id,
        name: lead.name,
        status: lead.status,
        temperature: lead.temperature,
        score: qualificationScore,
        originalScore: lead.score || 0
      },
      behavior: {
        totalInteractions,
        engagementRate: Math.round(engagementRate),
        daysSinceLastContact,
        preferredContactPeriod: preferredPeriod,
        interestPatterns
      },
      insights: {
        behaviorType: engagementRate > 70 ? 'Altamente engajado' :
                     engagementRate > 40 ? 'Moderadamente interessado' :
                     engagementRate > 10 ? 'Baixo interesse' : 'Desengajado',
        riskLevel: daysSinceLastContact > 30 ? 'Alto' :
                   daysSinceLastContact > 14 ? 'Médio' : 'Baixo',
        conversionProbability: Math.round(qualificationScore),
        recommendedPriority: qualificationScore > 70 ? 'Alta' :
                            qualificationScore > 50 ? 'Média' : 'Baixa'
      },
      recommendations: {
        nextBestAction,
        actionReason,
        bestContactTime: preferredPeriod,
        suggestedChannel: lead.preferredContactMethods?.[0] || 'whatsapp',
        followUpSchedule: daysSinceLastContact > 7 ? 'Imediato' :
                         lead.temperature === 'hot' ? '2-3 dias' : '1 semana'
      }
    };

    logger.info('✅ [TenantAgent] Análise de comportamento concluída', {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId: lead.id,
      engagementRate: Math.round(engagementRate),
      qualificationScore
    });

    return {
      success: true,
      analysis,
      message: `Análise de comportamento concluída para ${lead.name}. ${analysis.insights.behaviorType} com ${analysis.insights.conversionProbability}% de probabilidade de conversão.`,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [TenantAgent] Erro ao analisar comportamento do lead', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao analisar comportamento do lead. Tente novamente.',
      tenantId
    };
  }
}

/**
 * FUNÇÃO: Atualizar temperatura do lead baseado em comportamento
 */
export async function updateLeadTemperature(args: UpdateLeadTemperatureArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🌡️ [TenantAgent] update_lead_temperature iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      temperature: args.temperature,
      hasReason: !!args.reason
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;

    let lead: Lead | null = null;

    // Encontrar lead
    if (args.leadId) {
      lead = await leadService.get(args.leadId) as Lead;
    } else if (args.clientPhone) {
      const leads = await leadService.getMany([
        { field: 'phone', operator: '==', value: args.clientPhone }
      ]) as Lead[];
      lead = leads.length > 0 ? leads[0] : null;
    }

    if (!lead) {
      return {
        success: false,
        error: 'Lead não encontrado para atualizar temperatura.',
        tenantId
      };
    }

    const oldTemperature = lead.temperature;

    // Atualizar temperatura
    await leadService.update(lead.id, {
      temperature: args.temperature,
      updatedAt: new Date(),
      notes: [
        ...(lead.notes || []),
        {
          content: `Temperatura alterada de ${oldTemperature} para ${args.temperature}. ${args.reason ? `Motivo: ${args.reason}` : ''}`,
          createdAt: new Date(),
          createdBy: 'IA Agent'
        }
      ]
    });

    // Recalcular score se necessário
    let newScore = lead.score || 0;
    if (args.temperature === 'hot') {
      newScore = Math.min(100, newScore + 20);
    } else if (args.temperature === 'warm') {
      newScore = Math.max(30, Math.min(80, newScore + 5));
    } else if (args.temperature === 'cold') {
      newScore = Math.max(10, newScore - 15);
    }

    if (newScore !== lead.score) {
      await leadService.update(lead.id, { score: newScore });
    }

    logger.info('✅ [TenantAgent] Temperatura do lead atualizada', {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId: lead.id,
      oldTemperature,
      newTemperature: args.temperature,
      newScore
    });

    return {
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        oldTemperature,
        newTemperature: args.temperature,
        newScore
      },
      message: `Temperatura do lead ${lead.name} alterada de ${oldTemperature} para ${args.temperature}. Score atualizado para ${newScore}.`,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [TenantAgent] Erro ao atualizar temperatura do lead', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao atualizar temperatura do lead. Tente novamente.',
      tenantId
    };
  }
}

/**
 * FUNÇÃO: Prever conversão com IA
 */
export async function predictConversion(args: PredictConversionArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🎯 [TenantAgent] predict_conversion iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      hasClientPhone: !!args.clientPhone,
      includeRecommendations: args.includeRecommendations
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    const clientService = serviceFactory.clients;

    let lead: Lead | null = null;

    // Encontrar lead
    if (args.leadId) {
      lead = await leadService.get(args.leadId) as Lead;
    } else if (args.clientPhone) {
      const leads = await leadService.getMany([
        { field: 'phone', operator: '==', value: args.clientPhone }
      ]) as Lead[];
      lead = leads.length > 0 ? leads[0] : null;
    }

    if (!lead) {
      return {
        success: false,
        error: 'Lead não encontrado para análise preditiva.',
        tenantId
      };
    }

    // Buscar histórico para comparação
    const [allLeads, allClients] = await Promise.all([
      leadService.getMany([]) as Promise<Lead[]>,
      clientService.getMany([]) as Promise<Client[]>
    ]);

    // Calcular probabilidade baseada em fatores múltiplos
    let probability = 50; // Base

    // Fator score (peso: 25%)
    const scoreWeight = (lead.score || 0) / 100 * 25;
    probability += scoreWeight - 12.5; // Normalizar

    // Fator temperatura (peso: 20%)
    const tempWeight = lead.temperature === 'hot' ? 20 : 
                      lead.temperature === 'warm' ? 10 : -5;
    probability += tempWeight;

    // Fator status (peso: 15%)
    const statusWeights = {
      'new': -5,
      'contacted': 0,
      'qualified': 10,
      'nurturing': 5,
      'proposal_sent': 15,
      'negotiating': 20,
      'won': 100,
      'lost': 0
    };
    probability += statusWeights[lead.status] || 0;

    // Fator engajamento (peso: 15%)
    const interactions = lead.interactions || [];
    const positiveRate = interactions.length > 0 
      ? (interactions.filter(i => i.response === 'positive').length / interactions.length) * 15
      : 0;
    probability += positiveRate;

    // Fator tempo (peso: 10%)
    const daysSinceCreated = Math.floor((Date.now() - (lead.createdAt?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24));
    const timeWeight = daysSinceCreated > 60 ? -10 : 
                      daysSinceCreated > 30 ? -5 : 0;
    probability += timeWeight;

    // Fator fonte (peso: 10%)
    const sourceClients = allClients.filter(c => c.source === lead.source).length;
    const sourceLeads = allLeads.filter(l => l.source === lead.source).length;
    const sourceConversionRate = sourceLeads > 0 ? sourceClients / sourceLeads : 0.1;
    const sourceWeight = (sourceConversionRate - 0.15) * 20; // Normalizar
    probability += sourceWeight;

    // Fator orçamento (peso: 5%)
    const budgetWeight = lead.budget && lead.budget > 0 ? 5 : -2;
    probability += budgetWeight;

    // Limitar entre 0-100
    probability = Math.max(0, Math.min(100, Math.round(probability)));

    // Calcular confiança da predição
    const confidence = Math.min(100, Math.max(40, 
      (interactions.length * 5) + 
      (lead.score || 0) * 0.3 + 
      40
    ));

    // Estimar tempo para conversão
    const estimatedDays = lead.temperature === 'hot' ? 7 :
                         lead.temperature === 'warm' ? 21 :
                         45;

    // Fatores de risco
    const riskFactors = [];
    const lastInteraction = interactions[interactions.length - 1];
    const daysSinceLastContact = lastInteraction 
      ? Math.floor((Date.now() - (lastInteraction.date?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastContact > 14) riskFactors.push('Muito tempo sem contato');
    if ((lead.score || 0) < 40) riskFactors.push('Score baixo');
    if (interactions.filter(i => i.response === 'negative').length >= 3) riskFactors.push('Múltiplas interações negativas');

    // Oportunidades
    const opportunities = [];
    if ((lead.score || 0) > 70 && lead.status === 'contacted') opportunities.push('Lead qualificado pronto para proposta');
    if (lead.budget && lead.budget > 0) opportunities.push('Orçamento definido facilita fechamento');
    if (lead.scheduledFollowUp) opportunities.push('Follow-up agendado');

    const prediction = {
      leadInfo: {
        id: lead.id,
        name: lead.name,
        status: lead.status,
        temperature: lead.temperature,
        score: lead.score || 0
      },
      prediction: {
        conversionProbability: probability,
        confidence,
        estimatedTimeToConversion: estimatedDays,
        category: probability > 80 ? 'Muito Alta' :
                 probability > 60 ? 'Alta' :
                 probability > 40 ? 'Média' :
                 probability > 20 ? 'Baixa' : 'Muito Baixa'
      },
      factors: {
        riskFactors,
        opportunities,
        keyDrivers: [
          `Score: ${lead.score || 0}/100`,
          `Temperatura: ${lead.temperature}`,
          `Engajamento: ${Math.round(positiveRate)}%`,
          `Fonte: ${lead.source} (${Math.round(sourceConversionRate * 100)}% conversão)`
        ]
      }
    };

    // Adicionar recomendações se solicitado
    if (args.includeRecommendations) {
      const recommendations = [];

      if (probability > 70) {
        recommendations.push('Acelerar processo - lead tem alta probabilidade');
        recommendations.push('Agendar reunião presencial');
        recommendations.push('Preparar proposta personalizada');
      } else if (probability > 40) {
        recommendations.push('Qualificar melhor as necessidades');
        recommendations.push('Aumentar frequência de contato');
        recommendations.push('Enviar conteúdo educativo');
      } else {
        recommendations.push('Reavaliar fit do cliente');
        recommendations.push('Investigar objeções');
        recommendations.push('Considerar nurturing de longo prazo');
      }

      if (riskFactors.length > 0) {
        recommendations.push('Mitigar fatores de risco identificados');
      }

      prediction.recommendations = recommendations;
    }

    logger.info('✅ [TenantAgent] Predição de conversão concluída', {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId: lead.id,
      probability,
      confidence
    });

    return {
      success: true,
      prediction,
      message: `Análise preditiva concluída para ${lead.name}. Probabilidade de conversão: ${probability}% (confiança: ${confidence}%).`,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [TenantAgent] Erro na predição de conversão', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao calcular predição de conversão. Tente novamente.',
      tenantId
    };
  }
}

/**
 * FUNÇÃO: Segmentar clientes por diversos critérios
 */
export async function segmentCustomers(args: SegmentCustomersArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🎯 [TenantAgent] segment_customers iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      segmentType: args.segmentType
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    const clientService = serviceFactory.clients;

    const [leads, clients] = await Promise.all([
      leadService.getMany([]) as Promise<Lead[]>,
      clientService.getMany([]) as Promise<Client[]>
    ]);

    let segments: Array<{
      name: string;
      description: string;
      count: number;
      leads: Lead[];
      characteristics: string[];
      recommendedActions: string[];
    }> = [];

    switch (args.segmentType) {
      case 'behavior':
        segments = [
          {
            name: 'Altamente Engajados',
            description: 'Leads com alta taxa de resposta e interação',
            count: 0,
            leads: leads.filter(l => {
              const interactions = l.interactions || [];
              const positiveRate = interactions.length > 0 ? 
                interactions.filter(i => i.response === 'positive').length / interactions.length : 0;
              return positiveRate > 0.7 && interactions.length >= 3;
            }),
            characteristics: ['Taxa de resposta > 70%', 'Múltiplas interações positivas', 'Resposta rápida'],
            recommendedActions: ['Acelerar processo de venda', 'Agendar reuniões presenciais', 'Priorizar atendimento']
          },
          {
            name: 'Moderadamente Interessados',
            description: 'Leads com interesse demonstrado mas engajamento médio',
            count: 0,
            leads: leads.filter(l => {
              const interactions = l.interactions || [];
              const positiveRate = interactions.length > 0 ? 
                interactions.filter(i => i.response === 'positive').length / interactions.length : 0;
              return positiveRate >= 0.3 && positiveRate <= 0.7;
            }),
            characteristics: ['Taxa de resposta média', 'Interesse seletivo', 'Precisa de nurturing'],
            recommendedActions: ['Conteúdo educativo', 'Follow-up regular', 'Qualificação aprofundada']
          },
          {
            name: 'Baixo Engajamento',
            description: 'Leads com pouca interação ou respostas negativas',
            count: 0,
            leads: leads.filter(l => {
              const interactions = l.interactions || [];
              const positiveRate = interactions.length > 0 ? 
                interactions.filter(i => i.response === 'positive').length / interactions.length : 0;
              return positiveRate < 0.3;
            }),
            characteristics: ['Taxa de resposta baixa', 'Pouco interesse demonstrado', 'Podem estar mal qualificados'],
            recommendedActions: ['Reavaliar fit', 'Campanha de reativação', 'Oferta especial']
          }
        ];
        break;

      case 'value':
        const avgBudget = leads.filter(l => l.budget && l.budget > 0).reduce((sum, l) => sum + (l.budget || 0), 0) / 
                         leads.filter(l => l.budget && l.budget > 0).length || 100000;
        
        segments = [
          {
            name: 'Alto Valor',
            description: 'Leads com orçamento acima da média',
            count: 0,
            leads: leads.filter(l => (l.budget || 0) > avgBudget * 1.5),
            characteristics: ['Orçamento alto', 'Potencial de múltiplas compras', 'Podem indicar outros clientes'],
            recommendedActions: ['Atendimento VIP', 'Ofertas premium', 'Programa de indicação']
          },
          {
            name: 'Médio Valor',
            description: 'Leads com orçamento na média do mercado',
            count: 0,
            leads: leads.filter(l => {
              const budget = l.budget || 0;
              return budget >= avgBudget * 0.7 && budget <= avgBudget * 1.5;
            }),
            characteristics: ['Orçamento padrão', 'Foco em valor', 'Sensíveis a preço'],
            recommendedActions: ['Destacar custo-benefício', 'Opções de financiamento', 'Comparativo de mercado']
          },
          {
            name: 'Baixo Valor',
            description: 'Leads com orçamento limitado',
            count: 0,
            leads: leads.filter(l => (l.budget || 0) > 0 && (l.budget || 0) < avgBudget * 0.7),
            characteristics: ['Orçamento restrito', 'Muito sensíveis a preço', 'Primeiro imóvel'],
            recommendedActions: ['Opções econômicas', 'Financiamento facilitado', 'Promoções especiais']
          }
        ];
        break;

      case 'lifecycle':
        segments = [
          {
            name: 'Novos Leads',
            description: 'Leads recém-chegados (últimos 7 dias)',
            count: 0,
            leads: leads.filter(l => {
              const daysSinceCreated = Math.floor((Date.now() - (l.createdAt?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24));
              return daysSinceCreated <= 7;
            }),
            characteristics: ['Interesse recente', 'Alta receptividade', 'Necessidades não mapeadas'],
            recommendedActions: ['Qualificação rápida', 'Primeiro contato em 24h', 'Mapear necessidades']
          },
          {
            name: 'Em Nurturing',
            description: 'Leads em processo de relacionamento',
            count: 0,
            leads: leads.filter(l => l.status === 'nurturing'),
            characteristics: ['Interesse confirmado', 'Processo de decisão', 'Precisa de acompanhamento'],
            recommendedActions: ['Follow-up regular', 'Conteúdo relevante', 'Manter relacionamento']
          },
          {
            name: 'Stagnados',
            description: 'Leads sem progresso há mais de 30 dias',
            count: 0,
            leads: leads.filter(l => {
              const daysSinceCreated = Math.floor((Date.now() - (l.createdAt?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24));
              return daysSinceCreated > 30 && ['new', 'contacted'].includes(l.status);
            }),
            characteristics: ['Sem progressão', 'Pode estar perdendo interesse', 'Precisa reativação'],
            recommendedActions: ['Reativação com oferta especial', 'Nova qualificação', 'Mudança de abordagem']
          }
        ];
        break;

      case 'geographic':
        const locationGroups = leads.reduce((acc, lead) => {
          const location = lead.preferences?.location || 'Não especificado';
          if (!acc[location]) acc[location] = [];
          acc[location].push(lead);
          return acc;
        }, {} as Record<string, Lead[]>);

        segments = Object.entries(locationGroups).map(([location, locationLeads]) => ({
          name: `Região: ${location}`,
          description: `Leads interessados em ${location}`,
          count: locationLeads.length,
          leads: locationLeads,
          characteristics: [`Interesse em ${location}`, 'Localização específica', 'Conhece a região'],
          recommendedActions: ['Ofertas na região', 'Tour pela área', 'Informações locais']
        }));
        break;

      case 'demographic':
        segments = [
          {
            name: 'Jovens Profissionais',
            description: 'Leads entre 25-35 anos',
            count: 0,
            leads: leads.filter(l => {
              const age = l.demographics?.age || 0;
              return age >= 25 && age <= 35;
            }),
            characteristics: ['Primeiro imóvel', 'Carreira em ascensão', 'Tech-savvy'],
            recommendedActions: ['Comunicação digital', 'Financiamento jovem', 'Imóveis modernos']
          },
          {
            name: 'Famílias',
            description: 'Leads com família',
            count: 0,
            leads: leads.filter(l => l.demographics?.hasFamily === true),
            characteristics: ['Foco em segurança', 'Proximidade escolas', 'Espaço para família'],
            recommendedActions: ['Destacar infraestrutura familiar', 'Segurança do bairro', 'Área de lazer']
          },
          {
            name: 'Investidores',
            description: 'Leads interessados em investimento',
            count: 0,
            leads: leads.filter(l => l.preferences?.propertyType?.includes('investment') || 
              (l.interactions || []).some(i => i.description?.includes('investimento'))),
            characteristics: ['ROI focado', 'Múltiplas propriedades', 'Análise técnica'],
            recommendedActions: ['Análise de ROI', 'Oportunidades de mercado', 'Portfólio de opções']
          }
        ];
        break;
    }

    // Atualizar contagens
    segments = segments.map(segment => ({
      ...segment,
      count: segment.leads.length
    }));

    // Filtrar segmentos por critérios se fornecidos
    if (args.criteria) {
      segments = segments.map(segment => ({
        ...segment,
        leads: segment.leads.filter(lead => {
          const criteria = args.criteria!;
          
          if (criteria.minScore && (lead.score || 0) < criteria.minScore) return false;
          if (criteria.maxScore && (lead.score || 0) > criteria.maxScore) return false;
          if (criteria.sources && criteria.sources.length > 0 && !criteria.sources.includes(lead.source || '')) return false;
          
          if (criteria.ageRange) {
            const age = lead.demographics?.age || 0;
            if (age < criteria.ageRange.min || age > criteria.ageRange.max) return false;
          }
          
          if (criteria.valueRange) {
            const budget = lead.budget || 0;
            if (budget < criteria.valueRange.min || budget > criteria.valueRange.max) return false;
          }
          
          return true;
        }),
        count: 0 // Will be recalculated
      }));
      
      // Recalcular contagens após filtros
      segments = segments.map(segment => ({
        ...segment,
        count: segment.leads.length
      }));
    }

    // Remover segmentos vazios
    segments = segments.filter(segment => segment.count > 0);

    logger.info('✅ [TenantAgent] Segmentação concluída', {
      tenantId: tenantId.substring(0, 8) + '***',
      segmentType: args.segmentType,
      segmentCount: segments.length,
      totalLeads: segments.reduce((sum, s) => sum + s.count, 0)
    });

    return {
      success: true,
      segmentation: {
        type: args.segmentType,
        totalLeads: leads.length,
        segments: segments.map(s => ({
          name: s.name,
          description: s.description,
          count: s.count,
          percentage: Math.round((s.count / leads.length) * 100),
          characteristics: s.characteristics,
          recommendedActions: s.recommendedActions
        }))
      },
      message: `Segmentação por ${args.segmentType} concluída. Identificados ${segments.length} segmentos com total de ${segments.reduce((sum, s) => sum + s.count, 0)} leads.`,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [TenantAgent] Erro na segmentação de clientes', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao segmentar clientes. Tente novamente.',
      tenantId
    };
  }
}

/**
 * FUNÇÃO: Gerar insights avançados com IA
 */
export async function generateInsights(args: GenerateInsightsArgs, tenantId: string): Promise<any> {
  try {
    logger.info('💡 [TenantAgent] generate_insights iniciada', {
      tenantId: tenantId.substring(0, 8) + '***',
      type: args.type,
      period: args.period,
      includeAI: args.includeAI
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    const clientService = serviceFactory.clients;

    const [leads, clients] = await Promise.all([
      leadService.getMany([]) as Promise<Lead[]>,
      clientService.getMany([]) as Promise<Client[]>
    ]);

    // Filtrar por período se especificado
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '6m': 180,
      '1y': 365
    };

    const filterDays = periodDays[args.period || '30d'];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filterDays);

    const filteredLeads = leads.filter(l => 
      l.createdAt?.toDate() >= cutoffDate
    );

    let insights: any = {};

    switch (args.type) {
      case 'lead_performance':
        const totalLeads = filteredLeads.length;
        const convertedLeads = clients.filter(c => 
          c.createdAt?.toDate() >= cutoffDate
        ).length;
        
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
        const avgScore = filteredLeads.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads || 0;
        
        const temperatureDistribution = {
          hot: filteredLeads.filter(l => l.temperature === 'hot').length,
          warm: filteredLeads.filter(l => l.temperature === 'warm').length,
          cold: filteredLeads.filter(l => l.temperature === 'cold').length
        };

        insights = {
          type: 'lead_performance',
          period: args.period,
          metrics: {
            totalLeads,
            convertedLeads,
            conversionRate: Math.round(conversionRate * 100) / 100,
            avgScore: Math.round(avgScore),
            temperatureDistribution
          },
          analysis: {
            performance: conversionRate > 15 ? 'Excelente' : 
                        conversionRate > 10 ? 'Bom' : 
                        conversionRate > 5 ? 'Regular' : 'Precisa melhorar',
            keyFindings: [
              `Taxa de conversão: ${Math.round(conversionRate)}%`,
              `Score médio: ${Math.round(avgScore)}/100`,
              `Leads quentes: ${temperatureDistribution.hot} (${Math.round((temperatureDistribution.hot / totalLeads) * 100)}%)`
            ],
            recommendations: conversionRate < 10 ? [
              'Melhorar qualificação dos leads',
              'Aumentar follow-up dos leads mornos',
              'Revisar processo de nurturing'
            ] : [
              'Manter padrão de qualidade',
              'Escalar estratégias bem-sucedidas',
              'Focar em leads de maior valor'
            ]
          }
        };
        break;

      case 'conversion_trends':
        // Análise de tendências de conversão por semana
        const weeklyData = [];
        for (let i = 0; i < Math.min(8, filterDays / 7); i++) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekLeads = filteredLeads.filter(l => {
            const created = l.createdAt?.toDate();
            return created && created >= weekStart && created < weekEnd;
          });

          const weekConversions = clients.filter(c => {
            const created = c.createdAt?.toDate();
            return created && created >= weekStart && created < weekEnd;
          }).length;

          weeklyData.unshift({
            week: `Sem ${i + 1}`,
            leads: weekLeads.length,
            conversions: weekConversions,
            rate: weekLeads.length > 0 ? (weekConversions / weekLeads.length) * 100 : 0
          });
        }

        const trend = weeklyData.length >= 3 ? 
          weeklyData[weeklyData.length - 1].rate - weeklyData[0].rate : 0;

        insights = {
          type: 'conversion_trends',
          period: args.period,
          weeklyData,
          trend: {
            direction: trend > 2 ? 'Crescente' : trend < -2 ? 'Decrescente' : 'Estável',
            percentage: Math.round(trend * 100) / 100,
            analysis: trend > 5 ? 'Tendência muito positiva' :
                     trend > 0 ? 'Leve melhora' :
                     trend === 0 ? 'Estabilidade' :
                     trend > -5 ? 'Leve declínio' : 'Tendência preocupante'
          },
          insights: trend > 0 ? [
            'Performance em crescimento',
            'Estratégias atuais estão funcionando',
            'Considerar expansão das táticas eficazes'
          ] : [
            'Performance estagnada ou em declínio',
            'Revisar estratégias de geração de leads',
            'Analisar qualidade das fontes'
          ]
        };
        break;

      case 'source_analysis':
        const sourceStats = {};
        filteredLeads.forEach(lead => {
          const source = lead.source || 'unknown';
          if (!sourceStats[source]) {
            sourceStats[source] = { leads: 0, conversions: 0, totalScore: 0 };
          }
          sourceStats[source].leads++;
          sourceStats[source].totalScore += (lead.score || 0);
        });

        clients.filter(c => c.createdAt?.toDate() >= cutoffDate).forEach(client => {
          const source = client.source || 'unknown';
          if (sourceStats[source]) {
            sourceStats[source].conversions++;
          }
        });

        const sourceAnalysis = Object.entries(sourceStats).map(([source, stats]: [string, any]) => ({
          source,
          leads: stats.leads,
          conversions: stats.conversions,
          conversionRate: stats.leads > 0 ? (stats.conversions / stats.leads) * 100 : 0,
          avgScore: stats.leads > 0 ? stats.totalScore / stats.leads : 0,
          roi: Math.random() * 200 + 100 // Placeholder - seria calculado com dados de custo reais
        })).sort((a, b) => b.conversionRate - a.conversionRate);

        insights = {
          type: 'source_analysis',
          period: args.period,
          sources: sourceAnalysis,
          topPerformers: sourceAnalysis.slice(0, 3),
          recommendations: [
            `Investir mais em: ${sourceAnalysis[0]?.source} (${Math.round(sourceAnalysis[0]?.conversionRate)}% conversão)`,
            sourceAnalysis.length > 1 ? `Otimizar: ${sourceAnalysis[Math.floor(sourceAnalysis.length / 2)]?.source}` : 'Diversificar fontes',
            `Revisar: ${sourceAnalysis[sourceAnalysis.length - 1]?.source} (baixa performance)`
          ].filter(Boolean)
        };
        break;

      case 'pipeline_health':
        const statusCounts = {
          new: filteredLeads.filter(l => l.status === 'new').length,
          contacted: filteredLeads.filter(l => l.status === 'contacted').length,
          qualified: filteredLeads.filter(l => l.status === 'qualified').length,
          nurturing: filteredLeads.filter(l => l.status === 'nurturing').length,
          proposal_sent: filteredLeads.filter(l => l.status === 'proposal_sent').length,
          negotiating: filteredLeads.filter(l => l.status === 'negotiating').length,
          won: filteredLeads.filter(l => l.status === 'won').length,
          lost: filteredLeads.filter(l => l.status === 'lost').length
        };

        const bottleneck = Object.entries(statusCounts)
          .filter(([status]) => !['won', 'lost'].includes(status))
          .sort((a, b) => b[1] - a[1])[0];

        insights = {
          type: 'pipeline_health',
          period: args.period,
          distribution: statusCounts,
          bottleneck: bottleneck ? {
            stage: bottleneck[0],
            count: bottleneck[1],
            percentage: Math.round((bottleneck[1] / totalLeads) * 100)
          } : null,
          healthScore: Math.min(100, Math.max(0,
            (statusCounts.qualified + statusCounts.nurturing + statusCounts.proposal_sent) / totalLeads * 100
          )),
          actionItems: [
            bottleneck ? `Focar em mover leads do estágio: ${bottleneck[0]}` : 'Pipeline equilibrado',
            statusCounts.new > totalLeads * 0.4 ? 'Muitos leads sem primeiro contato' : 'Acompanhamento em dia',
            statusCounts.nurturing > totalLeads * 0.3 ? 'Acelerar processo de nurturing' : 'Nurturing controlado'
          ]
        };
        break;

      case 'predictive_analytics':
        // Análise preditiva simples baseada em tendências
        const recentConversions = clients.filter(c => {
          const daysSince = Math.floor((Date.now() - (c.createdAt?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24));
          return daysSince <= 30;
        }).length;

        const recentLeads = filteredLeads.filter(l => {
          const daysSince = Math.floor((Date.now() - (l.createdAt?.toDate().getTime() || 0)) / (1000 * 60 * 60 * 24));
          return daysSince <= 30;
        }).length;

        const currentRate = recentLeads > 0 ? recentConversions / recentLeads : 0;
        
        const hotLeads = filteredLeads.filter(l => l.temperature === 'hot' && ['qualified', 'nurturing', 'proposal_sent'].includes(l.status)).length;
        const warmLeads = filteredLeads.filter(l => l.temperature === 'warm' && ['qualified', 'nurturing'].includes(l.status)).length;

        const predictedConversions = Math.round(hotLeads * 0.7 + warmLeads * 0.3);

        insights = {
          type: 'predictive_analytics',
          period: args.period,
          currentMetrics: {
            recentConversions,
            recentLeads,
            conversionRate: Math.round(currentRate * 100)
          },
          predictions: {
            nextMonthConversions: predictedConversions,
            confidence: Math.min(90, Math.max(60, 70 + (filteredLeads.length / 10))),
            factors: [
              `${hotLeads} leads quentes no pipeline`,
              `${warmLeads} leads mornos qualificados`,
              `Taxa atual de ${Math.round(currentRate * 100)}%`
            ]
          },
          opportunities: [
            hotLeads > 5 ? 'Alto potencial de conversões rápidas' : 'Poucas conversões imediatas previstas',
            warmLeads > 10 ? 'Bom volume para nurturing' : 'Focar em aquecer mais leads',
            'Manter qualidade do lead scoring atual'
          ]
        };
        break;
    }

    logger.info('✅ [TenantAgent] Insights gerados com sucesso', {
      tenantId: tenantId.substring(0, 8) + '***',
      type: args.type,
      dataPoints: filteredLeads.length
    });

    return {
      success: true,
      insights,
      message: `Insights de ${args.type} gerados com sucesso para o período de ${args.period || '30d'}.`,
      tenantId
    };

  } catch (error) {
    logger.error('❌ [TenantAgent] Erro ao gerar insights', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao gerar insights. Tente novamente.',
      tenantId
    };
  }
}

// Função para verificar disponibilidade da agenda
export async function checkAgendaAvailability(args: CheckAgendaAvailabilityArgs, tenantId: string): Promise<AgendaAvailabilityResponse> {
  try {
    logger.info('📅 [CheckAgendaAvailability] Verificando disponibilidade da agenda', {
      tenantId: tenantId.substring(0, 8) + '***',
      year: args.year,
      month: args.month,
      day: args.day,
      requestType: args.day ? 'single_day' : 'full_month'
    });

    logger.info('🔧 [CheckAgendaAvailability] Criando service factory', { tenantId: tenantId.substring(0, 8) + '***' });
    const serviceFactory = new TenantServiceFactory(tenantId);
    
    logger.info('🔧 [CheckAgendaAvailability] Obtendo visitService');
    const visitService = serviceFactory.visits;
    
    logger.info('🔧 [CheckAgendaAvailability] VisitService obtido com sucesso', { 
      hasVisitService: !!visitService,
      visitServiceType: typeof visitService
    });

    // Configurar range de datas baseado nos parâmetros (convertendo strings para numbers)
    const year = parseInt(String(args.year));
    const month = parseInt(String(args.month));
    const day = args.day ? parseInt(String(args.day)) : null;
    
    logger.info('🔧 [CheckAgendaAvailability] Parâmetros convertidos', {
      originalArgs: args,
      convertedYear: year,
      convertedMonth: month,
      convertedDay: day,
      types: {
        year: typeof year,
        month: typeof month,
        day: typeof day
      }
    });

    let startDate: Date;
    let endDate: Date;
    let queryLabel: string;

    if (day) {
      // Consulta de um dia específico
      startDate = new Date(year, month - 1, day, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59);
      queryLabel = startDate.toLocaleDateString('pt-BR');
    } else {
      // Consulta de mês completo
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59); // Último dia do mês
      queryLabel = `${month.toString().padStart(2, '0')}/${year}`;
    }

    logger.info('🔍 [CheckAgendaAvailability] Range de consulta definido', {
      tenantId: tenantId.substring(0, 8) + '***',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      queryLabel
    });

    // Buscar todos os agendamentos no período
    // Considera apenas status ativos: scheduled, confirmed, in_progress
    const activeStatuses = ['scheduled', 'confirmed', 'in_progress'];
    
    logger.info('🔍 [CheckAgendaAvailability] Iniciando consulta ao banco de dados', {
      tenantId: tenantId.substring(0, 8) + '***',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      activeStatuses
    });
    
    const appointments = await visitService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'scheduledDate', operator: '>=', value: startDate },
      { field: 'scheduledDate', operator: '<=', value: endDate },
      { field: 'status', operator: 'in', value: activeStatuses }
    ]) as VisitAppointment[];
    
    logger.info('✅ [CheckAgendaAvailability] Consulta ao banco concluída', {
      tenantId: tenantId.substring(0, 8) + '***',
      appointmentsCount: appointments?.length || 0,
      hasAppointments: !!appointments
    });

    logger.info('📊 [CheckAgendaAvailability] Agendamentos encontrados', {
      tenantId: tenantId.substring(0, 8) + '***',
      totalAppointments: appointments.length,
      dateRange: queryLabel,
      activeStatuses
    });

    // Processar agendamentos em slots ocupados
    const occupiedSlots: OccupiedTimeSlot[] = appointments.map(appointment => {
      const date = new Date(appointment.scheduledDate);
      const startTime = appointment.scheduledTime;
      const duration = appointment.duration || 60; // Default 60 min
      
      // Calcular endTime baseado na duração
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMinute + duration;
      const endHour = Math.floor(totalMinutes / 60) % 24;
      const endMinute = totalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

      // Determinar tipo baseado no propertyId
      const type: 'meeting' | 'visit' | 'blocked' = 
        appointment.propertyId === 'GENERIC_EVENT' ? 'meeting' : 'visit';

      return {
        id: appointment.id,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        title: appointment.propertyId === 'GENERIC_EVENT' 
          ? (appointment.propertyName || 'Reunião') 
          : `Visita - ${appointment.propertyName}`,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        type: type,
        status: appointment.status,
        notes: appointment.notes
      };
    });

    // Ordenar slots por data e horário
    occupiedSlots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    // Gerar sugestões de horários livres (apenas para consulta de dia específico)
    let availableSuggestions: string[] | undefined;
    if (args.day) {
      availableSuggestions = generateAvailableTimeSlots(occupiedSlots, args.day);
    }

    // Horário de trabalho padrão (configurável por tenant futuramente)
    const workingHours = {
      start: '08:00',
      end: '18:00',
      lunchBreak: {
        start: '12:00',
        end: '13:00'
      }
    };

    const response: AgendaAvailabilityResponse = {
      success: true,
      date: args.day ? queryLabel : undefined,
      month: !args.day ? queryLabel : undefined,
      occupiedSlots,
      totalOccupied: occupiedSlots.length,
      availableSuggestions,
      workingHours,
      tenantId
    };

    logger.info('✅ [CheckAgendaAvailability] Consulta concluída com sucesso', {
      tenantId: tenantId.substring(0, 8) + '***',
      queryLabel,
      totalOccupied: occupiedSlots.length,
      hasSuggestions: !!availableSuggestions,
      suggestionsCount: availableSuggestions?.length || 0
    });

    return response;

  } catch (error) {
    logger.error('❌ [CheckAgendaAvailability] Erro ao verificar disponibilidade da agenda', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      } : String(error),
      tenantId: tenantId.substring(0, 8) + '***',
      args,
      errorType: typeof error,
      isErrorInstance: error instanceof Error
    });
    
    console.error('[DEBUG-CHECK-AGENDA] Full error details:', error);
    
    return {
      success: false,
      occupiedSlots: [],
      totalOccupied: 0,
      error: `Erro ao verificar disponibilidade da agenda: ${error instanceof Error ? error.message : String(error)}`,
      tenantId
    };
  }
}

// Função auxiliar para gerar sugestões de horários livres
function generateAvailableTimeSlots(occupiedSlots: OccupiedTimeSlot[], day: number): string[] {
  const workStartHour = 8;  // 08:00
  const workEndHour = 18;   // 18:00
  const lunchStartHour = 12; // 12:00
  const lunchEndHour = 13;   // 13:00
  const slotDuration = 60;   // 60 minutos por slot
  
  const suggestions: string[] = [];
  
  // Gerar todos os slots possíveis de trabalho (excluindo almoço)
  for (let hour = workStartHour; hour < workEndHour; hour++) {
    // Pular horário de almoço
    if (hour >= lunchStartHour && hour < lunchEndHour) {
      continue;
    }
    
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    
    // Verificar se o slot está ocupado
    const isOccupied = occupiedSlots.some(slot => {
      if (slot.date !== new Date().toISOString().split('T')[0]) return false;
      
      const slotStart = hour;
      const slotEnd = hour + 1;
      
      const [occupiedStartHour] = slot.startTime.split(':').map(Number);
      const [occupiedEndHour] = slot.endTime.split(':').map(Number);
      
      // Verificar sobreposição
      return !(slotEnd <= occupiedStartHour || slotStart >= occupiedEndHour);
    });
    
    if (!isOccupied) {
      suggestions.push(timeSlot);
    }
  }
  
  return suggestions;
}

// Executar função baseada no nome
export async function executeTenantAwareFunction(
  functionName: string, 
  args: any, 
  tenantId: string,
  contextClientPhone?: string
): Promise<any> {
  switch (functionName) {
    case 'search_properties':
      return await searchProperties(args, tenantId);
    case 'calculate_price':
      // Garantir que clientPhone esteja disponível para contexto
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await calculatePrice(args, tenantId);
    case 'create_reservation':
      // Garantir que clientPhone esteja disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
        logger.info('🔄 [TenantAgent] clientPhone corrigido do contexto', {
          tenantId,
          contextPhone: contextClientPhone.substring(0, 6) + '***'
        });
      }
      return await createReservation(args, tenantId);
    case 'register_client':
      return await registerClient(args, tenantId);
    case 'get_property_details':
      return await getPropertyDetails(args, tenantId);
    case 'send_property_media':
      return await sendPropertyMedia(args, tenantId);
    case 'check_visit_availability':
      return await checkVisitAvailability(args, tenantId);
    case 'schedule_visit':
      return await scheduleVisit(args, tenantId);
    case 'classify_lead':
      return await classifyLead(args, tenantId);
    case 'update_lead_status':
      return await updateLeadStatus(args, tenantId);
    case 'generate_quote':
      return await generateQuote(args, tenantId);
    case 'create_transaction':
      return await createTransaction(args, tenantId);
    case 'create_lead':
      return await createLead(args, tenantId);
    case 'update_lead':
      return await updateLead(args, tenantId);
    case 'create_task':
      return await createTask(args, tenantId);
    case 'update_task':
      return await updateTask(args, tenantId);
    case 'generate_report':
      return await generateReport(args, tenantId);
    case 'track_metrics':
      return await trackMetrics(args, tenantId);
    case 'create_goal':
      return await createGoal(args, tenantId);
    case 'update_goal_progress':
      return await updateGoalProgress(args, tenantId);
    case 'analyze_performance':
      return await analyzePerformance(args, tenantId);
    
    // FUNÇÕES CRÍTICAS ADICIONADAS
    case 'cancel_reservation':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await cancelReservation(args, tenantId);
    
    case 'modify_reservation':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await modifyReservation(args, tenantId);
    
    case 'get_policies':
      return await getPolicies(args, tenantId);
    
    case 'check_availability':
      return await checkAvailability(args, tenantId);
    
    case 'check_agenda_availability':
      return await checkAgendaAvailability(args, tenantId);
    
    case 'schedule_meeting':
      return await scheduleMeeting(args, tenantId);
    
    // FUNÇÕES DE SUPORTE (TICKETS)
    case 'create_support_ticket':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await createSupportTicket(args, tenantId);
    
    case 'get_user_tickets':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await getUserTickets(args, tenantId);
    
    // FUNÇÕES AVANÇADAS DE CRM
    case 'analyze_lead_behavior':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await analyzeLeadBehavior(args, tenantId);
    
    case 'update_lead_temperature':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await updateLeadTemperature(args, tenantId);
    
    case 'predict_conversion':
      // Garantir clientPhone se disponível
      if (!args.clientPhone && contextClientPhone) {
        args.clientPhone = contextClientPhone;
      }
      return await predictConversion(args, tenantId);
    
    case 'segment_customers':
      return await segmentCustomers(args, tenantId);
    
    case 'generate_insights':
      return await generateInsights(args, tenantId);
    
    default:
      logger.error('❌ [TenantAgent] Função desconhecida', {
        functionName,
        tenantId
      });
      return {
        success: false,
        error: `Função desconhecida: ${functionName}`,
        tenantId
      };
  }
}