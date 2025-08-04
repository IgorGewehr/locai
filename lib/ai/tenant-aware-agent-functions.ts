// lib/ai/tenant-aware-agent-functions.ts
// NOVA VERSÃO - Funções do agente IA com estrutura multi-tenant correta

import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { createTenantPropertyService } from '@/lib/services/tenant-aware-property-service';
import { createTenantClientService } from '@/lib/services/tenant-aware-client-service';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import { Reservation } from '@/lib/types/reservation';

// ===== FUNÇÕES DO AGENTE IA - VERSÃO MULTI-TENANT =====

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

/**
 * FUNÇÃO 1: Buscar propriedades
 * Estrutura: tenants/{tenantId}/properties
 */
export async function searchProperties(args: SearchPropertiesArgs, tenantId: string): Promise<any> {
  try {
    logger.info('🔍 [AgentFunction] search_properties iniciada', {
      tenantId,
      filters: {
        location: args.location,
        guests: args.guests,
        maxPrice: args.maxPrice,
        propertyType: args.propertyType
      }
    });

    // Usar serviço tenant-aware
    const propertyService = createTenantPropertyService(tenantId);
    
    const properties = await propertyService.searchProperties({
      location: args.location,
      guests: args.guests,
      maxPrice: args.maxPrice,
      amenities: args.amenities,
      propertyType: args.propertyType,
      checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
      checkOut: args.checkOut ? new Date(args.checkOut) : undefined
    });

    logger.info('✅ [AgentFunction] search_properties concluída', {
      tenantId,
      propertiesFound: properties.length,
      propertyIds: properties.map(p => p.id).slice(0, 5) // Log apenas os primeiros 5 IDs
    });

    return {
      success: true,
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        location: `${p.neighborhood}, ${p.city}`,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        basePrice: p.pricing?.basePrice || 0,
        amenities: p.amenities?.slice(0, 5) || [], // Limitar amenities para não sobrecarregar resposta
        description: p.description?.substring(0, 200) || ''
      })),
      totalFound: properties.length,
      tenantId
    };
  } catch (error) {
    logger.error('❌ [AgentFunction] Erro em search_properties', {
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
 * FUNÇÃO 2: Calcular preço
 * Usa dados da propriedade específica do tenant
 */
export async function calculatePrice(args: CalculatePriceArgs, tenantId: string): Promise<any> {
  try {
    logger.info('💰 [AgentFunction] calculate_price iniciada', {
      tenantId,
      propertyId: args.propertyId,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      guests: args.guests
    });

    // Usar serviço tenant-aware
    const propertyService = createTenantPropertyService(tenantId);
    const property = await propertyService.getById(args.propertyId);

    if (!property) {
      logger.warn('⚠️ [AgentFunction] Propriedade não encontrada', {
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

    logger.info('✅ [AgentFunction] calculate_price concluída', {
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
    logger.error('❌ [AgentFunction] Erro em calculate_price', {
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
 * FUNÇÃO 3: Criar reserva
 * Estrutura: tenants/{tenantId}/reservations
 */
export async function createReservation(args: CreateReservationArgs, tenantId: string): Promise<any> {
  try {
    logger.info('📝 [AgentFunction] create_reservation iniciada', {
      tenantId,
      propertyId: args.propertyId,
      clientId: args.clientId,
      clientPhone: args.clientPhone?.substring(0, 6) + '***',
      guests: args.guests
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const reservationService = serviceFactory.reservations;
    const propertyService = createTenantPropertyService(tenantId);
    const clientService = createTenantClientService(tenantId);

    // Verificar se propriedade existe
    const property = await propertyService.getById(args.propertyId);
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
      const registration = await clientService.registerWithDeduplication({
        name: args.clientName || 'Cliente WhatsApp',
        phone: args.clientPhone,
        email: args.clientEmail,
        whatsappNumber: args.clientPhone
      });
      clientId = registration.clientId;
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

    logger.info('✅ [AgentFunction] create_reservation concluída', {
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
    logger.error('❌ [AgentFunction] Erro em create_reservation', {
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
 * FUNÇÃO 4: Registrar cliente
 * Estrutura: tenants/{tenantId}/clients
 */
export async function registerClient(args: RegisterClientArgs, tenantId: string): Promise<any> {
  try {
    logger.info('👤 [AgentFunction] register_client iniciada', {
      tenantId,
      clientName: args.name,
      hasPhone: !!args.phone,
      hasEmail: !!args.email
    });

    const clientService = createTenantClientService(tenantId);
    
    const registration = await clientService.registerWithDeduplication({
      name: args.name,
      phone: args.phone,
      email: args.email,
      document: args.document,
      whatsappNumber: args.whatsappNumber || args.phone
    });

    logger.info('✅ [AgentFunction] register_client concluída', {
      tenantId,
      clientId: registration.clientId,
      isNew: registration.isNew
    });

    return {
      success: true,
      client: {
        id: registration.clientId,
        name: args.name,
        phone: args.phone,
        email: args.email,
        isNew: registration.isNew
      },
      message: registration.isNew ? 'Cliente registrado com sucesso!' : 'Cliente já existia, dados atualizados.',
      tenantId
    };
  } catch (error) {
    logger.error('❌ [AgentFunction] Erro em register_client', {
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

// ===== DEFINIÇÕES DAS FUNÇÕES PARA O OPENAI =====

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
      logger.error('❌ [AgentFunction] Função desconhecida', {
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