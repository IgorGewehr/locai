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
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Stepper,
    Step,
    StepLabel,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Collapse,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    AccountBalanceWallet,
    AttachMoney,
    CheckCircle,
    Warning,
    Info,
    ExpandMore,
    ExpandLess,
    ContentCopy,
    Refresh,
    History,
} from '@mui/icons-material';
import { BalanceCard, TransactionList } from '@/components/organisms/financeiro/WalletComponents';
import { Wallet, WalletTransaction, WithdrawalRequest, formatBRL, DEFAULT_WALLET_LIMITS } from '@/lib/types/financial-wallet';
import { WalletService } from '@/lib/services/wallet-service';

// Tipos de chave PIX
const PIX_KEY_TYPES = [
    { value: 'CPF', label: 'CPF', placeholder: '000.000.000-00', mask: '###.###.###-##' },
    { value: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00', mask: '##.###.###/####-##' },
    { value: 'EMAIL', label: 'E-mail', placeholder: 'email@exemplo.com', mask: null },
    { value: 'PHONE', label: 'Telefone', placeholder: '+55 11 99999-9999', mask: '+## ## #####-####' },
    { value: 'RANDOM', label: 'Chave Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', mask: null },
];

export default function WalletPage() {
    const { tenantId } = useTenant();
    const { user } = useAuth();

    // State
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Withdraw dialog state
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawStep, setWithdrawStep] = useState(0);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPixKey, setWithdrawPixKey] = useState('');
    const [withdrawPixKeyType, setWithdrawPixKeyType] = useState('CPF');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
    const [withdrawResult, setWithdrawResult] = useState<any>(null);

    // History expanded
    const [historyExpanded, setHistoryExpanded] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        if (!tenantId) return;

        try {
            setLoading(true);

            // Load wallet
            const walletData = await WalletService.getWallet(tenantId);
            setWallet(walletData);

            // Load transactions
            const txData = await WalletService.getTransactions(tenantId, 20);
            setTransactions(txData);

            // Load withdrawals
            const withdrawalData = await WalletService.getWithdrawals(tenantId);
            setWithdrawals(withdrawalData);

        } catch (err) {
            console.error('Erro ao carregar carteira:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh data
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Format amount input
    const handleAmountChange = (value: string) => {
        // Remove non-numeric characters except comma and dot
        const cleaned = value.replace(/[^\d,.]/g, '').replace(',', '.');
        setWithdrawAmount(cleaned);
    };

    // Validate withdraw form
    const validateWithdraw = (): string | null => {
        const amount = parseFloat(withdrawAmount);

        if (isNaN(amount) || amount <= 0) {
            return 'Valor inválido';
        }

        if (amount < DEFAULT_WALLET_LIMITS.minWithdrawal) {
            return `Valor mínimo é ${formatBRL(DEFAULT_WALLET_LIMITS.minWithdrawal)}`;
        }

        if (amount > DEFAULT_WALLET_LIMITS.maxWithdrawal) {
            return `Valor máximo é ${formatBRL(DEFAULT_WALLET_LIMITS.maxWithdrawal)}`;
        }

        if (wallet && amount > wallet.balance) {
            return `Saldo insuficiente. Disponível: ${formatBRL(wallet.balance)}`;
        }

        if (!withdrawPixKey.trim()) {
            return 'Chave PIX é obrigatória';
        }

        // Validate PIX key format
        const keyType = PIX_KEY_TYPES.find(t => t.value === withdrawPixKeyType);
        if (keyType) {
            if (withdrawPixKeyType === 'CPF' && !/^\d{11}$/.test(withdrawPixKey.replace(/\D/g, ''))) {
                return 'CPF inválido';
            }
            if (withdrawPixKeyType === 'CNPJ' && !/^\d{14}$/.test(withdrawPixKey.replace(/\D/g, ''))) {
                return 'CNPJ inválido';
            }
            if (withdrawPixKeyType === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(withdrawPixKey)) {
                return 'E-mail inválido';
            }
            if (withdrawPixKeyType === 'PHONE' && !/^\+?\d{10,13}$/.test(withdrawPixKey.replace(/\D/g, ''))) {
                return 'Telefone inválido';
            }
        }

        return null;
    };

    // Handle withdraw
    const handleWithdraw = async () => {
        const error = validateWithdraw();
        if (error) {
            setWithdrawError(error);
            return;
        }

        if (!tenantId) return;

        try {
            setWithdrawLoading(true);
            setWithdrawError(null);

            const amount = parseFloat(withdrawAmount);

            // Call execute-withdrawal API
            const response = await fetch('/api/ai/functions/execute-withdrawal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tenantId,
                    amount,
                    pixKey: withdrawPixKey,
                    pixKeyType: withdrawPixKeyType,
                    description: `Saque via Dashboard`,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Falha ao processar saque');
            }

            setWithdrawResult(result.data);
            setWithdrawStep(2); // Go to success step
            setWithdrawSuccess('Saque solicitado com sucesso!');

            // Reload data
            loadData();

        } catch (err) {
            console.error('Erro no saque:', err);
            setWithdrawError(err instanceof Error ? err.message : 'Erro ao solicitar saque');
        } finally {
            setWithdrawLoading(false);
        }
    };

    // Reset withdraw dialog
    const resetWithdrawDialog = () => {
        setWithdrawStep(0);
        setWithdrawAmount('');
        setWithdrawPixKey('');
        setWithdrawPixKeyType('CPF');
        setWithdrawError(null);
        setWithdrawSuccess(null);
        setWithdrawResult(null);
    };

    // Close withdraw dialog
    const handleCloseWithdraw = () => {
        if (!withdrawLoading) {
            setWithdrawOpen(false);
            resetWithdrawDialog();
        }
    };

    // Open withdraw dialog
    const handleOpenWithdraw = () => {
        resetWithdrawDialog();
        setWithdrawOpen(true);
    };

    // Pending withdrawals
    const pendingWithdrawals = withdrawals.filter(w =>
        w.status === 'pending' || w.status === 'processing'
    );

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Minha Carteira
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gerencie seus ganhos e pagamentos recebidos pela IA
                    </Typography>
                </Box>
                <Button
                    startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    Atualizar
                </Button>
            </Box>

            {/* Pending Withdrawals Alert */}
            {pendingWithdrawals.length > 0 && (
                <Alert
                    severity="info"
                    sx={{ mb: 3 }}
                    action={
                        <IconButton size="small" onClick={() => setHistoryExpanded(!historyExpanded)}>
                            {historyExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    }
                >
                    <Typography variant="body2">
                        Você tem {pendingWithdrawals.length} saque(s) em processamento,
                        totalizando {formatBRL(pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0))}
                    </Typography>
                    <Collapse in={historyExpanded}>
                        <List dense sx={{ mt: 1 }}>
                            {pendingWithdrawals.map(w => (
                                <ListItem key={w.id} sx={{ py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <CircularProgress size={16} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={formatBRL(w.amount)}
                                        secondary={`Solicitado em ${new Date(w.requestedAt).toLocaleDateString('pt-BR')}`}
                                    />
                                    <Chip
                                        label={w.status === 'pending' ? 'Pendente' : 'Processando'}
                                        size="small"
                                        color={w.status === 'pending' ? 'warning' : 'info'}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Balance Card */}
                <Grid item xs={12} md={5}>
                    <BalanceCard
                        wallet={wallet}
                        loading={loading}
                        onWithdraw={handleOpenWithdraw}
                    />

                    <Box mt={3}>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Pagamentos processados pela IA via AbacatePay caem automaticamente aqui.
                        </Alert>
                    </Box>

                    {/* Limits Info */}
                    <Card sx={{ mt: 3, borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Limites de Saque
                            </Typography>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">Mínimo:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatBRL(DEFAULT_WALLET_LIMITS.minWithdrawal)}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">Máximo:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatBRL(DEFAULT_WALLET_LIMITS.maxWithdrawal)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Transaction History */}
                <Grid item xs={12} md={7}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardHeader
                            title="Histórico de Transações"
                            action={
                                <Tooltip title="Ver histórico completo">
                                    <IconButton size="small">
                                        <History />
                                    </IconButton>
                                </Tooltip>
                            }
                        />
                        <CardContent sx={{ p: 0 }}>
                            <TransactionList transactions={transactions} loading={loading} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Withdraw Dialog */}
            <Dialog
                open={withdrawOpen}
                onClose={handleCloseWithdraw}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <AttachMoney />
                        Solicitar Saque
                    </Box>
                </DialogTitle>

                <DialogContent>
                    {/* Stepper */}
                    <Stepper activeStep={withdrawStep} sx={{ mb: 3 }}>
                        <Step>
                            <StepLabel>Valor</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Chave PIX</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Confirmação</StepLabel>
                        </Step>
                    </Stepper>

                    {/* Error Alert */}
                    {withdrawError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setWithdrawError(null)}>
                            {withdrawError}
                        </Alert>
                    )}

                    {/* Step 0: Amount */}
                    {withdrawStep === 0 && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Informe o valor que deseja sacar. O valor será transferido via PIX.
                            </Typography>

                            <TextField
                                fullWidth
                                label="Valor do Saque"
                                value={withdrawAmount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                type="text"
                                inputMode="decimal"
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                                helperText={wallet && `Saldo disponível: ${formatBRL(wallet.balance)}`}
                            />

                            {/* Quick amount buttons */}
                            <Box display="flex" gap={1} flexWrap="wrap">
                                {[50, 100, 500, 1000].map(amount => (
                                    <Chip
                                        key={amount}
                                        label={formatBRL(amount)}
                                        onClick={() => setWithdrawAmount(amount.toString())}
                                        variant={withdrawAmount === amount.toString() ? 'filled' : 'outlined'}
                                        color="primary"
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                                {wallet && wallet.balance > 0 && (
                                    <Chip
                                        label="Saldo Total"
                                        onClick={() => setWithdrawAmount(wallet.balance.toString())}
                                        variant={withdrawAmount === wallet.balance.toString() ? 'filled' : 'outlined'}
                                        color="secondary"
                                        sx={{ cursor: 'pointer' }}
                                    />
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* Step 1: PIX Key */}
                    {withdrawStep === 1 && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Informe a chave PIX para receber o valor.
                            </Typography>

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Tipo de Chave</InputLabel>
                                <Select
                                    value={withdrawPixKeyType}
                                    onChange={(e) => {
                                        setWithdrawPixKeyType(e.target.value);
                                        setWithdrawPixKey('');
                                    }}
                                    label="Tipo de Chave"
                                >
                                    {PIX_KEY_TYPES.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Chave PIX"
                                value={withdrawPixKey}
                                onChange={(e) => setWithdrawPixKey(e.target.value)}
                                placeholder={PIX_KEY_TYPES.find(t => t.value === withdrawPixKeyType)?.placeholder}
                            />

                            {/* Summary */}
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Resumo do Saque
                                </Typography>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" color="text.secondary">Valor:</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {formatBRL(parseFloat(withdrawAmount) || 0)}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" color="text.secondary">Taxa AbacatePay:</Typography>
                                    <Typography variant="body2">~R$ 0,80</Typography>
                                </Box>
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" fontWeight="bold">Valor líquido estimado:</Typography>
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                        {formatBRL((parseFloat(withdrawAmount) || 0) - 0.80)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Step 2: Success */}
                    {withdrawStep === 2 && withdrawResult && (
                        <Box textAlign="center" py={2}>
                            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Saque Solicitado com Sucesso!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {withdrawResult.estimatedTime}
                            </Typography>

                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'left' }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">Valor:</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {formatBRL(withdrawResult.amount)}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">Taxa:</Typography>
                                    <Typography variant="body2">
                                        {formatBRL(withdrawResult.platformFee)}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">Valor líquido:</Typography>
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                        {formatBRL(withdrawResult.netAmount)}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Novo saldo:</Typography>
                                    <Typography variant="body2">
                                        {withdrawResult.newBalanceFormatted}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2.5 }}>
                    {withdrawStep === 0 && (
                        <>
                            <Button onClick={handleCloseWithdraw} disabled={withdrawLoading}>
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    const error = validateWithdraw();
                                    if (error && !error.includes('Chave PIX')) {
                                        setWithdrawError(error);
                                    } else {
                                        setWithdrawError(null);
                                        setWithdrawStep(1);
                                    }
                                }}
                                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                            >
                                Continuar
                            </Button>
                        </>
                    )}

                    {withdrawStep === 1 && (
                        <>
                            <Button onClick={() => setWithdrawStep(0)} disabled={withdrawLoading}>
                                Voltar
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleWithdraw}
                                disabled={withdrawLoading || !withdrawPixKey}
                            >
                                {withdrawLoading ? <CircularProgress size={24} /> : 'Confirmar Saque'}
                            </Button>
                        </>
                    )}

                    {withdrawStep === 2 && (
                        <Button
                            variant="contained"
                            onClick={handleCloseWithdraw}
                            fullWidth
                        >
                            Fechar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
}
