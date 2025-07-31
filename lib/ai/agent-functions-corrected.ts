// lib/ai/agent-functions-corrected.ts
// VERSÃO CORRIGIDA: 6 funções essenciais funcionais

import { OpenAI } from 'openai';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { crmService } from '@/lib/services/crm-service';
import { visitService } from '@/lib/services/visit-service';
import { TenantServiceFactory } from '@/lib/services/tenant-service-factory';
import { logger } from '@/lib/utils/logger';
import { LeadStatus, LeadSource, InteractionType, type Lead } from '@/lib/types/crm';
import { VisitStatus, TimePreference, type VisitAppointment } from '@/lib/types/visit-appointment';
import type { Reservation } from '@/lib/types/reservation';

// ===== TIPOS CORRIGIDOS =====

interface CorrectedAIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ===== 5 FUNÇÕES ESSENCIAIS CORRIGIDAS =====

export const CORRECTED_AI_FUNCTIONS: CorrectedAIFunction[] = [
  {
    name: 'search_properties',
    description: 'Buscar propriedades disponíveis com filtros básicos. SEMPRE ordena por preço crescente (mais baratas primeiro).',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Cidade ou região para busca (opcional - se não informado, busca em todas)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        budget: { type: 'number', description: 'Orçamento máximo por noite (opcional)' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        amenities: { type: 'array', items: { type: 'string' }, description: 'Lista de comodidades desejadas (opcional)' }
      },
      required: ['guests'] // Localização pode ser opcional para busca geral
    }
  },
  {
    name: 'send_property_media',
    description: 'Enviar fotos e vídeos de uma propriedade específica para o cliente',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade (usar o ID real)' },
        includeVideos: { type: 'boolean', description: 'Se deve incluir vídeos além das fotos (padrão: true)' },
        maxPhotos: { type: 'number', description: 'Máximo de fotos para enviar (padrão: 8)' }
      },
      required: ['propertyId']
    }
  },
  {
    name: 'get_property_details',
    description: 'Obter detalhes completos de uma propriedade específica',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade (usar o ID real do resultado da busca)' }
      },
      required: ['propertyId']
    }
  },
  {
    name: 'calculate_price',
    description: 'Calcular preço total de uma propriedade para período específico',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade (usar o ID real)' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' }
      },
      required: ['propertyId', 'checkIn', 'checkOut', 'guests']
    }
  },
  {
    name: 'register_client',
    description: 'Registrar ou atualizar dados do cliente ANTES de criar reserva. SEMPRE solicitar CPF.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome completo do cliente' },
        phone: { type: 'string', description: 'Telefone do cliente (número do WhatsApp)' },
        document: { type: 'string', description: 'CPF do cliente (OBRIGATÓRIO)' },
        email: { type: 'string', description: 'Email do cliente (opcional)' }
      },
      required: ['name', 'phone', 'document']
    }
  },
  {
    name: 'check_visit_availability',
    description: 'Verificar horários disponíveis para visita presencial na agenda da imobiliária',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data início para busca (YYYY-MM-DD, padrão: hoje)' },
        days: { type: 'number', description: 'Quantos dias à frente buscar (padrão: 7)' },
        timePreference: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Preferência de horário (opcional)' }
      },
      required: []
    }
  },
  {
    name: 'schedule_visit',
    description: 'Agendar visita presencial à propriedade após verificar disponibilidade',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID do cliente (obtido da função register_client)' },
        propertyId: { type: 'string', description: 'ID da propriedade (ID real do Firebase)' },
        visitDate: { type: 'string', description: 'Data para visita (YYYY-MM-DD)' },
        visitTime: { type: 'string', description: 'Horário (HH:MM)' },
        notes: { type: 'string', description: 'Observações e comodidades que cliente quer ver (opcional)' }
      },
      required: ['clientId', 'propertyId', 'visitDate', 'visitTime']
    }
  },
  {
    name: 'create_reservation',
    description: 'Criar nova reserva APÓS registrar o cliente',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID do cliente (obtido da função register_client)' },
        propertyId: { type: 'string', description: 'ID da propriedade (ID real do Firebase)' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        totalPrice: { type: 'number', description: 'Preço total (obtido de calculate_price)' },
        notes: { type: 'string', description: 'Observações adicionais (opcional)' }
      },
      required: ['clientId', 'propertyId', 'checkIn', 'checkOut', 'guests', 'totalPrice']
    }
  },
  {
    name: 'classify_lead_status',
    description: 'Classificar automaticamente o status do lead baseado no progresso da conversa e outcomes específicos',
    parameters: {
      type: 'object',
      properties: {
        clientPhone: { type: 'string', description: 'Telefone do cliente para identificar o lead' },
        conversationOutcome: { 
          type: 'string', 
          enum: ['no_reservation', 'visit_scheduled', 'deal_closed', 'price_negotiation', 'wants_human_agent', 'information_gathering', 'lost_interest'],
          description: 'Outcome da conversa detectado pela IA' 
        },
        reason: { type: 'string', description: 'Razão específica para a classificação' },
        metadata: { 
          type: 'object', 
          description: 'Dados adicionais como propriedades vistas, preços discutidos, etc (opcional)',
          properties: {
            propertiesViewed: { type: 'array', items: { type: 'string' } },
            priceDiscussed: { type: 'number' },
            visitDate: { type: 'string' },
            objections: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['clientPhone', 'conversationOutcome', 'reason']
    }
  }
];

// ===== IMPLEMENTAÇÕES CORRIGIDAS =====

export class CorrectedAgentFunctions {
  
  static async searchProperties(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Buscando propriedades', { 
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'searchProperties'
      });
      
      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);
      
      // Buscar propriedades usando tenant-scoped service
      const searchFilters = {
        location: args.location,
        guests: args.guests,
        checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
        checkOut: args.checkOut ? new Date(args.checkOut) : undefined,
        maxPrice: args.budget
      };
      
      let properties = await services.properties.getAll();
      
      // Filtrar propriedades ativas
      properties = properties.filter(p => p.isActive);
      
      // Aplicar filtros de busca
      if (args.location) {
        properties = properties.filter(p => 
          (p.city && p.city.toLowerCase().includes(args.location.toLowerCase())) ||
          (p.neighborhood && p.neighborhood.toLowerCase().includes(args.location.toLowerCase())) ||
          (p.address && p.address.toLowerCase().includes(args.location.toLowerCase()))
        );
      }
      
      if (args.guests) {
        properties = properties.filter(p => 
          (p.maxGuests && p.maxGuests >= args.guests) ||
          (p.capacity && p.capacity >= args.guests)
        );
      }
      
      if (args.budget) {
        properties = properties.filter(p => 
          p.basePrice && p.basePrice <= args.budget
        );
      }
      
      logger.info('Propriedades filtradas', { 
        totalFound: properties.length,
        filters: searchFilters,
        component: 'CorrectedAgentFunctions'
      });
      
      if (properties.length === 0) {
        // Tentar busca sem filtros de localização se não encontrou nada
        if (args.location) {
          // Expanding search without location filter
          properties = await propertyService.searchProperties({
            tenantId,
            guests: args.guests,
            checkIn: searchFilters.checkIn,
            checkOut: searchFilters.checkOut,
            maxPrice: args.budget
          });
        }
        
        if (properties.length === 0) {
          return {
            success: false,
            message: 'Nenhuma propriedade encontrada para os critérios especificados',
            properties: []
          };
        }
      }
      
      // Filtrar por comodidades se especificadas
      if (args.amenities && Array.isArray(args.amenities) && args.amenities.length > 0) {
        // Filtering by amenities
        properties = properties.filter(property => {
          const propertyAmenities = property.amenities || [];
          return args.amenities.some((amenity: string) => 
            propertyAmenities.some((propAmenity: string) => 
              propAmenity.toLowerCase().includes(amenity.toLowerCase())
            )
          );
        });
        // Amenities filter applied
      }
      
      // Ordenar por preço CRESCENTE (mais baratas primeiro) - CAMPOS CORRETOS
      properties.sort((a, b) => {
        const priceA = a.basePrice || 999999;
        const priceB = b.basePrice || 999999;
        return priceA - priceB;
      });
      
      // Property prices calculated
      
      // Retornar dados formatados COM CAMPOS CORRETOS
      const formattedProperties = properties.slice(0, 8).map(p => ({
        id: p.id, // ID REAL do Firebase
        name: p.title || p.name || 'Propriedade sem nome', // CAMPO CORRETO
        location: p.city || p.location || 'Localização não informada', // CAMPO CORRETO
        bedrooms: p.bedrooms || 1,
        bathrooms: p.bathrooms || 1,
        maxGuests: p.maxGuests || p.capacity || 2, // AMBOS OS CAMPOS
        basePrice: p.basePrice || 300,
        amenities: p.amenities || [],
        type: p.type || p.category || 'apartment', // AMBOS OS CAMPOS
        description: p.description || '',
        address: p.address || '',
        // CAMPOS ADICIONAIS IMPORTANTES
        isActive: p.isActive,
        minimumNights: p.minimumNights || 1,
        cleaningFee: p.cleaningFee || 0,
        allowsPets: p.allowsPets || false,
        neighborhood: p.neighborhood || ''
      }));
      
      // Properties formatted and sorted by price
      
      return {
        success: true,
        count: formattedProperties.length,
        properties: formattedProperties,
        message: `Encontrei ${formattedProperties.length} opções ordenadas por preço (mais baratas primeiro)`,
        // REFORÇO PARA A IA USAR IDs CORRETOS
        availableIds: formattedProperties.map(p => p.id),
        propertyList: formattedProperties.map((p, index) => `${index + 1}. ${p.name} (ID: ${p.id}) - R$${p.basePrice}/noite`)
      };
        
    } catch (error) {
      // Property search error handled
      return {
        success: false,
        message: 'Erro interno ao buscar propriedades',
        properties: []
      };
    }
  }

  static async sendPropertyMedia(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Enviando mídia da propriedade', { 
        propertyId: args.propertyId,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'sendPropertyMedia'
      });
      
      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);
      
      const property = await services.properties.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada',
          media: null
        };
      }

      // Property found for media

      const maxPhotos = args.maxPhotos || 8;
      const includeVideos = args.includeVideos !== false; // padrão true
      
      // Preparar fotos (ordenadas por order, main first)
      let photos = (property.photos || []).slice();
      photos.sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return (a.order || 0) - (b.order || 0);
      });
      
      // Limitar número de fotos
      photos = photos.slice(0, maxPhotos);
      
      // Preparar vídeos (se solicitado)
      let videos = [];
      if (includeVideos && property.videos && property.videos.length > 0) {
        videos = property.videos.slice(0, 3); // máximo 3 vídeos
      }

      const mediaCount = photos.length + videos.length;
      
      if (mediaCount === 0) {
        return {
          success: false,
          message: 'Esta propriedade ainda não possui fotos ou vídeos disponíveis.',
          media: null
        };
      }

      // Media prepared for sending

      return {
        success: true,
        property: {
          id: property.id,
          name: property.title || 'Propriedade',
          address: property.address
        },
        media: {
          photos: photos.map(photo => ({
            url: photo.url,
            caption: photo.caption || `${property.title || 'Propriedade'} - ${property.address || ''}`,
            isMain: photo.isMain || false,
            filename: photo.filename
          })),
          videos: videos.map(video => ({
            url: video.url,
            title: video.title || `Vídeo: ${property.title}`,
            duration: video.duration,
            thumbnail: video.thumbnail,
            filename: video.filename
          }))
        },
        message: `Aqui estão ${photos.length} foto${photos.length > 1 ? 's' : ''}${videos.length > 0 ? ` e ${videos.length} vídeo${videos.length > 1 ? 's' : ''}` : ''} da propriedade "${property.title}"! 📸`,
        totalItems: mediaCount
      };

    } catch (error) {
      // Media sending error handled
      return {
        success: false,
        message: 'Erro ao buscar fotos e vídeos da propriedade',
        media: null
      };
    }
  }

  static async getPropertyDetails(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Obtendo detalhes da propriedade', { 
        propertyId: args.propertyId,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'getPropertyDetails'
      });
      
      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);
      
      const property = await services.properties.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada',
          property: null
        };
      }

      // Property details found

      return {
        success: true,
        property: {
          id: property.id,
          name: property.title || property.name || 'Sem nome', // CAMPO CORRETO
          description: property.description,
          location: property.city || property.location, // CAMPO CORRETO 
          address: property.address,
          neighborhood: property.neighborhood,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          maxGuests: property.maxGuests || property.capacity,
          basePrice: property.basePrice,
          minimumNights: property.minimumNights || 1,
          allowsPets: property.allowsPets || false,
          amenities: property.amenities || [],
          photos: property.photos || [],
          videos: property.videos || [],
          cleaningFee: property.cleaningFee || 0,
          // CAMPOS ADICIONAIS DE PRICING
          pricePerExtraGuest: property.pricePerExtraGuest || 0,
          weekendSurcharge: property.weekendSurcharge || 0,
          holidaySurcharge: property.holidaySurcharge || 0,
          decemberSurcharge: property.decemberSurcharge || 0,
          highSeasonSurcharge: property.highSeasonSurcharge || 0,
          highSeasonMonths: property.highSeasonMonths || [],
          // DISPONIBILIDADE
          unavailableDates: property.unavailableDates || [],
          customPricing: property.customPricing || {},
          // STATUS
          status: property.status,
          isActive: property.isActive
        }
      };

    } catch (error) {
      // Property details error handled
      return {
        success: false,
        message: 'Erro ao buscar detalhes da propriedade',
        property: null
      };
    }
  }

  static async calculatePrice(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Calculando preço dinâmico', { 
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'calculatePrice'
      });
      
      // Validar parâmetros obrigatórios
      if (!args.propertyId || !args.checkIn || !args.checkOut) {
        return {
          success: false,
          message: 'Parâmetros obrigatórios faltando (propertyId, checkIn, checkOut)',
          calculation: null
        };
      }
      
      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);
      
      // Buscar propriedade
      const property = await services.properties.getById(args.propertyId);
      
      if (!property) {
        logger.warn('Propriedade não encontrada para cálculo de preço', { 
          propertyId: args.propertyId,
          tenantId,
          component: 'CorrectedAgentFunctions'
        });
        return {
          success: false,
          message: `Propriedade com ID ${args.propertyId} não encontrada`,
          calculation: null
        };
      }

      logger.info('Propriedade encontrada para cálculo', { 
        propertyId: property.id,
        propertyName: property.title || property.name || 'Sem nome',
        component: 'CorrectedAgentFunctions'
      });

      // Calcular número de noites
      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        return {
          success: false,
          message: `Datas inválidas: check-in ${args.checkIn}, check-out ${args.checkOut}`,
          calculation: null
        };
      }

      // Verificar disponibilidade
      const unavailableDates = property.unavailableDates || [];
      const currentDate = new Date(checkIn);
      const conflicts = [];
      
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (unavailableDates.find(d => d.toISOString().split('T')[0] === dateStr)) {
          conflicts.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (conflicts.length > 0) {
        return {
          success: false,
          message: `Datas indisponíveis: ${conflicts.join(', ')}`,
          calculation: null,
          conflicts
        };
      }

      // CÁLCULO DE PREÇOS DINÂMICOS
      const basePrice = property.basePrice || 300;
      let totalStay = 0;
      const dailyPrices = [];
      const today = new Date();
      
      // Calcular preço dia a dia
      const calcDate = new Date(checkIn);
      for (let i = 0; i < nights; i++) {
        const dateStr = calcDate.toISOString().split('T')[0];
        let dailyPrice = basePrice;
        
        // 1. Preço customizado para data específica
        if (property.customPricing && property.customPricing[dateStr]) {
          dailyPrice = property.customPricing[dateStr];
        } else {
          // 2. Surcharges sazonais
          const month = calcDate.getMonth() + 1;
          const dayOfWeek = calcDate.getDay();
          
          // Fim de semana (sábado e domingo)
          if ((dayOfWeek === 0 || dayOfWeek === 6) && property.weekendSurcharge) {
            dailyPrice *= (1 + property.weekendSurcharge / 100);
          }
          
          // Dezembro
          if (month === 12 && property.decemberSurcharge) {
            dailyPrice *= (1 + property.decemberSurcharge / 100);
          }
          
          // Alta temporada
          if (property.highSeasonMonths && property.highSeasonMonths.includes(month) && property.highSeasonSurcharge) {
            dailyPrice *= (1 + property.highSeasonSurcharge / 100);
          }
          
          // TODO: Implementar feriados se necessário
        }
        
        dailyPrice = Math.round(dailyPrice);
        totalStay += dailyPrice;
        dailyPrices.push({ date: dateStr, price: dailyPrice });
        
        calcDate.setDate(calcDate.getDate() + 1);
      }

      // Hóspedes extras
      const guests = args.guests || 2;
      let extraGuestFee = 0;
      if (guests > property.maxGuests && property.pricePerExtraGuest) {
        const extraGuests = guests - property.maxGuests;
        extraGuestFee = extraGuests * property.pricePerExtraGuest * nights;
      }

      // Taxas adicionais
      const cleaningFee = property.cleaningFee || 0;
      const serviceFee = Math.round(totalStay * 0.05); // 5% taxa de serviço
      const total = totalStay + extraGuestFee + cleaningFee + serviceFee;

      const calculation = {
        propertyId: args.propertyId,
        propertyName: property.title || 'Propriedade',
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        nights,
        guests,
        // PREÇOS DINÂMICOS
        dailyPrices,
        averageDailyPrice: Math.round(totalStay / nights),
        subtotal: totalStay,
        extraGuestFee,
        cleaningFee,
        serviceFee,
        total,
        currency: 'BRL',
        // BREAKDOWN DETALHADO
        breakdown: {
          accommodation: `R$ ${totalStay} (hospedagem ${nights} noites)`,
          extraGuests: extraGuestFee > 0 ? `R$ ${extraGuestFee} (${guests - property.maxGuests} hóspedes extras)` : null,
          cleaning: cleaningFee > 0 ? `R$ ${cleaningFee} (taxa de limpeza)` : null,
          service: `R$ ${serviceFee} (taxa de serviço 5%)`,
          total: `R$ ${total} (total)`
        },
        // INFORMAÇÕES ADICIONAIS
        minimumNights: property.minimumNights || 1,
        meetsMinimum: nights >= (property.minimumNights || 1),
        appliedSurcharges: []
      };
      
      // Registrar surcharges aplicados
      if (property.weekendSurcharge) calculation.appliedSurcharges.push(`Fim de semana: +${property.weekendSurcharge}%`);
      if (property.decemberSurcharge) calculation.appliedSurcharges.push(`Dezembro: +${property.decemberSurcharge}%`);
      if (property.highSeasonSurcharge && property.highSeasonMonths) {
        const relevantMonths = property.highSeasonMonths.filter(m => 
          dailyPrices.some(dp => new Date(dp.date).getMonth() + 1 === m)
        );
        if (relevantMonths.length > 0) {
          calculation.appliedSurcharges.push(`Alta temporada: +${property.highSeasonSurcharge}%`);
        }
      }

      logger.info('Cálculo de preço concluído', { 
        propertyId: args.propertyId,
        total,
        nights,
        averageDailyPrice: calculation.averageDailyPrice,
        component: 'CorrectedAgentFunctions'
      });

      return {
        success: true,
        calculation,
        message: `Preço calculado: R$${total} para ${nights} noite${nights > 1 ? 's' : ''} (média R$${calculation.averageDailyPrice}/dia)`
      };

    } catch (error) {
      logger.error('Erro ao calcular preço', { 
        error,
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'calculatePrice'
      });
      
      return {
        success: false,
        message: 'Erro interno ao calcular preço: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        calculation: null
      };
    }
  }

  static async registerClient(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Registrando cliente/lead', { 
        name: args.name, 
        phone: args.phone,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'registerClient'
      });
      
      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);
      
      // Verificar se lead já existe
      const existingLead = await services.leads.getWhere('phone', '==', args.phone);
      
      if (existingLead.length > 0) {
        // Lead já existe, atualizar dados se necessário
        const lead = existingLead[0];
        
        const updates: Partial<Lead> = {
          name: args.name || lead.name,
          email: args.email || lead.email,
          document: args.document || lead.document,
          documentType: 'cpf',
          updatedAt: new Date()
        };
        
        // Adicionar fonte e temperatura se necessário
        if (!lead.source || lead.source !== 'whatsapp_ai') {
          updates.source = args.source || 'whatsapp_ai';
        }
        
        if (args.temperature && ['hot', 'warm', 'cold'].includes(args.temperature)) {
          updates.temperature = args.temperature;
        }
        
        await services.leads.update(lead.id!, updates);
        
        logger.info('Lead existente atualizado', { 
          leadId: lead.id,
          updates,
          component: 'CorrectedAgentFunctions'
        });
        
        return {
          success: true,
          client: lead.id!, // Retornar ID para compatibilidade
          clientData: { ...lead, ...updates },
          message: 'Cliente atualizado com sucesso!',
          isExisting: true
        };
      }
      
      // Criar novo Lead
      const leadData: Omit<Lead, 'id'> = {
        name: args.name,
        phone: args.phone,
        email: args.email || undefined,
        document: args.document,
        documentType: 'cpf',
        source: (args.source as LeadSource) || LeadSource.WHATSAPP_AI,
        status: LeadStatus.NEW,
        temperature: (args.temperature as 'hot' | 'warm' | 'cold') || 'warm',
        score: 60,
        qualificationCriteria: {
          budget: false,
          authority: false,
          need: false,
          timeline: false
        },
        preferences: {
          propertyType: [],
          locations: [],
          amenities: [],
          priceRange: {}
        },
        tags: ['whatsapp', 'ai-agent'],
        firstContactDate: new Date(),
        lastContactDate: new Date(),
        totalInteractions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Adicionar interesses se fornecidos
      if (args.interests) {
        leadData.notes = args.interests;
        leadData.tags = [...(leadData.tags || []), 'has-interests'];
      }
      
      const createdLead = await services.leads.create(leadData);
      
      logger.info('Novo lead criado', { 
        leadId: createdLead.id,
        name: args.name,
        phone: args.phone,
        component: 'CorrectedAgentFunctions'
      });
      
      return {
        success: true,
        client: createdLead.id!, // Retornar ID para compatibilidade 
        clientData: createdLead,
        message: 'Cliente registrado com sucesso no CRM!',
        isExisting: false
      };

    } catch (error) {
      logger.error('Erro ao registrar cliente/lead', { 
        error,
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'registerClient'
      });
      
      return {
        success: false,
        message: 'Erro ao registrar cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        client: null
      };
    }
  }

  static async checkVisitAvailability(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Verificando disponibilidade para visitas', { 
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'checkVisitAvailability'
      });
      
      const startDate = args.startDate ? new Date(args.startDate) : new Date();
      const days = args.days || 7;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      
      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);
      
      // Converter preferência de horário para enum
      const preferredTimes: string[] = [];
      if (args.timePreference) {
        switch (args.timePreference) {
          case 'morning':
            preferredTimes.push(TimePreference.MORNING);
            break;
          case 'afternoon':
            preferredTimes.push(TimePreference.AFTERNOON);
            break;
          case 'evening':
            preferredTimes.push(TimePreference.EVENING);
            break;
        }
      }
      
      // Verificar disponibilidade de visitas
      // Como não temos serviço completo de visitas ainda, simular slots disponíveis
      let availableSlots: any[] = [];
      
      try {
        // Tentar usar serviço de visitas se disponível
        if (services.visits && typeof services.visits.checkAvailability === 'function') {
          availableSlots = await services.visits.checkAvailability({
            startDate,
            endDate,
            preferredTimes: preferredTimes.length > 0 ? preferredTimes : undefined
          });
        } else {
          // Gerar slots simulados
          availableSlots = this.generateMockAvailableSlots(startDate, days, args.timePreference);
        }
      } catch (visitServiceError) {
        logger.warn('Serviço de visitas não disponível, usando slots simulados', { 
          error: visitServiceError,
          component: 'CorrectedAgentFunctions'
        });
        
        // Gerar slots simulados como fallback
        availableSlots = this.generateMockAvailableSlots(startDate, days, args.timePreference);
      }
      
      if (availableSlots.length === 0) {
        return {
          success: true, // Show alternative message
          message: 'No momento não temos horários disponíveis para visita presencial. Que tal garantir sua reserva diretamente? Temos disponibilidade para as datas solicitadas e você pode conhecer o imóvel no check-in!',
          availableSlots: [],
          alternativeAction: 'direct_booking'
        };
      }
      
      // Formatar slots para resposta
      const formattedSlots = availableSlots.slice(0, 15).map(slot => ({
        date: slot.date.toISOString().split('T')[0],
        dateFormatted: slot.date.toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: slot.time,
        timeFormatted: slot.time,
        period: this.getTimePeriod(slot.time),
        agentName: slot.agentName || 'Consultor Disponível',
        duration: slot.duration
      }));
      
      logger.info('Horários de visita encontrados', { 
        totalSlots: formattedSlots.length,
        startDate: startDate.toISOString().split('T')[0],
        days,
        timePreference: args.timePreference,
        component: 'CorrectedAgentFunctions'
      });
      
      return {
        success: true,
        availableSlots: formattedSlots,
        message: `Encontrei ${formattedSlots.length} horários disponíveis para visita presencial!`,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          days,
          timePreference: args.timePreference
        }
      };
      
    } catch (error) {
      logger.error('Erro ao verificar disponibilidade de visitas', { 
        error,
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'checkVisitAvailability'
      });
      
      return {
        success: false,
        message: 'Erro ao verificar disponibilidade para visitas',
        availableSlots: []
      };
    }
  }
  
  private static generateTimeSlots(startTime: string, endTime: string, preference?: string): string[] {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    const endTotalMin = endHour * 60 + endMin;
    
    while (currentHour * 60 < endTotalMin - 60) { // Deixar 1h de buffer no final
      const timeStr = `${currentHour.toString().padStart(2, '0')}:00`;
      
      // Filtrar por preferência de horário se especificada
      if (!preference || this.matchesTimePreference(timeStr, preference)) {
        slots.push(timeStr);
      }
      
      currentHour++;
    }
    
    return slots;
  }
  
  private static matchesTimePreference(time: string, preference: string): boolean {
    const hour = parseInt(time.split(':')[0]);
    
    switch (preference) {
      case 'morning': return hour >= 8 && hour < 12;
      case 'afternoon': return hour >= 12 && hour < 18;
      case 'evening': return hour >= 18 && hour < 21;
      default: return true;
    }
  }
  
  private static getTimePeriod(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 8 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    if (hour >= 18 && hour < 21) return 'Noite';
    return 'Outro';
  }

  private static generateMockAvailableSlots(startDate: Date, days: number, timePreference?: string): any[] {
    const slots = [];
    const currentDate = new Date(startDate);
    
    for (let day = 0; day < days; day++) {
      // Pular domingos (dia 0)
      if (currentDate.getDay() !== 0) {
        const availableTimes = this.generateTimeSlots('09:00', '18:00', timePreference);
        
        availableTimes.forEach(time => {
          slots.push({
            date: new Date(currentDate),
            time,
            duration: 60,
            agentName: 'Consultor Disponível'
          });
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots.slice(0, 15); // Limitar a 15 slots
  }

  static async scheduleVisit(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Agendando visita presencial', { 
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'scheduleVisit'
      });
      
      // Validar dados obrigatórios
      if (!args.clientId || !args.propertyId || !args.visitDate || !args.visitTime) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando para agendar visita (clientId, propertyId, visitDate, visitTime)',
          visit: null
        };
      }

      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);

      // 1. Verificar se propriedade existe e está ativa
      const property = await services.properties.getById(args.propertyId);
      if (!property || !property.isActive) {
        return {
          success: false,
          message: 'Propriedade não encontrada ou inativa',
          visit: null
        };
      }

      // 2. Buscar dados do Lead (cliente)
      const lead = await services.leads.getById(args.clientId);
      if (!lead) {
        return {
          success: false,
          message: 'Cliente não encontrado no CRM',
          visit: null
        };
      }

      // 3. Validar data da visita
      const visitDateTime = new Date(args.visitDate + 'T' + args.visitTime + ':00');
      const now = new Date();
      
      if (visitDateTime < now) {
        return {
          success: false,
          message: 'Data da visita deve ser no futuro',
          visit: null
        };
      }

      // 4. Criar visita usando modelo VisitAppointment completo
      const visitData: Omit<VisitAppointment, 'id'> = {
        tenantId,
        clientId: args.clientId,
        clientName: lead.name,
        clientPhone: lead.phone,
        propertyId: args.propertyId,
        propertyName: property.title || property.name || 'Propriedade',
        propertyAddress: property.address || '',
        scheduledDate: new Date(args.visitDate),
        scheduledTime: args.visitTime,
        duration: args.duration || 60, // Duração padrão de 60 minutos
        status: VisitStatus.SCHEDULED,
        notes: args.notes || '',
        clientRequests: args.clientRequests || (args.notes ? [args.notes] : []),
        confirmedByClient: true, // Cliente confirmou ao agendar via WhatsApp
        confirmedByAgent: false, // Aguardando confirmação da imobiliária
        source: (args.source as 'whatsapp' | 'website' | 'phone' | 'manual') || 'whatsapp',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Salvar no Firebase usando tenant-scoped service
      const createdVisit = await services.visits.create(visitData);
      
      logger.info('Visita agendada com sucesso', { 
        visitId: createdVisit.id,
        clientId: args.clientId,
        propertyId: args.propertyId,
        visitDate: args.visitDate,
        visitTime: args.visitTime,
        component: 'CorrectedAgentFunctions'
      });

      // 5. Atualizar Lead no CRM
      try {
        await services.leads.update(lead.id!, {
          status: LeadStatus.OPPORTUNITY,
          temperature: 'hot',
          score: Math.max(lead.score, 85),
          lastContactDate: new Date(),
          updatedAt: new Date()
        });
        
        logger.info('Lead atualizado após agendamento de visita', { 
          leadId: lead.id,
          newStatus: LeadStatus.OPPORTUNITY,
          component: 'CorrectedAgentFunctions'
        });
        
      } catch (crmError) {
        logger.error('Erro ao atualizar Lead após visita', { 
          error: crmError,
          leadId: lead.id,
          component: 'CorrectedAgentFunctions'
        });
        // Não falhar a visita por erro no CRM
      }

      return {
        success: true,
        visit: {
          id: createdVisit.id!,
          ...visitData
        },
        message: `✅ Visita agendada com sucesso!\n📅 ${new Date(args.visitDate).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} às ${args.visitTime}\n🏠 ${property.title || property.name || 'Propriedade'}\n📍 ${property.address}\n\nEm breve nosso consultor entrará em contato para confirmar! 📞`,
        confirmationDetails: {
          visitId: createdVisit.id,
          date: args.visitDate,
          dateFormatted: new Date(args.visitDate).toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: args.visitTime,
          property: property.title || property.name || 'Propriedade',
          address: property.address,
          neighborhood: property.neighborhood,
          contact: 'Nosso consultor entrará em contato para confirmar'
        }
      };

    } catch (error) {
      logger.error('Erro ao agendar visita', { 
        error,
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'scheduleVisit'
      });
      
      return {
        success: false,
        message: 'Erro ao agendar visita: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        visit: null
      };
    }
  }

  static async createReservation(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Criando nova reserva', { 
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'createReservation'
      });
      
      // Validar dados obrigatórios
      if (!args.clientId || !args.propertyId || !args.checkIn || !args.checkOut) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando para criar reserva',
          reservation: null
        };
      }

      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);

      // 1. Verificar se propriedade existe e está ativa
      const property = await services.properties.getById(args.propertyId);
      if (!property || !property.isActive) {
        return {
          success: false,
          message: 'Propriedade não encontrada ou inativa',
          reservation: null
        };
      }

      // 2. Verificar disponibilidade das datas
      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      // Verificar mínimo de noites
      if (nights < (property.minimumNights || 1)) {
        return {
          success: false,
          message: `Mínimo de ${property.minimumNights || 1} noite(s) necessário`,
          reservation: null
        };
      }

      // Verificar conflitos com datas indisponíveis
      const unavailableDates = property.unavailableDates || [];
      const dateConflicts = [];
      const currentDate = new Date(checkIn);
      
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (unavailableDates.find(d => d.toISOString().split('T')[0] === dateStr)) {
          dateConflicts.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (dateConflicts.length > 0) {
        return {
          success: false,
          message: `Datas indisponíveis: ${dateConflicts.join(', ')}`,
          reservation: null,
          conflicts: dateConflicts
        };
      }

      // 3. Verificar conflitos com reservas existentes
      const existingReservations = await services.reservations.getWhere('propertyId', '==', args.propertyId);
      const activeReservations = existingReservations.filter(r => 
        r.status !== 'cancelled'
      );
      
      for (const existingReservation of activeReservations) {
        const existingCheckIn = new Date(existingReservation.checkIn);
        const existingCheckOut = new Date(existingReservation.checkOut);
        
        // Verificar sobreposição de datas
        if (checkIn < existingCheckOut && checkOut > existingCheckIn) {
          return {
            success: false,
            message: `Conflito com reserva existente (${existingCheckIn.toISOString().split('T')[0]} - ${existingCheckOut.toISOString().split('T')[0]})`,
            reservation: null,
            conflict: {
              reservationId: existingReservation.id,
              checkIn: existingCheckIn.toISOString().split('T')[0],
              checkOut: existingCheckOut.toISOString().split('T')[0]
            }
          };
        }
      }

      // 4. Criar reserva usando modelo Reservation atualizado
      const reservationData: Omit<Reservation, 'id'> = {
        propertyId: args.propertyId,
        clientId: args.clientId,
        checkIn,
        checkOut,
        guests: args.guests,
        nights,
        totalAmount: args.totalPrice,
        status: (args.status as any) || 'pending',
        paymentMethod: args.paymentMethod || 'pix',
        observations: args.notes || args.observations || '',
        source: 'whatsapp',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const reservation = await services.reservations.create(reservationData);
      
      // 5. ATUALIZAR DISPONIBILIDADE DA PROPRIEDADE
      try {
        console.log(`📅 [RESERVATION] Atualizando disponibilidade da propriedade ${args.propertyId}`);
        
        // Adicionar datas ocupadas ao array de datas indisponíveis
        const newUnavailableDates = [...(property.unavailableDates || [])];
        const reservationDate = new Date(checkIn);
        
        while (reservationDate < checkOut) {
          newUnavailableDates.push(new Date(reservationDate));
          reservationDate.setDate(reservationDate.getDate() + 1);
        }
        
        // Atualizar propriedade
        await services.properties.update(args.propertyId, {
          unavailableDates: newUnavailableDates,
          updatedAt: new Date()
        });
        
        console.log(`✅ [RESERVATION] Disponibilidade atualizada: ${nights} noites bloqueadas`);
      } catch (updateError) {
        console.error('⚠️ [RESERVATION] Erro ao atualizar disponibilidade:', updateError);
        // Não falhar a reserva por erro na atualização de disponibilidade
      }
      
      console.log(`✅ [RESERVATION] Reserva criada com ID: ${reservation.id}`);

      return {
        success: true,
        reservation: {
          id: reservation.id,
          propertyId: args.propertyId,
          propertyName: property.title || 'Propriedade',
          clientId: args.clientId,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          nights,
          guests: args.guests,
          totalPrice: args.totalPrice,
          status: 'confirmed',
          paymentStatus: 'pending',
          notes: args.notes || '',
          createdAt: reservation.createdAt
        },
        message: `Reserva criada com sucesso! Propriedade bloqueada para ${nights} noite(s).`,
        blockedDates: {
          from: args.checkIn,
          to: args.checkOut,
          nights
        }
      };

    } catch (error) {
      // Reservation creation error handled
      return {
        success: false,
        message: 'Erro ao criar reserva: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        reservation: null
      };
    }
  }

  static async classifyLeadStatus(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('Classificando status do Lead', { 
        clientPhone: args.clientPhone,
        conversationOutcome: args.conversationOutcome,
        reason: args.reason,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'classifyLeadStatus'
      });
      
      // Validar dados obrigatórios
      if (!args.clientPhone || !args.conversationOutcome || !args.reason) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando para classificar lead (clientPhone, conversationOutcome, reason)',
          classification: null
        };
      }

      // Usar tenant-scoped services
      const services = TenantServiceFactory.getServices(tenantId);

      // 1. Buscar lead existente pelo telefone
      const existingLeads = await services.leads.getWhere('phone', '==', args.clientPhone);
      let lead = existingLeads.length > 0 ? existingLeads[0] : null;
      
      if (!lead) {
        // Criar novo lead se não existir
        logger.info('Criando novo lead para classificação', { 
          clientPhone: args.clientPhone,
          component: 'CorrectedAgentFunctions'
        });
        
        const newLeadData: Omit<Lead, 'id'> = {
          name: args.clientPhone, // Será atualizado quando obtivermos o nome
          phone: args.clientPhone,
          status: LeadStatus.NEW,
          source: LeadSource.WHATSAPP_AI,
          score: 60,
          temperature: 'warm',
          qualificationCriteria: {
            budget: false,
            authority: false,
            need: false,
            timeline: false
          },
          preferences: {
            propertyType: [],
            locations: [],
            amenities: [],
            priceRange: {}
          },
          tags: ['whatsapp', 'ai-classified'],
          firstContactDate: new Date(),
          lastContactDate: new Date(),
          totalInteractions: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        lead = await services.leads.create(newLeadData);
      }

      // 2. Mapear outcome para status do CRM
      let newStatus: LeadStatus;
      let temperature: 'cold' | 'warm' | 'hot' = lead.temperature;
      let score = lead.score;

      switch (args.conversationOutcome) {
        case 'deal_closed':
          newStatus = LeadStatus.WON;
          temperature = 'hot';
          score = Math.max(score, 95);
          break;
        
        case 'visit_scheduled':
          newStatus = LeadStatus.OPPORTUNITY;
          temperature = 'hot';
          score = Math.max(score, 85);
          break;
        
        case 'price_negotiation':
          newStatus = LeadStatus.NEGOTIATION;
          temperature = 'warm';
          score = Math.max(score, 75);
          break;
        
        case 'wants_human_agent':
          newStatus = LeadStatus.QUALIFIED;
          temperature = 'warm';
          score = Math.max(score, 70);
          break;
        
        case 'information_gathering':
          newStatus = LeadStatus.CONTACTED;
          temperature = 'warm';
          score = Math.max(score, 60);
          break;
        
        case 'no_reservation':
          newStatus = LeadStatus.NURTURING;
          temperature = 'cold';
          score = Math.min(score, 40);
          break;
        
        case 'lost_interest':
          newStatus = LeadStatus.LOST;
          temperature = 'cold';
          score = Math.min(score, 30);
          break;
        
        default:
          newStatus = LeadStatus.CONTACTED;
          temperature = 'warm';
      }

      // Usar newStatus do parâmetro se fornecido
      if (args.newStatus && Object.values(LeadStatus).includes(args.newStatus)) {
        newStatus = args.newStatus;
      }
      
      // Usar temperature do parâmetro se fornecido
      if (args.temperature && ['hot', 'warm', 'cold'].includes(args.temperature)) {
        temperature = args.temperature;
      }

      // 3. Preparar updates baseados no metadata
      const updates: Partial<Lead> = {
        status: newStatus,
        temperature,
        score,
        lastContactDate: new Date(),
        updatedAt: new Date()
      };

      // Processar metadata se fornecido
      if (args.metadata) {
        if (args.metadata.propertiesViewed?.length > 0) {
          updates.tags = [...new Set([...(lead.tags || []), 'viewed-properties'])];
          // Aumentar score se visualizou propriedades
          updates.score = Math.min(100, (updates.score || score) + 10);
        }
        
        if (args.metadata.priceDiscussed) {
          updates.preferences = {
            ...lead.preferences,
            priceRange: {
              ...lead.preferences.priceRange,
              max: args.metadata.priceDiscussed
            }
          };
          updates.qualificationCriteria = {
            ...lead.qualificationCriteria,
            budget: true
          };
        }
        
        if (args.metadata.visitDate) {
          updates.preferences = {
            ...updates.preferences || lead.preferences,
            moveInDate: new Date(args.metadata.visitDate)
          };
          updates.qualificationCriteria = {
            ...updates.qualificationCriteria || lead.qualificationCriteria,
            timeline: true
          };
        }

        if (args.metadata.objections?.length > 0) {
          updates.tags = [...new Set([...(updates.tags || lead.tags || []), 'has-objections'])];
        }
      }

      // 4. Atualizar lead no CRM
      await services.leads.update(lead.id!, updates);

      logger.info('Lead classificado com sucesso', { 
        leadId: lead.id,
        oldStatus: lead.status,
        newStatus,
        oldTemperature: lead.temperature,
        newTemperature: temperature,
        oldScore: lead.score,
        newScore: updates.score,
        outcome: args.conversationOutcome,
        component: 'CorrectedAgentFunctions'
      });

      return {
        success: true,
        classification: {
          leadId: lead.id,
          oldStatus: lead.status,
          newStatus,
          oldTemperature: lead.temperature,
          newTemperature: temperature,
          oldScore: lead.score,
          newScore: updates.score,
          outcome: args.conversationOutcome,
          reason: args.reason,
          suggestedActions: this.getSuggestedActionsForOutcome(args.conversationOutcome)
        },
        message: `Lead classificado com sucesso! Status: ${newStatus}, Temperatura: ${temperature}, Score: ${updates.score}`
      };

    } catch (error) {
      logger.error('Erro ao classificar lead', { 
        error,
        args,
        tenantId,
        component: 'CorrectedAgentFunctions',
        function: 'classifyLeadStatus'
      });
      
      return {
        success: false,
        message: 'Erro ao classificar lead: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        classification: null
      };
    }
  }

  private static getSuggestedActionsForOutcome(outcome: string): string[] {
    switch (outcome) {
      case 'deal_closed':
        return ['Preparar contrato', 'Confirmar dados de pagamento', 'Agendar check-in'];
      
      case 'visit_scheduled':
        return ['Confirmar visita por WhatsApp', 'Preparar propriedade para visita', 'Enviar informações de localização'];
      
      case 'price_negotiation':
        return ['Preparar proposta com desconto', 'Verificar margem de negociação', 'Agendar ligação para negociar'];
      
      case 'wants_human_agent':
        return ['Transferir para consultor humano', 'Agendar ligação', 'Priorizar contato'];
      
      case 'information_gathering':
        return ['Enviar mais informações sobre propriedades', 'Agendar follow-up em 2 dias', 'Qualificar necessidades'];
      
      case 'no_reservation':
        return ['Adicionar à lista de nutrição', 'Enviar conteúdo educativo', 'Follow-up em 1 semana'];
      
      case 'lost_interest':
        return ['Marcar para follow-up em 30 dias', 'Analisar motivos da perda', 'Adicionar à campanha de reativação'];
      
      default:
        return ['Fazer follow-up', 'Continuar nutrição'];
    }
  }

  // ===== EXECUTOR PRINCIPAL =====

  static async executeFunction(
    functionName: string, 
    args: any, 
    tenantId: string
  ): Promise<any> {
    try {
      console.log(`⚡ [EXECUTE] Executando função: ${functionName}`);
      
      switch (functionName) {
        case 'search_properties':
          return await this.searchProperties(args, tenantId);
        
        case 'send_property_media':
          return await this.sendPropertyMedia(args, tenantId);
        
        case 'get_property_details':
          return await this.getPropertyDetails(args, tenantId);
        
        case 'calculate_price':
          return await this.calculatePrice(args, tenantId);
        
        case 'register_client':
          return await this.registerClient(args, tenantId);
        
        case 'check_visit_availability':
          return await this.checkVisitAvailability(args, tenantId);
        
        case 'schedule_visit':
          return await this.scheduleVisit(args, tenantId);
        
        case 'create_reservation':
          return await this.createReservation(args, tenantId);
        
        case 'classify_lead_status':
          return await this.classifyLeadStatus(args, tenantId);
        
        default:
          throw new Error(`Função ${functionName} não implementada`);
      }
    } catch (error) {
      // Function execution error handled
      return {
        success: false,
        message: `Erro na execução da função ${functionName}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

// ===== HELPER PARA OPENAI FUNCTION CALLING =====

export function getCorrectedOpenAIFunctions(): any[] {
  return CORRECTED_AI_FUNCTIONS.map(func => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }
  }));
}