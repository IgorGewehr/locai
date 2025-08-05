// lib/ai/tenant-aware-agent-functions.ts
// FUNÇÕES MULTI-TENANT PARA SOFIA AGENT
// Versão que usa estrutura tenants/{tenantId}/collections

import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import { Reservation } from '@/lib/types/reservation';

// ===== INTERFACES =====

interface SearchPropertiesArgs {
  location?: string;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  maxPrice?: number;
  amenities?: string[];
  propertyType?: string;
}

interface CalculatePriceArgs {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}

interface CreateReservationArgs {
  propertyId: string;
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
  propertyId?: string;
  propertyIndex?: number;
  propertyReference?: string;
}

interface SendPropertyMediaArgs {
  propertyId?: string;
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

// ===== IMPORTS ADICIONAIS =====
import { VisitAppointment, VisitStatus } from '@/lib/types/visit-appointment';
import { Lead, LeadStatus, InteractionType } from '@/lib/types/crm';
import { FinancialMovement, CreateFinancialMovementInput } from '@/lib/types/financial-movement';

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
        maxPrice: args.maxPrice,
        propertyType: args.propertyType
      }
    });

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
      filteredProperties = filteredProperties.filter(property => 
        property.city?.toLowerCase().includes(location) ||
        property.neighborhood?.toLowerCase().includes(location) ||
        property.address?.toLowerCase().includes(location)
      );
    }

    if (args.guests) {
      filteredProperties = filteredProperties.filter(property => 
        (property.maxGuests || 0) >= args.guests!
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

    logger.info('✅ [TenantAgent] search_properties concluída', {
      tenantId,
      totalProperties: allProperties.length,
      filteredCount: filteredProperties.length,
      returnedCount: limitedProperties.length
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
        basePrice: p.basePrice || 0, // Property interface tem basePrice direto
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
    logger.info('💰 [TenantAgent] calculate_price iniciada', {
      tenantId,
      propertyId: args.propertyId,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      guests: args.guests
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    
    const property = await propertyService.get(args.propertyId) as Property;

    if (!property) {
      logger.warn('⚠️ [TenantAgent] Propriedade não encontrada', {
        tenantId,
        propertyId: args.propertyId
      });

      return {
        success: false,
        error: 'Propriedade não encontrada',
        tenantId
      };
    }

    // Calcular preço baseado na propriedade
    const checkInDate = new Date(args.checkIn);
    const checkOutDate = new Date(args.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const basePrice = property.basePrice || 0; // Property interface tem basePrice direto
    const cleaningFee = property.cleaningFee || 0; // Property interface tem cleaningFee direto
    const serviceFee = Math.round(basePrice * nights * 0.1); // 10% taxa de serviço
    
    const subtotal = basePrice * nights;
    const totalPrice = subtotal + cleaningFee + serviceFee;

    logger.info('✅ [TenantAgent] calculate_price concluída', {
      tenantId,
      propertyId: args.propertyId,
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
        basePrice,
        nights,
        subtotal,
        cleaningFee,
        serviceFee,
        totalPrice
      },
      dates: {
        checkIn: args.checkIn,
        checkOut: args.checkOut
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em calculate_price', {
      tenantId,
      propertyId: args.propertyId,
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
      propertyId: args.propertyId,
      clientPhone: args.clientPhone?.substring(0, 6) + '***',
      guests: args.guests
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    const clientService = serviceFactory.clients;
    const reservationService = serviceFactory.reservations;

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

    // Validar datas
    const checkInDate = new Date(args.checkIn);
    const checkOutDate = new Date(args.checkOut);
    
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
      propertyId: args.propertyId,
      clientId,
      status: 'pending',
      
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
      paymentMethod: 'pix', // Padrão
      paymentPlan: 'full', // Pagamento à vista por padrão
      payments: [], // Nenhum pagamento ainda
      
      // Analytics
      nights,
      paymentStatus: 'pending',
      
      // Extras
      extraServices: [],
      specialRequests: '',
      observations: '',
      
      // Origem
      source: 'whatsapp',
      agentId: 'sofia-ai',
      
      // Metadados
      tenantId
    };

    const reservationId = await reservationService.create(reservationData);

    logger.info('✅ [TenantAgent] create_reservation concluída', {
      tenantId,
      reservationId,
      propertyId: args.propertyId,
      clientId
    });

    return {
      success: true,
      reservation: {
        id: reservationId,
        propertyId: args.propertyId,
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
      tenantId,
      propertyId: args.propertyId,
      propertyIndex: args.propertyIndex,
      propertyReference: args.propertyReference
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    
    let property: Property | null = null;

    // Tentar obter por ID direto
    if (args.propertyId) {
      property = await propertyService.get(args.propertyId) as Property;
    }
    
    // Se não encontrou e tem referência/índice, buscar nas últimas propriedades mostradas
    if (!property && (args.propertyIndex !== undefined || args.propertyReference)) {
      const recentProperties = await propertyService.getMany(
        [{ field: 'isActive', operator: '==', value: true }],
        { limit: 10, orderBy: { field: 'updatedAt', direction: 'desc' } }
      ) as Property[];
      
      if (args.propertyIndex !== undefined && args.propertyIndex >= 0 && args.propertyIndex < recentProperties.length) {
        property = recentProperties[args.propertyIndex];
      } else if (args.propertyReference === 'primeira' && recentProperties.length > 0) {
        property = recentProperties[0];
      } else if (args.propertyReference === 'segunda' && recentProperties.length > 1) {
        property = recentProperties[1];
      } else if (args.propertyReference === 'última' && recentProperties.length > 0) {
        property = recentProperties[recentProperties.length - 1];
      }
    }

    if (!property) {
      logger.warn('⚠️ [TenantAgent] Propriedade não encontrada', {
        tenantId,
        args
      });

      return {
        success: false,
        error: 'Propriedade não encontrada. Por favor, seja mais específico ou faça uma nova busca.',
        tenantId
      };
    }

    logger.info('✅ [TenantAgent] get_property_details concluída', {
      tenantId,
      propertyId: property.id,
      propertyName: property.title
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
      propertyId: args.propertyId,
      propertyIndex: args.propertyIndex,
      mediaType: args.mediaType || 'photos'
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    
    let property: Property | null = null;

    // Tentar obter por ID direto
    if (args.propertyId) {
      property = await propertyService.get(args.propertyId) as Property;
    }
    
    // Se não encontrou e tem índice, buscar nas últimas propriedades
    if (!property && args.propertyIndex !== undefined) {
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
        args
      });

      return {
        success: false,
        error: 'Propriedade não encontrada. Qual propriedade você gostaria de ver as fotos?',
        tenantId
      };
    }

    const mediaType = args.mediaType || 'photos';
    const photos = property.images || [];
    const videos = property.videos || [];

    let mediaToSend: any[] = [];
    let mediaDescription = '';

    if (mediaType === 'photos' || mediaType === 'all') {
      mediaToSend.push(...photos.map(url => ({ type: 'photo', url })));
      mediaDescription = `${photos.length} foto(s)`;
    }

    if (mediaType === 'videos' || mediaType === 'all') {
      mediaToSend.push(...videos.map(url => ({ type: 'video', url })));
      mediaDescription += mediaDescription ? ` e ${videos.length} vídeo(s)` : `${videos.length} vídeo(s)`;
    }

    if (mediaToSend.length === 0) {
      return {
        success: false,
        error: `Desculpe, não há ${mediaType === 'videos' ? 'vídeos' : 'fotos'} disponíveis para ${property.name} no momento.`,
        tenantId
      };
    }

    logger.info('✅ [TenantAgent] send_property_media concluída', {
      tenantId,
      propertyId: property.id,
      mediaCount: mediaToSend.length,
      mediaType
    });

    return {
      success: true,
      property: {
        id: property.id,
        name: property.name,
        location: `${property.neighborhood}, ${property.city}`
      },
      media: mediaToSend.slice(0, 10), // Limitar a 10 mídias por vez
      totalMedia: mediaToSend.length,
      mediaDescription,
      caption: `📸 ${property.name} - ${mediaDescription}\n📍 ${property.neighborhood}, ${property.city}\n💰 A partir de R$ ${property.pricing?.basePrice || 0}/noite`,
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
 * FUNÇÃO 7: Agendar visita à propriedade
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
    const visitService = serviceFactory.get<VisitAppointment>('visits');
    
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
      status: 'scheduled', // VisitStatus enum value
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
        status: 'scheduled'
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
    const leadService = serviceFactory.get<Lead>('leads');
    
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
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Erro ao classificar lead',
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
    const leadService = serviceFactory.get<Lead>('leads');
    
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
      propertyId: args.propertyId?.substring(0, 10) + '...',
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      guests: args.guests,
      paymentMethod: args.paymentMethod
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const propertyService = serviceFactory.properties;
    
    // Buscar propriedade
    const property = await propertyService.get(args.propertyId) as Property;
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
    const quote = calculateDetailedQuote(property, checkInDate, checkOutDate, args.guests, args.paymentMethod);
    
    // Verificar disponibilidade
    const unavailableDates = checkUnavailableDates(property, checkInDate, checkOutDate);
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
      totalPrice: quote.totalPrice,
      nights: quote.nights
    });

    return {
      success: true,
      quote,
      property: {
        id: property.id,
        name: property.name || property.title,
        location: `${property.neighborhood}, ${property.city}`,
        maxGuests: property.maxGuests,
        minimumNights: property.minimumNights
      },
      tenantId
    };
  } catch (error) {
    logger.error('❌ [TenantAgent] Erro em generate_quote', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
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
    
    if (dayPrice.isWeekend && !dayPrice.isHoliday) {
      weekendSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
    }
    
    if (dayPrice.isHoliday) {
      holidaySurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
    }
    
    if (dayPrice.isSeason) {
      seasonalSurcharge += (dayPrice.finalPrice - (property.basePrice || 0));
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
}

/**
 * Calcular preço de um dia específico com todas as variações
 */
function calculateDayPrice(property: Property, date: Date): any {
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
    const financialService = serviceFactory.get<FinancialMovement>('financial_movements');

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
    
    if (property.paymentMethodDiscounts && property.paymentMethodDiscounts[args.paymentMethod]) {
      const discountPercentage = property.paymentMethodDiscounts[args.paymentMethod];
      discount = Math.round(advanceAmount * (discountPercentage / 100));
      finalAdvanceAmount = advanceAmount - discount;
    }

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
        discountPercentage: property.paymentMethodDiscounts?.[args.paymentMethod] || 0,
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
              description: 'Cidade, bairro ou localização desejada'
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
        description: 'Calcular preço total para uma propriedade específica',
        parameters: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
          required: ['propertyId', 'checkIn', 'checkOut']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_reservation',
        description: 'Criar uma nova reserva',
        parameters: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
          required: ['propertyId', 'checkIn', 'checkOut', 'guests']
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
        description: 'Obter detalhes completos de uma propriedade específica',
        parameters: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
          required: []
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'send_property_media',
        description: 'Enviar fotos e vídeos de uma propriedade',
        parameters: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
        name: 'schedule_visit',
        description: 'Agendar uma visita para conhecer a propriedade',
        parameters: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
          required: ['propertyId', 'checkIn', 'checkOut', 'guests']
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
            propertyId: {
              type: 'string',
              description: 'ID da propriedade'
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
    }
  ];
}

// Executar função baseada no nome
export async function executeTenantAwareFunction(
  functionName: string, 
  args: any, 
  tenantId: string
): Promise<any> {
  switch (functionName) {
    case 'search_properties':
      return await searchProperties(args, tenantId);
    case 'calculate_price':
      return await calculatePrice(args, tenantId);
    case 'create_reservation':
      return await createReservation(args, tenantId);
    case 'register_client':
      return await registerClient(args, tenantId);
    case 'get_property_details':
      return await getPropertyDetails(args, tenantId);
    case 'send_property_media':
      return await sendPropertyMedia(args, tenantId);
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