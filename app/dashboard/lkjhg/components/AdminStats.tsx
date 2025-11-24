import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import {
  People as PeopleIcon,
  Support as SupportIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

interface AdminStatsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalTickets: number;
    openTickets: number;
    totalProperties: number;
    totalReservations: number;
  };
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: '1px solid #2C2C2C',
        borderRadius: 1,
        bgcolor: '#1E1E1E',
        height: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: '#B0B0B0',
              fontWeight: 500,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '2rem',
              lineHeight: 1.2,
              mb: subtitle ? 0.5 : 0
            }}
          >
            {value.toLocaleString('pt-BR')}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: '#B0B0B0',
                fontSize: '0.75rem'
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            bgcolor: color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            flexShrink: 0,
            ml: 2
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Usuários"
            value={stats.totalUsers}
            subtitle={`${stats.activeUsers} ativos`}
            icon={<PeopleIcon />}
            color="#0D6EFD"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tickets"
            value={stats.totalTickets}
            subtitle={`${stats.openTickets} abertos`}
            icon={<SupportIcon />}
            color="#DC3545"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Propriedades"
            value={stats.totalProperties}
            icon={<HomeIcon />}
            color="#28A745"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Reservas"
            value={stats.totalReservations}
            icon={<CalendarIcon />}
            color="#FFC107"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
