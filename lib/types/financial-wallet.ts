// lib/types/financial-wallet.ts

export type TransactionType = 'deposit' | 'withdrawal' | 'fee' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';

export interface Wallet {
    tenantId: string;
    balance: number;
    currency: string;
    updatedAt: Date;
    createdAt: Date;
}

export interface WalletTransaction {
    id: string;
    walletId: string;
    tenantId: string;
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    description: string;
    referenceId?: string; // ID externo (ex: AbacatePay transaction ID)
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface WithdrawalRequest {
    id: string;
    walletId: string;
    tenantId: string;
    amount: number;
    status: WithdrawalStatus;
    bankInfo: {
        pixKey?: string;
        bankName?: string;
        accountNumber?: string;
        agency?: string;
        document?: string; // CPF/CNPJ
        holderName?: string;
    };
    rejectionReason?: string;
    requestedAt: Date;
    processedAt?: Date;
    transactionId?: string; // ID da transação de débito na carteira
}
