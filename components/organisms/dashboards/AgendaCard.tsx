'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Divider,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Schedule,
  CalendarToday,
  Person,
  Home,
  AccessTime,
  Add,
  Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  VisitAppointment, 
  VisitStatus, 
  VISIT_STATUS_LABELS, 
  VISIT_STATUS_COLORS 
} from '@/lib/types/visit-appointment';
import { useTenant } from '@/contexts/TenantContext';

interface AgendaCardProps {
  onCreateVisit?: () => void;
}

export default function AgendaCard({ onCreateVisit }: AgendaCardProps) {
  const { tenantId } = useTenant();
  const [upcomingVisits, setUpcomingVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    total: 0,
  });

  const loadVisits = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/visits?tenantId=${tenantId}&limit=5&upcoming=true`);
      
      if (response.ok) {
        const data = await response.json();
        const visits = data.data || [];
        setUpcomingVisits(visits);
        
        // Calcular estatísticas
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const weekEnd = addDays(today, 7);
        
        const todayVisits = visits.filter((visit: VisitAppointment) => 
          isToday(new Date(visit.scheduledDate))
        ).length;
        
        const tomorrowVisits = visits.filter((visit: VisitAppointment) => 
          isTomorrow(new Date(visit.scheduledDate))
        ).length;
        
        const thisWeekVisits = visits.filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          return visitDate >= today && visitDate <= weekEnd;
        }).length;
        
        setStats({
          today: todayVisits,
          tomorrow: tomorrowVisits,
          thisWeek: thisWeekVisits,
          total: visits.length,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar visitas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [tenantId]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMM", { locale: ptBR });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Remove segundos se houver
  };

  return (
    <Card 
      sx={{ 
        height: { xs: 'auto', lg: 400 },
        minHeight: 350,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        }
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
              }}
            >
              <Schedule sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  mb: 0.5
                }}
              >
                Agenda de Visitas
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem'
                }}
              >
                Próximas visitas agendadas
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={loadVisits}
              disabled={loading}
              sx={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                '&:hover': {
                  background: 'rgba(139, 92, 246, 0.2)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <Refresh />
            </IconButton>
            {onCreateVisit && (
              <IconButton 
                onClick={onCreateVisit}
                sx={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#8b5cf6',
                  '&:hover': {
                    background: 'rgba(139, 92, 246, 0.2)',
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <Add />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '-' : stats.today}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Hoje
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '-' : stats.tomorrow}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Amanhã
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '-' : stats.thisWeek}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Esta Semana
            </Typography>
          </Box>
        </Box>

        {/* Upcoming Visits List */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={70} sx={{ borderRadius: '12px' }} />
            ))
          ) : upcomingVisits.length > 0 ? (
            upcomingVisits.slice(0, 3).map((visit) => (
              <Box 
                key={visit.id}
                sx={{ 
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateX(4px)',
                  }
                }}
                onClick={() => {
                  window.location.href = '/dashboard/agenda/visitas';
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Home sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#ffffff',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {visit.propertyName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {visit.clientName}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={VISIT_STATUS_LABELS[visit.status]}
                    size="small"
                    sx={{
                      backgroundColor: VISIT_STATUS_COLORS[visit.status],
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarToday sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {getDateLabel(new Date(visit.scheduledDate))}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {formatTime(visit.scheduledTime)}
                      </Typography>
                    </Box>
                  </Box>
                  <ArrowForward sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                </Box>
              </Box>
            ))
          ) : (
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  background: 'rgba(139, 92, 246, 0.1)',
                }}
              >
                <Typography sx={{ fontSize: '2.5rem' }}>📅</Typography>
              </Box>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  textAlign: 'center' 
                }}
              >
                Nenhuma visita agendada
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textAlign: 'center',
                  maxWidth: '80%'
                }}
              >
                Agende visitas para acompanhar seus clientes
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer Actions */}
        {upcomingVisits.length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Schedule />}
                href="/dashboard/agenda/visitas"
                sx={{ 
                  flex: 1,
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  },
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: '12px',
                }}
              >
                Ver Todas
              </Button>
              {onCreateVisit && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={onCreateVisit}
                  sx={{ 
                    color: '#8b5cf6',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    '&:hover': {
                      borderColor: 'rgba(139, 92, 246, 0.5)',
                      background: 'rgba(139, 92, 246, 0.1)',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: '12px',
                  }}
                >
                  Nova
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}