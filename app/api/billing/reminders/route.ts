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
    const decodedToken = await auth.verifyIdToken(token);
    
    // Buscar parâmetros da query
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const phoneNumber = searchParams.get('phoneNumber');

    if (transactionId) {
      // Buscar lembretes de uma transação específica
      const reminders = await billingService.getRemindersForTransaction(transactionId);
      return NextResponse.json({ reminders });
    } else if (phoneNumber) {
      // Buscar lembretes ativos para um número de telefone
      const reminders = await billingService.getActiveRemindersForPhone(phoneNumber);
      return NextResponse.json({ reminders });
    } else {
      return NextResponse.json(
        { error: 'Parâmetro transactionId ou phoneNumber é obrigatório' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar lembretes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const decodedToken = await auth.verifyIdToken(token);
    
    const body = await request.json();
    const { action } = body;

    if (action === 'process_pending') {
      // Processar lembretes pendentes
      await billingService.processScheduledReminders();
      
      // Criar novos lembretes para transações pendentes
      await billingService.createRemindersForPendingTransactions();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Lembretes processados com sucesso' 
      });
    } else if (action === 'create') {
      // Criar lembrete individual
      const { transactionId, clientId, type, scheduledDate, daysFromDue } = body;
      
      if (!transactionId || !clientId || !type) {
        return NextResponse.json(
          { error: 'Campos obrigatórios: transactionId, clientId, type' },
          { status: 400 }
        );
      }

      const reminderId = await billingService.createReminder({
        transactionId,
        clientId,
        type,
        scheduledDate: new Date(scheduledDate),
        daysFromDue
      });

      return NextResponse.json({ 
        success: true, 
        reminderId 
      });
    } else {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    return NextResponse.json(
      { error: 'Erro ao processar lembretes' },
      { status: 500 }
    );
  }
}