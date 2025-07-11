import { OpenAI } from 'openai'
import { AIFunction } from '@/lib/types/ai'
import { Property } from '@/lib/types'
import { propertyService } from '@/lib/services/property-service'
import { reservationService } from '@/lib/services/reservation-service'
import { clientService } from '@/lib/services/client-service'
import { transactionService } from '@/lib/services/transaction-service'
import { calculatePricing } from '@/lib/services/pricing'
import { addDays, format, addMonths } from 'date-fns'
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
}