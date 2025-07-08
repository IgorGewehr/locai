// lib/utils/reportUtils.ts
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  FinancialReport, 
  ReportType, 
  DateRange,
  FinancialSummary 
} from '@/lib/types/financial'
import { Reservation, Payment } from '@/lib/types/reservation'

// Geração de relatórios
export function generateReport(
  type: ReportType,
  period: DateRange,
  reservations: Reservation[],
  payments: Payment[],
  options: {
    includeProjections?: boolean
    includeComparisons?: boolean
    groupBy?: 'day' | 'week' | 'month' | 'quarter'
    format?: 'pdf' | 'excel' | 'csv'
  } = {}
): Partial<FinancialReport> {
  const {
    includeProjections = false,
    includeComparisons = true,
    groupBy = 'month',
    format = 'pdf'
  } = options

  switch (type) {
    case ReportType.REVENUE:
      return generateRevenueReport(period, reservations, payments, { groupBy, includeProjections })
    
    case ReportType.OCCUPANCY:
      return generateOccupancyReport(period, reservations, { groupBy })
    
    case ReportType.FINANCIAL_SUMMARY:
      return generateFinancialSummaryReport(period, reservations, payments, { includeComparisons })
    
    case ReportType.CASH_FLOW:
      return generateCashFlowReport(period, payments, { groupBy })
    
    case ReportType.TAX_REPORT:
      return generateTaxReport(period, reservations, payments)
    
    case ReportType.PERFORMANCE:
      return generatePerformanceReport(period, reservations, payments, { includeComparisons })
    
    default:
      throw new Error(`Tipo de relatório não suportado: ${type}`)
  }
}

// Relatório de receita
function generateRevenueReport(
  period: DateRange,
  reservations: Reservation[],
  payments: Payment[],
  options: { groupBy: string; includeProjections: boolean }
): Partial<FinancialReport> {
  const periodReservations = filterReservationsByPeriod(reservations, period)
  const periodPayments = filterPaymentsByPeriod(payments, period)

  const revenueData = groupRevenueByPeriod(periodReservations, options.groupBy)
  const paymentData = groupPaymentsByPeriod(periodPayments, options.groupBy)

  return {
    type: ReportType.REVENUE,
    period,
    data: {
      revenueByPeriod: revenueData,
      paymentsByPeriod: paymentData,
      totalRevenue: periodReservations.reduce((sum, r) => sum + r.totalAmount, 0),
      totalReceived: periodPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      projections: options.includeProjections ? generateProjections(revenueData) : undefined
    }
  }
}

// Relatório de ocupação
function generateOccupancyReport(
  period: DateRange,
  reservations: Reservation[],
  options: { groupBy: string }
): Partial<FinancialReport> {
  const periodReservations = filterReservationsByPeriod(reservations, period)
  const occupancyData = calculateOccupancyByPeriod(periodReservations, period, options.groupBy)

  return {
    type: ReportType.OCCUPANCY,
    period,
    data: {
      occupancyByPeriod: occupancyData,
      totalReservations: periodReservations.length,
      averageStayDuration: calculateAverageStayDuration(periodReservations),
      topPerformingProperties: getTopPerformingProperties(periodReservations)
    }
  }
}

// Relatório de resumo financeiro
function generateFinancialSummaryReport(
  period: DateRange,
  reservations: Reservation[],
  payments: Payment[],
  options: { includeComparisons: boolean }
): Partial<FinancialReport> {
  const summary = generateBasicFinancialSummary(period, reservations, payments)
  
  let previousPeriodSummary
  if (options.includeComparisons) {
    const previousPeriod = getPreviousPeriod(period)
    const previousReservations = filterReservationsByPeriod(reservations, previousPeriod)
    const previousPayments = filterPaymentsByPeriod(payments, previousPeriod)
    previousPeriodSummary = generateBasicFinancialSummary(previousPeriod, previousReservations, previousPayments)
  }

  return {
    type: ReportType.FINANCIAL_SUMMARY,
    period,
    data: {
      summary,
      previousPeriodSummary,
      growth: previousPeriodSummary ? calculateGrowthMetrics(summary, previousPeriodSummary) : undefined
    }
  }
}

// Relatório de fluxo de caixa
function generateCashFlowReport(
  period: DateRange,
  payments: Payment[],
  options: { groupBy: string }
): Partial<FinancialReport> {
  const periodPayments = filterPaymentsByPeriod(payments, period)
  const cashFlowData = generateCashFlowData(periodPayments, options.groupBy)

  return {
    type: ReportType.CASH_FLOW,
    period,
    data: {
      cashFlowByPeriod: cashFlowData,
      totalInflow: periodPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      totalOutflow: 0, // Implementar quando houver despesas
      netCashFlow: periodPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)
    }
  }
}

// Relatório fiscal
function generateTaxReport(
  period: DateRange,
  reservations: Reservation[],
  payments: Payment[]
): Partial<FinancialReport> {
  const periodReservations = filterReservationsByPeriod(reservations, period)
  const periodPayments = filterPaymentsByPeriod(payments, period)

  const grossRevenue = periodReservations.reduce((sum, r) => sum + r.totalAmount, 0)
  const netRevenue = periodPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.netAmount, 0)
  
  // Cálculos básicos de impostos (ajustar conforme legislação)
  const issRate = 0.05 // 5% ISS (exemplo)
  const irRate = 0.275 // 27.5% IR (exemplo para pessoa física)
  
  const issAmount = netRevenue * issRate
  const irAmount = netRevenue * irRate

  return {
    type: ReportType.TAX_REPORT,
    period,
    data: {
      grossRevenue,
      netRevenue,
      taxes: {
        iss: { rate: issRate, amount: issAmount },
        ir: { rate: irRate, amount: irAmount }
      },
      totalTaxes: issAmount + irAmount,
      netProfit: netRevenue - (issAmount + irAmount)
    }
  }
}

// Relatório de performance
function generatePerformanceReport(
  period: DateRange,
  reservations: Reservation[],
  payments: Payment[],
  options: { includeComparisons: boolean }
): Partial<FinancialReport> {
  const periodReservations = filterReservationsByPeriod(reservations, period)
  const metrics = calculatePerformanceMetrics(periodReservations, payments)

  let previousMetrics
  if (options.includeComparisons) {
    const previousPeriod = getPreviousPeriod(period)
    const previousReservations = filterReservationsByPeriod(reservations, previousPeriod)
    const previousPayments = filterPaymentsByPeriod(payments, previousPeriod)
    previousMetrics = calculatePerformanceMetrics(previousReservations, previousPayments)
  }

  return {
    type: ReportType.PERFORMANCE,
    period,
    data: {
      metrics,
      previousMetrics,
      improvement: previousMetrics ? calculateMetricsImprovement(metrics, previousMetrics) : undefined,
      recommendations: generatePerformanceRecommendations(metrics)
    }
  }
}

// Funções auxiliares

function filterReservationsByPeriod(reservations: Reservation[], period: DateRange): Reservation[] {
  return reservations.filter(reservation => {
    const checkIn = new Date(reservation.checkIn)
    return checkIn >= period.start && checkIn <= period.end
  })
}

function filterPaymentsByPeriod(payments: Payment[], period: DateRange): Payment[] {
  return payments.filter(payment => {
    const paymentDate = payment.paidDate || payment.dueDate
    return paymentDate >= period.start && paymentDate <= period.end
  })
}

function groupRevenueByPeriod(reservations: Reservation[], groupBy: string) {
  const groups = new Map<string, number>()

  reservations.forEach(reservation => {
    const key = getGroupKey(new Date(reservation.checkIn), groupBy)
    groups.set(key, (groups.get(key) || 0) + reservation.totalAmount)
  })

  return Array.from(groups.entries()).map(([period, revenue]) => ({
    period,
    revenue,
    date: parseGroupKey(period, groupBy)
  }))
}

function groupPaymentsByPeriod(payments: Payment[], groupBy: string) {
  const groups = new Map<string, { paid: number; pending: number; overdue: number }>()

  payments.forEach(payment => {
    const key = getGroupKey(payment.paidDate || payment.dueDate, groupBy)
    const existing = groups.get(key) || { paid: 0, pending: 0, overdue: 0 }

    switch (payment.status) {
      case 'paid':
        existing.paid += payment.amount
        break
      case 'pending':
        existing.pending += payment.amount
        break
      case 'overdue':
        existing.overdue += payment.amount
        break
    }

    groups.set(key, existing)
  })

  return Array.from(groups.entries()).map(([period, amounts]) => ({
    period,
    ...amounts,
    date: parseGroupKey(period, groupBy)
  }))
}

function calculateOccupancyByPeriod(
  reservations: Reservation[], 
  period: DateRange, 
  groupBy: string
) {
  // Implementação simplificada - seria necessário dados de disponibilidade total
  const groups = new Map<string, { reservations: number; nights: number }>()

  reservations.forEach(reservation => {
    const key = getGroupKey(new Date(reservation.checkIn), groupBy)
    const existing = groups.get(key) || { reservations: 0, nights: 0 }
    
    const nights = Math.ceil(
      (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 
      (1000 * 60 * 60 * 24)
    )

    groups.set(key, {
      reservations: existing.reservations + 1,
      nights: existing.nights + nights
    })
  })

  return Array.from(groups.entries()).map(([period, data]) => ({
    period,
    reservations: data.reservations,
    nights: data.nights,
    occupancyRate: 0, // Seria necessário calcular com base na disponibilidade total
    date: parseGroupKey(period, groupBy)
  }))
}

function getGroupKey(date: Date, groupBy: string): string {
  switch (groupBy) {
    case 'day':
      return format(date, 'yyyy-MM-dd')
    case 'week':
      return format(startOfWeek(date), 'yyyy-MM-dd')
    case 'month':
      return format(date, 'yyyy-MM')
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `${date.getFullYear()}-Q${quarter}`
    default:
      return format(date, 'yyyy-MM')
  }
}

function parseGroupKey(key: string, groupBy: string): Date {
  switch (groupBy) {
    case 'day':
    case 'week':
      return new Date(key)
    case 'month':
      return new Date(`${key}-01`)
    case 'quarter':
      const [year, quarter] = key.split('-Q')
      const month = (parseInt(quarter) - 1) * 3
      return new Date(parseInt(year), month, 1)
    default:
      return new Date(key)
  }
}

function getPreviousPeriod(period: DateRange): DateRange {
  const duration = period.end.getTime() - period.start.getTime()
  return {
    start: new Date(period.start.getTime() - duration),
    end: new Date(period.end.getTime() - duration)
  }
}

function generateBasicFinancialSummary(
  period: DateRange,
  reservations: Reservation[],
  payments: Payment[]
) {
  return {
    totalRevenue: reservations.reduce((sum, r) => sum + r.totalAmount, 0),
    totalReceived: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    totalReservations: reservations.length,
    averageTicket: reservations.length > 0 ? 
      reservations.reduce((sum, r) => sum + r.totalAmount, 0) / reservations.length : 0
  }
}

function calculateGrowthMetrics(current: any, previous: any) {
  return {
    revenueGrowth: calculateGrowthRate(current.totalRevenue, previous.totalRevenue),
    reservationsGrowth: calculateGrowthRate(current.totalReservations, previous.totalReservations),
    averageTicketGrowth: calculateGrowthRate(current.averageTicket, previous.averageTicket)
  }
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function calculateAverageStayDuration(reservations: Reservation[]): number {
  if (reservations.length === 0) return 0
  
  const totalNights = reservations.reduce((sum, reservation) => {
    return sum + Math.ceil(
      (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
  }, 0)

  return totalNights / reservations.length
}

function getTopPerformingProperties(reservations: Reservation[]) {
  const propertyPerformance = new Map<string, { revenue: number; reservations: number }>()

  reservations.forEach(reservation => {
    const existing = propertyPerformance.get(reservation.propertyId) || { revenue: 0, reservations: 0 }
    propertyPerformance.set(reservation.propertyId, {
      revenue: existing.revenue + reservation.totalAmount,
      reservations: existing.reservations + 1
    })
  })

  return Array.from(propertyPerformance.entries())
    .map(([propertyId, data]) => ({
      propertyId,
      revenue: data.revenue,
      reservations: data.reservations,
      averageTicket: data.revenue / data.reservations
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

function generateCashFlowData(payments: Payment[], groupBy: string) {
  const groups = new Map<string, { inflow: number; outflow: number }>()

  payments.forEach(payment => {
    if (payment.status === 'paid' && payment.paidDate) {
      const key = getGroupKey(payment.paidDate, groupBy)
      const existing = groups.get(key) || { inflow: 0, outflow: 0 }
      groups.set(key, {
        inflow: existing.inflow + payment.amount,
        outflow: existing.outflow // Implementar quando houver despesas
      })
    }
  })

  return Array.from(groups.entries()).map(([period, data]) => ({
    period,
    inflow: data.inflow,
    outflow: data.outflow,
    netFlow: data.inflow - data.outflow,
    date: parseGroupKey(period, groupBy)
  }))
}

function calculatePerformanceMetrics(reservations: Reservation[], payments: Payment[]) {
  const totalRevenue = reservations.reduce((sum, r) => sum + r.totalAmount, 0)
  const totalNights = reservations.reduce((sum, r) => {
    return sum + Math.ceil(
      (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
  }, 0)

  return {
    totalRevenue,
    totalReservations: reservations.length,
    averageTicket: reservations.length > 0 ? totalRevenue / reservations.length : 0,
    averageStayDuration: reservations.length > 0 ? totalNights / reservations.length : 0,
    adr: totalNights > 0 ? totalRevenue / totalNights : 0,
    conversionRate: 0, // Seria necessário dados de consultas
    cancellationRate: 0 // Seria necessário dados de cancelamentos
  }
}

function calculateMetricsImprovement(current: any, previous: any) {
  return Object.keys(current).reduce((acc, key) => {
    if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
      acc[key] = calculateGrowthRate(current[key], previous[key])
    }
    return acc
  }, {} as Record<string, number>)
}

function generatePerformanceRecommendations(metrics: any) {
  const recommendations = []

  if (metrics.averageTicket < 300) {
    recommendations.push({
      title: 'Aumentar Ticket Médio',
      description: 'Considere adicionar serviços extras ou ajustar preços',
      priority: 'high'
    })
  }

  if (metrics.averageStayDuration < 2) {
    recommendations.push({
      title: 'Incentivar Estadias Mais Longas',
      description: 'Ofereça descontos para estadias de 3+ noites',
      priority: 'medium'
    })
  }

  return recommendations
}

function generateProjections(revenueData: any[]) {
  // Implementação simples de projeção baseada em tendência
  if (revenueData.length < 3) return []

  const lastThree = revenueData.slice(-3)
  const avgGrowth = lastThree.reduce((sum, item, index) => {
    if (index === 0) return 0
    const growth = (item.revenue - lastThree[index - 1].revenue) / lastThree[index - 1].revenue
    return sum + growth
  }, 0) / (lastThree.length - 1)

  const lastRevenue = revenueData[revenueData.length - 1].revenue
  
  return [
    { period: 'Próximo mês', revenue: lastRevenue * (1 + avgGrowth), confidence: 0.7 },
    { period: 'Em 2 meses', revenue: lastRevenue * Math.pow(1 + avgGrowth, 2), confidence: 0.5 },
    { period: 'Em 3 meses', revenue: lastRevenue * Math.pow(1 + avgGrowth, 3), confidence: 0.3 }
  ]
}

// Exportação para diferentes formatos
export function exportReportToCSV(reportData: any): string {
  // Implementação simplificada
  const headers = Object.keys(reportData).join(',')
  const values = Object.values(reportData).join(',')
  return `${headers}\n${values}`
}

export function exportReportToPDF(reportData: any): Blob {
  // Implementação seria feita com uma biblioteca como jsPDF
  throw new Error('Exportação PDF não implementada')
}

export function exportReportToExcel(reportData: any): Blob {
  // Implementação seria feita com uma biblioteca como SheetJS
  throw new Error('Exportação Excel não implementada')
}