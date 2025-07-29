'use client';

import React, { useState, useEffect } from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  TextField,
  Divider,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Close,
  WhatsApp,
  Phone,
  Email,
  Event,
  Note,
  Task as TaskIcon,
  AttachMoney,
  LocationOn,
  Home,
  Person,
  LocalOffer,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Edit,
  Save,
  Cancel,
} from '@mui/icons-material';
import { Lead, LeadStatus, Interaction, LeadActivity, Task } from '@/lib/types/crm';
import { crmService } from '@/lib/services/crm-service';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import { safeFormatDate, DateFormats } from '@/lib/utils/date-formatter';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/hooks/useAuth';

interface LeadDetailsDrawerProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function LeadDetailsDrawer({
  lead,
  open,
  onClose,
  onUpdate,
}: LeadDetailsDrawerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState(lead);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && lead) {
      loadLeadData();
      setEditedLead(lead);
    }
  }, [open, lead]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      const [interactionsData, activitiesData] = await Promise.all([
        crmService.getLeadInteractions(lead.id),
        crmService.getLeadActivities(lead.id),
      ]);
      setInteractions(interactionsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading lead data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await crmService.updateLead(lead.id, {
        name: editedLead.name,
        email: editedLead.email,
        phone: editedLead.phone,
        status: editedLead.status,
        temperature: editedLead.temperature,
        preferences: editedLead.preferences,
        tags: editedLead.tags,
      } as any);
      setEditMode(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      await crmService.createInteraction({
        leadId: lead.id,
        tenantId: lead.tenantId,
        type: 'note' as any,
        direction: 'outbound',
        content: note,
        userId: user?.id || '',
        userName: user?.name || 'Usuário',
      });
      setNote('');
      loadLeadData();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors = {
      [LeadStatus.NEW]: 'info',
      [LeadStatus.CONTACTED]: 'primary',
      [LeadStatus.QUALIFIED]: 'secondary',
      [LeadStatus.OPPORTUNITY]: 'warning',
      [LeadStatus.NEGOTIATION]: 'error',
      [LeadStatus.WON]: 'success',
      [LeadStatus.LOST]: 'default',
      [LeadStatus.NURTURING]: 'info',
    };
    return colors[status] || 'default';
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 500, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Detalhes do Lead</Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Lead Summary */}
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
              {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              {editMode ? (
                <TextField
                  fullWidth
                  value={editedLead.name}
                  onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                  size="small"
                  sx={{ mb: 1 }}
                />
              ) : (
                <Typography variant="h6">{lead.name}</Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={lead.status}
                  size="small"
                  color={getStatusColor(lead.status) as any}
                />
                <Chip
                  label={`Score: ${lead.score}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={lead.temperature}
                  size="small"
                  color={
                    lead.temperature === 'hot'
                      ? 'error'
                      : lead.temperature === 'warm'
                      ? 'warning'
                      : 'info'
                  }
                />
              </Box>
            </Box>
            {!editMode ? (
              <IconButton onClick={() => setEditMode(true)}>
                <Edit />
              </IconButton>
            ) : (
              <Box>
                <IconButton onClick={handleSaveEdit} color="primary">
                  <Save />
                </IconButton>
                <IconButton onClick={() => setEditMode(false)}>
                  <Cancel />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Contact Info */}
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Phone fontSize="small" color="action" />
              {editMode ? (
                <TextField
                  fullWidth
                  value={editedLead.phone}
                  onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                  size="small"
                />
              ) : (
                <Typography variant="body2">{lead.phone}</Typography>
              )}
            </Box>
            {(lead.email || editMode) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email fontSize="small" color="action" />
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editedLead.email || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                    size="small"
                  />
                ) : (
                  <Typography variant="body2">{lead.email}</Typography>
                )}
              </Box>
            )}
          </Stack>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              size="small"
              startIcon={<WhatsApp />}
              onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank')}
            >
              WhatsApp
            </Button>
            <Button
              size="small"
              startIcon={<Phone />}
              onClick={() => (window.location.href = `tel:${lead.phone}`)}
            >
              Ligar
            </Button>
            {lead.email && (
              <Button
                size="small"
                startIcon={<Email />}
                onClick={() => (window.location.href = `mailto:${lead.email}`)}
              >
                Email
              </Button>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Informações" />
          <Tab label="Interações" />
          <Tab label="Atividades" />
          <Tab label="Tarefas" />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto', ...scrollbarStyles.hidden }}>
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              {/* Lead Score Progress */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Score do Lead
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={lead.score}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="h6">{lead.score}%</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Probabilidade de conversão baseada em IA
                  </Typography>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Preferências
                  </Typography>
                  <Stack spacing={1}>
                    {lead.preferences.priceRange && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoney fontSize="small" />
                        <Typography variant="body2">
                          {formatCurrency(lead.preferences.priceRange.min)} -{' '}
                          {formatCurrency(lead.preferences.priceRange.max)}
                        </Typography>
                      </Box>
                    )}
                    {lead.preferences.location && lead.preferences.location.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" />
                        <Typography variant="body2">{lead.preferences.location.join(', ')}</Typography>
                      </Box>
                    )}
                    {lead.preferences.propertyType && lead.preferences.propertyType.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Home fontSize="small" />
                        <Typography variant="body2">{lead.preferences.propertyType.join(', ')}</Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {lead.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" {...(editMode ? { onDelete: () => {} } : {})} />
                    ))}
                    {editMode && (
                      <Chip
                        label="+ Adicionar"
                        size="small"
                        variant="outlined"
                        onClick={() => {}}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              {/* Add Note */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Adicionar nota..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Note />}
                    onClick={handleAddNote}
                    disabled={!note.trim()}
                  >
                    Adicionar Nota
                  </Button>
                </CardContent>
              </Card>

              {/* Interactions Timeline */}
              <Timeline>
                {interactions.map((interaction, index) => (
                  <TimelineItem key={interaction.id}>
                    <TimelineOppositeContent sx={{ flex: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">
                        {safeFormatDate(interaction.createdAt, 'dd/MM HH:mm')}
                      </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot
                        color={
                          interaction.type === 'whatsapp_message'
                            ? 'success'
                            : interaction.type === 'phone_call'
                            ? 'primary'
                            : interaction.type === 'email'
                            ? 'secondary'
                            : 'grey'
                        }
                      >
                        {interaction.type === 'whatsapp_message' ? (
                          <WhatsApp fontSize="small" />
                        ) : interaction.type === 'phone_call' ? (
                          <Phone fontSize="small" />
                        ) : interaction.type === 'email' ? (
                          <Email fontSize="small" />
                        ) : (
                          <Note fontSize="small" />
                        )}
                      </TimelineDot>
                      {index < interactions.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2">
                            {interaction.type ? interaction.type.replace(/_/g, ' ').charAt(0).toUpperCase() +
                              interaction.type.replace(/_/g, ' ').slice(1) : 'Unknown'}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {interaction.content}
                          </Typography>
                          {interaction.sentiment && (
                            <Chip
                              label={interaction.sentiment}
                              size="small"
                              color={
                                interaction.sentiment === 'positive'
                                  ? 'success'
                                  : interaction.sentiment === 'negative'
                                  ? 'error'
                                  : 'default'
                              }
                              sx={{ mt: 1 }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <List>
                {activities.map((activity) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>
                      {activity.type === 'status_change' ? (
                        <TrendingUp />
                      ) : activity.type === 'interaction' ? (
                        <Event />
                      ) : activity.type === 'task' ? (
                        <TaskIcon />
                      ) : (
                        <Note />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={safeFormatDate(activity.createdAt, DateFormats.FULL_WITH_TIME)}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Tarefas relacionadas a este lead
              </Alert>
              <Button variant="contained" fullWidth startIcon={<TaskIcon />}>
                Criar Nova Tarefa
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}