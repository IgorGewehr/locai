'use client';

import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  LinearProgress,
  Tooltip,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  InfoOutlined,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

interface FinancialSummaryCardProps {
  title: string;
  value: number;
  previousValue?: number;
  type: 'income' | 'expense' | 'balance' | 'pending';
  period?: string;
  goal?: number;
  details?: {
    label: string;
    value: number;
  }[];
}

export default function FinancialSummaryCard({
  title,
  value,
  previousValue,
  type,
  period = 'mês',
  goal,
  details,
}: FinancialSummaryCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getColor = () => {
    switch (type) {
      case 'income':
        return 'success';
      case 'expense':
        return 'error';
      case 'balance':
        return value >= 0 ? 'success' : 'error';
      case 'pending':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'income':
        return <TrendingUp />;
      case 'expense':
        return <TrendingDown />;
      case 'balance':
        return value >= 0 ? <TrendingUp /> : <TrendingDown />;
      case 'pending':
        return <InfoOutlined />;
      default:
        return null;
    }
  };

  const calculateChange = () => {
    if (!previousValue || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const change = calculateChange();
  const color = getColor();
  const icon = getIcon();

  const progressValue = goal ? Math.min((value / goal) * 100, 100) : 0;

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: type === 'balance' 
          ? `linear-gradient(135deg, ${color}.light 0%, ${color}.main 100%)`
          : undefined,
        color: type === 'balance' ? 'white' : undefined,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: type === 'balance' ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                mb: 0.5 
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              fontWeight={600}
              sx={{ color: type === 'balance' ? 'white' : `${color}.main` }}
            >
              {formatCurrency(value)}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: type === 'balance' ? 'rgba(255,255,255,0.2)' : `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: type === 'balance' ? 'white' : `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>

        {change !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: goal ? 2 : 0 }}>
            {change >= 0 ? (
              <ArrowUpward sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
            ) : (
              <ArrowDownward sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
            )}
            <Typography 
              variant="caption" 
              sx={{ 
                color: change >= 0 ? 'success.main' : 'error.main',
                fontWeight: 500 
              }}
            >
              {Math.abs(change).toFixed(1)}%
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: type === 'balance' ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                ml: 0.5 
              }}
            >
              vs {period} anterior
            </Typography>
          </Box>
        )}

        {goal && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Meta: {formatCurrency(goal)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progressValue.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressValue} 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: `${color}.main`,
                  borderRadius: 3,
                }
              }} 
            />
          </Box>
        )}

        {details && details.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            {details.map((detail, index) => (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {detail.label}
                </Typography>
                <Chip
                  label={formatCurrency(detail.value)}
                  size="small"
                  sx={{ 
                    height: 20,
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: 500,
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}