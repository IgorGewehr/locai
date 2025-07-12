import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billing-service';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transactionId');
    
    if (transactionId) {
      // Buscar lembretes de uma transação específica
      const reminders = await billingService.getRemindersForTransaction(transactionId);
      return NextResponse.json({ reminders });
    }

    // Processar lembretes programados (chamado por cron job)
    if (searchParams.get('process') === 'true') {
      await billingService.processScheduledReminders();
      return NextResponse.json({ success: true, message: 'Lembretes processados' });
    }

    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    return NextResponse.json(
      { error: 'Erro ao processar lembretes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create':
        // Criar lembrete manual
        const reminderId = await billingService.createReminder({
          transactionId: body.transactionId,
          clientId: body.clientId,
          type: body.type,
          scheduledDate: new Date(body.scheduledDate),
          daysFromDue: body.daysFromDue
        });
        return NextResponse.json({ success: true, reminderId });

      case 'send':
        // Enviar lembrete imediatamente
        await billingService.sendReminder(body.reminder);
        return NextResponse.json({ success: true });

      case 'cancel':
        // Cancelar lembrete
        // Implementar cancelamento
        return NextResponse.json({ success: true });

      case 'process_pending':
        // Criar lembretes para transações pendentes
        await billingService.createRemindersForPendingTransactions();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    return NextResponse.json(
      { error: 'Erro ao criar lembrete' },
      { status: 500 }
    );
  }
}