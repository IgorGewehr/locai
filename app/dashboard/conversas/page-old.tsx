'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Stack,
  Avatar,
  Chip,
  Badge,
  CircularProgress,
  Alert,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha,
  Paper,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  MoreVert,
  Chat,
  Person,
  SmartToy,
  CheckCircle,
  Schedule,
  Cancel,
  Phone,
  Event,
  Link as LinkIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { useConversationsOptimized } from '@/lib/hooks/useConversationsOptimized';
import type { ConversationStatus } from '@/lib/types/conversation-optimized';

export default function ConversationsPage() {
  const theme = useTheme();
  const router = useRouter();
  const { tenantId, isReady } = useTenant();

  const {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    error,
    stats,
    filters,
    setFilters,
    selectConversation,
    clearSelection,
    refresh,
  } = useConversationsOptimized({
    tenantId: tenantId || '',
    autoLoad: isReady,
    limit: 20,
  });

  const [searchText, setSearchText] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Format timestamp intelligently
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(new Date(date), 'HH:mm');
    } else if (diffInHours < 168) {
      return format(new Date(date), 'EEE', { locale: ptBR });
    } else {
      return format(new Date(date), 'dd/MM/yy');
    }
  };

  // Get status color
  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'completed':
        return theme.palette.info.main;
      case 'abandoned':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Get status icon
  const getStatusIcon = (status: ConversationStatus) => {
    switch (status) {
      case 'active':
        return <Schedule fontSize="small" />;
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'abandoned':
        return <Cancel fontSize="small" />;
      default:
        return null;
    }
  };

  // Get status label
  const getStatusLabel = (status: ConversationStatus): string => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'completed':
        return 'Concluída';
      case 'abandoned':
        return 'Abandonada';
      default:
        return status;
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilters({ ...filters, search: value });
  };

  // Handle status filter
  const handleStatusFilter = (status: ConversationStatus | 'all') => {
    setFilters({ ...filters, status });
    setFilterAnchorEl(null);
  };

  // Navigate to client
  const handleGoToClient = () => {
    if (selectedConversation && selectedConversation.id) {
      const clientId = conversations.find(c => c.id === selectedConversation.id)?.id;
      if (clientId) {
        router.push(`/dashboard/clients/${clientId}`);
      }
    }
  };

  if (!isReady) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', p: 3 }}>
      <Grid container spacing={0} sx={{ height: '100%' }}>
        {/* LEFT PANEL - Conversations List */}
        <Grid
          item
          xs={12}
          md={4}
          lg={3.5}
          sx={{
            height: '100%',
            borderRight: `1px solid ${theme.palette.divider}`,
            pr: { md: 2 },
          }}
        >
          <Stack spacing={2} sx={{ height: '100%' }}>
            {/* Header */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h5" fontWeight={700}>
                  Conversas
                </Typography>
                <IconButton onClick={refresh} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Box>

              {/* Stats Cards */}
              <Grid container spacing={1} mb={2}>
                <Grid item xs={4}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                    }}
                  >
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {stats.active}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ativas
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                    }}
                  >
                    <Typography variant="h6" fontWeight={700} color="info.main">
                      {stats.completed}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Concluídas
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      bgcolor: alpha(theme.palette.grey[500], 0.1),
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      {stats.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Search & Filter */}
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar conversas..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <IconButton
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                  }}
                >
                  <FilterList />
                </IconButton>
              </Box>

              <Menu
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={() => setFilterAnchorEl(null)}
              >
                <MenuItem onClick={() => handleStatusFilter('all')}>
                  <ListItemText>Todas</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusFilter('active')}>
                  <ListItemIcon>
                    <Schedule fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText>Ativas</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusFilter('completed')}>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText>Concluídas</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusFilter('abandoned')}>
                  <ListItemIcon>
                    <Cancel fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Abandonadas</ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            {/* Conversations List */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {loading && conversations.length === 0 ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : conversations.length === 0 ? (
                <Alert severity="info" icon={<Chat />}>
                  <Typography variant="body2">
                    Nenhuma conversa encontrada.
                    {filters.search && ' Tente ajustar sua busca.'}
                  </Typography>
                </Alert>
              ) : (
                <Stack spacing={0}>
                  {conversations.map((conversation) => (
                    <Paper
                      key={conversation.id}
                      onClick={() => selectConversation(conversation.id)}
                      sx={{
                        p: 2,
                        mb: 1,
                        cursor: 'pointer',
                        borderLeft: 3,
                        borderColor:
                          selectedConversation?.id === conversation.id
                            ? 'primary.main'
                            : 'transparent',
                        bgcolor:
                          selectedConversation?.id === conversation.id
                            ? alpha(theme.palette.primary.main, 0.08)
                            : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor:
                            selectedConversation?.id === conversation.id
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.action.hover, 0.5),
                          transform: 'translateX(2px)',
                        },
                      }}
                    >
                      <Box display="flex" gap={1.5}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                          }}
                        >
                          <Person />
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={0.5}
                          >
                            <Typography variant="subtitle2" fontWeight={600} noWrap>
                              {conversation.clientName || conversation.clientPhone}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(conversation.lastMessageAt)}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {conversation.lastMessage}
                          </Typography>
                          <Box display="flex" gap={0.5} mt={1} alignItems="center">
                            <Chip
                              label={getStatusLabel(conversation.status)}
                              size="small"
                              icon={getStatusIcon(conversation.status)}
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: alpha(getStatusColor(conversation.status), 0.1),
                                color: getStatusColor(conversation.status),
                                '& .MuiChip-label': { px: 1 },
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {conversation.messageCount}{' '}
                              {conversation.messageCount === 1 ? 'msg' : 'msgs'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </Grid>

        {/* RIGHT PANEL - Messages Thread */}
        <Grid item xs={12} md={8} lg={8.5} sx={{ height: '100%', pl: { md: 2 } }}>
          {!selectedConversation ? (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              height="100%"
              sx={{
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.background.default, 0.3),
              }}
            >
              <Chat sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Selecione uma conversa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Escolha uma conversa na lista para visualizar as mensagens
              </Typography>
            </Box>
          ) : (
            <Card
              elevation={0}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" gap={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    >
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedConversation.clientName || selectedConversation.clientPhone}
                      </Typography>
                      <Box display="flex" gap={1} alignItems="center">
                        <Chip
                          label={getStatusLabel(selectedConversation.status)}
                          size="small"
                          icon={getStatusIcon(selectedConversation.status)}
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: alpha(getStatusColor(selectedConversation.status), 0.1),
                            color: getStatusColor(selectedConversation.status),
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {selectedConversation.messageCount}{' '}
                          {selectedConversation.messageCount === 1 ? 'mensagem' : 'mensagens'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box display="flex" gap={1}>
                    <IconButton size="small" title="Telefone">
                      <Phone fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleGoToClient} title="Ver cliente">
                      <LinkIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {/* Messages Container */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 3,
                  bgcolor: alpha(theme.palette.background.default, 0.3),
                }}
              >
                {loadingMessages ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : messages.length === 0 ? (
                  <Alert severity="info">
                    <Typography variant="body2">Nenhuma mensagem nesta conversa.</Typography>
                  </Alert>
                ) : (
                  <Stack spacing={3}>
                    {messages.map((message, index) => {
                      const messageDate = new Date(message.timestamp);
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const prevDate = prevMessage ? new Date(prevMessage.timestamp) : null;

                      // Show date divider if day changed
                      const showDateDivider =
                        !prevDate || messageDate.toDateString() !== prevDate.toDateString();

                      return (
                        <React.Fragment key={message.id}>
                          {showDateDivider && (
                            <Box display="flex" justifyContent="center" my={2}>
                              <Chip
                                label={format(messageDate, "EEEE, dd 'de' MMMM", {
                                  locale: ptBR,
                                })}
                                size="small"
                                icon={<Event fontSize="small" />}
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.main',
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          )}

                          <Stack spacing={2}>
                            {/* Client Message */}
                            <Box display="flex" justifyContent="flex-start" gap={1.5}>
                              <Avatar
                                sx={{
                                  bgcolor: alpha(theme.palette.info.main, 0.1),
                                  color: 'info.main',
                                  width: 36,
                                  height: 36,
                                }}
                              >
                                <Person fontSize="small" />
                              </Avatar>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  maxWidth: '70%',
                                  bgcolor: 'background.paper',
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 2,
                                  borderBottomLeftRadius: 4,
                                }}
                              >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {message.clientMessage}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', mt: 1 }}
                                >
                                  {format(messageDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </Typography>
                              </Paper>
                            </Box>

                            {/* Sofia Message */}
                            <Box display="flex" justifyContent="flex-end" gap={1.5}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  maxWidth: '70%',
                                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                  borderRadius: 2,
                                  borderBottomRightRadius: 4,
                                }}
                              >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {message.sofiaMessage}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                                  <Typography variant="caption" color="text.secondary">
                                    {format(messageDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                  </Typography>
                                  {message.context?.functionsCalled &&
                                    message.context.functionsCalled.length > 0 && (
                                      <Chip
                                        label={`${message.context.functionsCalled.length} função(ões)`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          height: 18,
                                          fontSize: '0.65rem',
                                          '& .MuiChip-label': { px: 0.75 },
                                        }}
                                      />
                                    )}
                                </Stack>
                              </Paper>
                              <Avatar
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.main',
                                  width: 36,
                                  height: 36,
                                }}
                              >
                                <SmartToy fontSize="small" />
                              </Avatar>
                            </Box>
                          </Stack>
                        </React.Fragment>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
