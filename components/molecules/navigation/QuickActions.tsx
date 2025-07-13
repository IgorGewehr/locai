'use client';

import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Stack, 
  Box,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add,
  Receipt,
  TrendingUp,
  TrendingDown,
  Campaign,
  AttachMoney,
  Schedule,
  PictureAsPdf,
  TableChart,
  Assessment,
  MoreVert,
  Download,
  Share,
  Print,
} from '@mui/icons-material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  onAddTransaction: () => void;
  stats?: {
    pendingCount: number;
    overdueCount: number;
  };
}

export default function QuickActions({ onAddTransaction, stats }: QuickActionsProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExportLoading(true);
    try {
      // Implementar exportação
      console.log(`Exportando em formato ${format}`);
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setExportLoading(false);
      handleExportClose();
    }
  };

  const quickActions = [
    {
      title: 'Nova Receita',
      icon: <TrendingUp />,
      color: 'success.main',
      onClick: () => {
        onAddTransaction();
        // Poderia passar um parâmetro para pré-selecionar tipo receita
      },
    },
    {
      title: 'Nova Despesa',
      icon: <TrendingDown />,
      color: 'error.main',
      onClick: () => {
        onAddTransaction();
        // Poderia passar um parâmetro para pré-selecionar tipo despesa
      },
    },
    {
      title: 'Cobranças',
      icon: <Campaign />,
      color: 'warning.main',
      onClick: () => router.push('/dashboard/financeiro/cobrancas'),
      badge: stats?.pendingCount,
    },
    {
      title: 'Relatórios',
      icon: <Assessment />,
      color: 'primary.main',
      onClick: () => router.push('/dashboard/financeiro/relatorios'),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Ações Rápidas</Typography>
          <Button
            size="small"
            startIcon={exportLoading ? <CircularProgress size={16} /> : <Download />}
            onClick={handleExportClick}
            disabled={exportLoading}
          >
            Exportar
          </Button>
        </Box>

        <Stack spacing={2}>
          {quickActions.map((action, index) => (
            <Button
              key={index}
              fullWidth
              variant="outlined"
              startIcon={action.icon}
              onClick={action.onClick}
              sx={{
                justifyContent: 'flex-start',
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: action.color,
                  bgcolor: `${action.color}10`,
                  '& .MuiSvgIcon-root': {
                    color: action.color,
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <Typography variant="body2">{action.title}</Typography>
                {action.badge && (
                  <Chip
                    label={action.badge}
                    size="small"
                    color="warning"
                    sx={{ ml: 'auto', height: 20, minWidth: 20 }}
                  />
                )}
              </Box>
            </Button>
          ))}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={1}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={onAddTransaction}
            sx={{ py: 1.5 }}
          >
            Nova Transação
          </Button>
        </Stack>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleExportClose}
        >
          <MenuItem onClick={() => handleExport('pdf')}>
            <ListItemIcon>
              <PictureAsPdf fontSize="small" />
            </ListItemIcon>
            <ListItemText>Exportar PDF</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExport('excel')}>
            <ListItemIcon>
              <TableChart fontSize="small" />
            </ListItemIcon>
            <ListItemText>Exportar Excel</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExport('csv')}>
            <ListItemIcon>
              <Receipt fontSize="small" />
            </ListItemIcon>
            <ListItemText>Exportar CSV</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => window.print()}>
            <ListItemIcon>
              <Print fontSize="small" />
            </ListItemIcon>
            <ListItemText>Imprimir</ListItemText>
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}