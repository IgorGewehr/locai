// app/api/admin/tickets/[id]/status/route.ts
// Atualizar status do ticket

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { UpdateTicketStatusSchema, formatZodErrors } from '@/lib/validations/admin-schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract ticketId from params
    const { id: ticketId } = await params;

    // Verificar acesso admin
    const { isAdmin, user } = await verifyAdminAccess(request);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = UpdateTicketStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: formatZodErrors(validation.error)
        },
        { status: 400 }
      );
    }

    const { status, tenantId, comment } = validation.data;
    
    // Se não tiver tenantId, precisamos buscar em todos os tenants
    let ticketTenantId = tenantId;
    
    if (!ticketTenantId) {
      // Buscar o ticket em todos os tenants para descobrir o tenantId correto
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tid = tenantDoc.id;
        const ticketRef = doc(db, `tenants/${tid}/tickets`, ticketId);
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
      ticketId,
      newStatus: status,
      tenantId: ticketTenantId
    });
    
    // Atualizar o status do ticket
    const ticketRef = doc(db, `tenants/${ticketTenantId}/tickets`, ticketId);
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
      ticketId,
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