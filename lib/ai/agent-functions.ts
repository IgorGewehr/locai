// lib/ai/agent-functions-simplified.ts
// VERSÃO SIMPLIFICADA: Apenas 4 funções essenciais para o ProfessionalAgent

import { OpenAI } from 'openai';
import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';

// ===== TIPOS SIMPLIFICADOS =====

interface SimplifiedAIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ===== APENAS 4 FUNÇÕES ESSENCIAIS =====

export const ESSENTIAL_AI_FUNCTIONS: SimplifiedAIFunction[] = [
  {
    name: 'search_properties',
    description: 'Buscar propriedades disponíveis com filtros básicos',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Cidade ou região para busca' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        budget: { type: 'number', description: 'Orçamento máximo por noite' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' }
      },
      required: ['location']
    }
  },
  {
    name: 'calculate_price',
    description: 'Calcular preço total de uma propriedade para período específico',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        nights: { type: 'number', description: 'Número de noites' }
      },
      required: ['propertyId']
    }
  },
  {
    name: 'create_reservation',
    description: 'Criar nova reserva quando cliente confirmar',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        clientName: { type: 'string', description: 'Nome completo do cliente' },
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        clientEmail: { type: 'string', description: 'Email do cliente' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        totalPrice: { type: 'number', description: 'Preço total da reserva' }
      },
      required: ['propertyId', 'clientName', 'clientPhone', 'checkIn', 'checkOut']
    }
  },
  {
    name: 'register_client',
    description: 'Registrar novo cliente no sistema',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome completo' },
        phone: { type: 'string', description: 'Telefone' },
        email: { type: 'string', description: 'Email (opcional)' },
        document: { type: 'string', description: 'CPF ou documento (opcional)' }
      },
      required: ['name', 'phone']
    }
  }
];

// ===== IMPLEMENTAÇÕES SIMPLIFICADAS =====

export class SimplifiedAgentFunctions {
  
  static async searchProperties(args: any, tenantId: string): Promise<any> {
    try {
      const properties = await propertyService.getActiveProperties(tenantId);
      
      // Filtros básicos
      let filtered = properties.filter(p => p.status === 'active');
      
      if (args.location) {
        const location = args.location.toLowerCase();
        filtered = filtered.filter(p => 
          p.location?.toLowerCase().includes(location) ||
          p.address?.toLowerCase().includes(location) ||
          p.name?.toLowerCase().includes(location)
        );
      }
      
      if (args.guests) {
        filtered = filtered.filter(p => (p.maxGuests || p.capacity || 2) >= args.guests);
      }
      
      if (args.budget) {
        filtered = filtered.filter(p => (p.basePrice || p.price || 0) <= args.budget);
      }
      
      return filtered.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name || 'Propriedade',
        basePrice: p.basePrice || p.price || 300,
        bedrooms: p.bedrooms || 2,
        bathrooms: p.bathrooms || 1,
        maxGuests: p.maxGuests || p.capacity || 4,
        location: p.location || p.address,
        amenities: p.amenities || []
      }));
      
    } catch (error) {
      console.error('Error in searchProperties:', error);
      return [];
    }
  }

  static async calculatePrice(args: any, tenantId: string): Promise<any> {
    try {
      const property = await propertyService.getById(args.propertyId);
      
      if (!property) {
        throw new Error('Property not found');
      }

      const nights = args.nights || 3;
      const basePrice = property.basePrice || property.price || 300;
      const subtotal = basePrice * nights;
      const cleaningFee = property.cleaningFee || 100;
      const total = subtotal + cleaningFee;

      return {
        propertyId: args.propertyId,
        propertyName: property.name,
        nights,
        basePrice,
        subtotal,
        cleaningFee,
        total,
        currency: 'BRL',
        checkIn: args.checkIn,
        checkOut: args.checkOut
      };

    } catch (error) {
      console.error('Error in calculatePrice:', error);
      return {
        propertyId: args.propertyId,
        nights: args.nights || 3,
        basePrice: 300,
        subtotal: 300 * (args.nights || 3),
        cleaningFee: 100,
        total: 300 * (args.nights || 3) + 100,
        currency: 'BRL'
      };
    }
  }

  static async createReservation(args: any, tenantId: string): Promise<any> {
    try {
      // Validar dados obrigatórios
      if (!args.propertyId || !args.clientName || !args.checkIn || !args.checkOut) {
        throw new Error('Missing required fields for reservation');
      }

      const reservation = await reservationService.create({
        tenantId,
        propertyId: args.propertyId,
        clientName: args.clientName,
        clientPhone: args.clientPhone,
        clientEmail: args.clientEmail,
        checkIn: new Date(args.checkIn),
        checkOut: new Date(args.checkOut),
        guests: args.guests || 2,
        totalPrice: args.totalPrice || 0,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        reservationId: reservation.id,
        status: 'confirmed',
        message: 'Reserva criada com sucesso!',
        details: {
          propertyId: args.propertyId,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          totalPrice: args.totalPrice
        }
      };

    } catch (error) {
      console.error('Error in createReservation:', error);
      throw new Error('Falha ao criar reserva. Tente novamente.');
    }
  }

  static async registerClient(args: any, tenantId: string): Promise<any> {
    try {
      const client = await clientServiceWrapper.createOrUpdate({
        name: args.name,
        phone: args.phone,
        email: args.email,
        document: args.document,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        clientId: client.id,
        message: 'Cliente registrado com sucesso!',
        name: args.name,
        phone: args.phone
      };

    } catch (error) {
      console.error('Error in registerClient:', error);
      return {
        message: 'Cliente já registrado ou atualizado!',
        name: args.name,
        phone: args.phone
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
      switch (functionName) {
        case 'search_properties':
          return await this.searchProperties(args, tenantId);
        
        case 'calculate_price':
          return await this.calculatePrice(args, tenantId);
        
        case 'create_reservation':
          return await this.createReservation(args, tenantId);
        
        case 'register_client':
          return await this.registerClient(args, tenantId);
        
        default:
          throw new Error(`Function ${functionName} not implemented`);
      }
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      throw error;
    }
  }
}

// ===== HELPER PARA OPENAI FUNCTION CALLING =====

export function getOpenAIFunctions(): any[] {
  return ESSENTIAL_AI_FUNCTIONS.map(func => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }
  }));
}