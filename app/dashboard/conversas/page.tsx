'use client';

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Event,
  Link as LinkIcon,
  DoneAll,
  MarkChatUnread,
  EmojiEvents,
  Edit,
  Block as BlockIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormat, formatTimestamp as safeFormatTimestamp, toDate } from '@/lib/utils/date-helpers';
import { useRouter } from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroll-component';
import { lazy, Suspense } from 'react';
import { useMetrics } from '@/lib/hooks/useMetrics';

const Heatmap = lazy(() => import('@/components/organisms/Heatmap'));
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { useConversationsOptimized } from '@/lib/hooks/useConversationsOptimized';
import type { ConversationStatus } from '@/lib/types/conversation-optimized';
import AIControlButton from '@/app/dashboard/conversations/components/AIControlButton';
import { Send } from '@mui/icons-material';

export default function ConversationsPage() {
  const theme = useTheme();
  const router = useRouter();
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();
  const { data: metricsData } = useMetrics('7d');

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
    hasMore,
    loadMoreConversations,
    markAsRead,
    markAsUnread,
    updateStatus,
    renameConversation,
  } = useConversationsOptimized({
    tenantId: tenantId || '',
    autoLoad: isReady,
    limit: 20,
  });

  const [searchText, setSearchText] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiBlocked, setAiBlocked] = useState(false);
  const [checkingAiStatus, setCheckingAiStatus] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    conversationId: string;
  } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editedConversations, setEditedConversations] = useState<Set<string>>(new Set());

  // Check AI block status when conversation changes
  useEffect(() => {
    if (!selectedConversation || !tenantId) {
      setAiBlocked(false);
      return;
    }

    const checkAiStatus = async () => {
      setCheckingAiStatus(true);
      try {
        const token = await getFirebaseToken();

        // Skip if no token available yet
        if (!token) {
          console.warn('[AI-BLOCK] No token available, skipping check');
          setCheckingAiStatus(false);
          return;
        }

        const response = await fetch(
          `/api/ai/block-conversation?phone=${encodeURIComponent(selectedConversation.clientPhone)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        );

        if (!response.ok) {
          console.error('[AI-BLOCK] Check failed with status:', response.status);
          setAiBlocked(false);
          return;
        }

        const result = await response.json();

        // Check if data exists and has blocked property, or check if blockData exists
        if (result.success && result.data) {
          setAiBlocked(result.data.blocked || false);
        } else {
          setAiBlocked(false);
        }
      } catch (error) {
        console.error('[AI-BLOCK] Error checking AI status:', error);
        setAiBlocked(false);
      } finally {
        setCheckingAiStatus(false);
      }
    };

    checkAiStatus();

    // Poll every 5 seconds to update status
    const interval = setInterval(checkAiStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedConversation, tenantId, getFirebaseToken]);

  // Block AI for 1 hour and enable manual mode
  const handleEnableManualMode = async () => {
    if (!selectedConversation || !tenantId) return;

    setCheckingAiStatus(true);
    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/ai/block-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: selectedConversation.clientPhone,
          blocked: true, // Required field!
          duration: 1, // 1 hour
          reason: 'Modo manual ativado pelo usuário'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao ativar modo manual');
      }

      setAiBlocked(true);
    } catch (error) {
      console.error('Error enabling manual mode:', error);
      alert(error instanceof Error ? error.message : 'Erro ao ativar modo manual');
    } finally {
      setCheckingAiStatus(false);
    }
  };

  // Send manual message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !tenantId) return;

    setSendingMessage(true);
    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/whatsapp/send-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId,
          phone: selectedConversation.clientPhone,
          message: messageInput.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao enviar mensagem');
      }

      setMessageInput('');
      // Refresh messages to show the new one
      setTimeout(() => refresh(), 500);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  // Using safeFormatTimestamp from date-helpers

  // Get status color
  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case 'active':
        return theme.palette.warning.main;
      case 'completed':
        return theme.palette.info.main;
      case 'success':
        return theme.palette.success.main;
      case 'abandoned':
        return theme.palette.error.main;
      case 'pending':
        return theme.palette.grey[500];
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
      case 'success':
        return <EmojiEvents fontSize="small" />;
      case 'abandoned':
        return <Cancel fontSize="small" />;
      case 'pending':
        return <Schedule fontSize="small" />;
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
      case 'success':
        return 'Sucesso';
      case 'abandoned':
        return 'Abandonada';
      case 'pending':
        return 'Pendente';
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

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent, conversationId: string) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      conversationId,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Handle conversation selection with auto mark as read
  const handleSelectConversation = async (conversationId: string) => {
    selectConversation(conversationId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation && !conversation.isRead) {
      await markAsRead(conversationId);
    }
  };

  // Handle rename conversation
  const handleOpenRenameDialog = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    setRenameConversationId(conversationId);
    setNewName(conversation?.clientName || conversation?.clientPhone || '');
    setRenameDialogOpen(true);
    handleCloseContextMenu();
  };

  const handleCloseRenameDialog = () => {
    setRenameDialogOpen(false);
    setRenameConversationId(null);
    setNewName('');
  };

  const handleSaveRename = async () => {
    if (renameConversationId && newName.trim()) {
      try {
        await renameConversation(renameConversationId, newName.trim());
        // Mark conversation as edited
        setEditedConversations(prev => new Set(prev).add(renameConversationId));
        handleCloseRenameDialog();
      } catch (error) {
        console.error('Error renaming conversation:', error);
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
                    <Schedule fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText>Ativas</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusFilter('completed')}>
                  <ListItemIcon>
                    <CheckCircle fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText>Concluídas</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusFilter('success')}>
                  <ListItemIcon>
                    <EmojiEvents fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText>Sucesso</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusFilter('abandoned')}>
                  <ListItemIcon>
                    <Cancel fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Abandonadas</ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            {/* Conversations List with Infinite Scroll */}
            <Box
              id="conversations-scrollable-div"
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
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
                <InfiniteScroll
                  dataLength={conversations.length}
                  next={loadMoreConversations}
                  hasMore={hasMore}
                  loader={
                    <Box display="flex" justifyContent="center" py={2}>
                      <CircularProgress size={24} />
                    </Box>
                  }
                  endMessage={
                    <Typography variant="caption" display="block" textAlign="center" py={2} color="text.secondary">
                      {conversations.length > 0 ? 'Todas as conversas carregadas' : ''}
                    </Typography>
                  }
                  scrollableTarget="conversations-scrollable-div"
                >
                  <Stack spacing={0}>
                    {conversations.map((conversation) => (
                      <Paper
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                        onContextMenu={(e) => handleContextMenu(e, conversation.id)}
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
                              : conversation.isRead === false
                              ? alpha(theme.palette.info.main, 0.05)
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
                          <Badge
                            badgeContent={conversation.unreadCount}
                            color="error"
                            invisible={conversation.isRead !== false || conversation.unreadCount === 0}
                          >
                            <Avatar
                              sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                              }}
                            >
                              <Person />
                            </Avatar>
                          </Badge>
                          <Box flex={1} minWidth={0}>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              mb={0.5}
                            >
                              <Box display="flex" alignItems="center" gap={0.75} flex={1} minWidth={0}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={conversation.isRead === false ? 700 : 600}
                                  noWrap
                                  sx={{ flex: 1, minWidth: 0 }}
                                >
                                  {conversation.clientName || conversation.clientPhone}
                                </Typography>
                                {!editedConversations.has(conversation.id) && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenRenameDialog(conversation.id);
                                    }}
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      p: 0.5,
                                      opacity: 0.6,
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        opacity: 1,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                    title="Renomear conversa"
                                  >
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                {safeFormatTimestamp(conversation.lastMessageAt)}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: conversation.isRead === false ? 600 : 400,
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
                </InfiniteScroll>
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
                  <Box display="flex" gap={1} alignItems="center">
                    <AIControlButton
                      phone={selectedConversation.clientPhone}
                      conversationName={selectedConversation.clientName}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleContextMenu(e, selectedConversation.id)}
                      title="Mais opções"
                    >
                      <MoreVert fontSize="small" />
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
                      // DEBUG: Log message data
                      console.log('🎨 [DEBUG] Rendering message:', {
                        id: message.id,
                        hasClientMessage: !!message.clientMessage,
                        hasSofiaMessage: !!message.sofiaMessage,
                        clientMessage: message.clientMessage?.substring(0, 30),
                        sofiaMessage: message.sofiaMessage?.substring(0, 30),
                        clientMessageTimestamp: message.clientMessageTimestamp,
                        clientMessageTimestampType: typeof message.clientMessageTimestamp,
                        createdAt: message.createdAt,
                        createdAtType: typeof message.createdAt,
                        allFields: Object.keys(message)
                      });

                      // SAFE DATE PARSING usando toDate helper
                      const messageTimestamp = message.clientMessageTimestamp || message.createdAt;
                      const messageDate = toDate(messageTimestamp);

                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const prevTimestamp = prevMessage
                        ? (prevMessage.clientMessageTimestamp || prevMessage.createdAt)
                        : null;
                      const prevDate = prevTimestamp ? toDate(prevTimestamp) : null;

                      const showDateDivider =
                        !prevDate ||
                        (messageDate && prevDate &&
                        messageDate.toDateString() !== prevDate.toDateString());

                      return (
                        <React.Fragment key={message.id}>
                          {showDateDivider && (
                            <Box display="flex" justifyContent="center" my={2}>
                              <Chip
                                label={safeFormat(messageDate, "EEEE, dd 'de' MMMM")}
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
                                  {messageDate ? safeFormat(messageDate, 'dd/MM/yyyy HH:mm') : '--:--'}
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
                                    {messageDate ? safeFormat(messageDate, 'dd/MM/yyyy HH:mm') : '--:--'}
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

              {/* Modern Message Input Bar - Fixed at bottom */}
              {selectedConversation && (
                <Box
                  sx={{
                    p: 2,
                    borderTop: `1px solid ${theme.palette.divider}`,
                    bgcolor: !aiBlocked
                      ? alpha(theme.palette.error.main, 0.05)
                      : theme.palette.background.paper,
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    backdropFilter: 'blur(10px)',
                    boxShadow: `0 -2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'center',
                      maxWidth: '100%',
                    }}
                  >
                    {!aiBlocked ? (
                      // AI Mode Active - Click to enable manual mode
                      <Box
                        onClick={handleEnableManualMode}
                        sx={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          py: 1.25,
                          px: 3,
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                          borderRadius: '24px',
                          cursor: checkingAiStatus ? 'default' : 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: `1.5px solid ${alpha(theme.palette.error.main, 0.2)}`,
                          '&:hover': checkingAiStatus ? {} : {
                            bgcolor: alpha(theme.palette.error.main, 0.15),
                            transform: 'translateY(-2px)',
                            boxShadow: `0 6px 20px ${alpha(theme.palette.error.main, 0.15)}`,
                            borderColor: alpha(theme.palette.error.main, 0.4),
                          },
                        }}
                      >
                        {checkingAiStatus ? (
                          <CircularProgress size={20} thickness={4} sx={{ color: theme.palette.error.main }} />
                        ) : (
                          <BlockIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                        )}
                        <Typography
                          sx={{
                            color: theme.palette.error.main,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            userSelect: 'none',
                            letterSpacing: '0.01em',
                          }}
                        >
                          Pausar IA e responder manualmente
                        </Typography>
                      </Box>
                    ) : (
                      // Manual Mode Active - Professional input bar
                      <>
                        <TextField
                          fullWidth
                          multiline
                          maxRows={4}
                          placeholder="Digite sua mensagem..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sendingMessage}
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '20px',
                              bgcolor: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.9)
                                : alpha(theme.palette.common.white, 0.95),
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
                              '& fieldset': {
                                borderColor: alpha(theme.palette.divider, 0.6),
                                borderWidth: '1.5px',
                              },
                              '&:hover': {
                                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.08)}`,
                                '& fieldset': {
                                  borderColor: alpha(theme.palette.primary.main, 0.4),
                                },
                              },
                              '&.Mui-focused': {
                                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}`,
                                '& fieldset': {
                                  borderColor: theme.palette.primary.main,
                                  borderWidth: '2px',
                                },
                              },
                              '&.Mui-disabled': {
                                opacity: 0.6,
                              },
                            },
                            '& .MuiInputBase-input': {
                              py: 1,
                              px: 2,
                              fontSize: '0.9rem',
                              lineHeight: 1.5,
                              '&::placeholder': {
                                color: alpha(theme.palette.text.secondary, 0.5),
                                opacity: 1,
                              },
                            },
                          }}
                        />
                        <IconButton
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() || sendingMessage}
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.common.white,
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              bgcolor: theme.palette.primary.dark,
                              transform: 'scale(1.08) translateY(-2px)',
                              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                            },
                            '&:active': {
                              transform: 'scale(0.98)',
                            },
                            '&.Mui-disabled': {
                              bgcolor: alpha(theme.palette.action.disabled, 0.15),
                              color: alpha(theme.palette.action.disabled, 0.4),
                              boxShadow: 'none',
                            },
                          }}
                        >
                          {sendingMessage ? (
                            <CircularProgress size={20} thickness={4} sx={{ color: theme.palette.common.white }} />
                          ) : (
                            <Send sx={{ fontSize: 20 }} />
                          )}
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>
              )}
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (contextMenu) {
              handleOpenRenameDialog(contextMenu.conversationId);
            }
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Renomear Conversa</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            if (contextMenu) {
              markAsRead(contextMenu.conversationId);
              handleCloseContextMenu();
            }
          }}
        >
          <ListItemIcon>
            <DoneAll fontSize="small" />
          </ListItemIcon>
          <ListItemText>Marcar como Lida</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (contextMenu) {
              markAsUnread(contextMenu.conversationId);
              handleCloseContextMenu();
            }
          }}
        >
          <ListItemIcon>
            <MarkChatUnread fontSize="small" />
          </ListItemIcon>
          <ListItemText>Marcar como Não Lida</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            if (contextMenu) {
              updateStatus(contextMenu.conversationId, 'active');
              handleCloseContextMenu();
            }
          }}
        >
          <ListItemIcon>
            <Schedule fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Marcar como Ativa</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (contextMenu) {
              updateStatus(contextMenu.conversationId, 'completed');
              handleCloseContextMenu();
            }
          }}
        >
          <ListItemIcon>
            <CheckCircle fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText>Marcar como Concluída</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (contextMenu) {
              updateStatus(contextMenu.conversationId, 'success');
              handleCloseContextMenu();
            }
          }}
        >
          <ListItemIcon>
            <EmojiEvents fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Marcar como Sucesso</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (contextMenu) {
              updateStatus(contextMenu.conversationId, 'abandoned');
              handleCloseContextMenu();
            }
          }}
        >
          <ListItemIcon>
            <Cancel fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Marcar como Abandonada</ListItemText>
        </MenuItem>
      </Menu>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={handleCloseRenameDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Renomear Conversa</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome"
            type="text"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveRename();
              }
            }}
            placeholder="Digite o nome do contato"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRenameDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveRename}
            variant="contained"
            disabled={!newName.trim()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Heatmap de Atividade */}
      {metricsData?.heatmapData && metricsData.heatmapData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Suspense fallback={<CircularProgress />}>
            <Heatmap data={metricsData.heatmapData} />
          </Suspense>
        </Box>
      )}
    </Box>
  );
}
