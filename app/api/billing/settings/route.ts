import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billing-service';
import { auth } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const tenantId = decodedToken.tenantId || decodedToken.uid;

    // Buscar configurações
    let settings = await billingService.getSettings(tenantId);
    
    // Se não existir, criar configurações padrão
    if (!settings) {
      settings = await billingService.createDefaultSettings(tenantId);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Erro ao buscar configurações de cobrança:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const tenantId = decodedToken.tenantId || decodedToken.uid;

    const body = await request.json();
    const { simpleConfig } = body;

    if (simpleConfig) {
      // Configuração simplificada
      await billingService.setupSimpleBilling(tenantId, {
        reminderDays: simpleConfig.reminderDays,
        tone: simpleConfig.tone,
        autoSend: simpleConfig.autoSend
      });
    } else {
      // Configuração completa
      // TODO: Implementar quando o modo avançado estiver pronto
      return NextResponse.json(
        { error: 'Modo avançado ainda não implementado' },
        { status: 400 }
      );
    }

    // Buscar configurações atualizadas
    const settings = await billingService.getSettings(tenantId);

    return NextResponse.json({ 
      success: true, 
      settings 
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de cobrança:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}