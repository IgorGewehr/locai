import React, { useState, useRef } from 'react';
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
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Lead, LeadStatus } from '@/lib/types/crm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { scrollbarStyles } from '@/styles/scrollbarStyles';

interface KanbanBoardProps {
  leads: Record<LeadStatus, Lead[]>;
  statusColumns: Array<{ id: LeadStatus; title: string; color: string }>;
  onDragEnd: (result: any) => void;
  onLeadClick: (lead: Lead) => void;
  onQuickAction: (lead: Lead, action: string) => void;
  getTemperatureIcon: (temperature: string) => React.ReactNode;
  loading: boolean;
}

export default function KanbanBoard({
  leads,
  statusColumns,
  onDragEnd,
  onLeadClick,
  onQuickAction,
  getTemperatureIcon,
  loading,
}: KanbanBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const columnWidth = 300;
  const columnGap = 16;
  const columnsToShow = 4;
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

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(statusColumns.length - columnsToShow, currentIndex + 1));
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < statusColumns.length - columnsToShow;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{ position: 'relative', width: '100%', px: 5 }}>
        {/* Left Shadow Indicator */}
        {canGoPrevious && (
          <Box
            sx={{
              position: 'absolute',
              left: 40,
              top: 0,
              bottom: 0,
              width: 60,
              background: 'linear-gradient(to right, rgba(0, 0, 0, 0.2), transparent)',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Right Shadow Indicator */}
        {canGoNext && (
          <Box
            sx={{
              position: 'absolute',
              right: 40,
              top: 0,
              bottom: 0,
              width: 60,
              background: 'linear-gradient(to left, rgba(0, 0, 0, 0.2), transparent)',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Left Arrow */}
        {statusColumns.length > columnsToShow && canGoPrevious && (
          <IconButton
            onClick={handlePrevious}
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.12)',
                transform: 'translateY(-50%) scale(1.1)',
              },
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft sx={{ fontSize: 28, color: 'primary.main' }} />
          </IconButton>
        )}

        {/* Right Arrow */}
        {statusColumns.length > columnsToShow && canGoNext && (
          <IconButton
            onClick={handleNext}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.12)',
                transform: 'translateY(-50%) scale(1.1)',
              },
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight sx={{ fontSize: 28, color: 'primary.main' }} />
          </IconButton>
        )}

        {/* Columns Container */}
        <Box 
          ref={containerRef}
          sx={{ 
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
            maxWidth: `${columnsToShow * columnWidth + (columnsToShow - 1) * columnGap}px`,
            mx: 'auto',
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              gap: `${columnGap}px`, 
              pb: 2,
              transform: `translateX(-${currentIndex * (columnWidth + columnGap)}px)`,
              transition: 'transform 0.3s ease-in-out',
            }}
          >
            {statusColumns.map((column) => (
          <Paper
            key={column.id}
            sx={{
              minWidth: 300,
              maxWidth: 300,
              flex: '0 0 300px',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              transition: 'all 0.3s',
              overflow: 'hidden',
            }}
          >
            {/* Column Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: 3,
                borderColor: column.color,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {column.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {leads[column.id].length} leads
                </Typography>
              </Box>
              {column.id === LeadStatus.WON && leads[column.id].length > 0 && (
                <Chip
                  label={formatCurrency(
                    leads[column.id].reduce((sum, lead) => sum + (lead.wonValue || 0), 0)
                  )}
                  color="success"
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
                    minHeight: 400,
                    maxHeight: 'calc(100vh - 300px)',
                    overflowY: 'auto',
                    p: 1,
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                    transition: 'background-color 0.2s',
                    ...scrollbarStyles.hidden,
                  }}
                >
                  {loading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 1, borderRadius: 1 }} />
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
                                mb: 1,
                                cursor: 'pointer',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                  boxShadow: 3,
                                },
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                {/* Lead Header */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                  <Avatar sx={{ width: 32, height: 32, fontSize: 14, mr: 1 }}>
                                    {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                                  </Avatar>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                                      {lead.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                      {lead.phone}
                                    </Typography>
                                  </Box>
                                  {getTemperatureIcon(lead.temperature)}
                                </Box>

                                {/* Lead Score */}
                                <Box sx={{ mb: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption">Score</Typography>
                                    <Typography variant="caption" fontWeight={600}>
                                      {lead.score}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={lead.score}
                                    sx={{
                                      height: 4,
                                      borderRadius: 2,
                                      bgcolor: 'grey.200',
                                      '& .MuiLinearProgress-bar': {
                                        bgcolor: lead.score > 70 ? 'success.main' : lead.score > 40 ? 'warning.main' : 'error.main',
                                      },
                                    }}
                                  />
                                </Box>

                                {/* Lead Info */}
                                <Stack spacing={0.5} sx={{ mb: 1 }}>
                                  {lead.preferences.priceRange && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <AttachMoney sx={{ fontSize: 14, color: 'text.secondary' }} />
                                      <Typography variant="caption" color="text.secondary">
                                        {formatCurrency(lead.preferences.priceRange.min)} - {formatCurrency(lead.preferences.priceRange.max)}
                                      </Typography>
                                    </Box>
                                  )}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {getDaysInStage(lead)} dias no estágio
                                    </Typography>
                                  </Box>
                                </Stack>

                                {/* Tags */}
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                                  <Chip label={lead.source} size="small" variant="outlined" />
                                  {lead.tags.slice(0, 2).map((tag) => (
                                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                                  ))}
                                  {lead.tags.length > 2 && (
                                    <Chip label={`+${lead.tags.length - 2}`} size="small" variant="outlined" />
                                  )}
                                </Box>

                                {/* Quick Actions */}
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <Tooltip title="WhatsApp">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQuickAction(lead, 'whatsapp');
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
        </Box>

        {/* Navigation Dots */}
        {statusColumns.length > columnsToShow && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 1, 
            mt: 2 
          }}>
            {Array.from({ length: statusColumns.length - columnsToShow + 1 }).map((_, index) => (
              <Box
                key={index}
                onClick={() => setCurrentIndex(index)}
                sx={{
                  width: index === currentIndex ? 24 : 8,
                  height: 8,
                  borderRadius: '4px',
                  bgcolor: index === currentIndex ? 'primary.main' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: index === currentIndex ? 'primary.dark' : 'rgba(255, 255, 255, 0.5)',
                    transform: 'scale(1.2)',
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </DragDropContext>
  );
}