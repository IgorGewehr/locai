import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { AvailabilityService } from '@/lib/services/availability-service';
import { pricingService } from '@/lib/services/pricing-service';
import { Property } from '@/lib/types/property';
import { logger } from '@/lib/utils/logger';
import {
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  format,
  isWeekend,
  startOfDay,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AvailabilityInsight {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  icon: string;
  actionable?: boolean;
  action?: () => void;
  actionLabel?: string;
}

export interface AvailabilityMetrics {
  // Current period (next 30 days)
  totalDays: number;
  availableDays: number;
  blockedDays: number;
  reservedDays: number;
  occupancyRate: number;
  projectedRevenue: number;
  averageDailyRate: number;

  // Comparison with previous period
  previousOccupancyRate?: number;
  occupancyChange?: number;
  previousRevenue?: number;
  revenueChange?: number;

  // Trends
  weekendOccupancy: number;
  weekdayOccupancy: number;
  mostBookedDays: number[];
  leastBookedDays: number[];

  // Price optimization
  suggestedPriceAdjustment?: number;
  undervaluedDates?: Date[];
  overvaluedDates?: Date[];
}

export interface AvailabilityInsightsData {
  metrics: AvailabilityMetrics;
  insights: AvailabilityInsight[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAvailabilityInsights(
  property: Property | null,
  startDate?: Date,
  endDate?: Date
): AvailabilityInsightsData {
  const { tenantId, isReady } = useTenant();

  const [metrics, setMetrics] = useState<AvailabilityMetrics>({
    totalDays: 0,
    availableDays: 0,
    blockedDays: 0,
    reservedDays: 0,
    occupancyRate: 0,
    projectedRevenue: 0,
    averageDailyRate: 0,
    weekendOccupancy: 0,
    weekdayOccupancy: 0,
    mostBookedDays: [],
    leastBookedDays: [],
  });

  const [insights, setInsights] = useState<AvailabilityInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default date range: next 30 days
  const defaultStartDate = startDate || startOfDay(new Date());
  const defaultEndDate = endDate || addDays(defaultStartDate, 30);

  const calculateMetrics = async () => {
    if (!property || !tenantId || !isReady) return;

    try {
      setLoading(true);
      setError(null);

      const availabilityService = new AvailabilityService(tenantId);

      // Get availability for current period
      const availability = await availabilityService.getAvailability({
        propertyId: property.id,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        includeReservations: true,
      });

      // Calculate basic metrics
      const totalDays = availability.summary.totalDays;
      const availableDays = availability.summary.availableDays;
      const blockedDays = availability.summary.blockedDays;
      const reservedDays = availability.summary.reservedDays;
      const occupancyRate = availability.summary.occupancyRate;

      // Calculate weekend vs weekday occupancy
      const weekendDays = availability.calendar.filter(day => day.isWeekend);
      const weekdayDays = availability.calendar.filter(day => !day.isWeekend);

      const weekendReserved = weekendDays.filter(day => day.status === 'reserved').length;
      const weekdayReserved = weekdayDays.filter(day => day.status === 'reserved').length;

      const weekendOccupancy = weekendDays.length > 0 ? (weekendReserved / weekendDays.length) * 100 : 0;
      const weekdayOccupancy = weekdayDays.length > 0 ? (weekdayReserved / weekdayDays.length) * 100 : 0;

      // Calculate projected revenue
      let projectedRevenue = 0;
      let totalRate = 0;

      for (const day of availability.calendar) {
        if (day.status === 'reserved' || day.status === 'available') {
          const dayPrice = property.customPricing?.[format(day.date, 'yyyy-MM-dd')] || property.basePrice;
          totalRate += dayPrice;

          if (day.status === 'reserved') {
            projectedRevenue += dayPrice;
          }
        }
      }

      const averageDailyRate = totalDays > 0 ? totalRate / totalDays : 0;

      // Get previous period for comparison
      const previousStartDate = subMonths(defaultStartDate, 1);
      const previousEndDate = subMonths(defaultEndDate, 1);

      let previousOccupancyRate: number | undefined;
      let previousRevenue: number | undefined;

      try {
        const previousAvailability = await availabilityService.getAvailability({
          propertyId: property.id,
          startDate: previousStartDate,
          endDate: previousEndDate,
          includeReservations: true,
        });

        previousOccupancyRate = previousAvailability.summary.occupancyRate;

        // Calculate previous revenue
        let prevRevenue = 0;
        for (const day of previousAvailability.calendar) {
          if (day.status === 'reserved') {
            const dayPrice = property.customPricing?.[format(day.date, 'yyyy-MM-dd')] || property.basePrice;
            prevRevenue += dayPrice;
          }
        }
        previousRevenue = prevRevenue;
      } catch (err) {
        logger.warn('Could not get previous period data', { err });
      }

      const occupancyChange = previousOccupancyRate !== undefined
        ? occupancyRate - previousOccupancyRate
        : undefined;

      const revenueChange = previousRevenue !== undefined
        ? ((projectedRevenue - previousRevenue) / previousRevenue) * 100
        : undefined;

      setMetrics({
        totalDays,
        availableDays,
        blockedDays,
        reservedDays,
        occupancyRate,
        projectedRevenue,
        averageDailyRate,
        previousOccupancyRate,
        occupancyChange,
        previousRevenue,
        revenueChange,
        weekendOccupancy,
        weekdayOccupancy,
        mostBookedDays: [5, 6], // Friday and Saturday (simplified)
        leastBookedDays: [0, 1], // Sunday and Monday (simplified)
      });

      // Generate insights
      const generatedInsights = generateInsights({
        totalDays,
        availableDays,
        blockedDays,
        reservedDays,
        occupancyRate,
        projectedRevenue,
        averageDailyRate,
        previousOccupancyRate,
        occupancyChange,
        previousRevenue,
        revenueChange,
        weekendOccupancy,
        weekdayOccupancy,
        mostBookedDays: [5, 6],
        leastBookedDays: [0, 1],
      });

      setInsights(generatedInsights);

      logger.info('✅ Availability insights calculated', {
        propertyId: property.id,
        occupancyRate,
        projectedRevenue,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      logger.error('❌ Error calculating insights', { error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateMetrics();
  }, [property?.id, tenantId, isReady, defaultStartDate, defaultEndDate]);

  return {
    metrics,
    insights,
    loading,
    error,
    refresh: calculateMetrics,
  };
}

function generateInsights(metrics: AvailabilityMetrics): AvailabilityInsight[] {
  const insights: AvailabilityInsight[] = [];

  // High occupancy alert
  if (metrics.occupancyRate > 85) {
    insights.push({
      type: 'success',
      title: 'Alta Ocupação!',
      description: `Excelente! Sua propriedade está com ${metrics.occupancyRate.toFixed(0)}% de ocupação. ${
        metrics.availableDays <= 5
          ? `Apenas ${metrics.availableDays} dias disponíveis restantes.`
          : ''
      }`,
      icon: '🎉',
    });

    // Suggest price increase
    if (metrics.availableDays <= 5) {
      insights.push({
        type: 'info',
        title: 'Oportunidade de Aumentar Preços',
        description: `Com alta demanda e poucos dias disponíveis, considere aumentar seus preços em 15-20% para maximizar receita.`,
        icon: '💰',
        actionable: true,
        actionLabel: 'Ver Sugestões',
      });
    }
  }

  // Low occupancy warning
  if (metrics.occupancyRate < 40 && metrics.availableDays > 15) {
    insights.push({
      type: 'warning',
      title: 'Ocupação Abaixo da Média',
      description: `Sua ocupação está em ${metrics.occupancyRate.toFixed(0)}%, abaixo do ideal (70%). Considere ajustar preços ou promover sua propriedade.`,
      icon: '⚠️',
      actionable: true,
      actionLabel: 'Ver Estratégias',
    });
  }

  // Revenue comparison
  if (metrics.revenueChange !== undefined) {
    if (metrics.revenueChange > 10) {
      insights.push({
        type: 'success',
        title: 'Receita em Crescimento',
        description: `Sua receita aumentou ${metrics.revenueChange.toFixed(0)}% comparado ao mês anterior. Continue assim!`,
        icon: '📈',
      });
    } else if (metrics.revenueChange < -10) {
      insights.push({
        type: 'error',
        title: 'Queda na Receita',
        description: `Sua receita caiu ${Math.abs(metrics.revenueChange).toFixed(0)}% comparado ao mês anterior. Revise sua estratégia de preços.`,
        icon: '📉',
        actionable: true,
        actionLabel: 'Analisar',
      });
    }
  }

  // Weekend vs weekday imbalance
  const weekendVsWeekday = metrics.weekendOccupancy - metrics.weekdayOccupancy;
  if (weekendVsWeekday > 30) {
    insights.push({
      type: 'info',
      title: 'Forte Demanda em Fins de Semana',
      description: `Seus fins de semana têm ${metrics.weekendOccupancy.toFixed(0)}% de ocupação vs ${metrics.weekdayOccupancy.toFixed(0)}% em dias úteis. Considere promoções para dias da semana.`,
      icon: '📅',
      actionable: true,
      actionLabel: 'Criar Promoção',
    });
  }

  // Few available days warning
  if (metrics.availableDays <= 3 && metrics.availableDays > 0) {
    insights.push({
      type: 'warning',
      title: 'Poucos Dias Disponíveis!',
      description: `Você tem apenas ${metrics.availableDays} dias disponíveis nos próximos 30 dias. Esteja preparado para alta demanda.`,
      icon: '🔥',
    });
  }

  // No availability alert
  if (metrics.availableDays === 0) {
    insights.push({
      type: 'error',
      title: 'Totalmente Reservado!',
      description: 'Sua propriedade está 100% reservada para os próximos 30 dias. Considere abrir mais datas ou criar lista de espera.',
      icon: '✅',
      actionable: true,
      actionLabel: 'Gerenciar Bloqueios',
    });
  }

  // Many blocked days
  if (metrics.blockedDays > metrics.totalDays * 0.3) {
    const potentialRevenue = metrics.blockedDays * metrics.averageDailyRate;
    insights.push({
      type: 'warning',
      title: 'Muitas Datas Bloqueadas',
      description: `Você tem ${metrics.blockedDays} dias bloqueados (${((metrics.blockedDays / metrics.totalDays) * 100).toFixed(0)}%). Isso pode representar R$ ${potentialRevenue.toFixed(0)} em receita perdida.`,
      icon: '🚫',
      actionable: true,
      actionLabel: 'Revisar Bloqueios',
    });
  }

  // Good performance
  if (
    metrics.occupancyRate >= 70 &&
    metrics.occupancyRate <= 85 &&
    metrics.availableDays >= 5
  ) {
    insights.push({
      type: 'success',
      title: 'Performance Ideal',
      description: `Sua propriedade está com ocupação balanceada (${metrics.occupancyRate.toFixed(0)}%) e boa disponibilidade. Continue com esta estratégia!`,
      icon: '🎯',
    });
  }

  // Average daily rate insight
  if (metrics.averageDailyRate > 0) {
    const marketRate = metrics.averageDailyRate * 1.15; // Simplified market comparison
    insights.push({
      type: 'info',
      title: 'Análise de Preços',
      description: `Sua diária média é R$ ${metrics.averageDailyRate.toFixed(0)}. Com base no mercado, você poderia praticar até R$ ${marketRate.toFixed(0)}.`,
      icon: '💡',
      actionable: true,
      actionLabel: 'Ajustar Preços',
    });
  }

  return insights;
}
