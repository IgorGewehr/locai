import { NextRequest, NextResponse } from 'next/server';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Ticket, 
  UpdateTicketRequest,
  TicketDetailResponse,
  TicketResponse
} from '@/lib/types/ticket';
import { logger } from '@/lib/utils/logger';

// GET /api/tickets/[id] - Get ticket details with responses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: ticketId } = await params;
    
    logger.info('🎫 Buscando ticket', { ticketId, tenantId });

    // Get ticket
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
    
    const responses: TicketResponse[] = responsesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // ✅ Normalizar campos para compatibilidade
        content: data.content || data.message || '',  // Suporte a ambos os campos
        isAdmin: data.isAdmin !== undefined ? data.isAdmin : data.authorRole === 'admin',  // Normalizar isAdmin
        // Garantir que updatedAt existe
        updatedAt: data.updatedAt || data.createdAt
      } as TicketResponse;
    });

    const ticket: Ticket = {
      id: ticketDoc.id,
      ...ticketDoc.data(),
      responses
    } as Ticket;

    const response: TicketDetailResponse = {
      ticket,
      responses
    };

    logger.info('✅ Ticket encontrado', { ticketId, responseCount: responses.length });
    
    return NextResponse.json(response);

  } catch (error) {
    logger.error('❌ Erro ao buscar ticket', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: UpdateTicketRequest & { tenantId: string } = await request.json();
    const { tenantId, ...updateData } = body;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    const { id: ticketId } = await params;
    
    logger.info('🎫 Atualizando ticket', { ticketId, tenantId, updateData });

    const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    const now = Timestamp.now();
    const updateFields: any = {
      ...updateData,
      updatedAt: now
    };

    // Set resolution/close timestamps
    if (updateData.status === 'resolved' && ticketDoc.data().status !== 'resolved') {
      updateFields.resolvedAt = now;
    }
    
    if (updateData.status === 'closed' && ticketDoc.data().status !== 'closed') {
      updateFields.closedAt = now;
    }

    await updateDoc(ticketRef, updateFields);

    logger.info('✅ Ticket atualizado', { ticketId });
    
    return NextResponse.json({ 
      message: 'Ticket atualizado com sucesso' 
    });

  } catch (error) {
    logger.error('❌ Erro ao atualizar ticket', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete ticket (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: ticketId } = await params;
    
    logger.info('🎫 Deletando ticket', { ticketId, tenantId });

    const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    // Delete all responses first
    const responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketId}/responses`);
    const responsesSnapshot = await getDocs(responsesRef);
    
    const deletePromises = responsesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete the ticket
    await deleteDoc(ticketRef);

    logger.info('✅ Ticket deletado', { ticketId });
    
    return NextResponse.json({ 
      message: 'Ticket deletado com sucesso' 
    });

  } catch (error) {
    logger.error('❌ Erro ao deletar ticket', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}