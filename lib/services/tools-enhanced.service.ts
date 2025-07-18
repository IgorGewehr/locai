import { ToolOutput } from '@/lib/types/ai-agent';
import { propertyService, reservationService, clientService } from '@/lib/firebase/firestore';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { calculatePricing } from '@/lib/services/pricing';
import { sendWhatsAppMessage } from '@/lib/whatsapp/message-sender';
import { validatePhoneNumber } from '@/lib/utils/validation';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ToolRegistryEntry {
  name: string;
  description: string;
  handler: (params: any) => Promise<any>;
  validateParams?: (params: any) => { valid: boolean; error?: string };
  requiredParams: string[];
  optionalParams?: string[];
  examples?: any[];
}

export class EnhancedToolsService {
  private tenantId: string;
  private executionHistory: Map<string, { count: number; lastUsed: Date; avgTime: number }> = new Map();
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  private toolRegistry: Record<string, ToolRegistryEntry> = {
    search_properties: {
      name: 'search_properties',
      description: 'Buscar propriedades disponíveis com filtros avançados',
      requiredParams: [],
      optionalParams: ['location', 'priceRange', 'bedrooms', 'guests', 'amenities', 'limit'],
      examples: [
        { location: 'Copacabana', guests: 4, limit: 5 },
        { bedrooms: 2, priceRange: { min: 200, max: 500 } }
      ],
      validateParams: (params) => {
        if (params.priceRange && (!params.priceRange.min || !params.priceRange.max)) {
          return { valid: false, error: 'priceRange deve ter min e max' };
        }
        if (params.guests && (params.guests < 1 || params.guests > 20)) {
          return { valid: false, error: 'guests deve estar entre 1 e 20' };
        }
        return { valid: true };
      },
      handler: async (params) => {
        const { location, priceRange, bedrooms, guests, amenities, limit = 5 } = params;
        
        console.log('🔍 Buscando propriedades com filtros:', params);
        
        try {
          const properties = await propertyService.searchProperties({
            location,
            priceRange,
            bedrooms,
            guests,
            amenities,
            available: true,
            tenantId: this.tenantId
          });
          
          const results = properties.slice(0, limit);
          
          console.log(`📊 Encontrou ${results.length} propriedades de ${properties.length} total`);
          
          return {
            success: true,
            data: results.map(prop => ({
              id: prop.id,
              name: prop.name || prop.title,
              location: prop.location,
              bedrooms: prop.bedrooms,
              maxGuests: prop.maxGuests,
              basePrice: prop.pricing?.basePrice || 0,
              amenities: prop.amenities?.slice(0, 5) || [],
              photos: prop.photos?.slice(0, 2) || []
            })),
            count: results.length,
            totalFound: properties.length
          };
        } catch (error) {
          console.error('❌ Erro na busca de propriedades:', error);
          return {
            success: false,
            error: 'Erro ao buscar propriedades: ' + (error instanceof Error ? error.message : 'Unknown error')
          };
        }
      }
    },

    send_property_media: {
      name: 'send_property_media',
      description: 'Enviar fotos/vídeos de propriedade específica',
      requiredParams: ['propertyId', 'clientPhone'],
      optionalParams: ['mediaType'],
      examples: [
        { propertyId: 'prop-123', clientPhone: '+5511999999999', mediaType: 'photos' }
      ],
      validateParams: (params) => {
        if (!params.propertyId || !params.clientPhone) {
          return { valid: false, error: 'propertyId e clientPhone são obrigatórios' };
        }
        try {
          validatePhoneNumber(params.clientPhone);
          return { valid: true };
        } catch (error) {
          return { valid: false, error: 'Número de telefone inválido' };
        }
      },
      handler: async (params) => {
        const { propertyId, clientPhone, mediaType = 'photos' } = params;
        
        console.log(`📸 Enviando mídia da propriedade ${propertyId} para ${clientPhone}`);
        
        try {
          const property = await propertyService.getById(propertyId);
          if (!property) {
            return { success: false, error: 'Propriedade não encontrada' };
          }
          
          const mediaUrls = mediaType === 'photos' ? 
            property.photos?.slice(0, 3) : property.videos?.slice(0, 1);
          
          if (!mediaUrls || mediaUrls.length === 0) {
            return { 
              success: false, 
              error: `Nenhuma ${mediaType === 'photos' ? 'foto' : 'vídeo'} disponível para esta propriedade` 
            };
          }
          
          // Enviar mídia via WhatsApp
          let sentCount = 0;
          for (const mediaUrl of mediaUrls) {
            try {
              await sendWhatsAppMessage(clientPhone, '', mediaUrl);
              sentCount++;
            } catch (error) {
              console.error('❌ Erro ao enviar mídia:', error);
            }
          }
          
          return {
            success: true,
            data: { 
              propertyName: property.name || property.title, 
              mediaCount: sentCount,
              mediaType,
              totalAvailable: mediaUrls.length
            }
          };
        } catch (error) {
          console.error('❌ Erro ao enviar mídia:', error);
          return {
            success: false,
            error: 'Erro ao enviar mídia: ' + (error instanceof Error ? error.message : 'Unknown error')
          };
        }
      }
    },

    calculate_pricing: {
      name: 'calculate_pricing',
      description: 'Calcular preço total para período específico',
      requiredParams: ['propertyId', 'checkIn', 'checkOut'],
      optionalParams: ['guests'],
      examples: [
        { propertyId: 'prop-123', checkIn: '2024-12-15', checkOut: '2024-12-20', guests: 2 }
      ],
      validateParams: (params) => {
        if (!params.propertyId || !params.checkIn || !params.checkOut) {
          return { valid: false, error: 'propertyId, checkIn e checkOut são obrigatórios' };
        }
        
        try {
          const checkIn = parseISO(params.checkIn);
          const checkOut = parseISO(params.checkOut);
          
          if (!isValid(checkIn) || !isValid(checkOut)) {
            return { valid: false, error: 'Datas inválidas. Use formato YYYY-MM-DD' };
          }
          
          if (checkIn >= checkOut) {
            return { valid: false, error: 'Data de saída deve ser após data de entrada' };
          }
          
          return { valid: true };
        } catch (error) {
          return { valid: false, error: 'Erro ao validar datas' };
        }
      },
      handler: async (params) => {
        const { propertyId, checkIn, checkOut, guests = 1 } = params;
        
        console.log(`💰 Calculando preço para propriedade ${propertyId}, ${checkIn} até ${checkOut}`);
        
        try {
          const property = await propertyService.getById(propertyId);
          if (!property) {
            return { success: false, error: 'Propriedade não encontrada' };
          }
          
          const pricing = await calculatePricing({
            propertyId,
            checkIn: parseISO(checkIn),
            checkOut: parseISO(checkOut),
            guests,
            tenantId: this.tenantId
          });
          
          const nights = Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            success: true,
            data: {
              ...pricing,
              nights,
              propertyName: property.name || property.title,
              checkIn,
              checkOut,
              guests,
              pricePerNight: pricing.basePrice || 0
            }
          };
        } catch (error) {
          console.error('❌ Erro ao calcular preço:', error);
          return {
            success: false,
            error: 'Erro ao calcular preço: ' + (error instanceof Error ? error.message : 'Unknown error')
          };
        }
      }
    },

    check_availability: {
      name: 'check_availability',
      description: 'Verificar disponibilidade de propriedade para período específico',
      requiredParams: ['propertyId', 'checkIn', 'checkOut'],
      optionalParams: [],
      examples: [
        { propertyId: 'prop-123', checkIn: '2024-12-15', checkOut: '2024-12-20' }
      ],
      validateParams: (params) => {
        if (!params.propertyId || !params.checkIn || !params.checkOut) {
          return { valid: false, error: 'propertyId, checkIn e checkOut são obrigatórios' };
        }
        
        try {
          const checkIn = parseISO(params.checkIn);
          const checkOut = parseISO(params.checkOut);
          
          if (!isValid(checkIn) || !isValid(checkOut)) {
            return { valid: false, error: 'Datas inválidas. Use formato YYYY-MM-DD' };
          }
          
          if (checkIn >= checkOut) {
            return { valid: false, error: 'Data de saída deve ser após data de entrada' };
          }
          
          return { valid: true };
        } catch (error) {
          return { valid: false, error: 'Erro ao validar datas' };
        }
      },
      handler: async (params) => {
        const { propertyId, checkIn, checkOut } = params;
        
        console.log(`📅 Verificando disponibilidade para propriedade ${propertyId}, ${checkIn} até ${checkOut}`);
        
        try {
          const property = await propertyService.getById(propertyId);
          if (!property) {
            return { success: false, error: 'Propriedade não encontrada' };
          }
          
          const existingReservations = await reservationService.getPropertyReservations(
            propertyId,
            parseISO(checkIn),
            parseISO(checkOut)
          );
          
          const isAvailable = existingReservations.length === 0;
          const nights = Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`📊 Disponibilidade: ${isAvailable ? 'DISPONÍVEL' : 'OCUPADO'}, ${existingReservations.length} conflitos`);
          
          return {
            success: true,
            data: {
              available: isAvailable,
              conflicts: existingReservations.length,
              propertyId,
              propertyName: property.name || property.title,
              checkIn,
              checkOut,
              nights,
              conflictingReservations: existingReservations.map(res => ({
                id: res.id,
                checkIn: res.checkIn,
                checkOut: res.checkOut,
                status: res.status
              }))
            }
          };
        } catch (error) {
          console.error('❌ Erro ao verificar disponibilidade:', error);
          return {
            success: false,
            error: 'Erro ao verificar disponibilidade: ' + (error instanceof Error ? error.message : 'Unknown error')
          };
        }
      }
    },

    // Continuar com as outras ferramentas...
    create_reservation: {
      name: 'create_reservation',
      description: 'Criar reserva completa para cliente',
      requiredParams: ['propertyId', 'checkIn', 'checkOut', 'clientPhone'],
      optionalParams: ['guests', 'clientName'],
      examples: [
        { propertyId: 'prop-123', checkIn: '2024-12-15', checkOut: '2024-12-20', guests: 2, clientPhone: '+5511999999999', clientName: 'João Silva' }
      ],
      validateParams: (params) => {
        if (!params.propertyId || !params.checkIn || !params.checkOut || !params.clientPhone) {
          return { valid: false, error: 'propertyId, checkIn, checkOut e clientPhone são obrigatórios' };
        }
        
        try {
          validatePhoneNumber(params.clientPhone);
          
          const checkIn = parseISO(params.checkIn);
          const checkOut = parseISO(params.checkOut);
          
          if (!isValid(checkIn) || !isValid(checkOut)) {
            return { valid: false, error: 'Datas inválidas. Use formato YYYY-MM-DD' };
          }
          
          if (checkIn >= checkOut) {
            return { valid: false, error: 'Data de saída deve ser após data de entrada' };
          }
          
          return { valid: true };
        } catch (error) {
          return { valid: false, error: 'Parâmetros inválidos: ' + (error instanceof Error ? error.message : 'Unknown error') };
        }
      },
      handler: async (params) => {
        const { propertyId, checkIn, checkOut, guests = 1, clientPhone, clientName } = params;
        
        console.log(`🏠 Criando reserva para propriedade ${propertyId}, cliente ${clientPhone}`);
        
        try {
          // 1. Verificar disponibilidade primeiro
          const availability = await this.executeTool('check_availability', {
            propertyId, checkIn, checkOut
          });
          
          if (!availability.success) {
            return { success: false, error: 'Erro ao verificar disponibilidade: ' + availability.error };
          }
          
          if (!availability.data.available) {
            return { 
              success: false, 
              error: 'Propriedade não disponível para as datas solicitadas. Há conflitos com outras reservas.' 
            };
          }
          
          // 2. Buscar ou criar cliente
          let client = await clientService.getByPhone(clientPhone);
          if (!client) {
            client = await clientServiceWrapper.createOrUpdate({
              name: clientName || 'Cliente WhatsApp',
              phone: clientPhone,
              tenantId: this.tenantId
            });
          }
          
          // 3. Calcular preço
          const pricing = await this.executeTool('calculate_pricing', {
            propertyId, checkIn, checkOut, guests
          });
          
          if (!pricing.success) {
            return { success: false, error: 'Erro ao calcular preço: ' + pricing.error };
          }
          
          // 4. Criar reserva
          const reservation = await reservationService.create({
            propertyId,
            clientId: client.id,
            checkIn: parseISO(checkIn),
            checkOut: parseISO(checkOut),
            guests,
            totalPrice: pricing.data.totalPrice,
            status: 'pending',
            tenantId: this.tenantId,
            source: 'whatsapp_ai',
            notes: 'Reserva criada automaticamente via agente IA'
          });
          
          console.log(`✅ Reserva criada com sucesso: ${reservation.id}`);
          
          return {
            success: true,
            data: {
              reservation: {
                id: reservation.id,
                propertyId,
                clientId: client.id,
                checkIn,
                checkOut,
                guests,
                totalPrice: pricing.data.totalPrice,
                status: 'pending'
              },
              pricing: pricing.data,
              client: {
                id: client.id,
                name: client.name,
                phone: client.phone
              }
            }
          };
        } catch (error) {
          console.error('❌ Erro ao criar reserva:', error);
          return {
            success: false,
            error: 'Erro ao criar reserva: ' + (error instanceof Error ? error.message : 'Unknown error')
          };
        }
      }
    }
  };

  async executeTool(toolName: string, parameters: any): Promise<ToolOutput> {
    const startTime = Date.now();
    const toolId = `${toolName}-${Date.now()}`;
    
    console.log(`🔧 [${toolId}] Executando ferramenta: ${toolName}`);
    console.log(`📝 [${toolId}] Parâmetros:`, parameters);
    
    try {
      const tool = this.toolRegistry[toolName];
      if (!tool) {
        return {
          toolName,
          success: false,
          error: `Ferramenta '${toolName}' não encontrada. Ferramentas disponíveis: ${Object.keys(this.toolRegistry).join(', ')}`,
          executionTime: Date.now() - startTime
        };
      }
      
      // Validar parâmetros
      if (tool.validateParams) {
        const validation = tool.validateParams(parameters);
        if (!validation.valid) {
          return {
            toolName,
            success: false,
            error: `Parâmetros inválidos: ${validation.error}`,
            executionTime: Date.now() - startTime
          };
        }
      }
      
      // Verificar parâmetros obrigatórios
      for (const requiredParam of tool.requiredParams) {
        if (parameters[requiredParam] === undefined || parameters[requiredParam] === null) {
          return {
            toolName,
            success: false,
            error: `Parâmetro obrigatório '${requiredParam}' não fornecido`,
            executionTime: Date.now() - startTime
          };
        }
      }
      
      // Executar ferramenta
      const result = await tool.handler(parameters);
      const executionTime = Date.now() - startTime;
      
      // Atualizar histórico de execução
      this.updateExecutionHistory(toolName, executionTime);
      
      console.log(`✅ [${toolId}] Ferramenta executada com sucesso em ${executionTime}ms`);
      
      return {
        toolName,
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [${toolId}] Erro na execução da ferramenta:`, error);
      
      return {
        toolName,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido na execução da ferramenta',
        executionTime
      };
    }
  }

  private updateExecutionHistory(toolName: string, executionTime: number): void {
    const history = this.executionHistory.get(toolName) || { count: 0, lastUsed: new Date(), avgTime: 0 };
    
    history.count++;
    history.lastUsed = new Date();
    history.avgTime = Math.round((history.avgTime * (history.count - 1) + executionTime) / history.count);
    
    this.executionHistory.set(toolName, history);
  }
  
  getAvailableTools(): string[] {
    return Object.keys(this.toolRegistry);
  }
  
  getToolDescription(toolName: string): string | null {
    return this.toolRegistry[toolName]?.description || null;
  }

  getToolDetails(toolName: string): ToolRegistryEntry | null {
    return this.toolRegistry[toolName] || null;
  }

  getExecutionStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [toolName, history] of this.executionHistory) {
      stats[toolName] = {
        totalExecutions: history.count,
        lastUsed: history.lastUsed,
        averageTime: history.avgTime
      };
    }
    
    return stats;
  }
}