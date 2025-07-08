import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Reservation, Property, Conversation } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const reservationService = new FirestoreService<Reservation>('reservations');
const propertyService = new FirestoreService<Property>('properties');
const conversationService = new FirestoreService<Conversation>('conversations');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const period = searchParams.get('period') || 'month';
    
    switch (type) {
      case 'overview':
        return await getOverviewAnalytics(period);
      case 'revenue':
        return await getRevenueAnalytics(period);
      case 'properties':
        return await getPropertiesAnalytics();
      case 'conversions':
        return await getConversionsAnalytics();
      case 'charts':
        return await getChartsData(period);
      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics(period: string) {
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

    // Get reservations in period
    const reservations = await reservationService.getMany([
      { field: 'createdAt', operator: '>=', value: startDate },
      { field: 'createdAt', operator: '<=', value: endDate }
    ]);

    // Get all properties for totals
    const properties = await propertyService.getAll();
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
        dailyRevenue: await getDailyRevenueTrend(startDate, endDate),
        monthlyGrowth: await getMonthlyGrowthTrend(),
      }
    });

  } catch (error) {
    console.error('Error in getOverviewAnalytics:', error);
    throw error;
  }
}

async function getRevenueAnalytics(period: string) {
  try {
    const months = parseInt(period.replace('months', '')) || 6;
    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    const reservations = await reservationService.getMany([
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
    console.error('Error in getRevenueAnalytics:', error);
    throw error;
  }
}

async function getPropertiesAnalytics() {
  try {
    const properties = await propertyService.getAll();
    const reservations = await reservationService.getAll();

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
    console.error('Error in getPropertiesAnalytics:', error);
    throw error;
  }
}

async function getConversionsAnalytics() {
  try {
    const conversations = await conversationService.getAll();
    const reservations = await reservationService.getAll();

    const whatsappConversations = conversations.filter(c => c.whatsappPhone);
    const conversionsFromWhatsApp = reservations.filter(r => r.source === 'whatsapp_ai');

    const conversionRate = whatsappConversations.length > 0 
      ? (conversionsFromWhatsApp.length / whatsappConversations.length) * 100 
      : 0;

    const sourceBreakdown = {
      whatsapp_ai: reservations.filter(r => r.source === 'whatsapp_ai').length,
      manual: reservations.filter(r => r.source === 'manual').length,
      website: reservations.filter(r => r.source === 'website').length,
      partner: reservations.filter(r => r.source === 'partner').length,
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
      partner: reservations
        .filter(r => r.source === 'partner')
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
        averageResponseTime: 2.5, // This would come from message timestamps
        customerSatisfaction: 4.6, // This would come from ratings
        whatsappEffectiveness: Math.round(conversionRate),
      }
    });

  } catch (error) {
    console.error('Error in getConversionsAnalytics:', error);
    throw error;
  }
}

async function getChartsData(period: string) {
  try {
    const months = 6;
    const data = await getRevenueAnalytics(`${months}months`);
    
    // Payment methods data (mock - would come from payment service)
    const paymentMethods = [
      { name: 'PIX', value: 45, color: '#00875A' },
      { name: 'Cartão Crédito', value: 30, color: '#1976D2' },
      { name: 'Cartão Débito', value: 15, color: '#42A5F5' },
      { name: 'Transferência', value: 10, color: '#90CAF9' },
    ];

    const sourceData = [
      { source: 'WhatsApp AI', bookings: 145, revenue: 87500 },
      { source: 'Website', bookings: 52, revenue: 31200 },
      { source: 'Manual', bookings: 23, revenue: 13800 },
      { source: 'Parceiros', bookings: 18, revenue: 10800 },
    ];

    return NextResponse.json({
      revenue: data,
      paymentMethods,
      sources: sourceData,
    });

  } catch (error) {
    console.error('Error in getChartsData:', error);
    throw error;
  }
}

async function getDailyRevenueTrend(startDate: Date, endDate: Date) {
  // Implementation for daily revenue trend
  return [];
}

async function getMonthlyGrowthTrend() {
  // Implementation for monthly growth trend
  return [];
}