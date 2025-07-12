import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billing-service';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || session.user.id;
    let settings = await billingService.getSettings(tenantId);
    
    // Se não existir, criar configurações padrão
    if (!settings) {
      settings = await billingService.createDefaultSettings(tenantId);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = session.user.tenantId || session.user.id;
    
    // Configuração simplificada para pequenos proprietários
    if (body.simpleConfig) {
      await billingService.setupSimpleBilling(tenantId, body.simpleConfig);
      return NextResponse.json({ success: true });
    }

    // Configuração completa
    // TODO: Implementar atualização completa das configurações
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}