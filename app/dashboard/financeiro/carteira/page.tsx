'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    InputAdornment
} from '@mui/material';
import { BalanceCard, TransactionList } from '@/components/organisms/financeiro/WalletComponents';
import { Wallet, WalletTransaction } from '@/lib/types/financial-wallet';
import { WalletService } from '@/lib/services/wallet-service'; // Importação direta não funciona no client component se usar firebase-admin, mas aqui estamos usando firebase client SDK no service?
// NOTA: O WalletService usa 'firebase/firestore' que é Client SDK, então OK.
// Se usasse 'firebase-admin', teria que ser via API Route.
// Vamos verificar o WalletService... ele usa 'firebase/firestore' (Client SDK). OK.

export default function WalletPage() {
    const { tenantId } = useTenant();
    const { user } = useAuth(); // Para verificar permissões se necessário

    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPixKey, setWithdrawPixKey] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!tenantId) return;

        try {
            setLoading(true);
            // Carregar carteira
            const walletData = await WalletService.getWallet(tenantId);
            setWallet(walletData);

            // Carregar transações
            const txData = await WalletService.getTransactions(tenantId);
            setTransactions(txData);
        } catch (err) {
            console.error('Erro ao carregar carteira:', err);
            setError('Não foi possível carregar os dados da carteira.');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleWithdraw = async () => {
        if (!tenantId || !wallet) return;

        const amount = parseFloat(withdrawAmount.replace(',', '.'));

        if (isNaN(amount) || amount <= 0) {
            setError('Valor inválido');
            return;
        }

        if (amount > wallet.balance) {
            setError('Saldo insuficiente');
            return;
        }

        if (!withdrawPixKey) {
            setError('Chave PIX é obrigatória');
            return;
        }

        try {
            setWithdrawLoading(true);
            setError(null);

            await WalletService.requestWithdrawal(tenantId, amount, {
                pixKey: withdrawPixKey
            });

            setSuccess('Solicitação de saque realizada com sucesso!');
            setWithdrawOpen(false);
            setWithdrawAmount('');
            setWithdrawPixKey('');

            // Recarregar dados
            loadData();

            // Limpar mensagem de sucesso após 3s
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            console.error('Erro no saque:', err);
            setError(err instanceof Error ? err.message : 'Erro ao solicitar saque');
        } finally {
            setWithdrawLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Minha Carteira
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Gerencie seus ganhos e pagamentos recebidos pela IA
                </Typography>
            </Box>

            {success && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {error && !withdrawOpen && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Cartão de Saldo */}
                <Grid item xs={12} md={5}>
                    <BalanceCard
                        wallet={wallet}
                        loading={loading}
                        onWithdraw={() => setWithdrawOpen(true)}
                    />

                    <Box mt={3}>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Pagamentos processados pela IA via AbacatePay caem automaticamente aqui.
                        </Alert>
                    </Box>
                </Grid>

                {/* Histórico de Transações */}
                <Grid item xs={12} md={7}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardHeader title="Histórico de Transações" />
                        <CardContent sx={{ p: 0 }}>
                            <TransactionList transactions={transactions} loading={loading} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog de Saque */}
            <Dialog open={withdrawOpen} onClose={() => !withdrawLoading && setWithdrawOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Solicitar Saque</DialogTitle>
                <DialogContent>
                    <Box pt={1}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <Typography variant="body2" color="text.secondary" paragraph>
                            O valor será transferido para a chave PIX informada em até 1 dia útil.
                        </Typography>

                        <TextField
                            fullWidth
                            label="Valor do Saque"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            type="number"
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Chave PIX"
                            value={withdrawPixKey}
                            onChange={(e) => setWithdrawPixKey(e.target.value)}
                            placeholder="CPF, Email, Telefone ou Aleatória"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setWithdrawOpen(false)} disabled={withdrawLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleWithdraw}
                        disabled={withdrawLoading}
                    >
                        {withdrawLoading ? 'Processando...' : 'Confirmar Saque'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
