import React from 'react';
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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {statusColumns.map((column) => (
          <Paper
            key={column.id}
            sx={{
              minWidth: 300,
              maxWidth: 300,
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
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
    </DragDropContext>
  );
}