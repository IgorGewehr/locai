// CRM Types for Enterprise-level Customer Relationship Management

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  OPPORTUNITY = 'opportunity',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  NURTURING = 'nurturing'
}

export enum LeadSource {
  WHATSAPP_AI = 'whatsapp_ai',
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  GOOGLE_ADS = 'google_ads',
  MANUAL = 'manual',
  EMAIL = 'email',
  PHONE = 'phone',
  WALK_IN = 'walk_in',
  OTHER = 'other'
}

export enum InteractionType {
  WHATSAPP_MESSAGE = 'whatsapp_message',
  PHONE_CALL = 'phone_call',
  EMAIL = 'email',
  VISIT = 'visit',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  PROPERTY_VIEW = 'property_view',
  QUOTE_SENT = 'quote_sent',
  CONTRACT_SENT = 'contract_sent',
  PAYMENT_RECEIVED = 'payment_received'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Lead {
  id: string;
  tenantId: string;
  
  // Basic Information
  name: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  
  // Lead Details
  status: LeadStatus;
  source: LeadSource;
  sourceDetails?: string; // e.g., specific campaign, referrer name
  
  // Scoring and Qualification
  score: number; // 0-100
  temperature: 'cold' | 'warm' | 'hot';
  qualificationCriteria: {
    budget: boolean;
    authority: boolean;
    need: boolean;
    timeline: boolean;
  };
  
  // Preferences and Requirements
  preferences: {
    propertyType?: string[];
    location?: string[];
    priceRange?: { min: number; max: number };
    bedrooms?: { min: number; max: number };
    amenities?: string[];
    moveInDate?: Date;
    stayDuration?: 'short' | 'medium' | 'long';
  };
  
  // Assignment and Ownership
  assignedTo?: string; // User ID
  assignedAt?: Date;
  
  // Analytics
  firstContactDate: Date;
  lastContactDate: Date;
  totalInteractions: number;
  averageResponseTime?: number; // in minutes
  
  // Conversion
  convertedToClientAt?: Date;
  clientId?: string;
  wonValue?: number;
  lostReason?: string;
  
  // AI Insights
  aiInsights?: {
    predictedValue: number;
    conversionProbability: number;
    recommendedActions: string[];
    personalityProfile?: string;
    communicationPreference?: string;
  };
  
  // Metadata
  tags: string[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  id: string;
  leadId: string;
  clientId?: string;
  tenantId: string;
  
  // Interaction Details
  type: InteractionType;
  channel?: 'whatsapp' | 'phone' | 'email' | 'in_person' | 'website';
  direction: 'inbound' | 'outbound';
  
  // Content
  subject?: string;
  content: string;
  attachments?: {
    type: 'image' | 'document' | 'audio' | 'video';
    url: string;
    name?: string;
  }[];
  
  // Context
  propertyId?: string; // If interaction is about a specific property
  reservationId?: string; // If related to a reservation
  campaignId?: string; // If part of a campaign
  
  // Participants
  userId: string; // Who from the team interacted
  userName?: string;
  
  // Outcomes
  sentiment?: 'positive' | 'neutral' | 'negative';
  nextSteps?: string;
  followUpDate?: Date;
  
  // AI Analysis
  aiAnalysis?: {
    summary: string;
    keyPoints: string[];
    sentiment: number; // -1 to 1
    intent: string[];
    suggestedActions: string[];
  };
  
  // Metadata
  duration?: number; // For calls/meetings in seconds
  recordingUrl?: string; // For calls
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  tenantId: string;
  
  // Task Details
  title: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'document' | 'other';
  
  // Assignment
  assignedTo: string;
  assignedBy: string;
  leadId?: string;
  clientId?: string;
  
  // Scheduling
  dueDate: Date;
  reminderDate?: Date;
  completedAt?: Date;
  
  // Status
  status: TaskStatus;
  priority: TaskPriority;
  
  // Related Entities
  propertyId?: string;
  reservationId?: string;
  interactionId?: string;
  
  // Completion Details
  outcome?: string;
  notes?: string;
  
  // Recurrence
  isRecurring?: boolean;
  recurrenceRule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  
  // Metadata
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number; // 0-100 chance of closing
  rottenDays?: number; // Days before lead is considered stale
  automations?: {
    onEnter?: string[]; // Automation IDs
    onExit?: string[];
    onRottenDays?: string[];
  };
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'status_change' | 'assignment' | 'interaction' | 'task' | 'note' | 'score_change';
  description: string;
  metadata?: Record<string, any>;
  userId: string;
  createdAt: Date;
}

export interface CRMDashboardStats {
  // Pipeline Overview
  totalLeads: number;
  leadsByStatus: Record<LeadStatus, number>;
  leadsBySource: Record<LeadSource, number>;
  
  // Performance
  conversionRate: number;
  averageClosingTime: number; // in days
  totalRevenue: number;
  averageDealSize: number;
  
  // Activity
  scheduledTasks: number;
  overdueTasks: number;
  todayInteractions: number;
  
  // Team Performance
  leadsByAgent: Array<{
    userId: string;
    userName: string;
    totalLeads: number;
    convertedLeads: number;
    revenue: number;
  }>;
  
  // Trends
  leadsOverTime: Array<{
    date: Date;
    count: number;
    converted: number;
  }>;
  
  // AI Insights
  hotLeads: Lead[];
  suggestedActions: Array<{
    leadId: string;
    leadName: string;
    action: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

// Enhanced Client type for CRM
export interface CRMClient {
  // All existing Client fields plus:
  leadId?: string; // Original lead ID
  lifecycleStage: 'lead' | 'opportunity' | 'customer' | 'evangelist';
  
  // Relationship
  relationshipScore: number; // 0-100
  lastInteractionDate: Date;
  nextInteractionDate?: Date;
  interactionFrequency: number; // interactions per month
  
  // Business Value
  lifetimeValue: number;
  averageBookingValue: number;
  bookingFrequency: number; // bookings per year
  referralValue: number; // revenue from referrals
  
  // Engagement
  engagementScore: number; // 0-100
  preferredContactTime?: string;
  preferredContactMethod: 'whatsapp' | 'phone' | 'email';
  responseRate: number; // percentage
  
  // Segmentation
  segment: 'vip' | 'frequent' | 'occasional' | 'new' | 'at_risk' | 'lost';
  personas: string[]; // e.g., 'business_traveler', 'family_vacation'
  
  // Loyalty
  loyaltyPoints?: number;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  memberSince?: Date;
  
  // Risk Indicators
  churnRisk: 'low' | 'medium' | 'high';
  lastComplaint?: Date;
  satisfactionScore?: number; // 1-10
}

// AI-powered features
export interface AILeadScoring {
  leadId: string;
  
  // Behavioral Scoring
  engagementScore: number; // Based on interactions
  intentScore: number; // Based on content analysis
  urgencyScore: number; // Based on timeline mentions
  
  // Fit Scoring
  budgetFitScore: number;
  requirementsFitScore: number;
  locationFitScore: number;
  
  // Predictive Scoring
  conversionProbability: number;
  expectedValue: number;
  expectedClosingDays: number;
  
  // Recommendations
  recommendedProperties: string[];
  recommendedNextAction: string;
  recommendedContactTime: Date;
  personalizedMessage?: string;
  
  calculatedAt: Date;
}

// Automation Rules
export interface CRMAutomation {
  id: string;
  tenantId: string;
  name: string;
  trigger: {
    type: 'lead_created' | 'status_changed' | 'score_changed' | 'time_based' | 'interaction';
    conditions: Record<string, any>;
  };
  actions: Array<{
    type: 'assign_user' | 'send_message' | 'create_task' | 'update_field' | 'send_notification';
    config: Record<string, any>;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}