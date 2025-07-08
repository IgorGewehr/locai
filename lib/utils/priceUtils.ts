// lib/utils/priceUtils.ts
import { formatDateKey, getDaysBetween, isWeekend, isHoliday } from './dateUtils'

export interface PriceBreakdown {
  basePrice: number
  nights: number
  subtotal: number
  cleaningFee: number
  extraGuestFee: number
  paymentSurcharge: number
  total: number
  pricePerNight: number[]
}

export function calculateTotalPrice(
  basePrice: number,
  nights: number,
  customPricing: Record<string, number> = {},
  dates: Date[] = []
): number {
  if (dates.length === 0) {
    return basePrice * nights
  }

  return dates.reduce((total, date) => {
    const dateKey = formatDateKey(date)
    const dayPrice = customPricing[dateKey] || basePrice
    return total + dayPrice
  }, 0)
}

export function calculatePriceBreakdown(
  basePrice: number,
  dates: Date[],
  customPricing: Record<string, number> = {},
  cleaningFee: number = 0,
  extraGuests: number = 0,
  pricePerExtraGuest: number = 0,
  paymentSurcharge: number = 0
): PriceBreakdown {
  const nights = dates.length
  const pricePerNight = dates.map(date => {
    const dateKey = formatDateKey(date)
    return customPricing[dateKey] || basePrice
  })

  const subtotal = pricePerNight.reduce((sum, price) => sum + price, 0)
  const extraGuestFee = extraGuests * pricePerExtraGuest * nights
  const paymentSurchargeAmount = (subtotal + cleaningFee + extraGuestFee) * (paymentSurcharge / 100)
  const total = subtotal + cleaningFee + extraGuestFee + paymentSurchargeAmount

  return {
    basePrice,
    nights,
    subtotal,
    cleaningFee,
    extraGuestFee,
    paymentSurcharge: paymentSurchargeAmount,
    total,
    pricePerNight,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`
  }
  return formatCurrency(value)
}

export function calculatePercentage(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

export function applyDiscount(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100)
}

export function calculateWeekendSurcharge(
  basePrice: number,
  dates: Date[],
  weekendMultiplier: number = 1.2
): Record<string, number> {
  const customPricing: Record<string, number> = {}
  
  dates.forEach(date => {
    if (isWeekend(date)) {
      const dateKey = formatDateKey(date)
      customPricing[dateKey] = basePrice * weekendMultiplier
    }
  })
  
  return customPricing
}

export function calculateHolidaySurcharge(
  basePrice: number,
  dates: Date[],
  holidayMultiplier: number = 1.5
): Record<string, number> {
  const customPricing: Record<string, number> = {}
  
  dates.forEach(date => {
    if (isHoliday(date)) {
      const dateKey = formatDateKey(date)
      customPricing[dateKey] = basePrice * holidayMultiplier
    }
  })
  
  return customPricing
}

export function calculateSeasonalPricing(
  basePrice: number,
  dates: Date[],
  seasonalRules: Array<{
    startMonth: number
    endMonth: number
    multiplier: number
  }>
): Record<string, number> {
  const customPricing: Record<string, number> = {}
  
  dates.forEach(date => {
    const month = date.getMonth() + 1 // 1-12
    
    for (const rule of seasonalRules) {
      let inSeason = false
      
      if (rule.startMonth <= rule.endMonth) {
        // Same year season
        inSeason = month >= rule.startMonth && month <= rule.endMonth
      } else {
        // Cross-year season (e.g., Dec-Feb)
        inSeason = month >= rule.startMonth || month <= rule.endMonth
      }
      
      if (inSeason) {
        const dateKey = formatDateKey(date)
        customPricing[dateKey] = basePrice * rule.multiplier
        break
      }
    }
  })
  
  return customPricing
}

export function calculateAverageNightlyRate(
  priceBreakdown: PriceBreakdown
): number {
  return priceBreakdown.nights > 0 
    ? priceBreakdown.subtotal / priceBreakdown.nights 
    : 0
}

export function calculateTotalRevenue(
  reservations: Array<{
    checkIn: Date
    checkOut: Date
    totalPrice: number
  }>
): number {
  return reservations.reduce((total, reservation) => total + reservation.totalPrice, 0)
}

export function calculateOccupancyRate(
  reservedNights: number,
  totalAvailableNights: number
): number {
  return totalAvailableNights > 0 
    ? (reservedNights / totalAvailableNights) * 100 
    : 0
}

export function calculateADR(
  totalRevenue: number,
  occupiedNights: number
): number {
  return occupiedNights > 0 ? totalRevenue / occupiedNights : 0
}

export function calculateRevPAR(
  totalRevenue: number,
  totalAvailableNights: number
): number {
  return totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0
}