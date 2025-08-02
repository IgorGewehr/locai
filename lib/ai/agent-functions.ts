// lib/ai/agent-functions.ts
// AGENT FUNCTIONS - VERSÃO CORRIGIDA COM VALIDAÇÕES CRÍTICAS
// Funções essenciais para o agente Sofia com logs detalhados

import { propertyService } from '@/lib/services/property-service';
import { reservationService } from '@/lib/services/reservation-service';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { crmService } from '@/lib/services/crm-service';
import { visitService } from '@/lib/services/visit-service';
import { LeadStatus } from '@/lib/types/crm';
import { VisitStatus, TimePreference } from '@/lib/types/visit-appointment';
import { logger } from '@/lib/utils/logger';
import { conversationContextService } from '@/lib/services/conversation-context-service';

// ===== TIPOS =====

interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ===== SMART ID RESOLUTION SYSTEM =====
// 🎯 Sistema inteligente para resolver IDs baseados em identificadores naturais

class SmartResolver {
  // Resolver ID do cliente por telefone, email ou nome - VERSÃO APRIMORADA
  static async resolveClientId(args: any, tenantId: string): Promise<string | null> {
    try {
      // Se já é um ID válido, validar e retornar
      if (args.clientId && typeof args.clientId === 'string' && args.clientId.length > 10) {
        const client = await clientServiceWrapper.getById(args.clientId);
        if (client) {
          logger.info('✅ [SmartResolver] ClientId já válido', { clientId: args.clientId });
          return args.clientId;
        }
      }

      // PRIORIDADE 1: Tentar resolver por telefone (mais confiável)
      const phone = args.clientPhone || args.phone || args.whatsapp;
      if (phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        const clients = await clientServiceWrapper.getAll();
        const client = clients.find(c => {
          const clientPhone = c.phone?.replace(/\D/g, '') || c.whatsappNumber?.replace(/\D/g, '');
          return clientPhone === normalizedPhone || 
                 clientPhone?.includes(normalizedPhone) ||
                 normalizedPhone.includes(clientPhone || '');
        });
        
        if (client?.id) {
          logger.info('✅ [SmartResolver] Cliente encontrado por telefone', {
            phone: phone.substring(0, 6) + '***',
            clientId: client.id,
            clientName: client.name
          });
          return client.id;
        }
      }

      // PRIORIDADE 2: Buscar no contexto da conversa
      if (phone) {
        const context = await conversationContextService.getContext(phone, tenantId);
        if (context?.lastClientId) {
          // Verificar se o cliente ainda existe
          const client = await clientServiceWrapper.getById(context.lastClientId);
          if (client) {
            logger.info('✅ [SmartResolver] Cliente encontrado no contexto', {
              clientId: context.lastClientId,
              clientName: client.name
            });
            return context.lastClientId;
          }
        }
      }

      // PRIORIDADE 3: Tentar resolver por email
      const email = args.clientEmail || args.email;
      if (email) {
        const clients = await clientServiceWrapper.getAll();
        const client = clients.find(c => c.email?.toLowerCase() === email.toLowerCase());
        
        if (client?.id) {
          logger.info('✅ [SmartResolver] Cliente encontrado por email', {
            email: email.substring(0, 3) + '***',
            clientId: client.id,
            clientName: client.name
          });
          return client.id;
        }
      }

      // PRIORIDADE 4: Tentar resolver por nome (menos confiável)
      const name = args.clientName || args.name;
      if (name && name.trim().length > 2) {
        const clients = await clientServiceWrapper.getAll();
        
        // Busca exata primeiro
        let client = clients.find(c => 
          c.name?.toLowerCase().trim() === name.toLowerCase().trim()
        );
        
        // Se não encontrou, busca parcial
        if (!client) {
          client = clients.find(c => 
            c.name?.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name?.toLowerCase() || '')
          );
        }
        
        if (client?.id) {
          logger.info('✅ [SmartResolver] Cliente encontrado por nome', {
            searchName: name.substring(0, 3) + '***',
            foundName: client.name?.substring(0, 3) + '***',
            clientId: client.id
          });
          return client.id;
        }
      }

      logger.warn('⚠️ [SmartResolver] Cliente não encontrado para resolução', { 
        hasPhone: !!phone,
        hasEmail: !!email,
        hasName: !!name,
        hasClientId: !!args.clientId
      });
      return null;
    } catch (error) {
      logger.error('❌ [SmartResolver] Erro ao resolver clientId', { error });
      return null;
    }
  }

  // Resolver ID da propriedade por nome, endereço ou posição - VERSÃO APRIMORADA
  static async resolvePropertyId(args: any, tenantId: string): Promise<string | null> {
    try {
      // Se já é um ID válido, validar e retornar
      if (args.propertyId && typeof args.propertyId === 'string' && args.propertyId.length > 10) {
        const properties = await propertyService.getActiveProperties(tenantId);
        const property = properties.find(p => p.id === args.propertyId);
        if (property) {
          logger.info('✅ [SmartResolver] PropertyId já válido', { propertyId: args.propertyId });
          return args.propertyId;
        }
      }

      // Buscar todas as propriedades ativas
      const properties = await propertyService.getActiveProperties(tenantId);
      if (properties.length === 0) {
        logger.warn('⚠️ [SmartResolver] Nenhuma propriedade disponível');
        return null;
      }

      // PRIORIDADE 1: Resolver por índice explícito ("primeira opção", "segunda", etc)
      if (args.propertyIndex !== undefined && args.propertyIndex !== null) {
        const index = parseInt(args.propertyIndex.toString());
        if (properties[index]?.id) {
          logger.info('✅ [SmartResolver] Propriedade encontrada por índice explícito', {
            index,
            propertyId: properties[index].id,
            propertyName: properties[index].title
          });
          return properties[index].id;
        }
      }

      // PRIORIDADE 2: Resolver por nome/título
      const propertyName = args.propertyName || args.propertyTitle || args.name || args.title;
      if (propertyName) {
        const searchName = propertyName.toLowerCase();
        
        // Busca exata primeiro
        let property = properties.find(p => 
          p.title?.toLowerCase() === searchName ||
          p.name?.toLowerCase() === searchName
        );
        
        // Se não encontrou, busca por termos
        if (!property) {
          property = properties.find(p => 
            p.title?.toLowerCase().includes(searchName) ||
            p.name?.toLowerCase().includes(searchName) ||
            (searchName.includes('moderno') && p.title?.toLowerCase().includes('moderno')) ||
            (searchName.includes('chalé') && p.title?.toLowerCase().includes('chalé')) ||
            (searchName.includes('praia') && p.title?.toLowerCase().includes('praia')) ||
            (searchName.includes('centro') && p.title?.toLowerCase().includes('centro')) ||
            (searchName.includes('montanha') && p.title?.toLowerCase().includes('montanha'))
          );
        }
        
        if (property?.id) {
          logger.info('✅ [SmartResolver] Propriedade encontrada por nome', {
            name: propertyName,
            propertyId: property.id,
            propertyTitle: property.title
          });
          return property.id;
        }
      }

      // PRIORIDADE 3: Buscar no contexto por propriedade interessada
      if (args.clientPhone) {
        const context = await conversationContextService.getContext(args.clientPhone, tenantId);
        if (context?.interestedPropertyId) {
          // Verificar se ainda existe
          const property = properties.find(p => p.id === context.interestedPropertyId);
          if (property) {
            logger.info('✅ [SmartResolver] Propriedade encontrada no contexto', {
              propertyId: context.interestedPropertyId,
              propertyTitle: property.title
            });
            return context.interestedPropertyId;
          }
        }
      }

      // PRIORIDADE 4: Resolver por endereço
      const address = args.propertyAddress || args.address;
      if (address) {
        const searchAddress = address.toLowerCase();
        const property = properties.find(p => 
          p.address?.toLowerCase().includes(searchAddress)
        );
        
        if (property?.id) {
          logger.info('✅ [SmartResolver] Propriedade encontrada por endereço', {
            address: address,
            propertyId: property.id
          });
          return property.id;
        }
      }

      // FALLBACK: Usar primeira propriedade se nenhuma especificação
      if (properties.length > 0) {
        logger.info('🔄 [SmartResolver] Usando primeira propriedade como fallback', {
          propertyId: properties[0].id,
          propertyName: properties[0].title
        });
        return properties[0].id;
      }

      logger.warn('⚠️ [SmartResolver] Propriedade não encontrada', { args });
      return null;
    } catch (error) {
      logger.error('❌ [SmartResolver] Erro ao resolver propertyId', { error });
      return null;
    }
  }
}

// ===== DEFINIÇÕES DAS FUNÇÕES =====

export const AI_FUNCTIONS: AIFunction[] = [
  {
    name: 'search_properties',
    description: 'Buscar propriedades disponíveis com filtros básicos. SEMPRE ordena por preço crescente (mais baratas primeiro).',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Cidade ou região para busca (opcional - se não informado, busca em todas)' },
        guests: { type: 'number', description: 'Número de hóspedes (usado apenas para referência, não filtra propriedades)' },
        budget: { type: 'number', description: 'Orçamento máximo por noite (opcional)' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        amenities: { type: 'array', items: { type: 'string' }, description: 'Lista de comodidades desejadas (opcional)' }
      },
      required: []
    }
  },
  {
    name: 'send_property_media',
    description: 'Enviar fotos e vídeos de uma propriedade específica para o cliente',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID REAL da propriedade (usar o ID retornado por search_properties)' },
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
        propertyId: { type: 'string', description: 'ID REAL da propriedade (usar o ID retornado por search_properties)' }
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
        propertyId: { type: 'string', description: 'ID REAL da propriedade (usar o ID retornado por search_properties)' },
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
    description: 'Agendar visita presencial. SEMPRE executar quando cliente solicita agendamento de visita.',
    parameters: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Nome do cliente interessado' },
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        clientEmail: { type: 'string', description: 'Email do cliente (opcional)' },
        propertyName: { type: 'string', description: 'Nome ou descrição da propriedade (ex: "apartamento moderno", "primeira opção")' },
        propertyIndex: { type: 'number', description: 'Posição da propriedade na lista (0=primeira, 1=segunda, etc)' },
        visitDate: { type: 'string', description: 'Data para visita (YYYY-MM-DD)' },
        visitTime: { type: 'string', description: 'Horário (HH:MM)' },
        notes: { type: 'string', description: 'Observações especiais (opcional)' },
        clientId: { type: 'string', description: 'ID do cliente se conhecido (opcional)' },
        propertyId: { type: 'string', description: 'ID da propriedade se conhecido (opcional)' }
      },
      required: ['visitDate', 'visitTime']
    }
  },
  {
    name: 'create_reservation',
    description: 'Criar reserva final. SEMPRE executar quando cliente confirma reserva.',
    parameters: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Nome do cliente' },
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        clientEmail: { type: 'string', description: 'Email do cliente (opcional)' },
        clientDocument: { type: 'string', description: 'CPF do cliente (opcional)' },
        propertyName: { type: 'string', description: 'Nome da propriedade (ex: "apartamento moderno", "primeira opção")' },
        propertyIndex: { type: 'number', description: 'Posição da propriedade na lista (0=primeira, 1=segunda)' },
        checkIn: { type: 'string', description: 'Data de check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data de check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        totalPrice: { type: 'number', description: 'Preço total se conhecido (opcional)' },
        notes: { type: 'string', description: 'Observações especiais (opcional)' },
        clientId: { type: 'string', description: 'ID do cliente se conhecido (opcional)' },
        propertyId: { type: 'string', description: 'ID da propriedade se conhecido (opcional)' }
      },
      required: ['checkIn', 'checkOut']
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

// ===== IMPLEMENTAÇÕES DAS FUNÇÕES =====

export class AgentFunctions {

  /**
   * NOVA FUNÇÃO: Auto-Recovery para datas inválidas
   */
  private static autoRecoverDates(checkIn: string, checkOut: string): {
    checkIn: string;
    checkOut: string;
    wasFixed: boolean;
    reason: string;
  } {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    let wasFixed = false;
    let reason = '';
    
    let correctedCheckIn = checkIn;
    let correctedCheckOut = checkOut;
    
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      // Corrigir ano se for passado
      if (checkInDate.getFullYear() < currentYear) {
        checkInDate.setFullYear(currentYear);
        correctedCheckIn = checkInDate.toISOString().split('T')[0];
        wasFixed = true;
        reason += `Check-in movido para ${currentYear}; `;
      }
      
      if (checkOutDate.getFullYear() < currentYear) {
        checkOutDate.setFullYear(currentYear);
        correctedCheckOut = checkOutDate.toISOString().split('T')[0];
        wasFixed = true;
        reason += `Check-out movido para ${currentYear}; `;
      }
      
      // Se check-in ainda estiver no passado, mover para próximo mês
      if (checkInDate < today) {
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        nextMonth.setDate(1); // Primeiro dia do próximo mês
        correctedCheckIn = nextMonth.toISOString().split('T')[0];
        wasFixed = true;
        reason += `Check-in movido para próximo mês; `;
      }
      
      // Garantir que check-out seja após check-in
      const finalCheckIn = new Date(correctedCheckIn);
      const finalCheckOut = new Date(correctedCheckOut);
      
      if (finalCheckOut <= finalCheckIn) {
        const newCheckOut = new Date(finalCheckIn);
        newCheckOut.setDate(finalCheckIn.getDate() + 2); // 2 dias depois
        correctedCheckOut = newCheckOut.toISOString().split('T')[0];
        wasFixed = true;
        reason += `Check-out ajustado para ser após check-in; `;
      }
      
    } catch (error) {
      // Se há erro de parsing, usar datas padrão
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      nextMonth.setDate(1);
      
      const checkOutDefault = new Date(nextMonth);
      checkOutDefault.setDate(3);
      
      correctedCheckIn = nextMonth.toISOString().split('T')[0];
      correctedCheckOut = checkOutDefault.toISOString().split('T')[0];
      wasFixed = true;
      reason = 'Datas inválidas substituídas por padrão';
    }
    
    return {
      checkIn: correctedCheckIn,
      checkOut: correctedCheckOut,
      wasFixed,
      reason: reason.trim()
    };
  }

  /**
   * NOVA FUNÇÃO: Validar PropertyId e corrigir automaticamente
   */
  private static async validatePropertyId(propertyId: string, tenantId: string): Promise<{
    isValid: boolean;
    validId?: string;
    property?: any;
    error?: string;
  }> {
    try {
      logger.info('🔍 [PropertyValidation] Validando propertyId', {
        propertyId: propertyId?.substring(0, 10) + '...',
        tenantId
      });

      // Lista de IDs inválidos conhecidos
      const invalidIds = [
        'primeira', 'segunda', 'terceira', 'quarta', 'quinta',
        'primeira_opcao', 'segunda_opcao', 'terceira_opcao',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        'abc123', 'property1', 'property2', 'prop1', 'prop2',
        'apto1', 'apartamento1', 'casa1', 'imovel1',
        'default', 'example', 'test', 'sample', 'demo'
      ];

      // Verificar se é um ID obviamente inválido
      if (!propertyId || invalidIds.includes(propertyId.toLowerCase()) || propertyId.length < 15) {
        logger.warn('🚨 [PropertyValidation] ID inválido detectado', {
          invalidId: propertyId,
          reason: !propertyId ? 'vazio' : propertyId.length < 15 ? 'muito curto' : 'padrão inválido'
        });
        return {
          isValid: false,
          error: `ID inválido: ${propertyId}. IDs reais têm 15+ caracteres.`
        };
      }

      // Tentar buscar a propriedade no banco
      const property = await propertyService.getById(propertyId);

      if (!property) {
        logger.warn('🚨 [PropertyValidation] Propriedade não encontrada no banco', {
          propertyId: propertyId?.substring(0, 10) + '...',
          tenantId
        });
        return {
          isValid: false,
          error: `Propriedade não encontrada: ${propertyId}`
        };
      }

      if (property.tenantId !== tenantId) {
        logger.warn('🚨 [PropertyValidation] Propriedade não pertence ao tenant', {
          propertyId: propertyId?.substring(0, 10) + '...',
          propertyTenant: property.tenantId,
          requestTenant: tenantId
        });
        return {
          isValid: false,
          error: `Propriedade não encontrada no seu catálogo`
        };
      }

      if (!property.isActive) {
        logger.warn('⚠️ [PropertyValidation] Propriedade inativa', {
          propertyId: propertyId?.substring(0, 10) + '...',
          status: property.status
        });
        return {
          isValid: false,
          error: `Propriedade não está disponível no momento`
        };
      }

      logger.info('✅ [PropertyValidation] PropertyId validado com sucesso', {
        propertyId: propertyId?.substring(0, 10) + '...',
        propertyName: property.title?.substring(0, 30) + '...',
        tenantId
      });

      return {
        isValid: true,
        validId: propertyId,
        property
      };

    } catch (error) {
      logger.error('❌ [PropertyValidation] Erro na validação', {
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId: propertyId?.substring(0, 10) + '...'
      });
      return {
        isValid: false,
        error: 'Erro interno ao validar propriedade'
      };
    }
  }

  /**
   * NOVA FUNÇÃO: Buscar propriedade alternativa quando ID é inválido
   */
  private static async findAlternativeProperty(
      tenantId: string,
      checkIn?: string,
      checkOut?: string,
      guests?: number
  ): Promise<any> {
    try {
      logger.info('🔍 [AlternativeProperty] Buscando propriedade alternativa', {
        tenantId,
        checkIn,
        checkOut,
        guests
      });

      const searchFilters: any = { tenantId };

      if (checkIn) searchFilters.checkIn = new Date(checkIn);
      if (checkOut) searchFilters.checkOut = new Date(checkOut);

      const availableProperties = await propertyService.searchProperties(searchFilters);

      if (availableProperties.length === 0) {
        logger.warn('⚠️ [AlternativeProperty] Nenhuma propriedade alternativa encontrada');
        return null;
      }

      // Ordenar por preço (mais barata primeiro)
      availableProperties.sort((a, b) => (a.basePrice || 999999) - (b.basePrice || 999999));

      const selectedProperty = availableProperties[0];

      logger.info('✅ [AlternativeProperty] Propriedade alternativa selecionada', {
        propertyId: selectedProperty.id?.substring(0, 10) + '...',
        propertyName: selectedProperty.title?.substring(0, 30) + '...',
        basePrice: selectedProperty.basePrice
      });

      return selectedProperty;

    } catch (error) {
      logger.error('❌ [AlternativeProperty] Erro ao buscar alternativa', { error });
      return null;
    }
  }

  static async searchProperties(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('🔍 [search_properties] Iniciando busca', {
        args: {
          location: args.location,
          guests: args.guests,
          budget: args.budget,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          amenities: args.amenities?.length || 0
        },
        tenantId
      });

      const searchFilters = {
        tenantId,
        location: args.location,
        checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
        checkOut: args.checkOut ? new Date(args.checkOut) : undefined,
        maxPrice: args.budget
      };

      let properties = await propertyService.searchProperties(searchFilters);

      logger.info('🔍 [search_properties] Busca inicial concluída', {
        foundCount: properties.length,
        hasLocation: !!args.location
      });

      if (properties.length === 0 && args.location) {
        logger.info('🔍 [search_properties] Expandindo busca sem localização específica');
        properties = await propertyService.searchProperties({
          tenantId,
          checkIn: searchFilters.checkIn,
          checkOut: searchFilters.checkOut,
          maxPrice: args.budget
        });

        logger.info('🔍 [search_properties] Busca expandida concluída', {
          foundCount: properties.length
        });
      }

      if (properties.length === 0) {
        logger.warn('⚠️ [search_properties] Nenhuma propriedade encontrada', {
          filters: searchFilters
        });
        return {
          success: false,
          message: 'Nenhuma propriedade encontrada para os critérios especificados. Que tal tentar outras datas ou ampliar a busca?',
          properties: [],
          suggestions: [
            'Tentar outras datas',
            'Ampliar região de busca',
            'Aumentar orçamento',
            'Reduzir número de hóspedes'
          ]
        };
      }

      // Filtrar por comodidades se especificadas
      if (args.amenities && Array.isArray(args.amenities) && args.amenities.length > 0) {
        const originalCount = properties.length;
        properties = properties.filter(property => {
          const propertyAmenities = property.amenities || [];
          return args.amenities.some((amenity: string) =>
              propertyAmenities.some((propAmenity: string) =>
                  propAmenity.toLowerCase().includes(amenity.toLowerCase())
              )
          );
        });

        logger.info('🔍 [search_properties] Filtro por comodidades aplicado', {
          originalCount,
          filteredCount: properties.length,
          requestedAmenities: args.amenities
        });
      }

      // Ordenar por preço CRESCENTE (mais baratas primeiro)
      properties.sort((a, b) => {
        const priceA = a.basePrice || 999999;
        const priceB = b.basePrice || 999999;
        return priceA - priceB;
      });

      // Filtrar propriedades válidas e ativas
      const validProperties = properties.filter(p => {
        const isValid = p && p.id && p.isActive && p.id.length >= 15;
        if (!isValid) {
          logger.warn('⚠️ [search_properties] Propriedade inválida filtrada', {
            id: p?.id,
            isActive: p?.isActive,
            hasValidId: p?.id?.length >= 15
          });
        }
        return isValid;
      });

      const formattedProperties = validProperties.slice(0, 8).map(p => ({
        id: p.id, // ✅ ID REAL do banco de dados
        name: p.title || p.name || 'Propriedade sem nome',
        location: p.city || p.location || 'Localização não informada',
        bedrooms: p.bedrooms || 1,
        bathrooms: p.bathrooms || 1,
        maxGuests: p.maxGuests || p.capacity || 2,
        basePrice: p.basePrice || 300,
        amenities: p.amenities || [],
        type: p.type || p.category || 'apartment',
        description: p.description || '',
        address: p.address || '',
        isActive: p.isActive,
        minimumNights: p.minimumNights || 1,
        cleaningFee: p.cleaningFee || 0,
        allowsPets: p.allowsPets || false,
        neighborhood: p.neighborhood || ''
      }));

      logger.info('✅ [search_properties] Busca concluída com sucesso', {
        totalFound: validProperties.length,
        returned: formattedProperties.length,
        cheapestPrice: formattedProperties[0]?.basePrice,
        mostExpensivePrice: formattedProperties[formattedProperties.length - 1]?.basePrice,
        validIds: formattedProperties.every(p => p.id.length >= 15)
      });

      // 💾 CONTEXT ENHANCEMENT: Salvar propertyIds no contexto para uso futuro
      if (args.clientPhone && formattedProperties.length > 0) {
        try {
          const context = await conversationContextService.getContext(args.clientPhone, tenantId);
          if (context) {
            await conversationContextService.updateContext(args.clientPhone, tenantId, {
              ...context,
              lastPropertyIds: formattedProperties.map(p => p.id),
              interestedPropertyId: formattedProperties[0]?.id, // Primeira (mais barata) como padrão
              searchResults: {
                properties: formattedProperties.map(p => ({
                  id: p.id,
                  name: p.name,
                  price: p.basePrice,
                  location: p.location
                })),
                timestamp: new Date().toISOString(),
                searchCriteria: {
                  location: args.location,
                  checkIn: args.checkIn,
                  checkOut: args.checkOut,
                  guests: args.guests
                }
              }
            });
            logger.info('💾 [search_properties] PropertyIds salvos no contexto', { 
              propertyIds: formattedProperties.map(p => p.id?.substring(0, 10) + '...'),
              interestedPropertyId: formattedProperties[0]?.id?.substring(0, 10) + '...'
            });
          }
        } catch (ctxError) {
          logger.warn('⚠️ [search_properties] Erro ao salvar no contexto', { ctxError });
        }
      }

      return {
        success: true,
        count: formattedProperties.length,
        properties: formattedProperties,
        message: `Encontrei ${formattedProperties.length} opções ordenadas por preço (mais baratas primeiro)`,
        availableIds: formattedProperties.map(p => p.id),
        searchCriteria: {
          location: args.location,
          guests: args.guests,
          budget: args.budget,
          checkIn: args.checkIn,
          checkOut: args.checkOut
        }
      };

    } catch (error) {
      logger.error('❌ [search_properties] Erro na busca', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        args
      });
      return {
        success: false,
        message: 'Erro interno ao buscar propriedades. Tente novamente em alguns instantes.',
        properties: [],
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  static async calculatePrice(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('💰 [calculate_price] Iniciando cálculo', {
        args: {
          propertyId: args.propertyId?.substring(0, 10) + '...',
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          guests: args.guests
        },
        tenantId
      });

      if (!args.checkIn || !args.checkOut) {
        logger.warn('❌ [calculate_price] Parâmetros obrigatórios faltando', {
          hasCheckIn: !!args.checkIn,
          hasCheckOut: !!args.checkOut,
          hasPropertyId: !!args.propertyId
        });
        return {
          success: false,
          message: 'Para calcular o preço preciso das datas de check-in e check-out. Quando seria a hospedagem?',
          calculation: null,
          missingParams: {
            checkIn: !args.checkIn,
            checkOut: !args.checkOut
          }
        };
      }

      // ✅ NOVO: Auto-Recovery para datas inválidas
      const dateRecovery = this.autoRecoverDates(args.checkIn, args.checkOut);
      if (dateRecovery.wasFixed) {
        logger.info('🗓️ [DateRecovery] Datas corrigidas automaticamente', {
          originalCheckIn: args.checkIn,
          originalCheckOut: args.checkOut,
          correctedCheckIn: dateRecovery.checkIn,
          correctedCheckOut: dateRecovery.checkOut,
          reason: dateRecovery.reason
        });
        
        // Usar datas corrigidas
        args.checkIn = dateRecovery.checkIn;
        args.checkOut = dateRecovery.checkOut;
      }

      let propertyId = args.propertyId;
      let property = null;

      // ✅ VALIDAÇÃO CRÍTICA DO PROPERTY ID
      if (propertyId) {
        const validation = await this.validatePropertyId(propertyId, tenantId);

        if (!validation.isValid) {
          logger.warn('🚨 [calculate_price] PropertyId inválido, buscando alternativa', {
            invalidId: propertyId,
            error: validation.error
          });

          // Tentar encontrar propriedade alternativa
          const alternativeProperty = await this.findAlternativeProperty(
              tenantId,
              args.checkIn,
              args.checkOut,
              args.guests
          );

          if (!alternativeProperty) {
            return {
              success: false,
              message: 'Não consegui encontrar essa propriedade específica. Posso mostrar as opções disponíveis para essas datas?',
              calculation: null,
              suggestion: 'search_properties',
              searchParams: {
                checkIn: args.checkIn,
                checkOut: args.checkOut,
                guests: args.guests
              }
            };
          }

          propertyId = alternativeProperty.id;
          property = alternativeProperty;

          logger.info('✅ [calculate_price] Propriedade alternativa selecionada', {
            newPropertyId: propertyId?.substring(0, 10) + '...',
            propertyName: property.title?.substring(0, 30) + '...'
          });
        } else {
          property = validation.property;
          logger.info('✅ [calculate_price] PropertyId validado', {
            propertyId: propertyId?.substring(0, 10) + '...',
            propertyName: property.title?.substring(0, 30) + '...'
          });
        }
      } else {
        logger.info('🔍 [calculate_price] Sem propertyId, buscando propriedade disponível');

        const alternativeProperty = await this.findAlternativeProperty(
            tenantId,
            args.checkIn,
            args.checkOut,
            args.guests
        );

        if (!alternativeProperty) {
          return {
            success: false,
            message: 'Para calcular o preço, preciso que você escolha uma propriedade específica. Posso mostrar as opções disponíveis?',
            calculation: null,
            suggestion: 'search_properties'
          };
        }

        propertyId = alternativeProperty.id;
        property = alternativeProperty;

        logger.info('✅ [calculate_price] Propriedade selecionada automaticamente', {
          propertyId: propertyId?.substring(0, 10) + '...',
          propertyName: property.title?.substring(0, 30) + '...'
        });
      }

      // Validar datas
      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      logger.info('📅 [calculate_price] Validando datas', {
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        nights,
        isCheckInFuture: checkIn >= currentDate,
        isCheckOutAfterCheckIn: checkOut > checkIn
      });

      if (nights <= 0) {
        logger.warn('❌ [calculate_price] Datas inválidas', {
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          nights
        });
        return {
          success: false,
          message: 'As datas estão incorretas. A data de saída deve ser depois da data de entrada. Pode corrigir?',
          calculation: null,
          dateError: 'checkout_before_checkin'
        };
      }

      if (checkIn < currentDate) {
        logger.warn('⚠️ [calculate_price] Data de check-in no passado', {
          checkIn: args.checkIn,
          today: currentDate.toISOString().split('T')[0]
        });
        return {
          success: false,
          message: 'A data de entrada não pode ser no passado. Pode escolher uma data a partir de hoje?',
          calculation: null,
          dateError: 'checkin_in_past'
        };
      }

      // Verificar noites mínimas
      const minimumNights = property.minimumNights || 1;
      if (nights < minimumNights) {
        logger.warn('⚠️ [calculate_price] Não atende noites mínimas', {
          requested: nights,
          minimum: minimumNights,
          propertyName: property.title
        });
        return {
          success: false,
          message: `Esta propriedade requer no mínimo ${minimumNights} noite${minimumNights > 1 ? 's' : ''}. Que tal estender a estadia?`,
          calculation: null,
          minimumNights,
          currentNights: nights
        };
      }

      // Verificar disponibilidade
      const unavailableDates = property.unavailableDates || [];
      const conflicts = [];
      const dateCheck = new Date(checkIn);

      while (dateCheck < checkOut) {
        const dateStr = dateCheck.toISOString().split('T')[0];
        const conflict = unavailableDates.find(d => {
          const unavailableDate = new Date(d);
          return unavailableDate.toISOString().split('T')[0] === dateStr;
        });

        if (conflict) {
          conflicts.push(dateStr);
        }
        dateCheck.setDate(dateCheck.getDate() + 1);
      }

      if (conflicts.length > 0) {
        logger.warn('⚠️ [calculate_price] Datas indisponíveis detectadas', {
          conflicts,
          propertyName: property.title
        });
        return {
          success: false,
          message: `Essas datas não estão disponíveis: ${conflicts.map(d => new Date(d).toLocaleDateString('pt-BR')).join(', ')}. Posso sugerir outras datas próximas?`,
          calculation: null,
          conflicts,
          suggestion: 'alternative_dates'
        };
      }

      // Cálculo de preços dinâmicos
      const basePrice = property.basePrice || 300;
      let totalStay = 0;
      const dailyPrices = [];

      logger.info('💰 [calculate_price] Iniciando cálculo detalhado', {
        basePrice,
        nights,
        propertyName: property.title,
        hasCustomPricing: !!(property.customPricing && Object.keys(property.customPricing).length > 0),
        hasWeekendSurcharge: !!property.weekendSurcharge,
        hasDecemberSurcharge: !!property.decemberSurcharge
      });

      const calcDate = new Date(checkIn);
      for (let i = 0; i < nights; i++) {
        const dateStr = calcDate.toISOString().split('T')[0];
        let dailyPrice = basePrice;

        // Preço customizado para data específica
        if (property.customPricing && property.customPricing[dateStr]) {
          dailyPrice = property.customPricing[dateStr];
          logger.debug('💰 [calculate_price] Preço customizado aplicado', {
            date: dateStr,
            customPrice: dailyPrice,
            originalPrice: basePrice
          });
        } else {
          const month = calcDate.getMonth() + 1;
          const dayOfWeek = calcDate.getDay();
          let surcharges = [];

          // Taxa de fim de semana
          if ((dayOfWeek === 0 || dayOfWeek === 6) && property.weekendSurcharge) {
            const oldPrice = dailyPrice;
            dailyPrice *= (1 + property.weekendSurcharge / 100);
            surcharges.push(`weekend +${property.weekendSurcharge}%`);
            logger.debug('💰 [calculate_price] Taxa fim de semana aplicada', {
              date: dateStr,
              oldPrice,
              newPrice: dailyPrice,
              surcharge: property.weekendSurcharge
            });
          }

          // Taxa de dezembro
          if (month === 12 && property.decemberSurcharge) {
            const oldPrice = dailyPrice;
            dailyPrice *= (1 + property.decemberSurcharge / 100);
            surcharges.push(`december +${property.decemberSurcharge}%`);
            logger.debug('💰 [calculate_price] Taxa dezembro aplicada', {
              date: dateStr,
              oldPrice,
              newPrice: dailyPrice,
              surcharge: property.decemberSurcharge
            });
          }

          // Taxa de alta temporada
          if (property.highSeasonMonths?.includes(month) && property.highSeasonSurcharge) {
            const oldPrice = dailyPrice;
            dailyPrice *= (1 + property.highSeasonSurcharge / 100);
            surcharges.push(`high-season +${property.highSeasonSurcharge}%`);
            logger.debug('💰 [calculate_price] Taxa alta temporada aplicada', {
              date: dateStr,
              oldPrice,
              newPrice: dailyPrice,
              surcharge: property.highSeasonSurcharge
            });
          }
        }

        dailyPrice = Math.round(dailyPrice);
        totalStay += dailyPrice;
        dailyPrices.push({
          date: dateStr,
          price: dailyPrice,
          isWeekend: calcDate.getDay() === 0 || calcDate.getDay() === 6,
          month: calcDate.getMonth() + 1
        });

        calcDate.setDate(calcDate.getDate() + 1);
      }

      // Taxas adicionais
      const guests = args.guests || 2;
      let extraGuestFee = 0;
      if (guests > property.maxGuests && property.pricePerExtraGuest) {
        const extraGuests = guests - property.maxGuests;
        extraGuestFee = extraGuests * property.pricePerExtraGuest * nights;
        logger.info('👥 [calculate_price] Taxa hóspedes extras calculada', {
          totalGuests: guests,
          maxGuests: property.maxGuests,
          extraGuests,
          pricePerExtra: property.pricePerExtraGuest,
          totalExtraFee: extraGuestFee
        });
      }

      const cleaningFee = property.cleaningFee || 0;
      const serviceFee = Math.round(totalStay * 0.05); // 5% taxa de serviço
      const total = totalStay + extraGuestFee + cleaningFee + serviceFee;

      const calculation = {
        propertyId: propertyId,
        propertyName: property.title || 'Propriedade',
        propertyAddress: property.address || '',
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        nights,
        guests,
        dailyPrices,
        averageDailyPrice: Math.round(totalStay / nights),
        subtotal: totalStay,
        extraGuestFee,
        cleaningFee,
        serviceFee,
        total,
        currency: 'BRL',
        breakdown: {
          accommodation: `R$ ${totalStay.toLocaleString('pt-BR')} (hospedagem ${nights} noite${nights > 1 ? 's' : ''})`,
          extraGuests: extraGuestFee > 0 ? `R$ ${extraGuestFee.toLocaleString('pt-BR')} (${guests - property.maxGuests} hóspede${guests - property.maxGuests > 1 ? 's' : ''} extra${guests - property.maxGuests > 1 ? 's' : ''})` : null,
          cleaning: cleaningFee > 0 ? `R$ ${cleaningFee.toLocaleString('pt-BR')} (taxa de limpeza)` : null,
          service: `R$ ${serviceFee.toLocaleString('pt-BR')} (taxa de serviço 5%)`,
          total: `R$ ${total.toLocaleString('pt-BR')} (total)`
        },
        minimumNights: property.minimumNights || 1,
        meetsMinimum: nights >= (property.minimumNights || 1),
        pricePerNight: Math.round(total / nights), // Preço por noite incluindo todas as taxas
        savings: basePrice * nights < totalStay ? 0 : (basePrice * nights) - totalStay // Economia se houver promoção
      };

      logger.info('✅ [calculate_price] Cálculo concluído com sucesso', {
        propertyId: propertyId?.substring(0, 10) + '...',
        propertyName: property.title?.substring(0, 30) + '...',
        total,
        nights,
        averagePrice: calculation.averageDailyPrice,
        hasExtraFees: extraGuestFee > 0,
        meetsMinimum: calculation.meetsMinimum
      });

      const message = `💰 **${property.title}**\n📍 ${property.address || property.city || ''}\n\n📅 ${nights} noite${nights > 1 ? 's' : ''} (${new Date(args.checkIn).toLocaleDateString('pt-BR')} a ${new Date(args.checkOut).toLocaleDateString('pt-BR')})\n👥 ${guests} hóspede${guests > 1 ? 's' : ''}\n\n💵 **Total: R$ ${total.toLocaleString('pt-BR')}**\n📊 Média: R$ ${calculation.averageDailyPrice.toLocaleString('pt-BR')}/noite\n\n${extraGuestFee > 0 ? `👥 Hóspedes extras: R$ ${extraGuestFee.toLocaleString('pt-BR')}\n` : ''}${cleaningFee > 0 ? `🧹 Taxa limpeza: R$ ${cleaningFee.toLocaleString('pt-BR')}\n` : ''}📋 Taxa serviço: R$ ${serviceFee.toLocaleString('pt-BR')}\n\n✨ Gostou do preço? Posso fazer a reserva!`;

      return {
        success: true,
        calculation,
        message,
        propertyInfo: {
          id: propertyId,
          name: property.title,
          address: property.address,
          maxGuests: property.maxGuests,
          minimumNights: property.minimumNights
        }
      };

    } catch (error) {
      logger.error('❌ [calculate_price] Erro no cálculo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        args: {
          propertyId: args.propertyId?.substring(0, 10) + '...',
          checkIn: args.checkIn,
          checkOut: args.checkOut
        },
        tenantId
      });
      return {
        success: false,
        message: 'Ops! Tive um problema ao calcular o preço. Pode me informar novamente qual propriedade e as datas?',
        calculation: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  static async sendPropertyMedia(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📸 [send_property_media] Iniciando busca de mídia', {
        propertyId: args.propertyId?.substring(0, 10) + '...',
        includeVideos: args.includeVideos,
        maxPhotos: args.maxPhotos,
        tenantId
      });

      // ✅ VALIDAR PROPERTY ID
      const validation = await this.validatePropertyId(args.propertyId, tenantId);
      if (!validation.isValid) {
        logger.warn('🚨 [send_property_media] PropertyId inválido', {
          propertyId: args.propertyId,
          error: validation.error
        });
        return {
          success: false,
          message: 'Não consegui encontrar essa propriedade. Posso mostrar as opções disponíveis novamente?',
          media: null,
          suggestion: 'search_properties'
        };
      }

      const property = validation.property;

      const maxPhotos = args.maxPhotos || 8;
      const includeVideos = args.includeVideos !== false;

      // Preparar fotos
      let photos = (property.photos || []).slice();
      if (photos.length === 0) {
        logger.warn('⚠️ [send_property_media] Propriedade sem fotos', {
          propertyId: property.id?.substring(0, 10) + '...',
          propertyName: property.title
        });
      }

      // Ordenar fotos: principais primeiro, depois por ordem
      photos.sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return (a.order || 0) - (b.order || 0);
      });

      photos = photos.slice(0, maxPhotos);

      // Preparar vídeos
      let videos = [];
      if (includeVideos && property.videos && property.videos.length > 0) {
        videos = property.videos.slice(0, 3);
        logger.info('📹 [send_property_media] Vídeos incluídos', {
          videoCount: videos.length,
          propertyName: property.title
        });
      }

      const mediaCount = photos.length + videos.length;

      if (mediaCount === 0) {
        logger.warn('📸 [send_property_media] Nenhuma mídia disponível', {
          propertyId: property.id?.substring(0, 10) + '...',
          propertyName: property.title
        });
        return {
          success: false,
          message: `A propriedade "${property.title}" ainda não possui fotos ou vídeos disponíveis. Posso te mostrar outras opções?`,
          media: null,
          suggestion: 'alternative_properties'
        };
      }

      logger.info('✅ [send_property_media] Mídia preparada com sucesso', {
        propertyId: property.id?.substring(0, 10) + '...',
        propertyName: property.title?.substring(0, 30) + '...',
        photos: photos.length,
        videos: videos.length,
        totalItems: mediaCount
      });

      const mediaMessage = `📸 **${property.title}**\n📍 ${property.address || property.city || ''}\n\n${photos.length > 0 ? `📷 ${photos.length} foto${photos.length > 1 ? 's' : ''}` : ''}${videos.length > 0 ? `${photos.length > 0 ? ' e ' : ''}🎥 ${videos.length} vídeo${videos.length > 1 ? 's' : ''}` : ''}\n\n💰 A partir de R$ ${property.basePrice?.toLocaleString('pt-BR') || '300'}/noite\n\nGostou? Quer saber o preço para datas específicas?`;

      return {
        success: true,
        property: {
          id: property.id,
          name: property.title || 'Propriedade',
          address: property.address,
          basePrice: property.basePrice,
          maxGuests: property.maxGuests
        },
        media: {
          photos: photos.map(photo => ({
            url: photo.url,
            caption: photo.caption || `${property.title || 'Propriedade'} - ${property.address || ''}`,
            isMain: photo.isMain || false,
            filename: photo.filename || '',
            order: photo.order || 0
          })),
          videos: videos.map(video => ({
            url: video.url,
            title: video.title || `Vídeo: ${property.title}`,
            duration: video.duration || 0,
            thumbnail: video.thumbnail || '',
            filename: video.filename || ''
          }))
        },
        message: mediaMessage,
        totalItems: mediaCount,
        stats: {
          photoCount: photos.length,
          videoCount: videos.length,
          hasMainPhoto: photos.some(p => p.isMain)
        }
      };

    } catch (error) {
      logger.error('❌ [send_property_media] Erro ao buscar mídia', {
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId: args.propertyId?.substring(0, 10) + '...',
        tenantId
      });
      return {
        success: false,
        message: 'Erro ao buscar fotos e vídeos da propriedade. Posso tentar novamente?',
        media: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  static async getPropertyDetails(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📋 [get_property_details] Buscando detalhes', {
        propertyId: args.propertyId?.substring(0, 10) + '...',
        tenantId
      });

      // ✅ VALIDAR PROPERTY ID
      const validation = await this.validatePropertyId(args.propertyId, tenantId);
      if (!validation.isValid) {
        logger.warn('🚨 [get_property_details] PropertyId inválido', {
          propertyId: args.propertyId,
          error: validation.error
        });
        return {
          success: false,
          message: 'Não consegui encontrar essa propriedade. Posso mostrar as opções disponíveis?',
          property: null,
          suggestion: 'search_properties'
        };
      }

      const property = validation.property;

      logger.info('✅ [get_property_details] Detalhes encontrados', {
        propertyId: property.id?.substring(0, 10) + '...',
        propertyName: property.title?.substring(0, 30) + '...',
        hasPhotos: (property.photos || []).length > 0,
        hasVideos: (property.videos || []).length > 0
      });

      // Calcular estatísticas úteis
      const amenitiesCount = (property.amenities || []).length;
      const photosCount = (property.photos || []).length;
      const videosCount = (property.videos || []).length;
      const unavailableDatesCount = (property.unavailableDates || []).length;

      return {
        success: true,
        property: {
          id: property.id,
          name: property.title || property.name || 'Sem nome',
          description: property.description || 'Descrição não disponível',
          location: property.city || property.location || 'Localização não informada',
          address: property.address || 'Endereço não informado',
          neighborhood: property.neighborhood || '',
          bedrooms: property.bedrooms || 1,
          bathrooms: property.bathrooms || 1,
          maxGuests: property.maxGuests || property.capacity || 2,
          basePrice: property.basePrice || 300,
          minimumNights: property.minimumNights || 1,
          allowsPets: property.allowsPets || false,
          amenities: property.amenities || [],
          photos: property.photos || [],
          videos: property.videos || [],
          cleaningFee: property.cleaningFee || 0,
          pricePerExtraGuest: property.pricePerExtraGuest || 0,
          weekendSurcharge: property.weekendSurcharge || 0,
          holidaySurcharge: property.holidaySurcharge || 0,
          decemberSurcharge: property.decemberSurcharge || 0,
          highSeasonSurcharge: property.highSeasonSurcharge || 0,
          highSeasonMonths: property.highSeasonMonths || [],
          unavailableDates: property.unavailableDates || [],
          customPricing: property.customPricing || {},
          status: property.status || 'active',
          isActive: property.isActive || false
        },
        stats: {
          amenitiesCount,
          photosCount,
          videosCount,
          unavailableDatesCount,
          hasCustomPricing: !!(property.customPricing && Object.keys(property.customPricing).length > 0),
          hasSurcharges: !!(property.weekendSurcharge || property.decemberSurcharge || property.highSeasonSurcharge)
        },
        message: `📋 **Detalhes: ${property.title}**\n\n🏠 ${property.bedrooms || 1} quarto${(property.bedrooms || 1) > 1 ? 's' : ''}, ${property.bathrooms || 1} banheiro${(property.bathrooms || 1) > 1 ? 's' : ''}\n👥 Até ${property.maxGuests || 2} hóspedes\n💰 A partir de R$ ${(property.basePrice || 300).toLocaleString('pt-BR')}/noite\n🌟 ${amenitiesCount} comodidades\n📸 ${photosCount} foto${photosCount !== 1 ? 's' : ''}\n\n${property.description ? property.description.substring(0, 200) + (property.description.length > 200 ? '...' : '') : ''}\n\nQuer ver as fotos ou calcular o preço?`
      };

    } catch (error) {
      logger.error('❌ [get_property_details] Erro ao buscar detalhes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        propertyId: args.propertyId?.substring(0, 10) + '...',
        tenantId
      });
      return {
        success: false,
        message: 'Erro ao buscar detalhes da propriedade. Posso tentar novamente?',
        property: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  static async registerClient(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('👤 [register_client] Registrando cliente', {
        name: args.name?.substring(0, 20) + '...',
        phone: args.phone?.substring(0, 6) + '***',
        hasDocument: !!args.document,
        hasEmail: !!args.email,
        tenantId
      });

      // Validar CPF obrigatório
      if (!args.document || args.document.trim() === '') {
        logger.warn('❌ [register_client] CPF obrigatório não fornecido');
        return {
          success: false,
          message: 'Para fazer a reserva, preciso do seu CPF. Pode me informar?',
          client: null,
          missingData: ['document']
        };
      }

      // Validar nome
      if (!args.name || args.name.trim().length < 2) {
        logger.warn('❌ [register_client] Nome inválido', { name: args.name });
        return {
          success: false,
          message: 'Preciso do seu nome completo para o cadastro. Pode me informar?',
          client: null,
          missingData: ['name']
        };
      }

      const clientData: any = {
        name: args.name.trim(),
        phone: args.phone,
        document: args.document.trim(),
        documentType: 'cpf',
        tenantId,
        source: 'whatsapp',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (args.email && args.email.trim() !== '') {
        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(args.email.trim())) {
          clientData.email = args.email.trim().toLowerCase();
        } else {
          logger.warn('⚠️ [register_client] Email inválido fornecido', { email: args.email });
        }
      }

      const client = await clientServiceWrapper.createOrUpdate(clientData);

      logger.info('✅ [register_client] Cliente registrado com sucesso', {
        clientId: client.id,
        name: client.name?.substring(0, 20) + '...',
        hasEmail: !!client.email,
        tenantId
      });

      return {
        success: true,
        client: client.id,
        clientData: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email || undefined,
          document: client.document || undefined,
          createdAt: client.createdAt
        },
        message: `✅ Cadastro realizado com sucesso!\n\n👤 Nome: ${client.name}\n📱 Telefone: ${client.phone}\n📧 Email: ${client.email || 'Não informado'}\n\nAgora posso fazer sua reserva!`
      };

    } catch (error) {
      logger.error('❌ [register_client] Erro ao registrar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: args.name?.substring(0, 20) + '...',
        phone: args.phone?.substring(0, 6) + '***',
        tenantId
      });
      return {
        success: false,
        message: 'Erro ao registrar seus dados. Pode tentar novamente?',
        client: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  static async checkVisitAvailability(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📅 [check_visit_availability] Verificando disponibilidade', {
        startDate: args.startDate,
        days: args.days,
        timePreference: args.timePreference,
        tenantId
      });

      const startDate = args.startDate ? new Date(args.startDate) : new Date();
      const days = args.days || 7;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      const preferredTimes: string[] = [];
      if (args.timePreference) {
        switch (args.timePreference) {
          case 'morning':
            preferredTimes.push(TimePreference.MORNING);
            break;
          case 'afternoon':
            preferredTimes.push(TimePreference.AFTERNOON);
            break;
          case 'evening':
            preferredTimes.push(TimePreference.EVENING);
            break;
        }
      }

      const availableSlots = await visitService.checkAvailability(tenantId, {
        startDate,
        endDate,
        preferredTimes: preferredTimes.length > 0 ? preferredTimes : undefined
      });

      logger.info('📅 [check_visit_availability] Verificação concluída', {
        availableSlots: availableSlots.length,
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        timePreference: args.timePreference
      });

      if (availableSlots.length === 0) {
        logger.warn('⚠️ [check_visit_availability] Nenhum horário disponível');
        return {
          success: true,
          message: 'No momento não temos horários disponíveis para visita presencial nos próximos dias. Que tal garantir sua reserva diretamente? É mais rápido e seguro!',
          availableSlots: [],
          alternativeAction: 'direct_booking',
          suggestion: 'Posso calcular o preço e fazer sua reserva agora mesmo!'
        };
      }

      const formattedSlots = availableSlots.slice(0, 15).map(slot => ({
        date: slot.date.toISOString().split('T')[0],
        dateFormatted: slot.date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: slot.time,
        timeFormatted: slot.time,
        period: this.getTimePeriod(slot.time),
        agentName: slot.agentName || 'Consultor Disponível',
        duration: slot.duration || 60
      }));

      logger.info('✅ [check_visit_availability] Horários formatados', {
        totalSlots: formattedSlots.length,
        periodsAvailable: [...new Set(formattedSlots.map(s => s.period))]
      });

      const message = `📅 **Horários disponíveis para visita:**\n\n${formattedSlots.slice(0, 5).map(slot =>
          `📍 ${slot.dateFormatted}\n⏰ ${slot.timeFormatted} (${slot.period})\n👨‍💼 ${slot.agentName}\n`
      ).join('\n')}\n${formattedSlots.length > 5 ? `\n... e mais ${formattedSlots.length - 5} horários!\n` : ''}\nQual horário prefere?`;

      return {
        success: true,
        availableSlots: formattedSlots,
        message,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
          timePreference: args.timePreference
        },
        stats: {
          totalSlots: formattedSlots.length,
          morningSlots: formattedSlots.filter(s => s.period === 'Manhã').length,
          afternoonSlots: formattedSlots.filter(s => s.period === 'Tarde').length,
          eveningSlots: formattedSlots.filter(s => s.period === 'Noite').length
        }
      };

    } catch (error) {
      logger.error('❌ [check_visit_availability] Erro ao verificar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        args
      });
      return {
        success: false,
        message: 'Erro ao verificar disponibilidade para visitas. Que tal fazer a reserva diretamente?',
        availableSlots: [],
        alternativeAction: 'direct_booking'
      };
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
      logger.info('🏠 [schedule_visit] Agendando visita com Smart Resolution', {
        args,
        tenantId
      });

      // 🎯 SMART RESOLUTION V2: Resolver IDs com novos parâmetros flexíveis
      logger.info('🔍 [schedule_visit] Iniciando Smart Resolution V2', {
        hasClientName: !!args.clientName,
        hasClientPhone: !!args.clientPhone,
        hasPropertyName: !!args.propertyName,
        hasPropertyIndex: args.propertyIndex !== undefined,
        visitDate: args.visitDate,
        visitTime: args.visitTime
      });

      // 1. RESOLVER CLIENT ID
      let resolvedClientId = await SmartResolver.resolveClientId(args, tenantId);
      
      // Se não encontrou, tentar auto-registrar com dados fornecidos
      if (!resolvedClientId && args.clientName && args.clientPhone) {
        logger.info('🔄 [schedule_visit] Auto-registrando cliente para visita...');
        const registerResult = await this.registerClient({
          name: args.clientName,
          phone: args.clientPhone,
          email: args.clientEmail
        }, tenantId);
        
        if (registerResult.success && registerResult.client) {
          resolvedClientId = registerResult.client;
          logger.info('✅ [schedule_visit] Cliente auto-registrado', { 
            clientId: resolvedClientId,
            clientName: args.clientName
          });
        }
      }

      // 2. RESOLVER PROPERTY ID
      let resolvedPropertyId = await SmartResolver.resolvePropertyId(args, tenantId);
      
      // 3. VALIDAR DADOS ESSENCIAIS
      if (!args.visitDate || !args.visitTime) {
        const missing = [];
        if (!args.visitDate) missing.push('data da visita');
        if (!args.visitTime) missing.push('horário da visita');

        logger.warn('⚠️ [schedule_visit] Dados essenciais faltando', { missing });
        return {
          success: false,
          message: `Para agendar a visita preciso: ${missing.join(', ')}. Pode me informar?`,
          visit: null,
          missingData: missing
        };
      }
      
      // 4. VALIDAR RESOLUÇÕES
      if (!resolvedClientId) {
        logger.warn('⚠️ [schedule_visit] Não foi possível identificar o cliente');
        return {
          success: false,
          message: 'Preciso dos seus dados para agendar a visita. Pode me informar seu nome e telefone?',
          visit: null,
          suggestion: 'provide_client_info'
        };
      }
      
      if (!resolvedPropertyId) {
        logger.warn('⚠️ [schedule_visit] Não foi possível identificar a propriedade');
        return {
          success: false,
          message: 'Preciso saber qual propriedade você quer visitar. Pode especificar?',
          visit: null,
          suggestion: 'search_properties'
        };
      }

      // 6. VALIDAR PROPRIEDADE RESOLVIDA
      const propertyValidation = await this.validatePropertyId(resolvedPropertyId, tenantId);
      if (!propertyValidation.isValid) {
        logger.warn('🚨 [schedule_visit] Propriedade inválida após resolução', {
          propertyId: resolvedPropertyId
        });
        return {
          success: false,
          message: 'Não consegui encontrar essa propriedade. Vou mostrar as opções disponíveis.',
          visit: null,
          suggestion: 'search_properties'
        };
      }
      const property = propertyValidation.property;

      // 7. VALIDAR CLIENTE RESOLVIDO
      const client = await clientServiceWrapper.getById(resolvedClientId);
      if (!client) {
        logger.warn('🚨 [schedule_visit] Cliente inválido após resolução', { 
          clientId: resolvedClientId 
        });
        return {
          success: false,
          message: 'Erro interno com dados do cliente. Pode tentar novamente?',
          visit: null,
          suggestion: 'register_client'
        };
      }

      // 5. CONTINUAR COM IDs RESOLVIDOS
      logger.info('✅ [schedule_visit] IDs resolvidos com sucesso', {
        clientId: resolvedClientId,
        propertyId: resolvedPropertyId?.substring(0, 10) + '...'
      });

      // Validar data e hora
      const visitDateTime = new Date(args.visitDate + 'T' + args.visitTime + ':00');
      const now = new Date();

      if (visitDateTime <= now) {
        logger.warn('⚠️ [schedule_visit] Data/hora inválida', {
          visitDateTime: visitDateTime.toISOString(),
          now: now.toISOString()
        });
        return {
          success: false,
          message: 'A data e horário da visita devem ser no futuro. Pode escolher outro horário?',
          visit: null,
          suggestion: 'check_availability'
        };
      }

      const visitData = {
        tenantId,
        clientId: resolvedClientId,
        clientName: client.name,
        clientPhone: client.phone,
        propertyId: resolvedPropertyId,
        propertyName: property.title || 'Propriedade',
        propertyAddress: property.address || '',
        scheduledDate: new Date(args.visitDate),
        scheduledTime: args.visitTime,
        duration: 60,
        status: VisitStatus.SCHEDULED,
        notes: args.notes || '',
        clientRequests: args.notes ? [args.notes] : [],
        confirmedByClient: true,
        confirmedByAgent: false,
        source: 'whatsapp' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdVisit = await visitService.createVisit(visitData);

      logger.info('✅ [schedule_visit] Visita agendada com sucesso', {
        visitId: createdVisit.id,
        clientName: client.name?.substring(0, 20) + '...',
        propertyName: property.title?.substring(0, 30) + '...',
        visitDateTime: visitDateTime.toISOString()
      });

      // Atualizar CRM automaticamente
      try {
        const lead = await crmService.getLeadByPhone(client.phone);
        if (lead) {
          await crmService.updateLead(lead.id, {
            status: LeadStatus.OPPORTUNITY,
            temperature: 'hot',
            score: Math.max(lead.score, 85),
            lastContactDate: new Date(),
            notes: `Visita agendada: ${args.visitDate} ${args.visitTime}`
          });

          logger.info('✅ [schedule_visit] CRM atualizado', {
            leadId: lead.id,
            newStatus: LeadStatus.OPPORTUNITY,
            newScore: Math.max(lead.score, 85)
          });
        }
      } catch (crmError) {
        logger.error('⚠️ [schedule_visit] Erro ao atualizar CRM', {
          crmError: crmError instanceof Error ? crmError.message : 'Unknown error'
        });
      }

      const confirmationMessage = `✅ **Visita Agendada!**\n\n📅 **Data:** ${new Date(args.visitDate).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n⏰ **Horário:** ${args.visitTime}\n\n🏠 **Propriedade:** ${property.title}\n📍 **Endereço:** ${property.address}\n\n👤 **Cliente:** ${client.name}\n📱 **Contato:** ${client.phone}\n\n${args.notes ? `📝 **Observações:** ${args.notes}\n\n` : ''}🎉 Visita confirmada! Nosso consultor entrará em contato para finalizar os detalhes.`;

      return {
        success: true,
        visit: {
          id: createdVisit.id,
          ...visitData,
          confirmationCode: createdVisit.id?.substring(0, 8).toUpperCase()
        },
        message: confirmationMessage,
        confirmationDetails: {
          visitId: createdVisit.id,
          date: args.visitDate,
          time: args.visitTime,
          property: property.title || 'Propriedade',
          address: property.address,
          client: client.name,
          phone: client.phone
        }
      };

    } catch (error) {
      logger.error('❌ [schedule_visit] Erro ao agendar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientId: resolvedClientId,
        propertyId: resolvedPropertyId?.substring(0, 10) + '...',
        tenantId
      });
      return {
        success: false,
        message: 'Erro ao agendar visita. Posso tentar novamente?',
        visit: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  static async createReservation(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('📅 [create_reservation] Iniciando criação de reserva com Smart Resolution', {
        args,
        tenantId
      });

      // 🎯 SMART RESOLUTION V2: Sistema inteligente para reservas
      logger.info('🔍 [create_reservation] Iniciando Smart Resolution V2', {
        hasClientName: !!args.clientName,
        hasClientPhone: !!args.clientPhone,
        hasPropertyName: !!args.propertyName,
        hasPropertyIndex: args.propertyIndex !== undefined,
        checkIn: args.checkIn,
        checkOut: args.checkOut
      });

      // 1. RESOLVER CLIENT ID
      let resolvedClientId = await SmartResolver.resolveClientId(args, tenantId);
      
      // Se não encontrou, tentar auto-registrar com dados fornecidos
      if (!resolvedClientId && args.clientName && args.clientPhone) {
        logger.info('🔄 [create_reservation] Auto-registrando cliente para reserva...');
        const registerResult = await this.registerClient({
          name: args.clientName,
          phone: args.clientPhone,
          email: args.clientEmail,
          document: args.clientDocument
        }, tenantId);
        
        if (registerResult.success && registerResult.client) {
          resolvedClientId = registerResult.client;
          logger.info('✅ [create_reservation] Cliente auto-registrado', { 
            clientId: resolvedClientId,
            clientName: args.clientName
          });
        }
      }

      // 2. RESOLVER PROPERTY ID (com contexto prioritário)
      let resolvedPropertyId = null;
      
      // Primeiro, tentar pegar do contexto (propriedade interessada)
      if (args.clientPhone) {
        const context = await conversationContextService.getContext(args.clientPhone, tenantId);
        if (context?.interestedPropertyId) {
          resolvedPropertyId = context.interestedPropertyId;
          logger.info('✅ [create_reservation] PropertyId encontrado no contexto', {
            propertyId: resolvedPropertyId
          });
        }
      }
      
      // Se não encontrou no contexto, usar SmartResolver
      if (!resolvedPropertyId) {
        resolvedPropertyId = await SmartResolver.resolvePropertyId(args, tenantId);
      }

      // 3. VALIDAR DADOS ESSENCIAIS
      if (!args.checkIn || !args.checkOut) {
        const missing = [];
        if (!args.checkIn) missing.push('data de entrada');
        if (!args.checkOut) missing.push('data de saída');

        logger.warn('⚠️ [create_reservation] Dados essenciais faltando', { missing });
        return {
          success: false,
          message: `Para criar a reserva preciso: ${missing.join(', ')}. Pode me informar?`,
          reservation: null,
          missingData: missing
        };
      }
      
      // 4. VALIDAR RESOLUÇÕES
      if (!resolvedClientId) {
        logger.warn('⚠️ [create_reservation] Não foi possível identificar o cliente');
        return {
          success: false,
          message: 'Preciso dos seus dados completos para finalizar a reserva. Nome, telefone e CPF.',
          reservation: null,
          suggestion: 'register_client'
        };
      }
      
      if (!resolvedPropertyId) {
        logger.warn('⚠️ [create_reservation] Não foi possível identificar a propriedade');
        return {
          success: false,
          message: 'Preciso saber qual propriedade você quer reservar. Pode especificar?',
          reservation: null,
          suggestion: 'search_properties'
        };
      }

      // 5. CONTINUAR COM IDs RESOLVIDOS
      logger.info('✅ [create_reservation] IDs resolvidos com sucesso', {
        clientId: resolvedClientId,
        propertyId: resolvedPropertyId?.substring(0, 10) + '...'
      });

      // 6. VALIDAR PROPRIEDADE RESOLVIDA
      const propertyValidation = await this.validatePropertyId(resolvedPropertyId, tenantId);
      if (!propertyValidation.isValid) {
        logger.warn('🚨 [create_reservation] Propriedade inválida após resolução', {
          propertyId: resolvedPropertyId
        });
        return {
          success: false,
          message: 'Não encontrei essa propriedade. Vamos escolher outra opção?',
          reservation: null,
          suggestion: 'search_properties'
        };
      }
      const property = propertyValidation.property;

      // 7. VALIDAR CLIENTE RESOLVIDO
      const client = await clientServiceWrapper.getById(resolvedClientId);
      if (!client) {
        logger.warn('🚨 [create_reservation] Cliente inválido após resolução', { 
          clientId: resolvedClientId 
        });
        return {
          success: false,
          message: 'Não encontrei seus dados de cadastro. Preciso registrar suas informações primeiro.',
          reservation: null,
          suggestion: 'register_client'
        };
      }

      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      // Validar noites mínimas
      if (nights < (property.minimumNights || 1)) {
        logger.warn('⚠️ [create_reservation] Não atende noites mínimas', {
          requested: nights,
          minimum: property.minimumNights,
          propertyName: property.title
        });
        return {
          success: false,
          message: `Esta propriedade requer no mínimo ${property.minimumNights || 1} noite${(property.minimumNights || 1) > 1 ? 's' : ''}. Pode estender a estadia?`,
          reservation: null,
          minimumNights: property.minimumNights || 1,
          currentNights: nights
        };
      }

      // Verificar disponibilidade
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
        logger.warn('⚠️ [create_reservation] Conflito de datas', {
          conflicts: dateConflicts,
          propertyName: property.title
        });
        return {
          success: false,
          message: `Essas datas não estão mais disponíveis: ${dateConflicts.map(d => new Date(d).toLocaleDateString('pt-BR')).join(', ')}. Posso sugerir outras datas?`,
          reservation: null,
          conflicts: dateConflicts,
          suggestion: 'alternative_dates'
        };
      }

      // Verificar conflitos com outras reservas existentes
      const existingReservations = await reservationService.getWhere('propertyId', '==', args.propertyId);
      const activeReservations = existingReservations.filter(r =>
          r.status !== 'cancelled' && r.tenantId === tenantId
      );

      for (const existingReservation of activeReservations) {
        const existingCheckIn = new Date(existingReservation.checkIn);
        const existingCheckOut = new Date(existingReservation.checkOut);

        if (checkIn < existingCheckOut && checkOut > existingCheckIn) {
          logger.warn('⚠️ [create_reservation] Conflito com reserva existente', {
            newCheckIn: args.checkIn,
            newCheckOut: args.checkOut,
            existingCheckIn: existingCheckIn.toISOString().split('T')[0],
            existingCheckOut: existingCheckOut.toISOString().split('T')[0],
            existingReservationId: existingReservation.id
          });
          return {
            success: false,
            message: 'Essas datas foram reservadas por outro cliente enquanto você decidia. Posso mostrar outras datas disponíveis?',
            reservation: null,
            suggestion: 'alternative_dates'
          };
        }
      }

      const reservationData = {
        tenantId,
        propertyId: resolvedPropertyId,
        clientId: resolvedClientId,
        checkIn,
        checkOut,
        guests: args.guests || 2,
        totalPrice: args.totalPrice,
        status: 'confirmed' as const,
        paymentStatus: 'pending' as const,
        notes: args.notes || '',
        source: 'whatsapp',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Adicionar dados extras para relatórios
        reservationCode: this.generateReservationCode(),
        confirmedAt: new Date(),
        nights
      };

      const reservation = await reservationService.create(reservationData);

      logger.info('✅ [create_reservation] Reserva criada com sucesso', {
        reservationId: reservation.id,
        reservationCode: reservationData.reservationCode,
        clientName: client.name?.substring(0, 20) + '...',
        propertyName: property.title?.substring(0, 30) + '...',
        nights,
        totalPrice: args.totalPrice
      });

      // Atualizar disponibilidade da propriedade
      try {
        const newUnavailableDates = [...(property.unavailableDates || [])];
        const reservationDate = new Date(checkIn);

        while (reservationDate < checkOut) {
          newUnavailableDates.push(new Date(reservationDate));
          reservationDate.setDate(reservationDate.getDate() + 1);
        }

        await propertyService.update(args.propertyId, {
          unavailableDates: newUnavailableDates,
          updatedAt: new Date(),
          lastReservation: new Date()
        });

        logger.info('✅ [create_reservation] Disponibilidade atualizada', {
          propertyId: args.propertyId?.substring(0, 10) + '...',
          blockedDates: nights
        });
      } catch (updateError) {
        logger.error('⚠️ [create_reservation] Erro ao atualizar disponibilidade', {
          updateError: updateError instanceof Error ? updateError.message : 'Unknown error',
          propertyId: args.propertyId
        });
      }

      // Atualizar CRM automaticamente
      try {
        const lead = await crmService.getLeadByPhone(client.phone);
        if (lead) {
          await crmService.updateLead(lead.id, {
            status: LeadStatus.WON,
            temperature: 'hot',
            score: 100,
            lastContactDate: new Date(),
            notes: `Reserva criada: ${reservationData.reservationCode}`,
            dealValue: args.totalPrice
          });

          logger.info('✅ [create_reservation] CRM atualizado - cliente convertido', {
            leadId: lead.id,
            dealValue: args.totalPrice
          });
        }
      } catch (crmError) {
        logger.error('⚠️ [create_reservation] Erro ao atualizar CRM', {
          crmError: crmError instanceof Error ? crmError.message : 'Unknown error'
        });
      }

      const confirmationMessage = `🎉 **RESERVA CONFIRMADA!**\n\n📋 **Código:** ${reservationData.reservationCode}\n\n🏠 **Propriedade:** ${property.title}\n📍 **Endereço:** ${property.address}\n\n📅 **Check-in:** ${checkIn.toLocaleDateString('pt-BR')} (após 14h)\n📅 **Check-out:** ${checkOut.toLocaleDateString('pt-BR')} (até 11h)\n🛏️ **Noites:** ${nights}\n👥 **Hóspedes:** ${args.guests || 2}\n\n💰 **Valor Total:** R$ ${(args.totalPrice || 0).toLocaleString('pt-BR')}\n💳 **Status:** Pagamento Pendente\n\n👤 **Titular:** ${client.name}\n📱 **Contato:** ${client.phone}\n📧 **Email:** ${client.email || 'Não informado'}\n\n📞 Nossa equipe entrará em contato para orientar sobre o pagamento e enviar os detalhes da propriedade!`;

      return {
        success: true,
        reservation: {
          id: reservation.id,
          code: reservationData.reservationCode,
          propertyId: resolvedPropertyId,
          propertyName: property.title || 'Propriedade',
          clientId: resolvedClientId,
          clientName: client.name,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          nights,
          guests: args.guests || 2,
          totalPrice: args.totalPrice,
          status: 'confirmed',
          paymentStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        message: confirmationMessage,
        nextSteps: [
          'Aguardar contato da equipe',
          'Efetuar pagamento conforme orientações',
          'Receber detalhes da propriedade',
          'Preparar documentos para check-in'
        ]
      };

    } catch (error) {
      logger.error('❌ [create_reservation] Erro ao criar reserva', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientId: resolvedClientId,
        propertyId: resolvedPropertyId?.substring(0, 10) + '...',
        tenantId
      });
      return {
        success: false,
        message: 'Erro ao criar reserva. Todos os dados foram salvos, posso tentar novamente?',
        reservation: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  private static generateReservationCode(): string {
    const prefix = 'RSV';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  static async classifyLeadStatus(args: any, tenantId: string): Promise<any> {
    try {
      logger.info('🤖 [classify_lead_status] Classificando lead', {
        clientPhone: args.clientPhone?.substring(0, 6) + '***',
        outcome: args.conversationOutcome,
        reason: args.reason?.substring(0, 50) + '...',
        hasMetadata: !!args.metadata,
        tenantId
      });

      if (!args.clientPhone || !args.conversationOutcome || !args.reason) {
        logger.warn('❌ [classify_lead_status] Dados obrigatórios faltando');
        return {
          success: false,
          message: 'Dados insuficientes para classificação do lead',
          classification: null
        };
      }

      let lead = await crmService.getLeadByPhone(args.clientPhone);

      if (!lead) {
        logger.info('📱 [classify_lead_status] Criando novo lead');
        lead = await crmService.createLead({
          tenantId,
          name: args.clientPhone,
          phone: args.clientPhone,
          whatsappNumber: args.clientPhone,
          status: LeadStatus.NEW,
          source: 'whatsapp_ai',
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
          tags: ['whatsapp', 'ai-classified'],
          notes: `Criado automaticamente: ${args.reason}`
        });
      }

      // Mapear outcome para status e propriedades
      let newStatus: LeadStatus;
      let temperature: 'cold' | 'warm' | 'hot' = lead.temperature;
      let score = lead.score;
      const tags = [...(lead.tags || [])];

      switch (args.conversationOutcome) {
        case 'deal_closed':
          newStatus = LeadStatus.WON;
          temperature = 'hot';
          score = 100;
          tags.push('converted', 'reservation-made');
          break;

        case 'visit_scheduled':
          newStatus = LeadStatus.OPPORTUNITY;
          temperature = 'hot';
          score = Math.max(score, 85);
          tags.push('visit-scheduled', 'high-intent');
          break;

        case 'price_negotiation':
          newStatus = LeadStatus.NEGOTIATION;
          temperature = 'warm';
          score = Math.max(score, 75);
          tags.push('price-sensitive', 'negotiating');
          break;

        case 'wants_human_agent':
          newStatus = LeadStatus.QUALIFIED;
          temperature = 'warm';
          score = Math.max(score, 70);
          tags.push('needs-human-contact', 'qualified');
          break;

        case 'information_gathering':
          newStatus = LeadStatus.CONTACTED;
          temperature = 'warm';
          score = Math.max(score, 60);
          tags.push('information-seeking', 'engaged');
          break;

        case 'no_reservation':
          newStatus = LeadStatus.NURTURING;
          temperature = 'cold';
          score = Math.min(score, 40);
          tags.push('nurturing', 'no-immediate-need');
          break;

        case 'lost_interest':
          newStatus = LeadStatus.LOST;
          temperature = 'cold';
          score = Math.min(score, 30);
          tags.push('lost', 'no-interest');
          break;

        default:
          newStatus = LeadStatus.CONTACTED;
          temperature = 'warm';
          tags.push('unknown-outcome');
      }

      // Processar metadata adicional
      let additionalNotes = args.reason;
      if (args.metadata) {
        if (args.metadata.propertiesViewed?.length > 0) {
          additionalNotes += ` | Propriedades vistas: ${args.metadata.propertiesViewed.length}`;
          tags.push('viewed-properties');
        }
        if (args.metadata.priceDiscussed) {
          additionalNotes += ` | Preço discutido: R$ ${args.metadata.priceDiscussed}`;
          tags.push('price-discussed');
        }
        if (args.metadata.visitDate) {
          additionalNotes += ` | Data visita: ${args.metadata.visitDate}`;
        }
        if (args.metadata.objections?.length > 0) {
          additionalNotes += ` | Objeções: ${args.metadata.objections.join(', ')}`;
          tags.push('has-objections');
        }
      }

      const updates: Partial<any> = {
        status: newStatus,
        temperature,
        score,
        lastContactDate: new Date(),
        notes: additionalNotes,
        tags: [...new Set(tags)], // Remove duplicatas
        totalInteractions: (lead.totalInteractions || 0) + 1,
        lastClassificationDate: new Date(),
        lastClassificationOutcome: args.conversationOutcome
      };

      await crmService.updateLead(lead.id, updates);

      logger.info('✅ [classify_lead_status] Lead classificado com sucesso', {
        leadId: lead.id,
        oldStatus: lead.status,
        newStatus,
        oldScore: lead.score,
        newScore: score,
        outcome: args.conversationOutcome,
        tagsCount: updates.tags?.length
      });

      return {
        success: true,
        classification: {
          leadId: lead.id,
          clientPhone: args.clientPhone,
          oldStatus: lead.status,
          newStatus,
          oldTemperature: lead.temperature,
          newTemperature: temperature,
          oldScore: lead.score,
          newScore: score,
          outcome: args.conversationOutcome,
          reason: args.reason,
          tags: updates.tags,
          classifiedAt: new Date().toISOString()
        },
        message: `Lead classificado: ${newStatus} (${temperature}, score: ${score})`
      };

    } catch (error) {
      logger.error('❌ [classify_lead_status] Erro ao classificar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientPhone: args.clientPhone?.substring(0, 6) + '***',
        outcome: args.conversationOutcome,
        tenantId
      });
      return {
        success: false,
        message: 'Erro ao classificar lead',
        classification: null,
        error: process.env.NODE_ENV === 'development' ? error : undefined
      };
    }
  }

  // ===== EXECUTOR PRINCIPAL =====

  static async executeFunction(
      functionName: string,
      args: any,
      tenantId: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info('⚡ [executeFunction] Executando', {
        functionName,
        hasArgs: !!args,
        argsKeys: args ? Object.keys(args) : [],
        tenantId
      });

      let result;

      switch (functionName) {
        case 'search_properties':
          result = await this.searchProperties(args, tenantId);
          break;

        case 'send_property_media':
          result = await this.sendPropertyMedia(args, tenantId);
          break;

        case 'get_property_details':
          result = await this.getPropertyDetails(args, tenantId);
          break;

        case 'calculate_price':
          result = await this.calculatePrice(args, tenantId);
          break;

        case 'register_client':
          result = await this.registerClient(args, tenantId);
          break;

        case 'check_visit_availability':
          result = await this.checkVisitAvailability(args, tenantId);
          break;

        case 'schedule_visit':
          result = await this.scheduleVisit(args, tenantId);
          break;

        case 'create_reservation':
          result = await this.createReservation(args, tenantId);
          break;

        case 'classify_lead_status':
          result = await this.classifyLeadStatus(args, tenantId);
          break;

        default:
          throw new Error(`Função ${functionName} não implementada`);
      }

      const executionTime = Date.now() - startTime;

      logger.info('✅ [executeFunction] Função executada com sucesso', {
        functionName,
        executionTime: `${executionTime}ms`,
        success: result.success,
        hasData: !!(result.properties || result.media || result.calculation || result.client || result.visit || result.reservation),
        tenantId
      });

      return {
        ...result,
        executionTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('❌ [executeFunction] Erro na execução', {
        functionName,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: `${executionTime}ms`,
        tenantId
      });

      return {
        success: false,
        message: `Erro na execução da função ${functionName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
        executionTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// ===== HELPER PARA OPENAI =====

export function getOpenAIFunctions(): any[] {
  return AI_FUNCTIONS.map(func => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }
  }));
}