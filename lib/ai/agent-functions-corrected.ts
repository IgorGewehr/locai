// lib/ai/agent-functions-corrected.ts
// VERSÃO CORRIGIDA: 5 funções essenciais funcionais

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
    description: 'Buscar propriedades disponíveis com filtros básicos',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Cidade ou região para busca' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        budget: { type: 'number', description: 'Orçamento máximo por noite (opcional)' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' }
      },
      required: ['guests'] // Localização pode ser opcional para busca geral
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
    description: 'Registrar ou atualizar dados do cliente ANTES de criar reserva',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome completo do cliente' },
        phone: { type: 'string', description: 'Telefone do cliente' },
        email: { type: 'string', description: 'Email do cliente (opcional)' },
        document: { type: 'string', description: 'CPF ou documento (opcional)' }
      },
      required: ['name', 'phone']
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
      
      const properties = await propertyService.searchProperties(searchFilters);
      console.log(`📊 [SEARCH] Encontradas ${properties.length} propriedades`);
      
      if (properties.length === 0) {
        return {
          success: false,
          message: 'Nenhuma propriedade encontrada para os critérios especificados',
          properties: []
        };
      }
      
      // Retornar dados formatados
      const formattedProperties = properties.slice(0, 5).map(p => ({
        id: p.id, // ID REAL do Firebase
        name: p.name || 'Propriedade sem nome',
        location: p.location || p.city || 'Localização não informada',
        bedrooms: p.bedrooms || 1,
        bathrooms: p.bathrooms || 1,
        maxGuests: p.maxGuests || p.capacity || 2,
        basePrice: p.basePrice || p.pricing?.basePrice || 300,
        amenities: p.amenities || [],
        type: p.type || 'apartment',
        description: p.description || '',
        address: p.address || ''
      }));
      
      console.log(`✅ [SEARCH] Propriedades formatadas:`, formattedProperties.map(p => ({ id: p.id, name: p.name })));
      
      return {
        success: true,
        count: formattedProperties.length,
        properties: formattedProperties
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

      console.log(`✅ [DETAILS] Propriedade encontrada: ${property.name}`);

      return {
        success: true,
        property: {
          id: property.id,
          name: property.name,
          description: property.description,
          location: property.location || property.city,
          address: property.address,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          maxGuests: property.maxGuests || property.capacity,
          basePrice: property.basePrice || property.pricing?.basePrice,
          amenities: property.amenities || [],
          photos: property.photos || [],
          cleaningFee: property.pricing?.cleaningFee || 50,
          securityDeposit: property.pricing?.securityDeposit || 0
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
      console.log(`💰 [PRICE] Calculando preço:`, args);
      
      // Buscar propriedade
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        return {
          success: false,
          message: 'Propriedade não encontrada para cálculo de preço',
          calculation: null
        };
      }

      console.log(`✅ [PRICE] Propriedade encontrada: ${property.name}`);

      // Calcular número de noites
      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        return {
          success: false,
          message: 'Datas inválidas para cálculo',
          calculation: null
        };
      }

      // Cálculo de preços
      const basePrice = property.basePrice || property.pricing?.basePrice || 300;
      const subtotal = basePrice * nights;
      const cleaningFee = property.pricing?.cleaningFee || 50;
      const securityDeposit = property.pricing?.securityDeposit || 0;
      const total = subtotal + cleaningFee;

      const calculation = {
        propertyId: args.propertyId,
        propertyName: property.name,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        nights,
        guests: args.guests,
        basePrice,
        subtotal,
        cleaningFee,
        securityDeposit,
        total,
        currency: 'BRL'
      };

      console.log(`✅ [PRICE] Cálculo realizado: R$${total} para ${nights} noites`);

      return {
        success: true,
        calculation
      };

    } catch (error) {
      console.error('❌ [PRICE] Erro no cálculo:', error);
      return {
        success: false,
        message: 'Erro ao calcular preço',
        calculation: null
      };
    }
  }

  static async registerClient(args: any, tenantId: string): Promise<any> {
    try {
      console.log(`👤 [CLIENT] Registrando cliente:`, { name: args.name, phone: args.phone });
      
      const clientData = {
        name: args.name,
        phone: args.phone,
        email: args.email,
        document: args.document,
        tenantId,
        source: 'whatsapp'
      };

      const client = await clientServiceWrapper.createOrUpdate(clientData);
      
      console.log(`✅ [CLIENT] Cliente registrado com ID: ${client.id}`);

      return {
        success: true,
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email
        },
        message: 'Cliente registrado com sucesso!'
      };

    } catch (error) {
      console.error('❌ [CLIENT] Erro ao registrar cliente:', error);
      return {
        success: false,
        message: 'Erro ao registrar cliente',
        client: null
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

      // Criar reserva
      const reservationData = {
        tenantId,
        propertyId: args.propertyId,
        clientId: args.clientId,
        checkIn: new Date(args.checkIn),
        checkOut: new Date(args.checkOut),
        guests: args.guests,
        totalPrice: args.totalPrice,
        status: 'confirmed' as const,
        paymentStatus: 'pending' as const,
        notes: args.notes || '',
        source: 'whatsapp'
      };

      const reservation = await reservationService.create(reservationData);
      
      console.log(`✅ [RESERVATION] Reserva criada com ID: ${reservation.id}`);

      return {
        success: true,
        reservation: {
          id: reservation.id,
          propertyId: args.propertyId,
          clientId: args.clientId,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          guests: args.guests,
          totalPrice: args.totalPrice,
          status: 'confirmed'
        },
        message: 'Reserva criada com sucesso!'
      };

    } catch (error) {
      console.error('❌ [RESERVATION] Erro ao criar reserva:', error);
      return {
        success: false,
        message: 'Erro ao criar reserva. Verifique se a propriedade está disponível.',
        reservation: null
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
        
        case 'get_property_details':
          return await this.getPropertyDetails(args, tenantId);
        
        case 'calculate_price':
          return await this.calculatePrice(args, tenantId);
        
        case 'register_client':
          return await this.registerClient(args, tenantId);
        
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