import { 
  IncomeStatement, 
  CashFlowProjection, 
  ProjectionPeriod,
  ProjectionItem,
  ProjectionScenario,
  ProjectionAlert
} from '@/lib/types/accounts';
import { Transaction } from '@/lib/types';
import { transactionService } from './transaction-service';
import { accountsService } from './accounts-service';
import { propertyService, reservationService } from '@/lib/firebase/firestore';
import { 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths,
  differenceInDays,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore
} from 'date-fns';

export class FinancialAnalyticsService {
  
  // Generate Income Statement (DRE)
  async generateIncomeStatement(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    type: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<IncomeStatement> {
    
    // Get all transactions for the period
    const transactions = await transactionService.getByDateRange(startDate, endDate);
    const filteredTransactions = transactions.filter(t => 
      t.tenantId === tenantId && t.status === 'completed'
    );

    // Initialize categories
    const revenue = {
      rent: 0,
      fees: 0,
      extraServices: 0,
      other: 0,
      total: 0,
      items: [] as any[]
    };

    const costs = {
      cleaning: 0,
      maintenance: 0,
      utilities: 0,
      insurance: 0,
      propertyTax: 0,
      other: 0,
      total: 0,
      items: [] as any[]
    };

    const expenses = {
      marketing: 0,
      administrative: 0,
      commissions: 0,
      professional: 0,
      other: 0,
      total: 0,
      items: [] as any[]
    };

    // Categorize transactions
    const categoryMap = new Map<string, { amount: number; count: number }>();

    filteredTransactions.forEach(transaction => {
      const key = `${transaction.type}-${transaction.category}-${transaction.subcategory || ''}`;
      const existing = categoryMap.get(key) || { amount: 0, count: 0 };
      
      categoryMap.set(key, {
        amount: existing.amount + transaction.amount,
        count: existing.count + 1
      });

      if (transaction.type === 'income') {
        switch (transaction.category) {
          case 'reservation':
            revenue.rent += transaction.amount;
            break;
          case 'cleaning_fee':
          case 'booking_fee':
            revenue.fees += transaction.amount;
            break;
          case 'extra_service':
            revenue.extraServices += transaction.amount;
            break;
          default:
            revenue.other += transaction.amount;
        }
      } else {
        switch (transaction.category) {
          case 'cleaning':
            costs.cleaning += transaction.amount;
            break;
          case 'maintenance':
            costs.maintenance += transaction.amount;
            break;
          case 'utilities':
            costs.utilities += transaction.amount;
            break;
          case 'insurance':
            costs.insurance += transaction.amount;
            break;
          case 'property_tax':
            costs.propertyTax += transaction.amount;
            break;
          case 'marketing':
            expenses.marketing += transaction.amount;
            break;
          case 'administrative':
            expenses.administrative += transaction.amount;
            break;
          case 'commission':
            expenses.commissions += transaction.amount;
            break;
          case 'professional':
            expenses.professional += transaction.amount;
            break;
          default:
            if (transaction.type === 'expense') {
              costs.other += transaction.amount;
            }
        }
      }
    });

    // Calculate totals
    revenue.total = revenue.rent + revenue.fees + revenue.extraServices + revenue.other;
    costs.total = costs.cleaning + costs.maintenance + costs.utilities + 
                  costs.insurance + costs.propertyTax + costs.other;
    expenses.total = expenses.marketing + expenses.administrative + 
                     expenses.commissions + expenses.professional + expenses.other;

    // Convert category map to items
    categoryMap.forEach((data, key) => {
      const [type, category, subcategory] = key.split('-');
      const item = {
        category,
        subcategory,
        description: `${category}${subcategory ? ` - ${subcategory}` : ''}`,
        amount: data.amount,
        percentage: 0,
        transactions: data.count,
        averageTicket: data.amount / data.count
      };

      if (type === 'income') {
        item.percentage = (data.amount / revenue.total) * 100;
        revenue.items.push(item);
      } else {
        const total = costs.total + expenses.total;
        item.percentage = (data.amount / total) * 100;
        
        if (['cleaning', 'maintenance', 'utilities', 'insurance', 'property_tax'].includes(category)) {
          costs.items.push(item);
        } else {
          expenses.items.push(item);
        }
      }
    });

    // Calculate results
    const grossProfit = revenue.total - costs.total;
    const grossMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
    const operatingProfit = grossProfit - expenses.total;
    const operatingMargin = revenue.total > 0 ? (operatingProfit / revenue.total) * 100 : 0;
    const netProfit = operatingProfit; // Simplified (no taxes/interest)
    const netMargin = revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0;
    const ebitda = operatingProfit; // Simplified

    // Get previous period data
    const previousStart = type === 'monthly' ? subMonths(startDate, 1) :
                         type === 'quarterly' ? subMonths(startDate, 3) :
                         subMonths(startDate, 12);
    const previousEnd = type === 'monthly' ? subMonths(endDate, 1) :
                       type === 'quarterly' ? subMonths(endDate, 3) :
                       subMonths(endDate, 12);

    const previousTransactions = await transactionService.getByDateRange(previousStart, previousEnd);
    const previousFiltered = previousTransactions.filter(t => 
      t.tenantId === tenantId && t.status === 'completed'
    );

    const previousPeriod = {
      revenue: previousFiltered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      costs: 0,
      expenses: 0,
      netProfit: 0
    };

    previousFiltered.filter(t => t.type === 'expense').forEach(t => {
      if (['cleaning', 'maintenance', 'utilities', 'insurance', 'property_tax'].includes(t.category)) {
        previousPeriod.costs += t.amount;
      } else {
        previousPeriod.expenses += t.amount;
      }
    });

    previousPeriod.netProfit = previousPeriod.revenue - previousPeriod.costs - previousPeriod.expenses;

    // Get by property data
    const properties = await propertyService.getAll();
    const byProperty = await Promise.all(
      properties.map(async property => {
        const propTransactions = filteredTransactions.filter(t => t.propertyId === property.id);
        const propRevenue = propTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const propCosts = propTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return {
          propertyId: property.id,
          propertyName: property.title,
          revenue: propRevenue,
          costs: propCosts,
          expenses: 0, // Simplified
          profit: propRevenue - propCosts,
          margin: propRevenue > 0 ? ((propRevenue - propCosts) / propRevenue) * 100 : 0
        };
      })
    );

    return {
      id: `${tenantId}-${format(startDate, 'yyyy-MM')}`,
      tenantId,
      period: {
        start: startDate,
        end: endDate,
        type
      },
      revenue,
      costs,
      expenses,
      grossProfit,
      grossMargin,
      operatingProfit,
      operatingMargin,
      netProfit,
      netMargin,
      ebitda,
      previousPeriod,
      byProperty,
      generatedAt: new Date(),
      generatedBy: 'system'
    };
  }

  // Generate Cash Flow Projection
  async generateCashFlowProjection(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<CashFlowProjection> {
    
    // Get current balance
    const currentTransactions = await transactionService.getByDateRange(
      new Date(2020, 0, 1), // From beginning
      startDate
    );
    
    const currentBalance = currentTransactions
      .filter(t => t.tenantId === tenantId && t.status === 'completed')
      .reduce((balance, t) => {
        return balance + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);

    // Get upcoming accounts
    const accounts = await accountsService.getAll();
    const upcomingAccounts = accounts.filter(account => 
      account.tenantId === tenantId &&
      account.status !== 'paid' &&
      account.status !== 'cancelled' &&
      isAfter(account.dueDate, startDate) &&
      isBefore(account.dueDate, endDate)
    );

    // Get confirmed reservations
    const reservations = await reservationService.getAll();
    const upcomingReservations = reservations.filter(res =>
      res.tenantId === tenantId &&
      res.status === 'confirmed' &&
      isAfter(res.checkIn.toDate(), startDate) &&
      isBefore(res.checkIn.toDate(), endDate)
    );

    // Get recurring transactions
    const recurringTransactions = await transactionService.getRecurring();
    const activeRecurring = recurringTransactions.filter(t => 
      t.tenantId === tenantId &&
      (!t.recurringEndDate || isAfter(t.recurringEndDate, startDate))
    );

    // Generate projection periods
    let periods: Date[] = [];
    if (granularity === 'daily') {
      periods = eachDayOfInterval({ start: startDate, end: endDate });
    } else if (granularity === 'weekly') {
      periods = eachWeekOfInterval({ start: startDate, end: endDate });
    } else {
      periods = eachMonthOfInterval({ start: startDate, end: endDate });
    }

    // Build projections
    const projections: ProjectionPeriod[] = [];
    let runningBalance = currentBalance;
    let lowestBalance = currentBalance;
    let lowestBalanceDate = startDate;

    for (const periodDate of periods) {
      const periodStart = startOfDay(periodDate);
      const periodEnd = granularity === 'daily' ? endOfDay(periodDate) :
                       granularity === 'weekly' ? endOfDay(new Date(periodDate.getTime() + 6 * 24 * 60 * 60 * 1000)) :
                       endOfMonth(periodDate);

      const inflows: ProjectionItem[] = [];
      const outflows: ProjectionItem[] = [];

      // Add expected income from reservations
      upcomingReservations.forEach(reservation => {
        const checkIn = reservation.checkIn.toDate();
        if (isAfter(checkIn, periodStart) && isBefore(checkIn, periodEnd)) {
          inflows.push({
            type: 'reservation',
            description: `Reserva #${reservation.id.slice(-6)} - ${reservation.propertyId}`,
            amount: reservation.totalPrice,
            probability: 0.95,
            source: 'confirmed',
            relatedId: reservation.id
          });
        }
      });

      // Add accounts receivable
      upcomingAccounts
        .filter(account => account.type === 'receivable')
        .forEach(account => {
          if (isAfter(account.dueDate, periodStart) && isBefore(account.dueDate, periodEnd)) {
            const probability = account.overdueDays > 30 ? 0.5 :
                              account.overdueDays > 0 ? 0.7 :
                              0.9;
            
            inflows.push({
              type: 'account_receivable',
              description: account.description,
              amount: account.remainingAmount,
              probability,
              source: 'confirmed',
              relatedId: account.id
            });
          }
        });

      // Add accounts payable
      upcomingAccounts
        .filter(account => account.type === 'payable')
        .forEach(account => {
          if (isAfter(account.dueDate, periodStart) && isBefore(account.dueDate, periodEnd)) {
            outflows.push({
              type: 'account_payable',
              description: account.description,
              amount: account.remainingAmount,
              probability: 0.95,
              source: 'confirmed',
              relatedId: account.id
            });
          }
        });

      // Add recurring transactions
      activeRecurring.forEach(recurring => {
        // Simplified recurring logic - would need to calculate actual dates
        const probability = 0.9;
        
        if (recurring.type === 'income') {
          inflows.push({
            type: 'recurring_income',
            description: recurring.description,
            amount: recurring.amount,
            probability,
            source: 'recurring',
            relatedId: recurring.id
          });
        } else {
          outflows.push({
            type: 'recurring_expense',
            description: recurring.description,
            amount: recurring.amount,
            probability,
            source: 'recurring',
            relatedId: recurring.id
          });
        }
      });

      // Calculate expected flows
      const expectedInflow = inflows.reduce((sum, item) => sum + (item.amount * item.probability), 0);
      const expectedOutflow = outflows.reduce((sum, item) => sum + (item.amount * item.probability), 0);
      const netFlow = expectedInflow - expectedOutflow;
      const endingBalance = runningBalance + netFlow;

      projections.push({
        date: periodDate,
        expectedInflow,
        expectedOutflow,
        netFlow,
        inflows,
        outflows,
        startingBalance: runningBalance,
        endingBalance,
        confidence: 0.8 // Simplified
      });

      // Track lowest balance
      if (endingBalance < lowestBalance) {
        lowestBalance = endingBalance;
        lowestBalanceDate = periodDate;
      }

      runningBalance = endingBalance;
    }

    // Generate scenarios
    const scenarios = {
      optimistic: this.generateScenario('optimistic', projections, 1.2, 0.9),
      realistic: this.generateScenario('realistic', projections, 1.0, 1.0),
      pessimistic: this.generateScenario('pessimistic', projections, 0.8, 1.1)
    };

    // Generate alerts
    const alerts: ProjectionAlert[] = [];

    if (lowestBalance < 0) {
      alerts.push({
        type: 'negative_balance',
        severity: 'critical',
        date: lowestBalanceDate,
        message: `Previsão de saldo negativo de ${this.formatCurrency(lowestBalance)}`,
        suggestion: 'Antecipe recebimentos ou adie pagamentos para evitar saldo negativo',
        amount: lowestBalance
      });
    } else if (lowestBalance < 5000) {
      alerts.push({
        type: 'low_balance',
        severity: 'high',
        date: lowestBalanceDate,
        message: `Saldo baixo previsto: ${this.formatCurrency(lowestBalance)}`,
        suggestion: 'Mantenha uma reserva de emergência adequada',
        amount: lowestBalance
      });
    }

    // Check for high expense periods
    projections.forEach(period => {
      if (period.expectedOutflow > period.expectedInflow * 1.5) {
        alerts.push({
          type: 'high_expense',
          severity: 'medium',
          date: period.date,
          message: `Despesas altas previstas: ${this.formatCurrency(period.expectedOutflow)}`,
          suggestion: 'Revise e otimize as despesas deste período',
          amount: period.expectedOutflow
        });
      }
    });

    const totalInflow = projections.reduce((sum, p) => sum + p.expectedInflow, 0);
    const totalOutflow = projections.reduce((sum, p) => sum + p.expectedOutflow, 0);
    const averageBalance = projections.reduce((sum, p) => sum + p.endingBalance, 0) / projections.length;

    return {
      id: `${tenantId}-${format(startDate, 'yyyy-MM-dd')}`,
      tenantId,
      startDate,
      endDate,
      granularity,
      projections,
      summary: {
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
        lowestBalance,
        lowestBalanceDate,
        averageBalance
      },
      scenarios,
      alerts,
      generatedAt: new Date(),
      confidence: 0.8,
      assumptions: [
        'Reservas confirmadas serão pagas',
        'Contas a receber serão quitadas com probabilidade baseada no histórico',
        'Despesas recorrentes continuarão no mesmo padrão',
        'Não considera sazonalidade ou eventos especiais'
      ]
    };
  }

  private generateScenario(
    name: string, 
    projections: ProjectionPeriod[],
    inflowMultiplier: number,
    outflowMultiplier: number
  ): ProjectionScenario {
    const adjustedProjections = projections.map(p => ({
      ...p,
      expectedInflow: p.expectedInflow * inflowMultiplier,
      expectedOutflow: p.expectedOutflow * outflowMultiplier,
      netFlow: (p.expectedInflow * inflowMultiplier) - (p.expectedOutflow * outflowMultiplier)
    }));

    const totalInflow = adjustedProjections.reduce((sum, p) => sum + p.expectedInflow, 0);
    const totalOutflow = adjustedProjections.reduce((sum, p) => sum + p.expectedOutflow, 0);
    
    let runningBalance = projections[0].startingBalance;
    let lowestBalance = runningBalance;
    
    adjustedProjections.forEach(p => {
      runningBalance += p.netFlow;
      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
      }
    });

    const probability = name === 'realistic' ? 0.6 :
                       name === 'optimistic' ? 0.2 :
                       0.2;

    return {
      name,
      probability,
      summary: {
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
        lowestBalance
      },
      assumptions: this.getScenarioAssumptions(name),
      adjustments: {
        inflow: (inflowMultiplier - 1) * 100,
        outflow: (outflowMultiplier - 1) * 100
      }
    };
  }

  private getScenarioAssumptions(scenario: string): string[] {
    switch (scenario) {
      case 'optimistic':
        return [
          'Todas as reservas serão confirmadas e pagas',
          'Novos clientes aumentarão a demanda',
          'Despesas serão controladas eficientemente',
          'Não haverá cancelamentos significativos'
        ];
      case 'pessimistic':
        return [
          'Possíveis cancelamentos de reservas',
          'Atrasos em pagamentos de clientes',
          'Despesas emergenciais podem surgir',
          'Redução na demanda por fatores externos'
        ];
      default:
        return [
          'Comportamento normal do mercado',
          'Taxas históricas de cancelamento',
          'Despesas dentro do orçamento previsto',
          'Demanda estável'
        ];
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  // Calculate key financial metrics
  async calculateMetrics(tenantId: string, period: { start: Date; end: Date }) {
    const transactions = await transactionService.getByDateRange(period.start, period.end);
    const properties = await propertyService.getAll();
    const reservations = await reservationService.getAll();
    
    const filteredTransactions = transactions.filter(t => t.tenantId === tenantId);
    const tenantProperties = properties.filter(p => p.tenantId === tenantId);
    const periodReservations = reservations.filter(r => 
      r.tenantId === tenantId &&
      isAfter(r.checkIn.toDate(), period.start) &&
      isBefore(r.checkOut.toDate(), period.end)
    );

    // Revenue metrics
    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalNights = periodReservations.reduce((sum, r) => {
      const nights = differenceInDays(r.checkOut.toDate(), r.checkIn.toDate());
      return sum + nights;
    }, 0);

    const totalAvailableNights = tenantProperties.reduce((sum, p) => {
      const days = differenceInDays(period.end, period.start) + 1;
      return sum + days;
    }, 0);

    // Key metrics
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0; // Average Daily Rate
    const revPAR = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0; // Revenue Per Available Room
    
    // Customer metrics
    const uniqueGuests = new Set(periodReservations.map(r => r.clientId)).size;
    const repeatGuests = periodReservations.filter(r => {
      const guestReservations = reservations.filter(res => res.clientId === r.clientId);
      return guestReservations.length > 1;
    }).length;
    const repeatRate = periodReservations.length > 0 ? (repeatGuests / periodReservations.length) * 100 : 0;

    return {
      revenue: {
        total: totalRevenue,
        adr,
        revPAR
      },
      occupancy: {
        rate: occupancyRate,
        totalNights,
        availableNights: totalAvailableNights
      },
      customers: {
        unique: uniqueGuests,
        repeatRate,
        totalReservations: periodReservations.length
      }
    };
  }
}

export const financialAnalyticsService = new FinancialAnalyticsService();