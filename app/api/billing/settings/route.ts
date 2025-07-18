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
    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    let tenantId: string;
    
    try {
      // Try Firebase Auth first
      const decodedToken = await auth.verifyIdToken(token);
      tenantId = decodedToken.tenantId || decodedToken.uid;
    } catch (firebaseError) {
      // If Firebase Auth fails, try simple token
      try {
        const decodedSimpleToken = Buffer.from(token, 'base64').toString('utf-8');
        const [uid, email, timestamp] = decodedSimpleToken.split(':');
        
        if (!uid || !email || !timestamp) {
          throw new Error('Invalid token format');
        }
        
        // Use uid as tenantId
        tenantId = uid;
      } catch (simpleTokenError) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }

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
    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    let tenantId: string;
    
    try {
      // Try Firebase Auth first
      const decodedToken = await auth.verifyIdToken(token);
      tenantId = decodedToken.tenantId || decodedToken.uid;
    } catch (firebaseError) {
      // If Firebase Auth fails, try simple token
      try {
        const decodedSimpleToken = Buffer.from(token, 'base64').toString('utf-8');
        const [uid, email, timestamp] = decodedSimpleToken.split(':');
        
        if (!uid || !email || !timestamp) {
          throw new Error('Invalid token format');
        }
        
        // Use uid as tenantId
        tenantId = uid;
      } catch (simpleTokenError) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }

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
    console.error('Erro ao salvar configurações de cobrança:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}