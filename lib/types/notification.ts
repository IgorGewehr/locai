// lib/types/notification.ts
// Sistema de notificações multi-tenant para agenda e tickets

export interface Notification {
  id: string
  tenantId: string
  
  // Destinatário
  targetUserId: string
  targetUserName?: string
  
  // Conteúdo
  type: NotificationType
  title: string
  message: string
  icon?: string
  color?: string
  
  // Dados do evento que gerou a notificação
  entityType: 'agenda' | 'ticket' | 'reservation' | 'payment' | 'system'
  entityId: string
  entityData?: Record<string, any>
  
  // Status
  status: NotificationStatus
  priority: NotificationPriority
  
  // Canais de entrega
  channels: NotificationChannel[]
  deliveryStatus: Record<NotificationChannel, DeliveryStatus>
  
  // Timestamps
  createdAt: Date
  scheduledFor?: Date
  sentAt?: Date
  readAt?: Date
  expiresAt?: Date
  
  // Ações
  actions?: NotificationAction[]
  
  // Metadados
  metadata?: {
    source?: string // 'n8n', 'manual', 'system'
    triggerEvent?: string
    additionalData?: Record<string, any>
  }
}

export enum NotificationType {
  // Agenda
  AGENDA_EVENT_CREATED = 'agenda_event_created',
  AGENDA_EVENT_REMINDER = 'agenda_event_reminder',
  AGENDA_EVENT_UPDATED = 'agenda_event_updated',
  AGENDA_EVENT_CANCELLED = 'agenda_event_cancelled',
  
  // Tickets
  TICKET_RESPONSE_RECEIVED = 'ticket_response_received',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_ASSIGNED = 'ticket_assigned',

  // Conversas
  CONVERSATION_STARTED = 'conversation_started',
  CONVERSATION_MESSAGE_RECEIVED = 'conversation_message_received',

  // Reservas
  RESERVATION_CREATED = 'reservation_created',
  RESERVATION_CHECK_IN_REMINDER = 'reservation_check_in_reminder',
  RESERVATION_CHECK_OUT_REMINDER = 'reservation_check_out_reminder',
  
  // Financeiro
  PAYMENT_DUE_REMINDER = 'payment_due_reminder',
  PAYMENT_OVERDUE = 'payment_overdue',
  PAYMENT_RECEIVED = 'payment_received',
  
  // Sistema
  SYSTEM_ALERT = 'system_alert',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

export enum NotificationStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum NotificationChannel {
  DASHBOARD = 'dashboard',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  WEBHOOK = 'webhook'
}

export interface DeliveryStatus {
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
  sentAt?: Date
  deliveredAt?: Date
  error?: string
  attempts: number
  lastAttemptAt?: Date
}

export interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'danger'
  action: 'navigate' | 'api_call' | 'dismiss'
  config: {
    url?: string
    apiEndpoint?: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    params?: Record<string, any>
  }
}

// Preferências de notificação por usuário
export interface NotificationPreferences {
  id: string
  tenantId: string
  userId: string
  
  // Configurações gerais
  enabled: boolean
  
  // Canais preferidos
  preferredChannels: NotificationChannel[]
  
  // Horário de funcionamento
  quietHours: {
    enabled: boolean
    startTime: string // "22:00"
    endTime: string // "08:00"
  }
  
  // Configurações por tipo
  typeSettings: Record<NotificationType, {
    enabled: boolean
    channels: NotificationChannel[]
    priority: NotificationPriority
  }>
  
  // Frequência
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  maxNotificationsPerHour: number
  
  // Metadados
  createdAt: Date
  updatedAt: Date
}

// Template de notificação
export interface NotificationTemplate {
  id: string
  tenantId: string
  
  // Identificação
  type: NotificationType
  name: string
  description?: string
  
  // Conteúdo
  title: string // Suporta variáveis {{variable}}
  message: string
  
  // Configurações
  priority: NotificationPriority
  channels: NotificationChannel[]
  expiresIn?: number // minutos
  
  // Ações padrão
  defaultActions?: NotificationAction[]
  
  // Variáveis disponíveis
  availableVariables: string[]
  
  // Status
  isActive: boolean
  isDefault: boolean
  
  // Metadados
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Analytics de notificações
export interface NotificationAnalytics {
  tenantId: string
  period: {
    start: Date
    end: Date
  }
  
  // Métricas gerais
  overview: {
    totalSent: number
    deliveryRate: number
    readRate: number
    actionRate: number
    averageReadTime: number // em minutos
  }
  
  // Por tipo
  byType: Record<NotificationType, {
    sent: number
    delivered: number
    read: number
    actionTaken: number
  }>
  
  // Por canal
  byChannel: Record<NotificationChannel, {
    sent: number
    delivered: number
    deliveryRate: number
    readRate: number
  }>
  
  // Por usuário
  topUsers: Array<{
    userId: string
    userName: string
    totalReceived: number
    readRate: number
    avgResponseTime: number
  }>
  
  // Tendências
  trends: Array<{
    date: Date
    sent: number
    delivered: number
    read: number
  }>
  
  // Insights
  insights: Array<{
    type: 'success' | 'warning' | 'info' | 'error'
    title: string
    description: string
    recommendation?: string
  }>
}

// Dashboard de notificações para o usuário
export interface NotificationDashboard {
  unreadCount: number
  totalCount: number
  
  // Notificações recentes
  recent: Notification[]
  
  // Agrupadas por tipo
  byType: Record<NotificationType, Notification[]>
  
  // Ações pendentes
  pendingActions: Array<{
    notificationId: string
    action: NotificationAction
    dueDate?: Date
  }>
  
  // Estatísticas do usuário
  userStats: {
    totalReceived: number
    readRate: number
    avgResponseTime: number
    preferredChannel: NotificationChannel
  }
}

// Labels para exibição
export const NOTIFICATION_TYPE_LABELS = {
  [NotificationType.AGENDA_EVENT_CREATED]: 'Evento Criado na Agenda',
  [NotificationType.AGENDA_EVENT_REMINDER]: 'Lembrete de Evento',
  [NotificationType.AGENDA_EVENT_UPDATED]: 'Evento Atualizado',
  [NotificationType.AGENDA_EVENT_CANCELLED]: 'Evento Cancelado',
  
  [NotificationType.TICKET_RESPONSE_RECEIVED]: 'Resposta de Ticket',
  [NotificationType.TICKET_STATUS_CHANGED]: 'Status do Ticket Alterado',
  [NotificationType.TICKET_ASSIGNED]: 'Ticket Atribuído',

  [NotificationType.CONVERSATION_STARTED]: 'Nova Conversa',
  [NotificationType.CONVERSATION_MESSAGE_RECEIVED]: 'Nova Mensagem',

  [NotificationType.RESERVATION_CREATED]: 'Nova Reserva',
  [NotificationType.RESERVATION_CHECK_IN_REMINDER]: 'Lembrete Check-in',
  [NotificationType.RESERVATION_CHECK_OUT_REMINDER]: 'Lembrete Check-out',
  
  [NotificationType.PAYMENT_DUE_REMINDER]: 'Pagamento Vencendo',
  [NotificationType.PAYMENT_OVERDUE]: 'Pagamento em Atraso',
  [NotificationType.PAYMENT_RECEIVED]: 'Pagamento Recebido',
  
  [NotificationType.SYSTEM_ALERT]: 'Alerta do Sistema',
  [NotificationType.SYSTEM_MAINTENANCE]: 'Manutenção do Sistema'
}

export const NOTIFICATION_PRIORITY_LABELS = {
  [NotificationPriority.LOW]: 'Baixa',
  [NotificationPriority.MEDIUM]: 'Média',
  [NotificationPriority.HIGH]: 'Alta',
  [NotificationPriority.CRITICAL]: 'Crítica'
}

export const NOTIFICATION_CHANNEL_LABELS = {
  [NotificationChannel.DASHBOARD]: 'Dashboard',
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.WHATSAPP]: 'WhatsApp',
  [NotificationChannel.WEBHOOK]: 'Webhook'
}

// Cores para prioridades
export const NOTIFICATION_PRIORITY_COLORS = {
  [NotificationPriority.LOW]: '#4CAF50',
  [NotificationPriority.MEDIUM]: '#FF9800',
  [NotificationPriority.HIGH]: '#FF5722',
  [NotificationPriority.CRITICAL]: '#F44336'
}

// Ícones para tipos de notificação
export const NOTIFICATION_TYPE_ICONS = {
  [NotificationType.AGENDA_EVENT_CREATED]: '📅',
  [NotificationType.AGENDA_EVENT_REMINDER]: '⏰',
  [NotificationType.AGENDA_EVENT_UPDATED]: '✏️',
  [NotificationType.AGENDA_EVENT_CANCELLED]: '❌',
  
  [NotificationType.TICKET_RESPONSE_RECEIVED]: '💬',
  [NotificationType.TICKET_STATUS_CHANGED]: '🔄',
  [NotificationType.TICKET_ASSIGNED]: '👤',

  [NotificationType.CONVERSATION_STARTED]: '💬',
  [NotificationType.CONVERSATION_MESSAGE_RECEIVED]: '📨',

  [NotificationType.RESERVATION_CREATED]: '🏠',
  [NotificationType.RESERVATION_CHECK_IN_REMINDER]: '🗝️',
  [NotificationType.RESERVATION_CHECK_OUT_REMINDER]: '🚪',
  
  [NotificationType.PAYMENT_DUE_REMINDER]: '💳',
  [NotificationType.PAYMENT_OVERDUE]: '⚠️',
  [NotificationType.PAYMENT_RECEIVED]: '✅',
  
  [NotificationType.SYSTEM_ALERT]: '🚨',
  [NotificationType.SYSTEM_MAINTENANCE]: '🔧'
}