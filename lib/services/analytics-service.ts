// lib/services/analytics-service.ts
import { DateRange } from '@/lib/types/financial'
import { Reservation, Transaction, Property, Client } from '@/lib/types'
import { reservationService, transactionFirestoreService, propertyService, clientService } from '@/lib/firebase/firestore'
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear,
  differenceInDays,
  isWithinInterval,
  parseISO,
  isSameMonth,
  isSameYear
} from 'date-fns'

interface AnalyticsData {
  totalRevenue: number
  netRevenue: number
  occupancyRate: number
  adr: number
  revPAR: number
  totalReservations: number
  mrr: number
  arr: number
  cac: number
  ltv: number
  conversionRate: number
  repeatBookingRate: number
}

export async function getAnalytics(
  tenantId: string, 
  options?: { period?: DateRange }
): Promise<AnalyticsData> {
  try {
    // Determine date range
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (options?.period) {
      startDate = options.period.startDate
      endDate = options.period.endDate
    } else {
      // Default to current month
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
    }

    // Fetch all necessary data in parallel
    const [properties, reservations, transactions, clients] = await Promise.all([
      propertyService.getAll(),
      reservationService.getAll(),
      transactionFirestoreService.getAll(),
      clientService.getAll()
    ])

    // Filter data by period
    const periodInterval = { start: startDate, end: endDate }
    
    const periodReservations = reservations.filter(r => {
      const checkIn = typeof r.checkIn === 'string' ? parseISO(r.checkIn) : r.checkIn
      return isWithinInterval(checkIn, periodInterval)
    })

    const periodTransactions = transactions.filter(t => {
      const transactionDate = t.date instanceof Date ? t.date : parseISO(t.date as any)
      return isWithinInterval(transactionDate, periodInterval) && t.type === 'income'
    })

    // Calculate total revenue (sum of all income transactions in period)
    const totalRevenue = periodTransactions.reduce((sum, t) => {
      return sum + (t.status === 'completed' ? t.amount : 0)
    }, 0)

    // Calculate net revenue (assuming 90% of total for now - can be refined with actual expense data)
    const netRevenue = totalRevenue * 0.9

    // Calculate occupancy rate
    const totalPropertyDays = properties.length * differenceInDays(endDate, startDate)
    const occupiedDays = periodReservations.reduce((sum, r) => {
      const checkIn = typeof r.checkIn === 'string' ? parseISO(r.checkIn) : r.checkIn
      const checkOut = typeof r.checkOut === 'string' ? parseISO(r.checkOut) : r.checkOut
      return sum + differenceInDays(checkOut, checkIn)
    }, 0)
    const occupancyRate = totalPropertyDays > 0 ? (occupiedDays / totalPropertyDays) * 100 : 0

    // Calculate ADR (Average Daily Rate)
    const totalNights = periodReservations.reduce((sum, r) => {
      const checkIn = typeof r.checkIn === 'string' ? parseISO(r.checkIn) : r.checkIn
      const checkOut = typeof r.checkOut === 'string' ? parseISO(r.checkOut) : r.checkOut
      return sum + differenceInDays(checkOut, checkIn)
    }, 0)
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0

    // Calculate RevPAR (Revenue Per Available Room)
    const revPAR = totalPropertyDays > 0 ? totalRevenue / totalPropertyDays : 0

    // Total reservations in period
    const totalReservations = periodReservations.length

    // Calculate MRR (Monthly Recurring Revenue) - based on current month
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = t.date instanceof Date ? t.date : parseISO(t.date as any)
      return isSameMonth(transactionDate, now) && t.type === 'income' && t.status === 'completed'
    })
    const mrr = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0)

    // Calculate ARR (Annual Recurring Revenue) - MRR * 12
    const arr = mrr * 12

    // Calculate CAC (Customer Acquisition Cost) - placeholder value
    // In a real implementation, this would be marketing spend / new customers
    const newClientsThisMonth = clients.filter(c => {
      const createdAt = c.createdAt instanceof Date ? c.createdAt : parseISO(c.createdAt as any)
      return isSameMonth(createdAt, now)
    }).length
    const cac = newClientsThisMonth > 0 ? 500 : 0 // Placeholder value

    // Calculate LTV (Lifetime Value)
    // Average revenue per client over their lifetime
    const activeClients = clients.filter(c => c.status === 'active')
    const totalClientsRevenue = activeClients.reduce((sum, client) => {
      const clientTransactions = transactions.filter(t => 
        t.clientId === client.id && t.type === 'income' && t.status === 'completed'
      )
      return sum + clientTransactions.reduce((tSum, t) => tSum + t.amount, 0)
    }, 0)
    const ltv = activeClients.length > 0 ? totalClientsRevenue / activeClients.length : 0

    // Calculate conversion rate (reservations / inquiries)
    // For now, we'll estimate based on active vs total clients
    const conversionRate = clients.length > 0 ? (activeClients.length / clients.length) * 100 : 0

    // Calculate repeat booking rate
    const clientsWithMultipleBookings = clients.filter(client => {
      const clientReservations = reservations.filter(r => r.clientId === client.id)
      return clientReservations.length > 1
    }).length
    const repeatBookingRate = activeClients.length > 0 
      ? (clientsWithMultipleBookings / activeClients.length) * 100 
      : 0

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      adr: Math.round(adr * 100) / 100,
      revPAR: Math.round(revPAR * 100) / 100,
      totalReservations,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      ltv: Math.round(ltv * 100) / 100,
      conversionRate: Math.round(conversionRate * 10) / 10,
      repeatBookingRate: Math.round(repeatBookingRate * 10) / 10
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    
    // Return default values on error
    return {
      totalRevenue: 0,
      netRevenue: 0,
      occupancyRate: 0,
      adr: 0,
      revPAR: 0,
      totalReservations: 0,
      mrr: 0,
      arr: 0,
      cac: 0,
      ltv: 0,
      conversionRate: 0,
      repeatBookingRate: 0
    }
  }
}