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
import { useTenant } from '@/contexts/TenantContext';
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
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
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

    logger.info('🎫 Buscando tickets', { 
      tenantId, 
      page, 
      limit, 
      filters: { status, priority, type, assignedTo, userId, search }
    });

    // Build query
    const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
    let ticketQuery = query(ticketsRef, orderBy('updatedAt', 'desc'));

    // Apply filters
    if (status && status.length > 0) {
      ticketQuery = query(ticketQuery, where('status', 'in', status));
    }
    
    if (priority && priority.length > 0) {
      ticketQuery = query(ticketQuery, where('priority', 'in', priority));
    }
    
    if (type && type.length > 0) {
      ticketQuery = query(ticketQuery, where('type', 'in', type));
    }
    
    if (assignedTo) {
      ticketQuery = query(ticketQuery, where('assignedTo', '==', assignedTo));
    }
    
    if (userId) {
      ticketQuery = query(ticketQuery, where('userId', '==', userId));
    }

    // Get total count
    const countSnapshot = await getCountFromServer(ticketQuery);
    const total = countSnapshot.data().count;

    // Apply pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      // For pagination, we need to get the document at the offset position
      const offsetQuery = query(ticketQuery, limitQuery(offset));
      const offsetSnapshot = await getDocs(offsetQuery);
      const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
      
      if (lastDoc) {
        ticketQuery = query(ticketQuery, startAfter(lastDoc), limitQuery(limit));
      }
    } else {
      ticketQuery = query(ticketQuery, limitQuery(limit));
    }

    const snapshot = await getDocs(ticketQuery);
    
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

    logger.info('✅ Tickets encontrados', { count: tickets.length, total });
    
    return NextResponse.json(response);

  } catch (error) {
    logger.error('❌ Erro ao buscar tickets', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const body: CreateTicketRequest & { 
      tenantId: string; 
      userId: string; 
      userName: string; 
      userEmail: string; 
    } = await request.json();

    const { tenantId, userId, userName, userEmail, ...ticketData } = body;

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

    logger.info('🎫 Criando novo ticket', { 
      tenantId, 
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
      category: ticketData.category,
    };

    const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
    const docRef = await addDoc(ticketsRef, newTicket);

    logger.info('✅ Ticket criado', { ticketId: docRef.id });
    
    return NextResponse.json({ 
      id: docRef.id,
      message: 'Ticket criado com sucesso' 
    }, { status: 201 });

  } catch (error) {
    logger.error('❌ Erro ao criar ticket', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}