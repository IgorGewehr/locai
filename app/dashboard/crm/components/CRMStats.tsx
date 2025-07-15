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
      color: 'primary.main',
      bgColor: 'primary.light',
    },
    {
      title: 'Leads Quentes',
      value: hotLeads,
      icon: <LocalFireDepartment />,
      color: 'error.main',
      bgColor: 'error.light',
    },
    {
      title: 'Tarefas Hoje',
      value: tasksToday,
      icon: <Task />,
      color: 'info.main',
      bgColor: 'info.light',
    },
    {
      title: 'Tarefas Atrasadas',
      value: overdueTasks,
      icon: <Warning />,
      color: 'warning.main',
      bgColor: 'warning.light',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={600}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: stat.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  {React.cloneElement(stat.icon, { fontSize: 'medium' })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
      
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Taxa de Conversão
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="success" />
                <Typography variant="h6" color="success.main" fontWeight={600}>
                  {conversionRate.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={conversionRate}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'success.main',
                  borderRadius: 4,
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}