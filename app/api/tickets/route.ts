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
    const constraints: any[] = [];

    // Apply filters - Note: Firestore requires composite indexes for multiple filters with orderBy
    // For now, we'll prioritize filtering and do sorting client-side if needed
    let hasFilters = false;
    
    if (status && status.length > 0) {
      constraints.push(where('status', 'in', status));
      hasFilters = true;
    }
    
    if (priority && priority.length > 0) {
      constraints.push(where('priority', 'in', priority));
      hasFilters = true;
    }
    
    if (type && type.length > 0) {
      constraints.push(where('type', 'in', type));
      hasFilters = true;
    }
    
    if (assignedTo) {
      constraints.push(where('assignedTo', '==', assignedTo));
      hasFilters = true;
    }
    
    if (userId) {
      constraints.push(where('userId', '==', userId));
      hasFilters = true;
    }

    // Only add orderBy if no other filters (to avoid index requirement)
    // Or add it with filters if indexes are created
    if (!hasFilters) {
      constraints.push(orderBy('updatedAt', 'desc'));
    }

    let ticketQuery = query(ticketsRef, ...constraints);

    // Get total count - use a simpler query if we have complex constraints
    let total = 0;
    try {
      if (hasFilters) {
        // For filtered queries, get all documents and count them
        const countSnapshot = await getDocs(ticketQuery);
        total = countSnapshot.docs.length;
      } else {
        // For unfiltered queries, use the count server method
        const countSnapshot = await getCountFromServer(ticketQuery);
        total = countSnapshot.data().count;
      }
    } catch (error) {
      // Fallback to getting all docs if count fails
      logger.tenantWarn('⚠️ Count query failed, usando fallback', tenantId, { error: error.message });
      const countSnapshot = await getDocs(query(ticketsRef, where('userId', '==', userId)));
      total = countSnapshot.docs.length;
    }
    
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

    // Apply pagination - simple limit approach since we're not using orderBy with filters
    let paginatedQuery;
    
    if (hasFilters) {
      // With filters, use simple limit (sorting will be done client-side)
      paginatedQuery = query(ticketsRef, ...constraints, limitQuery(limit * page));
    } else {
      // No filters, can use proper pagination with orderBy
      const offset = (page - 1) * limit;
      if (offset > 0) {
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

    // If we had filters, sort client-side and apply pagination
    if (hasFilters) {
      // Sort by updatedAt descending
      tickets.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.()?.getTime() || 0;
        const bTime = b.updatedAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      // Apply client-side pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      tickets = tickets.slice(startIndex, endIndex);
    }

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