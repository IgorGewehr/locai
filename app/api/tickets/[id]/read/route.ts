import { NextRequest, NextResponse } from 'next/server';
import { 
  doc, 
  getDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';

// POST /api/tickets/[id]/read - Mark ticket as read by user or admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: { 
      tenantId: string; 
      isAdmin: boolean;
    } = await request.json();
    
    const { tenantId, isAdmin } = body;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    const { id: ticketId } = await params;
    
    logger.info('🎫 Marcando ticket como lido', { 
      ticketId, 
      tenantId, 
      isAdmin 
    });

    const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    const updateFields: any = {
      updatedAt: Timestamp.now()
    };

    // Mark as read based on who is reading
    if (isAdmin) {
      updateFields.hasUnreadUserResponses = false;
    } else {
      updateFields.hasUnreadAdminResponses = false;
    }

    await updateDoc(ticketRef, updateFields);

    logger.info('✅ Ticket marcado como lido', { ticketId });
    
    return NextResponse.json({ 
      message: 'Ticket marcado como lido' 
    });

  } catch (error) {
    logger.error('❌ Erro ao marcar ticket como lido', { error: error.message });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}