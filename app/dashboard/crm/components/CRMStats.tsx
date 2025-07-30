'use client';

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  Groups,
  LocalFireDepartment,
  Task,
  Warning,
  TrendingUp,
} from '@mui/icons-material';

interface CRMStatsProps {
  totalLeads: number;
  hotLeads: number;
  tasksToday: number;
  overdueTasks: number;
  conversionRate: number;
}

export default function CRMStats({
  totalLeads,
  hotLeads,
  tasksToday,
  overdueTasks,
  conversionRate,
}: CRMStatsProps) {
  const stats = [
    {
      title: 'Total de Leads',
      value: totalLeads,
      icon: <Groups />,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      shadowColor: 'rgba(99, 102, 241, 0.4)',
    },
    {
      title: 'Leads Quentes',
      value: hotLeads,
      icon: <LocalFireDepartment />,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
      shadowColor: 'rgba(239, 68, 68, 0.4)',
    },
    {
      title: 'Tarefas Hoje',
      value: tasksToday,
      icon: <Task />,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      shadowColor: 'rgba(6, 182, 212, 0.4)',
    },
    {
      title: 'Tarefas Atrasadas',
      value: overdueTasks,
      icon: <Warning />,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.4)',
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} lg={3} key={index}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: `0 20px 60px ${stat.shadowColor}`,
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '18px',
                    background: stat.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 8px 24px ${stat.shadowColor}`,
                  }}
                >
                  {React.cloneElement(stat.icon, { fontSize: 'large' })}
                </Box>
              </Box>
              <Typography 
                variant="h3" 
                fontWeight="800" 
                sx={{ 
                  color: '#ffffff',
                  mb: 1,
                  fontSize: { xs: '2rem', md: '2.25rem' }
                }}
              >
                {stat.value}
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 500 
                }}
              >
                {stat.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      
      {/* Conversion Rate Card */}
      <Grid item xs={12}>
        <Card sx={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 16px 50px rgba(16, 185, 129, 0.3)',
          }
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <TrendingUp fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="700" color="white">
                    Taxa de Conversão
                  </Typography>
                  <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                    Performance geral do pipeline
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h3" fontWeight="800" color="#10b981">
                {conversionRate.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={conversionRate}
              sx={{
                height: 12,
                borderRadius: 6,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: 6,
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}