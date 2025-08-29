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

    // Build query
    const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
    const constraints: any[] = [orderBy('updatedAt', 'desc')];

    // Apply filters
    if (status && status.length > 0) {
      constraints.push(where('status', 'in', status));
    }
    
    if (priority && priority.length > 0) {
      constraints.push(where('priority', 'in', priority));
    }
    
    if (type && type.length > 0) {
      constraints.push(where('type', 'in', type));
    }
    
    if (assignedTo) {
      constraints.push(where('assignedTo', '==', assignedTo));
    }
    
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }

    let ticketQuery = query(ticketsRef, ...constraints);

    // Get total count
    const countSnapshot = await getCountFromServer(ticketQuery);
    const total = countSnapshot.data().count;
    
    // If no tickets, return empty result
    if (total === 0) {
      const response: TicketsResponse = {
        tickets: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
      
      logger.tenantInfo('✅ Nenhum ticket encontrado', tenantId);
      return NextResponse.json(response);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    let paginatedQuery;
    
    if (offset > 0) {
      // For pagination, we need to get the document at the offset position
      const offsetQuery = query(ticketsRef, ...constraints, limitQuery(offset));
      const offsetSnapshot = await getDocs(offsetQuery);
      
      if (offsetSnapshot.docs.length > 0) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        paginatedQuery = query(ticketsRef, ...constraints, startAfter(lastDoc), limitQuery(limit));
      } else {
        // No documents at this offset, return empty result
        const response: TicketsResponse = {
          tickets: [],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
        
        logger.tenantInfo('✅ Página vazia', tenantId, { page, offset });
        return NextResponse.json(response);
      }
    } else {
      paginatedQuery = query(ticketsRef, ...constraints, limitQuery(limit));
    }

    const snapshot = await getDocs(paginatedQuery);
    
    let tickets: TicketListItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        subject: data.subject,
        type: data.type,
        priority: data.priority,
        status: data.status,
        userName: data.userName,
        userEmail: data.userEmail,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        responseCount: data.responseCount || 0,
        hasUnreadAdminResponses: data.hasUnreadAdminResponses || false,
        hasUnreadUserResponses: data.hasUnreadUserResponses || false,
        assignedToName: data.assignedToName,
      };
    });

    // Apply search filter (client-side for now)
    if (search) {
      const searchLower = search.toLowerCase();
      tickets = tickets.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.userName.toLowerCase().includes(searchLower) ||
        ticket.userEmail.toLowerCase().includes(searchLower)
      );
    }

    const totalPages = Math.ceil(total / limit);

    const response: TicketsResponse = {
      tickets,
      total,
      page,
      limit,
      totalPages,
    };

    logger.tenantInfo('✅ Tickets encontrados', tenantId, { count: tickets.length, total });
    
    return NextResponse.json(response);

  } catch (error) {
    if (tenantId) {
      logger.tenantError('❌ Erro ao buscar tickets', error as Error, tenantId, { endpoint: 'GET /api/tickets' });
    } else {
      logger.error('❌ Erro ao buscar tickets - sem tenantId', error as Error, { endpoint: 'GET /api/tickets' });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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