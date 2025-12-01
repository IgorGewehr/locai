'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Avatar,
  Stack,
  LinearProgress,
  Skeleton,
  Paper,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Phone,
  WhatsApp,
  Email,
  Task as TaskIcon,
  AttachMoney,
  AccessTime,
  ChevronLeft,
  ChevronRight,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Lead, LeadStatus } from '@/lib/types/crm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanBoardProps {
  leads: Record<LeadStatus, Lead[]>;
  statusColumns: Array<{ id: LeadStatus; title: string; color: string }>;
  onDragEnd: (result: any) => void;
  onLeadClick: (lead: Lead) => void;
  onQuickAction: (lead: Lead, action: string) => void;
  onMoveLeadToStatus?: (lead: Lead, newStatus: LeadStatus) => void;
  getTemperatureIcon: (temperature: string) => React.ReactNode;
  loading: boolean;
}

export default function KanbanBoard({
  leads,
  statusColumns,
  onDragEnd,
  onLeadClick,
  onQuickAction,
  onMoveLeadToStatus,
  getTemperatureIcon,
  loading,
}: KanbanBoardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Responsive columns per page
  const getColumnsPerPage = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 600) return 1; // Mobile
      if (window.innerWidth < 768) return 2; // Small Tablet
      if (window.innerWidth < 1024) return 3; // Tablet 11"
      return 4; // Desktop
    }
    return 3;
  };
  
  const [columnsPerPage, setColumnsPerPage] = useState(getColumnsPerPage());
  const totalPages = Math.ceil(statusColumns.length / columnsPerPage);
  
  // Update columns per page on resize
  useEffect(() => {
    const handleResize = () => {
      const newColumnsPerPage = getColumnsPerPage();
      setColumnsPerPage(newColumnsPerPage);
      // Reset to first page if current page is out of bounds
      if (currentPage >= Math.ceil(statusColumns.length / newColumnsPerPage)) {
        setCurrentPage(0);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage, statusColumns.length]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getDaysInStage = (lead: Lead) => {
    const days = Math.floor((new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getCurrentColumns = () => {
    const start = currentPage * columnsPerPage;
    return statusColumns.slice(start, start + columnsPerPage);
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Navigation Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        px: { xs: 0, sm: 1 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: '#ffffff' }}>
            Pipeline CRM
          </Typography>
          <Chip 
            label={`${currentPage + 1} de ${totalPages}`}
            size="small"
            sx={{
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#c7d2fe',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontWeight: 600,
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={prevPage}
            disabled={currentPage === 0}
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: currentPage === 0 ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.05)',
              }
            }}
          >
            <ChevronLeft />
          </IconButton>
          
          <IconButton
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: currentPage === totalPages - 1 ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.05)',
              }
            }}
          >
            <ChevronRight />
           </IconButton>
        </Box>
      </Box>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Fade in={true} key={currentPage}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: columnsPerPage === 2 ? 'repeat(2, 1fr)' : '1fr',
              md: `repeat(${columnsPerPage}, 1fr)`,
            },
            gap: { xs: 2, sm: 3, md: 4 },
            minHeight: { xs: 400, sm: 500, md: 600 },
            px: { xs: 0, sm: 0 },
          }}>
            {getCurrentColumns().map((column) => (
              <Paper
                key={column.id}
                sx={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '20px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                  }
                }}
              >
                {/* Column Header */}
                <Box
                  sx={{
                    p: 3,
                    borderBottom: '4px solid',
                    borderColor: column.color,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: `linear-gradient(135deg, ${column.color}15, ${column.color}08)`,
                  }}
                >
                  <Box>
                    <Typography 
                      variant="h6" 
                      fontWeight={700}
                      sx={{ 
                        color: '#ffffff',
                        fontSize: '1.125rem',
                        mb: 0.5
                      }}
                    >
                      {column.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem'
                      }}
                    >
                      {leads[column.id].length} leads
                    </Typography>
                  </Box>
                  {column.id === LeadStatus.WON && leads[column.id].length > 0 && (
                    <Chip
                      label={formatCurrency(
                        leads[column.id].reduce((sum, lead) => sum + (lead.wonValue || 0), 0)
                      )}
                      sx={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        fontWeight: 600,
                      }}
                      size="small"
                    />
                  )}
                </Box>

                {/* Column Content */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minHeight: 500,
                        maxHeight: 500,
                        overflowY: 'auto',
                        p: 3,
                        background: snapshot.isDraggingOver ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: '4px',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.5)',
                          },
                        },
                      }}
                    >
                      {loading ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <Skeleton 
                              key={i} 
                              variant="rectangular" 
                              height={160} 
                              sx={{ 
                                mb: 2, 
                                borderRadius: '16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                              }} 
                            />
                          ))}
                        </>
                      ) : (
                        <>
                          {leads[column.id].map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onLeadClick(lead)}
                                  sx={{
                                    mb: 2,
                                    cursor: 'pointer',
                                    opacity: snapshot.isDragging ? 0.9 : 1,
                                    transform: snapshot.isDragging ? 'rotate(3deg) scale(1.05)' : 'none',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '16px',
                                    '&:hover': {
                                      transform: 'translateY(-4px)',
                                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                      background: 'rgba(255, 255, 255, 0.12)',
                                    },
                                  }}
                                >
                                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                    {/* Lead Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                      <Avatar 
                                        sx={{ 
                                          width: 40, 
                                          height: 40, 
                                          fontSize: 16, 
                                          mr: 1.5,
                                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                        }}
                                      >
                                        {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                                      </Avatar>
                                      <Box sx={{ flex: 1 }}>
                                        <Typography 
                                          variant="subtitle1" 
                                          fontWeight={700}
                                          sx={{ 
                                            color: '#ffffff',
                                            fontSize: '1rem',
                                            mb: 0.5
                                          }}
                                        >
                                          {lead.name}
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '0.875rem'
                                          }}
                                        >
                                          {lead.phone}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ mt: 0.5 }}>
                                        {getTemperatureIcon(lead.temperature)}
                                      </Box>
                                    </Box>

                                    {/* Lead Score */}
                                    <Box sx={{ mb: 2 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}
                                        >
                                          Score
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          fontWeight={700}
                                          sx={{ color: '#ffffff' }}
                                        >
                                          {lead.score}%
                                        </Typography>
                                      </Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={lead.score}
                                        sx={{
                                          height: 6,
                                          borderRadius: 3,
                                          background: 'rgba(255, 255, 255, 0.1)',
                                          '& .MuiLinearProgress-bar': {
                                            borderRadius: 3,
                                            background: lead.score > 70 
                                              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                              : lead.score > 40 
                                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                              : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                          },
                                        }}
                                      />
                                    </Box>

                                    {/* Lead Info */}
                                    <Stack spacing={1} sx={{ mb: 2 }}>
                                      {lead.preferences.priceRange && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <AttachMoney sx={{ fontSize: 16, color: '#10b981' }} />
                                          <Typography 
                                            variant="body2" 
                                            sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}
                                          >
                                            {formatCurrency(lead.preferences.priceRange.min)} - {formatCurrency(lead.preferences.priceRange.max)}
                                          </Typography>
                                        </Box>
                                      )}
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AccessTime sx={{ fontSize: 16, color: '#8b5cf6' }} />
                                        <Typography 
                                          variant="body2" 
                                          sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}
                                        >
                                          {getDaysInStage(lead)} dias no estágio
                                        </Typography>
                                      </Box>
                                    </Stack>

                                    {/* Tags */}
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                      <Chip 
                                        label={lead.source} 
                                        size="small" 
                                        sx={{
                                          background: 'rgba(99, 102, 241, 0.2)',
                                          color: '#c7d2fe',
                                          border: '1px solid rgba(99, 102, 241, 0.3)',
                                          fontWeight: 600,
                                          fontSize: '0.75rem',
                                        }}
                                      />
                                      {lead.tags.slice(0, 1).map((tag) => (
                                        <Chip 
                                          key={tag} 
                                          label={tag} 
                                          size="small" 
                                          sx={{
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            color: '#d8b4fe',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                          }}
                                        />
                                      ))}
                                      {lead.tags.length > 1 && (
                                        <Chip 
                                          label={`+${lead.tags.length - 1}`} 
                                          size="small" 
                                          sx={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                          }}
                                        />
                                      )}
                                    </Box>

                                    {/* Lead Stage Navigation */}
                                    {onMoveLeadToStatus && (
                                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mb: 1 }}>
                                        {/* Botão Voltar Fase */}
                                        {statusColumns.findIndex(s => s.id === column.id) > 0 && (
                                          <Tooltip title="Voltar fase">
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const currentIndex = statusColumns.findIndex(s => s.id === column.id);
                                                const prevStatus = statusColumns[currentIndex - 1]?.id;
                                                if (prevStatus && onMoveLeadToStatus) {
                                                  onMoveLeadToStatus(lead, prevStatus);
                                                }
                                              }}
                                              sx={{
                                                background: 'rgba(156, 163, 175, 0.2)',
                                                color: '#9ca3af',
                                                border: '1px solid rgba(156, 163, 175, 0.3)',
                                                '&:hover': {
                                                  background: 'rgba(156, 163, 175, 0.3)',
                                                  transform: 'scale(1.1)',
                                                }
                                              }}
                                            >
                                              <ArrowBack sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                        
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            alignSelf: 'center',
                                            mx: 1,
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          Mover fase
                                        </Typography>
                                        
                                        {/* Botão Avançar Fase */}
                                        {statusColumns.findIndex(s => s.id === column.id) < statusColumns.length - 1 && (
                                          <Tooltip title="Avançar fase">
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const currentIndex = statusColumns.findIndex(s => s.id === column.id);
                                                const nextStatus = statusColumns[currentIndex + 1]?.id;
                                                if (nextStatus && onMoveLeadToStatus) {
                                                  onMoveLeadToStatus(lead, nextStatus);
                                                }
                                              }}
                                              sx={{
                                                background: 'rgba(34, 197, 94, 0.2)',
                                                color: '#22c55e',
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                '&:hover': {
                                                  background: 'rgba(34, 197, 94, 0.3)',
                                                  transform: 'scale(1.1)',
                                                }
                                              }}
                                            >
                                              <ArrowForward sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                      </Box>
                                    )}

                                    {/* Quick Actions */}
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                      <Tooltip title="WhatsApp">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onQuickAction(lead, 'whatsapp');
                                          }}
                                          sx={{
                                            background: 'rgba(37, 211, 102, 0.2)',
                                            color: '#25d366',
                                            border: '1px solid rgba(37, 211, 102, 0.3)',
                                            '&:hover': {
                                              background: 'rgba(37, 211, 102, 0.3)',
                                              transform: 'scale(1.1)',
                                            }
                                          }}
                                        >
                                          <WhatsApp sx={{ fontSize: 18 }} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Ligar">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onQuickAction(lead, 'call');
                                          }}
                                          sx={{
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            color: '#3b82f6',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            '&:hover': {
                                              background: 'rgba(59, 130, 246, 0.3)',
                                              transform: 'scale(1.1)',
                                            }
                                          }}
                                        >
                                          <Phone sx={{ fontSize: 18 }} />
                                        </IconButton>
                                      </Tooltip>
                                      {lead.email && (
                                        <Tooltip title="Email">
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onQuickAction(lead, 'email');
                                            }}
                                            sx={{
                                              background: 'rgba(245, 158, 11, 0.2)',
                                              color: '#f59e0b',
                                              border: '1px solid rgba(245, 158, 11, 0.3)',
                                              '&:hover': {
                                                background: 'rgba(245, 158, 11, 0.3)',
                                                transform: 'scale(1.1)',
                                              }
                                            }}
                                          >
                                            <Email sx={{ fontSize: 18 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      <Tooltip title="Criar Tarefa">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onQuickAction(lead, 'task');
                                          }}
                                          sx={{
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            color: '#8b5cf6',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            '&:hover': {
                                              background: 'rgba(139, 92, 246, 0.3)',
                                              transform: 'scale(1.1)',
                                            }
                                          }}
                                        >
                                          <TaskIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </>
                      )}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            ))}
          </Box>
        </Fade>
      </DragDropContext>
    </Box>
  );
}