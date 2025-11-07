import { Timestamp } from 'firebase/firestore';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketType = 'support' | 'bug' | 'feature_request' | 'feedback' | 'question';

export interface TicketResponse {
  id: string;
  ticketId: string;
  content: string;
  isAdmin: boolean;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Ticket {
  id: string;
  tenantId: string;
  subject: string;
  content: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  
  // User information
  userId: string;
  userEmail: string;
  userName: string;
  
  // Admin information (optional)
  assignedTo?: string;
  assignedToName?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  closedAt?: Timestamp;
  
  // Metadata
  responses: TicketResponse[];
  responseCount: number;
  hasUnreadAdminResponses: boolean;
  hasUnreadUserResponses: boolean;
  
  // Tags and categorization
  tags?: string[];
  category?: string;
  
  // Internal tracking
  internalNotes?: string;
  estimatedResolution?: Timestamp;
}

export interface CreateTicketRequest {
  subject: string;
  content: string;
  type: TicketType;
  priority: TicketPriority;
  tags?: string[];
  category?: string;
}

export interface UpdateTicketRequest {
  subject?: string;
  content?: string;
  type?: TicketType;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
  assignedToName?: string;
  tags?: string[];
  category?: string;
  internalNotes?: string;
  estimatedResolution?: Timestamp;
}

export interface CreateTicketResponseRequest {
  content: string;
  isAdmin: boolean;
  authorId: string;
  authorName: string;
  authorEmail?: string;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  type?: TicketType[];
  assignedTo?: string;
  userId?: string;
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  search?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  averageResponseTime: number; // in hours
  averageResolutionTime: number; // in hours
}

// Frontend display types
export interface TicketListItem {
  id: string;
  subject: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  userName: string;
  userEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  responseCount: number;
  hasUnreadAdminResponses: boolean;
  hasUnreadUserResponses: boolean;
  assignedToName?: string;
}

// API Response types
export interface TicketsResponse {
  tickets: TicketListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketDetailResponse {
  ticket: Ticket;
  responses: TicketResponse[];
}