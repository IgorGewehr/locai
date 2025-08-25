import { NextRequest, NextResponse } from 'next/server';
import { registerClient } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('👤 [REGISTER-CLIENT] Registrando novo cliente', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      clientData: {
        phone: args.phone?.substring(0, 6) + '***',
        name: args.name,
        email: args.email ? args.email.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
        hasAddress: !!args.address,
        source: args.source || 'unknown'
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [REGISTER-CLIENT] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await registerClient(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [REGISTER-CLIENT] Cliente registrado com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        clientId: result?.clientId,
        wasNewClient: result?.isNew,
        phone: result?.phone?.substring(0, 6) + '***',
        name: result?.name,
        registrationComplete: !!result?.clientId
      },
      performance: {
        processingTime: `${processingTime}ms`
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('❌ [REGISTER-CLIENT] Falha no registro do cliente', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Register client failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}