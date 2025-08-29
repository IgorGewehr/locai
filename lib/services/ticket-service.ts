import {
  Ticket,
  TicketListItem,
  TicketResponse,
  CreateTicketRequest,
  UpdateTicketRequest,
  CreateTicketResponseRequest,
  TicketsResponse,
  TicketDetailResponse,
  TicketFilters,
  TicketStats
} from '@/lib/types/ticket';
import { logger } from '@/lib/utils/logger';

export class TicketService {
  private baseUrl = '/api/tickets';

  // Create a new ticket
  async createTicket(
    tenantId: string,
    userId: string,
    userName: string,
    userEmail: string,
    ticketData: CreateTicketRequest
  ): Promise<{ id: string }> {
    try {
      logger.tenantInfo('🎫 Criando ticket', tenantId, { userId, subject: ticketData.subject });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          userId,
          userName,
          userEmail,
          ...ticketData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar ticket');
      }

      const result = await response.json();
      logger.tenantInfo('✅ Ticket criado', tenantId, { ticketId: result.id });
      
      return result;
    } catch (error) {
      logger.tenantError('❌ Erro ao criar ticket', error as Error, tenantId, { service: 'TicketService.createTicket' });
      throw error;
    }
  }

  // Get tickets with filters and pagination
  async getTickets(
    tenantId: string,
    filters?: TicketFilters,
    page = 1,
    limit = 20
  ): Promise<TicketsResponse> {
    try {
      const searchParams = new URLSearchParams({
        tenantId,
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add filters to search params
      if (filters?.status?.length) {
        searchParams.set('status', filters.status.join(','));
      }
      if (filters?.priority?.length) {
        searchParams.set('priority', filters.priority.join(','));
      }
      if (filters?.type?.length) {
        searchParams.set('type', filters.type.join(','));
      }
      if (filters?.assignedTo) {
        searchParams.set('assignedTo', filters.assignedTo);
      }
      if (filters?.userId) {
        searchParams.set('userId', filters.userId);
      }
      if (filters?.search) {
        searchParams.set('search', filters.search);
      }

      logger.tenantInfo('🎫 Buscando tickets', tenantId, { filters, page, limit });

      const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar tickets');
      }

      const result = await response.json();
      logger.tenantInfo('✅ Tickets encontrados', tenantId, { count: result.tickets.length, total: result.total });
      
      return result;
    } catch (error) {
      logger.tenantError('❌ Erro ao buscar tickets', error as Error, tenantId, { service: 'TicketService.getTickets' });
      throw error;
    }
  }

  // Get user's tickets
  async getUserTickets(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20
  ): Promise<TicketsResponse> {
    return this.getTickets(tenantId, { userId }, page, limit);
  }

  // Get ticket details with responses
  async getTicketDetail(
    tenantId: string,
    ticketId: string
  ): Promise<TicketDetailResponse> {
    try {
      logger.info('🎫 Buscando detalhes do ticket', { tenantId, ticketId });

      const searchParams = new URLSearchParams({ tenantId });
      const response = await fetch(`${this.baseUrl}/${ticketId}?${searchParams.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar ticket');
      }

      const result = await response.json();
      logger.info('✅ Detalhes do ticket encontrados', { 
        ticketId, 
        responseCount: result.responses.length 
      });
      
      return result;
    } catch (error) {
      logger.error('❌ Erro ao buscar detalhes do ticket', { error: error.message });
      throw error;
    }
  }

  // Update ticket
  async updateTicket(
    tenantId: string,
    ticketId: string,
    updateData: UpdateTicketRequest
  ): Promise<void> {
    try {
      logger.info('🎫 Atualizando ticket', { tenantId, ticketId, updateData });

      const response = await fetch(`${this.baseUrl}/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          ...updateData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar ticket');
      }

      logger.info('✅ Ticket atualizado', { ticketId });
    } catch (error) {
      logger.error('❌ Erro ao atualizar ticket', { error: error.message });
      throw error;
    }
  }

  // Delete ticket (admin only)
  async deleteTicket(tenantId: string, ticketId: string): Promise<void> {
    try {
      logger.info('🎫 Deletando ticket', { tenantId, ticketId });

      const searchParams = new URLSearchParams({ tenantId });
      const response = await fetch(`${this.baseUrl}/${ticketId}?${searchParams.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar ticket');
      }

      logger.info('✅ Ticket deletado', { ticketId });
    } catch (error) {
      logger.error('❌ Erro ao deletar ticket', { error: error.message });
      throw error;
    }
  }

  // Add response to ticket
  async addResponse(
    tenantId: string,
    ticketId: string,
    responseData: CreateTicketResponseRequest
  ): Promise<{ id: string }> {
    try {
      logger.info('🎫 Adicionando resposta', { 
        tenantId, 
        ticketId, 
        isAdmin: responseData.isAdmin 
      });

      const response = await fetch(`${this.baseUrl}/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          ...responseData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar resposta');
      }

      const result = await response.json();
      logger.info('✅ Resposta adicionada', { ticketId, responseId: result.id });
      
      return result;
    } catch (error) {
      logger.error('❌ Erro ao adicionar resposta', { error: error.message });
      throw error;
    }
  }

  // Mark ticket as read
  async markAsRead(
    tenantId: string,
    ticketId: string,
    isAdmin: boolean
  ): Promise<void> {
    try {
      logger.info('🎫 Marcando como lido', { tenantId, ticketId, isAdmin });

      const response = await fetch(`${this.baseUrl}/${ticketId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          isAdmin,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao marcar como lido');
      }

      logger.info('✅ Marcado como lido', { ticketId });
    } catch (error) {
      logger.error('❌ Erro ao marcar como lido', { error: error.message });
      throw error;
    }
  }

  // Get ticket statistics (would need separate API endpoint)
  async getTicketStats(tenantId: string): Promise<TicketStats> {
    // For now, calculate from tickets list
    // In production, this should be a separate optimized endpoint
    const allTickets = await this.getTickets(tenantId, {}, 1, 1000);
    
    const stats: TicketStats = {
      total: allTickets.total,
      open: allTickets.tickets.filter(t => t.status === 'open').length,
      inProgress: allTickets.tickets.filter(t => t.status === 'in_progress').length,
      resolved: allTickets.tickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.tickets.filter(t => t.status === 'closed').length,
      averageResponseTime: 0, // Would need calculation
      averageResolutionTime: 0, // Would need calculation
    };

    return stats;
  }
}

// Export singleton instance
export const ticketService = new TicketService();