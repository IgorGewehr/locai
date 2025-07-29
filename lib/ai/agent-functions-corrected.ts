// lib/ai/agent-functions-corrected.ts
// VERSÃO CORRIGIDA: 6 funções essenciais funcionais

import { OpenAI } from 'openai';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { crmService } from '@/lib/services/crm-service';
import { LeadStatus, LeadSource, InteractionType } from '@/lib/types/crm';

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
      // Property search initiated
      
      // Buscar propriedades usando o service correto
      const searchFilters = {
        tenantId,
        location: args.location,
        guests: args.guests,
        checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
        checkOut: args.checkOut ? new Date(args.checkOut) : undefined,
        maxPrice: args.budget
      };
      
      let properties = await propertyService.searchProperties(searchFilters);
      // Properties found successfully
      
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
      // Property media sending initiated
      
      const property = await propertyService.getById(args.propertyId);
      
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
      // Property details search initiated
      
      const property = await propertyService.getById(args.propertyId);
      
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
      console.log(`💰 [PRICE] Calculando preço dinâmico:`, args);
      
      // Validar parâmetros obrigatórios
      if (!args.propertyId || !args.checkIn || !args.checkOut) {
        return {
          success: false,
          message: 'Parâmetros obrigatórios faltando (propertyId, checkIn, checkOut)',
          calculation: null
        };
      }
      
      // Buscar propriedade
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        console.log(`❌ [PRICE] Propriedade ${args.propertyId} não encontrada`);
        return {
          success: false,
          message: `Propriedade com ID ${args.propertyId} não encontrada`,
          calculation: null
        };
      }

      console.log(`✅ [PRICE] Propriedade encontrada: ${property.title || 'Sem nome'} (ID: ${property.id})`);

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

      console.log(`✅ [PRICE] Cálculo dinâmico: R$${total} para ${nights} noites (média: R$${calculation.averageDailyPrice}/dia)`);

      return {
        success: true,
        calculation,
        message: `Preço calculado: R$${total} para ${nights} noite${nights > 1 ? 's' : ''} (média R$${calculation.averageDailyPrice}/dia)`
      };

    } catch (error) {
      // Price calculation error handled
      return {
        success: false,
        message: 'Erro interno ao calcular preço: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        calculation: null
      };
    }
  }

  static async registerClient(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`👤 [CLIENT] Registrando cliente:`, { name: args.name, phone: args.phone });
      
      // Filtrar campos undefined para evitar erro no Firebase
      const clientData: any = {
        name: args.name,
        phone: args.phone,
        tenantId,
        source: 'whatsapp'
      };
      
      // Adicionar campos opcionais apenas se não forem undefined
      if (args.email && args.email.trim() !== '') {
        clientData.email = args.email;
      }
      // CPF agora é obrigatório
      if (!args.document || args.document.trim() === '') {
        return {
          success: false,
          message: 'CPF é obrigatório para cadastro do cliente',
          client: null
        };
      }
      clientData.document = args.document;
      clientData.documentType = 'cpf'; // padrão CPF para pessoa física

      const client = await clientServiceWrapper.createOrUpdate(clientData);
      
      console.log(`✅ [CLIENT] Cliente registrado com ID: ${client.id}`);
      console.log(`🔍 [CLIENT] DEBUG - Tipo do client:`, typeof client);
      console.log(`🔍 [CLIENT] DEBUG - Client.id:`, client.id);

      return {
        success: true,
        client: client.id, // RETORNAR APENAS O ID STRING
        clientData: { // Dados completos em campo separado se necessário
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email || undefined,
          document: client.document || undefined,
          tenantId: client.tenantId,
          source: client.source || 'whatsapp',
          createdAt: client.createdAt,
          isActive: client.isActive
        },
        message: 'Cliente registrado com sucesso!'
      };

    } catch (error) {
      // Client registration error handled
      return {
        success: false,
        message: 'Erro ao registrar cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        client: null
      };
    }
  }

  static async checkVisitAvailability(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`📅 [VISIT AVAILABILITY] Verificando disponibilidade para visitas:`, args);
      
      const startDate = args.startDate ? new Date(args.startDate) : new Date();
      const days = args.days || 7;
      const timePreference = args.timePreference;
      
      // Configuração padrão da agenda (simulada - em produção viria do banco)
      const defaultSchedule = {
        monday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', maxVisits: 8 },
        tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', maxVisits: 8 },
        wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', maxVisits: 8 },
        thursday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', maxVisits: 8 },
        friday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00', maxVisits: 8 },
        saturday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00', maxVisits: 6 },
        sunday: { isWorkingDay: false, startTime: '', endTime: '', maxVisits: 0 }
      };
      
      const availableSlots = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Gerar slots disponíveis
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Pular datas no passado (mas não hoje se ainda há horários disponíveis)
        if (currentDate < today) continue;
        
        // Pular hoje se já passaram dos horários comerciais
        if (currentDate.getTime() === today.getTime()) {
          const now = new Date();
          if (now.getHours() >= 18) continue; // Após 18h não agendar para hoje
        }
        
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
        const daySchedule = defaultSchedule[dayName as keyof typeof defaultSchedule];
        
        if (!daySchedule.isWorkingDay) continue;
        
        // Gerar horários baseado na preferência
        const timeSlots = this.generateTimeSlots(daySchedule.startTime, daySchedule.endTime, timePreference);
        
        // Debug log
        console.log(`📅 [VISIT] ${currentDate.toISOString().split('T')[0]} (${dayName}): ${timeSlots.length} slots`);
        
        timeSlots.forEach(time => {
          // Para hoje, só slots futuros
          if (currentDate.getTime() === today.getTime()) {
            const now = new Date();
            const [slotHour] = time.split(':').map(Number);
            if (slotHour <= now.getHours()) return; // Pular horários passados
          }
          
          availableSlots.push({
            date: currentDate.toISOString().split('T')[0],
            dateFormatted: currentDate.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time,
            timeFormatted: time,
            period: this.getTimePeriod(time),
            agentName: 'Consultor Disponível'
          });
        });
      }
      
      if (availableSlots.length === 0) {
        return {
          success: true, // Changed to true to show alternative message
          message: 'No momento não temos horários disponíveis para visita presencial. Que tal garantir sua reserva diretamente? Temos disponibilidade para as datas solicitadas e você pode conhecer o imóvel no check-in!',
          availableSlots: [],
          alternativeAction: 'direct_booking'
        };
      }
      
      console.log(`✅ [VISIT AVAILABILITY] ${availableSlots.length} horários disponíveis encontrados`);
      
      return {
        success: true,
        availableSlots: availableSlots.slice(0, 15), // Máximo 15 opções
        message: `Encontrei ${Math.min(availableSlots.length, 15)} horários disponíveis para visita presencial!`,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          days,
          timePreference
        }
      };
      
    } catch (error) {
      console.error('❌ [VISIT AVAILABILITY] Erro ao verificar disponibilidade:', error);
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

  static async scheduleVisit(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`🏠 [VISIT] Agendando visita:`, args);
      
      // Validar dados obrigatórios
      if (!args.clientId || !args.propertyId || !args.visitDate || !args.visitTime) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando para agendar visita (clientId, propertyId, visitDate, visitTime)',
          visit: null
        };
      }

      // 1. Verificar se propriedade existe e está ativa
      const property = await propertyService.getById(args.propertyId);
      if (!property || !property.isActive) {
        return {
          success: false,
          message: 'Propriedade não encontrada ou inativa',
          visit: null
        };
      }

      // 2. Validar data da visita
      const visitDateTime = new Date(args.visitDate + 'T' + args.visitTime + ':00');
      const now = new Date();
      
      if (visitDateTime < now) {
        return {
          success: false,
          message: 'Data da visita deve ser no futuro',
          visit: null
        };
      }

      // 3. Criar dados da visita (em produção salvaria no banco de visitas)
      const visitData = {
        id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        propertyId: args.propertyId,
        propertyName: property.title || 'Propriedade',
        propertyAddress: property.address || '',
        clientId: args.clientId,
        scheduledDate: new Date(args.visitDate),
        scheduledTime: args.visitTime,
        visitDateTime,
        status: 'scheduled',
        notes: args.notes || '',
        clientRequests: args.notes ? [args.notes] : [],
        confirmedByClient: true, // Cliente confirmou ao agendar
        confirmedByAgent: false, // Aguardando confirmação da imobiliária
        source: 'whatsapp',
        createdAt: new Date(),
        propertyDetails: {
          address: property.address,
          neighborhood: property.neighborhood,
          city: property.city,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          maxGuests: property.maxGuests
        }
      };
      
      console.log(`✅ [VISIT] Visita agendada com ID: ${visitData.id}`);

      return {
        success: true,
        visit: visitData,
        message: `✅ Visita agendada com sucesso!\n📅 ${new Date(args.visitDate).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} às ${args.visitTime}\n🏠 ${property.title || 'Propriedade'}\n📍 ${property.address}\n\nEm breve nosso consultor entrará em contato para confirmar! 📞`,
        confirmationDetails: {
          date: args.visitDate,
          dateFormatted: new Date(args.visitDate).toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          time: args.visitTime,
          property: property.title || 'Propriedade',
          address: property.address,
          neighborhood: property.neighborhood,
          contact: 'Nosso consultor entrará em contato para confirmar'
        }
      };

    } catch (error) {
      console.error('❌ [VISIT] Erro ao agendar visita:', error);
      return {
        success: false,
        message: 'Erro ao agendar visita: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        visit: null
      };
    }
  }

  static async createReservation(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`📅 [RESERVATION] Criando reserva:`, args);
      
      // Validar dados obrigatórios
      if (!args.clientId || !args.propertyId || !args.checkIn || !args.checkOut) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando para criar reserva',
          reservation: null
        };
      }

      // 1. Verificar se propriedade existe e está ativa
      const property = await propertyService.getById(args.propertyId);
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
      const existingReservations = await reservationService.getWhere('propertyId', '==', args.propertyId);
      const activeReservations = existingReservations.filter(r => 
        r.status !== 'cancelled' && r.tenantId === tenantId
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

      // 4. Criar reserva
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
        await propertyService.update(args.propertyId, {
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
      console.log(`🤖 [LEAD CLASSIFICATION] Classificando lead:`, args);
      
      // Validar dados obrigatórios
      if (!args.clientPhone || !args.conversationOutcome || !args.reason) {
        return {
          success: false,
          message: 'Dados obrigatórios faltando para classificar lead (clientPhone, conversationOutcome, reason)',
          classification: null
        };
      }

      // 1. Buscar lead existente pelo telefone
      let lead = await crmService.getLeadByPhone(args.clientPhone);
      
      if (!lead) {
        // Criar novo lead se não existir
        console.log(`📱 [LEAD CLASSIFICATION] Criando novo lead para ${args.clientPhone}`);
        lead = await crmService.createLead({
          tenantId,
          name: args.clientPhone, // Será atualizado quando obtivermos o nome
          phone: args.clientPhone,
          whatsappNumber: args.clientPhone,
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
          preferences: {},
          firstContactDate: new Date(),
          lastContactDate: new Date(),
          totalInteractions: 0,
          tags: ['whatsapp', 'ai-classified']
        });
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

      // 3. Preparar updates baseados no metadata
      const updates: Partial<any> = {
        status: newStatus,
        temperature,
        score,
        lastContactDate: new Date()
      };

      // Adicionar metadata específico se fornecido
      if (args.metadata) {
        if (args.metadata.propertiesViewed?.length > 0) {
          updates.tags = [...(lead.tags || []), 'viewed-properties'];
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
            ...lead.preferences,
            moveInDate: new Date(args.metadata.visitDate)
          };
          updates.qualificationCriteria = {
            ...lead.qualificationCriteria,
            timeline: true
          };
        }

        if (args.metadata.objections?.length > 0) {
          updates.tags = [...(lead.tags || []), 'has-objections'];
        }
      }

      // 4. Atualizar lead no CRM
      const updatedLead = await crmService.updateLead(lead.id, updates);

      // 5. Criar interação para registrar a classificação
      await crmService.createInteraction({
        leadId: lead.id,
        tenantId,
        type: InteractionType.NOTE,
        channel: 'whatsapp',
        direction: 'inbound',
        content: `IA classificou lead como: ${args.conversationOutcome}. Razão: ${args.reason}`,
        userId: 'ai-classifier',
        userName: 'AI Classifier',
        aiAnalysis: {
          summary: `Lead classificado automaticamente baseado no outcome: ${args.conversationOutcome}`,
          keyPoints: [args.reason],
          sentiment: args.conversationOutcome === 'lost_interest' ? -0.8 : 
                    args.conversationOutcome === 'deal_closed' ? 0.9 : 0.5,
          intent: [args.conversationOutcome],
          suggestedActions: this.getSuggestedActionsForOutcome(args.conversationOutcome)
        }
      });

      console.log(`✅ [LEAD CLASSIFICATION] Lead ${lead.id} classificado como ${newStatus} (${temperature}, score: ${updates.score})`);

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
      console.error('❌ [LEAD CLASSIFICATION] Erro ao classificar lead:', error);
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