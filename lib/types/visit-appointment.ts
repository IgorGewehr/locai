// lib/types/visit-appointment.ts
// Sistema de agendamento de visitas presenciais

export interface VisitAppointment {
  id: string
  tenantId: string
  
  // Cliente e propriedade
  clientId: string
  clientName: string
  clientPhone: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  
  // Agendamento
  scheduledDate: Date
  scheduledTime: string // "HH:MM" formato
  duration: number // minutos (padrão 60)
  
  // Status
  status: VisitStatus
  
  // Detalhes
  notes?: string
  clientRequests?: string[] // Comodidades específicas que o cliente quer ver
  
  // Confirmações
  confirmedByClient?: boolean
  confirmedByAgent?: boolean
  
  // Acompanhante
  agentId?: string
  agentName?: string
  agentPhone?: string
  
  // Resultado da visita
  visitResult?: VisitResult
  
  // Metadados
  source: 'whatsapp' | 'website' | 'phone' | 'manual'
  createdAt: Date
  updatedAt: Date
  
  // Lembrete
  reminderSent?: boolean
  reminderSentAt?: Date
}

export enum VisitStatus {
  SCHEDULED = 'scheduled',           // Agendada
  CONFIRMED = 'confirmed',           // Confirmada por ambas as partes
  IN_PROGRESS = 'in_progress',       // Em andamento
  COMPLETED = 'completed',           // Concluída
  CANCELLED_BY_CLIENT = 'cancelled_by_client',
  CANCELLED_BY_AGENT = 'cancelled_by_agent',
  NO_SHOW = 'no_show',              // Cliente não compareceu
  RESCHEDULED = 'rescheduled'        // Reagendada
}

export interface VisitResult {
  clientLiked: boolean
  clientInterested: boolean
  followUpNeeded: boolean
  wantsToReserve: boolean
  
  // Feedback do cliente
  positiveAspects?: string[]
  concerns?: string[]
  additionalRequests?: string[]
  
  // Próximos passos
  nextAction: 'send_proposal' | 'schedule_another_visit' | 'no_interest' | 'needs_follow_up'
  proposalSent?: boolean
  proposalDate?: Date
  
  // Notas do agente
  agentNotes?: string
  
  // Resultado final
  convertedToReservation?: boolean
  reservationId?: string
  
  completedAt: Date
}

// Agenda da imobiliária (disponibilidade geral)
export interface TenantVisitSchedule {
  id: string
  tenantId: string
  
  // Horários de funcionamento
  workingHours: WorkingHours
  
  // Bloqueios e feriados
  blockedDates: Date[]
  holidays: Date[]
  
  // Configurações
  visitDurationDefault: number // minutos
  visitBufferTime: number // tempo entre visitas em minutos
  maxVisitsPerDay: number
  
  // Agentes disponíveis
  availableAgents: VisitAgent[]
  
  // Metadados
  createdAt: Date
  updatedAt: Date
}

export interface WorkingHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface DaySchedule {
  isWorkingDay: boolean
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  lunchBreak?: {
    startTime: string
    endTime: string
  }
  maxVisits?: number // máximo de visitas por dia
}

export interface VisitAgent {
  id: string
  name: string
  phone: string
  email?: string
  isActive: boolean
  
  // Especialidades
  specialties?: string[] // tipos de propriedade que mais conhece
  languages?: string[]
  
  // Disponibilidade específica (se diferente da geral)
  customSchedule?: Partial<WorkingHours>
  unavailableDates?: Date[]
}

// Slot de tempo disponível
export interface AvailableTimeSlot {
  date: Date
  time: string // "HH:MM"
  duration: number
  agentId?: string
  agentName?: string
}

// Filtros para busca de disponibilidade
export interface VisitAvailabilityFilters {
  startDate: Date
  endDate: Date
  preferredTimes?: string[] // ["morning", "afternoon", "evening"]
  preferredDays?: number[] // [1, 2, 3, 4, 5] = seg-sex
  agentId?: string
}

// Preferências de horário
export enum TimePreference {
  MORNING = 'morning',     // 08:00-12:00
  AFTERNOON = 'afternoon', // 12:00-18:00
  EVENING = 'evening'      // 18:00-21:00
}

// Labels para exibição
export const VISIT_STATUS_LABELS = {
  [VisitStatus.SCHEDULED]: 'Agendada',
  [VisitStatus.CONFIRMED]: 'Confirmada',
  [VisitStatus.IN_PROGRESS]: 'Em Andamento',
  [VisitStatus.COMPLETED]: 'Concluída',
  [VisitStatus.CANCELLED_BY_CLIENT]: 'Cancelada pelo Cliente',
  [VisitStatus.CANCELLED_BY_AGENT]: 'Cancelada pela Imobiliária',
  [VisitStatus.NO_SHOW]: 'Cliente não Compareceu',
  [VisitStatus.RESCHEDULED]: 'Reagendada'
}

export const TIME_PREFERENCE_LABELS = {
  [TimePreference.MORNING]: 'Manhã (08h-12h)',
  [TimePreference.AFTERNOON]: 'Tarde (12h-18h)',  
  [TimePreference.EVENING]: 'Noite (18h-21h)'
}

// Cores para status
export const VISIT_STATUS_COLORS = {
  [VisitStatus.SCHEDULED]: '#FF9800',
  [VisitStatus.CONFIRMED]: '#4CAF50',
  [VisitStatus.IN_PROGRESS]: '#2196F3',
  [VisitStatus.COMPLETED]: '#4CAF50',
  [VisitStatus.CANCELLED_BY_CLIENT]: '#F44336',
  [VisitStatus.CANCELLED_BY_AGENT]: '#F44336',
  [VisitStatus.NO_SHOW]: '#9C27B0',
  [VisitStatus.RESCHEDULED]: '#FF5722'
}