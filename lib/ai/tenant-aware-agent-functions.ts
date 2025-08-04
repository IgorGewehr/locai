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
        property.state?.toLowerCase().includes(location)
      );
    }

    if (args.guests) {
      filteredProperties = filteredProperties.filter(property => 
        (property.maxGuests || 0) >= args.guests
      );
    }

    if (args.maxPrice) {
      filteredProperties = filteredProperties.filter(property => 
        (property.pricing?.basePrice || 0) <= args.maxPrice
      );
    }

    if (args.propertyType) {
      const type = args.propertyType.toLowerCase();
      filteredProperties = filteredProperties.filter(property => 
        property.type?.toLowerCase().includes(type)
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
        name: p.name,
        location: `${p.neighborhood}, ${p.city}`,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        basePrice: p.pricing?.basePrice || 0,
        amenities: p.amenities?.slice(0, 5) || [],
        description: p.description?.substring(0, 200) || '',
        images: p.images?.slice(0, 3) || []
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
    
    const basePrice = property.pricing?.basePrice || 0;
    const cleaningFee = property.pricing?.cleaningFee || 0;
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
        name: property.name,
        location: `${property.neighborhood}, ${property.city}`
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
          phone: args.clientPhone,
          email: args.clientEmail,
          whatsappNumber: args.clientPhone,
          tenantId
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

    // Criar reserva
    const reservationData: Omit<Reservation, 'id'> = {
      propertyId: args.propertyId,
      clientId,
      checkIn: new Date(args.checkIn),
      checkOut: new Date(args.checkOut),
      guests: args.guests,
      totalPrice: args.totalPrice || 0,
      status: 'pending',
      source: 'whatsapp',
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
        propertyName: property.name,
        clientId,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        guests: args.guests,
        totalPrice: args.totalPrice,
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
      // Criar novo cliente
      const clientData = {
        name: args.name,
        phone: args.phone,
        email: args.email,
        document: args.document,
        whatsappNumber: args.whatsappNumber || args.phone,
        tenantId
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

// ===== DEFINIÇÕES PARA OPENAI =====

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