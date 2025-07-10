'use client';

import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Home,
  CalendarMonth,
  People,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Refresh,
  WhatsApp,
} from '@mui/icons-material';
import type { DashboardStats } from '@/lib/types';

const initialStats: DashboardStats = {
  totalProperties: 0,
  activeProperties: 0,
  totalReservations: 0,
  pendingReservations: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  occupancyRate: 0,
  averageRating: 0,
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend.isPositive ? (
                  <TrendingUp color="success" sx={{ mr: 0.5 }} />
                ) : (
                  <TrendingDown color="error" sx={{ mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  color={trend.isPositive ? 'success.main' : 'error.main'}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              borderRadius: '50%',
              p: 2,
              color: 'white',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(false);

  const refreshStats = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <IconButton onClick={refreshStats} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <StatCard
            title="Propriedades"
            value={stats.activeProperties}
            subtitle={`${stats.totalProperties} total`}
            icon={<Home />}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <StatCard
            title="Reservas"
            value={stats.pendingReservations}
            subtitle={`${stats.totalReservations} total`}
            icon={<CalendarMonth />}
            color="secondary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <StatCard
            title="Receita Mensal"
            value={`R$ ${(stats.monthlyRevenue / 1000).toFixed(1)}k`}
            subtitle={`R$ ${(stats.totalRevenue / 1000).toFixed(0)}k total`}
            icon={<AttachMoney />}
            color="success"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
          <StatCard
            title="Taxa de Ocupação"
            value={`${(stats.occupancyRate * 100).toFixed(1)}%`}
            subtitle={`Média: ${stats.averageRating} estrelas`}
            icon={<People />}
            color="warning"
          />
        </Grid>

        {/* WhatsApp Status */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Status WhatsApp
                </Typography>
                <WhatsApp color="success" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip label="Não configurado" color="warning" size="small" />
                <Typography variant="body2" color="text.secondary">
                  Configure o WhatsApp nas configurações
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Mensagens hoje:</Typography>
                <Typography variant="body2" fontWeight="bold">0</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Conversas ativas:</Typography>
                <Typography variant="body2" fontWeight="bold">0</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Tempo médio resposta:</Typography>
                <Typography variant="body2" fontWeight="bold">N/A</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Atividade Recente
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Nenhuma atividade recente
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ações Rápidas
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label="Nova Propriedade"
                clickable
                color="primary"
                onClick={() => window.location.href = '/dashboard/properties/create'}
              />
              <Chip
                label="Ver Conversas"
                clickable
                color="secondary"
                onClick={() => window.location.href = '/dashboard/conversations'}
              />
              <Chip
                label="Relatórios"
                clickable
                onClick={() => window.location.href = '/dashboard/analytics'}
              />
              <Chip
                label="Configurações WhatsApp"
                clickable
                onClick={() => window.location.href = '/dashboard/settings'}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}