// lib/types/meeting.ts
// Sistema de agendamento de reuniões/eventos gerais

export interface Meeting {
  id: string
  tenantId: string
  
  // Cliente/Participante
  clientName: string
  clientPhone?: string
  clientEmail?: string
  
  // Agendamento
  scheduledDate: Date
  scheduledTime: string // "HH:MM" formato
  duration: number // minutos (padrão 60)
  
  // Detalhes do evento
  title: string
  description: string
  type: MeetingType
  location?: string // endereço físico ou link online
  
  // Status
  status: MeetingStatus
  
  // Participantes adicionais
  participants?: MeetingParticipant[]
  
  // Configurações
  isOnline: boolean
  meetingLink?: string // Zoom, Meet, etc.
  requiresConfirmation: boolean
  
  // Confirmações
  confirmedByClient?: boolean
  confirmedByAgent?: boolean
  
  // Lembretes
  reminderSent?: boolean
  reminderSentAt?: Date
  sendReminderBefore?: number // minutos antes da reunião
  
  // Resultado da reunião
  meetingResult?: MeetingResult
  
  // Metadados
  source: 'whatsapp' | 'website' | 'phone' | 'manual' | 'ai_agent'
  createdAt: Date
  updatedAt: Date
  
  // IA Agent Context
  agentRequestId?: string // Para tracking da requisição da IA
  agentNotes?: string // Notas da IA sobre o contexto da reunião
}

export enum MeetingType {
  CONSULTATION = 'consultation',       // Consultoria geral
  PROPERTY_VIEWING = 'property_viewing', // Visita a propriedade
  CONTRACT_SIGNING = 'contract_signing', // Assinatura de contrato
  NEGOTIATION = 'negotiation',         // Negociação
  FOLLOW_UP = 'follow_up',             // Follow-up com cliente
  PRESENTATION = 'presentation',       // Apresentação de portfólio
  ASSESSMENT = 'assessment',           // Avaliação de propriedade
  OTHER = 'other'                      // Outros tipos
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',             // Agendada
  CONFIRMED = 'confirmed',             // Confirmada por ambas as partes
  IN_PROGRESS = 'in_progress',         // Em andamento
  COMPLETED = 'completed',             // Concluída
  CANCELLED_BY_CLIENT = 'cancelled_by_client',
  CANCELLED_BY_AGENT = 'cancelled_by_agent',
  NO_SHOW = 'no_show',                // Cliente não compareceu
  RESCHEDULED = 'rescheduled'          // Reagendada
}

export interface MeetingParticipant {
  name: string
  phone?: string
  email?: string
  role?: string // 'client', 'agent', 'lawyer', 'other'
}

export interface MeetingResult {
  attended: boolean
  clientSatisfaction?: 'high' | 'medium' | 'low'
  objectiveMet: boolean
  
  // Próximos passos
  followUpNeeded: boolean
  nextAction?: string
  nextMeetingScheduled?: boolean
  nextMeetingDate?: Date
  
  // Notas
  summary?: string
  clientFeedback?: string
  agentNotes?: string
  
  // Resultados comerciais
  leadToReservation?: boolean
  leadToContract?: boolean
  reservationId?: string
  contractId?: string
  
  completedAt: Date
}

// Interface para os argumentos da função de IA
export interface ScheduleMeetingArgs {
  clientName: string
  clientPhone?: string
  clientEmail?: string
  scheduledDate: string      // YYYY-MM-DD format
  scheduledTime: string      // HH:MM format
  duration?: number          // minutos, padrão 60
  title: string
  description: string
  type?: MeetingType         // padrão CONSULTATION
  isOnline?: boolean         // padrão false
  meetingLink?: string       // se isOnline = true
  location?: string          // se isOnline = false
}

// Labels para exibição
export const MEETING_TYPE_LABELS = {
  [MeetingType.CONSULTATION]: 'Consultoria',
  [MeetingType.PROPERTY_VIEWING]: 'Visita à Propriedade',
  [MeetingType.CONTRACT_SIGNING]: 'Assinatura de Contrato',
  [MeetingType.NEGOTIATION]: 'Negociação',
  [MeetingType.FOLLOW_UP]: 'Follow-up',
  [MeetingType.PRESENTATION]: 'Apresentação',
  [MeetingType.ASSESSMENT]: 'Avaliação',
  [MeetingType.OTHER]: 'Outros'
}

export const MEETING_STATUS_LABELS = {
  [MeetingStatus.SCHEDULED]: 'Agendada',
  [MeetingStatus.CONFIRMED]: 'Confirmada',
  [MeetingStatus.IN_PROGRESS]: 'Em Andamento',
  [MeetingStatus.COMPLETED]: 'Concluída',
  [MeetingStatus.CANCELLED_BY_CLIENT]: 'Cancelada pelo Cliente',
  [MeetingStatus.CANCELLED_BY_AGENT]: 'Cancelada pela Imobiliária',
  [MeetingStatus.NO_SHOW]: 'Cliente não Compareceu',
  [MeetingStatus.RESCHEDULED]: 'Reagendada'
}

// Cores para status
export const MEETING_STATUS_COLORS = {
  [MeetingStatus.SCHEDULED]: '#FF9800',
  [MeetingStatus.CONFIRMED]: '#4CAF50', 
  [MeetingStatus.IN_PROGRESS]: '#2196F3',
  [MeetingStatus.COMPLETED]: '#4CAF50',
  [MeetingStatus.CANCELLED_BY_CLIENT]: '#F44336',
  [MeetingStatus.CANCELLED_BY_AGENT]: '#F44336',
  [MeetingStatus.NO_SHOW]: '#9C27B0',
  [MeetingStatus.RESCHEDULED]: '#FF5722'
}