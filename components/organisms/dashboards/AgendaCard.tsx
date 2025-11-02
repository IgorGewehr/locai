'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { ApiClient } from '@/lib/utils/api-client';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  CircularProgress,
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
  EventAvailable,
  LocationOn,
} from '@mui/icons-material';
import { format, isToday, isTomorrow, addDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  VisitAppointment, 
  VisitStatus, 
  VISIT_STATUS_LABELS, 
  VISIT_STATUS_COLORS 
} from '@/lib/types/visit-appointment';
import { useTenant } from '@/contexts/TenantContext';

interface AgendaCardProps {
  onCreateEvent?: () => void;
}

// 🚀 PERFORMANCE: Memoized component para evitar re-renders desnecessários
function AgendaCard({ onCreateEvent }: AgendaCardProps) {
  const { tenantId } = useTenant();
  const [nextEvent, setNextEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 🚀 PERFORMANCE: useCallback previne re-criação da função
  const loadNextEvent = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await ApiClient.get('/api/visits');
      
      if (response.ok) {
        const data = await response.json();
        const visits = data.data || [];
        
        // Filtrar apenas visitas futuras e ordenar por data/hora
        const now = new Date();
        const futureVisits = visits
          .filter((visit: VisitAppointment) => {
            const visitDateTime = new Date(visit.scheduledDate);
            visitDateTime.setHours(parseInt(visit.scheduledTime.split(':')[0]));
            visitDateTime.setMinutes(parseInt(visit.scheduledTime.split(':')[1]));
            return visitDateTime > now;
          })
          .sort((a: VisitAppointment, b: VisitAppointment) => {
            const dateA = new Date(a.scheduledDate);
            const dateB = new Date(b.scheduledDate);
            dateA.setHours(parseInt(a.scheduledTime.split(':')[0]));
            dateA.setMinutes(parseInt(a.scheduledTime.split(':')[1]));
            dateB.setHours(parseInt(b.scheduledTime.split(':')[0]));
            dateB.setMinutes(parseInt(b.scheduledTime.split(':')[1]));
            return dateA.getTime() - dateB.getTime();
          });
        
        // Pegar apenas o próximo evento
        if (futureVisits.length > 0) {
          const visit = futureVisits[0];
          setNextEvent({
            ...visit,
            type: 'visit',
            title: `Visita - ${visit.propertyName}`,
            subtitle: visit.clientName,
            location: visit.propertyAddress || visit.propertyName,
            icon: 'home'
          });
        } else {
          setNextEvent(null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar próximo evento:', error);
      setNextEvent(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // 🚀 PERFORMANCE: Dependência explícita

  useEffect(() => {
    loadNextEvent();
  }, [loadNextEvent]); // 🚀 PERFORMANCE: Usa função estável

  const formatEventDateTime = (date: string, time: string) => {
    const eventDate = new Date(date);
    const [hours, minutes] = time.split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes));
    
    const now = new Date();
    const hoursUntil = differenceInHours(eventDate, now);
    
    if (hoursUntil < 1 && hoursUntil >= 0) {
      return {
        relative: 'Em breve',
        absolute: format(eventDate, "dd/MM 'às' HH:mm", { locale: ptBR }),
        urgent: true
      };
    } else if (hoursUntil < 24 && hoursUntil >= 1) {
      return {
        relative: `Em ${hoursUntil}h`,
        absolute: format(eventDate, "dd/MM 'às' HH:mm", { locale: ptBR }),
        urgent: hoursUntil <= 2
      };
    } else if (isToday(eventDate)) {
      return {
        relative: `Hoje às ${time}`,
        absolute: format(eventDate, "dd/MM 'às' HH:mm", { locale: ptBR }),
        urgent: false
      };
    } else if (isTomorrow(eventDate)) {
      return {
        relative: `Amanhã às ${time}`,
        absolute: format(eventDate, "dd/MM 'às' HH:mm", { locale: ptBR }),
        urgent: false
      };
    } else {
      return {
        relative: format(eventDate, "EEE, dd/MM 'às' HH:mm", { locale: ptBR }),
        absolute: format(eventDate, "dd/MM 'às' HH:mm", { locale: ptBR }),
        urgent: false
      };
    }
  };

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: { xs: 'auto', lg: 400 },
          minHeight: 350,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} />
      </Card>
    );
  }

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
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Schedule sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                Agenda
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Próximo compromisso
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={loadNextEvent}
              disabled={loading}
              sx={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.2)',
                },
              }}
            >
              <Refresh sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton 
              onClick={onCreateEvent}
              sx={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.2)',
                },
              }}
            >
              <Add sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Event Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 1 }}>
          {nextEvent ? (
            <Box sx={{ textAlign: 'center' }}>
              {/* Event Icon */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Home sx={{ fontSize: 32 }} />
              </Box>

              {/* Event Title */}
              <Typography 
                variant="h6" 
                fontWeight={700} 
                sx={{ 
                  color: '#ffffff', 
                  mb: 0.5,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  lineHeight: 1.2,
                }}
              >
                {nextEvent.title}
              </Typography>

              {/* Client Name */}
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  mb: 2,
                  fontSize: '0.95rem',
                }}
              >
                {nextEvent.subtitle}
              </Typography>

              {/* Date & Time */}
              {(() => {
                const dateTime = formatEventDateTime(nextEvent.scheduledDate, nextEvent.scheduledTime);
                return (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<AccessTime />}
                      label={dateTime.relative}
                      sx={{
                        backgroundColor: dateTime.urgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                        color: dateTime.urgent ? '#fca5a5' : '#a5b4fc',
                        border: `1px solid ${dateTime.urgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        height: 32,
                        mb: 0.5,
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        display: 'block',
                      }}
                    >
                      {dateTime.absolute}
                    </Typography>
                  </Box>
                );
              })()}

              {/* Location */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 1,
                p: 1.5,
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 2,
              }}>
                <LocationOn sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.7)' }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    fontSize: '0.85rem',
                  }}
                >
                  {nextEvent.location}
                </Typography>
              </Box>

              {/* View All Button */}
              <Button
                variant="outlined"
                endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                href="/dashboard/agenda"
                sx={{
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: '#6366f1',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  py: 0.75,
                  '&:hover': {
                    borderColor: '#6366f1',
                    background: 'rgba(99, 102, 241, 0.1)',
                  },
                }}
              >
                Ver agenda completa
              </Button>
            </Box>
          ) : (
            // Empty State
            <Box sx={{ textAlign: 'center', py: 1 }}>
              {/* Empty Icon */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.4)',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <EventAvailable sx={{ fontSize: 32 }} />
              </Box>

              <Typography 
                variant="h6" 
                fontWeight={600} 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  mb: 1,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                }}
              >
                Agenda livre
              </Typography>

              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  mb: 3,
                  lineHeight: 1.4,
                  fontSize: '0.9rem',
                }}
              >
                Nenhum compromisso agendado.{' '}
                <br />
                Que tal agendar uma visita?
              </Typography>

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onCreateEvent}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  py: 0.75,
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5855eb, #7c3aed)',
                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
                  },
                }}
              >
                Agendar evento
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// 🚀 PERFORMANCE: Export memoized component
export default memo(AgendaCard);