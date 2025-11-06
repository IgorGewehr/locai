'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Chat,
  CheckCircle,
  Cancel,
  Schedule,
  MoreVert,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ConversationSummary, ConversationStatus } from '@/lib/types/conversation-optimized';

interface ConversationListProps {
  conversations: ConversationSummary[];
  loading?: boolean;
  onConversationClick: (conversationId: string) => void;
  selectedConversationId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading = false,
  onConversationClick,
  selectedConversationId,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: ConversationStatus): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ConversationStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'active':
        return <Schedule fontSize="small" />;
      case 'abandoned':
        return <Cancel fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: ConversationStatus): string => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'active':
        return 'Ativa';
      case 'abandoned':
        return 'Abandonada';
      default:
        return status;
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(new Date(date), 'HH:mm', { locale: ptBR });
    } else if (diffInHours < 168) {
      // Menos de uma semana
      return format(new Date(date), 'EEE HH:mm', { locale: ptBR });
    } else {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Alert severity="info" icon={<Chat />}>
        <Typography variant="body2">
          Nenhuma conversa registrada ainda. As conversas com a Sofia aparecerão aqui.
        </Typography>
      </Alert>
    );
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ p: 0 }}>
        <List sx={{ p: 0 }}>
          {conversations.map((conversation, index) => (
            <React.Fragment key={conversation.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <Tooltip title="Mais opções">
                    <IconButton edge="end" size="small">
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton
                  onClick={() => onConversationClick(conversation.id)}
                  selected={selectedConversationId === conversation.id}
                  sx={{
                    py: 2,
                    borderLeft: selectedConversationId === conversation.id ? 3 : 0,
                    borderColor: 'primary.main',
                    bgcolor: selectedConversationId === conversation.id ?
                      alpha(theme.palette.primary.main, 0.08) :
                      'transparent',
                    '&:hover': {
                      bgcolor: selectedConversationId === conversation.id ?
                        alpha(theme.palette.primary.main, 0.12) :
                        'action.hover',
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {conversation.clientName || conversation.clientPhone}
                        </Typography>
                        <Chip
                          label={getStatusLabel(conversation.status)}
                          color={getStatusColor(conversation.status)}
                          icon={getStatusIcon(conversation.status)}
                          size="small"
                          sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {conversation.lastMessage}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(conversation.lastMessageAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {conversation.messageCount} {conversation.messageCount === 1 ? 'mensagem' : 'mensagens'}
                          </Typography>
                        </Stack>
                        {conversation.tags.length > 0 && (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                            {conversation.tags.slice(0, 3).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  '& .MuiChip-label': { px: 0.75 }
                                }}
                              />
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    }
                  />
                </ListItemButton>
              </ListItem>
              {index < conversations.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default ConversationList;
