// app/api/admin/tickets/[id]/reply/route.ts
// Responder ticket como admin

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { doc, collection, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { NotificationServiceFactory } from '@/lib/services/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar acesso admin
    const { isAdmin, user } = await verifyAdminAccess(request);
    
    if (!isAdmin) {
      logger.error('❌ [Admin API] Acesso negado para responder ticket', {
        component: 'Admin',
        userId: user?.uid || 'unknown'
      });
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { message, tenantId } = body;
    const { id: ticketId } = await params;
    
    logger.info('📋 [Admin API] Dados recebidos para resposta', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId: ticketId,
      hasMessage: !!message,
      messageLength: message?.length || 0,
      tenantId,
      bodyKeys: Object.keys(body)
    });
    
    if (!message || !message.trim()) {
      logger.error('❌ [Admin API] Mensagem vazia ou inválida', {
        component: 'Admin',
        message: message,
        messageType: typeof message
      });
      return NextResponse.json(
        { error: 'Mensagem é obrigatória e não pode ser vazia' },
        { status: 400 }
      );
    }
    
    if (!tenantId || !tenantId.trim()) {
      logger.error('❌ [Admin API] TenantId vazio ou inválido', {
        component: 'Admin',
        tenantId: tenantId,
        tenantIdType: typeof tenantId
      });
      return NextResponse.json(
        { error: 'TenantId é obrigatório' },
        { status: 400 }
      );
    }
    
    logger.info('💬 [Admin API] Respondendo ticket', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId,
      tenantId
    });
    
    // PRIMEIRA verificação: ver se existe ticket na estrutura nova (tenant-based)
    let ticketExists = false;
    let actualTicketLocation = '';
    
    try {
      const ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
      const ticketDoc = await getDoc(ticketRef);
      
      if (ticketDoc.exists()) {
        ticketExists = true;
        actualTicketLocation = `tenants/${tenantId}/tickets`;
        logger.info('✅ Ticket encontrado na estrutura nova (tenant-based)', {
          component: 'Admin',
          ticketId,
          tenantId,
          location: actualTicketLocation
        });
      }
    } catch (err) {
      logger.warn('Erro ao verificar ticket na estrutura nova:', err as Error);
    }
    
    // Se não existe na estrutura nova, verificar na estrutura antiga
    if (!ticketExists) {
      try {
        const oldTicketRef = doc(db, 'tickets', ticketId);
        const oldTicketDoc = await getDoc(oldTicketRef);
        
        if (oldTicketDoc.exists()) {
          const oldTicketData = oldTicketDoc.data();
          logger.info('📋 Ticket encontrado na estrutura antiga', {
            component: 'Admin',
            ticketId,
            oldTicketTenantId: oldTicketData.tenantId,
            providedTenantId: tenantId,
            location: 'tickets (root)'
          });
          
          // Verificar se o tenantId bate
          if (oldTicketData.tenantId === tenantId) {
            ticketExists = true;
            actualTicketLocation = 'tickets';
          } else {
            logger.error('❌ TenantId não confere com ticket antigo', {
              component: 'Admin',
              ticketId,
              oldTicketTenantId: oldTicketData.tenantId,
              providedTenantId: tenantId
            });
            return NextResponse.json(
              { error: 'Ticket não encontrado ou não pertence ao tenant especificado' },
              { status: 404 }
            );
          }
        }
      } catch (err) {
        logger.warn('Erro ao verificar ticket na estrutura antiga:', err as Error);
      }
    }
    
    if (!ticketExists) {
      logger.error('❌ Ticket não encontrado em nenhuma estrutura', {
        component: 'Admin',
        ticketId,
        tenantId
      });
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }
    
    // Buscar dados do admin
    const adminDoc = await getDoc(doc(db, 'users', user!.uid));
    const adminData = adminDoc.data();
    
    // Criar resposta no ticket (na estrutura correta)
    let responsesRef;
    let ticketRef;
    
    if (actualTicketLocation.startsWith('tenants/')) {
      // Estrutura nova: tenants/{tenantId}/tickets/{ticketId}/responses
      responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketId}/responses`);
      ticketRef = doc(db, `tenants/${tenantId}/tickets`, ticketId);
    } else {
      // Estrutura antiga: tickets/{ticketId}/responses
      responsesRef = collection(db, `tickets/${ticketId}/responses`);
      ticketRef = doc(db, 'tickets', ticketId);
    }
    
    const responseData = {
      content: message,  // ✅ Usar 'content' em vez de 'message'
      message,  // ✅ Manter 'message' para compatibilidade
      authorId: user!.uid,
      authorName: adminData?.name || user!.email || 'Admin',
      authorRole: 'admin',  // Manter para compatibilidade
      isAdmin: true,  // ✅ Adicionar campo 'isAdmin'
      authorEmail: user!.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),  // ✅ Adicionar updatedAt
      isAdminResponse: true,
      metadata: {
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        ticketLocation: actualTicketLocation
      }
    };
    
    logger.info('💬 Criando resposta na estrutura:', {
      component: 'Admin',
      responsesPath: actualTicketLocation.startsWith('tenants/') 
        ? `tenants/${tenantId}/tickets/${ticketId}/responses`
        : `tickets/${ticketId}/responses`,
      ticketLocation: actualTicketLocation
    });
    
    const responseDoc = await addDoc(responsesRef, responseData);
    
    // Atualizar status do ticket para "in_progress" se estiver "open"
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
      
      logger.info('✅ Status do ticket atualizado', {
        component: 'Admin',
        ticketId,
        oldStatus: ticketData.status,
        newStatus: updateData.status || ticketData.status
      });
    }
    
    logger.info('✅ [Admin API] Resposta enviada com sucesso', {
      component: 'Admin',
      adminId: user?.uid,
      ticketId,
      responseId: responseDoc.id
    });

    // Criar notificação para o usuário que criou o ticket
    try {
      const ticketDoc = await getDoc(ticketRef);
      if (ticketDoc.exists()) {
        const ticketData = ticketDoc.data();
        
        // Buscar tenantId do usuário (ticketData.userId = tenantId na nossa estrutura)
        const ticketTenantId = ticketData.userId || ticketData.tenantId;
        
        if (ticketTenantId) {
          const notificationService = NotificationServiceFactory.getInstance(ticketTenantId);
          
          await notificationService.createTicketResponseNotification({
            targetUserId: ticketTenantId, // userId = tenantId na nossa estrutura
            targetUserName: ticketData.userEmail || ticketData.name,
            ticketId: ticketId,
            ticketTitle: ticketData.subject || 'Ticket de Suporte',
            respondedBy: adminData?.name || user!.email || 'Administrador',
            responsePreview: message.substring(0, 150)
          });

          logger.info('🔔 [Admin API] Notificação de resposta criada', {
            component: 'Admin',
            ticketId,
            targetUserId: ticketTenantId
          });
        }
      }
    } catch (notificationError) {
      logger.error('❌ [Admin API] Erro ao criar notificação de resposta', notificationError as Error, {
        component: 'Admin',
        ticketId
      });
      // Não falhar a resposta por causa da notificação
    }
    
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