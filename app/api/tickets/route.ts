import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as limitQuery,
  startAfter,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Ticket, 
  CreateTicketRequest, 
  TicketFilters,
  TicketsResponse,
  TicketListItem 
} from '@/lib/types/ticket';
import { logger } from '@/lib/utils/logger';

// GET /api/tickets - List tickets with filters and pagination
export async function GET(request: NextRequest) {
  let tenantId: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status')?.split(',');
    const priority = searchParams.get('priority')?.split(',');
    const type = searchParams.get('type')?.split(',');
    const assignedTo = searchParams.get('assignedTo');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');

    logger.tenantInfo('🎫 Buscando tickets', tenantId, { 
      page, 
      limit, 
      filters: { status, priority, type, assignedTo, userId, search }
    });

    // Build query - simplified approach without composite indexes
    const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
    
    // For now, we'll only use userId filter and do everything else client-side
    // This avoids the need for composite indexes
    let baseQuery;
    let allTickets = [];
    let total = 0;
    
    if (userId) {
      // Get tickets for specific user
      try {
        baseQuery = query(ticketsRef, where('userId', '==', userId));
        const snapshot = await getDocs(baseQuery);
        allTickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        total = allTickets.length;
      } catch (error) {
        // If the query fails due to index requirement, return empty for now
        // This is expected for new users who haven't created tickets yet
        logger.tenantWarn('⚠️ Índice de tickets não disponível, retornando vazio', tenantId, { 
          userId,
          error: error.message 
        });
        allTickets = [];
        total = 0;
      }
    } else {
      // Get all tickets (admin view)
      baseQuery = query(ticketsRef, orderBy('updatedAt', 'desc'));
      
      try {
        const snapshot = await getDocs(baseQuery);
        allTickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        total = allTickets.length;
      } catch (error) {
        // Fallback to getting all tickets without orderBy
        logger.tenantWarn('⚠️ OrderBy falhou, usando query simples', tenantId, { error: error.message });
        const fallbackSnapshot = await getDocs(ticketsRef);
        allTickets = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        total = allTickets.length;
      }
    }
    
    // Apply filters client-side
    let filteredTickets = allTickets;
    
    if (status && status.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => status.includes(ticket.status));
    }
    
    if (priority && priority.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => priority.includes(ticket.priority));
    }
    
    if (type && type.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => type.includes(ticket.type));
    }
    
    if (assignedTo) {
      filteredTickets = filteredTickets.filter(ticket => ticket.assignedTo === assignedTo);
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.subject?.toLowerCase().includes(searchLower) ||
        ticket.userName?.toLowerCase().includes(searchLower) ||
        ticket.userEmail?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by updatedAt descending
    filteredTickets.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.()?.getTime() || 0;
      const bTime = b.updatedAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    // Update total with filtered count
    const filteredTotal = filteredTickets.length;
    
    // If no tickets after filtering, return empty result
    if (filteredTotal === 0) {
      const response: TicketsResponse = {
        tickets: [],
        total: filteredTotal,
        page,
        limit,
        totalPages: 0,
      };
      
      logger.tenantInfo('✅ Nenhum ticket encontrado após filtros', tenantId);
      return NextResponse.json(response);
    }

    // Apply pagination client-side
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
    
    // Convert to TicketListItem format
    const tickets: TicketListItem[] = paginatedTickets.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      userName: ticket.userName,
      userEmail: ticket.userEmail,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      responseCount: ticket.responseCount || 0,
      hasUnreadAdminResponses: ticket.hasUnreadAdminResponses || false,
      hasUnreadUserResponses: ticket.hasUnreadUserResponses || false,
      assignedToName: ticket.assignedToName,
    }));

    const totalPages = Math.ceil(filteredTotal / limit);

    const response: TicketsResponse = {
      tickets,
      total: filteredTotal,
      page,
      limit,
      totalPages,
    };

    logger.tenantInfo('✅ Tickets encontrados', tenantId, { count: tickets.length, total: filteredTotal });
    
    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    if (tenantId) {
      logger.tenantError('❌ Erro ao buscar tickets', error as Error, tenantId, { 
        endpoint: 'GET /api/tickets',
        errorMessage,
        errorStack
      });
    } else {
      logger.error('❌ Erro ao buscar tickets - sem tenantId', error as Error, { 
        endpoint: 'GET /api/tickets',
        errorMessage,
        errorStack
      });
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create new ticket
export async function POST(request: NextRequest) {
  let tenantId: string | null = null;
  
  try {
    const body: CreateTicketRequest & { 
      tenantId: string; 
      userId: string; 
      userName: string; 
      userEmail: string; 
    } = await request.json();

    const { tenantId: bodyTenantId, userId, userName, userEmail, ...ticketData } = body;
    tenantId = bodyTenantId;

    if (!tenantId || !userId || !userName || !userEmail) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: tenantId, userId, userName, userEmail' },
        { status: 400 }
      );
    }

    if (!ticketData.subject?.trim() || !ticketData.content?.trim()) {
      return NextResponse.json(
        { error: 'Assunto e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    logger.tenantInfo('🎫 Criando novo ticket', tenantId, { 
      userId, 
      subject: ticketData.subject 
    });

    const now = Timestamp.now();
    
    const newTicket: Omit<Ticket, 'id'> = {
      tenantId,
      subject: ticketData.subject.trim(),
      content: ticketData.content.trim(),
      type: ticketData.type || 'support',
      priority: ticketData.priority || 'medium',
      status: 'open',
      
      userId,
      userEmail,
      userName,
      
      createdAt: now,
      updatedAt: now,
      
      responses: [],
      responseCount: 0,
      hasUnreadAdminResponses: false,
      hasUnreadUserResponses: false,
      
      tags: ticketData.tags || [],
      ...(ticketData.category && { category: ticketData.category }),
    };

    const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
    const docRef = await addDoc(ticketsRef, newTicket);

    logger.tenantInfo('✅ Ticket criado', tenantId, { ticketId: docRef.id });
    
    return NextResponse.json({ 
      id: docRef.id,
      message: 'Ticket criado com sucesso' 
    }, { status: 201 });

  } catch (error) {
    if (tenantId) {
      logger.tenantError('❌ Erro ao criar ticket', error as Error, tenantId, { endpoint: 'POST /api/tickets' });
    } else {
      logger.error('❌ Erro ao criar ticket - sem tenantId', error as Error, { endpoint: 'POST /api/tickets' });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}