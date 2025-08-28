import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  addDoc, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  TicketResponse,
  CreateTicketResponseRequest
} from '@/lib/types/ticket';
import { logger } from '@/lib/utils/logger';

// GET /api/tickets/[id]/responses - Get ticket responses
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    const ticketId = params.id;
    
    logger.info('🎫 Buscando respostas do ticket', { ticketId, tenantId });

    // Verify ticket exists
    const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    // Get responses
    const responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketId}/responses`);
    const responsesQuery = query(responsesRef, orderBy('createdAt', 'asc'));
    const responsesSnapshot = await getDocs(responsesQuery);
    
    const responses: TicketResponse[] = responsesSnapshot.docs.map(doc => ({
      id: doc.id,
      ticketId,
      ...doc.data()
    } as TicketResponse));

    logger.info('✅ Respostas encontradas', { ticketId, count: responses.length });
    
    return NextResponse.json({ responses });

  } catch (error) {
    logger.error('❌ Erro ao buscar respostas', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/responses - Add response to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: CreateTicketResponseRequest & { tenantId: string } = await request.json();
    const { tenantId, ...responseData } = body;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    if (!responseData.content?.trim()) {
      return NextResponse.json(
        { error: 'Conteúdo da resposta é obrigatório' },
        { status: 400 }
      );
    }

    const ticketId = params.id;
    
    logger.info('🎫 Adicionando resposta ao ticket', { 
      ticketId, 
      tenantId, 
      isAdmin: responseData.isAdmin 
    });

    // Verify ticket exists
    const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    const now = Timestamp.now();
    
    // Create response
    const newResponse: Omit<TicketResponse, 'id'> = {
      ticketId,
      content: responseData.content.trim(),
      isAdmin: responseData.isAdmin,
      authorId: responseData.authorId,
      authorName: responseData.authorName,
      authorEmail: responseData.authorEmail,
      createdAt: now,
      updatedAt: now,
    };

    const responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketId}/responses`);
    const docRef = await addDoc(responsesRef, newResponse);

    // Update ticket metadata
    const ticketData = ticketDoc.data();
    const currentResponseCount = ticketData.responseCount || 0;
    
    const ticketUpdates: any = {
      responseCount: currentResponseCount + 1,
      updatedAt: now,
    };

    // Update unread flags
    if (responseData.isAdmin) {
      ticketUpdates.hasUnreadAdminResponses = true;
      ticketUpdates.hasUnreadUserResponses = false;
    } else {
      ticketUpdates.hasUnreadUserResponses = true;
      ticketUpdates.hasUnreadAdminResponses = false;
    }

    // If ticket was resolved/closed, reopen it for user responses
    if (!responseData.isAdmin && ['resolved', 'closed'].includes(ticketData.status)) {
      ticketUpdates.status = 'in_progress';
    }

    await updateDoc(ticketRef, ticketUpdates);

    logger.info('✅ Resposta adicionada', { 
      ticketId, 
      responseId: docRef.id,
      newResponseCount: currentResponseCount + 1
    });
    
    return NextResponse.json({ 
      id: docRef.id,
      message: 'Resposta adicionada com sucesso' 
    }, { status: 201 });

  } catch (error) {
    logger.error('❌ Erro ao adicionar resposta', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}