import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Reservation, Property, Conversation, Payment } from '@/lib/types';
import { PaymentMethod, PaymentStatus } from '@/lib/types/reservation';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { authMiddleware } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/utils/rate-limiter';
import { handleApiError } from '@/lib/utils/api-errors';
import { ValidationError } from '@/lib/utils/errors';

const reservationService = new FirestoreService<Reservation>('reservations');
const propertyService = new FirestoreService<Property>('properties');
const conversationService = new FirestoreService<Conversation>('conversations');
const paymentService = new FirestoreService<Payment>('payments');

// Validation schemas
const analyticsQuerySchema = z.object({
  type: z.enum(['overview', 'revenue', 'properties', 'conversions', 'charts']).default('overview'),
  period: z.string().regex(/^(week|month|quarter|year|\d+months)$/).default('month')
});

const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.PIX]: 'PIX',
  [PaymentMethod.CREDIT_CARD]: 'Cartão Crédito',
  [PaymentMethod.DEBIT_CARD]: 'Cartão Débito',
  [PaymentMethod.CASH]: 'Dinheiro',
  [PaymentMethod.BANK_TRANSFER]: 'Transferência',
  [PaymentMethod.BANK_SLIP]: 'Boleto'
};

const PAYMENT_METHOD_COLORS = {
  [PaymentMethod.PIX]: '#00875A',
  [PaymentMethod.CREDIT_CARD]: '#1976D2',
  [PaymentMethod.DEBIT_CARD]: '#42A5F5',
  [PaymentMethod.CASH]: '#FF9800',
  [PaymentMethod.BANK_TRANSFER]: '#90CAF9',
  [PaymentMethod.BANK_SLIP]: '#9C27B0'
};

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    await rateLimiters.api.checkLimit({
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      headers: request.headers
    });

    // Check authentication
    const authContext = await authMiddleware(request);

    if (!authContext.authenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!authContext.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type'),
      period: searchParams.get('period')
    };

    const validatedParams = analyticsQuerySchema.parse(queryParams);

    // Add tenant context to all queries
    const tenantId = authContext.tenantId;

    switch (validatedParams.type) {
      case 'overview':
        return await getOverviewAnalytics(validatedParams.period, tenantId);
      case 'revenue':
        return await getRevenueAnalytics(validatedParams.period, tenantId);
      case 'properties':
        return await getPropertiesAnalytics(tenantId);
      case 'conversions':
        return await getConversionsAnalytics(tenantId);
      case 'charts':
        return await getChartsData(validatedParams.period, tenantId);
      default:
        throw new ValidationError('Invalid analytics type');
    }

  } catch (error) {
    return handleApiError(error);
  }
}

async function getOverviewAnalytics(period: string, tenantId: string) {
  try {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Get reservations in period for this tenant
    const reservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'createdAt', operator: '>=', value: startDate },
      { field: 'createdAt', operator: '<=', value: endDate }
    ]);

    // Get all properties for this tenant
    const properties = await propertyService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);
    const activeProperties = properties.filter(p => p.status === 'active');

    // Calculate metrics
    const totalRevenue = reservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const totalReservations = reservations.filter(r => r.status !== 'cancelled').length;
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;

    // Calculate average ticket
    const averageTicket = totalReservations > 0 ? totalRevenue / totalReservations : 0;

    // Calculate occupancy rate (simplified)
    const totalCapacity = activeProperties.reduce((sum, p) => sum + p.capacity, 0);
    const totalGuestNights = reservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + (r.guests * r.nights), 0);
    const occupancyRate = totalCapacity > 0 ? totalGuestNights / (totalCapacity * 30) : 0;

    // Growth calculations (compare with previous period)
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    const periodDiff = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(startDate.getTime() - periodDiff);
    previousEndDate.setTime(endDate.getTime() - periodDiff);

    const previousReservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'createdAt', operator: '>=', value: previousStartDate },
      { field: 'createdAt', operator: '<=', value: previousEndDate }
    ]);

    const previousRevenue = previousReservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    const reservationGrowth = previousReservations.length > 0
      ? ((totalReservations - previousReservations.length) / previousReservations.length) * 100
      : 0;

    return NextResponse.json({
      period,
      startDate,
      endDate,
      metrics: {
        totalRevenue,
        totalReservations,
        pendingReservations,
        confirmedReservations,
        averageTicket,
        occupancyRate: Math.min(occupancyRate, 1), // Cap at 100%
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
      },
      growth: {
        revenue: revenueGrowth,
        reservations: reservationGrowth,
      },
      trends: {
        dailyRevenue: await getDailyRevenueTrend(startDate, endDate, tenantId),
        monthlyGrowth: await getMonthlyGrowthTrend(tenantId),
      }
    });

  } catch (error) {

    throw error;
  }
}

async function getRevenueAnalytics(period: string, tenantId: string) {
  try {
    const months = parseInt(period.replace('months', '')) || 6;
    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    const reservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'createdAt', operator: '>=', value: startDate },
      { field: 'createdAt', operator: '<=', value: endDate }
    ]);

    const monthlyData = [];
    for (let i = 0; i < months; i++) {
      const monthStart = subMonths(endDate, months - i - 1);
      const monthEnd = endOfMonth(monthStart);

      const monthReservations = reservations.filter(r => {
        const createdAt = new Date(r.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      const revenue = monthReservations
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + r.totalAmount, 0);

      monthlyData.push({
        month: format(monthStart, 'MMM', { locale: ptBR }),
        revenue,
        reservations: monthReservations.filter(r => r.status !== 'cancelled').length,
        averageTicket: monthReservations.length > 0 ? revenue / monthReservations.length : 0,
      });
    }

    return NextResponse.json({
      period: `${months} months`,
      data: monthlyData,
      total: {
        revenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
        reservations: monthlyData.reduce((sum, m) => sum + m.reservations, 0),
      }
    });

  } catch (error) {

    throw error;
  }
}

async function getPropertiesAnalytics(tenantId: string) {
  try {
    const properties = await propertyService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);
    const reservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);

    const propertyPerformance = properties.map(property => {
      const propertyReservations = reservations.filter(r => 
        r.propertyId === property.id && r.status !== 'cancelled'
      );

      const revenue = propertyReservations.reduce((sum, r) => sum + r.totalAmount, 0);
      const totalNights = propertyReservations.reduce((sum, r) => sum + r.nights, 0);

      // Calculate occupancy (simplified - assuming 30 days per month)
      const occupancy = Math.min((totalNights / 30) * 100, 100);

      return {
        id: property.id,
        name: property.name,
        type: property.type,
        location: `${property.address.neighborhood}, ${property.address.city}`,
        revenue,
        reservations: propertyReservations.length,
        occupancy: Math.round(occupancy),
        averageNightly: property.basePrice,
        status: property.status,
      };
    });

    // Sort by revenue
    propertyPerformance.sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      properties: propertyPerformance,
      summary: {
        totalProperties: properties.length,
        activeProperties: properties.filter(p => p.status === 'active').length,
        averageOccupancy: Math.round(
          propertyPerformance.reduce((sum, p) => sum + p.occupancy, 0) / propertyPerformance.length
        ),
        topPerformer: propertyPerformance[0] || null,
      }
    });

  } catch (error) {

    throw error;
  }
}

async function getConversionsAnalytics(tenantId: string) {
  try {
    const conversations = await conversationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);
    const reservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId }
    ]);

    const whatsappConversations = conversations.filter(c => c.whatsappPhone);
    const conversionsFromWhatsApp = reservations.filter(r => r.source === 'whatsapp_ai');

    const conversionRate = whatsappConversations.length > 0 
      ? (conversionsFromWhatsApp.length / whatsappConversations.length) * 100 
      : 0;

    const sourceBreakdown = {
      whatsapp_ai: reservations.filter(r => r.source === 'whatsapp_ai').length,
      manual: reservations.filter(r => r.source === 'manual').length,
      website: reservations.filter(r => r.source === 'website').length,
      phone: reservations.filter(r => r.source === 'phone').length,
      email: reservations.filter(r => r.source === 'email').length,
    };

    const revenueBySource = {
      whatsapp_ai: reservations
        .filter(r => r.source === 'whatsapp_ai')
        .reduce((sum, r) => sum + r.totalAmount, 0),
      manual: reservations
        .filter(r => r.source === 'manual')
        .reduce((sum, r) => sum + r.totalAmount, 0),
      website: reservations
        .filter(r => r.source === 'website')
        .reduce((sum, r) => sum + r.totalAmount, 0),
      phone: reservations
        .filter(r => r.source === 'phone')
        .reduce((sum, r) => sum + r.totalAmount, 0),
      email: reservations
        .filter(r => r.source === 'email')
        .reduce((sum, r) => sum + r.totalAmount, 0),
    };

    return NextResponse.json({
      conversions: {
        totalConversations: conversations.length,
        whatsappConversations: whatsappConversations.length,
        totalReservations: reservations.length,
        conversionsFromWhatsApp: conversionsFromWhatsApp.length,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      sources: {
        breakdown: sourceBreakdown,
        revenue: revenueBySource,
      },
      performance: {
        averageResponseTime: await calculateAverageResponseTime(conversations),
        customerSatisfaction: await calculateCustomerSatisfaction(tenantId),
        whatsappEffectiveness: Math.round(conversionRate),
      }
    });

  } catch (error) {

    throw error;
  }
}

async function getChartsData(period: string, tenantId: string) {
  try {
    const months = 6;
    const data = await getRevenueAnalytics(`${months}months`, tenantId);

    // Get real payment data
    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    const payments = await paymentService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'paidDate', operator: '>=', value: startDate },
      { field: 'paidDate', operator: '<=', value: endDate },
      { field: 'status', operator: '==', value: PaymentStatus.PAID }
    ]);

    // Calculate payment methods distribution
    const paymentMethodCounts = payments.reduce((acc, payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + 1;
      return acc;
    }, {} as Record<PaymentMethod, number>);

    const totalPayments = payments.length;
    const paymentMethods = Object.entries(paymentMethodCounts).map(([method, count]) => ({
      name: PAYMENT_METHOD_LABELS[method as PaymentMethod],
      value: Math.round((count / totalPayments) * 100),
      color: PAYMENT_METHOD_COLORS[method as PaymentMethod]
    }));

    // Get real source data from reservations
    const reservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'createdAt', operator: '>=', value: startDate },
      { field: 'createdAt', operator: '<=', value: endDate },
      { field: 'status', operator: '!=', value: 'cancelled' }
    ]);

    const sourceData = [
      { 
        source: 'WhatsApp AI', 
        bookings: reservations.filter(r => r.source === 'whatsapp_ai').length,
        revenue: reservations.filter(r => r.source === 'whatsapp_ai').reduce((sum, r) => sum + r.totalAmount, 0)
      },
      { 
        source: 'Website', 
        bookings: reservations.filter(r => r.source === 'website').length,
        revenue: reservations.filter(r => r.source === 'website').reduce((sum, r) => sum + r.totalAmount, 0)
      },
      { 
        source: 'Manual', 
        bookings: reservations.filter(r => r.source === 'manual').length,
        revenue: reservations.filter(r => r.source === 'manual').reduce((sum, r) => sum + r.totalAmount, 0)
      },
      { 
        source: 'Telefone', 
        bookings: reservations.filter(r => r.source === 'phone').length,
        revenue: reservations.filter(r => r.source === 'phone').reduce((sum, r) => sum + r.totalAmount, 0)
      },
      { 
        source: 'E-mail', 
        bookings: reservations.filter(r => r.source === 'email').length,
        revenue: reservations.filter(r => r.source === 'email').reduce((sum, r) => sum + r.totalAmount, 0)
      },
    ].filter(s => s.bookings > 0); // Only include sources with actual bookings

    return NextResponse.json({
      revenue: data,
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : getDefaultPaymentMethods(),
      sources: sourceData,
    });

  } catch (error) {

    throw error;
  }
}

async function getDailyRevenueTrend(startDate: Date, endDate: Date, tenantId: string) {
  try {
    const reservations = await reservationService.getMany([
      { field: 'tenantId', operator: '==', value: tenantId },
      { field: 'createdAt', operator: '>=', value: startDate },
      { field: 'createdAt', operator: '<=', value: endDate },
      { field: 'status', operator: '!=', value: 'cancelled' }
    ]);

    const dailyRevenue: Record<string, number> = {};

    reservations.forEach(reservation => {
      const dateKey = format(new Date(reservation.createdAt), 'yyyy-MM-dd');
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + reservation.totalAmount;
    });

    return Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date,
      revenue
    })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {

    return [];
  }
}

async function getMonthlyGrowthTrend(tenantId: string) {
  try {
    const months = 12;
    const endDate = new Date();
    const monthlyGrowth = [];

    for (let i = 1; i < months; i++) {
      const currentMonthStart = startOfMonth(subMonths(endDate, i));
      const currentMonthEnd = endOfMonth(currentMonthStart);
      const previousMonthStart = startOfMonth(subMonths(endDate, i + 1));
      const previousMonthEnd = endOfMonth(previousMonthStart);

      const [currentReservations, previousReservations] = await Promise.all([
        reservationService.getMany([
          { field: 'tenantId', operator: '==', value: tenantId },
          { field: 'createdAt', operator: '>=', value: currentMonthStart },
          { field: 'createdAt', operator: '<=', value: currentMonthEnd },
          { field: 'status', operator: '!=', value: 'cancelled' }
        ]),
        reservationService.getMany([
          { field: 'tenantId', operator: '==', value: tenantId },
          { field: 'createdAt', operator: '>=', value: previousMonthStart },
          { field: 'createdAt', operator: '<=', value: previousMonthEnd },
          { field: 'status', operator: '!=', value: 'cancelled' }
        ])
      ]);

      const currentRevenue = currentReservations.reduce((sum, r) => sum + r.totalAmount, 0);
      const previousRevenue = previousReservations.reduce((sum, r) => sum + r.totalAmount, 0);

      const growth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      monthlyGrowth.push({
        month: format(currentMonthStart, 'MMM yyyy', { locale: ptBR }),
        growth: Math.round(growth * 100) / 100
      });
    }

    return monthlyGrowth.reverse();
  } catch (error) {

    return [];
  }
}

// Helper functions
async function calculateAverageResponseTime(conversations: Conversation[]): Promise<number> {
  try {
    const whatsappConversations = conversations.filter(c => c.whatsappPhone && c.messages?.length > 1);

    if (whatsappConversations.length === 0) return 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    whatsappConversations.forEach(conversation => {
      const messages = conversation.messages || [];
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].sender === 'agent' && messages[i-1].sender === 'user') {
          const responseTime = new Date(messages[i].timestamp).getTime() - new Date(messages[i-1].timestamp).getTime();
          if (responseTime > 0 && responseTime < 3600000) { // Less than 1 hour
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      }
    });

    if (responseCount === 0) return 0;

    // Return average in minutes
    return Math.round((totalResponseTime / responseCount) / 60000);
  } catch (error) {

    return 0;
  }
}

async function calculateCustomerSatisfaction(tenantId: string): Promise<number> {
  // This would integrate with a rating/feedback system
  // For now, return a default value
  return 4.5;
}

function getDefaultPaymentMethods() {
  return [
    { name: 'PIX', value: 0, color: '#00875A' },
    { name: 'Cartão Crédito', value: 0, color: '#1976D2' },
    { name: 'Cartão Débito', value: 0, color: '#42A5F5' },
    { name: 'Transferência', value: 0, color: '#90CAF9' },
  ];
}