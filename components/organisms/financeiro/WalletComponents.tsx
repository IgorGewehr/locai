import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    Divider,
    CircularProgress
} from '@mui/material';
import {
    AccountBalanceWallet,
    ArrowUpward,
    ArrowDownward,
    AttachMoney,
    History
} from '@mui/icons-material';
import { Wallet, WalletTransaction } from '@/lib/types/financial-wallet';

interface BalanceCardProps {
    wallet: Wallet | null;
    loading: boolean;
    onWithdraw: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ wallet, loading, onWithdraw }) => {
    return (
        <Card sx={{
            background: 'linear-gradient(120deg, #2b32b2 0%, #1488cc 100%)',
            color: 'white',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        }}>
            {/* Decorative Elements */}
            <Box sx={{
                position: 'absolute',
                top: -30,
                right: -30,
                opacity: 0.15,
                transform: 'rotate(15deg)',
                zIndex: 0
            }}>
                <AccountBalanceWallet sx={{ fontSize: 220 }} />
            </Box>
            <Box sx={{
                position: 'absolute',
                bottom: -50,
                left: -20,
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                filter: 'blur(40px)',
                zIndex: 0
            }} />

            <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>
                            Saldo em Carteira
                        </Typography>

                        {loading ? (
                            <CircularProgress color="inherit" size={40} sx={{ my: 2 }} />
                        ) : (
                            <Typography variant="h3" fontWeight="800" sx={{ mb: 1, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: wallet?.currency || 'BRL' }).format(wallet?.balance || 0)}
                            </Typography>
                        )}

                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
                            Disponível para saque imediato
                        </Typography>
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    onClick={onWithdraw}
                    startIcon={<AttachMoney />}
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        py: 1,
                        boxShadow: 'none',
                        border: '1px solid rgba(255,255,255,0.3)',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    Solicitar Saque
                </Button>
            </CardContent>
        </Card>
    );
};

interface FinancialStatsProps {
    income: number;
    expense: number;
    loading: boolean;
}

export const FinancialStats: React.FC<FinancialStatsProps> = ({ income, expense, loading }) => {
    const net = income - expense;

    const StatItem = ({ label, value, type, icon: Icon }: any) => (
        <Box sx={{
            p: 2.5,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)' }
        }}>
            <Avatar sx={{
                bgcolor: type === 'income' ? 'success.light' : type === 'expense' ? 'error.light' : 'primary.light',
                color: type === 'income' ? 'success.dark' : type === 'expense' ? 'error.dark' : 'primary.dark',
                width: 48,
                height: 48
            }}>
                <Icon />
            </Avatar>
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {label}
                </Typography>
                {loading ? (
                    <Box sx={{ height: 28, width: 100, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }} />
                ) : (
                    <Typography variant="h6" fontWeight="700" color={type === 'income' ? 'success.main' : type === 'expense' ? 'error.main' : 'text.primary'}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </Typography>
                )}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', justifyContent: 'space-between' }}>
            <StatItem label="Receitas do Período" value={income} type="income" icon={ArrowUpward} />
            <StatItem label="Despesas do Período" value={expense} type="expense" icon={ArrowDownward} />
            <StatItem label="Resultado Líquido" value={net} type="net" icon={AccountBalanceWallet} />
        </Box>
    );
};

interface TransactionListProps {
    transactions: WalletTransaction[];
    loading: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading }) => {
    if (loading) {
        return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    }

    if (transactions.length === 0) {
        return (
            <Box p={4} textAlign="center" color="text.secondary">
                <History sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
                <Typography>Nenhuma transação recente</Typography>
            </Box>
        );
    }

    return (
        <List>
            {transactions.map((tx, index) => (
                <React.Fragment key={tx.id}>
                    {index > 0 && <Divider variant="inset" component="li" />}
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar sx={{
                                bgcolor: tx.type === 'deposit' ? 'success.light' : 'error.light',
                                color: tx.type === 'deposit' ? 'success.dark' : 'error.dark'
                            }}>
                                {tx.type === 'deposit' ? <ArrowUpward /> : <ArrowDownward />}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={tx.description}
                            secondary={new Date(tx.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                            })}
                        />
                        <Box textAlign="right">
                            <Typography
                                variant="body1"
                                fontWeight="bold"
                                color={tx.type === 'deposit' ? 'success.main' : 'error.main'}
                            >
                                {tx.type === 'deposit' ? '+' : '-'}
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                            </Typography>
                            <Chip
                                label={tx.status === 'completed' ? 'Confirmado' : tx.status}
                                size="small"
                                color={tx.status === 'completed' ? 'default' : 'warning'}
                                variant="outlined"
                                sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                            />
                        </Box>
                    </ListItem>
                </React.Fragment>
            ))}
        </List>
    );
};
