/**
 * OWNER CHANNEL SETTINGS API ROUTE
 *
 * Gerencia o WhatsApp do dono que recebe os avisos da Sofia (handoff).
 * Caminho canônico: tenants/{tenantId}/config/owner-channel.ownerWhatsappPhone
 *
 * O número é sempre normalizado (mesma forma usada nos blocks da IA: sem
 * sufixos de JID e com DDI 55) para casar com getOwnerWhatsappPhone().
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import { normalizeBlockPhone } from '@/lib/utils/ai-block';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Aceita números com DDI/DDD, espaços, parênteses e hífens. A normalização
// remove tudo o que não for dígito e garante o DDI 55.
const OwnerChannelSchema = z.object({
  ownerWhatsappPhone: z
    .string()
    .trim()
    .min(8, 'Telefone muito curto')
    .max(25, 'Telefone muito longo')
    .regex(/^[\d+()\s-]+$/, 'Use apenas números, espaços, +, ( ) ou -'),
});

/**
 * GET /api/tenant/settings/owner-channel
 *
 * Retorna o WhatsApp do dono configurado (normalizado), ou null se não houver.
 */
export async function GET(request: NextRequest) {
  const requestId = `get-owner-channel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    let ownerWhatsappPhone: string | null = null;

    try {
      const services = new TenantServiceFactory(tenantId);
      const docRef = doc(services.db, 'tenants', tenantId, 'config', 'owner-channel');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        ownerWhatsappPhone = (data?.ownerWhatsappPhone as string) || null;
      }
    } catch (firestoreError) {
      logger.error(
        '[GET-OWNER-CHANNEL] Firestore error',
        firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError))
      );
    }

    return NextResponse.json({
      success: true,
      data: { ownerWhatsappPhone },
      meta: { requestId, processingTime: Date.now() - startTime, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error(
      '[GET-OWNER-CHANNEL] Request failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return handleApiError(error);
  }
}

/**
 * PUT /api/tenant/settings/owner-channel
 *
 * Grava o WhatsApp do dono (normalizado) no caminho canônico.
 */
export async function PUT(request: NextRequest) {
  const requestId = `update-owner-channel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const validation = OwnerChannelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Normaliza para a forma canônica (sem sufixo JID, com DDI 55), igual ao
    // que getOwnerWhatsappPhone() espera ler.
    const normalizedPhone = normalizeBlockPhone(validation.data.ownerWhatsappPhone);

    // Sanity check: precisa ter ao menos 10 dígitos depois de normalizar
    // (55 + DDD de 2 + número). Evita gravar lixo.
    if (normalizedPhone.replace(/\D/g, '').length < 12) {
      return NextResponse.json(
        {
          success: false,
          error: 'Número de WhatsApp inválido. Inclua DDD e número (ex: 11 99999-9999).',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const services = new TenantServiceFactory(tenantId);
    const docRef = doc(services.db, 'tenants', tenantId, 'config', 'owner-channel');

    try {
      await setDoc(
        docRef,
        {
          ownerWhatsappPhone: normalizedPhone,
          updatedAt: serverTimestamp(),
          updatedBy: authContext.userId || 'system',
        },
        { merge: true }
      );
    } catch (firestoreError) {
      logger.error(
        '[UPDATE-OWNER-CHANNEL] Firestore save failed',
        firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError))
      );
      throw new Error('Failed to save owner channel to database');
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp do dono atualizado com sucesso',
      data: { ownerWhatsappPhone: normalizedPhone },
      meta: { requestId, processingTime: Date.now() - startTime, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error(
      '[UPDATE-OWNER-CHANNEL] Request failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return handleApiError(error);
  }
}
