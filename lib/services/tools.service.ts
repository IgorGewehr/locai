import { ToolOutput } from '@/lib/types/ai-agent';
import { propertyService, reservationService, clientService } from '@/lib/firebase/firestore';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { calculatePricing } from '@/lib/services/pricing';
import { sendWhatsAppMessage } from '@/lib/whatsapp/message-sender';
import { validatePhoneNumber } from '@/lib/utils/validation';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ToolRegistryEntry {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
  validateParams?: (params: any) => boolean;
}

export class ToolsService {
  private tenantId: string;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  private toolRegistry: Record<string, ToolRegistryEntry> = {
    search_properties: {
      name: 'search_properties',
      description: 'Buscar propriedades disponíveis',
      handler: async (params) => {
        const { location, priceRange, bedrooms, amenities, limit = 5 } = params;
        
        const properties = await propertyService.searchProperties({
          location,
          priceRange,
          bedrooms,
          amenities,
          available: true,
          tenantId: this.tenantId
        });
        
        return {
          success: true,
          data: properties.slice(0, limit),
          count: properties.length
        };
      }
    },

    send_property_media: {
      name: 'send_property_media',
      description: 'Enviar fotos/vídeos de propriedade',
      handler: async (params) => {
        const { propertyId, clientPhone, mediaType = 'photos' } = params;
        
        const property = await propertyService.getById(propertyId);
        if (!property) {
          return { success: false, error: 'Propriedade não encontrada' };
        }
        
        const mediaUrls = mediaType === 'photos' ? 
          property.photos?.slice(0, 3) : property.videos?.slice(0, 1);
        
        if (!mediaUrls || mediaUrls.length === 0) {
          return { success: false, error: 'Nenhuma mídia disponível' };
        }
        
        // Enviar mídia via WhatsApp
        for (const mediaUrl of mediaUrls) {
          await sendWhatsAppMessage(clientPhone, '', mediaUrl);
        }
        
        return {
          success: true,
          data: { property: property.name, mediaCount: mediaUrls.length }
        };
      }
    },

    calculate_pricing: {
      name: 'calculate_pricing',
      description: 'Calcular preço total para período',
      handler: async (params) => {
        const { propertyId, checkIn, checkOut, guests } = params;
        
        if (!propertyId || !checkIn || !checkOut) {
          return { success: false, error: 'Parâmetros obrigatórios faltando' };
        }
        
        const property = await propertyService.getById(propertyId);
        if (!property) {
          return { success: false, error: 'Propriedade não encontrada' };
        }
        
        const pricing = await calculatePricing({
          propertyId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guests: guests || 1,
          tenantId: this.tenantId
        });
        
        return {
          success: true,
          data: pricing,
          propertyName: property.name
        };
      }
    },

    check_availability: {
      name: 'check_availability',
      description: 'Verificar disponibilidade de propriedade',
      handler: async (params) => {
        const { propertyId, checkIn, checkOut } = params;
        
        const existingReservations = await reservationService.getPropertyReservations(
          propertyId,
          new Date(checkIn),
          new Date(checkOut)
        );
        
        const isAvailable = existingReservations.length === 0;
        
        return {
          success: true,
          data: { 
            available: isAvailable,
            conflicts: existingReservations.length,
            propertyId,
            checkIn,
            checkOut
          }
        };
      }
    },

    create_reservation: {
      name: 'create_reservation',
      description: 'Criar reserva para cliente',
      handler: async (params) => {
        const { propertyId, checkIn, checkOut, guests, clientPhone, clientName } = params;
        
        // Verificar disponibilidade primeiro
        const availability = await this.executeTool('check_availability', {
          propertyId, checkIn, checkOut
        });
        
        if (!availability.data.available) {
          return { 
            success: false, 
            error: 'Propriedade não disponível para as datas solicitadas' 
          };
        }
        
        // Buscar ou criar cliente
        let client = await clientService.getByPhone(clientPhone);
        if (!client) {
          client = await clientServiceWrapper.createOrUpdate({
            name: clientName || 'Cliente WhatsApp',
            phone: clientPhone,
            tenantId: this.tenantId
          });
        }
        
        // Calcular preço
        const pricing = await this.executeTool('calculate_pricing', {
          propertyId, checkIn, checkOut, guests
        });
        
        // Criar reserva
        const reservation = await reservationService.create({
          propertyId,
          clientId: client.id,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guests: guests || 1,
          totalPrice: pricing.data.totalPrice,
          status: 'pending',
          tenantId: this.tenantId,
          source: 'whatsapp_ai'
        });
        
        return {
          success: true,
          data: reservation,
          pricing: pricing.data
        };
      }
    },

    register_client: {
      name: 'register_client',
      description: 'Registrar/atualizar dados do cliente',
      handler: async (params) => {
        const { name, phone, email, preferences } = params;
        
        const client = await clientServiceWrapper.createOrUpdate({
          name,
          phone: validatePhoneNumber(phone),
          email,
          preferences,
          tenantId: this.tenantId
        });
        
        return {
          success: true,
          data: client
        };
      }
    },

    schedule_viewing: {
      name: 'schedule_viewing',
      description: 'Agendar visita para propriedade',
      handler: async (params) => {
        const { propertyId, clientPhone, viewingDate, viewingTime } = params;
        
        const property = await propertyService.getById(propertyId);
        if (!property) {
          return { success: false, error: 'Propriedade não encontrada' };
        }
        
        // Criar reserva tipo "visita"
        const client = await clientService.getByPhone(clientPhone);
        if (!client) {
          return { success: false, error: 'Cliente não encontrado' };
        }
        
        const viewing = await reservationService.create({
          propertyId,
          clientId: client.id,
          checkIn: new Date(viewingDate),
          checkOut: new Date(viewingDate),
          guests: 1,
          totalPrice: 0,
          status: 'visit',
          tenantId: this.tenantId,
          source: 'whatsapp_ai',
          notes: `Visita agendada para ${viewingTime}`
        });
        
        return {
          success: true,
          data: viewing,
          propertyName: property.name
        };
      }
    },

    send_payment_reminder: {
      name: 'send_payment_reminder',
      description: 'Enviar lembrete de pagamento',
      handler: async (params) => {
        const { clientPhone, reservationId, message } = params;
        
        const reservation = await reservationService.getById(reservationId);
        if (!reservation) {
          return { success: false, error: 'Reserva não encontrada' };
        }
        
        const reminderMessage = message || 
          `Olá! Lembrete sobre o pagamento da sua reserva. Por favor, entre em contato para finalizar.`;
        
        await sendWhatsAppMessage(clientPhone, reminderMessage);
        
        return {
          success: true,
          data: { sent: true, reservationId }
        };
      }
    },

    apply_discount: {
      name: 'apply_discount',
      description: 'Aplicar desconto a uma cotação',
      handler: async (params) => {
        const { originalPrice, discountPercent, reason } = params;
        
        const maxDiscount = 20; // 20% máximo
        const actualDiscount = Math.min(discountPercent, maxDiscount);
        const discountAmount = (originalPrice * actualDiscount) / 100;
        const finalPrice = originalPrice - discountAmount;
        
        return {
          success: true,
          data: {
            originalPrice,
            discountPercent: actualDiscount,
            discountAmount,
            finalPrice,
            reason
          }
        };
      }
    }
  };

  async executeTool(toolName: string, parameters: any): Promise<ToolOutput> {
    const startTime = Date.now();
    
    try {
      const tool = this.toolRegistry[toolName];
      if (!tool) {
        return {
          toolName,
          success: false,
          error: `Ferramenta '${toolName}' não encontrada`,
          executionTime: Date.now() - startTime
        };
      }
      
      // Validar parâmetros se houver validador
      if (tool.validateParams && !tool.validateParams(parameters)) {
        return {
          toolName,
          success: false,
          error: 'Parâmetros inválidos',
          executionTime: Date.now() - startTime
        };
      }
      
      const result = await tool.handler(parameters);
      
      return {
        toolName,
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      
      return {
        toolName,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        executionTime: Date.now() - startTime
      };
    }
  }
  
  getAvailableTools(): string[] {
    return Object.keys(this.toolRegistry);
  }
  
  getToolDescription(toolName: string): string | null {
    return this.toolRegistry[toolName]?.description || null;
  }
}