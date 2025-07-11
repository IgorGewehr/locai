import { 
  propertyQueries, 
  reservationService, 
  clientService, 
  conversationService 
} from '@/lib/firebase/firestore';
import { pricingService } from './pricing';
import whatsappService from './whatsapp';
import type { 
  Property, 
  PropertySearchFilters, 
  Reservation, 
  Client, 
  PriceCalculation,
  AgentContext 
} from '@/lib/types';

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class AgentFunctions {
  async searchProperties(filters: PropertySearchFilters): Promise<FunctionResult> {
    try {
      const properties = await propertyQueries.searchProperties(filters);

      if (properties.length === 0) {
        return {
          success: true,
          data: [],
          message: 'Não encontrei propriedades que atendam exatamente aos seus critérios. Que tal flexibilizar algum filtro?',
        };
      }

      // Sort by relevance (price, ratings, etc.)
      const sortedProperties = properties.sort((a, b) => {
        // Prioritize properties with more amenities matching the request
        if (filters.amenities?.length) {
          const aMatchingAmenities = a.amenities.filter(amenity => 
            filters.amenities!.includes(amenity)
          ).length;
          const bMatchingAmenities = b.amenities.filter(amenity => 
            filters.amenities!.includes(amenity)
          ).length;

          if (aMatchingAmenities !== bMatchingAmenities) {
            return bMatchingAmenities - aMatchingAmenities;
          }
        }

        // Then by price (lower first)
        return a.pricing.basePrice - b.pricing.basePrice;
      });

      return {
        success: true,
        data: sortedProperties.slice(0, 10), // Limit to 10 results
        message: `Encontrei ${properties.length} propriedade${properties.length > 1 ? 's' : ''} que atende${properties.length === 1 ? '' : 'm'} aos seus critérios!`,
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao buscar propriedades',
      };
    }
  }

  async getPropertyDetails(propertyId: string): Promise<FunctionResult> {
    try {
      const property = await propertyQueries.getById(propertyId);

      if (!property) {
        return {
          success: false,
          error: 'Propriedade não encontrada',
        };
      }

      return {
        success: true,
        data: property,
        message: `Aqui estão os detalhes da propriedade "${property.name}":`,
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao obter detalhes da propriedade',
      };
    }
  }

  async calculatePrice(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<FunctionResult> {
    try {
      const property = await propertyQueries.getById(propertyId);

      if (!property) {
        return {
          success: false,
          error: 'Propriedade não encontrada',
        };
      }

      if (guests > property.maxGuests) {
        return {
          success: false,
          error: `Esta propriedade acomoda no máximo ${property.maxGuests} hóspedes`,
        };
      }

      const priceCalculation = await pricingService.calculatePrice(
        property,
        new Date(checkIn),
        new Date(checkOut),
        guests
      );

      return {
        success: true,
        data: priceCalculation,
        message: `Calculei o preço para sua estadia de ${priceCalculation.nights} noite${priceCalculation.nights > 1 ? 's' : ''}:`,
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao calcular preço',
      };
    }
  }

  async sendPropertyMedia(
    propertyId: string,
    whatsappNumber: string,
    mediaType: 'photos' | 'videos' | 'all' = 'all'
  ): Promise<FunctionResult> {
    try {
      const property = await propertyQueries.getById(propertyId);

      if (!property) {
        return {
          success: false,
          error: 'Propriedade não encontrada',
        };
      }

      let mediaCount = 0;

      // Send photos
      if (mediaType === 'photos' || mediaType === 'all') {
        const photos = property.photos
          .sort((a, b) => a.order - b.order)
          .slice(0, 5); // Limit to 5 photos

        for (const photo of photos) {
          const result = await whatsappService.sendImageMessage(
            whatsappNumber,
            photo.url,
            photo.isMain ? `📸 ${property.name} - Foto Principal` : undefined
          );

          if (result.success) {
            mediaCount++;
          }
        }
      }

      // Send videos
      if (mediaType === 'videos' || mediaType === 'all') {
        const videos = property.videos
          .sort((a, b) => a.order - b.order)
          .slice(0, 2); // Limit to 2 videos

        for (const video of videos) {
          const result = await whatsappService.sendVideoMessage(
            whatsappNumber,
            video.url,
            `🎥 ${property.name} - ${video.title}`
          );

          if (result.success) {
            mediaCount++;
          }
        }
      }

      return {
        success: true,
        data: { mediaCount },
        message: `Enviei ${mediaCount} arquivo${mediaCount > 1 ? 's' : ''} de mídia da propriedade "${property.name}"`,
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao enviar mídia da propriedade',
      };
    }
  }

  async createReservation(
    clientId: string,
    propertyId: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    notes?: string
  ): Promise<FunctionResult> {
    try {
      const property = await propertyQueries.getById(propertyId);

      if (!property) {
        return {
          success: false,
          error: 'Propriedade não encontrada',
        };
      }

      // Check availability
      const existingReservations = await reservationService.getReservationsByDateRange(
        propertyId,
        new Date(checkIn),
        new Date(checkOut)
      );

      const hasConflict = existingReservations.some(reservation => 
        reservation.status === 'confirmed' || reservation.status === 'pending'
      );

      if (hasConflict) {
        return {
          success: false,
          error: 'Esta propriedade já está reservada para as datas selecionadas',
        };
      }

      // Calculate price
      const priceCalculation = await pricingService.calculatePrice(
        property,
        new Date(checkIn),
        new Date(checkOut),
        guests
      );

      // Create reservation
      const reservationData: Omit<Reservation, 'id'> = {
        propertyId,
        clientId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests,
        totalPrice: priceCalculation.totalPrice,
        status: 'pending',
        paymentStatus: 'pending',
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const reservationId = await reservationService.create(reservationData);

      // Sync reservation dates with property unavailableDates
      await reservationService.syncReservationWithUnavailableDates(reservationId, 'add');

      return {
        success: true,
        data: {
          reservationId,
          totalPrice: priceCalculation.totalPrice,
          property: property.name,
        },
        message: `Reserva criada com sucesso! Código: ${reservationId}`,
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao criar reserva',
      };
    }
  }

  async updateClientPreferences(
    clientId: string,
    preferences: Partial<Client['preferences']>
  ): Promise<FunctionResult> {
    try {
      const client = await clientService.getById(clientId);

      if (!client) {
        return {
          success: false,
          error: 'Cliente não encontrado',
        };
      }

      const updatedPreferences = {
        ...client.preferences,
        ...preferences,
      };

      await clientService.update(clientId, {
        preferences: updatedPreferences,
      });

      return {
        success: true,
        data: updatedPreferences,
        message: 'Preferências atualizadas com sucesso! Isso me ajudará a encontrar propriedades mais adequadas para você.',
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao atualizar preferências',
      };
    }
  }

  async checkAvailability(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<FunctionResult> {
    try {
      const property = await propertyQueries.getById(propertyId);

      if (!property) {
        return {
          success: false,
          error: 'Propriedade não encontrada',
        };
      }

      const existingReservations = await reservationService.getReservationsByDateRange(
        propertyId,
        new Date(checkIn),
        new Date(checkOut)
      );

      const hasConflict = existingReservations.some(reservation => 
        reservation.status === 'confirmed' || reservation.status === 'pending'
      );

      return {
        success: true,
        data: {
          available: !hasConflict,
          conflictingReservations: hasConflict ? existingReservations : [],
        },
        message: hasConflict 
          ? 'Esta propriedade não está disponível para as datas selecionadas'
          : 'Esta propriedade está disponível para as datas selecionadas!',
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao verificar disponibilidade',
      };
    }
  }

  async getRecommendations(
    clientId: string,
    limit: number = 5
  ): Promise<FunctionResult> {
    try {
      const client = await clientService.getById(clientId);

      if (!client) {
        return {
          success: false,
          error: 'Cliente não encontrado',
        };
      }

      // Get recommendations based on client preferences
      const searchFilters: PropertySearchFilters = {
        location: client.preferences.location,
        bedrooms: client.preferences.bedrooms,
        maxGuests: client.preferences.maxGuests,
        amenities: client.preferences.amenities,
        priceRange: client.preferences.priceRange,
      };

      const properties = await propertyQueries.searchProperties(searchFilters);

      // Sort by relevance and limit results
      const recommendations = properties.slice(0, limit);

      return {
        success: true,
        data: recommendations,
        message: `Baseado no seu perfil, encontrei ${recommendations.length} propriedade${recommendations.length > 1 ? 's' : ''} que podem te interessar:`,
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao obter recomendações',
      };
    }
  }

  async updateConversationContext(
    conversationId: string,
    context: Partial<AgentContext>
  ): Promise<FunctionResult> {
    try {
      const conversation = await conversationService.getById(conversationId);

      if (!conversation) {
        return {
          success: false,
          error: 'Conversa não encontrada',
        };
      }

      const updatedContext = {
        ...conversation.context,
        ...context,
      };

      await conversationService.update(conversationId, {
        context: updatedContext,
        lastMessageAt: new Date(),
      });

      return {
        success: true,
        data: updatedContext,
        message: 'Contexto da conversa atualizado',
      };
    } catch (error) {

      return {
        success: false,
        error: 'Erro ao atualizar contexto da conversa',
      };
    }
  }

  formatPropertySummary(property: Property): string {
    return `🏠 *${property.name}*
📍 ${property.location}
🛏️ ${property.bedrooms} quarto${property.bedrooms > 1 ? 's' : ''} | 🚿 ${property.bathrooms} banheiro${property.bathrooms > 1 ? 's' : ''}
👥 Até ${property.maxGuests} hóspedes
💰 A partir de R$ ${property.pricing.basePrice}/noite
⭐ Comodidades: ${property.amenities.slice(0, 3).join(', ')}${property.amenities.length > 3 ? '...' : ''}`;
  }

  formatPriceBreakdown(calculation: PriceCalculation): string {
    return `💰 *Resumo do Preço*
🏠 ${calculation.nights} noite${calculation.nights > 1 ? 's' : ''} × R$ ${calculation.basePrice} = R$ ${calculation.subtotal}
${calculation.weekendSurcharge > 0 ? `🌟 Taxa fim de semana: R$ ${calculation.weekendSurcharge}\n` : ''}${calculation.holidaySurcharge > 0 ? `🎉 Taxa feriado: R$ ${calculation.holidaySurcharge}\n` : ''}${calculation.seasonalAdjustment > 0 ? `📈 Ajuste sazonal: R$ ${calculation.seasonalAdjustment}\n` : ''}🧹 Taxa de limpeza: R$ ${calculation.cleaningFee}
🛡️ Caução: R$ ${calculation.securityDeposit}
━━━━━━━━━━━━━━━━━━━━━━━━
💳 *Total: R$ ${calculation.totalPrice}*`;
  }
}

export const agentFunctions = new AgentFunctions();
export default agentFunctions;