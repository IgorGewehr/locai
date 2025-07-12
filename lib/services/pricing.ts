import { 
  differenceInDays, 
  eachDayOfInterval, 
  isWeekend, 
  format, 
  isSameDay,
  addDays,
  startOfDay,
  endOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Property, PriceCalculation } from '@/lib/types';

export interface HolidayRule {
  name: string;
  startDate: Date;
  endDate: Date;
  multiplier: number;
  priority: number; // Higher priority overrides lower priority
}

export interface SeasonalRule {
  name: string;
  startDate: Date;
  endDate: Date;
  pricePerNight: number;
  description: string;
  priority: number;
}

export class PricingService {
  private brazilianHolidays: HolidayRule[] = [
    // Fixed holidays
    { name: 'Ano Novo', startDate: new Date(2024, 0, 1), endDate: new Date(2024, 0, 1), multiplier: 1.5, priority: 1 },
    { name: 'Tiradentes', startDate: new Date(2024, 3, 21), endDate: new Date(2024, 3, 21), multiplier: 1.2, priority: 1 },
    { name: 'Dia do Trabalho', startDate: new Date(2024, 4, 1), endDate: new Date(2024, 4, 1), multiplier: 1.2, priority: 1 },
    { name: 'Independência', startDate: new Date(2024, 8, 7), endDate: new Date(2024, 8, 7), multiplier: 1.3, priority: 1 },
    { name: 'Nossa Senhora Aparecida', startDate: new Date(2024, 9, 12), endDate: new Date(2024, 9, 12), multiplier: 1.2, priority: 1 },
    { name: 'Finados', startDate: new Date(2024, 10, 2), endDate: new Date(2024, 10, 2), multiplier: 1.1, priority: 1 },
    { name: 'Proclamação da República', startDate: new Date(2024, 10, 15), endDate: new Date(2024, 10, 15), multiplier: 1.2, priority: 1 },
    { name: 'Natal', startDate: new Date(2024, 11, 25), endDate: new Date(2024, 11, 25), multiplier: 1.8, priority: 1 },

    // Holiday periods
    { name: 'Reveillon', startDate: new Date(2024, 11, 26), endDate: new Date(2025, 0, 6), multiplier: 2.0, priority: 2 },
    { name: 'Carnaval', startDate: new Date(2024, 1, 10), endDate: new Date(2024, 1, 17), multiplier: 1.8, priority: 2 },
    { name: 'Festa Junina', startDate: new Date(2024, 5, 20), endDate: new Date(2024, 6, 5), multiplier: 1.3, priority: 1 },
    { name: 'Férias de Julho', startDate: new Date(2024, 6, 1), endDate: new Date(2024, 6, 31), multiplier: 1.4, priority: 1 },
    { name: 'Férias de Janeiro', startDate: new Date(2024, 0, 1), endDate: new Date(2024, 0, 31), multiplier: 1.5, priority: 1 },
  ];

  async calculatePrice(
    property: Property,
    checkIn: Date,
    checkOut: Date,
    guests: number
  ): Promise<PriceCalculation> {
    const startDate = startOfDay(checkIn);
    const endDate = startOfDay(checkOut);
    const nights = differenceInDays(endDate, startDate);

    if (nights <= 0) {
      throw new Error('Data de check-out deve ser após a data de check-in');
    }

    if (nights < property.minimumNights) {
      throw new Error(`Estadia mínima de ${property.minimumNights} noite${property.minimumNights > 1 ? 's' : ''}`);
    }

    if (guests > property.maxGuests) {
      throw new Error(`Número máximo de hóspedes: ${property.maxGuests}`);
    }

    const daysOfStay = eachDayOfInterval({ start: startDate, end: addDays(endDate, -1) });
    const breakdown: PriceCalculation['breakdown'] = [];

    let subtotal = 0;
    let weekendSurcharge = 0;
    let holidaySurcharge = 0;
    let seasonalAdjustment = 0;

    for (const day of daysOfStay) {
      const dayPrice = this.getDayPrice(property, day);
      breakdown.push({
        date: day,
        pricePerNight: dayPrice.finalPrice,
        isWeekend: dayPrice.isWeekend,
        isHoliday: dayPrice.isHoliday,
        seasonalRate: dayPrice.seasonalRate,
      });

      subtotal += dayPrice.finalPrice;

      if (dayPrice.isWeekend && !dayPrice.isHoliday) {
        weekendSurcharge += dayPrice.finalPrice - property.basePrice;
      }

      if (dayPrice.isHoliday) {
        holidaySurcharge += dayPrice.finalPrice - property.basePrice;
      }

      if (dayPrice.seasonalRate && dayPrice.seasonalRate !== property.basePrice) {
        seasonalAdjustment += dayPrice.seasonalRate - property.basePrice;
      }
    }

    const extraGuestFee = guests > property.capacity ? 
      (guests - property.capacity) * property.pricePerExtraGuest * nights : 0;

    const totalPrice = subtotal + extraGuestFee + property.cleaningFee;

    return {
      basePrice: property.basePrice,
      nights,
      subtotal,
      weekendSurcharge,
      holidaySurcharge,
      seasonalAdjustment,
      cleaningFee: property.cleaningFee,
      securityDeposit: 0, // Removed security deposit from Property model
      totalPrice,
      breakdown,
    };
  }

  private getDayPrice(property: Property, date: Date): {
    finalPrice: number;
    isWeekend: boolean;
    isHoliday: boolean;
    seasonalRate?: number;
  } {
    // First check for custom pricing
    const dateKey = format(date, 'yyyy-MM-dd');
    if (property.customPricing && property.customPricing[dateKey]) {
      return {
        finalPrice: property.customPricing[dateKey],
        isWeekend: isWeekend(date),
        isHoliday: this.isHoliday(date),
        seasonalRate: property.customPricing[dateKey],
      };
    }

    let basePrice = property.basePrice;
    let isWeekendDay = isWeekend(date);
    let isHolidayDay = this.isHoliday(date);
    let isDecember = date.getMonth() === 11;
    let isHighSeason = property.highSeasonMonths?.includes(date.getMonth() + 1) || false;

    // Apply surcharges (non-cumulative - apply the highest one)
    let surchargePercentage = 0;

    if (isHolidayDay && property.holidaySurcharge) {
      surchargePercentage = Math.max(surchargePercentage, property.holidaySurcharge);
    }

    if (isWeekendDay && property.weekendSurcharge) {
      surchargePercentage = Math.max(surchargePercentage, property.weekendSurcharge);
    }

    if (isDecember && property.decemberSurcharge) {
      surchargePercentage = Math.max(surchargePercentage, property.decemberSurcharge);
    }

    if (isHighSeason && property.highSeasonSurcharge) {
      surchargePercentage = Math.max(surchargePercentage, property.highSeasonSurcharge);
    }

    const finalPrice = Math.round(basePrice * (1 + surchargePercentage / 100));

    return {
      finalPrice,
      isWeekend: isWeekendDay,
      isHoliday: isHolidayDay,
      seasonalRate: finalPrice !== basePrice ? finalPrice : undefined,
    };
  }

  private getSeasonalPrice(property: Property, date: Date): number | null {
    // Seasonal prices are now handled through customPricing
    return null;
  }

  private getHolidayRule(date: Date): HolidayRule | null {
    const applicableHolidays = this.brazilianHolidays
      .filter(holiday => {
        const startDate = startOfDay(holiday.startDate);
        const endDate = endOfDay(holiday.endDate);
        return date >= startDate && date <= endDate;
      })
      .sort((a, b) => b.priority - a.priority); // Highest priority first

    return applicableHolidays.length > 0 ? applicableHolidays[0] : null;
  }

  private isHoliday(date: Date): boolean {
    const monthDay = format(date, 'MM-dd');
    const brazilianHolidayDates = [
      '01-01', // Ano Novo
      '04-21', // Tiradentes
      '05-01', // Dia do Trabalho
      '09-07', // Independência
      '10-12', // Nossa Senhora Aparecida
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25', // Natal
    ];
    return brazilianHolidayDates.includes(monthDay);
  }

  async getOccupancyRate(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // This would typically fetch reservation data from the database
      // TODO: Implement actual occupancy calculation from Firebase
      const totalDays = differenceInDays(endDate, startDate);
      const occupiedDays = Math.floor(totalDays * 0.7); // Default 70% occupancy

      return occupiedDays / totalDays;
    } catch (error) {

      return 0;
    }
  }

  async getRevenueProjection(
    property: Property,
    startDate: Date,
    endDate: Date,
    expectedOccupancyRate: number = 0.7
  ): Promise<{
    totalRevenue: number;
    averageNightlyRate: number;
    occupiedNights: number;
    totalNights: number;
  }> {
    try {
      const daysOfPeriod = eachDayOfInterval({ start: startDate, end: endDate });
      const totalNights = daysOfPeriod.length;
      const occupiedNights = Math.floor(totalNights * expectedOccupancyRate);

      let totalRevenue = 0;
      let totalNightlyRate = 0;

      for (const day of daysOfPeriod) {
        const dayPrice = this.getDayPrice(property, day);
        totalNightlyRate += dayPrice.finalPrice;
      }

      const averageNightlyRate = totalNightlyRate / totalNights;
      totalRevenue = averageNightlyRate * occupiedNights;

      return {
        totalRevenue,
        averageNightlyRate,
        occupiedNights,
        totalNights,
      };
    } catch (error) {

      return {
        totalRevenue: 0,
        averageNightlyRate: 0,
        occupiedNights: 0,
        totalNights: 0,
      };
    }
  }

  formatPriceBreakdown(calculation: PriceCalculation): string {
    let breakdown = `📊 *Detalhamento do Preço*\n\n`;

    breakdown += `🏠 ${calculation.nights} noite${calculation.nights > 1 ? 's' : ''} × R$ ${calculation.basePrice} = R$ ${calculation.subtotal}\n`;

    if (calculation.weekendSurcharge > 0) {
      breakdown += `🌟 Adicional fim de semana: R$ ${calculation.weekendSurcharge}\n`;
    }

    if (calculation.holidaySurcharge > 0) {
      breakdown += `🎉 Adicional feriado: R$ ${calculation.holidaySurcharge}\n`;
    }

    if (calculation.seasonalAdjustment > 0) {
      breakdown += `📈 Ajuste sazonal: R$ ${calculation.seasonalAdjustment}\n`;
    }

    breakdown += `🧹 Taxa de limpeza: R$ ${calculation.cleaningFee}\n`;
    breakdown += `🛡️ Caução (devolvida): R$ ${calculation.securityDeposit}\n`;
    breakdown += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    breakdown += `💳 **Total: R$ ${calculation.totalPrice}**`;

    return breakdown;
  }

  formatDateRange(startDate: Date, endDate: Date): string {
    return `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
  }

  validatePricing(property: Property): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (property.basePrice <= 0) {
      errors.push('Preço base deve ser maior que zero');
    }

    if (property.cleaningFee < 0) {
      errors.push('Taxa de limpeza não pode ser negativa');
    }

    if (property.weekendSurcharge && property.weekendSurcharge < 0) {
      errors.push('Acréscimo de fim de semana não pode ser negativo');
    }

    if (property.holidaySurcharge && property.holidaySurcharge < 0) {
      errors.push('Acréscimo de feriado não pode ser negativo');
    }

    if (property.decemberSurcharge && property.decemberSurcharge < 0) {
      errors.push('Acréscimo de dezembro não pode ser negativo');
    }

    if (property.highSeasonSurcharge && property.highSeasonSurcharge < 0) {
      errors.push('Acréscimo de alta temporada não pode ser negativo');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async suggestPricing(
    location: string,
    bedrooms: number,
    amenities: string[]
  ): Promise<{
    suggestedBasePrice: number;
    suggestedWeekendMultiplier: number;
    suggestedCleaningFee: number;
    suggestedSecurityDeposit: number;
    reasoning: string;
  }> {
    // This would typically use market data and ML models
    // For now, we'll use simple heuristics

    let basePrice = 100; // Base starting price

    // Adjust for location
    const locationMultipliers: Record<string, number> = {
      'Rio de Janeiro': 1.8,
      'São Paulo': 1.6,
      'Florianópolis': 1.4,
      'Salvador': 1.3,
      'Recife': 1.2,
      'Fortaleza': 1.1,
    };

    const locationMultiplier = locationMultipliers[location] || 1.0;
    basePrice *= locationMultiplier;

    // Adjust for bedrooms
    basePrice += (bedrooms - 1) * 50;

    // Adjust for premium amenities
    const premiumAmenities = ['piscina', 'academia', 'sauna', 'churrasqueira', 'ar-condicionado'];
    const premiumAmenityCount = amenities.filter(amenity => 
      premiumAmenities.some(premium => amenity.toLowerCase().includes(premium.toLowerCase()))
    ).length;

    basePrice += premiumAmenityCount * 30;

    const suggestedWeekendMultiplier = 1.2;
    const suggestedCleaningFee = Math.round(basePrice * 0.3);
    const suggestedSecurityDeposit = Math.round(basePrice * 2);

    const reasoning = `
Preço sugerido baseado em:
- Localização: ${location} (multiplicador ${locationMultiplier}x)
- ${bedrooms} quarto${bedrooms > 1 ? 's' : ''}
- ${premiumAmenityCount} comodidade${premiumAmenityCount > 1 ? 's' : ''} premium
- Padrões de mercado para a região
    `.trim();

    return {
      suggestedBasePrice: Math.round(basePrice),
      suggestedWeekendMultiplier,
      suggestedCleaningFee,
      suggestedSecurityDeposit,
      reasoning,
    };
  }
}

export const pricingService = new PricingService();

// Helper function for AI agent
export async function calculatePricing(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  guests: number
): Promise<PriceCalculation & { serviceFee: number }> {
  // Get property from service
  const { propertyService } = await import('@/lib/services/property-service');
  const property = await propertyService.getById(propertyId);
  
  if (!property) {
    throw new Error('Propriedade não encontrada');
  }
  
  // Calculate pricing using the service
  const priceCalculation = await pricingService.calculatePrice(
    property,
    checkIn,
    checkOut,
    guests
  );
  
  // Add service fee (10% of total)
  const serviceFee = Math.round(priceCalculation.totalPrice * 0.1);
  const totalPrice = priceCalculation.totalPrice + serviceFee;
  
  return {
    ...priceCalculation,
    serviceFee,
    totalPrice
  };
}

export default pricingService;