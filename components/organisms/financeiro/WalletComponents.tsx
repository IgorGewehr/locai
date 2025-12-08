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
            background: 'linear-gradient(135deg, #1a1f71 0%, #2b32b2 40%, #1488cc 100%)',
            color: 'white',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            height: '100%',
            minHeight: 200
        }}>
            {/* Decorative Elements */}
            <Box sx={{
                position: 'absolute',
                top: -40,
                right: -40,
                opacity: 0.12,
                transform: 'rotate(15deg)',
                zIndex: 0
            }}>
                <AccountBalanceWallet sx={{ fontSize: 280 }} />
            </Box>
            <Box sx={{
                position: 'absolute',
                bottom: -60,
                left: -30,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                filter: 'blur(50px)',
                zIndex: 0
            }} />
            <Box sx={{
                position: 'absolute',
                top: '50%',
                right: '20%',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                filter: 'blur(30px)',
                zIndex: 0
            }} />

            <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
                    {/* Left side - Balance info */}
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="overline" sx={{
                            opacity: 0.85,
                            mb: 0.5,
                            display: 'block',
                            letterSpacing: '2px',
                            fontSize: '0.7rem',
                            fontWeight: 600
                        }}>
                            Saldo em Carteira
                        </Typography>

                        {loading ? (
                            <CircularProgress color="inherit" size={48} sx={{ my: 1 }} />
                        ) : (
                            <Typography
                                variant="h2"
                                fontWeight="800"
                                sx={{
                                    mb: 0.5,
                                    textShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                                    lineHeight: 1.2
                                }}
                            >
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: wallet?.currency || 'BRL' }).format(wallet?.balance || 0)}
                            </Typography>
                        )}

                        <Typography variant="body1" sx={{ opacity: 0.75, fontSize: '0.95rem' }}>
                            Disponível para saque imediato
                        </Typography>
                    </Box>

                    {/* Right side - Action button */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={onWithdraw}
                            startIcon={<AttachMoney />}
                            size="large"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                boxShadow: 'none',
                                border: '1px solid rgba(255,255,255,0.3)',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                    transform: 'translateY(-1px)'
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Solicitar Saque
                        </Button>
                    </Box>
                </Box>
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
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2.5,
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px -2px rgba(0, 0, 0, 0.08)'
            }
        }}>
            <Avatar sx={{
                bgcolor: type === 'income' ? 'success.light' : type === 'expense' ? 'error.light' : 'primary.light',
                color: type === 'income' ? 'success.dark' : type === 'expense' ? 'error.dark' : 'primary.dark',
                width: 40,
                height: 40
            }}>
                <Icon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        display: 'block',
                        lineHeight: 1.3
                    }}
                >
                    {label}
                </Typography>
                {loading ? (
                    <Box sx={{ height: 24, width: 80, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }} />
                ) : (
                    <Typography
                        variant="subtitle1"
                        fontWeight="700"
                        color={type === 'income' ? 'success.main' : type === 'expense' ? 'error.main' : 'text.primary'}
                        sx={{ fontSize: '1rem', lineHeight: 1.3 }}
                    >
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </Typography>
                )}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', justifyContent: 'space-between' }}>
            <StatItem label="Receitas" value={income} type="income" icon={ArrowUpward} />
            <StatItem label="Despesas" value={expense} type="expense" icon={ArrowDownward} />
            <StatItem label="Resultado" value={net} type="net" icon={AccountBalanceWallet} />
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
