import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { WhatsAppMicroserviceClient } from '@/lib/whatsapp/microservice-client';

/**
 * WhatsApp QR Code API - Endpoint otimizado para buscar QR code
 * 
 * GET: Retorna apenas o QR code atual (se disponível)
 * Usado pelo frontend para polling rápido
 */

// Cache simples para QR codes
const qrCache = new Map<string, {
  qrCode: string;
  timestamp: number;
}>();

const QR_CACHE_TTL = 60000; // 1 minuto

/**
 * GET /api/whatsapp/qr
 * Busca QR code atual da sessão
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTENTICACAO obrigatoria
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const tenantId = user.tenantId;

    // 2. VERIFICAR CACHE primeiro
    const now = Date.now();
    const cached = qrCache.get(tenantId);
    if (cached && (now - cached.timestamp) < QR_CACHE_TTL) {
      return NextResponse.json({
        success: true,
        qrCode: cached.qrCode,
        cached: true,
        expires: new Date(cached.timestamp + QR_CACHE_TTL).toISOString()
      });
    }

    // 3. BUSCAR QR CODE no microservico
    const microserviceClient = new WhatsAppMicroserviceClient();
    const sessionStatus = await microserviceClient.getSessionStatus(tenantId);

    if (sessionStatus.connected) {
      // Se já conectado, limpar cache e retornar status conectado
      qrCache.delete(tenantId);
      return NextResponse.json({
        success: true,
        connected: true,
        phoneNumber: sessionStatus.phone || null,
        businessName: sessionStatus.businessName || null,
        message: 'WhatsApp connected successfully'
      });
    }

    if (sessionStatus.qrCode) {
      // 4. CACHE o QR code
      qrCache.set(tenantId, {
        qrCode: sessionStatus.qrCode,
        timestamp: now
      });

      logger.info('🔲 [QR API] QR code retrieved', {
        tenantId: tenantId.substring(0, 8) + '***',
        status: sessionStatus.status
      });

      return NextResponse.json({
        success: true,
        qrCode: sessionStatus.qrCode,
        status: sessionStatus.status,
        expires: new Date(now + QR_CACHE_TTL).toISOString(),
        message: 'Scan QR code to connect'
      });
    }

    // 5. SEM QR CODE disponível
    return NextResponse.json({
      success: false,
      error: 'QR code not available',
      status: sessionStatus.status,
      message: 'QR code is being generated, please wait...'
    }, { status: 404 });

  } catch (error) {
    logger.error('❌ Error getting QR code', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to get QR code',
      message: 'Service temporarily unavailable'
    }, { status: 500 });
  }
}

/**
 * Cleanup: Remover cache antigo periodicamente
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of qrCache.entries()) {
      if (now - value.timestamp > QR_CACHE_TTL * 2) { // Remove após 2x o TTL
        qrCache.delete(key);
      }
    }
  }, QR_CACHE_TTL); // Cleanup a cada minuto
}