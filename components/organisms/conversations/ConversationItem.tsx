'use client';

import React, { memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Badge,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Person,
  Schedule,
  CheckCircle,
  Cancel,
  EmojiEvents,
  Edit,
  WhatsApp,
  Facebook,
  Instagram,
} from '@mui/icons-material';
import { formatTimestamp } from '@/lib/utils/date-helpers';
import type { ConversationListSummary, ConversationHeaderStatus } from '@/lib/types/conversation';

// Memoized helper functions outside component to prevent recreation
const getStatusColor = (status: ConversationHeaderStatus, palette: any) => {
  switch (status) {
    case 'active':
      return palette.warning.main;
    case 'completed':
      return palette.info.main;
    case 'success':
      return palette.success.main;
    case 'abandoned':
      return palette.error.main;
    case 'pending':
      return palette.grey[500];
    default:
      return palette.grey[500];
  }
};

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  completed: 'Concluida',
  success: 'Sucesso',
  abandoned: 'Abandonada',
  pending: 'Pendente',
};

const StatusIcon = memo(({ status }: { status: ConversationHeaderStatus }) => {
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
});
StatusIcon.displayName = 'StatusIcon';

interface ChannelBadgeProps {
  channel?: string;
}

const ChannelBadge = memo(({ channel }: ChannelBadgeProps) => {
  const theme = useTheme();
  const channelType = channel || 'whatsapp';

  const configs = {
    whatsapp: {
      label: 'WhatsApp',
      icon: <WhatsApp sx={{ fontSize: 12 }} />,
      color: '#25D366',
    },
    facebook: {
      label: 'Facebook',
      icon: <Facebook sx={{ fontSize: 12 }} />,
      color: '#1877F2',
    },
    instagram: {
      label: 'Instagram',
      icon: <Instagram sx={{ fontSize: 12 }} />,
      color: '#E4405F',
    },
  };

  const config = configs[channelType as keyof typeof configs] || configs.whatsapp;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.65rem',
        fontWeight: 600,
        bgcolor: alpha(config.color, 0.1),
        color: config.color,
        border: `1px solid ${alpha(config.color, 0.3)}`,
        '& .MuiChip-label': { px: 0.75 },
        '& .MuiChip-icon': {
          ml: 0.5,
          color: config.color,
        },
      }}
    />
  );
});
ChannelBadge.displayName = 'ChannelBadge';

interface ConversationItemProps {
  conversation: ConversationListSummary;
  isSelected: boolean;
  isEdited: boolean;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
  onRename: (id: string) => void;
}

const ConversationItem = memo(({
  conversation,
  isSelected,
  isEdited,
  onSelect,
  onContextMenu,
  onRename,
}: ConversationItemProps) => {
  const theme = useTheme();
  const statusColor = getStatusColor(conversation.status, theme.palette);

  return (
    <Paper
      onClick={() => onSelect(conversation.id)}
      onContextMenu={(e) => onContextMenu(e, conversation.id)}
      sx={{
        p: 2,
        mb: 1,
        cursor: 'pointer',
        borderLeft: 3,
        borderColor: isSelected ? 'primary.main' : 'transparent',
        bgcolor: isSelected
          ? alpha(theme.palette.primary.main, 0.08)
          : conversation.isRead === false
            ? alpha(theme.palette.info.main, 0.05)
            : 'background.paper',
        transition: 'all 0.15s ease-out',
        '&:hover': {
          bgcolor: isSelected
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={0.75} flex={1} minWidth={0}>
              <Typography
                variant="subtitle2"
                fontWeight={conversation.isRead === false ? 700 : 600}
                noWrap
                sx={{ flex: 1, minWidth: 0 }}
              >
                {conversation.clientName || conversation.clientPhone}
              </Typography>
              {!isEdited && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename(conversation.id);
                  }}
                  sx={{
                    width: 24,
                    height: 24,
                    p: 0.5,
                    opacity: 0.6,
                    transition: 'all 0.15s',
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
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
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
              fontWeight: conversation.isRead === false ? 600 : 400,
            }}
          >
            {conversation.lastMessage}
          </Typography>
          <Box display="flex" gap={0.5} mt={1} alignItems="center" flexWrap="wrap">
            <ChannelBadge channel={conversation.channel} />
            <Chip
              label={statusLabels[conversation.status] || conversation.status}
              size="small"
              icon={<StatusIcon status={conversation.status} />}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: alpha(statusColor, 0.1),
                color: statusColor,
                '& .MuiChip-label': { px: 1 },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {conversation.messageCount} {conversation.messageCount === 1 ? 'msg' : 'msgs'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.lastMessage === nextProps.conversation.lastMessage &&
    prevProps.conversation.lastMessageAt === nextProps.conversation.lastMessageAt &&
    prevProps.conversation.unreadCount === nextProps.conversation.unreadCount &&
    prevProps.conversation.isRead === nextProps.conversation.isRead &&
    prevProps.conversation.status === nextProps.conversation.status &&
    prevProps.conversation.clientName === nextProps.conversation.clientName &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isEdited === nextProps.isEdited
  );
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
