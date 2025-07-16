import { OpenAI } from 'openai'
import { AIFunction } from '@/lib/types/ai'
import { Property } from '@/lib/types/property'
import { propertyService } from '@/lib/services/property-service'
import { reservationService } from '@/lib/services/reservation-service'
import { clientServiceWrapper } from '@/lib/services/client-service'
import { transactionService } from '@/lib/services/transaction-service'
import { crmService } from '@/lib/services/crm-service'
import { calculatePricing } from '@/lib/services/pricing'
import { addDays, format, addMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LeadSource, LeadStatus, TaskPriority } from '@/lib/types/crm'
import {
  SearchPropertiesArgs,
  SearchPropertiesResponse,
  SendPropertyMediaArgs,
  SendPropertyMediaResponse,
  CalculateTotalPriceArgs,
  CalculateTotalPriceResponse,
  CheckAvailabilityArgs,
  CheckAvailabilityResponse,
  CreateReservationArgs,
  CreateReservationResponse,
  ApplyDiscountArgs,
  ApplyDiscountResponse,
  ScheduleFollowUpArgs,
  ScheduleFollowUpResponse,
  GetPropertyDetailsArgs,
  GetPropertyDetailsResponse,
  SuggestAlternativesArgs,
  SuggestAlternativesResponse,
  CreatePendingTransactionArgs,
  CreatePendingTransactionResponse,
  AIFunctionArgs,
  AIFunctionResponse,
} from '@/lib/types/ai-functions'

export const AI_FUNCTIONS: AIFunction[] = [
  {
    name: 'create_or_update_lead',
    description: 'Criar ou atualizar um lead no CRM com base na conversa',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do lead' },
        phone: { type: 'string', description: 'Telefone do lead' },
        email: { type: 'string', description: 'Email do lead' },
        source: { type: 'string', enum: ['whatsapp_ai', 'manual', 'website', 'referral'], description: 'Origem do lead' },
        temperature: { type: 'string', enum: ['hot', 'warm', 'cold'], description: 'Temperatura do lead' },
        preferences: {
          type: 'object',
          properties: {
            propertyType: { type: 'array', items: { type: 'string' }, description: 'Tipos de imóvel' },
            location: { type: 'array', items: { type: 'string' }, description: 'Localizações preferidas' },
            priceMin: { type: 'number', description: 'Preço mínimo' },
            priceMax: { type: 'number', description: 'Preço máximo' },
            bedrooms: { type: 'number', description: 'Número de quartos' },
            moveInDate: { type: 'string', description: 'Data de mudança (YYYY-MM-DD)' }
          }
        },
        notes: { type: 'string', description: 'Observações sobre o lead' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags para categorizar o lead' }
      },
      required: ['name', 'phone']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'update_lead_status',
    description: 'Atualizar o status de um lead no funil de vendas',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID do lead' },
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'opportunity', 'negotiation', 'won', 'lost', 'nurturing'], description: 'Novo status' },
        reason: { type: 'string', description: 'Motivo da mudança de status' },
        wonValue: { type: 'number', description: 'Valor do negócio (se status = won)' }
      },
      required: ['leadId', 'status']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'track_lead_interaction',
    description: 'Registrar interação com lead (conversa, visita, proposta)',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID do lead' },
        type: { type: 'string', enum: ['whatsapp_message', 'phone_call', 'email', 'meeting', 'property_viewing', 'proposal', 'note'], description: 'Tipo de interação' },
        content: { type: 'string', description: 'Conteúdo da interação' },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'], description: 'Sentimento detectado' },
        propertyId: { type: 'string', description: 'ID da propriedade (se aplicável)' }
      },
      required: ['leadId', 'type', 'content']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'get_lead_insights',
    description: 'Obter insights e análise preditiva sobre leads',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID do lead específico' },
        type: { type: 'string', enum: ['individual', 'pipeline', 'conversion_probability'], description: 'Tipo de análise' }
      },
      required: []
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'schedule_lead_task',
    description: 'Criar tarefa de acompanhamento para um lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID do lead' },
        title: { type: 'string', description: 'Título da tarefa' },
        description: { type: 'string', description: 'Descrição da tarefa' },
        type: { type: 'string', enum: ['call', 'email', 'meeting', 'follow_up', 'document', 'other'], description: 'Tipo de tarefa' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Prioridade' },
        dueDate: { type: 'string', description: 'Data de vencimento (YYYY-MM-DD HH:MM)' }
      },
      required: ['leadId', 'title', 'type', 'dueDate']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'cancel_reservation',
    description: 'Cancelar uma reserva existente',
    parameters: {
      type: 'object',
      properties: {
        reservationId: { type: 'string', description: 'ID da reserva' },
        reason: { type: 'string', description: 'Motivo do cancelamento' },
        refundAmount: { type: 'number', description: 'Valor a reembolsar' },
        notifyClient: { type: 'boolean', description: 'Notificar cliente via WhatsApp' }
      },
      required: ['reservationId', 'reason']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'modify_reservation',
    description: 'Modificar datas ou detalhes de uma reserva existente',
    parameters: {
      type: 'object',
      properties: {
        reservationId: { type: 'string', description: 'ID da reserva' },
        newCheckIn: { type: 'string', description: 'Nova data check-in (YYYY-MM-DD)' },
        newCheckOut: { type: 'string', description: 'Nova data check-out (YYYY-MM-DD)' },
        newGuests: { type: 'number', description: 'Novo número de hóspedes' },
        specialRequests: { type: 'string', description: 'Novas solicitações especiais' }
      },
      required: ['reservationId']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'update_property_availability',
    description: 'Bloquear ou desbloquear datas para uma propriedade',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        dates: { type: 'array', items: { type: 'string' }, description: 'Datas para bloquear/desbloquear (YYYY-MM-DD)' },
        action: { type: 'string', enum: ['block', 'unblock'], description: 'Ação a realizar' },
        reason: { type: 'string', description: 'Motivo do bloqueio/desbloqueio' }
      },
      required: ['propertyId', 'dates', 'action']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'update_property_pricing',
    description: 'Atualizar preços de uma propriedade',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        basePrice: { type: 'number', description: 'Novo preço base' },
        cleaningFee: { type: 'number', description: 'Nova taxa de limpeza' },
        weekendMultiplier: { type: 'number', description: 'Novo multiplicador de fim de semana' },
        seasonalRates: { type: 'array', items: { type: 'object' }, description: 'Novas tarifas sazonais' }
      },
      required: ['propertyId']
    },
    autoExecute: false,
    requiresApproval: true,
    priority: 3
  },
  {
    name: 'confirm_payment_received',
    description: 'Confirmar recebimento de pagamento',
    parameters: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'ID da transação' },
        paymentDate: { type: 'string', description: 'Data do pagamento (YYYY-MM-DD)' },
        paymentMethod: { type: 'string', description: 'Método de pagamento utilizado' },
        paymentProof: { type: 'string', description: 'Comprovante ou referência do pagamento' }
      },
      required: ['transactionId']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'create_expense',
    description: 'Criar uma despesa operacional',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Descrição da despesa' },
        amount: { type: 'number', description: 'Valor da despesa' },
        category: { type: 'string', enum: ['cleaning', 'maintenance', 'utilities', 'marketing', 'other'], description: 'Categoria da despesa' },
        propertyId: { type: 'string', description: 'ID da propriedade relacionada' },
        dueDate: { type: 'string', description: 'Data de vencimento (YYYY-MM-DD)' },
        isRecurring: { type: 'boolean', description: 'Se é despesa recorrente' }
      },
      required: ['description', 'amount', 'category']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'process_mini_site_inquiry',
    description: 'Processar solicitação de reserva vinda do mini-site do cliente',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade de interesse' },
        clientName: { type: 'string', description: 'Nome do cliente interessado' },
        clientPhone: { type: 'string', description: 'Telefone do cliente' },
        checkIn: { type: 'string', description: 'Data check-in desejada (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data check-out desejada (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        message: { type: 'string', description: 'Mensagem adicional do cliente' },
        source: { type: 'string', enum: ['mini-site'], description: 'Origem da solicitação' }
      },
      required: ['propertyId', 'clientName', 'clientPhone']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'register_client',
    description: 'Registrar um novo cliente no sistema',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome completo do cliente' },
        email: { type: 'string', description: 'Email do cliente' },
        phone: { type: 'string', description: 'Telefone do cliente' },
        document: { type: 'string', description: 'CPF/CNPJ do cliente' },
        birthDate: { type: 'string', description: 'Data de nascimento (YYYY-MM-DD)' },
        address: { type: 'string', description: 'Endereço do cliente' },
        preferences: { type: 'string', description: 'Preferências ou observações sobre o cliente' }
      },
      required: ['name', 'phone']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'search_properties',
    description: 'Buscar propriedades baseado nos critérios do cliente',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Localização desejada' },
        checkIn: { type: 'string', description: 'Data check-in (YYYY-MM-DD)' },
        checkOut: { type: 'string', description: 'Data check-out (YYYY-MM-DD)' },
        guests: { type: 'number', description: 'Número de hóspedes' },
        budget: { type: 'number', description: 'Orçamento máximo por noite' },
        amenities: { type: 'array', items: { type: 'string' }, description: 'Comodidades desejadas' },
        propertyType: { type: 'string', description: 'Tipo de propriedade' }
      },
      required: ['checkIn', 'checkOut', 'guests']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'send_property_media',
    description: 'Enviar fotos e vídeos de uma propriedade específica',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'ID da propriedade' },
        mediaType: { type: 'string', enum: ['photos', 'videos', 'both'], description: 'Tipo de mídia' }
      },
      required: ['propertyId', 'mediaType']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'calculate_total_price',
    description: 'Calcular preço total incluindo taxas e preços dinâmicos',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        checkIn: { type: 'string' },
        checkOut: { type: 'string' },
        guests: { type: 'number' },
        appliedDiscount: { type: 'number', description: 'Desconto aplicado em %' }
      },
      required: ['propertyId', 'checkIn', 'checkOut', 'guests']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'check_availability',
    description: 'Verificar disponibilidade de uma propriedade em datas específicas',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        checkIn: { type: 'string' },
        checkOut: { type: 'string' }
      },
      required: ['propertyId', 'checkIn', 'checkOut']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'create_reservation',
    description: 'Criar uma nova reserva quando cliente confirmar',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        checkIn: { type: 'string' },
        checkOut: { type: 'string' },
        guests: { type: 'number' },
        clientName: { type: 'string' },
        clientEmail: { type: 'string' },
        clientDocument: { type: 'string' },
        clientPhone: { type: 'string' },
        paymentMethod: { type: 'string' },
        specialRequests: { type: 'string' },
        totalAmount: { type: 'number' }
      },
      required: ['propertyId', 'checkIn', 'checkOut', 'guests', 'clientName', 'totalAmount']
    },
    autoExecute: false,
    requiresApproval: true,
    priority: 3
  },
  {
    name: 'apply_discount',
    description: 'Aplicar desconto especial para fechar negócio',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        originalPrice: { type: 'number' },
        discountPercentage: { type: 'number', description: 'Percentual de desconto (1-30)' },
        reason: { type: 'string', description: 'Motivo do desconto' }
      },
      required: ['propertyId', 'originalPrice', 'discountPercentage', 'reason']
    },
    autoExecute: false,
    requiresApproval: true,
    priority: 3
  },
  {
    name: 'schedule_follow_up',
    description: 'Agendar follow-up com cliente',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        followUpDate: { type: 'string' },
        message: { type: 'string' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
      },
      required: ['clientId', 'followUpDate', 'message']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'get_property_details',
    description: 'Obter detalhes completos de uma propriedade específica',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' }
      },
      required: ['propertyId']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'suggest_alternatives',
    description: 'Sugerir propriedades alternativas baseado nas preferências',
    parameters: {
      type: 'object',
      properties: {
        originalPropertyId: { type: 'string' },
        budget: { type: 'number' },
        flexibleDates: { type: 'boolean' },
        alternativeLocations: { type: 'array', items: { type: 'string' } }
      },
      required: ['originalPropertyId']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'create_financial_movement',
    description: 'Criar movimentação financeira (receita ou despesa)',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['income', 'expense'], description: 'Tipo de movimentação' },
        category: { 
          type: 'string', 
          enum: ['rent', 'cleaning', 'maintenance', 'commission', 'utilities', 'marketing', 'refund', 'other'],
          description: 'Categoria da movimentação' 
        },
        description: { type: 'string', description: 'Descrição da movimentação' },
        amount: { type: 'number', description: 'Valor da movimentação' },
        dueDate: { type: 'string', description: 'Data de vencimento (YYYY-MM-DD)' },
        clientId: { type: 'string', description: 'ID do cliente (opcional)' },
        propertyId: { type: 'string', description: 'ID da propriedade (opcional)' },
        reservationId: { type: 'string', description: 'ID da reserva (opcional)' },
        paymentMethod: { 
          type: 'string', 
          enum: ['stripe', 'pix', 'cash', 'bank_transfer', 'credit_card', 'debit_card'],
          description: 'Método de pagamento' 
        },
        autoCharge: { type: 'boolean', description: 'Cobrar automaticamente via WhatsApp' },
        installments: { type: 'number', description: 'Número de parcelas (opcional)' }
      },
      required: ['type', 'category', 'description', 'amount', 'dueDate']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'get_financial_summary',
    description: 'Consultar resumo financeiro com receitas, despesas e contas pendentes',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'year'], description: 'Período de consulta' },
        type: { type: 'string', enum: ['overview', 'receivables', 'payables', 'cashflow'], description: 'Tipo de resumo' }
      },
      required: []
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 1
  },
  {
    name: 'create_payment_reminder',
    description: 'Criar lembrete ou cobrança de pagamento para cliente',
    parameters: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Nome do cliente' },
        amount: { type: 'number', description: 'Valor a cobrar' },
        dueDate: { type: 'string', description: 'Data de vencimento (YYYY-MM-DD)' },
        description: { type: 'string', description: 'Descrição da cobrança' },
        sendNow: { type: 'boolean', description: 'Enviar lembrete agora' }
      },
      required: ['clientName', 'amount', 'dueDate', 'description']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'generate_financial_report',
    description: 'Gerar relatório financeiro detalhado (DRE, métricas, análises)',
    parameters: {
      type: 'object',
      properties: {
        reportType: { type: 'string', enum: ['income_statement', 'metrics', 'property_performance'], description: 'Tipo de relatório' },
        period: { type: 'string', enum: ['month', 'quarter', 'year'], description: 'Período do relatório' }
      },
      required: ['reportType']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'check_overdue_accounts',
    description: 'Verificar contas vencidas e enviar lembretes',
    parameters: {
      type: 'object',
      properties: {
        sendReminders: { type: 'boolean', description: 'Enviar lembretes automaticamente' },
        includeInterest: { type: 'boolean', description: 'Incluir cálculo de juros' }
      },
      required: []
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  },
  {
    name: 'process_billing_response',
    description: 'Processar resposta do cliente sobre cobrança/pagamento',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID do cliente' },
        transactionId: { type: 'string', description: 'ID da transação relacionada' },
        responseType: { 
          type: 'string', 
          enum: ['promise_to_pay', 'payment_made', 'dispute', 'need_help'],
          description: 'Tipo de resposta do cliente' 
        },
        promisedDate: { type: 'string', description: 'Data prometida para pagamento (se aplicável)' },
        notes: { type: 'string', description: 'Observações sobre a resposta' }
      },
      required: ['clientId', 'responseType']
    },
    autoExecute: true,
    requiresApproval: false,
    priority: 2
  }
]

export class AIFunctionExecutor {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async executeFunctionCall(functionName: string, args: AIFunctionArgs): Promise<AIFunctionResponse> {
    console.log(`🔧 Executing function: ${functionName} with args:`, args);
    switch (functionName) {
      case 'search_properties':
        return await this.searchProperties(args as SearchPropertiesArgs)
      
      case 'send_property_media':
        return await this.sendPropertyMedia(args as SendPropertyMediaArgs)
      
      case 'calculate_total_price':
        return await this.calculateTotalPrice(args as CalculateTotalPriceArgs)
      
      case 'check_availability':
        return await this.checkAvailability(args as CheckAvailabilityArgs)
      
      case 'create_reservation':
        return await this.createReservation(args as CreateReservationArgs)
      
      case 'apply_discount':
        return await this.applyDiscount(args as ApplyDiscountArgs)
      
      case 'schedule_follow_up':
        return await this.scheduleFollowUp(args as ScheduleFollowUpArgs)
      
      case 'get_property_details':
        return await this.getPropertyDetails(args as GetPropertyDetailsArgs)
      
      case 'suggest_alternatives':
        return await this.suggestAlternatives(args as SuggestAlternativesArgs)
      
      case 'create_financial_movement':
        return await this.createFinancialMovement(args as any)
      
      case 'get_financial_summary':
        return await this.getFinancialSummary(args as any)
      
      case 'create_payment_reminder':
        return await this.createPaymentReminder(args as any)
      
      case 'generate_financial_report':
        return await this.generateFinancialReport(args as any)
      
      case 'check_overdue_accounts':
        return await this.checkOverdueAccounts(args as any)
      
      case 'process_billing_response':
        return await this.processBillingResponse(args as any)
      
      case 'cancel_reservation':
        return await this.cancelReservation(args as any)
      
      case 'modify_reservation':
        return await this.modifyReservation(args as any)
      
      case 'update_property_availability':
        return await this.updatePropertyAvailability(args as any)
      
      case 'update_property_pricing':
        return await this.updatePropertyPricing(args as any)
      
      case 'confirm_payment_received':
        return await this.confirmPaymentReceived(args as any)
      
      case 'create_expense':
        return await this.createExpense(args as any)
      
      case 'process_mini_site_inquiry':
        return await this.processMiniSiteInquiry(args as any)
      
      case 'register_client':
        return await this.registerClient(args as any)
      
      case 'create_or_update_lead':
        return await this.createOrUpdateLead(args as any)
      
      case 'update_lead_status':
        return await this.updateLeadStatus(args as any)
      
      case 'track_lead_interaction':
        return await this.trackLeadInteraction(args as any)
      
      case 'get_lead_insights':
        return await this.getLeadInsights(args as any)
      
      case 'schedule_lead_task':
        return await this.scheduleLeadTask(args as any)
      
      case 'create_pending_transaction':
        // Manter compatibilidade - redirecionar para novo método
        return await this.createFinancialMovement({
          type: 'income',
          category: 'rent',
          description: args.description,
          amount: args.amount,
          dueDate: new Date().toISOString().split('T')[0],
          clientId: args.clientId,
          propertyId: args.propertyId,
          reservationId: args.reservationId,
          paymentMethod: args.paymentMethod,
          autoCharge: true,
          installments: args.installments
        })
      
      default:
        throw new Error(`Função não reconhecida: ${functionName}`)
    }
  }

  private async searchProperties(args: SearchPropertiesArgs): Promise<SearchPropertiesResponse> {
    const { location, checkIn, checkOut, guests, budget, amenities, propertyType } = args
    
    try {
      let properties = await propertyService.searchProperties({
        location,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        guests,
        maxPrice: budget,
        amenities,
        propertyType,
        tenantId: this.tenantId
      })

      // Se não encontrou propriedades com os filtros específicos, buscar todas as propriedades ativas
      if (properties.length === 0) {
        console.log('🔍 No properties found with filters, searching all active properties...');
        properties = await propertyService.searchProperties({
          tenantId: this.tenantId
        })
      }
      
      // Priorizar propriedades em destaque primeiro
      properties = properties.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1
        if (!a.isFeatured && b.isFeatured) return 1
        return 0
      })
      
      // Limitar a 5 propriedades para não sobrecarregar o cliente
      properties = properties.slice(0, 5)

      // Apenas calcular preços se tiver datas válidas
      let propertiesWithPrices;
      if (checkIn && checkOut && guests) {
        propertiesWithPrices = await Promise.all(
          properties.map(async (property) => {
            const pricing = await calculatePricing(
              property.id,
              new Date(checkIn),
              new Date(checkOut),
              guests
            )
            
            return {
              ...property,
              calculatedPrice: pricing.totalPrice,
              pricePerNight: pricing.basePrice,
              totalNights: pricing.nights
            }
          })
        )
      } else {
        // Sem datas válidas, não calcular preços
        propertiesWithPrices = properties.map(property => ({
          ...property,
          calculatedPrice: null,
          pricePerNight: property.basePrice,
          totalNights: null
        }))
      }

      return {
        success: true,
        properties: propertiesWithPrices,
        totalFound: propertiesWithPrices.length,
        searchCriteria: { location, checkIn, checkOut, guests, budget },
        // Inclui informações sobre disponibilidade de mídia
        hasMedia: propertiesWithPrices.some(p => p.photos && p.photos.length > 0),
        // Indica se precisa de mais informações
        needsMoreInfo: !checkIn || !checkOut || !guests
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na busca de propriedades'
      }
    }
  }

  private async sendPropertyMedia(args: any): Promise<any> {
    const { propertyId, mediaType } = args
    
    console.log(`🔧 sendPropertyMedia called with propertyId: ${propertyId}, mediaType: ${mediaType}`);
    
    try {
      const property = await propertyService.getById(propertyId)
      if (!property) {
        console.log(`❌ Property not found: ${propertyId}`);
        return { success: false, error: 'Propriedade não encontrada' }
      }
      
      console.log(`✅ Property found: ${property.title}, photos: ${property.photos?.length || 0}`);
      console.log(`📸 Property photos:`, property.photos);

      const result: any = {
        success: true,
        propertyName: property.title,
        propertyId: property.id
      }

      if (mediaType === 'photos' || mediaType === 'both') {
        result.photos = property.photos?.map(photo => ({
          url: photo.url,
          caption: photo.caption || `${property.title} - ${photo.title}`
        })) || []
      }

      if (mediaType === 'videos' || mediaType === 'both') {
        result.videos = property.videos?.map(video => ({
          url: video.url,
          title: video.title || `${property.title} - Vídeo`,
          caption: video.description
        })) || []
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar mídia da propriedade'
      }
    }
  }

  private async calculateTotalPrice(args: any): Promise<any> {
    const { propertyId, checkIn, checkOut, guests, appliedDiscount = 0 } = args
    
    try {
      const pricing = await calculatePricing(
        propertyId,
        new Date(checkIn),
        new Date(checkOut),
        guests
      )

      const discountAmount = (pricing.totalPrice * appliedDiscount) / 100
      const finalPrice = pricing.totalPrice - discountAmount

      return {
        success: true,
        breakdown: {
          basePrice: pricing.basePrice,
          nights: pricing.nights,
          subtotal: pricing.basePrice * pricing.nights,
          weekendSurcharge: pricing.weekendSurcharge,
          holidaySurcharge: pricing.holidaySurcharge,
          cleaningFee: pricing.cleaningFee,
          serviceFee: pricing.serviceFee,
          totalBeforeDiscount: pricing.totalPrice,
          discountPercentage: appliedDiscount,
          discountAmount: discountAmount,
          finalPrice: finalPrice
        },
        formattedPrice: `R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        propertyId,
        dates: { checkIn, checkOut }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no cálculo de preço'
      }
    }
  }

  private async checkAvailability(args: any): Promise<any> {
    const { propertyId, checkIn, checkOut } = args
    
    try {
      const isAvailable = await reservationService.checkAvailability(
        propertyId,
        new Date(checkIn),
        new Date(checkOut)
      )

      if (!isAvailable) {
        // Sugerir datas alternativas
        const alternativeDates = await this.suggestAlternativeDates(
          propertyId,
          new Date(checkIn),
          new Date(checkOut)
        )

        return {
          success: true,
          available: false,
          message: 'Propriedade não disponível nas datas selecionadas',
          alternativeDates
        }
      }

      return {
        success: true,
        available: true,
        message: 'Propriedade disponível nas datas selecionadas',
        propertyId,
        dates: { checkIn, checkOut }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na verificação de disponibilidade'
      }
    }
  }

  private async createReservation(args: any): Promise<any> {
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      clientName,
      clientEmail,
      clientDocument,
      clientPhone,
      paymentMethod,
      specialRequests,
      totalAmount
    } = args
    
    try {
      // Criar ou atualizar cliente
      const client = await clientServiceWrapper.createOrUpdate({
        name: clientName,
        email: clientEmail,
        document: clientDocument,
        phone: clientPhone,
        tenantId: this.tenantId
      })

      // Criar reserva
      const reservation = await reservationService.create({
        propertyId,
        clientId: client.id,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests,
        totalAmount,
        paymentMethod,
        specialRequests,
        status: 'confirmed',
        tenantId: this.tenantId
      })

      // Criar movimentação financeira automaticamente
      const property = await propertyService.getById(propertyId)
      const financialMovement = await this.createFinancialMovement({
        type: 'income',
        category: 'rent',
        description: `Reserva ${reservation.confirmationCode} - ${property?.title || 'Propriedade'}`,
        amount: totalAmount,
        dueDate: checkIn, // Vencimento no check-in
        clientId: client.id,
        propertyId: propertyId,
        reservationId: reservation.id,
        paymentMethod: paymentMethod || 'pix',
        autoCharge: true // Ativar cobrança automática via WhatsApp
      })

      return {
        success: true,
        reservation: {
          id: reservation.id,
          confirmationCode: reservation.confirmationCode,
          clientName,
          propertyId,
          checkIn,
          checkOut,
          guests,
          totalAmount: totalAmount.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          })
        },
        payment: financialMovement.success ? {
          id: financialMovement.data?.transactionId,
          dueDate: checkIn,
          autoCharge: true
        } : null,
        message: 'Reserva criada com sucesso! ' + 
                 (financialMovement.success 
                   ? 'Cobrança automática configurada.' 
                   : 'Atenção: Registre o pagamento manualmente.')
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar reserva'
      }
    }
  }

  private async applyDiscount(args: any): Promise<any> {
    const { propertyId, originalPrice, discountPercentage, reason } = args
    
    try {
      const discountAmount = (originalPrice * discountPercentage) / 100
      const finalPrice = originalPrice - discountAmount

      return {
        success: true,
        discount: {
          originalPrice: originalPrice.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }),
          discountPercentage: `${discountPercentage}%`,
          discountAmount: discountAmount.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }),
          finalPrice: finalPrice.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }),
          reason,
          validUntil: format(addDays(new Date(), 2), 'dd/MM/yyyy')
        },
        message: `Desconto de ${discountPercentage}% aplicado com sucesso!`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aplicar desconto'
      }
    }
  }

  private async scheduleFollowUp(args: any): Promise<any> {
    const { clientId, followUpDate, message, priority = 'medium' } = args
    
    try {
      // Implementar agendamento de follow-up
      // Isso pode ser integrado com um sistema de tarefas/lembretes
      
      return {
        success: true,
        followUp: {
          clientId,
          scheduledDate: followUpDate,
          message,
          priority
        },
        message: 'Follow-up agendado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao agendar follow-up'
      }
    }
  }

  private async getPropertyDetails(args: any): Promise<any> {
    const { propertyId } = args
    
    try {
      const property = await propertyService.getById(propertyId)
      if (!property) {
        return { success: false, error: 'Propriedade não encontrada' }
      }

      return {
        success: true,
        property: {
          id: property.id,
          name: property.title,
          location: property.location,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          maxGuests: property.maxGuests,
          basePrice: property.basePrice,
          description: property.description,
          amenities: property.amenities,
          rules: property.rules,
          photos: property.photos?.slice(0, 3), // Primeiras 3 fotos
          availability: property.availability
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar detalhes da propriedade'
      }
    }
  }

  private async suggestAlternatives(args: any): Promise<any> {
    const { originalPropertyId, budget, flexibleDates, alternativeLocations } = args
    
    try {
      const originalProperty = await propertyService.getById(originalPropertyId)
      if (!originalProperty) {
        return { success: false, error: 'Propriedade original não encontrada' }
      }

      // Buscar propriedades similares
      const alternatives = await propertyService.findSimilar(originalPropertyId, {
        budget,
        locations: alternativeLocations,
        tenantId: this.tenantId
      })

      return {
        success: true,
        alternatives: alternatives.map(property => ({
          id: property.id,
          name: property.title,
          location: property.location,
          basePrice: property.basePrice,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          maxGuests: property.maxGuests,
          mainPhoto: property.photos?.[0]?.url
        })),
        message: `Encontrei ${alternatives.length} alternativas que podem interessar`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao sugerir alternativas'
      }
    }
  }

  private async suggestAlternativeDates(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<any[]> {
    // Implementar lógica para sugerir datas alternativas
    // Verificar disponibilidade em datas próximas
    return []
  }

  private async createFinancialMovement(args: any): Promise<any> {
    const {
      type,
      category,
      description,
      amount,
      dueDate,
      clientId,
      propertyId,
      reservationId,
      paymentMethod,
      autoCharge,
      installments
    } = args
    
    try {
      // Buscar nome do cliente se fornecido
      let clientName: string | undefined
      if (clientId) {
        const client = await clientServiceWrapper.getById(clientId)
        clientName = client?.name
      }
      
      // Buscar nome da propriedade se fornecido
      let propertyName: string | undefined
      if (propertyId) {
        const property = await propertyService.getById(propertyId)
        propertyName = property?.title
      }
      
      if (installments && installments > 1) {
        // Criar parcelamento usando transactionService
        const transactions = []
        const installmentAmount = amount / installments
        
        for (let i = 0; i < installments; i++) {
          const installmentDate = new Date(dueDate)
          installmentDate.setMonth(installmentDate.getMonth() + i)
          
          const transaction = await transactionService.create({
            type,
            category,
            description: `${description} (${i + 1}/${installments})`,
            amount: installmentAmount,
            date: installmentDate,
            status: 'pending',
            clientId,
            propertyId,
            reservationId,
            paymentMethod: paymentMethod || 'pix',
            notes: `Parcela ${i + 1} de ${installments} - Criado pela IA`,
            tags: ['ai-generated', 'installment'],
            isRecurring: false
          })
          
          transactions.push(transaction)
        }
        
        return {
          success: true,
          message: `${installments} parcelas criadas com sucesso`,
          data: {
            transactionIds: transactions.map(t => t.id),
            totalAmount: amount,
            installments,
            firstDueDate: dueDate,
            installmentAmount
          }
        }
      } else {
        // Criar transação única
        const transaction = await transactionService.create({
          type,
          category,
          description,
          amount,
          date: new Date(dueDate),
          status: 'pending',
          clientId,
          propertyId,
          reservationId,
          paymentMethod: paymentMethod || 'pix',
          notes: 'Criado automaticamente pela IA',
          tags: ['ai-generated'],
          isRecurring: false
        })
        
        return {
          success: true,
          message: `${type === 'income' ? 'Receita' : 'Despesa'} criada com sucesso`,
          data: {
            transactionId: transaction.id,
            description,
            amount,
            date: dueDate,
            status: transaction.status,
            type: transaction.type
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar movimentação financeira'
      }
    }
  }

  private async getFinancialSummary(args: any): Promise<any> {
    const { period = 'month', type = 'overview' } = args
    
    try {
      const { financialMovementService } = await import('@/lib/services/financial-movement-service')
      
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          endDate = new Date(now.setHours(23, 59, 59, 999))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = new Date(now.getFullYear(), 11, 31)
          break
      }

      if (type === 'receivables') {
        const movements = await financialMovementService.list({
          tenantId: this.tenantId,
          type: 'income',
          status: 'pending'
        })
        
        const overdueMovements = await financialMovementService.getOverdue(this.tenantId)
        const overdueIncome = overdueMovements.filter(m => m.type === 'income')
        
        const total = movements.reduce((sum, m) => sum + m.amount, 0)
        const overdueTotal = overdueIncome.reduce((sum, m) => sum + m.amount, 0)

        return {
          success: true,
          summary: `📊 *A Receber*\n\n` +
            `💰 Total pendente: R$ ${total.toFixed(2)}\n` +
            `⚠️ Vencidas: R$ ${overdueTotal.toFixed(2)}\n` +
            `📋 ${movements.length} movimentações em aberto\n` +
            `🔴 ${overdueIncome.length} vencidas\n\n` +
            (overdueIncome.length > 0 ? 
              `*Principais vencimentos:*\n` + 
              overdueIncome.slice(0, 3).map(m => 
                `• ${m.description}: R$ ${m.amount.toFixed(2)} (${m.overdueDays} dias)`
              ).join('\n') : ''),
          data: { pending: movements, overdue: overdueIncome, total, overdueTotal }
        }
      }

      if (type === 'payables') {
        const movements = await financialMovementService.list({
          tenantId: this.tenantId,
          type: 'expense',
          status: 'pending'
        })
        
        const upcoming = await financialMovementService.getUpcoming(this.tenantId, 7)
        const upcomingExpenses = upcoming.filter(m => m.type === 'expense')
        
        const total = movements.reduce((sum, m) => sum + m.amount, 0)
        const upcomingTotal = upcomingExpenses.reduce((sum, m) => sum + m.amount, 0)

        return {
          success: true,
          summary: `📊 *A Pagar*\n\n` +
            `💸 Total pendente: R$ ${total.toFixed(2)}\n` +
            `📅 Próximos 7 dias: R$ ${upcomingTotal.toFixed(2)}\n` +
            `📋 ${movements.length} movimentações em aberto\n\n` +
            (upcomingExpenses.length > 0 ? 
              `*Próximos vencimentos:*\n` + 
              upcomingExpenses.slice(0, 3).map(m => {
                const dueDate = m.dueDate instanceof Date ? m.dueDate : m.dueDate.toDate()
                return `• ${m.description}: R$ ${m.amount.toFixed(2)} (${format(dueDate, 'dd/MM')})`
              }).join('\n') : ''),
          data: { pending: movements, upcoming: upcomingExpenses, total, upcomingTotal }
        }
      }

      // Overview padrão
      const summary = await financialMovementService.getSummary(
        this.tenantId,
        startDate,
        endDate
      )

      return {
        success: true,
        summary: `📊 *Resumo Financeiro - ${period === 'month' ? 'Mês Atual' : period}*\n\n` +
          `💚 Receitas: R$ ${summary.totalIncome.toFixed(2)}\n` +
          `💔 Despesas: R$ ${summary.totalExpenses.toFixed(2)}\n` +
          `💰 Saldo: R$ ${summary.balance.toFixed(2)}\n\n` +
          `📋 ${summary.paid.count} movimentações pagas\n` +
          `⏳ ${summary.pending.count} pendentes\n` +
          `⚠️ ${summary.overdue.count} vencidas\n\n` +
          `💡 Use:\n` +
          `• "a receber" para detalhes de receitas\n` +
          `• "a pagar" para despesas\n` +
          `• "criar receita/despesa" para lançamentos`,
        data: summary
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar finanças'
      }
    }
  }

  private async createPaymentReminder(args: any): Promise<any> {
    const { clientName, amount, dueDate, description, sendNow = false } = args
    
    try {
      const { accountsService } = await import('@/lib/services/accounts-service')
      
      // Buscar cliente
      const clients = await clientServiceWrapper.getAll()
      const client = clients.find(c => 
        c.tenantId === this.tenantId &&
        c.name.toLowerCase().includes(clientName.toLowerCase())
      )

      if (!client) {
        return {
          success: false,
          error: `Cliente "${clientName}" não encontrado`
        }
      }

      // Criar conta a receber
      const account = await accountsService.create({
        tenantId: this.tenantId,
        type: 'receivable',
        category: 'rent' as any,
        description,
        originalAmount: amount,
        amount: amount,
        paidAmount: 0,
        remainingAmount: amount,
        issueDate: new Date(),
        dueDate: new Date(dueDate),
        status: 'pending' as any,
        overdueDays: 0,
        customerId: client.id,
        isInstallment: false,
        autoCharge: true,
        remindersSent: sendNow ? 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'ai-agent'
      })

      let message = `✅ Lembrete de pagamento criado:\n\n` +
        `👤 Cliente: ${client.name}\n` +
        `💰 Valor: R$ ${amount.toFixed(2)}\n` +
        `📅 Vencimento: ${format(new Date(dueDate), 'dd/MM/yyyy')}\n` +
        `📝 ${description}`

      if (sendNow && client.phone) {
        message += `\n\n📱 Lembrete enviado para ${client.phone}`
      }

      return {
        success: true,
        message,
        accountId: account
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar lembrete de pagamento'
      }
    }
  }

  private async generateFinancialReport(args: any): Promise<any> {
    const { reportType, period = 'month' } = args
    
    try {
      const { financialAnalyticsService } = await import('@/lib/services/financial-analytics-service')
      
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()

      switch (period) {
        case 'month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = new Date(now.getFullYear(), 11, 31)
          break
      }

      if (reportType === 'income_statement') {
        const dre = await financialAnalyticsService.generateIncomeStatement(
          this.tenantId,
          startDate,
          endDate,
          period === 'year' ? 'yearly' : 'monthly'
        )

        return {
          success: true,
          summary: `📊 *DRE - ${format(startDate, 'MMM/yyyy', { locale: ptBR })}*\n\n` +
            `*RECEITAS*\n` +
            `Aluguéis: R$ ${dre.revenue.rent.toFixed(2)}\n` +
            `Taxas: R$ ${dre.revenue.fees.toFixed(2)}\n` +
            `Outros: R$ ${dre.revenue.other.toFixed(2)}\n` +
            `📈 Total: R$ ${dre.revenue.total.toFixed(2)}\n\n` +
            `*CUSTOS*\n` +
            `Limpeza: R$ ${dre.costs.cleaning.toFixed(2)}\n` +
            `Manutenção: R$ ${dre.costs.maintenance.toFixed(2)}\n` +
            `Outros: R$ ${dre.costs.other.toFixed(2)}\n` +
            `📉 Total: R$ ${dre.costs.total.toFixed(2)}\n\n` +
            `*RESULTADO*\n` +
            `Lucro Bruto: R$ ${dre.grossProfit.toFixed(2)} (${dre.grossMargin.toFixed(1)}%)\n` +
            `Lucro Líquido: R$ ${dre.netProfit.toFixed(2)} (${dre.netMargin.toFixed(1)}%)\n\n` +
            (dre.previousPeriod ? 
              `📊 Vs período anterior:\n` +
              `Receita: ${((dre.revenue.total / dre.previousPeriod.revenue - 1) * 100).toFixed(1)}%\n` +
              `Lucro: ${((dre.netProfit / dre.previousPeriod.netProfit - 1) * 100).toFixed(1)}%` : ''),
          data: dre
        }
      }

      if (reportType === 'metrics') {
        const metrics = await financialAnalyticsService.calculateMetrics(
          this.tenantId,
          { start: startDate, end: endDate }
        )

        return {
          success: true,
          summary: `📊 *Métricas Financeiras - ${period}*\n\n` +
            `*RECEITA*\n` +
            `Total: R$ ${metrics.revenue.total.toFixed(2)}\n` +
            `Diária Média (ADR): R$ ${metrics.revenue.adr.toFixed(2)}\n` +
            `RevPAR: R$ ${metrics.revenue.revPAR.toFixed(2)}\n\n` +
            `*OCUPAÇÃO*\n` +
            `Taxa: ${metrics.occupancy.rate.toFixed(1)}%\n` +
            `Noites ocupadas: ${metrics.occupancy.totalNights}\n` +
            `Noites disponíveis: ${metrics.occupancy.availableNights}\n\n` +
            `*CLIENTES*\n` +
            `Únicos: ${metrics.customers.unique}\n` +
            `Taxa de retorno: ${metrics.customers.repeatRate.toFixed(1)}%\n` +
            `Total reservas: ${metrics.customers.totalReservations}`,
          data: metrics
        }
      }

      if (reportType === 'property_performance') {
        const dre = await financialAnalyticsService.generateIncomeStatement(
          this.tenantId,
          startDate,
          endDate,
          'monthly'
        )

        if (!dre.byProperty || dre.byProperty.length === 0) {
          return {
            success: false,
            error: 'Não há dados de propriedades para o período'
          }
        }

        const topProperties = dre.byProperty
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 5)

        return {
          success: true,
          summary: `🏠 *Performance por Propriedade*\n\n` +
            topProperties.map((p, i) => 
              `${i + 1}. *${p.propertyName}*\n` +
              `   💰 Receita: R$ ${p.revenue.toFixed(2)}\n` +
              `   💸 Custos: R$ ${p.costs.toFixed(2)}\n` +
              `   📈 Lucro: R$ ${p.profit.toFixed(2)} (${p.margin.toFixed(1)}%)\n`
            ).join('\n') +
            `\n💡 ${dre.byProperty.length} propriedades analisadas`,
          data: dre.byProperty
        }
      }

      return {
        success: false,
        error: 'Tipo de relatório não reconhecido'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar relatório financeiro'
      }
    }
  }

  private async checkOverdueAccounts(args: any): Promise<any> {
    const { sendReminders = false } = args
    
    try {
      const { financialMovementService } = await import('@/lib/services/financial-movement-service')
      
      const overdueMovements = await financialMovementService.getOverdue(this.tenantId)
      
      if (overdueMovements.length === 0) {
        return {
          success: true,
          message: '✅ Não há movimentações vencidas no momento!'
        }
      }

      let summary = `⚠️ *Movimentações Vencidas*\n\n`
      summary += `Total: ${overdueMovements.length} movimentações\n`
      summary += `Valor total: R$ ${overdueMovements.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}\n\n`

      const overdueIncome = overdueMovements.filter(m => m.type === 'income')
      const overdueExpenses = overdueMovements.filter(m => m.type === 'expense')

      if (overdueIncome.length > 0) {
        summary += `*A Receber (${overdueIncome.length}):*\n`
        for (const movement of overdueIncome.slice(0, 5)) {
          summary += `• ${movement.description}: R$ ${movement.amount.toFixed(2)} (${movement.overdueDays}d)`
          if (movement.clientName) {
            summary += ` - ${movement.clientName}`
          }
          summary += '\n'
        }
        if (overdueIncome.length > 5) {
          summary += `  ... e mais ${overdueIncome.length - 5} movimentações\n`
        }
      }

      if (overdueExpenses.length > 0) {
        summary += `\n*A Pagar (${overdueExpenses.length}):*\n`
        for (const movement of overdueExpenses.slice(0, 5)) {
          summary += `• ${movement.description}: R$ ${movement.amount.toFixed(2)} (${movement.overdueDays}d)\n`
        }
        if (overdueExpenses.length > 5) {
          summary += `  ... e mais ${overdueExpenses.length - 5} movimentações\n`
        }
      }

      if (sendReminders && overdueIncome.length > 0) {
        // Atualizar lembretes nas movimentações
        for (const movement of overdueIncome) {
          if (movement.autoCharge) {
            await financialMovementService.updateReminder(movement.id)
          }
        }
        summary += `\n📨 ${overdueIncome.filter(m => m.autoCharge).length} lembretes de cobrança enviados`
      }

      return {
        success: true,
        summary,
        data: {
          total: overdueMovements.length,
          receivables: overdueIncome.length,
          payables: overdueExpenses.length,
          totalAmount: overdueMovements.reduce((sum, m) => sum + m.amount, 0)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar movimentações vencidas'
      }
    }
  }

  private async processBillingResponse(args: any): Promise<any> {
    const { clientId, transactionId, responseType, promisedDate, notes } = args
    
    try {
      const { billingService } = await import('@/lib/services/billing-service')
      const { transactionService } = await import('@/lib/services/transaction-service')
      const { clientServiceWrapper } = await import('@/lib/firebase/firestore')
      
      const client = await clientServiceWrapper.getById(clientId)
      if (!client) {
        return {
          success: false,
          error: 'Cliente não encontrado'
        }
      }

      let message = ''
      
      switch (responseType) {
        case 'promise_to_pay':
          message = `✅ Promessa de pagamento registrada!\n\n`
          message += `Cliente: ${client.name}\n`
          if (promisedDate) {
            const promisedDateFormatted = format(new Date(promisedDate), 'dd/MM/yyyy', { locale: ptBR })
            message += `Data prometida: ${promisedDateFormatted}\n`
          }
          if (notes) {
            message += `Observações: ${notes}\n`
          }
          
          // Registrar resposta no sistema de cobrança
          if (client.whatsappNumber) {
            await billingService.processClientResponse(
              client.whatsappNumber, 
              notes || 'Promessa de pagamento', 
              'positive'
            )
          }
          break
          
        case 'payment_made':
          message = `🎉 Pagamento confirmado!\n\n`
          message += `Obrigado por informar. Vamos verificar e dar baixa na transação.\n`
          
          // Marcar transação como paga se informada
          if (transactionId) {
            await transactionService.confirmTransaction(transactionId, 'client_confirmation')
            message += `\n✅ Transação atualizada com sucesso!`
          }
          break
          
        case 'dispute':
          message = `⚠️ Contestação registrada\n\n`
          message += `Vamos analisar sua solicitação e entrar em contato.\n`
          if (notes) {
            message += `\nMotivo: ${notes}`
          }
          
          // Registrar resposta negativa
          if (client.whatsappNumber) {
            await billingService.processClientResponse(
              client.whatsappNumber, 
              notes || 'Contestação', 
              'negative'
            )
          }
          break
          
        case 'need_help':
          message = `🤝 Vamos ajudar você!\n\n`
          message += `Entendo que precisa de ajuda com o pagamento.\n`
          message += `Podemos oferecer algumas opções:\n\n`
          message += `• Parcelamento em até 3x\n`
          message += `• Desconto para pagamento à vista\n`
          message += `• Renegociação de valores\n\n`
          message += `Como posso ajudar melhor?`
          break
      }

      return {
        success: true,
        message,
        data: {
          clientId,
          responseType,
          promisedDate,
          notes
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar resposta'
      }
    }
  }

  private async cancelReservation(args: any): Promise<any> {
    const { reservationId, reason, refundAmount, notifyClient = true } = args
    
    try {
      const reservation = await reservationService.getById(reservationId)
      if (!reservation) {
        return { success: false, error: 'Reserva não encontrada' }
      }

      // Atualizar status da reserva
      await reservationService.update(reservationId, {
        status: 'cancelled',
        cancellationReason: reason,
        cancellationDate: new Date(),
        refundAmount: refundAmount || 0
      })

      // Liberar as datas da propriedade
      const property = await propertyService.getById(reservation.propertyId)
      if (property && property.availability?.blockedDates) {
        const checkIn = new Date(reservation.checkIn)
        const checkOut = new Date(reservation.checkOut)
        const datesToUnblock: string[] = []
        
        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
          datesToUnblock.push(format(d, 'yyyy-MM-dd'))
        }
        
        const updatedBlockedDates = property.availability.blockedDates.filter(
          date => !datesToUnblock.includes(date)
        )
        
        await propertyService.update(reservation.propertyId, {
          'availability.blockedDates': updatedBlockedDates
        })
      }

      // Criar transação de reembolso se aplicável
      if (refundAmount && refundAmount > 0) {
        await transactionService.create({
          type: 'expense',
          amount: refundAmount,
          date: new Date(),
          description: `Reembolso - Cancelamento de reserva ${reservation.confirmationCode}`,
          category: 'refund',
          status: 'pending',
          paymentMethod: reservation.paymentMethod,
          reservationId: reservationId,
          clientId: reservation.clientId,
          propertyId: reservation.propertyId,
          tenantId: this.tenantId,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      return {
        success: true,
        message: `Reserva ${reservation.confirmationCode} cancelada com sucesso`,
        data: {
          reservationId,
          confirmationCode: reservation.confirmationCode,
          reason,
          refundAmount: refundAmount || 0,
          clientNotified: notifyClient
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar reserva'
      }
    }
  }

  private async modifyReservation(args: any): Promise<any> {
    const { reservationId, newCheckIn, newCheckOut, newGuests, specialRequests } = args
    
    try {
      const reservation = await reservationService.getById(reservationId)
      if (!reservation) {
        return { success: false, error: 'Reserva não encontrada' }
      }

      const updates: any = {}
      let needsAvailabilityUpdate = false
      let oldDates: string[] = []
      let newDates: string[] = []

      // Se mudando datas, verificar disponibilidade
      if (newCheckIn || newCheckOut) {
        const checkIn = new Date(newCheckIn || reservation.checkIn)
        const checkOut = new Date(newCheckOut || reservation.checkOut)
        
        // Verificar disponibilidade
        const isAvailable = await reservationService.checkAvailability(
          reservation.propertyId,
          checkIn,
          checkOut,
          reservationId // Excluir reserva atual da verificação
        )

        if (!isAvailable) {
          return {
            success: false,
            error: 'As novas datas não estão disponíveis'
          }
        }

        // Calcular datas antigas e novas
        const oldCheckIn = new Date(reservation.checkIn)
        const oldCheckOut = new Date(reservation.checkOut)
        
        for (let d = new Date(oldCheckIn); d < oldCheckOut; d.setDate(d.getDate() + 1)) {
          oldDates.push(format(new Date(d), 'yyyy-MM-dd'))
        }
        
        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
          newDates.push(format(new Date(d), 'yyyy-MM-dd'))
        }

        updates.checkIn = checkIn
        updates.checkOut = checkOut
        needsAvailabilityUpdate = true

        // Recalcular preço
        const pricing = await calculatePricing(
          reservation.propertyId,
          checkIn,
          checkOut,
          newGuests || reservation.guests
        )
        updates.totalAmount = pricing.totalPrice
      }

      if (newGuests) {
        updates.guests = newGuests
      }

      if (specialRequests !== undefined) {
        updates.specialRequests = specialRequests
      }

      // Atualizar reserva
      await reservationService.update(reservationId, updates)

      // Atualizar disponibilidade se necessário
      if (needsAvailabilityUpdate) {
        const property = await propertyService.getById(reservation.propertyId)
        if (property && property.availability?.blockedDates) {
          // Remover datas antigas e adicionar novas
          let blockedDates = property.availability.blockedDates.filter(
            date => !oldDates.includes(date)
          )
          blockedDates = [...blockedDates, ...newDates.filter(date => !blockedDates.includes(date))]
          
          await propertyService.update(reservation.propertyId, {
            'availability.blockedDates': blockedDates
          })
        }
      }

      return {
        success: true,
        message: 'Reserva modificada com sucesso',
        data: {
          reservationId,
          confirmationCode: reservation.confirmationCode,
          updates,
          newTotalAmount: updates.totalAmount
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao modificar reserva'
      }
    }
  }

  private async updatePropertyAvailability(args: any): Promise<any> {
    const { propertyId, dates, action, reason } = args
    
    try {
      const property = await propertyService.getById(propertyId)
      if (!property) {
        return { success: false, error: 'Propriedade não encontrada' }
      }

      const currentBlockedDates = property.availability?.blockedDates || []
      let updatedDates: string[]

      if (action === 'block') {
        // Adicionar datas bloqueadas
        updatedDates = [...new Set([...currentBlockedDates, ...dates])]
      } else {
        // Remover datas bloqueadas
        updatedDates = currentBlockedDates.filter(date => !dates.includes(date))
      }

      await propertyService.update(propertyId, {
        'availability.blockedDates': updatedDates,
        'availability.lastUpdateReason': reason,
        'availability.lastUpdateDate': new Date()
      })

      return {
        success: true,
        message: `Datas ${action === 'block' ? 'bloqueadas' : 'desbloqueadas'} com sucesso`,
        data: {
          propertyId,
          propertyName: property.title,
          action,
          datesAffected: dates.length,
          reason
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar disponibilidade'
      }
    }
  }

  private async updatePropertyPricing(args: any): Promise<any> {
    const { propertyId, basePrice, cleaningFee, weekendMultiplier, seasonalRates } = args
    
    try {
      const property = await propertyService.getById(propertyId)
      if (!property) {
        return { success: false, error: 'Propriedade não encontrada' }
      }

      const updates: any = {}
      
      if (basePrice !== undefined) {
        updates.basePrice = basePrice
      }
      
      if (cleaningFee !== undefined) {
        updates.cleaningFee = cleaningFee
      }
      
      if (weekendMultiplier !== undefined) {
        updates['pricing.weekendMultiplier'] = weekendMultiplier
      }
      
      if (seasonalRates) {
        updates['pricing.seasonalRates'] = seasonalRates
      }

      await propertyService.update(propertyId, updates)

      return {
        success: true,
        message: 'Preços atualizados com sucesso',
        data: {
          propertyId,
          propertyName: property.title,
          updates: {
            basePrice: basePrice || property.basePrice,
            cleaningFee: cleaningFee || property.cleaningFee,
            weekendMultiplier: weekendMultiplier || property.pricing?.weekendMultiplier,
            seasonalRatesCount: seasonalRates?.length || 0
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar preços'
      }
    }
  }

  private async confirmPaymentReceived(args: any): Promise<any> {
    const { transactionId, paymentDate, paymentMethod, paymentProof } = args
    
    try {
      const { financialMovementService } = await import('@/lib/services/financial-movement-service')
      
      // Tentar encontrar movimento pelo ID fornecido
      const movement = await financialMovementService.getById(transactionId)
      if (!movement) {
        return { success: false, error: 'Movimentação não encontrada' }
      }

      // Marcar como pago
      await financialMovementService.markAsPaid(movement.id, {
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || movement.paymentMethod,
        paymentProof
      })

      // Se for relacionada a uma reserva, atualizar status
      if (movement.reservationId) {
        const reservation = await reservationService.getById(movement.reservationId)
        if (reservation && reservation.status === 'pending_payment') {
          await reservationService.update(movement.reservationId, {
            status: 'confirmed',
            paymentStatus: 'paid'
          })
        }
      }

      return {
        success: true,
        message: 'Pagamento confirmado com sucesso',
        data: {
          movementId: movement.id,
          description: movement.description,
          amount: movement.amount,
          paymentDate: paymentDate || new Date().toISOString(),
          paymentMethod: paymentMethod || movement.paymentMethod,
          status: 'paid'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao confirmar pagamento'
      }
    }
  }

  private async createExpense(args: any): Promise<any> {
    const { description, amount, category, propertyId, dueDate, isRecurring } = args
    
    try {
      // Redirecionar para o novo método unificado
      return await this.createFinancialMovement({
        type: 'expense',
        category: category || 'other',
        description,
        amount,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        propertyId,
        autoCharge: false,
        isRecurring
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar despesa'
      }
    }
  }

  private async processMiniSiteInquiry(args: any): Promise<any> {
    const { propertyId, clientName, clientPhone, checkIn, checkOut, guests, message, source = 'mini-site' } = args
    
    try {
      // Buscar informações da propriedade
      const property = await propertyService.getById(propertyId)
      if (!property) {
        return { success: false, error: 'Propriedade não encontrada' }
      }

      // Registrar ou atualizar cliente automaticamente
      const clientResult = await this.registerClient({
        name: clientName,
        phone: clientPhone,
        preferences: `Interessado em ${property.title} via mini-site`
      })

      if (!clientResult.success) {
        return clientResult
      }

      // Criar ou atualizar lead no CRM
      const leadResult = await this.createOrUpdateLead({
        name: clientName,
        phone: clientPhone,
        source: 'mini_site',
        temperature: 'hot',
        preferences: {
          propertyType: [property.type],
          location: [property.location.city],
          moveInDate: checkIn
        },
        notes: `Interessado em ${property.title} via mini-site. ${message || ''}`,
        tags: ['mini-site', 'hot-lead', property.type]
      })

      // Registrar interação inicial
      if (leadResult.success && leadResult.lead?.id) {
        await this.trackLeadInteraction({
          leadId: leadResult.lead.id,
          type: 'whatsapp_message',
          content: `Cliente entrou em contato via mini-site sobre ${property.title}. Datas: ${checkIn || 'não informada'} a ${checkOut || 'não informada'}. Hóspedes: ${guests || 'não informado'}. ${message || ''}`,
          sentiment: 'positive',
          propertyId
        })
      }

      // Verificar disponibilidade se datas informadas
      let availabilityInfo = ''
      let priceInfo = ''
      
      if (checkIn && checkOut && guests) {
        const availabilityResult = await this.checkAvailability({
          propertyId,
          checkIn,
          checkOut
        })

        if (availabilityResult.success) {
          if (availabilityResult.available) {
            availabilityInfo = `✅ *Ótimas notícias!* A propriedade está disponível nas datas solicitadas.\n\n`
            
            // Calcular preço
            const priceResult = await this.calculateTotalPrice({
              propertyId,
              checkIn,
              checkOut,
              guests
            })

            if (priceResult.success) {
              priceInfo = `💰 *Valor total*: ${priceResult.formattedPrice}\n` +
                         `📊 *Detalhamento*:\n` +
                         `• Diária: R$ ${priceResult.breakdown.basePrice.toFixed(2)}\n` +
                         `• Número de noites: ${priceResult.breakdown.nights}\n` +
                         `• Subtotal: R$ ${priceResult.breakdown.subtotal.toFixed(2)}\n` +
                         (priceResult.breakdown.cleaningFee > 0 ? `• Taxa de limpeza: R$ ${priceResult.breakdown.cleaningFee.toFixed(2)}\n` : '') +
                         (priceResult.breakdown.serviceFee > 0 ? `• Taxa de serviço: R$ ${priceResult.breakdown.serviceFee.toFixed(2)}\n` : '') +
                         `\n`
            }
          } else {
            availabilityInfo = `⚠️ A propriedade não está disponível exatamente nas datas solicitadas.\n\n`
            if (availabilityResult.alternativeDates?.length > 0) {
              availabilityInfo += `📅 *Datas alternativas disponíveis*:\n`
              // Implementar sugestões de datas
            }
          }
        }
      }

      // Criar resposta personalizada
      const response = `🏠 *${property.title}*\n\n` +
        `Olá ${clientName}! 👋\n\n` +
        `Obrigado pelo seu interesse em nossa propriedade através do nosso site!\n\n` +
        `🏡 *Sobre a propriedade*:\n` +
        `📍 ${property.location.address}, ${property.location.city}\n` +
        `🛏️ ${property.bedrooms} quarto${property.bedrooms > 1 ? 's' : ''}\n` +
        `🚿 ${property.bathrooms} banheiro${property.bathrooms > 1 ? 's' : ''}\n` +
        `👥 Até ${property.maxGuests} hóspede${property.maxGuests > 1 ? 's' : ''}\n\n` +
        (checkIn && checkOut && guests ? 
          `🗓️ *Suas datas*: ${format(new Date(checkIn), 'dd/MM/yyyy')} a ${format(new Date(checkOut), 'dd/MM/yyyy')}\n` +
          `👥 *Hóspedes*: ${guests}\n\n` +
          availabilityInfo +
          priceInfo
        : '') +
        `💡 *Próximos passos*:\n` +
        `1. Vou verificar todos os detalhes para você\n` +
        `2. Posso enviar mais fotos e informações\n` +
        `3. Se tudo estiver ok, finalizamos a reserva\n\n` +
        `❓ Tem alguma pergunta específica sobre a propriedade ou gostaria de mais informações?\n\n` +
        `🤖 *Atendimento automatizado 24/7*\n` +
        `Sou seu assistente virtual e estou aqui para ajudar com tudo!`

      return {
        success: true,
        message: response,
        data: {
          propertyId,
          propertyName: property.title,
          clientId: clientResult.client.id,
          leadId: leadResult.lead?.id,
          availability: checkIn && checkOut ? availabilityInfo.includes('✅') : undefined,
          estimatedPrice: priceInfo ? priceInfo : undefined,
          source: 'mini-site'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar solicitação do mini-site'
      }
    }
  }

  private async registerClient(args: any): Promise<any> {
    const { name, email, phone, document, birthDate, address, preferences } = args
    
    try {
      // Verificar se o cliente já existe pelo telefone
      const existingClients = await clientServiceWrapper.searchByPhone(phone)
      if (existingClients.length > 0) {
        const client = existingClients[0]
        
        // Atualizar informações se fornecidas
        const updates: any = {}
        if (email && !client.email) updates.email = email
        if (document && !client.document) updates.document = document
        if (birthDate && !client.birthDate) updates.birthDate = birthDate
        if (address && !client.address) updates.address = address
        if (preferences) updates.preferences = preferences
        
        if (Object.keys(updates).length > 0) {
          await clientServiceWrapper.update(client.id, updates)
        }
        
        return {
          success: true,
          client: {
            id: client.id,
            name: client.name,
            phone: client.phone,
            email: client.email || email,
            isExisting: true
          },
          message: `Cliente ${client.name} já cadastrado. Informações atualizadas.`
        }
      }
      
      // Criar novo cliente
      const newClient = await clientServiceWrapper.create({
        name,
        email: email || '',
        phone,
        document: document || '',
        birthDate: birthDate ? new Date(birthDate) : undefined,
        address: address || '',
        preferences: preferences || '',
        source: 'whatsapp',
        score: 0,
        totalBookings: 0,
        tenantId: this.tenantId
      })
      
      return {
        success: true,
        client: {
          id: newClient.id,
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email,
          isExisting: false
        },
        message: `Cliente ${newClient.name} cadastrado com sucesso!`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao registrar cliente'
      }
    }
  }

  private async createOrUpdateLead(args: any): Promise<any> {
    const { name, phone, email, source = LeadSource.WHATSAPP_AI, temperature = 'warm', preferences, notes, tags = [] } = args
    
    try {
      // Verificar se lead já existe pelo telefone
      const existingLeads = await crmService.searchLeadsByPhone(phone)
      
      if (existingLeads.length > 0) {
        const lead = existingLeads[0]
        
        // Atualizar lead existente
        const updates: any = {}
        if (email && !lead.email) updates.email = email
        if (temperature !== lead.temperature) updates.temperature = temperature
        if (preferences) updates.preferences = { ...lead.preferences, ...preferences }
        if (notes) updates.notes = notes
        if (tags.length > 0) updates.tags = [...new Set([...lead.tags, ...tags])]
        
        if (Object.keys(updates).length > 0) {
          await crmService.updateLead(lead.id, updates)
        }
        
        return {
          success: true,
          lead: {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            status: lead.status,
            temperature: updates.temperature || lead.temperature,
            isExisting: true
          },
          message: `Lead ${lead.name} atualizado com sucesso`
        }
      }
      
      // Criar novo lead
      const newLead = await crmService.createLead({
        tenantId: this.tenantId,
        name,
        phone,
        email: email || undefined,
        whatsappNumber: phone,
        status: LeadStatus.NEW,
        source,
        temperature,
        score: 50, // Score inicial
        qualificationCriteria: {
          budget: false,
          authority: false,
          need: false,
          timeline: false
        },
        preferences: preferences ? {
          propertyType: preferences.propertyType,
          location: preferences.location,
          priceRange: preferences.priceMin && preferences.priceMax 
            ? { min: preferences.priceMin, max: preferences.priceMax }
            : undefined,
          bedrooms: preferences.bedrooms ? { min: preferences.bedrooms, max: preferences.bedrooms + 2 } : undefined,
          moveInDate: preferences.moveInDate ? new Date(preferences.moveInDate) : undefined
        } : {},
        tags,
        notes,
        firstContactDate: new Date(),
        lastContactDate: new Date(),
        totalInteractions: 1
      })
      
      return {
        success: true,
        lead: {
          id: newLead.id,
          name: newLead.name,
          phone: newLead.phone,
          status: newLead.status,
          temperature: newLead.temperature,
          isExisting: false
        },
        message: `Novo lead ${newLead.name} criado com sucesso`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar/atualizar lead'
      }
    }
  }

  private async updateLeadStatus(args: any): Promise<any> {
    const { leadId, status, reason, wonValue } = args
    
    try {
      const lead = await crmService.getLeadById(leadId)
      if (!lead) {
        return { success: false, error: 'Lead não encontrado' }
      }
      
      const updates: any = { status }
      
      if (status === LeadStatus.WON && wonValue) {
        updates.wonValue = wonValue
        updates.wonDate = new Date()
      }
      
      if (status === LeadStatus.LOST && reason) {
        updates.lostReason = reason
        updates.lostDate = new Date()
      }
      
      await crmService.updateLead(leadId, updates)
      
      // Criar atividade
      await crmService.createActivity({
        leadId,
        tenantId: this.tenantId,
        type: 'status_change',
        description: `Status alterado para ${status}${reason ? ` - ${reason}` : ''}`,
        userId: 'ai-agent',
        userName: 'IA Agent'
      })
      
      return {
        success: true,
        message: `Status do lead atualizado para ${status}`,
        data: {
          leadId,
          leadName: lead.name,
          oldStatus: lead.status,
          newStatus: status,
          wonValue
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar status do lead'
      }
    }
  }

  private async trackLeadInteraction(args: any): Promise<any> {
    const { leadId, type, content, sentiment, propertyId } = args
    
    try {
      const lead = await crmService.getLeadById(leadId)
      if (!lead) {
        return { success: false, error: 'Lead não encontrado' }
      }
      
      // Criar interação
      await crmService.createInteraction({
        leadId,
        tenantId: this.tenantId,
        type: type as any,
        direction: 'inbound',
        content,
        sentiment,
        propertyId,
        userId: 'ai-agent',
        userName: 'IA Agent'
      })
      
      // Atualizar contador de interações e data do último contato
      await crmService.updateLead(leadId, {
        totalInteractions: lead.totalInteractions + 1,
        lastContactDate: new Date()
      })
      
      return {
        success: true,
        message: 'Interação registrada com sucesso',
        data: {
          leadId,
          leadName: lead.name,
          interactionType: type,
          sentiment
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao registrar interação'
      }
    }
  }

  private async getLeadInsights(args: any): Promise<any> {
    const { leadId, type = 'individual' } = args
    
    try {
      if (type === 'individual' && leadId) {
        const lead = await crmService.getLeadById(leadId)
        if (!lead) {
          return { success: false, error: 'Lead não encontrado' }
        }
        
        const interactions = await crmService.getLeadInteractions(leadId)
        const activities = await crmService.getLeadActivities(leadId)
        
        // Análise simples de probabilidade de conversão
        let conversionProbability = lead.score
        
        // Ajustar baseado em temperatura
        if (lead.temperature === 'hot') conversionProbability += 15
        else if (lead.temperature === 'cold') conversionProbability -= 15
        
        // Ajustar baseado em interações
        if (lead.totalInteractions > 5) conversionProbability += 10
        
        // Ajustar baseado em qualificação
        const qualificationScore = Object.values(lead.qualificationCriteria).filter(v => v).length
        conversionProbability += qualificationScore * 5
        
        conversionProbability = Math.min(Math.max(conversionProbability, 0), 100)
        
        // Determinar próxima ação recomendada
        const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate))
        let nextAction = 'follow_up'
        
        if (daysSinceLastContact > 7) nextAction = 'follow_up'
        else if (lead.status === 'qualified') nextAction = 'schedule_viewing'
        else if (lead.temperature === 'hot') nextAction = 'send_proposal'
        else if (lead.totalInteractions < 2) nextAction = 'initial_contact'
        
        return {
          success: true,
          insights: {
            leadName: lead.name,
            conversionProbability,
            nextAction,
            daysSinceLastContact,
            totalInteractions: lead.totalInteractions,
            qualificationLevel: qualificationScore,
            temperature: lead.temperature,
            estimatedValue: lead.preferences.priceRange 
              ? (lead.preferences.priceRange.min + lead.preferences.priceRange.max) / 2 * 12 * (conversionProbability / 100)
              : 0
          },
          message: `Análise do lead ${lead.name} concluída`
        }
      }
      
      if (type === 'pipeline') {
        const allLeads = await crmService.getAllLeads(this.tenantId)
        
        const pipeline = {
          new: allLeads.filter(l => l.status === LeadStatus.NEW).length,
          contacted: allLeads.filter(l => l.status === LeadStatus.CONTACTED).length,
          qualified: allLeads.filter(l => l.status === LeadStatus.QUALIFIED).length,
          opportunity: allLeads.filter(l => l.status === LeadStatus.OPPORTUNITY).length,
          negotiation: allLeads.filter(l => l.status === LeadStatus.NEGOTIATION).length,
          won: allLeads.filter(l => l.status === LeadStatus.WON).length,
          lost: allLeads.filter(l => l.status === LeadStatus.LOST).length
        }
        
        const conversionRate = allLeads.length > 0 
          ? (pipeline.won / allLeads.length) * 100 
          : 0
        
        const hotLeads = allLeads.filter(l => l.temperature === 'hot').length
        
        return {
          success: true,
          insights: {
            pipeline,
            totalLeads: allLeads.length,
            conversionRate,
            hotLeads,
            averageScore: allLeads.reduce((sum, l) => sum + l.score, 0) / allLeads.length || 0
          },
          message: 'Análise do pipeline concluída'
        }
      }
      
      return {
        success: false,
        error: 'Tipo de análise não reconhecido'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar insights'
      }
    }
  }

  private async scheduleLeadTask(args: any): Promise<any> {
    const { leadId, title, description, type, priority = TaskPriority.MEDIUM, dueDate } = args
    
    try {
      const lead = await crmService.getLeadById(leadId)
      if (!lead) {
        return { success: false, error: 'Lead não encontrado' }
      }
      
      const task = await crmService.createTask({
        tenantId: this.tenantId,
        title,
        description: description || '',
        type: type as any,
        priority,
        dueDate: new Date(dueDate),
        leadId,
        status: 'pending' as any,
        assignedTo: 'ai-agent',
        assignedBy: 'ai-agent',
        tags: ['ai-generated']
      })
      
      return {
        success: true,
        message: 'Tarefa criada com sucesso',
        data: {
          taskId: task.id,
          leadName: lead.name,
          title,
          type,
          priority,
          dueDate
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar tarefa'
      }
    }
  }
}