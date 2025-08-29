import { 
  Ticket, 
  TicketResponse, 
  CreateTicketRequest, 
  UpdateTicketRequest, 
  CreateTicketResponseRequest,
  TicketFilters,
  TicketStats,
  TicketStatus,
  TicketPriority,
  TicketType 
} from '@/lib/types/ticket';
import { MultiTenantFirestoreService } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { Timestamp } from 'firebase/firestore';

/**
 * Enhanced Ticket Service using Multi-tenant Firestore Architecture
 * Follows the established pattern: tenants/{tenantId}/tickets
 */
export class TicketServiceV2 {
  private ticketService: MultiTenantFirestoreService<Ticket>;
  private responseService: MultiTenantFirestoreService<TicketResponse>;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.ticketService = new MultiTenantFirestoreService<Ticket>(tenantId, 'tickets');
    this.responseService = new MultiTenantFirestoreService<TicketResponse>(tenantId, 'ticketResponses');
  }

  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    userName: string,
    userEmail: string,
    ticketData: CreateTicketRequest
  ): Promise<Ticket> {
    try {
      logger.info(`🎫 Creating ticket for tenant ${this.tenantId}`, {
        userId,
        subject: ticketData.subject,
        priority: ticketData.priority,
        type: ticketData.type
      });

      const now = Timestamp.now();
      const ticket: Omit<Ticket, 'id'> = {
        userId,
        userName,
        userEmail,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority || TicketPriority.MEDIUM,
        type: ticketData.type || TicketType.SUPPORT,
        status: TicketStatus.OPEN,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
        tenantId: this.tenantId
      };

      const ticketId = await this.ticketService.create(ticket);
      
      const createdTicket: Ticket = {
        ...ticket,
        id: ticketId
      };

      logger.info(`✅ Ticket created successfully`, {
        tenantId: this.tenantId,
        ticketId,
        userId
      });

      return createdTicket;
    } catch (error) {
      logger.error(`❌ Failed to create ticket for tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get tickets with filtering and pagination
   */
  async getTickets(filters: TicketFilters = {}): Promise<{
    tickets: Ticket[];
    total: number;
    stats: TicketStats;
  }> {
    try {
      const queryFilters: Array<{ field: string; operator: any; value: any }> = [];

      if (filters.status) {
        queryFilters.push({ field: 'status', operator: '==', value: filters.status });
      }
      if (filters.priority) {
        queryFilters.push({ field: 'priority', operator: '==', value: filters.priority });
      }
      if (filters.type) {
        queryFilters.push({ field: 'type', operator: '==', value: filters.type });
      }
      if (filters.userId) {
        queryFilters.push({ field: 'userId', operator: '==', value: filters.userId });
      }

      const options = {
        orderBy: [{ field: 'updatedAt', direction: 'desc' as const }],
        limit: filters.limit || 50
      };

      const tickets = await this.ticketService.list(queryFilters, options);

      // Calculate stats
      const stats = await this.calculateStats();

      logger.info(`📊 Retrieved ${tickets.length} tickets for tenant ${this.tenantId}`, {
        filtersApplied: Object.keys(filters).length,
        totalResults: tickets.length
      });

      return {
        tickets,
        total: tickets.length,
        stats
      };
    } catch (error) {
      logger.error(`❌ Failed to get tickets for tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get tickets for specific user
   */
  async getUserTickets(userId: string, limit = 10): Promise<Ticket[]> {
    try {
      const queryFilters = [
        { field: 'userId', operator: '==', value: userId }
      ];

      const options = {
        orderBy: [{ field: 'updatedAt', direction: 'desc' as const }],
        limit
      };

      const tickets = await this.ticketService.list(queryFilters, options);

      logger.info(`👤 Retrieved ${tickets.length} tickets for user ${userId}`, {
        tenantId: this.tenantId,
        userId
      });

      return tickets;
    } catch (error) {
      logger.error(`❌ Failed to get user tickets:`, error);
      throw error;
    }
  }

  /**
   * Get ticket with responses
   */
  async getTicketDetail(ticketId: string): Promise<{
    ticket: Ticket;
    responses: TicketResponse[];
  }> {
    try {
      const ticket = await this.ticketService.getById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const responses = await this.getTicketResponses(ticketId);

      logger.info(`🔍 Retrieved ticket details`, {
        tenantId: this.tenantId,
        ticketId,
        responseCount: responses.length
      });

      return { ticket, responses };
    } catch (error) {
      logger.error(`❌ Failed to get ticket detail:`, error);
      throw error;
    }
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, updates: UpdateTicketRequest): Promise<void> {
    try {
      await this.ticketService.update(ticketId, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      logger.info(`✏️ Ticket updated successfully`, {
        tenantId: this.tenantId,
        ticketId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error(`❌ Failed to update ticket:`, error);
      throw error;
    }
  }

  /**
   * Delete ticket and all responses
   */
  async deleteTicket(ticketId: string): Promise<void> {
    try {
      // Delete all responses first
      const responses = await this.getTicketResponses(ticketId);
      for (const response of responses) {
        if (response.id) {
          await this.responseService.delete(response.id);
        }
      }

      // Delete the ticket
      await this.ticketService.delete(ticketId);

      logger.info(`🗑️ Ticket deleted successfully`, {
        tenantId: this.tenantId,
        ticketId,
        deletedResponses: responses.length
      });
    } catch (error) {
      logger.error(`❌ Failed to delete ticket:`, error);
      throw error;
    }
  }

  /**
   * Add response to ticket
   */
  async addResponse(
    ticketId: string,
    responseData: CreateTicketResponseRequest,
    isAdminResponse = false
  ): Promise<TicketResponse> {
    try {
      const now = Timestamp.now();
      const response: Omit<TicketResponse, 'id'> = {
        ticketId,
        userId: responseData.userId,
        userName: responseData.userName,
        userEmail: responseData.userEmail,
        message: responseData.message,
        isAdminResponse,
        isRead: false,
        createdAt: now,
        tenantId: this.tenantId
      };

      const responseId = await this.responseService.create(response);

      // Update ticket status if specified
      const updates: Partial<Ticket> = {
        updatedAt: now
      };

      if (responseData.newStatus) {
        updates.status = responseData.newStatus;
      }

      // Increment unread count if it's an admin response
      if (isAdminResponse) {
        const ticket = await this.ticketService.getById(ticketId);
        if (ticket) {
          updates.unreadCount = (ticket.unreadCount || 0) + 1;
        }
      }

      await this.ticketService.update(ticketId, updates);

      const createdResponse: TicketResponse = {
        ...response,
        id: responseId
      };

      logger.info(`💬 Response added to ticket`, {
        tenantId: this.tenantId,
        ticketId,
        responseId,
        isAdminResponse
      });

      return createdResponse;
    } catch (error) {
      logger.error(`❌ Failed to add response:`, error);
      throw error;
    }
  }

  /**
   * Get responses for a ticket
   */
  async getTicketResponses(ticketId: string): Promise<TicketResponse[]> {
    try {
      const queryFilters = [
        { field: 'ticketId', operator: '==', value: ticketId }
      ];

      const options = {
        orderBy: [{ field: 'createdAt', direction: 'asc' as const }]
      };

      const responses = await this.responseService.list(queryFilters, options);
      return responses;
    } catch (error) {
      logger.error(`❌ Failed to get ticket responses:`, error);
      throw error;
    }
  }

  /**
   * Mark ticket as read (reset unread count)
   */
  async markAsRead(ticketId: string): Promise<void> {
    try {
      await this.ticketService.update(ticketId, {
        unreadCount: 0,
        updatedAt: Timestamp.now()
      });

      logger.info(`👁️ Ticket marked as read`, {
        tenantId: this.tenantId,
        ticketId
      });
    } catch (error) {
      logger.error(`❌ Failed to mark ticket as read:`, error);
      throw error;
    }
  }

  /**
   * Calculate ticket statistics
   */
  private async calculateStats(): Promise<TicketStats> {
    try {
      // Get all tickets for stats calculation
      const allTickets = await this.ticketService.list([]);

      const stats: TicketStats = {
        total: allTickets.length,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0
      };

      allTickets.forEach(ticket => {
        // Status counts
        switch (ticket.status) {
          case TicketStatus.OPEN:
            stats.open++;
            break;
          case TicketStatus.IN_PROGRESS:
            stats.inProgress++;
            break;
          case TicketStatus.RESOLVED:
            stats.resolved++;
            break;
          case TicketStatus.CLOSED:
            stats.closed++;
            break;
        }

        // Priority counts
        switch (ticket.priority) {
          case TicketPriority.HIGH:
            stats.highPriority++;
            break;
          case TicketPriority.MEDIUM:
            stats.mediumPriority++;
            break;
          case TicketPriority.LOW:
            stats.lowPriority++;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error(`❌ Failed to calculate stats:`, error);
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0
      };
    }
  }
}