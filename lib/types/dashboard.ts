// lib/types/dashboard.ts
import { Reservation, Payment } from './reservation'

export interface DashboardData {
  // KPIs principais
  todayCheckIns: Reservation[]
  todayCheckOuts: Reservation[]
  currentOccupancy: number
  totalProperties: number
  availableProperties: number
  
  // Financeiro rápido
  todayRevenue: number
  monthRevenue: number
  yearRevenue: number
  pendingPayments: Payment[]
  overduePayments: Payment[]
  
  // Alertas
  alerts: DashboardAlert[]
  
  // Estatísticas rápidas
  quickStats: QuickStats
  
  // Métricas de performance
  performanceMetrics: PerformanceMetrics
  
  // Atividade recente
  recentActivity: ActivityEvent[]
  
  // Período dos dados
  dataAsOf: Date
}

export interface DashboardAlert {
  id: string
  type: AlertType
  message: string
  severity: AlertSeverity
  actionRequired: boolean
  relatedId?: string
  relatedType?: 'reservation' | 'payment' | 'property' | 'client'
  createdAt: Date
  dismissedAt?: Date
  actionUrl?: string
}

export enum AlertType {
  OVERDUE_PAYMENT = 'overdue_payment',
  CHECK_IN_TODAY = 'check_in_today',
  CHECK_OUT_TODAY = 'check_out_today',
  MAINTENANCE_DUE = 'maintenance_due',
  LOW_OCCUPANCY = 'low_occupancy',
  HIGH_DEMAND = 'high_demand',
  BOOKING_CONFIRMATION_NEEDED = 'booking_confirmation_needed',
  REVIEW_PENDING = 'review_pending',
  CALENDAR_CONFLICT = 'calendar_conflict',
  PRICE_OPTIMIZATION = 'price_optimization',
  SYSTEM_ISSUE = 'system_issue'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface QuickStats {
  // Propriedades
  occupiedProperties: number
  availableProperties: number
  maintenanceProperties: number
  
  // Reservas
  reservationsThisMonth: number
  reservationsToday: number
  newReservationsThisWeek: number
  
  // Clientes
  newClientsThisMonth: number
  totalActiveClients: number
  vipClients: number
  
  // Performance
  averageStayDuration: number
  occupancyRate: number
  averageDailyRate: number
  revPAR: number
  
  // Crescimento
  monthOverMonthGrowth: number
  yearOverYearGrowth: number
  
  // Top performers
  topPerformingProperty: PropertyPerformance
  topClient: ClientPerformance
}

export interface PropertyPerformance {
  propertyId: string
  propertyName: string
  revenue: number
  occupancy: number
  rating: number
  reservations: number
}

export interface ClientPerformance {
  clientId: string
  clientName: string
  totalSpent: number
  totalReservations: number
  lastBooking: Date
  lifetimeValue: number
}

export interface PerformanceMetrics {
  // Financeiras
  revenueGrowth: MetricTrend
  profitMargin: MetricTrend
  averageTicket: MetricTrend
  
  // Operacionais
  occupancyRate: MetricTrend
  averageStayDuration: MetricTrend
  bookingLeadTime: MetricTrend
  
  // Cliente
  customerSatisfaction: MetricTrend
  repeatBookingRate: MetricTrend
  customerLifetimeValue: MetricTrend
  
  // Eficiência
  responseTime: MetricTrend
  bookingConversionRate: MetricTrend
  cancellationRate: MetricTrend
}

export interface MetricTrend {
  current: number
  previous: number
  change: number
  changePercentage: number
  trend: 'up' | 'down' | 'stable'
  target?: number
  unit: string
  period: string
}

export interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  description: string
  entityId: string
  entityType: 'reservation' | 'payment' | 'property' | 'client'
  userId?: string
  userName?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export enum ActivityType {
  RESERVATION_CREATED = 'reservation_created',
  RESERVATION_CONFIRMED = 'reservation_confirmed',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  CHECK_IN_COMPLETED = 'check_in_completed',
  CHECK_OUT_COMPLETED = 'check_out_completed',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_OVERDUE = 'payment_overdue',
  CLIENT_REGISTERED = 'client_registered',
  PROPERTY_UPDATED = 'property_updated',
  REVIEW_RECEIVED = 'review_received',
  MAINTENANCE_SCHEDULED = 'maintenance_scheduled',
  PRICE_UPDATED = 'price_updated',
  WHATSAPP_CONVERSATION = 'whatsapp_conversation'
}

// Widgets do dashboard
export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  position: WidgetPosition
  size: WidgetSize
  config: WidgetConfig
  isVisible: boolean
  refreshInterval?: number // minutos
}

export enum WidgetType {
  KPI_CARD = 'kpi_card',
  CHART = 'chart',
  TABLE = 'table',
  CALENDAR = 'calendar',
  MAP = 'map',
  ACTIVITY_FEED = 'activity_feed',
  ALERT_LIST = 'alert_list',
  QUICK_ACTIONS = 'quick_actions'
}

export interface WidgetPosition {
  x: number
  y: number
}

export interface WidgetSize {
  width: number
  height: number
}

export interface WidgetConfig {
  dataSource: string
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area'
  timeRange?: string
  filters?: Record<string, any>
  displayOptions?: Record<string, any>
}

// Configurações do dashboard
export interface DashboardConfig {
  userId: string
  tenantId: string
  widgets: DashboardWidget[]
  layout: DashboardLayout
  theme: DashboardTheme
  refreshInterval: number
  autoRefresh: boolean
  lastModified: Date
}

export interface DashboardLayout {
  columns: number
  rowHeight: number
  margin: [number, number]
  padding: [number, number]
  responsive: boolean
}

export interface DashboardTheme {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  cardBackground: string
  textColor: string
  chartColors: string[]
}

// Notificações
export interface NotificationSettings {
  userId: string
  email: EmailNotificationSettings
  whatsapp: WhatsAppNotificationSettings
  push: PushNotificationSettings
  inApp: InAppNotificationSettings
}

export interface EmailNotificationSettings {
  enabled: boolean
  dailySummary: boolean
  weeklyReport: boolean
  alerts: AlertType[]
  frequency: 'immediate' | 'hourly' | 'daily'
}

export interface WhatsAppNotificationSettings {
  enabled: boolean
  phoneNumber?: string
  alerts: AlertType[]
  businessHoursOnly: boolean
}

export interface PushNotificationSettings {
  enabled: boolean
  alerts: AlertType[]
  quiet: boolean
  quietHours: {
    start: string // HH:mm
    end: string // HH:mm
  }
}

export interface InAppNotificationSettings {
  enabled: boolean
  alerts: AlertType[]
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoHide: boolean
  hideDelay: number // segundos
}

// Labels para exibição
export const ALERT_TYPE_LABELS = {
  [AlertType.OVERDUE_PAYMENT]: 'Pagamento em Atraso',
  [AlertType.CHECK_IN_TODAY]: 'Check-in Hoje',
  [AlertType.CHECK_OUT_TODAY]: 'Check-out Hoje',
  [AlertType.MAINTENANCE_DUE]: 'Manutenção Pendente',
  [AlertType.LOW_OCCUPANCY]: 'Baixa Ocupação',
  [AlertType.HIGH_DEMAND]: 'Alta Demanda',
  [AlertType.BOOKING_CONFIRMATION_NEEDED]: 'Confirmação de Reserva Necessária',
  [AlertType.REVIEW_PENDING]: 'Avaliação Pendente',
  [AlertType.CALENDAR_CONFLICT]: 'Conflito de Calendário',
  [AlertType.PRICE_OPTIMIZATION]: 'Otimização de Preço',
  [AlertType.SYSTEM_ISSUE]: 'Problema do Sistema'
}

export const ACTIVITY_TYPE_LABELS = {
  [ActivityType.RESERVATION_CREATED]: 'Reserva Criada',
  [ActivityType.RESERVATION_CONFIRMED]: 'Reserva Confirmada',
  [ActivityType.RESERVATION_CANCELLED]: 'Reserva Cancelada',
  [ActivityType.CHECK_IN_COMPLETED]: 'Check-in Realizado',
  [ActivityType.CHECK_OUT_COMPLETED]: 'Check-out Realizado',
  [ActivityType.PAYMENT_RECEIVED]: 'Pagamento Recebido',
  [ActivityType.PAYMENT_OVERDUE]: 'Pagamento em Atraso',
  [ActivityType.CLIENT_REGISTERED]: 'Cliente Cadastrado',
  [ActivityType.PROPERTY_UPDATED]: 'Propriedade Atualizada',
  [ActivityType.REVIEW_RECEIVED]: 'Avaliação Recebida',
  [ActivityType.MAINTENANCE_SCHEDULED]: 'Manutenção Agendada',
  [ActivityType.PRICE_UPDATED]: 'Preço Atualizado',
  [ActivityType.WHATSAPP_CONVERSATION]: 'Conversa WhatsApp'
}

// Cores para alertas
export const ALERT_SEVERITY_COLORS = {
  [AlertSeverity.LOW]: '#2196F3',
  [AlertSeverity.MEDIUM]: '#FF9800',
  [AlertSeverity.HIGH]: '#F44336',
  [AlertSeverity.CRITICAL]: '#D32F2F'
}