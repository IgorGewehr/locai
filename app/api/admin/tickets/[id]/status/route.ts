// app/api/admin/tickets/[id]/status/route.ts
// Atualizar status do ticket

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

export async function PATCH(
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
    const { status, tenantId } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status é obrigatório' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }
    
    // Se não tiver tenantId, precisamos buscar em todos os tenants
    let ticketTenantId = tenantId;
    
    if (!ticketTenantId) {
      // Buscar o ticket em todos os tenants para descobrir o tenantId correto
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tid = tenantDoc.id;
        const ticketRef = doc(db, `tenants/${tid}/tickets`, params.id);
        const { getDoc } = await import('firebase/firestore');
        const ticketDoc = await getDoc(ticketRef);
        
        if (ticketDoc.exists()) {
          ticketTenantId = tid;
          break;
        }
      }
    }
    
    if (!ticketTenantId) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    logger.info('🔄 [Admin API] Atualizando status do ticket', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId: params.id,
      newStatus: status,
      tenantId: ticketTenantId
    });
    
    // Atualizar o status do ticket
    const ticketRef = doc(db, `tenants/${ticketTenantId}/tickets`, params.id);
    await updateDoc(ticketRef, {
      status,
      updatedAt: serverTimestamp(),
      lastUpdatedBy: user?.uid,
      lastUpdatedByRole: 'admin',
      statusHistory: {
        status,
        changedBy: user?.uid,
        changedAt: serverTimestamp(),
        role: 'admin'
      }
    });
    
    logger.info('✅ [Admin API] Status atualizado com sucesso', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId: params.id,
      newStatus: status
    });
    
    return NextResponse.json({
      success: true,
      message: 'Status atualizado com sucesso'
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro ao atualizar status', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}