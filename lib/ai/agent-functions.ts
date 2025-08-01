// lib/ai/agent-functions.ts
// AGENT FUNCTIONS - PRODUCTION VERSION
// Funções essenciais para o agente Sofia MVP

import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { crmService } from '@/lib/services/crm-service';
import { visitService } from '@/lib/services/visit-service';
import { LeadStatus } from '@/lib/types/crm';
import { VisitStatus, TimePreference } from '@/lib/types/visit-appointment';
import { logger } from '@/lib/utils/logger';

// ===== TIPOS =====

interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ===== DEFINIÇÕES DAS FUNÇÕES =====

export const AI_FUNCTIONS: AIFunction[] = [
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
      required: ['guests']
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

// ===== IMPLEMENTAÇÕES DAS FUNÇÕES =====

export class AgentFunctions {
  
  static async searchProperties(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('🔍 [search_properties] Iniciando busca', { args, tenantId });
      
      const searchFilters = {
        tenantId,
        location: args.location,
        guests: args.guests,
        checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
        checkOut: args.checkOut ? new Date(args.checkOut) : undefined,
        maxPrice: args.budget
      };
      
      let properties = await propertyService.searchProperties(searchFilters);
      
      if (properties.length === 0 && args.location) {
        logger.info('🔍 [search_properties] Expandindo busca sem localização');
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
      
      // Filtrar por comodidades se especificadas
      if (args.amenities && Array.isArray(args.amenities) && args.amenities.length > 0) {
        properties = properties.filter(property => {
          const propertyAmenities = property.amenities || [];
          return args.amenities.some((amenity: string) => 
            propertyAmenities.some((propAmenity: string) => 
              propAmenity.toLowerCase().includes(amenity.toLowerCase())
            )
          );
        });
      }
      
      // Ordenar por preço CRESCENTE
      properties.sort((a, b) => {
        const priceA = a.basePrice || 999999;
        const priceB = b.basePrice || 999999;
        return priceA - priceB;
      });
      
      // Filtrar propriedades vazias ou inválidas
      const validProperties = properties.filter(p => p && p.id && p.isActive);
      
      const formattedProperties = validProperties.slice(0, 8).map(p => ({
        id: p.id,
        name: p.title || p.name || 'Propriedade sem nome',
        location: p.city || p.location || 'Localização não informada',
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
        cleaningFee: p.cleaningFee || 0,
        allowsPets: p.allowsPets || false,
        neighborhood: p.neighborhood || ''
      }));
      
      logger.info('✅ [search_properties] Busca concluída', { 
        found: formattedProperties.length,
        total: validProperties.length
      });
      
      return {
        success: true,
        count: formattedProperties.length,
        properties: formattedProperties,
        message: `Encontrei ${formattedProperties.length} opções ordenadas por preço (mais baratas primeiro)`,
        availableIds: formattedProperties.map(p => p.id)
      };
        
    } catch (error) {
      logger.error('❌ [search_properties] Erro na busca', { error });
      return {
        success: false,
        message: 'Erro interno ao buscar propriedades',
        properties: []
      };
    }
  }

  static async sendPropertyMedia(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📸 [send_property_media] Buscando mídia', { propertyId: args.propertyId });
      
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada',
          media: null
        };
      }

      const maxPhotos = args.maxPhotos || 8;
      const includeVideos = args.includeVideos !== false;
      
      // Preparar fotos
      let photos = (property.photos || []).slice();
      photos.sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return (a.order || 0) - (b.order || 0);
      });
      
      photos = photos.slice(0, maxPhotos);
      
      // Preparar vídeos
      let videos = [];
      if (includeVideos && property.videos && property.videos.length > 0) {
        videos = property.videos.slice(0, 3);
      }

      const mediaCount = photos.length + videos.length;
      
      if (mediaCount === 0) {
        return {
          success: false,
          message: 'Esta propriedade ainda não possui fotos ou vídeos disponíveis.',
          media: null
        };
      }

      logger.info('✅ [send_property_media] Mídia preparada', { 
        photos: photos.length, 
        videos: videos.length 
      });

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
      logger.error('❌ [send_property_media] Erro ao buscar mídia', { error });
      return {
        success: false,
        message: 'Erro ao buscar fotos e vídeos da propriedade',
        media: null
      };
    }
  }

  static async getPropertyDetails(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📋 [get_property_details] Buscando detalhes', { propertyId: args.propertyId });
      
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada',
          property: null
        };
      }

      logger.info('✅ [get_property_details] Detalhes encontrados');

      return {
        success: true,
        property: {
          id: property.id,
          name: property.title || property.name || 'Sem nome',
          description: property.description,
          location: property.city || property.location,
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
          pricePerExtraGuest: property.pricePerExtraGuest || 0,
          weekendSurcharge: property.weekendSurcharge || 0,
          holidaySurcharge: property.holidaySurcharge || 0,
          decemberSurcharge: property.decemberSurcharge || 0,
          highSeasonSurcharge: property.highSeasonSurcharge || 0,
          highSeasonMonths: property.highSeasonMonths || [],
          unavailableDates: property.unavailableDates || [],
          customPricing: property.customPricing || {},
          status: property.status,
          isActive: property.isActive
        }
      };

    } catch (error) {
      logger.error('❌ [get_property_details] Erro ao buscar detalhes', { error });
      return {
        success: false,
        message: 'Erro ao buscar detalhes da propriedade',
        property: null
      };
    }
  }

  static async calculatePrice(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('💰 [calculate_price] Calculando preço', { args });
      
      if (!args.propertyId || !args.checkIn || !args.checkOut) {
        return {
          success: false,
          message: 'Parâmetros obrigatórios faltando (propertyId, checkIn, checkOut)',
          calculation: null
        };
      }
      
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: `Propriedade com ID ${args.propertyId} não encontrada`,
          calculation: null
        };
      }

      // Calcular número de noites
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

      // Verificar disponibilidade
      const unavailableDates = property.unavailableDates || [];
      const conflicts = [];
      const currentDate = new Date(checkIn);
      
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

      // Cálculo de preços dinâmicos
      const basePrice = property.basePrice || 300;
      let totalStay = 0;
      const dailyPrices = [];
      
      const calcDate = new Date(checkIn);
      for (let i = 0; i < nights; i++) {
        const dateStr = calcDate.toISOString().split('T')[0];
        let dailyPrice = basePrice;
        
        // Preço customizado
        if (property.customPricing && property.customPricing[dateStr]) {
          dailyPrice = property.customPricing[dateStr];
        } else {
          const month = calcDate.getMonth() + 1;
          const dayOfWeek = calcDate.getDay();
          
          // Surcharges
          if ((dayOfWeek === 0 || dayOfWeek === 6) && property.weekendSurcharge) {
            dailyPrice *= (1 + property.weekendSurcharge / 100);
          }
          
          if (month === 12 && property.decemberSurcharge) {
            dailyPrice *= (1 + property.decemberSurcharge / 100);
          }
          
          if (property.highSeasonMonths?.includes(month) && property.highSeasonSurcharge) {
            dailyPrice *= (1 + property.highSeasonSurcharge / 100);
          }
        }
        
        dailyPrice = Math.round(dailyPrice);
        totalStay += dailyPrice;
        dailyPrices.push({ date: dateStr, price: dailyPrice });
        
        calcDate.setDate(calcDate.getDate() + 1);
      }

      // Taxas adicionais
      const guests = args.guests || 2;
      let extraGuestFee = 0;
      if (guests > property.maxGuests && property.pricePerExtraGuest) {
        const extraGuests = guests - property.maxGuests;
        extraGuestFee = extraGuests * property.pricePerExtraGuest * nights;
      }

      const cleaningFee = property.cleaningFee || 0;
      const serviceFee = Math.round(totalStay * 0.05);
      const total = totalStay + extraGuestFee + cleaningFee + serviceFee;

      const calculation = {
        propertyId: args.propertyId,
        propertyName: property.title || 'Propriedade',
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        nights,
        guests,
        dailyPrices,
        averageDailyPrice: Math.round(totalStay / nights),
        subtotal: totalStay,
        extraGuestFee,
        cleaningFee,
        serviceFee,
        total,
        currency: 'BRL',
        breakdown: {
          accommodation: `R$ ${totalStay} (hospedagem ${nights} noites)`,
          extraGuests: extraGuestFee > 0 ? `R$ ${extraGuestFee} (${guests - property.maxGuests} hóspedes extras)` : null,
          cleaning: cleaningFee > 0 ? `R$ ${cleaningFee} (taxa de limpeza)` : null,
          service: `R$ ${serviceFee} (taxa de serviço 5%)`,
          total: `R$ ${total} (total)`
        },
        minimumNights: property.minimumNights || 1,
        meetsMinimum: nights >= (property.minimumNights || 1)
      };

      logger.info('✅ [calculate_price] Cálculo concluído', { 
        total, 
        nights, 
        averagePrice: calculation.averageDailyPrice 
      });

      return {
        success: true,
        calculation,
        message: `Preço calculado: R$${total} para ${nights} noite${nights > 1 ? 's' : ''} (média R$${calculation.averageDailyPrice}/dia)`
      };

    } catch (error) {
      logger.error('❌ [calculate_price] Erro no cálculo', { error });
      return {
        success: false,
        message: 'Erro interno ao calcular preço',
        calculation: null
      };
    }
  }

  static async registerClient(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('👤 [register_client] Registrando cliente', { 
        name: args.name, 
        phone: args.phone 
      });
      
      // Validar CPF obrigatório
      if (!args.document || args.document.trim() === '') {
        return {
          success: false,
          message: 'CPF é obrigatório para cadastro do cliente',
          client: null
        };
      }
      
      const clientData: any = {
        name: args.name,
        phone: args.phone,
        document: args.document,
        documentType: 'cpf',
        tenantId,
        source: 'whatsapp'
      };
      
      if (args.email && args.email.trim() !== '') {
        clientData.email = args.email;
      }

      const client = await clientServiceWrapper.createOrUpdate(clientData);
      
      logger.info('✅ [register_client] Cliente registrado', { clientId: client.id });

      return {
        success: true,
        client: client.id,
        clientData: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email || undefined,
          document: client.document || undefined
        },
        message: 'Cliente registrado com sucesso!'
      };

    } catch (error) {
      logger.error('❌ [register_client] Erro ao registrar', { error });
      return {
        success: false,
        message: 'Erro ao registrar cliente',
        client: null
      };
    }
  }

  static async checkVisitAvailability(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📅 [check_visit_availability] Verificando disponibilidade', { args });
      
      const startDate = args.startDate ? new Date(args.startDate) : new Date();
      const days = args.days || 7;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      
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
      
      const availableSlots = await visitService.checkAvailability(tenantId, {
        startDate,
        endDate,
        preferredTimes: preferredTimes.length > 0 ? preferredTimes : undefined
      });
      
      if (availableSlots.length === 0) {
        return {
          success: true,
          message: 'No momento não temos horários disponíveis para visita presencial. Que tal garantir sua reserva diretamente?',
          availableSlots: [],
          alternativeAction: 'direct_booking'
        };
      }
      
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
      
      logger.info('✅ [check_visit_availability] Horários encontrados', { 
        count: formattedSlots.length 
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
      logger.error('❌ [check_visit_availability] Erro ao verificar', { error });
      return {
        success: false,
        message: 'Erro ao verificar disponibilidade para visitas',
        availableSlots: []
      };
    }
  }
  
  private static getTimePeriod(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 8 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    if (hour >= 18 && hour < 21) return 'Noite';
    return 'Outro';
  }

  static async scheduleVisit(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('🏠 [schedule_visit] Agendando visita', { args });
      
      if (!args.clientId || !args.propertyId || !args.visitDate || !args.visitTime) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando (clientId, propertyId, visitDate, visitTime)',
          visit: null
        };
      }

      const property = await propertyService.getById(args.propertyId);
      if (!property || !property.isActive) {
        return {
          success: false,
          message: 'Propriedade não encontrada ou inativa',
          visit: null
        };
      }

      const client = await clientServiceWrapper.getById(args.clientId);
      if (!client) {
        return {
          success: false,
          message: 'Cliente não encontrado',
          visit: null
        };
      }

      const visitDateTime = new Date(args.visitDate + 'T' + args.visitTime + ':00');
      if (visitDateTime < new Date()) {
        return {
          success: false,
          message: 'Data da visita deve ser no futuro',
          visit: null
        };
      }

      const visitData = {
        tenantId,
        clientId: args.clientId,
        clientName: client.name,
        clientPhone: client.phone,
        propertyId: args.propertyId,
        propertyName: property.title || 'Propriedade',
        propertyAddress: property.address || '',
        scheduledDate: new Date(args.visitDate),
        scheduledTime: args.visitTime,
        duration: 60,
        status: VisitStatus.SCHEDULED,
        notes: args.notes || '',
        clientRequests: args.notes ? [args.notes] : [],
        confirmedByClient: true,
        confirmedByAgent: false,
        source: 'whatsapp' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdVisit = await visitService.createVisit(visitData);
      
      logger.info('✅ [schedule_visit] Visita agendada', { visitId: createdVisit.id });

      // Atualizar CRM
      try {
        const lead = await crmService.getLeadByPhone(client.phone);
        if (lead) {
          await crmService.updateLead(lead.id, {
            status: LeadStatus.OPPORTUNITY,
            temperature: 'hot',
            score: Math.max(lead.score, 85),
            lastContactDate: new Date()
          });
        }
      } catch (crmError) {
        logger.error('⚠️ [schedule_visit] Erro ao atualizar CRM', { crmError });
      }

      return {
        success: true,
        visit: {
          id: createdVisit.id,
          ...visitData
        },
        message: `✅ Visita agendada com sucesso!\n📅 ${new Date(args.visitDate).toLocaleDateString('pt-BR')} às ${args.visitTime}\n🏠 ${property.title}\n📍 ${property.address}`,
        confirmationDetails: {
          visitId: createdVisit.id,
          date: args.visitDate,
          time: args.visitTime,
          property: property.title || 'Propriedade',
          address: property.address
        }
      };

    } catch (error) {
      logger.error('❌ [schedule_visit] Erro ao agendar', { error });
      return {
        success: false,
        message: 'Erro ao agendar visita',
        visit: null
      };
    }
  }

  static async createReservation(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📅 [create_reservation] Criando reserva', { args });
      
      if (!args.clientId || !args.propertyId || !args.checkIn || !args.checkOut) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando',
          reservation: null
        };
      }

      const property = await propertyService.getById(args.propertyId);
      if (!property || !property.isActive) {
        return {
          success: false,
          message: 'Propriedade não encontrada ou inativa',
          reservation: null
        };
      }

      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      if (nights < (property.minimumNights || 1)) {
        return {
          success: false,
          message: `Mínimo de ${property.minimumNights || 1} noite(s) necessário`,
          reservation: null
        };
      }

      // Verificar disponibilidade
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

      // Verificar conflitos com outras reservas
      const existingReservations = await reservationService.getWhere('propertyId', '==', args.propertyId);
      const activeReservations = existingReservations.filter(r => 
        r.status !== 'cancelled' && r.tenantId === tenantId
      );
      
      for (const existingReservation of activeReservations) {
        const existingCheckIn = new Date(existingReservation.checkIn);
        const existingCheckOut = new Date(existingReservation.checkOut);
        
        if (checkIn < existingCheckOut && checkOut > existingCheckIn) {
          return {
            success: false,
            message: `Conflito com reserva existente`,
            reservation: null
          };
        }
      }

      const reservationData = {
        tenantId,
        propertyId: args.propertyId,
        clientId: args.clientId,
        checkIn,
        checkOut,
        guests: args.guests,
        totalPrice: args.totalPrice,
        status: 'confirmed' as const,
        paymentStatus: 'pending' as const,
        notes: args.notes || '',
        source: 'whatsapp',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const reservation = await reservationService.create(reservationData);
      
      // Atualizar disponibilidade da propriedade
      try {
        const newUnavailableDates = [...(property.unavailableDates || [])];
        const reservationDate = new Date(checkIn);
        
        while (reservationDate < checkOut) {
          newUnavailableDates.push(new Date(reservationDate));
          reservationDate.setDate(reservationDate.getDate() + 1);
        }
        
        await propertyService.update(args.propertyId, {
          unavailableDates: newUnavailableDates,
          updatedAt: new Date()
        });
        
        logger.info('✅ [create_reservation] Disponibilidade atualizada');
      } catch (updateError) {
        logger.error('⚠️ [create_reservation] Erro ao atualizar disponibilidade', { updateError });
      }
      
      logger.info('✅ [create_reservation] Reserva criada', { reservationId: reservation.id });

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
          paymentStatus: 'pending'
        },
        message: `Reserva criada com sucesso! Propriedade bloqueada para ${nights} noite(s).`
      };

    } catch (error) {
      logger.error('❌ [create_reservation] Erro ao criar reserva', { error });
      return {
        success: false,
        message: 'Erro ao criar reserva',
        reservation: null
      };
    }
  }

  static async classifyLeadStatus(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('🤖 [classify_lead_status] Classificando lead', { args });
      
      if (!args.clientPhone || !args.conversationOutcome || !args.reason) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando',
          classification: null
        };
      }

      let lead = await crmService.getLeadByPhone(args.clientPhone);
      
      if (!lead) {
        logger.info('📱 [classify_lead_status] Criando novo lead');
        lead = await crmService.createLead({
          tenantId,
          name: args.clientPhone,
          phone: args.clientPhone,
          whatsappNumber: args.clientPhone,
          status: LeadStatus.NEW,
          source: 'whatsapp_ai',
          score: 60,
          temperature: 'warm',
          qualificationCriteria: {
            budget: false,
            authority: false,
            need: false,
            timeline: false
          },
          preferences: {},
          firstContactDate: new Date(),
          lastContactDate: new Date(),
          totalInteractions: 0,
          tags: ['whatsapp', 'ai-classified']
        });
      }

      // Mapear outcome para status
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

      const updates: Partial<any> = {
        status: newStatus,
        temperature,
        score,
        lastContactDate: new Date()
      };

      await crmService.updateLead(lead.id, updates);

      logger.info('✅ [classify_lead_status] Lead classificado', { 
        leadId: lead.id, 
        newStatus, 
        temperature, 
        score 
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
          newScore: score,
          outcome: args.conversationOutcome,
          reason: args.reason
        },
        message: `Lead classificado com sucesso! Status: ${newStatus}, Temperatura: ${temperature}, Score: ${score}`
      };

    } catch (error) {
      logger.error('❌ [classify_lead_status] Erro ao classificar', { error });
      return {
        success: false,
        message: 'Erro ao classificar lead',
        classification: null
      };
    }
  }

  // ===== EXECUTOR PRINCIPAL =====

  static async executeFunction(
    functionName: string, 
    args: any, 
    tenantId: string
  ): Promise<any> {
    try {
      logger.info('⚡ [executeFunction] Executando', { functionName });
      
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
      logger.error('❌ [executeFunction] Erro na execução', { functionName, error });
      return {
        success: false,
        message: `Erro na execução da função ${functionName}`,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

// ===== HELPER PARA OPENAI =====

export function getOpenAIFunctions(): any[] {
  return AI_FUNCTIONS.map(func => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }
  }));
}