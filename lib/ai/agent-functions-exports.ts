import { AIFunctionExecutor } from './agent-functions';
import { Property } from '@/lib/types';
import { getTenantId } from '@/lib/utils/tenant';

// Create a single instance to use across the application
const functionExecutor = new AIFunctionExecutor(getTenantId());

// Export individual functions for backward compatibility
export const searchProperties = async (args: any) => {
  return functionExecutor.executeFunctionCall('search_properties', args);
};

export const getPropertyDetails = async (propertyId: string) => {
  return functionExecutor.executeFunctionCall('get_property_details', { propertyId });
};

export const calculatePrice = async (propertyId: string, checkIn: string, checkOut: string, guests: number) => {
  return functionExecutor.executeFunctionCall('calculate_total_price', {
    propertyId,
    checkIn,
    checkOut,
    guests
  });
};

export const sendPropertyMedia = async (propertyId: string, whatsappNumber: string, mediaType: 'photos' | 'videos' | 'both') => {
  return functionExecutor.executeFunctionCall('send_property_media', {
    propertyId,
    mediaType
  });
};

export const createReservation = async (
  clientId: string,
  propertyId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  notes?: string
) => {
  return functionExecutor.executeFunctionCall('create_reservation', {
    clientId,
    propertyId,
    checkIn,
    checkOut,
    guests,
    specialRequests: notes,
    paymentMethod: 'credit_card' // default
  });
};

export const updateClientPreferences = async (clientId: string, preferences: any) => {
  // This would update client preferences in the database
  // For now, return a success response
  return {
    success: true,
    message: 'Preferências do cliente atualizadas com sucesso',
    data: preferences
  };
};

export const formatPropertySummary = (property: Property): string => {
  return `🏠 **${property.name}**
📍 ${property.location}
🛏️ ${property.bedrooms} quartos • 🚿 ${property.bathrooms} banheiros
👥 Até ${property.maxGuests} hóspedes
💰 A partir de R$ ${property.pricing.basePrice}/noite

${property.description}

🏷️ Comodidades: ${property.amenities.join(', ')}`;
};

export const formatPriceBreakdown = (priceData: any): string => {
  const breakdown = priceData.breakdown || [];
  let text = `💰 **Detalhamento do Preço**\n\n`;
  
  text += `🏠 Preço base: R$ ${priceData.basePrice}\n`;
  text += `🌙 ${priceData.nights} noites: R$ ${priceData.subtotal}\n`;
  
  if (priceData.taxes > 0) {
    text += `📊 Taxas: R$ ${priceData.taxes}\n`;
  }
  
  if (priceData.fees > 0) {
    text += `🧹 Taxas de limpeza: R$ ${priceData.fees}\n`;
  }
  
  if (priceData.discounts > 0) {
    text += `🎁 Desconto: -R$ ${priceData.discounts}\n`;
  }
  
  text += `\n**Total: R$ ${priceData.total}**`;
  
  return text;
};

// Export the executor for direct use
export { AIFunctionExecutor } from './agent-functions';