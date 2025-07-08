export interface Automation {
  id: string
  name: string
  description: string
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  
  // Configuração
  isActive: boolean
  priority: number
  
  // Execução
  lastExecuted?: Date
  executionCount: number
  successRate: number
  
  // Metadados
  tenantId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface AutomationTrigger {
  type: TriggerType
  event: string
  conditions: Record<string, any>
  schedule?: CronSchedule
}

export enum TriggerType {
  MESSAGE_RECEIVED = 'message_received',
  RESERVATION_CREATED = 'reservation_created',
  PAYMENT_OVERDUE = 'payment_overdue',
  CHECK_IN_REMINDER = 'check_in_reminder',
  FOLLOW_UP_DUE = 'follow_up_due',
  SCHEDULED = 'scheduled',
  CLIENT_INACTIVE = 'client_inactive',
  PROPERTY_VIEWED = 'property_viewed',
  PRICE_INQUIRY = 'price_inquiry',
  BOOKING_ABANDONED = 'booking_abandoned'
}

export interface AutomationCondition {
  field: string
  operator: ConditionOperator
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN = 'in',
  NOT_IN = 'not_in'
}

export interface AutomationAction {
  type: ActionType
  configuration: Record<string, any>
  delay?: number
  requiresApproval: boolean
  priority: number
}

export enum ActionType {
  SEND_MESSAGE = 'send_message',
  SEND_MEDIA = 'send_media',
  SEND_TEMPLATE = 'send_template',
  CREATE_TASK = 'create_task',
  UPDATE_CLIENT = 'update_client',
  SEND_EMAIL = 'send_email',
  WEBHOOK = 'webhook',
  AI_RESPONSE = 'ai_response',
  SCHEDULE_FOLLOW_UP = 'schedule_follow_up',
  APPLY_DISCOUNT = 'apply_discount',
  ESCALATE_TO_HUMAN = 'escalate_to_human',
  UPDATE_CONVERSATION = 'update_conversation',
  SEND_NOTIFICATION = 'send_notification'
}

export interface CronSchedule {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
  timezone: string
}

export interface AutomationExecution {
  id: string
  automationId: string
  triggeredAt: Date
  completedAt?: Date
  status: ExecutionStatus
  error?: string
  results: AutomationResult[]
  context: Record<string, any>
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface AutomationResult {
  actionType: ActionType
  success: boolean
  error?: string
  data?: any
  executedAt: Date
  duration: number
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'trigger' | 'condition' | 'action' | 'delay'
  configuration: Record<string, any>
  nextSteps: string[]
  position: { x: number; y: number }
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  isActive: boolean
  tenantId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: string
  template: Omit<Automation, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  tags: string[]
  isPublic: boolean
  usageCount: number
}

export interface AutomationAnalytics {
  automationId: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  lastExecuted?: Date
  executionsByDay: { date: Date; count: number }[]
  mostCommonErrors: { error: string; count: number }[]
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  priority: number
  conditions: RuleCondition[]
  actions: RuleAction[]
  isActive: boolean
  tenantId: string
}

export interface RuleCondition {
  field: string
  operator: string
  value: any
  type: 'property' | 'client' | 'conversation' | 'reservation' | 'date' | 'time'
}

export interface RuleAction {
  type: string
  configuration: Record<string, any>
  delay?: number
}