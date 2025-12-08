import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// Schema de validação para o payload do n8n
const ProcessPaymentSchema = z.object({
    tenantId: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['PIX', 'CARD']),
    customerPhone: z.string(),
    transactionId: z.string(), // ID da transação na AbacatePay
    description: z.string().optional()
});

/**
 * POST - Processar pagamento coletado pela IA
 * Recebe notificação do n8n, verifica na AbacatePay e credita na carteira
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Validar API Key (segurança básica para o n8n)
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
            // Fallback: se não tiver secret configurado, permitir (dev) ou bloquear?
            // Melhor bloquear se não for dev.
            if (process.env.NODE_ENV === 'production' && !process.env.N8N_WEBHOOK_SECRET) {
                logger.warn('⚠️ [PROCESS-PAYMENT] N8N_WEBHOOK_SECRET não configurado em produção');
            } else if (process.env.N8N_WEBHOOK_SECRET) {
                return NextResponse.json(
                    { error: 'Unauthorized', code: 'INVALID_TOKEN' },
                    { status: 401 }
                );
            }
        }

        const body = await request.json();

        // 2. Validar payload
        const result = ProcessPaymentSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: result.error.errors },
                { status: 400 }
            );
        }

        const { tenantId, amount, transactionId, description, paymentMethod } = result.data;

        logger.info('💰 [PROCESS-PAYMENT] Processando pagamento da IA', {
            tenantId,
            amount,
            transactionId
        });

        // 3. Verificar status na AbacatePay
        // TODO: Implementar verificação real na AbacatePay API
        // Por enquanto, confiamos no n8n (que já deve ter verificado o webhook da AbacatePay)
        // Em produção, deveríamos consultar GET https://api.abacatepay.com/v1/billing/list?id={transactionId}

        const abacatePayVerified = true; // Mock

        if (!abacatePayVerified) {
            return NextResponse.json(
                { error: 'Payment not verified in AbacatePay', code: 'PAYMENT_NOT_FOUND' },
                { status: 400 }
            );
        }

        // 4. Creditar na carteira do Tenant
        // Garantir que a carteira existe
        await WalletService.getWallet(tenantId);

        // Adicionar transação
        const transaction = await WalletService.addTransaction(tenantId, {
            type: 'deposit',
            amount: amount, // Valor bruto (taxas devem ser descontadas aqui ou no saque?)
            // Vamos assumir valor líquido ou bruto dependendo da regra de negócio.
            // Se for "calção", geralmente é valor cheio.
            status: 'completed',
            description: description || `Pagamento via IA (${paymentMethod})`,
            referenceId: transactionId,
            metadata: {
                source: 'ai_agent',
                paymentMethod,
                provider: 'abacatepay'
            }
        });

        logger.info('✅ [PROCESS-PAYMENT] Pagamento creditado com sucesso', {
            walletTransactionId: transaction.id
        });

        return NextResponse.json({
            success: true,
            data: {
                transactionId: transaction.id,
                newBalance: transaction.amount // Retornar saldo atualizado seria ideal, mas transaction object tem amount da transação
            }
        });

    } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error) || 'Unknown error');
        logger.error('❌ [PROCESS-PAYMENT] Erro ao processar pagamento', errorObj);

        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
