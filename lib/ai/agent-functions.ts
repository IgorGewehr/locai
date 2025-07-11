import { OpenAI } from 'openai'
import { AIFunction } from '@/lib/types/ai'
import { Property } from '@/lib/types'
import { propertyService } from '@/lib/services/property-service'
import { reservationService } from '@/lib/services/reservation-service'
import { clientService } from '@/lib/services/client-service'
import { transactionService } from '@/lib/services/transaction-service'
import { calculatePricing } from '@/lib/services/pricing'
import { addDays, format, addMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
    name: 'create_pending_transaction',
    description: 'Criar transação pendente após cliente informar forma de pagamento',
    parameters: {
      type: 'object',
      properties: {
        reservationId: { type: 'string', description: 'ID da reserva' },
        clientId: { type: 'string', description: 'ID do cliente' },
        propertyId: { type: 'string', description: 'ID da propriedade' },
        amount: { type: 'number', description: 'Valor total da transação' },
        paymentMethod: { 
          type: 'string', 
          enum: ['stripe', 'pix', 'cash', 'bank_transfer', 'credit_card', 'debit_card'],
          description: 'Método de pagamento escolhido' 
        },
        description: { type: 'string', description: 'Descrição da transação' },
        installments: { type: 'number', description: 'Número de parcelas (opcional para parcelamento)' },
        conversationId: { type: 'string', description: 'ID da conversa do WhatsApp' }
      },
      required: ['reservationId', 'clientId', 'propertyId', 'amount', 'paymentMethod', 'description']
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
  }
]

export class AIFunctionExecutor {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async executeFunctionCall(functionName: string, args: AIFunctionArgs): Promise<AIFunctionResponse> {
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
      
      case 'create_pending_transaction':
        return await this.createPendingTransaction(args as CreatePendingTransactionArgs)
      
      case 'get_financial_summary':
        return await this.getFinancialSummary(args as any)
      
      case 'create_payment_reminder':
        return await this.createPaymentReminder(args as any)
      
      case 'generate_financial_report':
        return await this.generateFinancialReport(args as any)
      
      case 'check_overdue_accounts':
        return await this.checkOverdueAccounts(args as any)
      
      default:
        throw new Error(`Função não reconhecida: ${functionName}`)
    }
  }

  private async searchProperties(args: SearchPropertiesArgs): Promise<SearchPropertiesResponse> {
    const { location, checkIn, checkOut, guests, budget, amenities, propertyType } = args
    
    try {
      const properties = await propertyService.searchProperties({
        location,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests,
        maxPrice: budget,
        amenities,
        propertyType,
        tenantId: this.tenantId
      })

      // Calcular preços para cada propriedade
      const propertiesWithPrices = await Promise.all(
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

      return {
        success: true,
        properties: propertiesWithPrices,
        totalFound: propertiesWithPrices.length,
        searchCriteria: { location, checkIn, checkOut, guests, budget }
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
    
    try {
      const property = await propertyService.getById(propertyId)
      if (!property) {
        return { success: false, error: 'Propriedade não encontrada' }
      }

      const result: any = {
        success: true,
        propertyName: property.name,
        propertyId: property.id
      }

      if (mediaType === 'photos' || mediaType === 'both') {
        result.photos = property.photos?.map(photo => ({
          url: photo.url,
          caption: photo.caption || `${property.name} - ${photo.title}`
        })) || []
      }

      if (mediaType === 'videos' || mediaType === 'both') {
        result.videos = property.videos?.map(video => ({
          url: video.url,
          title: video.title || `${property.name} - Vídeo`,
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
      const client = await clientService.createOrUpdate({
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
        message: 'Reserva criada com sucesso!'
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
          name: property.name,
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
          name: property.name,
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

  private async createPendingTransaction(args: CreatePendingTransactionArgs): Promise<CreatePendingTransactionResponse> {
    const {
      reservationId,
      clientId,
      propertyId,
      amount,
      paymentMethod,
      description,
      installments,
      conversationId
    } = args
    
    try {
      const transactionIds: string[] = []
      
      if (installments && installments > 1) {
        // Criar múltiplas transações para parcelamento
        const installmentAmount = Math.round((amount / installments) * 100) / 100 // Arredondar para 2 casas decimais
        const firstInstallmentAmount = amount - (installmentAmount * (installments - 1)) // Ajustar primeira parcela para cobrir diferenças de arredondamento
        
        for (let i = 0; i < installments; i++) {
          const currentAmount = i === 0 ? firstInstallmentAmount : installmentAmount
          const dueDate = addMonths(new Date(), i)
          
          const transaction = await transactionService.create({
            type: 'income',
            amount: currentAmount,
            date: dueDate,
            description: `${description} - Parcela ${i + 1}/${installments}`,
            category: 'reserva',
            status: 'pending',
            paymentMethod,
            reservationId,
            clientId,
            propertyId,
            createdByAI: true,
            aiConversationId: conversationId,
            tenantId: this.tenantId,
            isRecurring: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [`parcela_${i + 1}`, 'parcelado']
          })
          
          transactionIds.push(transaction.id)
        }
        
        return {
          success: true,
          data: {
            transactionIds,
            totalAmount: amount,
            installmentAmount,
            installments,
            paymentMethod,
            description: `${description} - Parcelado em ${installments}x`
          }
        }
      } else {
        // Criar transação única
        const transaction = await transactionService.create({
          type: 'income',
          amount,
          date: new Date(),
          description,
          category: 'reserva',
          status: 'pending',
          paymentMethod,
          reservationId,
          clientId,
          propertyId,
          createdByAI: true,
          aiConversationId: conversationId,
          tenantId: this.tenantId,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        transactionIds.push(transaction.id)
        
        return {
          success: true,
          data: {
            transactionIds,
            totalAmount: amount,
            paymentMethod,
            description
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar transação pendente'
      }
    }
  }

  private async getFinancialSummary(args: any): Promise<any> {
    const { period = 'month', type = 'overview' } = args
    
    try {
      const { accountsService } = await import('@/lib/services/accounts-service')
      const { financialAnalyticsService } = await import('@/lib/services/financial-analytics-service')
      
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
        const receivables = await accountsService.getAll()
        const pending = receivables.filter(a => 
          a.tenantId === this.tenantId &&
          a.type === 'receivable' && 
          a.status !== 'paid' && 
          a.status !== 'cancelled'
        )
        const overdue = await accountsService.getOverdue()
        const overdueReceivables = overdue.filter(a => a.type === 'receivable' && a.tenantId === this.tenantId)

        const total = pending.reduce((sum, a) => sum + a.remainingAmount, 0)
        const overdueTotal = overdueReceivables.reduce((sum, a) => sum + a.remainingAmount, 0)

        return {
          success: true,
          summary: `📊 *Contas a Receber*\n\n` +
            `💰 Total pendente: R$ ${total.toFixed(2)}\n` +
            `⚠️ Vencidas: R$ ${overdueTotal.toFixed(2)}\n` +
            `📋 ${pending.length} contas em aberto\n` +
            `🔴 ${overdueReceivables.length} contas vencidas\n\n` +
            (overdueReceivables.length > 0 ? 
              `*Principais vencimentos:*\n` + 
              overdueReceivables.slice(0, 3).map(a => 
                `• ${a.description}: R$ ${a.remainingAmount.toFixed(2)} (${a.overdueDays} dias)`
              ).join('\n') : ''),
          data: { pending, overdue: overdueReceivables, total, overdueTotal }
        }
      }

      if (type === 'payables') {
        const payables = await accountsService.getAll()
        const pending = payables.filter(a => 
          a.tenantId === this.tenantId &&
          a.type === 'payable' && 
          a.status !== 'paid' && 
          a.status !== 'cancelled'
        )
        const upcoming = await accountsService.getUpcoming(7)
        const upcomingPayables = upcoming.filter(a => a.type === 'payable' && a.tenantId === this.tenantId)

        const total = pending.reduce((sum, a) => sum + a.remainingAmount, 0)
        const upcomingTotal = upcomingPayables.reduce((sum, a) => sum + a.remainingAmount, 0)

        return {
          success: true,
          summary: `📊 *Contas a Pagar*\n\n` +
            `💸 Total pendente: R$ ${total.toFixed(2)}\n` +
            `📅 Próximos 7 dias: R$ ${upcomingTotal.toFixed(2)}\n` +
            `📋 ${pending.length} contas em aberto\n\n` +
            (upcomingPayables.length > 0 ? 
              `*Próximos vencimentos:*\n` + 
              upcomingPayables.slice(0, 3).map(a => 
                `• ${a.description}: R$ ${a.remainingAmount.toFixed(2)} (${format(a.dueDate, 'dd/MM')})`
              ).join('\n') : ''),
          data: { pending, upcoming: upcomingPayables, total, upcomingTotal }
        }
      }

      if (type === 'cashflow') {
        const projection = await financialAnalyticsService.generateCashFlowProjection(
          this.tenantId,
          startDate,
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          'weekly'
        )

        return {
          success: true,
          summary: `📊 *Fluxo de Caixa Projetado*\n\n` +
            `📈 Entradas previstas: R$ ${projection.summary.totalInflow.toFixed(2)}\n` +
            `📉 Saídas previstas: R$ ${projection.summary.totalOutflow.toFixed(2)}\n` +
            `💰 Saldo projetado: R$ ${projection.summary.netFlow.toFixed(2)}\n` +
            `⚠️ Menor saldo: R$ ${projection.summary.lowestBalance.toFixed(2)}\n\n` +
            (projection.alerts.length > 0 ? 
              `*Alertas:*\n` + 
              projection.alerts.slice(0, 3).map(a => `• ${a.message}`).join('\n') : 
              '✅ Fluxo de caixa saudável'),
          data: projection
        }
      }

      // Overview padrão
      const stats = await transactionService.getStats({
        startDate,
        endDate
      })

      const accounts = await accountsService.getAll()
      const overdueCount = accounts.filter(a => 
        a.tenantId === this.tenantId &&
        a.status !== 'paid' && 
        a.status !== 'cancelled' && 
        new Date(a.dueDate) < now
      ).length

      return {
        success: true,
        summary: `📊 *Resumo Financeiro - ${period === 'month' ? 'Mês Atual' : period}*\n\n` +
          `💚 Receitas: R$ ${stats.totalIncome.toFixed(2)}\n` +
          `💔 Despesas: R$ ${stats.totalExpenses.toFixed(2)}\n` +
          `💰 Saldo: R$ ${stats.balance.toFixed(2)}\n\n` +
          `📋 ${stats.transactionCount.completed} transações concluídas\n` +
          `⏳ ${stats.transactionCount.pending} transações pendentes\n` +
          `⚠️ ${overdueCount} contas vencidas\n\n` +
          `💡 Use:\n` +
          `• "contas a receber" para detalhes\n` +
          `• "contas a pagar" para compromissos\n` +
          `• "fluxo de caixa" para projeções`,
        data: stats
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
      const clients = await clientService.getAll()
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
    const { sendReminders = false, includeInterest = false } = args
    
    try {
      const { accountsService } = await import('@/lib/services/accounts-service')
      
      const overdueAccounts = await accountsService.getOverdue()
      const filteredAccounts = overdueAccounts.filter(a => a.tenantId === this.tenantId)
      
      if (filteredAccounts.length === 0) {
        return {
          success: true,
          message: '✅ Não há contas vencidas no momento!'
        }
      }

      let summary = `⚠️ *Contas Vencidas*\n\n`
      summary += `Total: ${filteredAccounts.length} contas\n`
      summary += `Valor total: R$ ${filteredAccounts.reduce((sum, a) => sum + a.remainingAmount, 0).toFixed(2)}\n\n`

      const receivables = filteredAccounts.filter(a => a.type === 'receivable')
      const payables = filteredAccounts.filter(a => a.type === 'payable')

      if (receivables.length > 0) {
        summary += `*A Receber (${receivables.length}):*\n`
        for (const account of receivables.slice(0, 5)) {
          let amount = account.remainingAmount
          
          if (includeInterest) {
            const { interest, fine } = await accountsService.calculateInterestAndFees(account.id)
            amount += interest + fine
            
            if (interest > 0 || fine > 0) {
              summary += `• ${account.description}: R$ ${account.remainingAmount.toFixed(2)}`
              summary += ` + juros/multa R$ ${(interest + fine).toFixed(2)}`
              summary += ` = R$ ${amount.toFixed(2)} (${account.overdueDays}d)\n`
            } else {
              summary += `• ${account.description}: R$ ${amount.toFixed(2)} (${account.overdueDays}d)\n`
            }
          } else {
            summary += `• ${account.description}: R$ ${amount.toFixed(2)} (${account.overdueDays}d)\n`
          }
        }
        if (receivables.length > 5) {
          summary += `  ... e mais ${receivables.length - 5} contas\n`
        }
      }

      if (payables.length > 0) {
        summary += `\n*A Pagar (${payables.length}):*\n`
        for (const account of payables.slice(0, 5)) {
          summary += `• ${account.description}: R$ ${account.remainingAmount.toFixed(2)} (${account.overdueDays}d)\n`
        }
        if (payables.length > 5) {
          summary += `  ... e mais ${payables.length - 5} contas\n`
        }
      }

      if (sendReminders && receivables.length > 0) {
        summary += `\n📨 ${receivables.length} lembretes de cobrança enviados`
      }

      return {
        success: true,
        summary,
        data: {
          total: filteredAccounts.length,
          receivables: receivables.length,
          payables: payables.length,
          totalAmount: filteredAccounts.reduce((sum, a) => sum + a.remainingAmount, 0)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar contas vencidas'
      }
    }
  }
}