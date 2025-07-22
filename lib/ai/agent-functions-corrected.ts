// lib/ai/agent-functions-corrected.ts
// VERSÃO CORRIGIDA: 6 funções essenciais funcionais

import { OpenAI } from 'openai';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';

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
  }
];

// ===== IMPLEMENTAÇÕES CORRIGIDAS =====

export class CorrectedAgentFunctions {
  
  static async searchProperties(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`🔍 [SEARCH] Buscando propriedades para tenant ${tenantId}:`, args);
      
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
      console.log(`📊 [SEARCH] Encontradas ${properties.length} propriedades`);
      
      if (properties.length === 0) {
        // Tentar busca sem filtros de localização se não encontrou nada
        if (args.location) {
          console.log(`🔍 [SEARCH] Tentando busca ampliada sem filtro de localização`);
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
        console.log(`🔍 [SEARCH] Filtrando por comodidades: ${args.amenities.join(', ')}`);
        properties = properties.filter(property => {
          const propertyAmenities = property.amenities || [];
          return args.amenities.some((amenity: string) => 
            propertyAmenities.some((propAmenity: string) => 
              propAmenity.toLowerCase().includes(amenity.toLowerCase())
            )
          );
        });
        console.log(`📊 [SEARCH] Após filtro de comodidades: ${properties.length} propriedades`);
      }
      
      // Ordenar por preço CRESCENTE (mais baratas primeiro) - CAMPOS CORRETOS
      properties.sort((a, b) => {
        const priceA = a.basePrice || 999999;
        const priceB = b.basePrice || 999999;
        return priceA - priceB;
      });
      
      console.log(`💰 [SEARCH] Preços encontrados: ${properties.slice(0, 3).map(p => `${p.title || 'Sem nome'}: R$${p.basePrice || 0}`).join(', ')}`);
      
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
      
      console.log(`✅ [SEARCH] Propriedades formatadas (ordenadas por preço):`, formattedProperties.map(p => ({ id: p.id, name: p.name, price: p.basePrice })));
      
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
      console.error('❌ [SEARCH] Erro na busca:', error);
      return {
        success: false,
        message: 'Erro interno ao buscar propriedades',
        properties: []
      };
    }
  }

  static async sendPropertyMedia(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`📸 [MEDIA] Enviando mídia da propriedade ${args.propertyId}`);
      
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada',
          media: null
        };
      }

      console.log(`✅ [MEDIA] Propriedade encontrada: ${property.title || 'Sem nome'}`);

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

      console.log(`📸 [MEDIA] Preparando ${photos.length} fotos e ${videos.length} vídeos`);

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
      console.error('❌ [MEDIA] Erro ao enviar mídia:', error);
      return {
        success: false,
        message: 'Erro ao buscar fotos e vídeos da propriedade',
        media: null
      };
    }
  }

  static async getPropertyDetails(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`🏠 [DETAILS] Buscando detalhes da propriedade ${args.propertyId}`);
      
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada',
          property: null
        };
      }

      console.log(`✅ [DETAILS] Propriedade encontrada: ${property.title || property.name || 'Sem nome'} (ID: ${property.id})`);

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
      console.error('❌ [DETAILS] Erro ao buscar detalhes:', error);
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
      console.error('❌ [PRICE] Erro no cálculo dinâmico:', error);
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
      console.error('❌ [CLIENT] Erro ao registrar cliente:', error);
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
        
        // Pular datas no passado
        if (currentDate < today) continue;
        
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
        const daySchedule = defaultSchedule[dayName as keyof typeof defaultSchedule];
        
        if (!daySchedule.isWorkingDay) continue;
        
        // Gerar horários baseado na preferência
        const timeSlots = this.generateTimeSlots(daySchedule.startTime, daySchedule.endTime, timePreference);
        
        timeSlots.forEach(time => {
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
          success: false,
          message: 'Não há horários disponíveis no período solicitado.',
          availableSlots: []
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
      console.error('❌ [RESERVATION] Erro ao criar reserva:', error);
      return {
        success: false,
        message: 'Erro ao criar reserva: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        reservation: null
      };
    }
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

      // 2. Verificar se cliente existe (opcional - para melhor UX)
      try {
        const client = await clientServiceWrapper.getById ? 
          await clientServiceWrapper.getById(args.clientId) : null;
        if (client) {
          console.log(`✅ [VISIT] Cliente encontrado: ${client.name}`);
        }
      } catch (error) {
        console.warn('⚠️ [VISIT] Não foi possível verificar cliente:', error);
      }

      // 3. Validar data da visita
      const visitDate = new Date(args.visitDate + 'T' + args.visitTime);
      const now = new Date();
      
      if (visitDate < now) {
        return {
          success: false,
          message: 'Data da visita deve ser no futuro',
          visit: null
        };
      }

      // 4. Criar dados da visita (simulado - em produção salvaria no banco)
      const visitData = {
        id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        propertyId: args.propertyId,
        propertyName: property.title || 'Propriedade',
        clientId: args.clientId,
        visitDate: args.visitDate,
        visitTime: args.visitTime,
        visitDateTime: visitDate,
        status: 'scheduled',
        notes: args.notes || '',
        createdAt: new Date(),
        source: 'whatsapp',
        // DETALHES DA PROPRIEDADE PARA REFERÊNCIA
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
        message: `Visita agendada para ${args.visitDate} às ${args.visitTime} na propriedade "${property.title || 'Propriedade'}" (${property.address}). Em breve entraremos em contato para confirmar!`,
        confirmationDetails: {
          date: args.visitDate,
          time: args.visitTime,
          property: property.title || 'Propriedade',
          address: property.address,
          contact: 'Aguarde nossa confirmação por WhatsApp'
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
        
        default:
          throw new Error(`Função ${functionName} não implementada`);
      }
    } catch (error) {
      console.error(`❌ [EXECUTE] Erro ao executar função ${functionName}:`, error);
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