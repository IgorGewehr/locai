/**
 * AI FUNCTION: send-payment-reminder
 *
 * Sends payment reminder to client via WhatsApp
 * Includes payment link or PIX QR code if available
 *
 * Sofia AI Usage Examples:
 * - "Envie um lembrete de pagamento para o cliente João"
 * - "Lembre o cliente sobre o pagamento pendente"
 * - "Cobre o cliente sobre a fatura vencida"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { TransactionStatus } from '@/lib/types/transaction-unified';

// ===== VALIDATION SCHEMA =====

const SendPaymentReminderSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  transactionId: z.string().min(1, 'TransactionId is required'),

  // Custom message (optional)
  customMessage: z.string().max(500).optional(),

  // Tone (optional)
  tone: z.enum(['friendly', 'formal', 'urgent']).default('friendly').optional(),
});

type SendPaymentReminderInput = z.infer<typeof SendPaymentReminderSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[SEND-PAYMENT-REMINDER] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      transactionId: body.transactionId,
      tone: body.tone,
    });

    // Validate input
    const validationResult = SendPaymentReminderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Get services
    const services = new TenantServiceFactory(input.tenantId);

    // Get transaction
    const transaction = await services.transactions.get(input.transactionId);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found',
          requestId,
        },
        { status: 404 }
      );
    }

    // Check if transaction is pending
    if (transaction.status !== TransactionStatus.PENDING) {
      return NextResponse.json(
        {
          success: false,
          error: 'Can only send reminders for pending payments',
          requestId,
        },
        { status: 400 }
      );
    }

    // Get client data
    if (!transaction.clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction has no associated client',
          requestId,
        },
        { status: 400 }
      );
    }

    const client = await services.clients.get(transaction.clientId);

    if (!client || !client.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found or has no phone number',
          requestId,
        },
        { status: 400 }
      );
    }

    logger.info('[SEND-PAYMENT-REMINDER] Client found', {
      requestId,
      clientId: client.id,
      clientName: client.name,
      hasPhone: !!client.phone,
    });

    // Build reminder message
    const message = input.customMessage
      ? sanitizeUserInput(input.customMessage)
      : buildReminderMessage(transaction, client.name, input.tone || 'friendly');

    // Add payment link or PIX code if available
    let paymentInfo = '';

    if ((transaction as any).abacatepayUrl) {
      paymentInfo = `\n\n💳 Link de pagamento: ${(transaction as any).abacatepayUrl}`;
    } else if ((transaction as any).abacatepayBrCode) {
      paymentInfo = `\n\n🔑 Código PIX (copie e cole no seu banco):\n${(transaction as any).abacatepayBrCode}`;
    }

    const fullMessage = message + paymentInfo;

    // Send WhatsApp message via N8N
    try {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

      if (!n8nWebhookUrl) {
        logger.error('[SEND-PAYMENT-REMINDER] N8N webhook URL not configured');

        return NextResponse.json(
          {
            success: false,
            error: 'WhatsApp integration not configured',
            requestId,
          },
          { status: 500 }
        );
      }

      // Send to N8N
      const whatsappResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: client.phone,
          message: fullMessage,
          tenantId: input.tenantId,
          metadata: {
            type: 'payment_reminder',
            transactionId: transaction.id,
            amount: transaction.amount,
          },
        }),
      });

      if (!whatsappResponse.ok) {
        throw new Error('Failed to send WhatsApp message');
      }

      logger.info('[SEND-PAYMENT-REMINDER] WhatsApp message sent', {
        requestId,
        clientPhone: client.phone.substring(0, 6) + '***',
      });

    } catch (error) {
      logger.error('[SEND-PAYMENT-REMINDER] Failed to send WhatsApp message', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send WhatsApp message',
          requestId,
        },
        { status: 500 }
      );
    }

    // Update transaction - increment reminders count
    const remindersSent = (transaction as any).remindersSent || 0;

    await services.transactions.update(transaction.id, {
      remindersSent: remindersSent + 1,
      lastReminderDate: new Date(),
      updatedAt: new Date(),
    });

    // Prepare response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        transactionId: transaction.id,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone.substring(0, 6) + '***',
        messageSent: true,
        remindersSent: remindersSent + 1,
        sentMessage: fullMessage,
        amount: transaction.amount,
        amountFormatted: `R$ ${transaction.amount.toFixed(2)}`,
        confirmationMessage: `Lembrete de pagamento enviado para ${client.name} via WhatsApp.`,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[SEND-PAYMENT-REMINDER] Execution completed successfully', {
      requestId,
      transactionId: transaction.id,
      remindersSent: remindersSent + 1,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[SEND-PAYMENT-REMINDER] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send payment reminder',
        requestId,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

function buildReminderMessage(
  transaction: any,
  clientName: string,
  tone: 'friendly' | 'formal' | 'urgent'
): string {
  const amount = `R$ ${transaction.amount.toFixed(2)}`;
  const description = transaction.description;

  // Calculate days overdue (if applicable)
  const dueDate = transaction.dueDate || transaction.date;
  const dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const now = new Date();
  const daysOverdue = Math.floor((now.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));

  const isOverdue = daysOverdue > 0;

  switch (tone) {
    case 'friendly':
      if (isOverdue) {
        return `Olá ${clientName}! 😊\n\nNotamos que o pagamento de ${amount} referente a "${description}" está pendente há ${daysOverdue} dia(s).\n\nQuando puder, por favor, realize o pagamento. Estamos à disposição para qualquer dúvida!`;
      }
      return `Olá ${clientName}! 😊\n\nEste é um lembrete amigável sobre o pagamento de ${amount} referente a "${description}".\n\nPor favor, quando puder, realize o pagamento. Qualquer dúvida, estamos aqui!`;

    case 'formal':
      if (isOverdue) {
        return `Prezado(a) ${clientName},\n\nIdentificamos que o pagamento de ${amount} referente a "${description}" encontra-se pendente há ${daysOverdue} dia(s).\n\nSolicitamos a gentileza de regularizar esta pendência o quanto antes.\n\nAtenciosamente,\nEquipe Financeira`;
      }
      return `Prezado(a) ${clientName},\n\nEste é um lembrete sobre o pagamento de ${amount} referente a "${description}".\n\nPedimos a gentileza de realizar o pagamento conforme acordado.\n\nAtenciosamente,\nEquipe Financeira`;

    case 'urgent':
      if (isOverdue) {
        return `⚠️ URGENTE - ${clientName}\n\nO pagamento de ${amount} referente a "${description}" está vencido há ${daysOverdue} dia(s).\n\nPOR FAVOR, REGULARIZE IMEDIATAMENTE para evitar juros e multas.\n\nContato: [seu contato]`;
      }
      return `⚠️ IMPORTANTE - ${clientName}\n\nLembramos que o pagamento de ${amount} referente a "${description}" está próximo do vencimento.\n\nPOR FAVOR, REALIZE O PAGAMENTO O QUANTO ANTES.\n\nContato: [seu contato]`;

    default:
      return `Olá ${clientName}!\n\nLembrete sobre o pagamento de ${amount} referente a "${description}".\n\nPor favor, realize o pagamento quando possível.`;
  }
}
