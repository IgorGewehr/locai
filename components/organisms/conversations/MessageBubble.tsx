'use client';

import React, { memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Person,
  SmartToy,
  Event,
} from '@mui/icons-material';
import { safeFormat, toDate } from '@/lib/utils/date-helpers';
import { MessageContent } from './MessageContent';
import type { ConversationMessage } from '@/lib/types/conversation';

interface DateDividerProps {
  date: Date;
}

const DateDivider = memo(({ date }: DateDividerProps) => {
  const theme = useTheme();

  return (
    <Box display="flex" justifyContent="center" my={2}>
      <Chip
        label={safeFormat(date, "EEEE, dd 'de' MMMM")}
        size="small"
        icon={<Event fontSize="small" />}
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: 'primary.main',
          fontWeight: 600,
        }}
      />
    </Box>
  );
});
DateDivider.displayName = 'DateDivider';

interface ClientMessageProps {
  text: string;
  mediaUrls?: string[];
  timestamp: Date | null;
}

const ClientMessage = memo(({ text, mediaUrls, timestamp }: ClientMessageProps) => {
  const theme = useTheme();

  return (
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
        <MessageContent
          text={text}
          mediaUrls={mediaUrls}
          variant="body2"
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          {timestamp ? safeFormat(timestamp, 'dd/MM/yyyy HH:mm') : '--:--'}
        </Typography>
      </Paper>
    </Box>
  );
});
ClientMessage.displayName = 'ClientMessage';

interface SofiaMessageProps {
  text: string;
  mediaUrls?: string[];
  timestamp: Date | null;
  functionsCalled?: string[];
}

const SofiaMessage = memo(({ text, mediaUrls, timestamp, functionsCalled }: SofiaMessageProps) => {
  const theme = useTheme();

  return (
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
        <MessageContent
          text={text}
          mediaUrls={mediaUrls}
          variant="body2"
        />
        <Stack direction="row" spacing={1} alignItems="center" mt={1}>
          <Typography variant="caption" color="text.secondary">
            {timestamp ? safeFormat(timestamp, 'dd/MM/yyyy HH:mm') : '--:--'}
          </Typography>
          {functionsCalled && functionsCalled.length > 0 && (
            <Chip
              label={`${functionsCalled.length} funcao(oes)`}
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
  );
});
SofiaMessage.displayName = 'SofiaMessage';

interface MessageBubbleProps {
  message: ConversationMessage;
  showDateDivider: boolean;
}

const MessageBubble = memo(({ message, showDateDivider }: MessageBubbleProps) => {
  const messageTimestamp = message.clientMessageTimestamp || message.createdAt;
  const messageDate = toDate(messageTimestamp);

  return (
    <>
      {showDateDivider && messageDate && (
        <DateDivider date={messageDate} />
      )}
      <Stack spacing={2}>
        {message.clientMessage && (
          <ClientMessage
            text={message.clientMessage}
            mediaUrls={message.clientMediaUrls}
            timestamp={messageDate}
          />
        )}
        {message.sofiaMessage && (
          <SofiaMessage
            text={message.sofiaMessage}
            mediaUrls={message.sofiaMediaUrls}
            timestamp={messageDate}
            functionsCalled={message.context?.functionsCalled}
          />
        )}
      </Stack>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - messages are immutable so we only need to compare IDs
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.showDateDivider === nextProps.showDateDivider
  );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
