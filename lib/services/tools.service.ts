import { ToolOutput } from '@/lib/types/ai-agent';
import { reservationService, clientService } from '@/lib/firebase/firestore';
import { propertyService } from '@/lib/services/property-service'; // Usar implementação correta
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
        
        try {
          console.log('🔍 Searching properties with filters:', { location, priceRange, bedrooms, amenities });
          
          // Primeiro buscar propriedades com filtros básicos
          const properties = await propertyService.searchProperties({
            location,
            priceRange,
            bedrooms,
            amenities
          });
          
          console.log(`📦 Found ${properties?.length || 0} properties`);
          
          // Se não encontrou propriedades, tentar buscar sem filtros
          if (!properties || properties.length === 0) {
            console.log('⚠️ No properties found with filters, trying without filters...');
            const allProperties = await propertyService.getActiveProperties(this.tenantId);
            console.log(`📦 Found ${allProperties?.length || 0} active properties total`);
            
            if (allProperties && allProperties.length > 0) {
              return {
                success: true,
                data: allProperties.slice(0, limit),
                count: allProperties.length
              };
            }
            
            console.log('ℹ️ No properties found in database');
            return {
              success: true,
              data: [],
              count: 0,
              message: 'Ainda não temos propriedades cadastradas. Para melhor atendê-lo, por favor cadastre suas propriedades no sistema.'
            };
          }
          
          return {
            success: true,
            data: properties.slice(0, limit),
            count: properties.length
          };
        } catch (error) {
          console.error('Error searching properties:', error);
          
          // Em caso de erro, retornar resposta clara
          return {
            success: false,
            data: [],
            count: 0,
            error: 'Desculpe, tive dificuldades para acessar as propriedades. Por favor, tente novamente.'
          };
        }
      }
    },

    send_property_media: {
      name: 'send_property_media',
      description: 'Enviar fotos/vídeos de propriedade',
      handler: async (params, context) => {
        let { propertyId, clientPhone, mediaType = 'photos' } = params;
        
        // Se não tem propertyId, tentar usar do contexto
        if (!propertyId && context?.currentPropertyId) {
          propertyId = context.currentPropertyId;
          console.log(`📸 Using property from context: ${propertyId}`);
        }
        
        // Se ainda não tem propertyId, usar primeira propriedade do contexto
        if (!propertyId && context?.interestedProperties?.length > 0) {
          propertyId = context.interestedProperties[0];
          console.log(`📸 Using first property from context: ${propertyId}`);
        }
        
        // Validar propertyId
        if (!propertyId || propertyId === 'ID_FROM_CONTEXT') {
          return { 
            success: false, 
            error: 'Preciso saber qual propriedade você escolheu. Por favor, me diga qual das opções você prefere.' 
          };
        }
        
        try {
          const property = await propertyService.getById(propertyId);
          
          // Se não encontrou, retornar erro
          if (!property) {
            console.log(`⚠️ Property ${propertyId} not found`);
            return {
              success: false,
              error: 'Não encontrei essa propriedade. Por favor, verifique se escolheu uma das opções disponíveis.'
            };
          }
          
          const mediaUrls = mediaType === 'photos' ? 
            property.photos?.slice(0, 3) : property.videos?.slice(0, 1);
          
          if (!mediaUrls || mediaUrls.length === 0) {
            return { 
              success: true, 
              data: {
                property: property.name,
                mediaCount: 0,
                message: 'Este apartamento ainda não tem fotos disponíveis.'
              }
            };
          }
          
          // Enviar mídia via WhatsApp
          for (const mediaUrl of mediaUrls) {
            await sendWhatsAppMessage(clientPhone, '', mediaUrl);
          }
          
          return {
            success: true,
            data: { 
              property: property.name, 
              mediaCount: mediaUrls.length,
              message: `${mediaUrls.length} fotos enviadas!`
            }
          };
        } catch (error) {
          console.error('Error sending property media:', error);
          return { 
            success: false, 
            error: 'Erro ao enviar fotos. Tente novamente.' 
          };
        }
      }
    },

    calculate_pricing: {
      name: 'calculate_pricing',
      description: 'Calcular preço total para período',
      handler: async (params, context) => {
        let { propertyId, checkIn, checkOut, guests } = params;
        
        // Se não tem propertyId, tentar usar do contexto
        if (!propertyId && context?.currentPropertyId) {
          propertyId = context.currentPropertyId;
          console.log(`📍 Using property from context: ${propertyId}`);
        }
        
        // Se não tem datas mas tem no contexto (de mensagens anteriores)
        if (!checkIn && context?.pendingReservation?.checkIn) {
          checkIn = context.pendingReservation.checkIn;
          console.log(`📅 Using check-in from context: ${checkIn}`);
        }
        if (!checkOut && context?.pendingReservation?.checkOut) {
          checkOut = context.pendingReservation.checkOut;
          console.log(`📅 Using check-out from context: ${checkOut}`);
        }
        
        // Se não tem propriedade mas temos apenas uma no contexto, usar ela
        if (!propertyId && context?.interestedProperties?.length === 1) {
          propertyId = context.interestedProperties[0];
          console.log(`📍 Using only property from context: ${propertyId}`);
        }
        
        // Se ainda não tem datas, usar datas padrão de exemplo
        if (!checkIn && !checkOut) {
          // Sugerir próximo fim de semana como exemplo
          const today = new Date();
          const nextFriday = new Date(today);
          nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
          const nextSunday = new Date(nextFriday);
          nextSunday.setDate(nextFriday.getDate() + 2);
          
          return {
            success: true,
            data: {
              message: `Para calcular o valor exato, preciso das suas datas. Como exemplo, um fim de semana (sexta a domingo) ficaria:`,
              exampleCheckIn: nextFriday.toISOString().split('T')[0],
              exampleCheckOut: nextSunday.toISOString().split('T')[0],
              pricePerNight: 300, // Usar preço base
              exampleTotal: 600 + 150, // 2 noites + taxa limpeza
              cleaningFee: 150,
              propertyName: 'Propriedade não especificada'
            }
          };
        }
        
        if (!propertyId || !checkIn || !checkOut) {
          return { 
            success: false, 
            error: 'Preciso das datas de check-in e check-out para calcular o valor exato. Quando você pretende se hospedar?' 
          };
        }
        
        const property = await propertyService.getById(propertyId);
        if (!property) {
          return { 
            success: false, 
            error: 'Não encontrei essa propriedade. Por favor, escolha uma das opções disponíveis ou faça uma nova busca.' 
          };
        }
        
        const pricing = await calculatePricing(
          propertyId,
          new Date(checkIn),
          new Date(checkOut),
          guests || 1
        );
        
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
        
        // Buscar reservas que conflitam com as datas solicitadas
        const allReservations = await reservationService.getWhere('propertyId', '==', propertyId);
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        // Filtrar reservas que conflitam com o período solicitado
        const conflictingReservations = allReservations.filter(reservation => {
          const resCheckIn = reservation.checkIn.toDate ? reservation.checkIn.toDate() : new Date(reservation.checkIn);
          const resCheckOut = reservation.checkOut.toDate ? reservation.checkOut.toDate() : new Date(reservation.checkOut);
          
          // Verifica se há sobreposição de datas
          return !(checkOutDate <= resCheckIn || checkInDate >= resCheckOut);
        });
        
        const isAvailable = conflictingReservations.length === 0;
        
        return {
          success: true,
          data: { 
            available: isAvailable,
            conflicts: conflictingReservations.length,
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
      handler: async (params, context) => {
        let { propertyId, checkIn, checkOut, guests, clientPhone, clientName } = params;
        
        // Usar contexto se parâmetros estão faltando
        if (!propertyId && context?.currentPropertyId) {
          propertyId = context.currentPropertyId;
        }
        if (!propertyId && context?.interestedProperties?.length === 1) {
          propertyId = context.interestedProperties[0];
        }
        if (!checkIn && context?.pendingReservation?.checkIn) {
          checkIn = context.pendingReservation.checkIn;
        }
        if (!checkOut && context?.pendingReservation?.checkOut) {
          checkOut = context.pendingReservation.checkOut;
        }
        if (!clientPhone) {
          clientPhone = context?.clientProfile?.phone || '5511999999999';
        }
        
        // Validar parâmetros obrigatórios
        if (!propertyId || !checkIn || !checkOut) {
          return {
            success: false,
            error: 'Preciso confirmar a propriedade e as datas (check-in e check-out) para criar a reserva. Pode me informar?'
          };
        }
        
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
        
        // Verificar se a propriedade existe
        const property = await propertyService.getById(propertyId);
        if (!property) {
          return {
            success: false,
            error: 'Propriedade não encontrada. Por favor, escolha uma das opções disponíveis.'
          };
        }
        
        // Validar e formatar telefone
        const validatedPhone = validatePhoneNumber(clientPhone);
        
        // Buscar ou criar cliente
        const clients = await clientService.getWhere('phone', '==', validatedPhone);
        let client = clients.length > 0 ? clients[0] : null;
        
        if (!client) {
          client = await clientServiceWrapper.createOrUpdate({
            name: clientName || 'Cliente WhatsApp',
            phone: validatedPhone,
            email: null,
            tenantId: this.tenantId
          });
        }
        
        // Calcular preço
        const pricing = await this.executeTool('calculate_pricing', {
          propertyId, checkIn, checkOut, guests
        }, context);
        
        if (!pricing.success || !pricing.data?.totalPrice) {
          return {
            success: false,
            error: 'Erro ao calcular o preço. Por favor, verifique as datas e tente novamente.'
          };
        }
        
        // Criar reserva
        const reservation = await reservationService.create({
          propertyId,
          clientId: client.id,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          guests: guests || 1,
          totalPrice: pricing.data.totalPrice || 0,
          status: 'pending',
          tenantId: this.tenantId,
          source: 'whatsapp_ai',
          notes: `Reserva criada via WhatsApp AI. Cliente: ${clientName || validatedPhone}`
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
        const { name, phone, email, preferences, notes } = params;
        
        // Validar parâmetros obrigatórios
        if (!name || !phone) {
          return {
            success: false,
            error: 'Nome e telefone são obrigatórios para o cadastro.'
          };
        }
        
        // Validar telefone
        let validatedPhone;
        try {
          validatedPhone = validatePhoneNumber(phone);
        } catch (error) {
          return {
            success: false,
            error: 'Telefone inválido. Por favor, forneça um número válido.'
          };
        }
        
        // Validar email se fornecido
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return {
            success: false,
            error: 'Email inválido. Por favor, forneça um email válido.'
          };
        }
        
        const client = await clientServiceWrapper.createOrUpdate({
          name,
          phone: validatedPhone,
          email: email || null,
          preferences: preferences || {},
          notes: notes || '',
          tenantId: this.tenantId,
          source: 'whatsapp_ai',
          lastInteraction: new Date()
        });
        
        return {
          success: true,
          data: client,
          message: `Cliente ${client.name} cadastrado com sucesso!`
        };
      }
    },

    schedule_viewing: {
      name: 'schedule_viewing',
      description: 'Agendar visita para propriedade',
      handler: async (params, context) => {
        let { propertyId, clientPhone, clientName, viewingDate, viewingTime } = params;
        
        // Usar contexto se necessário
        if (!propertyId && context?.currentPropertyId) {
          propertyId = context.currentPropertyId;
        }
        
        // Validar parâmetros obrigatórios
        if (!propertyId || !clientPhone || !viewingDate) {
          return { 
            success: false, 
            error: 'Preciso do imóvel, telefone do cliente e data para agendar a visita.' 
          };
        }
        
        // Verificar se a propriedade existe
        const property = await propertyService.getById(propertyId);
        if (!property) {
          return { success: false, error: 'Propriedade não encontrada' };
        }
        
        // Validar telefone
        const validatedPhone = validatePhoneNumber(clientPhone);
        
        // Buscar ou criar cliente
        const clients = await clientService.getWhere('phone', '==', validatedPhone);
        let client = clients.length > 0 ? clients[0] : null;
        
        if (!client) {
          // Criar cliente se não existir
          client = await clientServiceWrapper.createOrUpdate({
            name: clientName || 'Cliente WhatsApp',
            phone: validatedPhone,
            tenantId: this.tenantId
          });
        }
        
        // Formatar data e hora
        const visitDate = new Date(viewingDate);
        const timeStr = viewingTime || '14:00'; // Horário padrão se não especificado
        
        const viewing = await reservationService.create({
          propertyId,
          clientId: client.id,
          checkIn: visitDate,
          checkOut: visitDate,
          guests: 1,
          totalPrice: 0,
          status: 'visit',
          tenantId: this.tenantId,
          source: 'whatsapp_ai',
          notes: `Visita agendada para ${timeStr} - ${property.name} - ${property.location || 'Local a confirmar'}`
        });
        
        return {
          success: true,
          data: viewing,
          message: `Visita agendada com sucesso para ${format(visitDate, "dd 'de' MMMM", { locale: ptBR })} às ${timeStr}`,
          propertyName: property.name,
          propertyLocation: property.location
        };
      }
    },

    send_payment_reminder: {
      name: 'send_payment_reminder',
      description: 'Enviar lembrete de pagamento',
      handler: async (params) => {
        const { clientPhone, reservationId, message } = params;
        
        // Validar parâmetros
        if (!reservationId) {
          return { 
            success: false, 
            error: 'ID da reserva é obrigatório para enviar lembrete.' 
          };
        }
        
        // Buscar reserva
        const reservation = await reservationService.getById(reservationId);
        if (!reservation) {
          return { success: false, error: 'Reserva não encontrada' };
        }
        
        // Buscar cliente se não foi fornecido o telefone
        let phone = clientPhone;
        if (!phone && reservation.clientId) {
          const client = await clientService.get(reservation.clientId);
          if (client) {
            phone = client.phone;
          }
        }
        
        if (!phone) {
          return { 
            success: false, 
            error: 'Telefone do cliente não encontrado.' 
          };
        }
        
        // Validar telefone
        const validatedPhone = validatePhoneNumber(phone);
        
        // Buscar detalhes da propriedade
        const property = await propertyService.getById(reservation.propertyId);
        const propertyName = property?.name || 'propriedade';
        
        // Formatar datas
        const checkInDate = format(reservation.checkIn.toDate ? reservation.checkIn.toDate() : new Date(reservation.checkIn), "dd/MM", { locale: ptBR });
        const checkOutDate = format(reservation.checkOut.toDate ? reservation.checkOut.toDate() : new Date(reservation.checkOut), "dd/MM", { locale: ptBR });
        
        const reminderMessage = message || 
          `Olá! 😊\n\nLembrete sobre o pagamento da sua reserva:\n\n📍 ${propertyName}\n📅 ${checkInDate} a ${checkOutDate}\n💰 Valor: R$ ${reservation.totalPrice}\n\nPor favor, realize o pagamento para garantir sua reserva. Entre em contato se tiver dúvidas!`;
        
        await sendWhatsAppMessage(validatedPhone, reminderMessage);
        
        // Atualizar notas da reserva
        await reservationService.update(reservationId, {
          notes: `${reservation.notes || ''}\n[${new Date().toLocaleString('pt-BR')}] Lembrete de pagamento enviado via WhatsApp`
        });
        
        return {
          success: true,
          data: { 
            sent: true, 
            reservationId,
            phone: validatedPhone,
            message: 'Lembrete enviado com sucesso!'
          }
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

  async executeTool(toolName: string, parameters: any, context?: any): Promise<ToolOutput> {
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
      
      const result = await tool.handler(parameters, context);
      
      return {
        toolName,
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      
      // Mensagens de erro mais amigáveis
      let userFriendlyError = 'Ops, tive um probleminha técnico. Vamos tentar de novo?';
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('não encontrad')) {
          userFriendlyError = 'Não consegui encontrar essa informação. Que tal começarmos com uma nova busca?';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          userFriendlyError = 'A conexão está um pouco lenta. Vamos tentar novamente?';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          userFriendlyError = 'Preciso de permissão para fazer isso. Entre em contato com o suporte.';
        }
      }
      
      return {
        toolName,
        success: false,
        error: userFriendlyError,
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