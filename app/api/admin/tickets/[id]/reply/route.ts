// app/api/admin/tickets/[id]/reply/route.ts
// Responder ticket como admin

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { doc, collection, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar acesso admin
    const { isAdmin, user } = await verifyAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { message, tenantId } = body;
    
    if (!message || !tenantId) {
      return NextResponse.json(
        { error: 'Mensagem e tenantId são obrigatórios' },
        { status: 400 }
      );
    }
    
    const ticketId = params.id;
    
    logger.info('💬 [Admin API] Respondendo ticket', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId,
      tenantId
    });
    
    // Buscar dados do admin
    const adminDoc = await getDoc(doc(db, 'users', user!.uid));
    const adminData = adminDoc.data();
    
    // Criar resposta no ticket
    const responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketId}/responses`);
    const responseData = {
      message,
      authorId: user!.uid,
      authorName: adminData?.name || user!.email || 'Admin',
      authorRole: 'admin',
      authorEmail: user!.email,
      createdAt: serverTimestamp(),
      isAdminResponse: true,
      metadata: {
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    };
    
    const responseDoc = await addDoc(responsesRef, responseData);
    
    // Atualizar status do ticket para "in_progress" se estiver "open"
    const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    const ticketDoc = await getDoc(ticketRef);
    
    if (ticketDoc.exists()) {
      const ticketData = ticketDoc.data();
      const updateData: any = {
        updatedAt: serverTimestamp(),
        lastResponseAt: serverTimestamp(),
        lastResponseBy: 'admin',
        hasAdminResponse: true
      };
      
      // Se o ticket estiver aberto, mudar para em progresso
      if (ticketData.status === 'open') {
        updateData.status = 'in_progress';
      }
      
      await updateDoc(ticketRef, updateData);
    }
    
    logger.info('✅ [Admin API] Resposta enviada com sucesso', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId,
      responseId: responseDoc.id
    });
    
    return NextResponse.json({
      success: true,
      responseId: responseDoc.id,
      message: 'Resposta enviada com sucesso'
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro ao responder ticket', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao responder ticket' },
      { status: 500 }
    );
  }
}