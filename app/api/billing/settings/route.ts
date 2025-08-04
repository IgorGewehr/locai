import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billing-service';
import { authMiddleware } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/api-errors';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId

    // Buscar configurações
    let settings = await billingService.getSettings(tenantId);
    
    // Se não existir, criar configurações padrão
    if (!settings) {
      settings = await billingService.createDefaultSettings(tenantId);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId

    const body = await request.json();
    const { simpleConfig, settings } = body;

    if (simpleConfig) {
      // Configuração simplificada
      await billingService.setupSimpleBilling(tenantId, {
        reminderDays: simpleConfig.reminderDays,
        tone: simpleConfig.tone,
        autoSend: simpleConfig.autoSend
      });
    } else if (settings) {
      // Configuração completa (modo avançado)
      await billingService.updateSettings(tenantId, settings);
    } else {
      return NextResponse.json(
        { error: 'Dados de configuração não fornecidos' },
        { status: 400 }
      );
    }

    // Buscar configurações atualizadas
    const updatedSettings = await billingService.getSettings(tenantId);

    return NextResponse.json({ 
      success: true, 
      settings: updatedSettings 
    });
  } catch (error) {
    return handleApiError(error)
  }
}