// lib/utils/financialUtils.ts
import { differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Reservation, 
  Payment, 
  PaymentMethod, 
  PaymentStatus 
} from '@/lib/types/reservation'
import { 
  FinancialSummary, 
  PropertyRevenue, 
  PeriodRevenue,
  FinancialMetrics,
  DateRange
} from '@/lib/types/financial'

// Formatação de moeda
export function formatCurrency(
  amount: number, 
  currency = 'BRL', 
  locale = 'pt-BR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatação compacta de moeda
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `R$ ${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `R$ ${(amount / 1000).toFixed(1)}K`
  }
  return formatCurrency(amount)
}

// Cálculo de porcentagem
export function calculatePercentage(
  value: number, 
  total: number,
  precision = 1
): number {
  if (total === 0) return 0
  return Number(((value / total) * 100).toFixed(precision))
}

// Cálculo de crescimento
export function calculateGrowth(
  current: number, 
  previous: number,
  precision = 1
): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(precision))
}

// Cálculo de taxa de ocupação
export function calculateOccupancyRate(
  reservedNights: number,
  totalAvailableNights: number,
  precision = 1
): number {
  if (totalAvailableNights === 0) return 0
  return Number(((reservedNights / totalAvailableNights) * 100).toFixed(precision))
}

// Cálculo de ADR (Average Daily Rate)
export function calculateADR(
  totalRevenue: number,
  occupiedNights: number,
  precision = 2
): number {
  if (occupiedNights === 0) return 0
  return Number((totalRevenue / occupiedNights).toFixed(precision))
}

// Cálculo de RevPAR (Revenue Per Available Room)
export function calculateRevPAR(
  totalRevenue: number,
  totalAvailableNights: number,
  precision = 2
): number {
  if (totalAvailableNights === 0) return 0
  return Number((totalRevenue / totalAvailableNights).toFixed(precision))
}

// Cálculo do valor total da reserva
export function calculateReservationTotal(
  basePrice: number,
  nights: number,
  extraGuestFee = 0,
  extraGuests = 0,
  cleaningFee = 0,
  extraServices: Array<{ price: number; quantity: number }> = [],
  paymentMethodFee = 0
): {
  subtotal: number
  extraGuestTotal: number
  extraServicesTotal: number
  cleaningFee: number
  paymentFee: number
  total: number
} {
  const subtotal = basePrice * nights
  const extraGuestTotal = extraGuestFee * extraGuests * nights
  const extraServicesTotal = extraServices.reduce(
    (sum, service) => sum + (service.price * service.quantity), 
    0
  )
  
  const beforeFees = subtotal + extraGuestTotal + extraServicesTotal + cleaningFee
  const paymentFee = beforeFees * (paymentMethodFee / 100)
  const total = beforeFees + paymentFee

  return {
    subtotal,
    extraGuestTotal,
    extraServicesTotal,
    cleaningFee,
    paymentFee,
    total
  }
}

// Cálculo de juros de atraso
export function calculateLatePaymentFee(
  originalAmount: number,
  daysLate: number,
  dailyFeeRate = 0.03, // 0.03% ao dia
  maxFeePercentage = 20 // Máximo 20% do valor original
): number {
  if (daysLate <= 0) return 0
  
  const dailyFee = originalAmount * (dailyFeeRate / 100)
  const totalFee = dailyFee * daysLate
  const maxFee = originalAmount * (maxFeePercentage / 100)
  
  return Math.min(totalFee, maxFee)
}

// Análise de pagamentos vencidos
export function analyzeOverduePayments(payments: Payment[]): {
  count: number
  totalAmount: number
  avgDaysLate: number
  totalFees: number
} {
  const today = new Date()
  const overduePayments = payments.filter(payment => 
    payment.status === PaymentStatus.OVERDUE || 
    (payment.status === PaymentStatus.PENDING && payment.dueDate < today)
  )

  if (overduePayments.length === 0) {
    return { count: 0, totalAmount: 0, avgDaysLate: 0, totalFees: 0 }
  }

  const totalAmount = overduePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalDaysLate = overduePayments.reduce((sum, payment) => {
    return sum + Math.max(0, differenceInDays(today, payment.dueDate))
  }, 0)
  const avgDaysLate = totalDaysLate / overduePayments.length
  const totalFees = overduePayments.reduce((sum, payment) => {
    const daysLate = Math.max(0, differenceInDays(today, payment.dueDate))
    return sum + calculateLatePaymentFee(payment.amount, daysLate)
  }, 0)

  return {
    count: overduePayments.length,
    totalAmount,
    avgDaysLate: Math.round(avgDaysLate),
    totalFees
  }
}

// Geração de resumo financeiro
export function generateFinancialSummary(
  reservations: Reservation[],
  payments: Payment[],
  period: DateRange
): FinancialSummary {
  // Filtrar reservas do período
  const periodReservations = reservations.filter(reservation => {
    const checkIn = new Date(reservation.checkIn)
    return checkIn >= period.start && checkIn <= period.end
  })

  // Filtrar pagamentos do período
  const periodPayments = payments.filter(payment => {
    const paymentDate = payment.paidDate || payment.dueDate
    return paymentDate >= period.start && paymentDate <= period.end
  })

  // Calcular receitas
  const totalRevenue = periodReservations.reduce((sum, r) => sum + r.totalAmount, 0)
  const receivedAmount = periodPayments
    .filter(p => p.status === PaymentStatus.PAID)
    .reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount = periodPayments
    .filter(p => p.status === PaymentStatus.PENDING)
    .reduce((sum, p) => sum + p.amount, 0)
  const overdueAmount = periodPayments
    .filter(p => p.status === PaymentStatus.OVERDUE)
    .reduce((sum, p) => sum + p.amount, 0)

  // Receita por método de pagamento
  const revenueByMethod = periodPayments
    .filter(p => p.status === PaymentStatus.PAID)
    .reduce((acc, payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + payment.amount
      return acc
    }, {} as Record<PaymentMethod, number>)

  // Receita por propriedade
  const revenueByProperty: PropertyRevenue[] = []
  const propertyMap = new Map<string, {
    revenue: number
    reservations: number
    nights: number
  }>()

  periodReservations.forEach(reservation => {
    const existing = propertyMap.get(reservation.propertyId) || {
      revenue: 0,
      reservations: 0,
      nights: 0
    }
    
    const nights = differenceInDays(
      new Date(reservation.checkOut),
      new Date(reservation.checkIn)
    )

    propertyMap.set(reservation.propertyId, {
      revenue: existing.revenue + reservation.totalAmount,
      reservations: existing.reservations + 1,
      nights: existing.nights + nights
    })
  })

  propertyMap.forEach((data, propertyId) => {
    const property = reservations.find(r => r.propertyId === propertyId)?.property
    revenueByProperty.push({
      propertyId,
      propertyName: property?.title || 'Propriedade sem nome',
      revenue: data.revenue,
      reservations: data.reservations,
      occupancyRate: 0, // Seria necessário dados de disponibilidade total
      adr: calculateADR(data.revenue, data.nights),
      revPAR: 0, // Seria necessário dados de disponibilidade total
      growth: 0 // Seria necessário dados do período anterior
    })
  })

  // Estatísticas
  const totalReservations = periodReservations.length
  const averageTicket = totalReservations > 0 ? totalRevenue / totalReservations : 0
  const totalNights = periodReservations.reduce((sum, r) => {
    return sum + differenceInDays(new Date(r.checkOut), new Date(r.checkIn))
  }, 0)

  return {
    period,
    totalRevenue,
    receivedAmount,
    pendingAmount,
    overdueAmount,
    refundedAmount: 0, // Implementar quando houver sistema de reembolso
    revenueByMethod,
    revenueByProperty,
    revenueByPeriod: [], // Implementar quando necessário
    totalReservations,
    averageTicket,
    occupancyRate: 0, // Implementar com dados de disponibilidade
    revPAR: 0, // Implementar com dados de disponibilidade
    adr: calculateADR(totalRevenue, totalNights),
    previousPeriodComparison: {
      revenueGrowth: 0,
      reservationsGrowth: 0,
      averageTicketGrowth: 0,
      occupancyGrowth: 0
    },
    forecast: undefined
  }
}

// Cálculo de métricas de cliente
export function calculateCustomerMetrics(reservations: Reservation[]): {
  totalClients: number
  newClients: number
  repeatClients: number
  averageBookingValue: number
  averageStayDuration: number
  customerLifetimeValue: number
} {
  const clientMap = new Map<string, {
    reservations: number
    totalSpent: number
    firstBooking: Date
    totalNights: number
  }>()

  reservations.forEach(reservation => {
    const existing = clientMap.get(reservation.clientId) || {
      reservations: 0,
      totalSpent: 0,
      firstBooking: new Date(reservation.createdAt),
      totalNights: 0
    }

    const nights = differenceInDays(
      new Date(reservation.checkOut),
      new Date(reservation.checkIn)
    )

    clientMap.set(reservation.clientId, {
      reservations: existing.reservations + 1,
      totalSpent: existing.totalSpent + reservation.totalAmount,
      firstBooking: existing.firstBooking < new Date(reservation.createdAt) 
        ? existing.firstBooking 
        : new Date(reservation.createdAt),
      totalNights: existing.totalNights + nights
    })
  })

  const totalClients = clientMap.size
  const newClients = Array.from(clientMap.values()).filter(c => c.reservations === 1).length
  const repeatClients = totalClients - newClients
  const totalSpent = Array.from(clientMap.values()).reduce((sum, c) => sum + c.totalSpent, 0)
  const totalNights = Array.from(clientMap.values()).reduce((sum, c) => sum + c.totalNights, 0)

  return {
    totalClients,
    newClients,
    repeatClients,
    averageBookingValue: reservations.length > 0 ? totalSpent / reservations.length : 0,
    averageStayDuration: totalClients > 0 ? totalNights / totalClients : 0,
    customerLifetimeValue: totalClients > 0 ? totalSpent / totalClients : 0
  }
}

// Análise de sazonalidade
export function analyzeSeasonality(
  reservations: Reservation[]
): Array<{
  month: number
  monthName: string
  revenue: number
  reservations: number
  averageRate: number
  occupancyRate: number
}> {
  const monthlyData = new Map<number, {
    revenue: number
    reservations: number
    nights: number
  }>()

  // Inicializar todos os meses
  for (let month = 1; month <= 12; month++) {
    monthlyData.set(month, { revenue: 0, reservations: 0, nights: 0 })
  }

  reservations.forEach(reservation => {
    const checkInDate = new Date(reservation.checkIn)
    const month = checkInDate.getMonth() + 1
    const nights = differenceInDays(
      new Date(reservation.checkOut),
      new Date(reservation.checkIn)
    )

    const existing = monthlyData.get(month)!
    monthlyData.set(month, {
      revenue: existing.revenue + reservation.totalAmount,
      reservations: existing.reservations + 1,
      nights: existing.nights + nights
    })
  })

  return Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    monthName: format(new Date(2024, month - 1, 1), 'MMMM', { locale: ptBR }),
    revenue: data.revenue,
    reservations: data.reservations,
    averageRate: data.nights > 0 ? data.revenue / data.nights : 0,
    occupancyRate: 0 // Seria necessário dados de disponibilidade total por mês
  }))
}

// Previsão simples de receita
export function generateRevenueForecast(
  historicalData: PeriodRevenue[],
  periodsAhead = 3
): {
  periods: Array<{ period: string; predictedRevenue: number; confidence: number }>
  totalForecast: number
  averageGrowth: number
} {
  if (historicalData.length < 3) {
    return {
      periods: [],
      totalForecast: 0,
      averageGrowth: 0
    }
  }

  // Calcular crescimento médio
  let totalGrowth = 0
  let growthPeriods = 0

  for (let i = 1; i < historicalData.length; i++) {
    const current = historicalData[i].revenue
    const previous = historicalData[i - 1].revenue
    
    if (previous > 0) {
      totalGrowth += (current - previous) / previous
      growthPeriods++
    }
  }

  const averageGrowth = growthPeriods > 0 ? totalGrowth / growthPeriods : 0
  const lastRevenue = historicalData[historicalData.length - 1].revenue

  const periods = []
  let totalForecast = 0

  for (let i = 1; i <= periodsAhead; i++) {
    const predictedRevenue = lastRevenue * Math.pow(1 + averageGrowth, i)
    const confidence = Math.max(0.3, 0.9 - (i * 0.15)) // Confiança diminui com distância

    periods.push({
      period: `+${i}`,
      predictedRevenue,
      confidence
    })

    totalForecast += predictedRevenue
  }

  return {
    periods,
    totalForecast,
    averageGrowth
  }
}

// Cálculo de taxa de conversão
export function calculateConversionRate(
  inquiries: number,
  bookings: number,
  precision = 1
): number {
  if (inquiries === 0) return 0
  return Number(((bookings / inquiries) * 100).toFixed(precision))
}

// Análise de performance de preços
export function analyzePricePerformance(
  reservations: Reservation[]
): {
  averagePrice: number
  medianPrice: number
  priceRange: { min: number; max: number }
  priceDistribution: Array<{ range: string; count: number; percentage: number }>
} {
  if (reservations.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      priceRange: { min: 0, max: 0 },
      priceDistribution: []
    }
  }

  const prices = reservations.map(r => {
    const nights = differenceInDays(new Date(r.checkOut), new Date(r.checkIn))
    return nights > 0 ? r.totalAmount / nights : r.totalAmount
  }).sort((a, b) => a - b)

  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const medianPrice = prices[Math.floor(prices.length / 2)]
  const priceRange = { min: prices[0], max: prices[prices.length - 1] }

  // Distribuição de preços em faixas
  const ranges = [
    { min: 0, max: 100, label: 'R$ 0-100' },
    { min: 100, max: 200, label: 'R$ 100-200' },
    { min: 200, max: 300, label: 'R$ 200-300' },
    { min: 300, max: 500, label: 'R$ 300-500' },
    { min: 500, max: Infinity, label: 'R$ 500+' }
  ]

  const priceDistribution = ranges.map(range => {
    const count = prices.filter(price => price >= range.min && price < range.max).length
    return {
      range: range.label,
      count,
      percentage: calculatePercentage(count, prices.length)
    }
  })

  return {
    averagePrice,
    medianPrice,
    priceRange,
    priceDistribution
  }
}