// lib/types/admin.ts
// Shared type definitions for Admin Panel

import type { Ticket } from './ticket';

/**
 * Admin-specific ticket with tenant context
 */
export interface AdminTicket extends Ticket {
  tenantId: string;
  tenantName: string;
  userEmail?: string;
  userPhone?: string;
  userPlan?: string;
}

/**
 * Onboarding progress tracking
 */
export interface OnboardingProgress {
  completionPercentage: number;
  completedSteps: string[];
  currentStep: string | null;
  isCompleted: boolean;
  totalSteps: number;
  completedStepsCount: number;
}

/**
 * Admin-specific user with comprehensive metrics
 */
export interface AdminUser {
  // Basic Info
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  plan: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date | null;
  lastLogin: Date | null;

  // Metrics
  propertyCount: number;
  reservationCount: number;
  clientCount: number;
  totalTicketsCount: number;
  newTicketsCount: number;

  // Onboarding
  onboardingProgress: OnboardingProgress;

  // Metadata
  metadata: {
    emailVerified: boolean;
    provider: string;
    role: string;
    lastIP: string;
    totalLogins: number;
    tenantId: string;
    tenantName: string;
  };
}

/**
 * Tenant statistics for admin overview
 */
export interface TenantStats {
  tenantId: string;
  tenantName: string;

  // Counts
  totalProperties: number;
  totalReservations: number;
  totalClients: number;
  totalTickets: number;

  // Status breakdown
  activeProperties: number;
  pendingReservations: number;
  openTickets: number;

  // Activity
  lastActivity: Date | null;
  createdAt: Date | null;

  // Plan info
  plan: string;
  status: 'active' | 'inactive' | 'suspended';
}

/**
 * Generic admin API response wrapper
 */
export interface AdminAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  meta?: {
    timestamp: string;
    processingTime: string;
    requestId?: string;
    dataVersion?: string;
  };
}

/**
 * Admin authentication context
 */
export interface AdminAuthContext {
  isAdmin: boolean;
  user: {
    uid: string;
    email: string;
    idog?: boolean;
  } | null;
  sessionId?: string;
}

/**
 * Ticket filter options
 */
export interface TicketFilters {
  status?: 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  tenantId?: string;
  search?: string;
}

/**
 * User filter options
 */
export interface UserFilters {
  status?: 'all' | 'active' | 'inactive' | 'suspended';
  plan?: 'all' | 'free' | 'pro' | 'enterprise';
  onboarding?: 'all' | 'completed' | 'in_progress' | 'not_started';
  tenantId?: string;
  search?: string;
}

/**
 * Sort options for lists
 */
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
}

/**
 * Admin ticket reply
 */
export interface TicketReply {
  id?: string;
  ticketId: string;
  message: string;
  author: {
    uid: string;
    name: string;
    role: 'admin' | 'user';
  };
  createdAt: Date;
  attachments?: string[];
}

/**
 * Admin stats summary
 */
export interface AdminStatsSummary {
  totalUsers: number;
  activeUsers: number;
  totalTickets: number;
  openTickets: number;
  totalProperties: number;
  totalReservations: number;

  // Growth metrics
  newUsersThisWeek: number;
  newTicketsThisWeek: number;

  // Performance
  averageResponseTime?: number;
  ticketResolutionRate?: number;
}

/**
 * Ticket status history entry
 */
export interface TicketStatusHistory {
  status: string;
  changedBy: string;
  changedAt: Date;
  role: 'admin' | 'user';
  comment?: string;
}

/**
 * Admin action log entry
 */
export interface AdminActionLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resourceType: 'ticket' | 'user' | 'tenant' | 'system';
  resourceId: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

/**
 * Type guard to check if user has admin access
 */
export function isAdminUser(user: any): user is AdminUser {
  return user && typeof user.id === 'string' && typeof user.email === 'string';
}

/**
 * Type guard for admin API responses
 */
export function isSuccessResponse<T>(
  response: AdminAPIResponse<T>
): response is AdminAPIResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}
