import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  IconButton,
  Collapse,
  Button,
  CircularProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Send as SendIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Ticket } from '@/lib/types/ticket';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';

interface TicketInboxProps {
  tickets: Ticket[];
  onRefresh: () => void;
}

interface ExpandedTicket extends Ticket {
  tenantId?: string;
}

export default function TicketInbox({ tickets, onRefresh }: TicketInboxProps) {
  const { getFirebaseToken } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        ticket =>
          ticket.subject?.toLowerCase().includes(searchLower) ||
          ticket.userEmail?.toLowerCase().includes(searchLower) ||
          ticket.userName?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Sort: open tickets first, then by updatedAt
    filtered.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;

      const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
      const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  }, [tickets, search, statusFilter, priorityFilter]);

  const handleExpandTicket = (ticketId: string) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  };

  const handleReplyChange = (ticketId: string, value: string) => {
    setReplyText(prev => ({ ...prev, [ticketId]: value }));
  };

  const handleSendReply = async (ticket: ExpandedTicket) => {
    const message = replyText[ticket.id]?.trim();
    if (!message) return;

    setSending(prev => ({ ...prev, [ticket.id]: true }));

    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Token não disponível');

      const response = await fetch(`/api/admin/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          tenantId: ticket.tenantId || ticket.userId
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar resposta');
      }

      logger.info('[Admin] Resposta enviada com sucesso', {
        ticketId: ticket.id,
        component: 'TicketInbox'
      });

      // Clear reply text
      setReplyText(prev => ({ ...prev, [ticket.id]: '' }));

      // Refresh tickets
      onRefresh();
    } catch (error) {
      logger.error('[Admin] Erro ao enviar resposta', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketId: ticket.id,
        component: 'TicketInbox'
      });
      alert('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setSending(prev => ({ ...prev, [ticket.id]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#DC3545';
      case 'in_progress':
        return '#FFC107';
      case 'resolved':
        return '#28A745';
      case 'closed':
        return '#B0B0B0';
      default:
        return '#B0B0B0';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Progresso';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return '#B0B0B0';
      case 'medium':
        return '#FFC107';
      case 'high':
        return '#FF5722';
      case 'critical':
        return '#DC3545';
      default:
        return '#B0B0B0';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      case 'critical':
        return 'Crítica';
      default:
        return priority;
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por assunto, email ou usuário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#B0B0B0', fontSize: 20 }} />
              </InputAdornment>
            )
          }}
          sx={{
            flex: '1 1 300px',
            '& .MuiOutlinedInput-root': {
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& fieldset': {
                borderColor: '#2C2C2C'
              },
              '&:hover fieldset': {
                borderColor: '#404040'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#0D6EFD'
              }
            },
            '& .MuiInputAdornment-root': {
              color: '#B0B0B0'
            }
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ color: '#B0B0B0', '&.Mui-focused': { color: '#0D6EFD' } }}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="Status"
            sx={{
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2C2C2C' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0D6EFD' },
              '& .MuiSvgIcon-root': { color: '#B0B0B0' }
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="open">Aberto</MenuItem>
            <MenuItem value="in_progress">Em Progresso</MenuItem>
            <MenuItem value="resolved">Resolvido</MenuItem>
            <MenuItem value="closed">Fechado</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ color: '#B0B0B0', '&.Mui-focused': { color: '#0D6EFD' } }}>Prioridade</InputLabel>
          <Select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            label="Prioridade"
            sx={{
              bgcolor: '#1E1E1E',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2C2C2C' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0D6EFD' },
              '& .MuiSvgIcon-root': { color: '#B0B0B0' }
            }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="low">Baixa</MenuItem>
            <MenuItem value="medium">Média</MenuItem>
            <MenuItem value="high">Alta</MenuItem>
            <MenuItem value="critical">Crítica</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Atualizar">
          <IconButton onClick={onRefresh} size="small" sx={{ color: '#B0B0B0' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          {filteredTickets.length} de {tickets.length} tickets
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1A1A1A' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0', width: 40 }}>

              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Assunto
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Usuário
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Prioridade
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Criado em
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#B0B0B0' }}>
                Respostas
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.map(ticket => {
              const isExpanded = expandedTicket === ticket.id;
              const hasUnread = ticket.unreadCount && ticket.unreadCount > 0;

              return (
                <React.Fragment key={ticket.id}>
                  <TableRow
                    onClick={() => handleExpandTicket(ticket.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#1A1A1A' },
                      borderBottom: isExpanded ? 'none' : '1px solid #2C2C2C',
                      bgcolor: hasUnread ? '#FFF3CD15' : 'transparent'
                    }}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#FFFFFF', fontWeight: hasUnread ? 600 : 500 }}>
                      {ticket.subject || 'Sem assunto'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#B0B0B0' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {ticket.userName || 'Usuário'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#B0B0B0', fontSize: '0.75rem' }}>
                          {ticket.userEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(ticket.status)}
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          height: 24,
                          bgcolor: getStatusColor(ticket.status) + '15',
                          color: getStatusColor(ticket.status),
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPriorityLabel(ticket.priority)}
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          height: 24,
                          bgcolor: getPriorityColor(ticket.priority) + '15',
                          color: getPriorityColor(ticket.priority),
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: '#B0B0B0' }}>
                      {(() => {
                        try {
                          if (!ticket.createdAt) return '-';
                          const date = ticket.createdAt.toDate?.() || new Date(ticket.createdAt);
                          if (isNaN(date.getTime())) return '-';
                          return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
                        } catch {
                          return '-';
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={ticket.unreadCount || 0} color="error">
                        <Chip
                          label={ticket.responses?.length || 0}
                          size="small"
                          sx={{
                            fontSize: '0.75rem',
                            height: 24,
                            bgcolor: '#2C2C2C',
                            color: '#FFFFFF',
                            fontWeight: 500
                          }}
                        />
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details + Quick Reply */}
                  <TableRow sx={{ borderBottom: '1px solid #2C2C2C' }}>
                    <TableCell colSpan={7} sx={{ p: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, bgcolor: '#1A1A1A' }}>
                          {/* Ticket Description */}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" sx={{ color: '#B0B0B0', fontWeight: 600, textTransform: 'uppercase' }}>
                              Descrição
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: '#FFFFFF' }}>
                              {ticket.description || 'Sem descrição'}
                            </Typography>
                          </Box>

                          {/* Responses */}
                          {ticket.responses && ticket.responses.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="caption" sx={{ color: '#B0B0B0', fontWeight: 600, textTransform: 'uppercase', mb: 1 }}>
                                Respostas ({ticket.responses.length})
                              </Typography>
                              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {ticket.responses.map((response: any) => (
                                  <Box
                                    key={response.id}
                                    sx={{
                                      p: 2,
                                      bgcolor: response.isAdmin ? '#0D6EFD15' : '#2C2C2C',
                                      border: '1px solid',
                                      borderColor: response.isAdmin ? '#0D6EFD' : '#404040',
                                      borderRadius: 1
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: response.isAdmin ? '#0D6EFD' : '#FFFFFF' }}>
                                        {response.authorName || (response.isAdmin ? 'Admin' : 'Usuário')}
                                        {response.isAdmin && ' (Admin)'}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                                        {(() => {
                                          try {
                                            if (!response.createdAt) return '-';
                                            const date = response.createdAt.toDate?.() || new Date(response.createdAt);
                                            if (isNaN(date.getTime())) return '-';
                                            return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                          } catch {
                                            return '-';
                                          }
                                        })()}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#FFFFFF', lineHeight: 1.6 }}>
                                      {response.message || response.content}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )}

                          {/* Quick Reply */}
                          <Box>
                            <Typography variant="caption" sx={{ color: '#B0B0B0', fontWeight: 600, textTransform: 'uppercase', mb: 1 }}>
                              Resposta Rápida
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                              <TextField
                                fullWidth
                                size="small"
                                multiline
                                rows={3}
                                placeholder="Digite sua resposta..."
                                value={replyText[ticket.id] || ''}
                                onChange={e => handleReplyChange(ticket.id, e.target.value)}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: '#1E1E1E',
                                    fontSize: '0.875rem',
                                    color: '#FFFFFF',
                                    '& fieldset': {
                                      borderColor: '#2C2C2C'
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#404040'
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#0D6EFD'
                                    }
                                  },
                                  '& .MuiInputBase-input::placeholder': {
                                    color: '#B0B0B0',
                                    opacity: 1
                                  }
                                }}
                              />
                              <Button
                                variant="contained"
                                onClick={() => handleSendReply(ticket as ExpandedTicket)}
                                disabled={!replyText[ticket.id]?.trim() || sending[ticket.id]}
                                startIcon={sending[ticket.id] ? <CircularProgress size={16} /> : <SendIcon />}
                                sx={{
                                  bgcolor: '#0D6EFD',
                                  textTransform: 'none',
                                  fontWeight: 500,
                                  '&:hover': { bgcolor: '#0B5ED7' },
                                  minWidth: 100
                                }}
                              >
                                Enviar
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredTickets.length === 0 && (
        <Box sx={{ py: 8, textAlign: 'center', color: '#B0B0B0' }}>
          <Typography variant="body2">Nenhum ticket encontrado</Typography>
        </Box>
      )}
    </Box>
  );
}
