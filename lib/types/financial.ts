// lib/types/financial.ts
import { PaymentMethod, PaymentStatus, Payment } from './reservation'

export interface FinancialSummary {
  period: DateRange
  
  // Receitas
  totalRevenue: number
  receivedAmount: number
  pendingAmount: number
  overdueAmount: number
  refundedAmount: number
  
  // Custos (opcional para futuras implementações)
  totalCosts?: number
  netProfit?: number
  profitMargin?: number
  
  // Por método de pagamento
  revenueByMethod: Record<PaymentMethod, number>
  
  // Por propriedade
  revenueByProperty: PropertyRevenue[]
  
  // Por período (mensal/semanal)
  revenueByPeriod: PeriodRevenue[]
  
  // Estatísticas
  totalReservations: number
  averageTicket: number
  occupancyRate: number
  revPAR: number // Revenue Per Available Room
  adr: number // Average Daily Rate
  
  // Comparações
  previousPeriodComparison: PeriodComparison
  
  // Previsões
  forecast?: RevenueForecast
}

export interface DateRange {
  start: Date
  end: Date
  label?: string
}

export interface PropertyRevenue {
  propertyId: string
  propertyName: string
  revenue: number
  reservations: number
  occupancyRate: number
  adr: number
  revPAR: number
  growth: number
}

export interface PeriodRevenue {
  period: string // 'YYYY-MM' ou 'YYYY-WW'
  revenue: number
  reservations: number
  averageTicket: number
  occupancy: number
  date: Date
}

export interface PeriodComparison {
  revenueGrowth: number
  reservationsGrowth: number
  averageTicketGrowth: number
  occupancyGrowth: number
}

export interface RevenueForecast {
  nextMonth: number
  nextQuarter: number
  confidence: number // 0-1
  factors: ForecastFactor[]
}

export interface ForecastFactor {
  factor: string
  impact: number // -1 a 1
  description: string
}

// Métricas avançadas
export interface FinancialMetrics {
  // Métricas de receita
  arr: number // Annual Recurring Revenue
  mrr: number // Monthly Recurring Revenue
  arpu: number // Average Revenue Per User
  ltv: number // Customer Lifetime Value
  
  // Métricas de eficiência
  cac: number // Customer Acquisition Cost
  ltvCacRatio: number
  paybackPeriod: number // meses
  
  // Métricas de retenção
  retentionRate: number
  churnRate: number
  repeatBookingRate: number
  
  // Métricas operacionais
  bookingConversionRate: number
  averageBookingWindow: number // dias
  averageStayDuration: number
  
  period: DateRange
  lastUpdated: Date
}

// Fluxo de caixa
export interface CashFlow {
  period: DateRange
  entries: CashFlowEntry[]
  totalIn: number
  totalOut: number
  netFlow: number
  runningBalance: number
}

export interface CashFlowEntry {
  id: string
  date: Date
  type: 'income' | 'expense'
  category: CashFlowCategory
  amount: number
  description: string
  paymentMethod?: PaymentMethod
  reservationId?: string
  recurring: boolean
}

export enum CashFlowCategory {
  // Receitas
  RESERVATION_PAYMENT = 'reservation_payment',
  EXTRA_SERVICES = 'extra_services',
  CLEANING_FEE = 'cleaning_fee',
  
  // Despesas
  PROPERTY_MAINTENANCE = 'property_maintenance',
  CLEANING_COSTS = 'cleaning_costs',
  UTILITIES = 'utilities',
  INSURANCE = 'insurance',
  MARKETING = 'marketing',
  PLATFORM_FEES = 'platform_fees',
  TAXES = 'taxes',
  OTHER_EXPENSES = 'other_expenses'
}

// Metas Financeiras
export interface FinancialGoal {
  id: string
  tenantId: string
  name: string
  description?: string
  
  // Tipo e categoria
  type: GoalType
  category: GoalCategory
  metric: GoalMetric
  
  // Valores
  targetValue: number
  currentValue: number
  startValue: number
  
  // Período
  period: DateRange
  frequency: GoalFrequency
  
  // Status
  status: GoalStatus
  progress: number // 0-100
  
  // Tracking
  checkpoints: GoalCheckpoint[]
  milestones: GoalMilestone[]
  
  // Alertas
  alerts: GoalAlert[]
  notificationSettings: NotificationSettings
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
  
  // Comparações
  comparison?: GoalComparison
  forecast?: GoalForecast
}

export enum GoalType {
  REVENUE = 'revenue',
  OCCUPANCY = 'occupancy',
  AVERAGE_TICKET = 'average_ticket',
  BOOKINGS = 'bookings',
  CUSTOMER_ACQUISITION = 'customer_acquisition',
  RETENTION = 'retention',
  PROFIT_MARGIN = 'profit_margin',
  CUSTOM = 'custom'
}

export enum GoalCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  GROWTH = 'growth',
  EFFICIENCY = 'efficiency',
  CUSTOMER = 'customer'
}

export enum GoalMetric {
  // Financeiro
  TOTAL_REVENUE = 'total_revenue',
  NET_REVENUE = 'net_revenue',
  GROSS_PROFIT = 'gross_profit',
  NET_PROFIT = 'net_profit',
  
  // Operacional
  OCCUPANCY_RATE = 'occupancy_rate',
  ADR = 'adr',
  REVPAR = 'revpar',
  BOOKING_COUNT = 'booking_count',
  
  // Crescimento
  MRR = 'mrr',
  ARR = 'arr',
  GROWTH_RATE = 'growth_rate',
  NEW_CUSTOMERS = 'new_customers',
  
  // Eficiência
  CAC = 'cac',
  LTV = 'ltv',
  CONVERSION_RATE = 'conversion_rate',
  REPEAT_RATE = 'repeat_rate'
}

export enum GoalFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum GoalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

export interface GoalCheckpoint {
  id: string
  date: Date
  value: number
  progress: number
  notes?: string
  automated: boolean
}

export interface GoalMilestone {
  id: string
  name: string
  targetValue: number
  targetDate: Date
  achieved: boolean
  achievedDate?: Date
  reward?: string
}

export interface GoalAlert {
  id: string
  type: 'warning' | 'success' | 'info' | 'critical'
  title: string
  message: string
  date: Date
  read: boolean
  actionRequired: boolean
}

export interface NotificationSettings {
  enabled: boolean
  channels: NotificationChannel[]
  frequency: 'realtime' | 'daily' | 'weekly'
  
  // Gatilhos
  onMilestone: boolean
  onTarget: boolean
  onDeviation: boolean
  deviationThreshold: number // percentual
  
  // Destinatários
  recipients: string[]
}

export enum NotificationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  DASHBOARD = 'dashboard',
  WEBHOOK = 'webhook'
}

export interface GoalComparison {
  previousPeriod: {
    value: number
    progress: number
    growth: number
  }
  
  benchmark: {
    industry: number
    topPerformers: number
    average: number
  }
  
  projectedVsActual: {
    projected: number
    actual: number
    variance: number
    variancePercentage: number
  }
}

export interface GoalForecast {
  projectedValue: number
  projectedDate: Date
  confidence: number // 0-1
  
  scenarios: {
    optimistic: ForecastScenario
    realistic: ForecastScenario
    pessimistic: ForecastScenario
  }
  
  factors: ForecastFactor[]
  recommendations: string[]
}

export interface ForecastScenario {
  value: number
  probability: number
  assumptions: string[]
}

// Tracking de Performance de Metas
export interface GoalPerformance {
  goalId: string
  period: DateRange
  
  // Métricas
  actualValue: number
  targetValue: number
  progress: number
  trend: 'up' | 'down' | 'stable'
  
  // Velocidade
  dailyAverage: number
  weeklyAverage: number
  monthlyAverage: number
  
  // Projeções
  projectedCompletion: Date
  requiredDailyRate: number
  currentPace: 'ahead' | 'on_track' | 'behind'
  
  // Análise
  contributingFactors: ContributingFactor[]
  blockers: string[]
  opportunities: string[]
}

export interface ContributingFactor {
  factor: string
  impact: 'positive' | 'negative'
  magnitude: 'low' | 'medium' | 'high'
  description: string
}

// Dashboard de Metas
export interface GoalsDashboard {
  tenantId: string
  period: DateRange
  
  // Resumo
  summary: {
    totalGoals: number
    activeGoals: number
    completedGoals: number
    averageProgress: number
    onTrackPercentage: number
  }
  
  // Metas por status
  goalsByStatus: Record<GoalStatus, number>
  
  // Metas por categoria
  goalsByCategory: Record<GoalCategory, GoalCategoryStats>
  
  // Performance
  topPerformers: GoalPerformance[]
  needsAttention: GoalPerformance[]
  recentlyCompleted: FinancialGoal[]
  
  // Insights
  insights: GoalInsight[]
  recommendations: GoalRecommendation[]
}

export interface GoalCategoryStats {
  count: number
  averageProgress: number
  completionRate: number
}

export interface GoalInsight {
  id: string
  type: 'achievement' | 'risk' | 'opportunity' | 'trend'
  title: string
  description: string
  goals: string[]
  impact: 'low' | 'medium' | 'high'
  createdAt: Date
}

export interface GoalRecommendation {
  id: string
  goalId: string
  title: string
  description: string
  actions: string[]
  expectedImpact: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'strategy' | 'tactics' | 'resources' | 'timeline'
}

// Labels para metas
export const GOAL_TYPE_LABELS = {
  [GoalType.REVENUE]: 'Receita',
  [GoalType.OCCUPANCY]: 'Ocupação',
  [GoalType.AVERAGE_TICKET]: 'Ticket Médio',
  [GoalType.BOOKINGS]: 'Reservas',
  [GoalType.CUSTOMER_ACQUISITION]: 'Aquisição de Clientes',
  [GoalType.RETENTION]: 'Retenção',
  [GoalType.PROFIT_MARGIN]: 'Margem de Lucro',
  [GoalType.CUSTOM]: 'Personalizada'
}

export const GOAL_CATEGORY_LABELS = {
  [GoalCategory.FINANCIAL]: 'Financeira',
  [GoalCategory.OPERATIONAL]: 'Operacional',
  [GoalCategory.GROWTH]: 'Crescimento',
  [GoalCategory.EFFICIENCY]: 'Eficiência',
  [GoalCategory.CUSTOMER]: 'Cliente'
}

export const GOAL_STATUS_LABELS = {
  [GoalStatus.DRAFT]: 'Rascunho',
  [GoalStatus.ACTIVE]: 'Ativa',
  [GoalStatus.PAUSED]: 'Pausada',
  [GoalStatus.COMPLETED]: 'Concluída',
  [GoalStatus.FAILED]: 'Não Alcançada',
  [GoalStatus.ARCHIVED]: 'Arquivada'
}

// Relatórios
export interface FinancialReport {
  id?: string
  type: ReportType
  period: DateRange
  generatedAt?: Date
  generatedBy?: string
  
  // Dados do relatório
  summary?: FinancialSummary
  metrics?: FinancialMetrics
  cashFlow?: CashFlow
  
  // Flexible data property for various report types
  data?: any
  
  // Configurações
  includeProjections?: boolean
  includeComparisons?: boolean
  groupBy?: 'day' | 'week' | 'month' | 'quarter'
  
  // Export
  exportUrl?: string
  format?: 'pdf' | 'excel' | 'csv'
}

export enum ReportType {
  REVENUE = 'revenue',
  OCCUPANCY = 'occupancy',
  FINANCIAL_SUMMARY = 'financial_summary',
  CASH_FLOW = 'cash_flow',
  TAX_REPORT = 'tax_report',
  PERFORMANCE = 'performance'
}

// Configurações financeiras
export interface FinancialConfig {
  tenantId: string
  
  // Taxas
  defaultTaxRate: number
  paymentMethodFees: Record<PaymentMethod, number>
  
  // Política de pagamento
  defaultPaymentTerms: number // dias
  latePaymentFee: number // percentual
  allowPartialPayments: boolean
  
  // Moeda e formatação
  currency: string
  locale: string
  
  // Integrações
  integrations: {
    accounting?: AccountingIntegration
    payments?: PaymentIntegration
  }
}

export interface AccountingIntegration {
  provider: 'quickbooks' | 'xero' | 'conta_azul' | 'omie'
  credentials: any
  autoSync: boolean
  syncFrequency: 'daily' | 'weekly' | 'monthly'
}

export interface PaymentIntegration {
  provider: 'stripe' | 'mercadopago' | 'pagar_me' | 'cielo'
  credentials: any
  webhookUrl: string
  autoReconciliation: boolean
}

// Analytics financeiras
export interface FinancialAnalytics {
  tenantId: string
  period: DateRange
  
  // Tendências
  revenueTrend: TrendData[]
  occupancyTrend: TrendData[]
  averageTicketTrend: TrendData[]
  
  // Distribuições
  revenueDistribution: DistributionData[]
  seasonalityAnalysis: SeasonalityData[]
  
  // Insights
  insights: AnalyticsInsight[]
  recommendations: AnalyticsRecommendation[]
  
  lastUpdated: Date
}

export interface TrendData {
  period: string
  value: number
  change: number
  date: Date
}

export interface DistributionData {
  category: string
  value: number
  percentage: number
  color?: string
}

export interface SeasonalityData {
  month: number
  revenue: number
  occupancy: number
  averageRate: number
  yearOverYear: number
}

export interface AnalyticsInsight {
  id: string
  type: 'opportunity' | 'warning' | 'trend' | 'anomaly'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
  createdAt: Date
}

export interface AnalyticsRecommendation {
  id: string
  title: string
  description: string
  expectedImpact: string
  effort: 'low' | 'medium' | 'high'
  priority: 'low' | 'medium' | 'high'
  category: 'pricing' | 'marketing' | 'operations' | 'customer_service'
}

// Labels para exibição
export const CASH_FLOW_CATEGORY_LABELS = {
  [CashFlowCategory.RESERVATION_PAYMENT]: 'Pagamento de Reserva',
  [CashFlowCategory.EXTRA_SERVICES]: 'Serviços Extras',
  [CashFlowCategory.CLEANING_FEE]: 'Taxa de Limpeza',
  [CashFlowCategory.PROPERTY_MAINTENANCE]: 'Manutenção',
  [CashFlowCategory.CLEANING_COSTS]: 'Custos de Limpeza',
  [CashFlowCategory.UTILITIES]: 'Utilidades',
  [CashFlowCategory.INSURANCE]: 'Seguro',
  [CashFlowCategory.MARKETING]: 'Marketing',
  [CashFlowCategory.PLATFORM_FEES]: 'Taxas de Plataforma',
  [CashFlowCategory.TAXES]: 'Impostos',
  [CashFlowCategory.OTHER_EXPENSES]: 'Outras Despesas'
}

export const REPORT_TYPE_LABELS = {
  [ReportType.REVENUE]: 'Relatório de Receita',
  [ReportType.OCCUPANCY]: 'Relatório de Ocupação',
  [ReportType.FINANCIAL_SUMMARY]: 'Resumo Financeiro',
  [ReportType.CASH_FLOW]: 'Fluxo de Caixa',
  [ReportType.TAX_REPORT]: 'Relatório Fiscal',
  [ReportType.PERFORMANCE]: 'Relatório de Performance'
}