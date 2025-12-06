'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  MoreVert,
  Chat,
  Person,
  CheckCircle,
  Schedule,
  Cancel,
  EmojiEvents,
  Edit,
  DoneAll,
  MarkChatUnread,
  Facebook,
  Instagram,
  WhatsApp,
} from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { useConversations } from '@/lib/hooks/useConversations';
import { useAIBlockStatus } from '@/lib/hooks/useAIBlockStatus';
import { logger } from '@/lib/utils/logger';
import { toDate } from '@/lib/utils/date-helpers';
import type { ConversationHeaderStatus } from '@/lib/types/conversation';
import AIControlButton from '@/components/organisms/conversations/AIControlButton';
import ConversationItem from '@/components/organisms/conversations/ConversationItem';
import MessageBubble from '@/components/organisms/conversations/MessageBubble';
import MessageInput from '@/components/organisms/conversations/MessageInput';
import {
  ConversationListSkeleton,
  MessagesListSkeleton,
  StatsCardsSkeleton,
  ConversationsPageSkeleton,
} from '@/components/organisms/conversations/ConversationSkeletons';

// Memoized status helpers
const statusLabels: Record<string, string> = {
  active: 'Ativa',
  completed: 'Concluida',
  success: 'Sucesso',
  abandoned: 'Abandonada',
  pending: 'Pendente',
};

const getStatusColor = (status: ConversationHeaderStatus, palette: any) => {
  switch (status) {
    case 'active': return palette.warning.main;
    case 'completed': return palette.info.main;
    case 'success': return palette.success.main;
    case 'abandoned': return palette.error.main;
    case 'pending': return palette.grey[500];
    default: return palette.grey[500];
  }
};

const StatusIcon = memo(({ status }: { status: ConversationHeaderStatus }) => {
  switch (status) {
    case 'active': return <Schedule fontSize="small" />;
    case 'completed': return <CheckCircle fontSize="small" />;
    case 'success': return <EmojiEvents fontSize="small" />;
    case 'abandoned': return <Cancel fontSize="small" />;
    case 'pending': return <Schedule fontSize="small" />;
    default: return null;
  }
});
StatusIcon.displayName = 'StatusIcon';

// Channel Selector Component
const ChannelSelector = memo(({
  selectedChannel,
  onChannelChange,
  stats,
}: {
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
  stats: { total: number; whatsapp: number; facebook: number; instagram: number };
}) => {
  const theme = useTheme();

  const channels = [
    { id: 'all', icon: Chat, label: 'Todas', count: stats.total, color: theme.palette.primary.main },
    { id: 'whatsapp', icon: WhatsApp, label: 'WhatsApp', count: stats.whatsapp, color: '#25D366' },
    { id: 'facebook', icon: Facebook, label: 'Facebook', count: stats.facebook, color: '#1877F2' },
    { id: 'instagram', icon: Instagram, label: 'Instagram', count: stats.instagram, color: '#E4405F' },
  ];

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Box sx={{ minHeight: 48, display: 'flex', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, letterSpacing: 1 }}>
          CANAIS
        </Typography>
      </Box>
      <Stack spacing={1}>
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selectedChannel === channel.id;

          return (
            <Paper
              key={channel.id}
              onClick={() => onChannelChange(channel.id)}
              elevation={isSelected ? 3 : 0}
              sx={{
                p: 1.25,
                cursor: 'pointer',
                borderLeft: 3,
                borderColor: isSelected ? channel.color : 'transparent',
                bgcolor: isSelected ? alpha(channel.color, 0.12) : 'background.paper',
                transition: 'all 0.15s ease-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': {
                  bgcolor: isSelected ? alpha(channel.color, 0.16) : alpha(theme.palette.action.hover, 0.8),
                  borderColor: isSelected ? channel.color : alpha(channel.color, 0.4),
                  transform: 'scale(1.02)',
                },
              }}
              title={channel.label}
            >
              <Icon sx={{ fontSize: 24, color: isSelected ? channel.color : 'text.secondary' }} />
              <Typography
                variant="caption"
                fontWeight={isSelected ? 700 : 600}
                color={isSelected ? channel.color : 'text.secondary'}
                sx={{ fontSize: '0.7rem' }}
              >
                {channel.count}
              </Typography>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
});
ChannelSelector.displayName = 'ChannelSelector';

// Stats Cards Component
const StatsCards = memo(({ active, completed, total }: { active: number; completed: number; total: number }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={1} mb={2}>
      <Grid item xs={4}>
        <Paper sx={{ p: { xs: 1, md: 1.5 }, textAlign: 'center', bgcolor: alpha(theme.palette.success.main, 0.1) }}>
          <Typography variant="h6" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
            {active}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
            Ativas
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper sx={{ p: { xs: 1, md: 1.5 }, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.1) }}>
          <Typography variant="h6" fontWeight={700} color="info.main" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
            {completed}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
            Concluidas
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper sx={{ p: { xs: 1, md: 1.5 }, textAlign: 'center', bgcolor: alpha(theme.palette.grey[500], 0.1) }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
            {total}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
            Total
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
});
StatsCards.displayName = 'StatsCards';

// Messages List Component
const MessagesList = memo(({
  messages,
  loading,
  messagesEndRef,
}: {
  messages: any[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) => {
  // Pre-calculate date dividers
  const messagesWithDividers = useMemo(() => {
    return messages.map((message, index) => {
      const messageTimestamp = message.clientMessageTimestamp || message.createdAt;
      const messageDate = toDate(messageTimestamp);

      const prevMessage = index > 0 ? messages[index - 1] : null;
      const prevTimestamp = prevMessage ? (prevMessage.clientMessageTimestamp || prevMessage.createdAt) : null;
      const prevDate = prevTimestamp ? toDate(prevTimestamp) : null;

      const showDateDivider = !prevDate || (messageDate && prevDate && messageDate.toDateString() !== prevDate.toDateString());

      return { message, showDateDivider };
    });
  }, [messages]);

  if (loading) {
    return (
      <Box py={2}>
        <MessagesListSkeleton count={5} />
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">Nenhuma mensagem nesta conversa.</Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {messagesWithDividers.map(({ message, showDateDivider }) => (
        <MessageBubble
          key={message.id}
          message={message}
          showDateDivider={showDateDivider}
        />
      ))}
      <div ref={messagesEndRef} />
    </Stack>
  );
});
MessagesList.displayName = 'MessagesList';

export default function ConversationsPage() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();

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
  } = useConversations({
    tenantId: tenantId || '',
    autoLoad: isReady,
    limit: 20,
  });

  // AI Block Status hook - optimized
  const {
    blocked: aiBlocked,
    loading: checkingAiStatus,
    enableManualMode,
  } = useAIBlockStatus({
    phone: selectedConversation?.clientPhone,
    tenantId,
    getFirebaseToken,
  });

  // Local UI state
  const [searchText, setSearchText] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; conversationId: string; } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editedConversations, setEditedConversations] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate filtered stats (memoized)
  const filteredStats = useMemo(() => {
    const relevantConversations = filters.channel === 'all'
      ? conversations
      : conversations.filter(c => (c.channel || 'whatsapp') === filters.channel);

    return {
      active: relevantConversations.filter(c => c.status === 'active').length,
      completed: relevantConversations.filter(c => c.status === 'completed').length,
      total: relevantConversations.length,
    };
  }, [conversations, filters.channel]);

  // Apply search param from URL on mount
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchText(searchParam);
      setFilters(prev => ({ ...prev, search: searchParam }));
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchText }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, setFilters]);

  // Handlers (memoized)
  const handleChannelChange = useCallback((channel: string) => {
    setFilters(prev => ({ ...prev, channel: channel as any }));
  }, [setFilters]);

  const handleStatusFilter = useCallback((status: ConversationHeaderStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
    setFilterAnchorEl(null);
  }, [setFilters]);

  const handleContextMenu = useCallback((event: React.MouseEvent, conversationId: string) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4, conversationId });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    selectConversation(conversationId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation && !conversation.isRead) {
      await markAsRead(conversationId);
    }
  }, [selectConversation, conversations, markAsRead]);

  const handleOpenRenameDialog = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    setRenameConversationId(conversationId);
    setNewName(conversation?.clientName || conversation?.clientPhone || '');
    setRenameDialogOpen(true);
    handleCloseContextMenu();
  }, [conversations, handleCloseContextMenu]);

  const handleCloseRenameDialog = useCallback(() => {
    setRenameDialogOpen(false);
    setRenameConversationId(null);
    setNewName('');
  }, []);

  const handleSaveRename = useCallback(async () => {
    if (renameConversationId && newName.trim()) {
      try {
        await renameConversation(renameConversationId, newName.trim());
        setEditedConversations(prev => new Set(prev).add(renameConversationId));
        handleCloseRenameDialog();
      } catch (error) {
        logger.error('Error renaming conversation', {
          error: error instanceof Error ? error.message : 'Unknown error',
          conversationId: renameConversationId,
        });
      }
    }
  }, [renameConversationId, newName, renameConversation, handleCloseRenameDialog]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedConversation || !tenantId) return;

    const token = await getFirebaseToken();

    let endpoint = '/api/whatsapp/send-manual';
    let body: any = { tenantId, message };

    if (selectedConversation.channel === 'facebook' || selectedConversation.channel === 'instagram') {
      endpoint = '/api/social/send';
      body = { tenantId, conversationId: selectedConversation.id, message };
    } else {
      body.phone = selectedConversation.clientPhone;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao enviar mensagem');
    }

    // Real-time Firestore listener will automatically update the messages list
    // No need for manual refresh - the subscribeToMessages listener handles it
  }, [selectedConversation, tenantId, getFirebaseToken]);

  const handleEnableManualMode = useCallback(async () => {
    try {
      await enableManualMode(1, 'Modo manual ativado pelo usuario');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao ativar modo manual');
    }
  }, [enableManualMode]);

  // Show full page skeleton during initial load
  if (!isReady || (loading && conversations.length === 0)) {
    return <ConversationsPageSkeleton />;
  }

  return (
    <Box sx={{ height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 80px)' }, p: { xs: 0, md: 3 } }}>
      <Grid container spacing={{ xs: 0, md: 2 }} sx={{ height: '100%' }}>
        {/* LEFT SIDEBAR - Channel Selector */}
        <Grid item xs={12} md={1.5} lg={1.2} sx={{ height: '100%', display: { xs: 'none', md: 'block' } }}>
          <ChannelSelector
            selectedChannel={filters.channel}
            onChannelChange={handleChannelChange}
            stats={stats}
          />
        </Grid>

        {/* MIDDLE PANEL - Conversations List */}
        <Grid
          item
          xs={12}
          md={4}
          lg={3.3}
          sx={{
            height: '100%',
            borderRight: { md: `1px solid ${theme.palette.divider}` },
            pr: { md: 2 },
            display: { xs: selectedConversation ? 'none' : 'block', md: 'block' },
          }}
        >
          <Stack spacing={2} sx={{ height: '100%' }}>
            {/* Mobile Channel Tabs */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={filters.channel}
                onChange={(_, newValue) => handleChannelChange(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ '& .MuiTab-root': { minHeight: 56, textTransform: 'none', fontWeight: 600 } }}
              >
                <Tab value="all" icon={<Chat />} label={`Todas (${stats.total})`} iconPosition="start" />
                <Tab value="whatsapp" icon={<WhatsApp />} label={`WhatsApp (${stats.whatsapp})`} iconPosition="start" />
                <Tab value="facebook" icon={<Facebook />} label={`Facebook (${stats.facebook})`} iconPosition="start" />
                <Tab value="instagram" icon={<Instagram />} label={`Instagram (${stats.instagram})`} iconPosition="start" />
              </Tabs>
            </Box>

            {/* Header */}
            <Box sx={{ px: { xs: 2, md: 0 }, pt: { xs: 2, md: 0 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ minHeight: 48 }}>
                <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                  Conversas
                </Typography>
                <IconButton onClick={refresh} disabled={loading} size="small">
                  <Refresh />
                </IconButton>
              </Box>

              {/* Active Filters Info */}
              {(filters.channel !== 'all' || filters.status !== 'all') && (
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Filtros ativos:
                  </Typography>
                  {filters.channel !== 'all' && (
                    <Chip
                      size="small"
                      icon={filters.channel === 'whatsapp' ? <WhatsApp sx={{ fontSize: 14 }} /> : filters.channel === 'facebook' ? <Facebook sx={{ fontSize: 14 }} /> : <Instagram sx={{ fontSize: 14 }} />}
                      label={filters.channel === 'whatsapp' ? 'WhatsApp' : filters.channel === 'facebook' ? 'Facebook' : 'Instagram'}
                      onDelete={() => handleChannelChange('all')}
                      sx={{ height: 24 }}
                    />
                  )}
                  {filters.status !== 'all' && (
                    <Chip
                      size="small"
                      icon={<StatusIcon status={filters.status} />}
                      label={statusLabels[filters.status]}
                      onDelete={() => handleStatusFilter('all')}
                      sx={{ height: 24, bgcolor: alpha(getStatusColor(filters.status, theme.palette), 0.1), color: getStatusColor(filters.status, theme.palette) }}
                    />
                  )}
                  <Button size="small" variant="text" onClick={() => { handleChannelChange('all'); handleStatusFilter('all'); }} sx={{ height: 24, minWidth: 'auto', px: 1, fontSize: '0.7rem', textTransform: 'none' }}>
                    Limpar filtros
                  </Button>
                </Box>
              )}

              {/* Stats Cards */}
              <StatsCards active={filteredStats.active} completed={filteredStats.completed} total={filteredStats.total} />

              {/* Search & Filter */}
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar conversas..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                  <FilterList />
                </IconButton>
              </Box>

              <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={() => setFilterAnchorEl(null)}>
                <MenuItem onClick={() => handleStatusFilter('all')}><ListItemText>Todas</ListItemText></MenuItem>
                <MenuItem onClick={() => handleStatusFilter('active')}><ListItemIcon><Schedule fontSize="small" color="warning" /></ListItemIcon><ListItemText>Ativas</ListItemText></MenuItem>
                <MenuItem onClick={() => handleStatusFilter('completed')}><ListItemIcon><CheckCircle fontSize="small" color="info" /></ListItemIcon><ListItemText>Concluidas</ListItemText></MenuItem>
                <MenuItem onClick={() => handleStatusFilter('success')}><ListItemIcon><EmojiEvents fontSize="small" color="success" /></ListItemIcon><ListItemText>Sucesso</ListItemText></MenuItem>
                <MenuItem onClick={() => handleStatusFilter('abandoned')}><ListItemIcon><Cancel fontSize="small" color="error" /></ListItemIcon><ListItemText>Abandonadas</ListItemText></MenuItem>
              </Menu>
            </Box>

            {/* Conversations List with Infinite Scroll */}
            <Box id="conversations-scrollable-div" sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: { xs: 2, md: 0 } }}>
              {loading && conversations.length === 0 ? (
                <ConversationListSkeleton count={6} />
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
                  loader={<ConversationListSkeleton count={2} />}
                  endMessage={<Typography variant="caption" display="block" textAlign="center" py={2} color="text.secondary">{conversations.length > 0 ? 'Todas as conversas carregadas' : ''}</Typography>}
                  scrollableTarget="conversations-scrollable-div"
                >
                  <Stack spacing={0}>
                    {conversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isSelected={selectedConversation?.id === conversation.id}
                        isEdited={editedConversations.has(conversation.id)}
                        onSelect={handleSelectConversation}
                        onContextMenu={handleContextMenu}
                        onRename={handleOpenRenameDialog}
                      />
                    ))}
                  </Stack>
                </InfiniteScroll>
              )}
            </Box>
          </Stack>
        </Grid>

        {/* RIGHT PANEL - Messages Thread */}
        <Grid item xs={12} md={6.5} lg={7.5} sx={{ height: '100%', pl: { md: 2 }, display: { xs: !selectedConversation ? 'none' : 'block', md: 'block' } }}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  display: { xs: 'none', md: 'flex' },
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
                  border: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
                  borderRadius: { xs: 0, md: 1 },
                }}
              >
                {/* Chat Header */}
                <Box
                  sx={{
                    minHeight: { xs: 64, md: 88 },
                    p: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                    <Box display="flex" gap={{ xs: 1, md: 2 }} alignItems="center">
                      <IconButton onClick={clearSelection} sx={{ display: { xs: 'flex', md: 'none' }, mr: 0.5 }} size="small">
                        <Chat />
                      </IconButton>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {selectedConversation.clientName || selectedConversation.clientPhone}
                        </Typography>
                        <Box display="flex" gap={1} alignItems="center">
                          <Chip
                            label={statusLabels[selectedConversation.status] || selectedConversation.status}
                            size="small"
                            icon={<StatusIcon status={selectedConversation.status} />}
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: alpha(getStatusColor(selectedConversation.status, theme.palette), 0.1),
                              color: getStatusColor(selectedConversation.status, theme.palette),
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {selectedConversation.messageCount} {selectedConversation.messageCount === 1 ? 'mensagem' : 'mensagens'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <AIControlButton phone={selectedConversation.clientPhone} conversationName={selectedConversation.clientName} />
                      <IconButton size="small" onClick={(e) => handleContextMenu(e, selectedConversation.id)} title="Mais opcoes">
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                {/* Messages Container */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: alpha(theme.palette.background.default, 0.3) }}>
                  <MessagesList messages={messages} loading={loadingMessages} messagesEndRef={messagesEndRef} />
                </Box>

                {/* Message Input */}
                <MessageInput
                  aiBlocked={aiBlocked}
                  checkingAiStatus={checkingAiStatus}
                  onSendMessage={handleSendMessage}
                  onEnableManualMode={handleEnableManualMode}
                />
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={() => { if (contextMenu) handleOpenRenameDialog(contextMenu.conversationId); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Renomear Conversa</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (contextMenu) { markAsRead(contextMenu.conversationId); handleCloseContextMenu(); } }}>
          <ListItemIcon><DoneAll fontSize="small" /></ListItemIcon>
          <ListItemText>Marcar como Lida</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (contextMenu) { markAsUnread(contextMenu.conversationId); handleCloseContextMenu(); } }}>
          <ListItemIcon><MarkChatUnread fontSize="small" /></ListItemIcon>
          <ListItemText>Marcar como Nao Lida</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (contextMenu) { updateStatus(contextMenu.conversationId, 'active'); handleCloseContextMenu(); } }}>
          <ListItemIcon><Schedule fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText>Marcar como Ativa</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (contextMenu) { updateStatus(contextMenu.conversationId, 'completed'); handleCloseContextMenu(); } }}>
          <ListItemIcon><CheckCircle fontSize="small" color="info" /></ListItemIcon>
          <ListItemText>Marcar como Concluida</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (contextMenu) { updateStatus(contextMenu.conversationId, 'success'); handleCloseContextMenu(); } }}>
          <ListItemIcon><EmojiEvents fontSize="small" color="success" /></ListItemIcon>
          <ListItemText>Marcar como Sucesso</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (contextMenu) { updateStatus(contextMenu.conversationId, 'abandoned'); handleCloseContextMenu(); } }}>
          <ListItemIcon><Cancel fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Marcar como Abandonada</ListItemText>
        </MenuItem>
      </Menu>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={handleCloseRenameDialog} maxWidth="sm" fullWidth>
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
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); }}
            placeholder="Digite o nome do contato"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRenameDialog} color="inherit">Cancelar</Button>
          <Button onClick={handleSaveRename} variant="contained" disabled={!newName.trim()}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
